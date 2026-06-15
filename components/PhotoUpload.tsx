"use client";

import { useRef, useState } from "react";
import { Upload, ImageIcon, X, Scan } from "lucide-react";

interface PhotoUploadProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
}

/** Resize and compress an image file using canvas.
 *  Max dimension: 1200px. Quality: 0.75 JPEG.
 *  Keeps the file well under Vercel's 4.5 MB body limit. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = blobUrl;
  });
}

export default function PhotoUpload({ onCapture, isAnalyzing }: PhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevBlobRef = useRef<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Revoke previous blob URL
    if (prevBlobRef.current) {
      URL.revokeObjectURL(prevBlobRef.current);
    }

    // Create blob URL for instant preview
    const url = URL.createObjectURL(file);
    prevBlobRef.current = url;
    setPreviewUrl(url);
    setSelectedFile(file);
  };

  const handleClear = () => {
    if (prevBlobRef.current) {
      URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setError(null);
    setCompressing(true);
    try {
      const base64 = await compressImage(selectedFile);
      onCapture(base64);
    } catch {
      setError("Could not process the photo. Please try a different image.");
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="w-full mt-3">
      {/* Upload button — label wraps the input so no JS .click() is needed */}
      {!previewUrl && (
        <label className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-soil-800 hover:bg-soil-700 border border-field-700/40 text-field-200 text-sm font-medium cursor-pointer transition active:scale-95 select-none">
          {/* Input fills the entire label — transparent overlay; label click forwards natively */}
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

      {/* Preview + actions shown after a photo is selected */}
      {previewUrl && (
        <div className="w-full rounded-xl overflow-hidden border border-field-700/40 bg-soil-800">
          {/* Photo preview */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected photo"
              className="w-full max-h-64 object-contain bg-soil-900"
            />
            {/* Clear button */}
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-soil-900/80 text-field-300 hover:text-white transition"
              aria-label="Remove photo"
            >
              <X size={14} />
            </button>
          </div>

          {/* Action bar */}
          <div className="p-3 flex gap-2">
            {/* Re-select button */}
            <label className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-soil-700 hover:bg-soil-600 text-field-200 text-sm font-medium cursor-pointer transition">
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
              <ImageIcon size={14} />
              Change
            </label>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || compressing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-field-500 hover:bg-field-400 disabled:opacity-60 text-white text-sm font-medium transition"
            >
              {(isAnalyzing || compressing) ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {compressing ? "Preparing…" : "Analyzing…"}
                </>
              ) : (
                <>
                  <Scan size={14} />
                  Analyze
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="px-3 pb-3 text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
