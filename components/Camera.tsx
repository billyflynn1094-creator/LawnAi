'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Loader2, RotateCcw, ImagePlus, X, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  fill?: boolean;
  themeColor?: string;
}

const MAX_DIM = 2400; // cap long edge to keep memory/upload size sane on older devices

function getScaledDims(w: number, h: number): { w: number; h: number } {
  if (w <= MAX_DIM && h <= MAX_DIM) return { w, h };
  const scale = MAX_DIM / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/**
 * Reject a pending promise if it hasn't settled within `ms` milliseconds.
 * HEIC decode attempts on browsers with no native HEIC support can hang
 * indefinitely (neither resolve nor reject) rather than failing fast --
 * this is what produced a permanently-black "Processing photo..." screen.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/**
 * Sniff the file's actual magic bytes to detect HEIC/HEIF content, regardless
 * of what the OS/share-intent reports as the file name or MIME type (Android
 * frequently mangles both). ISOBMFF files start with a 4-byte box size, then
 * the ascii box type "ftyp", then a 4-byte major brand -- HEIC/HEIF brands are
 * heic/heix/hevc/hevx/mif1/msf1.
 */
async function sniffIsHeic(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(4, 12).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const str = String.fromCharCode(...bytes);
    if (!str.startsWith('ftyp')) return false;
    const brand = str.slice(4, 8).toLowerCase();
    return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand);
  } catch {
    return false;
  }
}

/**
 * Convert a HEIC/HEIF file to a JPEG Blob using heic2any -- a WASM-based
 * decoder (libheif compiled to WebAssembly) that runs entirely in-browser,
 * independent of the browser/OS's native image codecs. This is the actual
 * fix for Android: Chrome for Android has NO native HEIC decode support in
 * <img>, canvas, or createImageBitmap (unlike Safari, which uses Apple's
 * system-level HEIC codec) -- so relying on the browser to decode HEIC will
 * never work reliably there, no matter how many fallback paths are added.
 */
async function convertHeicToJpegBlob(file: File): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('heic2any');
  const heic2any = mod.default ?? mod;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Detect a blank/solid-black render — some Android browsers "successfully"
 * decode certain HEIC photos (esp. wide-gamut/Display P3 shots from newer
 * iPhones) into a bitmap that draws as solid black on <canvas> instead of
 * throwing a decode error. Left unchecked, this produces a fully-black
 * "successful" upload with no error shown. We sample a sparse grid of pixels
 * across the canvas and treat it as blank if none carry meaningful color/alpha.
 */
function isBlankCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  if (w === 0 || h === 0) return true;
  try {
    const rows = 12;
    const stepY = Math.max(1, Math.floor(h / rows));
    for (let y = 0; y < h; y += stepY) {
      const row = ctx.getImageData(0, y, w, 1).data;
      for (let x = 0; x < row.length; x += 4 * Math.max(1, Math.floor(w / 24))) {
        const r = row[x], g = row[x + 1], b = row[x + 2], a = row[x + 3];
        if (a > 10 && (r > 8 || g > 8 || b > 8)) return false; // found real content
      }
    }
    return true; // every sampled pixel was effectively black/transparent
  } catch {
    return false; // can't sample (e.g. security restriction) — don't false-fail
  }
}

/**
 * Normalize ANY uploaded image file to a JPEG data URL, regardless of source
 * format (HEIC, PNG, WEBP, GIF, BMP, AVIF, etc.) or device/OS origin.
 *
 * Uses createImageBitmap() first — this decodes based on the actual image
 * byte content, NOT the file's reported MIME type, which is what makes this
 * robust against Android share-intents that hand over images with an empty
 * or generic (application/octet-stream) MIME type. This is exactly the failure
 * mode behind "iPhone photo shared to Android won't upload" — the file itself
 * is a valid image, but our old MIME-string check silently rejected it.
 *
 * Falls back to an <img> + FileReader decode path for browsers/formats where
 * createImageBitmap isn't available or fails. Both paths verify the render
 * isn't blank/black before accepting it as a success — see isBlankCanvas().
 */
