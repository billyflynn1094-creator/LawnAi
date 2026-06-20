'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, ImagePlus } from 'lucide-react';

interface PhotoUploadProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  themeColor?: string;
}

export default function PhotoUpload({
  onCapture,
  isAnalyzing,
  themeColor = '#4a8535',
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      setPreview(dataUrl);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = () => {
    if (!preview) return;
    const base64 = preview.split(',')[1];
    if (base64) onCapture(base64);
  };

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Upload button */}
      {!preview && (
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition text-white font-semibold text-sm"
          style={{
            backgroundColor: isDragOver ? `${themeColor}cc` : themeColor,
            opacity: isAnalyzing ? 0.5 : 1,
          }}
        >
          <ImagePlus size={16} />
          {isDragOver ? 'Drop to upload' : 'Upload a photo'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </label>
      )}

      {/* Preview */}
      {preview && (
        <div className="flex flex-col gap-2">
          <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: `${themeColor}30` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={fileName ?? 'Preview'} className="w-full max-h-48 object-cover" />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 text-xs transition"
              disabled={isAnalyzing}
            >
              ✕
            </button>
          </div>
          {fileName && (
            <p className="text-xs text-gray-500 px-1 truncate">{fileName}</p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            {isAnalyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
            ) : (
              <><Upload size={16} /> Analyze Photo</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
