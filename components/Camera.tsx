"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, ImagePlus, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  fill?: boolean;
}

export default function CameraCapture({ onCapture, isAnalyzing, fill }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"camera" | "preview">("camera");
  // preview is always a data URL (never a blob URL) — blob URLs from content-
  // provider-backed files (Messages, Gmail, Google Drive, etc.) silently
  // render black on Android Chrome in both fixed overlays and normal DOM.
  const [preview, setPreview] = useState<string | null>(null);
  // Keep the original File for full-quality base64 read on Analyze press
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and try again."
          : "Camera not available. Use the gallery icon to upload a photo.";
      setCameraError(msg);
    }
  }, [facingMode, stopStream]);

  useEffect(() => { startCamera(); return () => stopStream(); }, [startCamera, stopStream]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setPreview(dataUrl);
    setPreviewFile(null);
    setMode("preview");
    stopStream();
  };

  const openFilePicker = () => {
    if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); }
  };

  /**
   * Convert the selected file to a canvas JPEG data URL for preview display.
   *
   * Problem: blob URLs created from Android content-provider-backed files
   * (photos received via Messages, Gmail attachments, Google Drive shares,
   * WhatsApp, etc.) silently render as solid black on Android Chrome — in both
   * fixed overlays AND normal DOM containers. Reading the file through a hidden
   * Image element + canvas always produces a renderable data URL.
   *
   * Max long-edge 1280px keeps the preview data URL small (~150-300KB base64).
   * The original File is kept in previewFile so Analyze reads full-quality bytes.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      const MAX = 1280;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setCameraError("Failed to process image. Please try another photo."); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      setPreview(dataUrl);
      setPreviewFile(file);
      setMode("preview");
    };

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      setCameraError("Could not load that image. Please try a different photo.");
    };

    img.src = tempUrl;
  };

  const retake = () => {
    setPreview(null); setPreviewFile(null);
    setMode("camera"); startCamera();
  };

  const analyze = () => {
    if (!preview) return;
    if (previewFile) {
      // File upload: read original at full quality for the API
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        if (b64) onCapture(b64);
        else setCameraError("Failed to read image. Please try a different photo.");
      };
      reader.onerror = () => setCameraError("Failed to read image. Please try a different photo.");
      reader.readAsDataURL(previewFile);
    } else {
      // Camera capture: preview IS the base64 data URL
      onCapture(preview);
    }
  };

  const flipCamera = () => setFacingMode((f) => (f === "environment" ? "user" : "environment"));

  const containerClass = [
    "relative w-full rounded-2xl overflow-hidden bg-soil-900 shadow-2xl",
    fill ? "h-full" : "aspect-[4/3]",
    mode === "preview" ? "ring-4 ring-green-500" : "",
  ].join(" ");

  return (
    <>
      <div className={containerClass}>

        {mode === "camera" && !cameraError && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border border-field-300/40 rounded-lg" />
              <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-field-300 rounded-tl" />
              <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-field-300 rounded-tr" />
              <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-field-300 rounded-bl" />
              <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-field-300 rounded-br" />
            </div>
            <div className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-t from-soil-900/80 to-transparent">
              <button onClick={openFilePicker} className="p-3.5 rounded-full bg-soil-800/80 text-field-200 hover:bg-soil-700 transition" aria-label="Upload photo from gallery">
                <ImagePlus size={22} />
              </button>
              <button onClick={capture} className="w-[4.5rem] h-[4.5rem] rounded-full bg-field-400 hover:bg-field-300 border-4 border-field-200 transition shadow-lg active:scale-95" aria-label="Capture photo">
                <Camera className="mx-auto text-soil-900" size={26} />
              </button>
              <button onClick={flipCamera} className="p-3.5 rounded-full bg-soil-800/80 text-field-200 hover:bg-soil-700 transition" aria-label="Flip camera">
                <RefreshCw size={22} />
              </button>
            </div>
          </>
        )}

        {cameraError && mode === "camera" && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
            <Camera className="text-field-600" size={52} />
            <p className="text-field-200 text-sm">{cameraError}</p>
            <button onClick={openFilePicker} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-field-600 hover:bg-field-500 text-white text-base font-medium transition">
              <ImagePlus size={18} /> Upload a photo instead
            </button>
          </div>
        )}

        {/* Preview — canvas-derived data URL, works for ALL Android sources */}
        {mode === "preview" && preview && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Captured turf" className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white text-[10px] font-semibold tracking-wide">LAWN AI</span>
            </div>
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-[3px] border-green-400 border-t-transparent animate-spin" />
                <p className="text-white text-sm font-medium">Analyzing your turf…</p>
              </div>
            )}
            {!isAnalyzing && (
              <div className="absolute bottom-0 inset-x-0 px-4 pb-5 pt-16 flex gap-3 bg-gradient-to-t from-black/80 to-transparent">
                <button onClick={retake} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/15 text-white hover:bg-white/25 transition text-base font-medium backdrop-blur-sm">
                  <X size={18} /> Retake
                </button>
                <button onClick={analyze} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white transition text-base font-semibold shadow-lg">
                  <Camera size={18} /> Analyze
                </button>
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "fixed", top: 0, left: 0, width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
        onChange={handleFileUpload}
      />
    </>
  );
}
