"use client";

import { useState } from "react";
import { Upload, ImageIcon, X, Scan } from "lucide-react";

interface PhotoUploadProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
}

const MAX_DIM = 1200;
const JPEG_QUALITY = 0.78;

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
 * Google Photos cloud-only images return File objects with type="".
 * Read raw bytes and re-wrap as image/jpeg so decoders know the format.
 */
async function normalizeBlob(file: File): Promise<Blob> {
  if (file.type && file.type.startsWith("image/")) return file;
  try {
    const buffer = await file.arrayBuffer();
    return new Blob([buffer], { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function compressToBase64(file: File): Promise<string> {
  const blob = await normalizeBlob(file);

  // Strategy 1: createImageBitmap
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      const result = drawToCanvas(bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      if (result) return result;
    } catch { /* fall through */ }
  }

  // Strategy 2: FileReader -> Image -> Canvas
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) { reject(new Error("FileReader empty")); return; }
      const img = new Image();
      img.onload = () => {
        const result = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
        if (result) resolve(result);
        else reject(new Error("Canvas empty"));
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    const readTarget =
      blob instanceof File
        ? blob
        : new File([blob], file.name || "photo.jpg", { type: "image/jpeg" });
    reader.readAsDataURL(readTarget);
  });
}

export default function PhotoUpload({ onCapture, isAnalyzing }: PhotoUploadProps) {
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewBase64(null);
    setError(null);
    setProcessing(true);
    try {
      const base64 = await compressToBase64(file);
      setPreviewBase64(base64);
    } catch (err) {
      const sizeKB = Math.round(file.size / 1024);
      const type = file.type || "no-type";
      console.error("compress failed", err, { name: file.name, sizeKB, type });
      setError(
        `Could not process photo (${sizeKB} KB, ${type}). ` +
        "Try opening Google Photos, saving the photo to your device, then uploading from Downloads."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => { setPreviewBase64(null); setError(null); };
  const handleAnalyze = () => { if (previewBase64) onCapture(previewBase64); };

  return (
    <div className="w-full mt-3">
      {!previewBase64 && !processing && (
        <label className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-soil-800 hover:bg-soil-700 border border-field-700/40 text-field-200 text-sm font-medium cursor-pointer transition active:scale-95 select-none">
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
          />
          <Upload size={16} />
          Upload Photo
        </label>
      )}

      {processing && (
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-soil-800 border border-field-700/40 text-field-400 text-sm">
          <div className="w-4 h-4 border-2 border-field-500/40 border-t-field-500 rounded-full animate-spin" />
          Preparing photo…
        </div>
      )}

      {error && !previewBase64 && (
        <div className="w-full rounded-xl bg-soil-800 border border-red-800/40 p-4">
          <p className="text-red-400 text-xs mb-3 leading-relaxed">{error}</p>
          <label className="relative flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-soil-700 hover:bg-soil-600 text-field-200 text-sm font-medium cursor-pointer transition">
            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
            />
            <ImageIcon size={14} /> Try another photo
          </label>
        </div>
      )}

      {previewBase64 && (
        <div className="w-full rounded-xl overflow-hidden border border-field-700/40 bg-soil-800">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewBase64} alt="Selected photo" className="w-full max-h-64 object-contain bg-soil-900" />
            <button onClick={handleClear} className="absolute top-2 right-2 p-1.5 rounded-full bg-soil-900/80 text-field-300 hover:text-white transition" aria-label="Remove photo">
              <X size={14} />
            </button>
          </div>
          <div className="p-3 flex gap-2">
            <label className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-soil-700 hover:bg-soil-600 text-field-200 text-sm font-medium cursor-pointer transition">
              <input type="file" accept="image/*" onChange={handleChange} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
              <ImageIcon size={14} /> Change
            </label>
            <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-field-500 hover:bg-field-400 disabled:opacity-60 text-white text-sm font-medium transition">
              {isAnalyzing ? (<><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analyzing…</>) : (<><Scan size={14} />Analyze</>)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
