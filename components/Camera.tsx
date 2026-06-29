'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Loader2, RotateCcw, ImagePlus, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  fill?: boolean;
  themeColor?: string;
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

  const handleUploadFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isHeic = ext === 'heic' || ext === 'heif';
    if (!file.type.startsWith('image/') && !isHeic) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) setUploadedPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
    if (e.target) e.target.value = '';
  }, [handleUploadFile]);

  const clearUpload = useCallback(() => {
    setUploadedPreview(null);
  }, []);

  const analyzeUpload = useCallback(() => {
    if (!uploadedPreview) return;
    // Strip data URL prefix to get raw base64
    const base64 = uploadedPreview.includes(',') ? uploadedPreview.split(',')[1] : uploadedPreview;
    onCapture(base64);
  }, [uploadedPreview, onCapture]);

  if (hasCamera === false) {
    return (
      <div className="w-full rounded-2xl border border-soil-700 bg-soil-900 flex flex-col items-center justify-center gap-3 py-10">
        <CameraOff size={36} className="text-soil-500" />
        <p className="text-sm text-soil-400 text-center px-4">{cameraError ?? 'Camera unavailable.'}</p>
        {/* Still allow uploads even if camera fails */}
        <label
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold cursor-pointer transition"
          style={{ backgroundColor: themeColor }}
        >
          <ImagePlus size={15} /> Upload a photo
          <input
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleUploadChange}
          />
        </label>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0 ${fill ? 'h-full' : ''}`.trim()}>
      {/* Viewfinder — shows live camera OR uploaded photo */}
      <div className="relative w-full rounded-t-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>

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

            {/* Upload button — opens file picker, no capture attribute */}
            <label
              className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition active:scale-95"
              style={{
                backgroundColor: `${themeColor}20`,
                color: themeColor,
                opacity: isAnalyzing ? 0.4 : 1,
                pointerEvents: isAnalyzing ? 'none' : 'auto',
              }}
              aria-label="Upload photo"
            >
              <ImagePlus size={16} /> Upload
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={handleUploadChange}
                disabled={isAnalyzing}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