async function decodeViaCanvas(file: File): Promise<string> {
  // -- Attempt 1: createImageBitmap (format-agnostic, decodes actual bytes) --
  try {
    const bitmap = await createImageBitmap(file);
    const { w, h } = getScaledDims(bitmap.width, bitmap.height);
    if (w > 0 && h > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas-context-unavailable');
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      if (!isBlankCanvas(ctx, w, h)) {
        return canvas.toDataURL('image/jpeg', 0.85);
      }
      // Rendered blank — fall through and try the <img> decode path instead.
    }
  } catch {
    // fall through to attempt 2
  }

  // -- Attempt 2: <img> + FileReader decode (fallback for older browsers, or
  //    when Attempt 1 produced a blank render) --
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) { reject(new Error('read-failed')); return; }
      const img = new window.Image();
      img.onload = () => {
        const { w, h } = getScaledDims(img.naturalWidth || 0, img.naturalHeight || 0);
        if (w === 0 || h === 0) { reject(new Error('zero-dimension-decode')); return; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas-context-unavailable')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        if (isBlankCanvas(ctx, w, h)) { reject(new Error('blank-render')); return; }
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('decode-failed'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Normalize ANY uploaded image file to a JPEG data URL, regardless of source
 * format (HEIC, PNG, WEBP, GIF, BMP, AVIF, etc.) or device/OS origin.
 *
 * HEIC/HEIF files are routed through heic2any (WASM decoder, works regardless
 * of browser/OS codec support) since Chrome for Android has no native HEIC
 * decode path at all. Everything else goes through the canvas-based decode,
 * which also catches blank/silent-failure renders (see isBlankCanvas).
 * The whole pipeline is timeout-guarded so a hung decode surfaces a clear
 * error instead of leaving the UI stuck on a black "Processing..." screen.
 */
async function normalizeToJpeg(file: File): Promise<string> {
  const looksHeicByName = /\.(heic|heif)$/i.test(file.name);
  const looksHeicByType = /heic|heif/i.test(file.type);
  const isHeic = looksHeicByName || looksHeicByType || (await sniffIsHeic(file));

  if (isHeic) {
    const jpegBlob = await withTimeout(
      convertHeicToJpegBlob(file),
      25000,
      'heic-convert-timeout'
    );
    const jpegFile = new File([jpegBlob], 'converted.jpg', { type: 'image/jpeg' });
    return withTimeout(decodeViaCanvas(jpegFile), 10000, 'canvas-decode-timeout');
  }

  return withTimeout(decodeViaCanvas(file), 15000, 'canvas-decode-timeout');
}

export default function CameraCapture({
  onCapture,
  isAnalyzing,
  fill = false,
  themeColor = '#4a8535',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);

  // Uploaded photo state — when set, shows in the viewfinder instead of live feed
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCamera(true);
      setCameraError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setHasCamera(false);
      setCameraError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Camera not available on this device.'
      );
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facingMode, startCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
    onCapture(base64);
  }, [onCapture]);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const handleUploadFile = useCallback(async (file: File) => {
    setUploadError(null);
    setIsProcessingUpload(true);
    try {
      // No MIME-type gatekeeping here on purpose — createImageBitmap decodes
      // based on real byte content, so we let it attempt ANY selected file
      // rather than pre-filtering on an unreliable file.type/extension string.
      const normalizedJpeg = await normalizeToJpeg(file);
      setUploadedPreview(normalizedJpeg);
    } catch (err) {
      console.error('Photo upload normalize failed:', err);
      const message = err instanceof Error ? err.message : '';
      if (message === 'heic-convert-timeout') {
        setUploadError(
          'This HEIC photo took too long to convert. Try using the camera above to take a new photo directly, or open this photo in your gallery app and save/share it as a JPEG first, then upload that.'
        );
      } else {
        setUploadError(
          'This photo could not be loaded correctly. Try using the camera above to take a new photo directly, or open this photo in your gallery app and save/share it as a JPEG first, then upload that.'
        );
      }
    } finally {
      setIsProcessingUpload(false);
    }
  }, []);

  const handleUploadChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
    if (e.target) e.target.value = '';
  }, [handleUploadFile]);

  const clearUpload = useCallback(() => {
    setUploadedPreview(null);
    setUploadError(null);
  }, []);

  const analyzeUpload = useCallback(() => {
    if (!uploadedPreview) return;
    // Already normalized to a JPEG data URL — just strip the prefix.
    const base64 = uploadedPreview.includes(',') ? uploadedPreview.split(',')[1] : uploadedPreview;
    onCapture(base64);
  }, [uploadedPreview, onCapture]);

  if (hasCamera === false) {
    return (
      <div className="w-full rounded-2xl border border-soil-700 bg-soil-900 flex flex-col items-center justify-center gap-3 py-10">
        <CameraOff size={36} className="text-soil-500" />
        <p className="text-sm text-soil-400 text-center px-4">{cameraError ?? 'Camera unavailable.'}</p>
        {uploadError && (
          <p className="text-xs text-red-400 text-center px-4 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" /> {uploadError}
          </p>
        )}
        {/* Still allow uploads even if camera fails */}
        <label
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold cursor-pointer transition"
          style={{ backgroundColor: themeColor, opacity: isProcessingUpload ? 0.6 : 1 }}
        >
          {isProcessingUpload ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {isProcessingUpload ? 'Processing…' : 'Upload a photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadChange}
            disabled={isProcessingUpload}
          />
        </label>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0 ${fill ? 'h-full' : ''}`.trim()}>
      {/* Upload error banner */}
      {uploadError && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 leading-snug">{uploadError}</p>
        </div>
      )}

      {/* Viewfinder — shows live camera OR uploaded photo */}
      <div className="relative w-full rounded-t-2xl overflow-hidden bg-black" style={{ aspectRatio: '1/1' }}>

        {/* Live video feed — always mounted but hidden when upload is shown */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: uploadedPreview ? 'none' : 'block' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Uploaded photo preview — fills the viewfinder */}
        {uploadedPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uploadedPreview}
            alt="Uploaded photo"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Processing overlay while normalizing an uploaded photo */}
        {isProcessingUpload && !uploadedPreview && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-20">
            <Loader2 size={26} className="text-white animate-spin" />
            <span className="text-white text-xs font-medium">Processing photo…</span>
          </div>
        )}

        {/* Flash overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white opacity-70 pointer-events-none z-20" />
        )}

        {/* Corner brackets — live camera mode only */}
        {!uploadedPreview && (
          <>
            <div className="absolute top-8 left-8 w-6 h-6 rounded-tl"
              style={{ borderTop: `2.5px solid ${themeColor}`, borderLeft: `2.5px solid ${themeColor}` }} />
            <div className="absolute top-8 right-8 w-6 h-6 rounded-tr"
              style={{ borderTop: `2.5px solid ${themeColor}`, borderRight: `2.5px solid ${themeColor}` }} />
            <div className="absolute bottom-8 left-8 w-6 h-6 rounded-bl"
              style={{ borderBottom: `2.5px solid ${themeColor}`, borderLeft: `2.5px solid ${themeColor}` }} />
            <div className="absolute bottom-8 right-8 w-6 h-6 rounded-br"
              style={{ borderBottom: `2.5px solid ${themeColor}`, borderRight: `2.5px solid ${themeColor}` }} />
          </>
        )}

        {/* Loading indicator */}
        {hasCamera === null && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
        )}

        {/* Top-right controls */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          {/* Clear upload — shown only when preview is active */}
          {uploadedPreview && (
            <button
              onClick={clearUpload}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
              aria-label="Back to camera"
            >
              <X size={16} />
            </button>
          )}
          {/* Flip camera — shown only on live feed */}
          {!uploadedPreview && hasCamera && (
            <button
              onClick={flipCamera}
              disabled={isAnalyzing}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
              aria-label="Flip camera"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Button bar */}
      <div
        className="w-full rounded-b-2xl flex items-center justify-center py-4 gap-3"
        style={{ backgroundColor: `${themeColor}15` }}
      >
        {uploadedPreview ? (
          /* Upload mode: Analyze button */
          <button
            onClick={analyzeUpload}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-bold text-sm disabled:opacity-40 transition active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            {isAnalyzing
              ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
              : <><Camera size={16} /> Analyze Photo</>
            }
          </button>
        ) : (
          /* Live camera mode: Capture + Upload */
          <>
            <button
              onClick={capture}
              disabled={isAnalyzing || hasCamera !== true}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-bold text-sm disabled:opacity-40 transition active:scale-95"
              style={{ backgroundColor: themeColor }}
              aria-label="Capture photo"
            >
              <Camera size={16} /> Capture
            </button>

            {/* Upload button — opens file picker, no capture attribute. accept="image/*"
                is a soft hint to the OS picker only; we do NOT gate on MIME type after
                selection since that's what caused cross-device upload failures. */}
            <label
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition active:scale-95"
              style={{
                backgroundColor: `${themeColor}20`,
                color: themeColor,
                opacity: (isAnalyzing || isProcessingUpload) ? 0.4 : 1,
                pointerEvents: (isAnalyzing || isProcessingUpload) ? 'none' : 'auto',
              }}
              aria-label="Upload photo"
            >
              {isProcessingUpload ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {isProcessingUpload ? 'Processing…' : 'Upload'}
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadChange}
                disabled={isAnalyzing || isProcessingUpload}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
