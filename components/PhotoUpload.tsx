'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, ImagePlus, FileImage } from 'lucide-react';

interface PhotoUploadProps {
  onCapture: (base64: string) => void;
  isAnalyzing: boolean;
  themeColor?: string;
  /** Called with true when a file is staged, false when cleared */
  onPreviewChange?: (hasPreview: boolean) => void;
  /** When true, renders as a tall column panel matching the camera height */
  columnMode?: boolean;
}

export default function PhotoUpload({
  onCapture,
  isAnalyzing,
  themeColor = '#4a8535',
  onPreviewChange,
  columnMode = false,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = (file: File) => {
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

  // ─── COLUMN MODE (side-by-side panel) ────────────────────────────────────
  if (columnMode) {
    if (!preview) {
      return (
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-2 w-full h-full rounded-2xl cursor-pointer transition"
          style={{
            border: `2px dashed ${isDragOver ? themeColor : `${themeColor}50`}`,
            backgroundColor: isDragOver ? `${themeColor}14` : `${themeColor}08`,
            opacity: isAnalyzing ? 0.5 : 1,
            minHeight: '120px',
          }}
        >
          <ImagePlus size={22} style={{ color: themeColor }} />
          <span className="text-xs font-bold text-center leading-tight" style={{ color: themeColor }}>
            {isDragOver ? 'Drop photo' : 'Upload\nPhoto'}
          </span>
          <span className="text-[9px] text-center leading-tight" style={{ color: `${themeColor}80` }}>
            tap or drag
          </span>
          {/* NOTE: no capture attribute — opens file picker, not camera */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </label>
      );
    }

    return (
      <div className="flex flex-col h-full w-full gap-0 rounded-2xl overflow-hidden"
        style={{ border: `2px solid ${themeColor}30` }}>
        {/* Photo preview fills top */}
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: '80px' }}>
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={fileName ?? 'Preview'}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: `${themeColor}12` }}
            >
              <FileImage size={24} style={{ color: themeColor }} />
              <p className="text-[9px] font-semibold text-center px-2" style={{ color: themeColor }}>
                Photo ready
              </p>
            </div>
          )}
          {/* Change button overlay */}
          <button
            onClick={handleClear}
            disabled={isAnalyzing}
            className="absolute top-2 right-2 text-white text-[9px] px-2 py-0.5 rounded-full transition"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            ✕ Change
          </button>
        </div>

        {/* Analyze button at bottom */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-1.5 py-3 text-white font-bold text-xs disabled:opacity-40 transition active:scale-95 shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          {isAnalyzing ? (
            <><Loader2 size={13} className="animate-spin" /> Analyzing…</>
          ) : (
            <><Upload size={13} /> Analyze</>
          )}
        </button>
      </div>
    );
  }

  // ─── DEFAULT MODE (stacked, original behavior) ────────────────────────────
  return (
    <div className="flex flex-col gap-2">
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
          {/* NOTE: no capture attribute — opens file picker, not camera */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </label>
      )}

      {preview && (
        <div className="flex flex-col gap-2">
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
