'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Loader2, RotateCcw, ImagePlus, FileImage, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  fill?: boolean;
  themeColor?: string;
}

/**
 * Compress an image dataURL via canvas → JPEG.
 * Returns compressed JPEG dataURL, or null if the image can't be rendered
 * (e.g. HEIC on Chrome/Android).
 */
async function compressViaCanvas(
  dataUrl: string,
  maxDim = 1600,
  quality = 0.82
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width  = Math.round(width  * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null); // HEIC or unsupported format
    img.src = dataUrl;
  });
}

// Max raw file size for formats we can't compress (HEIC / unsupported)
// 2 MB raw → ~2.7 MB base64 → safely under Vercel's 4.5 MB request limit
const MAX_UNCOMPRESSIBLE_BYTES = 2 * 1024 * 1024;

export default function CameraCapture({
  onCapture,
  isAnalyzing,
  fill = false,
  themeColor = '#4a8535',
}: CameraCaptureProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera,    setHasCamera   ] = useState<boolean | null>(null);
  const [cameraError,  setCameraError ] = useState<string | null>(null);
  const [facingMode,   setFacingMode  ] = useState<'environment' | 'user'>('environment');
  const [isFlashing,   setIsFlashing  ] = useState(false);

  // Preview state — null = live feed, string = captured/uploaded photo dataURL
  const [preview,         setPreview        ] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [imgError,        setImgError       ] = useState(false);
  // Upload error (file too large to send)
  const [uploadError,     setUploadError    ] = useState<string | null>(null);

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

  // Stop/start camera based on whether we have a preview
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

  // Capture from live camera feed (already JPEG-compressed by canvas)
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
    setUploadError(null);
  }, []);

  // Handle file upload — compress via canvas; gate oversized uncompressible files
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = '';

    const ext    = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isHeic = ext === 'heic' || ext === 'heif';
    if (!file.type.startsWith('image/') && !isHeic) return;

    setUploadError(null);

    // Read the file as data URL
    const rawDataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (ev) => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Try canvas compression first (works for JPEG, PNG, WebP; fails for HEIC)
    const compressed = await compressViaCanvas(rawDataUrl);

    if (compressed) {
      // Successfully compressed to JPEG — use it
      setPreview(compressed);
      setPreviewFileName(file.name);
      setImgError(false);
    } else {
      // Can't compress (HEIC / unsupported) — enforce size gate
      if (file.size > MAX_UNCOMPRESSIBLE_BYTES) {
        const sizeMb = (file.size / 1024 / 1024).toFixed(1);
        setUploadError(
          `This photo (${sizeMb} MB) is too large to upload. ` +
          'Please take a new photo using the Capture button, or choose a smaller image.'
        );
        return;
      }
      // Small enough to send as-is
      setPreview(rawDataUrl);
      setPreviewFileName(file.name);
      setImgError(false);
    }
  }, []);

  // Send preview to parent for analysis
  const analyze = useCallback(async () => {
    if (!preview) return;

    let dataUrlToSend = preview;

    // If preview is not yet JPEG-compressed (e.g. loaded as PNG/large JPEG before compression ran),
    // do a final compression pass to ensure we stay under the API size limit.
    if (!imgError && !preview.startsWith('data:image/jpeg')) {
      const recompressed = await compressViaCanvas(preview);
      if (recompressed) dataUrlToSend = recompressed;
    }

    const base64 = dataUrlToSend.startsWith('data:')
      ? dataUrlToSend.split(',')[1]
      : dataUrlToSend;
    if (base64) onCapture(base64);
  }, [preview, imgError, onCapture]);

  // Retake: clear preview, restart live feed
  const retake = useCallback(() => {
    setPreview(null);
    setPreviewFileName(null);
    setImgError(false);
    setUploadError(null);
    setHasCamera(null);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  if (hasCamera === false && !preview) {
    return (
      <div className="w-full rounded-2xl border bg-gray-100 flex flex-col items-center justify-center gap-3 py-10">
        <CameraOff size={36} className="text-gray-400" />
        <p className="text-sm text-gray-500 text-center px-4">{cameraError ?? 'Camera unavailable.'}</p>
        {uploadError && (
          <p className="text-xs text-red-500 text-center px-4 flex items-start gap-1">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {uploadError}
          </p>
        )}
        <label
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-white font-semibold text-sm mt-2"
          style={{ backgroundColor: themeColor }}
        >
          <ImagePlus size={15} /> Upload a Photo
          <input
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </label>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0 ${fill ? 'h-full' : ''}`.trim()}>
      {/* Viewfinder */}
      <div className="relative w-full rounded-t-2xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>

        {/* Live video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: preview ? 'none' : 'block' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Photo preview */}
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
                Preview unavailable for this format — analysis will work.
              </p>
            </div>
          )
        )}

        {/* Flash overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white opacity-70 pointer-events-none z-20" />
        )}

        {/* Corner brackets — live feed only */}
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

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 size={36} className="text-white animate-spin" />
            <p className="text-white text-sm font-semibold">Analyzing...</p>
          </div>
        )}

        {/* Camera loading indicator */}
        {hasCamera === null && !preview && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
        )}

        {/* Flip camera button */}
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

        {/* Retake button on preview */}
        {preview && !isAnalyzing && (
          <button
            onClick={retake}
            className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold transition z-10"
          >
            <RotateCcw size={13} /> Retake
          </button>
        )}
      </div>

      {/* Upload error message */}
      {uploadError && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-x border-red-200">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600">{uploadError}</p>
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
