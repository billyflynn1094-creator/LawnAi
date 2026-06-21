'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Loader2, RotateCcw, ImagePlus, FileImage, AlertCircle, RefreshCw } from 'lucide-react';

interface CameraCapturePros {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  fill?: boolean;
  themeColor?: string;
}

/**
 * Compress a Blob or File via canvas -> JPEG using createImageBitmap.
 * Returns null if the format is unsupported (e.g. HEIC on older Android Chrome).
 */
async function compressViaCanvas(
  file: Blob | File,
  maxDim = 1600,
  quality = 0.82
): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width  = Math.round(width  * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return null; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

// Rough upload limit: 3 MB raw -> ~4.1 MB base64 -> under Vercel's 4.5 MB body limit
const UPLOAD_LIMIT_BYTES = 3 * 1024 * 1024;

export default function CameraCapture({
  onCapture,
  isAnalyzing,
  fill = false,
  themeColor = '#4a8535',
}: CameraCapturePros) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera,    setHasCamera   ] = useState<boolean | null>(null);
  const [cameraError,  setCameraError ] = useState<string | null>(null);
  const [facingMode,   setFacingMode  ] = useState<'environment' | 'user'>('environment');
  const [isFlashing,   setIsFlashing  ] = useState(false);

  const [preview,         setPreview        ] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [imgError,        setImgError       ] = useState(false);
  // Non-blocking warning shown below the viewfinder (never prevents preview/analyze)
  const [uploadWarning,   setUploadWarning  ] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        // Some Android devices reject facingMode or resolution constraints -- fall back
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
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
    if (!preview) {
      startCamera(facingMode);
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, preview, startCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
    setPreview(dataUrl);
    setPreviewFileName('Camera capture');
    setImgError(false);
    setUploadWarning(null);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = '';

    const ext    = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isHeic = ext === 'heic' || ext === 'heif'
                || file.type === 'image/heic' || file.type === 'image/heif'
                || file.type === 'image/heic-sequence';
    if (!file.type.startsWith('image/') && !isHeic) return;

    setUploadWarning(null);

    // 1. HEIC: convert to JPEG via heic2any (already in package.json), then compress
    if (isHeic) {
      try {
        // Dynamic import so it only loads when needed
        const heic2anyMod = await import('heic2any');
        // heic2anyMod.default is the converter function — TypeScript types it correctly
        const converted = await heic2anyMod.default({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
        const compressedFromHeic = await compressViaCanvas(jpegBlob as Blob);
        if (compressedFromHeic) {
          setPreview(compressedFromHeic);
          setPreviewFileName(file.name);
          setImgError(false);
          setUploadWarning(null);
          return;
        }
      } catch (heicErr) {
        console.warn('heic2any conversion failed:', heicErr);
        // Fall through to canvas attempt or raw load
      }
    }

    // 2. Try canvas compression directly (works for JPEG/PNG/WebP on Android 10+)
    const compressed = await compressViaCanvas(file);
    if (compressed) {
      setPreview(compressed);
      setPreviewFileName(file.name);
      setImgError(false);
      return;
    }

    // 3. Fallback: load raw into preview so user can at least see the photo loaded
    const rawDataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (ev) => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setPreview(rawDataUrl);
    setPreviewFileName(file.name);
    setImgError(false);

    // 4. Warn only if this raw file will likely exceed the API limit
    if (file.size > UPLOAD_LIMIT_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1);
      setUploadWarning(
        isHeic
          ? `HEIC conversion unavailable (${sizeMb} MB) -- tap Analyze anyway or switch your camera to JPEG in Settings.`
          : `Large photo (${sizeMb} MB) -- analysis may fail. Try a smaller image if needed.`
      );
    }
  }, []);

  const analyze = useCallback(() => {
    if (!preview) return;
    const base64 = preview.startsWith('data:') ? preview.split(',')[1] : preview;
    if (base64) onCapture(base64);
  }, [preview, onCapture]);

  const retake = useCallback(() => {
    setPreview(null);
    setPreviewFileName(null);
    setImgError(false);
    setUploadWarning(null);
    setHasCamera(null);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const retryCameraAccess = useCallback(() => {
    setHasCamera(null);
    setCameraError(null);
    startCamera(facingMode);
  }, [startCamera, facingMode]);

  if (hasCamera === false && !preview) {
    return (
      <div className="w-full rounded-2xl border bg-gray-100 flex flex-col items-center justify-center gap-3 py-10">
        <CameraOff size={36} className="text-gray-400" />
        <p className="text-sm text-gray-500 text-center px-4">{cameraError ?? 'Camera unavailable.'}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={retryCameraAccess}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm border cursor-pointer"
            style={{ color: themeColor, borderColor: themeColor, backgroundColor: 'transparent' }}
          >
            <RefreshCw size={14} /> Retry Camera
          </button>
          <label
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl cursor-pointer text-white font-semibold text-sm"
            style={{ backgroundColor: themeColor }}
          >
            <ImagePlus size={14} /> Upload Photo
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={handleFileChange}
              disabled={isAnalyzing}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0 ${fill ? 'h-full' : ''}`}>
      {/* Viewfinder */}
      <div className="relative w-full rounded-t-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: preview ? 'none' : 'block' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {preview && (
          !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={previewFileName ?? 'Preview'}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: '#111' }}
            >
              <FileImage size={40} style={{ color: themeColor }} />
              <p className="text-sm font-semibold" style={{ color: themeColor }}>Photo ready to analyze</p>
              <p className="text-xs text-gray-400 px-6 text-center">
                Preview unavailable for this format -- tap Analyze Photo below.
              </p>
            </div>
          )
        )}

        {isFlashing && (
          <div className="absolute inset-0 bg-white opacity-70 pointer-events-none z-20" />
        )}

        {!preview && (<>
          <div className="absolute top-8 left-8 w-6 h-6"
            style={{ borderTop: `2.5px solid ${themeColor}`, borderLeft: `2.5px solid ${themeColor}` }} />
          <div className="absolute top-8 right-8 w-6 h-6"
            style={{ borderTop: `2.5px solid ${themeColor}`, borderRight: `2.5px solid ${themeColor}` }} />
          <div className="absolute bottom-8 left-8 w-6 h-6"
            style={{ borderBottom: `2.5px solid ${themeColor}`, borderLeft: `2.5px solid ${themeColor}` }} />
          <div className="absolute bottom-8 right-8 w-6 h-6"
            style={{ borderBottom: `2.5px solid ${themeColor}`, borderRight: `2.5px solid ${themeColor}` }} />
        </>)}

        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 size={36} className="text-white animate-spin" />
            <p className="text-white text-sm font-semibold">Analyzing...</p>
          </div>
        )}

        {hasCamera === null && !preview && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
        )}

        {hasCamera && !preview && (
          <button
            onClick={flipCamera}
            disabled={isAnalyzing}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition z-10"
            aria-label="Flip camera"
          >
            <RotateCcw size={16} />
          </button>
        )}

        {preview && !isAnalyzing && (
          <button
            onClick={retake}
            className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold transition z-10"
          >
            <RotateCcw size={13} /> Retake
          </button>
        )}
      </div>

      {/* Non-blocking size/format warning */}
      {uploadWarning && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-x border-amber-200">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">{uploadWarning}</p>
        </div>
      )}

      {/* Action bar */}
      <div className="w-full rounded-b-2xl flex items-center justify-center py-4 gap-3"
        style={{ backgroundColor: `${themeColor}15` }}>

        {preview ? (
          <button
            onClick={analyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-8 py-2.5 rounded-full text-white font-bold text-sm disabled:opacity-40 transition active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            {isAnalyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
            ) : (
              <><Camera size={16} /> Analyze Photo</>
            )}
          </button>
        ) : (
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

            <label
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition active:scale-95 border"
              style={{ color: themeColor, borderColor: themeColor, backgroundColor: 'transparent' }}
            >
              <ImagePlus size={15} /> Upload
              <input
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={handleFileChange}
                disabled={isAnalyzing}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
