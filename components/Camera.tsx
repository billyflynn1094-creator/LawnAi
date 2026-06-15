"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RefreshCw, ImagePlus, X } from "lucide-react";

interface CameraProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
}

export default function CameraCapture({ onCapture, isAnalyzing }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"camera" | "preview">("camera");
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera permission or use the upload option below."
      );
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(base64);
    setMode("preview");
  }, []);

  const openFilePicker = () => {
    if (fileRef.current) {
      fileRef.current.value = ""; // allow re-selecting same file
      fileRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        setPreview(base64);
        setMode("preview");
      }
    };
    reader.onerror = () => {
      setCameraError("Failed to read image. Please try a different photo.");
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setPreview(null);
    setMode("camera");
    startCamera();
  };

  const analyze = () => {
    if (preview) onCapture(preview);
  };

  const flipCamera = () => {
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  };

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-soil-900 shadow-2xl">
      {/* Live camera */}
      {mode === "camera" && !cameraError && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Targeting reticle */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border border-field-300/40 rounded-lg" />
            <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-field-300 rounded-tl" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-field-300 rounded-tr" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-field-300 rounded-bl" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-field-300 rounded-br" />
          </div>
          {/* Controls */}
          <div className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-t from-soil-900/80 to-transparent">
            <button
              onClick={openFilePicker}
              className="p-3 rounded-full bg-soil-800/80 text-field-200 hover:bg-soil-700 transition"
              aria-label="Upload photo"
            >
              <ImagePlus size={20} />
            </button>
            <button
              onClick={capture}
              className="w-16 h-16 rounded-full bg-field-400 hover:bg-field-300 border-4 border-field-200 transition shadow-lg active:scale-95"
              aria-label="Capture photo"
            >
              <Camera className="mx-auto text-soil-900" size={24} />
            </button>
            <button
              onClick={flipCamera}
              className="p-3 rounded-full bg-soil-800/80 text-field-200 hover:bg-soil-700 transition"
              aria-label="Flip camera"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </>
      )}

      {/* Camera error fallback */}
      {cameraError && mode === "camera" && (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <Camera className="text-field-600" size={48} />
          <p className="text-field-200 text-sm">{cameraError}</p>
          <button
            onClick={openFilePicker}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-field-600 hover:bg-field-500 text-white text-sm font-medium transition"
          >
            <ImagePlus size={16} />
            Upload a photo instead
          </button>
        </div>
      )}

      {/* Preview */}
      {mode === "preview" && preview && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Captured lawn"
            className="w-full h-full object-cover"
          />
          {isAnalyzing && (
            <div className="absolute inset-0 bg-soil-900/60 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-field-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-field-200 text-sm font-medium">Analyzing your lawn…</p>
            </div>
          )}
          {!isAnalyzing && (
            <div className="absolute bottom-0 inset-x-0 p-4 flex gap-3 bg-gradient-to-t from-soil-900/80 to-transparent">
              <button
                onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-soil-800/80 text-field-200 hover:bg-soil-700 transition text-sm font-medium"
              >
                <X size={16} /> Retake
              </button>
              <button
                onClick={analyze}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-field-500 hover:bg-field-400 text-white transition text-sm font-medium shadow"
              >
                <Camera size={16} /> Analyze
              </button>
            </div>
          )}
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
      {/* Off-screen file input — display:none blocks iOS Safari programmatic click */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="absolute -left-[9999px] -top-[9999px] w-px h-px overflow-hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
