"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, X, Upload } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  fill?: boolean;
}

// ─── Image processing helpers (ported from PhotoUpload) ────────────────────

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.82;

function drawToCanvas(
  source: ImageBitmap | HTMLImageElement,
  w: number,
  h: number
): string | null {
  if (w > MAX_DIM || h > MAX_DIM) {
    const r = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return out && out.length > 200 ? out : null;
}

/**
 * Normalize tricky file types before canvas decoding:
 *  - HEIC/HEIF  → attempt heic2any conversion (lazy-loaded)
 *  - type="" (Google Photos cloud-only) → re-wrap bytes as image/jpeg
 */
async function normalizeBlob(file: File): Promise<Blob> {
  const rawType = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  const isHeic =
    rawType === "image/heic" ||
    rawType === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await (heic2any as Function)({
        blob: file,
        toType: "image/jpeg",
        quality: 0.85,
      });
      return Array.isArray(converted) ? converted[0] : converted;
    } catch (e) {
      console.warn("heic2any failed", e);
    }
  }

  // Google Photos cloud-only: type is empty — re-wrap raw bytes as JPEG
  if (!rawType || !rawType.startsWith("image/")) {
    try {
      const buffer = await file.arrayBuffer();
      return new Blob([buffer], { type: "image/jpeg" });
    } catch {
      return file;
    }
  }

  return file;
}

/**
 * Compress a user-selected file to a JPEG data URL.
 * Strategy 1: createImageBitmap — most reliable on modern Android Chrome.
 * Strategy 2: FileReader → Image element → canvas (fallback).
 */
async function compressToBase64(file: File): Promise<string> {
  const blob = await normalizeBlob(file);

  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      const result = drawToCanvas(bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      if (result) return result;
    } catch { /* fall through to strategy 2 */ }
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) { reject(new Error("FileReader returned empty")); return; }
      const img = new Image();
      img.onload = () => {
        const result = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
        if (result) resolve(result);
        else reject(new Error("Canvas produced empty output"));
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    const target =
      blob instanceof File
        ? blob
        : new File([blob], file.name || "photo.jpg", { type: "image/jpeg" });
    reader.readAsDataURL(target);
  });
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CameraCapture({ onCapture, isAnalyzing, fill }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"camera" | "preview">("camera");
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
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
          : "Camera not available. Use the Upload Photo button below to add a photo.";
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
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    setPreview(dataUrl);
    setMode("preview");
    stopStream();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same photo can be re-selected if needed
    e.target.value = "";

    setCameraError(null);
    setProcessing(true);
    try {
      const base64 = await compressToBase64(file);
      setPreview(base64);
      stopStream();
      setMode("preview");
    } catch (err) {
      console.error("Upload failed", err, {
        name: file.name,
        sizeKB: Math.round(file.size / 1024),
        type: file.type || "(none)",
      });
      setCameraError(
        "Couldn't open that photo. Try saving it to your device first, or take a new photo with the camera."
      );
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    setPreview(null);
    setCameraError(null);
    setProcessing(false);
    setMode("camera");
    startCamera();
  };

  const analyze = () => {
    if (preview) onCapture(preview);
  };

  const flipCamera = () => setFacingMode((f) => (f === "environment" ? "user" : "environment"));

  // When fill=true the component manages its own vertical space:
  // camera/preview fills flex-1, upload button is shrink-0 below.
  const outerClass = fill ? "h-full flex flex-col gap-3" : "";
  const mediaClass = fill
    ? "relative w-full flex-1 min-h-0 rounded-2xl overflow-hidden bg-soil-900 shadow-2xl"
    : "relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-soil-900 shadow-2xl";

  return (
    <div className={outerClass}>

      {/* ── Camera view (hidden once photo is selected) ── */}
      {mode === "camera" && (
        <>
          <div className={mediaClass}>
            {!cameraError && (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {/* Corner reticle */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border border-field-300/40 rounded-lg" />
                  <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-field-300 rounded-tl" />
                  <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-field-300 rounded-tr" />
                  <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-field-300 rounded-bl" />
                  <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-field-300 rounded-br" />
                </div>
                {/* Capture + flip controls */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-center gap-8 bg-gradient-to-t from-soil-900/80 to-transparent">
                  <button
                    onClick={capture}
                    className="w-[4.5rem] h-[4.5rem] rounded-full bg-field-400 hover:bg-field-300 border-4 border-field-200 transition shadow-lg active:scale-95"
                    aria-label="Capture photo"
                  >
                    <Camera className="mx-auto text-soil-900" size={26} />
                  </button>
                  <button
                    onClick={flipCamera}
                    className="p-3.5 rounded-full bg-soil-800/80 text-field-200 hover:bg-soil-700 transition"
                    aria-label="Flip camera"
                  >
                    <RefreshCw size={22} />
                  </button>
                </div>
              </>
            )}
            {cameraError && (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                <Camera className="text-field-600" size={52} />
                <p className="text-field-200 text-sm">{cameraError}</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Upload Photo — label wraps input directly for reliable Android file picker */}
          {processing ? (
            <div className="shrink-0 w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-soil-800/80 border border-white/10 text-field-400 text-base">
              <div className="w-4 h-4 border-2 border-field-500/40 border-t-field-400 rounded-full animate-spin" />
              Preparing photo…
            </div>
          ) : (
            <label className="shrink-0 w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-soil-800/80 border border-white/10 text-field-200 hover:bg-soil-700 hover:text-white active:scale-[0.98] transition text-base font-medium cursor-pointer select-none">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
              <Upload size={18} />
              Upload Photo
            </label>
          )}
        </>
      )}

      {/* ── Photo preview (replaces camera entirely) ── */}
      {mode === "preview" && preview && (
        <div className={`${mediaClass} ring-4 ring-green-500`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Captured turf" className="w-full h-full object-cover" />

          {/* In-app badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-white text-[10px] font-semibold tracking-wide">LAWN AI</span>
          </div>

          {/* Analyzing spinner */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-[3px] border-green-400 border-t-transparent animate-spin" />
              <p className="text-white text-sm font-medium">Analyzing your turf…</p>
            </div>
          )}

          {/* Retake / Analyze */}
          {!isAnalyzing && (
            <div className="absolute bottom-0 inset-x-0 px-4 pb-5 pt-16 flex gap-3 bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/15 text-white hover:bg-white/25 transition text-base font-medium backdrop-blur-sm"
              >
                <X size={18} /> Retake
              </button>
              <button
                onClick={analyze}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white transition text-base font-semibold shadow-lg"
              >
                <Camera size={18} /> Analyze
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
