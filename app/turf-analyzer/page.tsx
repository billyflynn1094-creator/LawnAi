'use client';

import { useState, useEffect, useCallback } from 'react';
import CameraCapture from '@/components/Camera';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import DownloadReportButton from '@/components/DownloadReportButton';
import { Scan, RotateCcw, MapPin, Navigation, ScanSearch, AlertCircle } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: 'cool' | 'warm' | 'transition';
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  weather_hist?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  soil_temp_hist_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

type AppState = 'idle' | 'analyzing' | 'needs_more_photo' | 'results' | 'error';
type LocationSource = 'gps' | 'zip';

/** Shared location sidebar used in both layout modes */
function LocationPanel({
  locationData,
  locationLoading,
  locationError,
  locationSource,
  showZipInput,
  zipInput,
  zipLoading,
  zipError,
  onRetry,
  onToggleZip,
  onZipChange,
  onZipSubmit,
  onRevertGps,
}: {
  locationData: LocationData | null;
  locationLoading: boolean;
  locationError: string | null;
  locationSource: LocationSource;
  showZipInput: boolean;
  zipInput: string;
  zipLoading: boolean;
  zipError: string | null;
  onRetry: () => void;
  onToggleZip: () => void;
  onZipChange: (v: string) => void;
  onZipSubmit: () => void;
  onRevertGps: () => void;
}) {
  return (
    <div className="space-y-2">
      <LocationBadge
        location={locationData}
        loading={locationLoading}
        error={locationError}
        onRetry={onRetry}
      />
      {!locationLoading && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs text-field-400">
            {locationSource === 'gps' ? (
              <>
                <Navigation size={11} className="text-field-500" />
                <span>GPS</span>
              </>
            ) : (
              <>
                <MapPin size={11} className="text-sky-400" />
                <span className="text-sky-400">Manual ZIP</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {locationSource === 'zip' && (
              <button
                onClick={onRevertGps}
                className="text-xs text-field-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <Navigation size={10} /> Use GPS
              </button>
            )}
            <button
              onClick={onToggleZip}
              className="text-xs text-field-300 hover:text-white transition-colors flex items-center gap-1"
            >
              <MapPin size={10} /> Change ZIP
            </button>
          </div>
        </div>
      )}
      {showZipInput && (
        <div className="rounded-xl bg-field-800/50 border border-white/8 p-3 space-y-2">
          <p className="text-xs text-field-300 font-medium">Enter ZIP code to change location</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 08502"
              value={zipInput}
              onChange={e => onZipChange(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') onZipSubmit(); }}
              className="flex-1 rounded-lg bg-field-900/80 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-field-500 focus:outline-none focus:border-field-400 transition-colors"
            />
            <button
              onClick={onZipSubmit}
              disabled={zipLoading || zipInput.length !== 5}
              className="px-4 py-2 rounded-lg bg-field-600 text-white text-sm font-medium hover:bg-field-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {zipLoading ? '…' : 'Go'}
            </button>
          </div>
          {zipError && <p className="text-xs text-red-400">{zipError}</p>}
        </div>
      )}
    </div>
  );
}

export default function TurfAnalyzer() {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>('gps');
  const [zipInput, setZipInput] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [showZipInput, setShowZipInput] = useState(false);

  const [appState, setAppState] = useState<AppState>('idle');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysis, setAnalysis] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImage2, setCapturedImage2] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
          if (!res.ok) throw new Error('Location enrichment failed');
          const data = await res.json();
          setLocationData(data);
          setLocationSource('gps');
        } catch {
          setLocationData({ lat, lng });
          setLocationSource('gps');
        } finally {
          setLocationLoading(false);
        }
      },
      async (err) => {
        console.warn('Geolocation error:', err);
        try {
          const ipRes = await fetch('https://ipapi.co/json/');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.latitude && ipData.longitude) {
              const locRes = await fetch(`/api/location?lat=${ipData.latitude}&lng=${ipData.longitude}`);
              if (locRes.ok) {
                const data = await locRes.json();
                setLocationData(data);
                setLocationSource('gps');
                setLocationLoading(false);
                return;
              }
            }
          }
        } catch { /* IP fallback failed */ }
        setLocationError('Location unavailable — enter your ZIP code below.');
        setShowZipInput(true);
        setLocationLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const fetchLocationByZip = async (zip: string) => {
    if (!/^\d{5}$/.test(zip)) {
      setZipError('Please enter a valid 5-digit ZIP code.');
      return;
    }
    setZipLoading(true);
    setZipError(null);
    try {
      const geoRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!geoRes.ok) throw new Error('ZIP code not found.');
      const geoData = await geoRes.json();
      const lat = parseFloat(geoData.places[0]['latitude']);
      const lng = parseFloat(geoData.places[0]['longitude']);
      const locationRes = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
      if (!locationRes.ok) throw new Error('Location enrichment failed');
      const data = await locationRes.json();
      setLocationData(data);
      setLocationSource('zip');
      setShowZipInput(false);
      setZipInput('');
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Could not find that ZIP code.');
    } finally {
      setZipLoading(false);
    }
  };

  const revertToGps = () => {
    setShowZipInput(false);
    setZipInput('');
    setZipError(null);
    fetchLocation();
  };

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const handleCapture = async (base64: string) => {
    setCapturedImage(base64);
    setAppState('analyzing');
    setAnalysis(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          location: locationData ?? { lat: 0, lng: 0 },
        }),
      });
      if (!res.ok) {
        let errMsg = 'Analysis failed';
        try {
          const err = await res.json();
          errMsg = err.error ?? errMsg;
        } catch {
          errMsg = `Server error (${res.status}) — please try again`;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (data.analysis?.needs_more_photo === true) {
        setPhotoRequest(data.analysis.photo_request ?? {});
        setAppState('needs_more_photo');
        return;
      }
      setAnalysis(data.analysis);
      setAppState('results');
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setAppState('error');
    }
  };

  const handleSecondCapture = async (base64: string) => {
    setCapturedImage2(base64);
    setAppState('analyzing');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          image2: base64,
          location: locationData ?? { lat: 0, lng: 0 },
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      setAnalysis(data.analysis);
      setAppState('results');
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setAppState('error');
    }
  };

  const handleSecondOpinion = async () => {
    if (!capturedImage || !analysis) return;
    setSecondOpinionLoading(true);
    setSecondOpinionData(null);
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
    setSecondOpinionLoading(false);
  };

  const locationPanelProps = {
    locationData,
    locationLoading,
    locationError,
    locationSource,
    showZipInput,
    zipInput,
    zipLoading,
    zipError,
    onRetry: fetchLocation,
    onToggleZip: () => { setShowZipInput(v => !v); setZipError(null); },
    onZipChange: (v: string) => { setZipInput(v); setZipError(null); },
    onZipSubmit: () => fetchLocationByZip(zipInput),
    onRevertGps: revertToGps,
  };

  // ── Capture mode: idle or analyzing ─────────────────────────────────────
  const isCaptureMode = appState === 'idle' || (appState as string) === 'analyzing';

  if (isCaptureMode) {
    return (
      // Fill the viewport below the global nav (global nav = top-0, h-12 = 3rem)
      <main className="flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 3rem)' }}>

        {/* Local header */}
        <header className="shrink-0 bg-field-900/90 backdrop-blur-lg border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
            <Scan size={15} className="text-field-400 mr-2" />
            <span className="font-display text-[15px] text-white tracking-[0.12em]">
              Turf<span className="text-field-400">Analyzer</span>
            </span>
          </div>
        </header>

        {/* Body: env panel + camera fills remaining height */}
        <div className="flex-1 flex flex-col min-h-0 max-w-lg mx-auto w-full px-4 pt-3 gap-3 pb-3">

          {/* Environmental panel */}
          <div className="shrink-0">
            <LocationPanel {...locationPanelProps} />
          </div>

          {/* Camera: fills all remaining height */}
          <div className="flex-1 min-h-0">
            <CameraCapture
              fill
              onCapture={handleCapture}
              isAnalyzing={(appState as string) === 'analyzing'}
            />
          </div>

          {/* Idle hint */}
          {appState === 'idle' && (
            <p className="shrink-0 text-center text-sm text-field-400 pb-1">
              Point camera at any turf issue for instant, location-aware guidance
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── Scroll mode: error / needs_more_photo / results ──────────────────────
  return (
    <main className="min-h-screen pb-16">

      <header className="sticky top-12 z-10 bg-field-900/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan size={15} className="text-field-400" />
            <span className="font-display text-[15px] text-white tracking-[0.12em]">
              Turf<span className="text-field-400">Analyzer</span>
            </span>
          </div>
          {appState === 'results' && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-field-200 hover:text-white text-sm transition-colors"
            >
              <RotateCcw size={14} /> New scan
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Environmental panel always visible in scroll mode */}
        <LocationPanel {...locationPanelProps} />

        {/* Error state */}
        {appState === 'error' && (
          <div className="rounded-xl bg-red-900/30 border border-red-700/40 p-4 text-center space-y-3">
            <p className="text-red-200 text-sm">{errorMessage}</p>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl bg-field-600 text-white text-sm hover:bg-field-500 transition"
            >
              Try again
            </button>
          </div>
        )}

        {/* Needs-more-photo state */}
        {appState === 'needs_more_photo' && photoRequest && (
          <div className="space-y-4">
            {capturedImage && (
              <div className="flex items-center gap-3 rounded-xl bg-field-800/40 border border-field-700/30 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Original photo"
                  className="w-16 h-16 rounded-lg object-cover shrink-0 opacity-70"
                />
                <div className="min-w-0">
                  <p className="text-[10px] text-field-500 uppercase tracking-wide font-medium mb-0.5">Original photo</p>
                  <p className="text-xs text-field-400 leading-relaxed line-clamp-2">{photoRequest.why}</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-soil-800/60 border border-amber-700/30 overflow-hidden">
              <div className="px-4 py-3 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-amber-300">One more photo needed</p>
                  <p className="text-xs text-field-300 leading-relaxed">{photoRequest.directions}</p>
                  {Array.isArray(photoRequest.focus_areas) && photoRequest.focus_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(photoRequest.focus_areas as string[]).map((area: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300 border border-amber-700/30 font-medium">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-soil-800/60 border border-field-600/30 overflow-hidden">
              <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
                <ScanSearch size={14} className="text-field-400" />
                <span className="text-xs font-semibold text-field-300 uppercase tracking-wide">Detail photo</span>
              </div>
              <div className="px-4 pb-4">
                <CameraCapture
                  onCapture={handleSecondCapture}
                  isAnalyzing={(appState as string) === 'analyzing'}
                />
              </div>
            </div>

            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-field-400 hover:text-field-200 text-xs transition mx-auto"
            >
              <RotateCcw size={11} /> Start over
            </button>
          </div>
        )}

        {/* Results state */}
        {appState === 'results' && (
          <div id="results" className="space-y-4">
            {capturedImage && (
              <div className="relative rounded-2xl overflow-hidden bg-soil-900 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Analyzed turf"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-soil-900/70 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-white text-xs font-medium bg-soil-900/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                    📸 Analyzed photo
                  </span>
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 text-field-100 hover:text-white text-xs bg-soil-900/60 px-2.5 py-1 rounded-full backdrop-blur-sm transition"
                  >
                    <RotateCcw size={12} /> New scan
                  </button>
                </div>
              </div>
            )}
            <AnalysisResults
              analysis={analysis}
              secondOpinionData={secondOpinionData}
              secondOpinionLoading={secondOpinionLoading}
              onSecondOpinion={handleSecondOpinion}
            />
            <DownloadReportButton analysis={analysis} location={locationData} />
          </div>
        )}
      </div>
    </main>
  );
}
