"use client";

import { useState } from "react";
import { Upload, ImageIcon, X, Scan } from "lucide-react";

interface PhotoUploadProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
}

const MAX_DIM = 1200;
const JPEG_QUALITY = 0.78;

/**
 * Compress via createImageBitmap — most memory-efficient, handles many formats.
 * Falls back to FileReader → Image element if createImageBitmap is unavailable.
 */
async function compressToBase64(file: File): Promise<string> {
  // ── Strategy 1: createImageBitmap (supported in Chrome 50+) ──
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file);
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const r = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        const result = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        if (result && result.length > 100) return result;
      } else {
        bitmap.close();
      }
    } catch {
      // fall through to strategy 2
    }
  }

  // ── Strategy 2: FileReader → base64 → Image → Canvas ──
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) { reject(new Error("FileReader returned empty")); return; }

      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          const r = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ onCapture, isAnalyzing }: PhotoUploadProps) {
  // compressed base64 — used as both preview src and analysis payload
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
      console.error("Photo compression failed:", err);
      setError("Could not load photo. Try a different image or use the camera button above.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setPreviewBase64(null);
    setError(null);
  };

  const handleAnalyze = () => {
    if (previewBase64) onCapture(previewBase64);
  };

  return (
    <div className="w-full mt-3">
      {/* Upload button */}
      {!previewBase64 && !processing && (
        <label className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-soil-800 hover:bg-soil-700 border border-field-700/40 text-field-200 text-sm font-medium cursor-pointer transition active:scale-95 select-none">
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              width: "100%",
              height: "100%",
              cursor: "pointer",
            }}
          />
          <Upload size={16} />
          Upload Photo
        </label>
      )}

      {/* Processing spinner */}
      {processing && (
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-soil-800 border border-field-700/40 text-field-400 text-sm">
          <div className="w-4 h-4 border-2 border-field-500/40 border-t-field-500 rounded-full animate-spin" />
          Preparing photo…
        </div>
      )}

      {/* Error without preview */}
      {error && !previewBase64 && (
        <div className="w-full rounded-xl bg-soil-800 border border-red-800/40 p-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
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

      {/* Preview + actions */}
      {previewBase64 && (
        <div className="w-full rounded-xl overflow-hidden border border-field-700/40 bg-soil-800">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewBase64}
              alt="Selected photo"
              className="w-full max-h-64 object-contain bg-soil-900"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-soil-900/80 text-field-300 hover:text-white transition"
              aria-label="Remove photo"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3 flex gap-2">
            <label className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-soil-700 hover:bg-soil-600 text-field-200 text-sm font-medium cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
              />
              <ImageIcon size={14} />
              Change
            </label>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-field-500 hover:bg-field-400 disabled:opacity-60 text-white text-sm font-medium transition"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Scan size={14} />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
