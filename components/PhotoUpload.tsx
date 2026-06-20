'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, ImagePlus, FileImage } from 'lucide-react';

interface PhotoUploadProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  themeColor?: string;
  /** Called with true when a file is staged, false when cleared */
  onPreviewChange?: (hasPreview: boolean) => void;
}

export default function PhotoUpload({
  onCapture,
  isAnalyzing,
  themeColor = '#4a8535',
  onPreviewChange,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = (file: File) => {
    // Accept image/* AND .heic/.heif by extension (type may be empty on some Android)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isHeic = ext === 'heic' || ext === 'heif';
    if (!file.type.startsWith('image/') && !isHeic) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      setPreview(dataUrl);
      setFileName(file.name);
      setImgError(false);
      onPreviewChange?.(true);
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
    setImgError(false);
    onPreviewChange?.(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Upload button — only shown when no file is staged */}
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
            accept="image/*,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </label>
      )}

      {/* Preview — shown when file is staged */}
      {preview && (
        <div className="flex flex-col gap-2">
          {/* Image preview or HEIC placeholder */}
          <div
            className="relative rounded-2xl overflow-hidden border"
            style={{ borderColor: `${themeColor}30` }}
          >
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={fileName ?? 'Preview'}
                className="w-full max-h-64 object-cover block"
                onError={() => setImgError(true)}
              />
            ) : (
              /* Fallback for HEIC / unsupported formats */
              <div
                className="w-full h-40 flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: `${themeColor}12` }}
              >
                <FileImage size={36} style={{ color: themeColor }} />
                <p className="text-xs font-semibold" style={{ color: themeColor }}>
                  Photo ready to analyze
                </p>
                <p className="text-[10px] text-gray-400 px-4 text-center">
                  Preview unavailable for this format, but analysis will work.
                </p>
              </div>
            )}

            {/* Filename bar at bottom */}
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
            >
              <span className="text-white text-xs truncate max-w-[80%]">{fileName}</span>
              <button
                onClick={handleClear}
                disabled={isAnalyzing}
                className="text-white text-xs px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 transition shrink-0 ml-2"
              >
                ✕ Change
              </button>
            </div>
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            {isAnalyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
            ) : (
              <><Upload size={16} /> Analyze Photo</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
