'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, RefreshCw, ChevronDown, ChevronUp, Download, ZoomIn, RotateCcw } from 'lucide-react';
import CameraCapture from '@/components/Camera';
import LocationPanel from '@/components/LocationPanel';
import { LocationContext } from '@/lib/prompts';

/* --- tiny helpers -------------------------------------------- */
function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-lg overflow-hidden ${
      accent ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-white/10 bg-white/5'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className={`text-sm font-semibold ${
          accent ? 'text-emerald-300' : 'text-white/90'
        }`}>{title}</span>
        {open
          ? <ChevronUp size={16} className="text-white/50 shrink-0" />
          : <ChevronDown size={16} className="text-white/50 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-white/80 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

/* --- main page ----------------------------------------------- */
export default function TurfAnalyzerPage() {
  type AppState = 'idle' | 'analyzing' | 'result' | 'error';
  const [appState, setAppState] = useState<AppState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImage2, setCapturedImage2] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationContext | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [photoRequest, setPhotoRequest] = useState<Record<string, any> | null>(null);
  const [secondOpinionData, setSecondOpinionData] = useState<Record<string, any> | null>(null);
  const [secondOpinionLoading, setSecondOpinionLoading] = useState(false);

  const fetchLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.');
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          setLocationData(data);
        } catch {
          setLocationData({ lat, lng });
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationError(err.message);
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const handleCapture = useCallback((dataUrl: string) => {
    setCapturedImage(dataUrl);
    setAppState('idle');
    setAnalysis(null);
    setPhotoRequest(null);
    setSecondOpinionData(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!capturedImage) return;
    setAppState('analyzing');
    setErrorMessage(null);
    setAnalysis(null);
    setPhotoRequest(null);
    setSecondOpinionData(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          ...(capturedImage2 ? { image2: capturedImage2 } : {}),
          location: locationData ?? { lat: 0, lng: 0 },
        }),
      });
      const json = await res.json();
      if (json?.analysis?.needs_more_photo) {
        setPhotoRequest(json.analysis);
        setAppState('result');
      } else if (json?.analysis) {
        setAnalysis(json.analysis);
        setAppState('result');
      } else {
        setErrorMessage(json?.error ?? 'Analysis failed. Please try again.');
        setAppState('error');
      }
    } catch (e) {
      setErrorMessage('Network error. Please check your connection.');
      setAppState('error');
      console.error(e);
    }
  }, [capturedImage, capturedImage2, locationData]);

  const handleSecondOpinion = async () => {
    if (!capturedImage || !analysis) return;
    setSecondOpinionLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          ...(capturedImage2 ? { image2: capturedImage2 } : {}),
          location: locationData ?? { lat: 0, lng: 0 },
          isSecondOpinion: true,
          originalDiagnosis: (analysis as any)?.identified?.primary ?? 'unknown',
          originalAnalysis: analysis,
        }),
      });
      const json = await res.json();
      if (json?.analysis && !json.analysis.needs_more_photo) {
        setSecondOpinionData(json.analysis);
      }
    } catch (e) {
      console.error('[second opinion]', e);
    } finally {
      setSecondOpinionLoading(false);
    }
  };

  const reset = () => {
    setAppState('idle');
    setAnalysis(null);
    setCapturedImage(null);
    setCapturedImage2(null);
    setErrorMessage(null);
    setPhotoRequest(null);
    setSecondOpinionData(null);
  };

  /* -- PDF download ------------------------------------------- */
  const handleDownloadPDF = async () => {
    if (!analysis) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const margin = 40;
      const pageW = doc.internal.pageSize.getWidth();
      const maxW = pageW - margin * 2;
      let y = margin;

      const addText = (text: string, size = 11, bold = false, color: [number, number, number] = [30, 30, 30]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxW);
        lines.forEach((line: string) => {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += size * 1.4;
        });
        y += 4;
      };

      const addSection = (label: string, value: unknown) => {
        if (!value) return;
        addText(label, 11, true, [20, 100, 60]);
        if (typeof value === 'string') {
          addText(value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => addText(`• ${typeof item === 'string' ? item : JSON.stringify(item)}`, 10));
        } else {
          addText(JSON.stringify(value, null, 2), 9);
        }
        y += 6;
      };

      addText('LawnAI Turf Analysis Report', 18, true, [20, 100, 60]);
      addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 10, false, [100, 100, 100]);
      if (locationData?.city) addText(`Location: ${locationData.city}${locationData.state ? `, ${locationData.state}` : ''}`, 10, false, [80, 80, 80]);
      y += 10;

      const a = analysis;
      addSection('Identified Issue', a?.identified?.primary);
      addSection('Confidence', a?.identified?.confidence);
      addSection('Visual Evidence', a?.identified?.visual_evidence);
      addSection('Common Names', a?.identified?.common_names?.join(', '));
      addSection('Grass Type Detected', a?.grass_type?.detected);
      addSection('Summary', a?.summary);
      addSection('Resolution Steps', a?.resolution?.steps);
      addSection('Timeline', a?.timeline?.phases?.map((p: any) => `${p.phase}: ${p.description}`)?.join('\n'));
      addSection('Fertilizer Products', a?.products?.fertilizer?.map((p: any) => `${p.name} (${p.manufacturer})`)?.join('\n'));
      addSection('Herbicide Products', a?.products?.herbicide?.map((p: any) => `${p.name} (${p.manufacturer})`)?.join('\n'));
      addSection('Fungicide Products', a?.products?.fungicide?.map((p: any) => `${p.name} (${p.manufacturer})`)?.join('\n'));
      addSection('Insecticide Products', a?.products?.insecticide?.map((p: any) => `${p.name} (${p.manufacturer})`)?.join('\n'));
      addSection('Application Notes', a?.application_notes);
      addSection('Soil Profile', a?._soil_profile?.label);
      addSection('State Compliance', a?.state_compliance?.notes);

      doc.save(`LawnAI-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  /* -- render helpers ---------------------------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderProductList = (products: any[]) => {
    if (!products?.length) return null;
    return (
      <ul className="space-y-2 mt-1">
        {products.map((p: any, i: number) => (
          <li key={i} className="bg-white/5 rounded p-2 text-xs">
            <div className="font-semibold text-white/90">{p.name}</div>
            {p.manufacturer && <div className="text-white/50">{p.manufacturer}</div>}
            {p.rate && <div className="text-emerald-400/80">Rate: {p.rate}</div>}
            {p.notes && <div className="text-white/60 mt-0.5">{p.notes}</div>}
            {p.equivalent_product && (
              <div className="text-white/40 mt-0.5 text-[11px]">Alt: {p.equivalent_product}</div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderAnalysis = (data: Record<string, any>, isSecondOp = false) => {
    const a = data;
    const label = isSecondOp ? 'Second Opinion' : 'Analysis';
    return (
      <div className="space-y-3">
        {/* Header badge */}
        {isSecondOp && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/30 border border-blue-500/30 rounded-lg">
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wide">⚡ Second Opinion — GPT-4o</span>
          </div>
        )}

        {/* Primary identification */}
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
          <p className="text-xs text-white/50 uppercase tracking-wide mb-1">{label} — Primary Finding</p>
          <p className="text-white font-semibold text-base">{a?.identified?.primary ?? 'Unknown'}</p>
          {a?.identified?.confidence && (
            <p className="text-emerald-400 text-xs mt-0.5">Confidence: {a.identified.confidence}</p>
          )}
          {a?.identified?.common_names?.length > 0 && (
            <p className="text-white/50 text-xs mt-1">Also known as: {a.identified.common_names.join(', ')}</p>
          )}
        </div>

        {/* Second opinion agreement/disagreement */}
        {isSecondOp && a?.second_opinion_reasoning && (
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-1">Cross-Model Assessment</p>
            <p className="text-white/80 text-sm leading-relaxed">{a.second_opinion_reasoning}</p>
          </div>
        )}

        {/* Grass type */}
        {a?.grass_type?.detected && (
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            <span className="text-xs text-white/50">Grass Type: </span>
            <span className="text-sm text-white/80">{a.grass_type.detected}</span>
            {a.grass_type.confidence && <span className="text-xs text-white/40 ml-2">({a.grass_type.confidence})</span>}
          </div>
        )}

        {/* Summary */}
        {a?.summary && (
          <CollapsibleSection title="Summary">
            <p className="leading-relaxed">{a.summary}</p>
          </CollapsibleSection>
        )}

        {/* Visual evidence */}
        {a?.identified?.visual_evidence && (
          <CollapsibleSection title="Visual Evidence">
            <p className="leading-relaxed">{a.identified.visual_evidence}</p>
          </CollapsibleSection>
        )}

        {/* Resolution steps */}
        {a?.resolution?.steps?.length > 0 && (
          <CollapsibleSection title="Resolution Steps" defaultOpen>
            <ol className="list-decimal list-inside space-y-1.5">
              {a.resolution.steps.map((step: string, i: number) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
            {a?.resolution?.elaborate && (
              <CollapsibleSection title="Detailed Notes">
                <p className="leading-relaxed">{a.resolution.elaborate}</p>
              </CollapsibleSection>
            )}
          </CollapsibleSection>
        )}

        {/* Timeline */}
        {a?.timeline?.phases?.length > 0 && (
          <CollapsibleSection title="Treatment Timeline">
            <div className="space-y-2">
              {a.timeline.phases.map((phase: any, i: number) => (
                <div key={i} className="border-l-2 border-emerald-500/40 pl-3">
                  <p className="font-semibold text-emerald-300/80 text-xs">{phase.phase}</p>
                  <p className="text-white/70">{phase.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Products */}
        {(a?.products?.fertilizer?.length > 0 || a?.products?.herbicide?.length > 0 ||
          a?.products?.fungicide?.length > 0 || a?.products?.insecticide?.length > 0) && (
          <CollapsibleSection title="Recommended Products" accent>
            {a.products?.fertilizer?.length > 0 && (
              <div>
                <p className="text-xs text-white/50 font-semibold uppercase mb-1">Fertilizer</p>
                {renderProductList(a.products.fertilizer)}
              </div>
            )}
            {a.products?.herbicide?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/50 font-semibold uppercase mb-1">Herbicide</p>
                {renderProductList(a.products.herbicide)}
              </div>
            )}
            {a.products?.fungicide?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/50 font-semibold uppercase mb-1">Fungicide</p>
                {renderProductList(a.products.fungicide)}
              </div>
            )}
            {a.products?.insecticide?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/50 font-semibold uppercase mb-1">Insecticide</p>
                {renderProductList(a.products.insecticide)}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Application notes */}
        {a?.application_notes && (
          <CollapsibleSection title="Application Notes">
            <p className="leading-relaxed">{a.application_notes}</p>
          </CollapsibleSection>
        )}

        {/* Soil profile */}
        {a?._soil_profile?.label && (
          <CollapsibleSection title={`Soil Profile — ${a._soil_profile.label}`}>
            {a._soil_profile.notes && <p className="leading-relaxed">{a._soil_profile.notes}</p>}
            {a._soil_profile.fertFrequency && <p className="mt-1"><span className="text-white/50">Fertilizer frequency:</span> {a._soil_profile.fertFrequency}</p>}
            {a._soil_profile.drainageClass && <p><span className="text-white/50">Drainage:</span> {a._soil_profile.drainageClass}</p>}
          </CollapsibleSection>
        )}

        {/* State compliance */}
        {a?.state_compliance?.notes && (
          <CollapsibleSection title="State Compliance">
            <p className="leading-relaxed">{a.state_compliance.notes}</p>
          </CollapsibleSection>
        )}
      </div>
    );
  };

  /* -- JSX --------------------------------------------------- */
  // Result / error view
  if (appState === 'result' || appState === 'error') {
    return (
      <main className="min-h-screen bg-black text-white">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-12 bg-black/80 backdrop-blur border-b border-white/10">
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
            <RotateCcw size={15} /> New Photo
          </button>
          <span className="text-sm font-semibold text-white/80">Turf Analyzer</span>
          {analysis && (
            <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300">
              <Download size={15} /> PDF
            </button>
          )}
          {!analysis && <div className="w-16" />}
        </header>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Error state */}
          {appState === 'error' && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Photo request */}
          {photoRequest && (
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg px-4 py-3">
              <p className="text-amber-300 text-sm font-semibold mb-1">Additional Photo Needed</p>
              <p className="text-white/70 text-sm">{photoRequest.message ?? 'Please provide a close-up photo for a more accurate diagnosis.'}</p>
              <button
                onClick={reset}
                className="mt-3 text-sm text-amber-400 underline underline-offset-2"
              >
                Take another photo
              </button>
            </div>
          )}

          {/* Thumbnail */}
          {capturedImage && (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured turf"
                className="w-full rounded-xl object-cover max-h-48"
              />
              {capturedImage2 && (
                <img
                  src={capturedImage2}
                  alt="Detail photo"
                  className="absolute bottom-2 right-2 w-20 h-20 rounded-lg object-cover border-2 border-emerald-500"
                />
              )}
            </div>
          )}

          {/* Analysis */}
          {analysis && renderAnalysis(analysis)}

          {/* Second opinion section */}
          {analysis && (
            <div className="border-t border-white/10 pt-4">
              {!secondOpinionData && (
                <button
                  onClick={handleSecondOpinion}
                  disabled={secondOpinionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-500/40 text-blue-300 text-sm font-semibold hover:bg-blue-900/20 disabled:opacity-50"
                >
                  {secondOpinionLoading ? (
                    <><Spinner size={16} /> Getting second opinion…</>
                  ) : (
                    <><ZoomIn size={16} /> Get Second Opinion (GPT-4o)</>  
                  )}
                </button>
              )}
              {secondOpinionData && renderAnalysis(secondOpinionData, true)}
            </div>
          )}
        </div>
      </main>
    );
  }

  /* -- Capture view ------------------------------------------ */
  return (
    <main className="flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 3rem)' }}>
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-4 h-12 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2">
          {locationLoading
            ? <RefreshCw size={14} className="text-white/40 animate-spin" />
            : <MapPin size={14} className="text-emerald-400" />}
          <span className="text-xs text-white/60 truncate max-w-[180px]">
            {locationError
              ? 'Location unavailable'
              : locationData?.city
                ? `${locationData.city}${locationData.state ? `, ${locationData.state}` : ''}`
                : 'Locating…'}
          </span>
        </div>
        <span className="text-sm font-semibold text-white/80">Turf Analyzer</span>
        <button onClick={fetchLocation} className="text-xs text-white/40 hover:text-white/70 px-1 py-0.5">
          <RefreshCw size={14} />
        </button>
      </header>

      {/* Camera + Upload button: fills all remaining height */}
      <div className="flex-1 flex flex-col min-h-0 max-w-lg mx-auto w-full px-4 pt-3 gap-3 pb-3">
        {/* Location panel */}
        <div className="shrink-0"><LocationPanel /></div>

        {/* Camera + upload — fills remaining space */}
        <div className="flex-1 min-h-0">
          <CameraCapture
            fill
            onCapture={handleCapture}
            isAnalyzing={appState === 'analyzing'}
          />
        </div>

        {/* Analyze button — only shown once a photo is captured */}
        {capturedImage && appState !== 'analyzing' && (
          <button
            onClick={handleAnalyze}
            className="shrink-0 w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg"
          >
            Analyze Turf
          </button>
        )}
        {appState === 'analyzing' && (
          <div className="shrink-0 w-full py-3 rounded-2xl bg-emerald-600/60 flex items-center justify-center gap-3">
            <Spinner />
            <span className="text-white font-semibold">Analyzing…</span>
          </div>
        )}
      </div>
    </main>
  );
}
