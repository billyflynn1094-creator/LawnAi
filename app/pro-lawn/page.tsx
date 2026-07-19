'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/Camera';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import AnalysisProgress from '@/components/AnalysisProgress';
import DownloadReportButton from '@/components/DownloadReportButton';
import { RotateCcw, Home } from 'lucide-react';

interface LocationData {
  lat: number; lng: number; city?: string; state?: string; soilType?: string;
  hardiness_zone?: string; grassClass?: 'cool' | 'warm' | 'transition';
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  weather_hist?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number; soil_temp_6cm_f?: number; soil_temp_hist_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

type AppState = 'idle' | 'analyzing' | 'results' | 'error';
type LocationSource = 'gps' | 'zip';

const BRAND = {
  primary: '#1B3A6B',
  primaryLight: '#2F5299',
  bgPage: '#F5F7FA',
  bgCard: '#FFFFFF',
  border: '#E2E8F2',
  borderAccent: 'rgba(27,58,107,0.22)',
  textPrimary: '#1B3A6B',
  textAccent: '#1B3A6B',
  textMuted: '#6B7A9B',
};

function b64Src(b64: string | null) {
  if (!b64) return '';
  if (b64.startsWith('data:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

export default function ProLawnAnalyzer() {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const fetchLocation = useCallback(() => {
    setLocationLoading(true); setLocationError(null);
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
          if (!res.ok) throw new Error();
          setLocationData(await res.json()); setLocationSource('gps');
        } catch { setLocationData({ lat, lng }); setLocationSource('gps'); }
        finally { setLocationLoading(false); }
      },
      async (err) => {
        console.warn('Geolocation error:', err);
        try {
          const ipRes = await fetch('https://ipapi.co/json/');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.latitude && ipData.longitude) {
              const locRes = await fetch(`/api/location?lat=${ipData.latitude}&lng=${ipData.longitude}`);
              if (locRes.ok) { setLocationData(await locRes.json()); setLocationSource('gps'); setLocationLoading(false); return; }
            }
          }
        } catch { /* IP fallback failed */ }
        setLocationError('Location unavailable. Enter your ZIP code below.');
        setShowZipInput(true); setLocationLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const fetchLocationByZip = async (zip: string) => {
    if (!/^\d{5}$/.test(zip)) { setZipError('Please enter a valid 5-digit ZIP code.'); return; }
    setZipLoading(true); setZipError(null);
    try {
      const geoRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!geoRes.ok) throw new Error('ZIP code not found.');
      const geoData = await geoRes.json();
      const lat = parseFloat(geoData.places[0]['latitude']);
      const lng = parseFloat(geoData.places[0]['longitude']);
      const locationRes = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
      if (!locationRes.ok) throw new Error('Location enrichment failed');
      setLocationData(await locationRes.json()); setLocationSource('zip');
      setShowZipInput(false); setZipInput('');
    } catch (err) { setZipError(err instanceof Error ? err.message : 'Could not find that ZIP code.'); }
    finally { setZipLoading(false); }
  };

  const revertToGps = () => { setShowZipInput(false); setZipInput(''); setZipError(null); fetchLocation(); };
  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const handleCapture = async (base64: string) => {
    setCapturedImage(base64); setAppState('analyzing'); setAnalysis(null);
    setErrorMessage(null); setAnalysisComplete(false);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, location: locationData ?? { lat: 0, lng: 0 } }),
      });
      if (!res.ok) {
        let errMsg = 'Analysis failed';
        try { const err = await res.json(); errMsg = err.error ?? errMsg; } catch { errMsg = `Server error (${res.status})`; }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setAnalysis(data.analysis); setAnalysisComplete(true);
      setTimeout(() => {
        setAppState('results');
        setTimeout(() => { document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
      }, 600);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setAppState('error');
    }
  };

  const reset = () => { setAppState('idle'); setAnalysis(null); setCapturedImage(null); setErrorMessage(null); setAnalysisComplete(false); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.bgPage, color: BRAND.textPrimary }}>
      <header style={{ backgroundColor: BRAND.primary }} className="sticky top-0 z-20 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition">
              <Home size={16} className="text-white" />
            </Link>
            <div className="flex flex-col leading-none ml-1">
              <span className="font-bold text-[18px] text-white tracking-tight">Pro<span className="font-black">Lawn</span></span>
              <span className="text-[9px] text-white/80 tracking-[0.2em] uppercase">Professional Turf Management</span>
            </div>
          </div>
          {(appState === 'results' || appState === 'error') && (
            <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition">
              <RotateCcw size={12} /> New scan
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-10">
        <div className="mb-3 mt-2">
          <LocationBadge
            location={locationData}
            loading={locationLoading}
            error={locationError}
            onRetry={fetchLocation}
            accent={BRAND.primary}
            mode="light"
            locationSource={locationSource}
            onChangeZip={() => { setShowZipInput(v => !v); setZipError(null); }}
            onUseGps={revertToGps}
          />
        </div>

        {showZipInput && (
          <div className="mb-3 p-3 rounded-xl border bg-white" style={{ borderColor: BRAND.borderAccent }}>
            <p className="text-xs font-semibold mb-2" style={{ color: BRAND.textPrimary }}>Enter ZIP code to change location</p>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" maxLength={5} placeholder="e.g. 08833" value={zipInput}
                onChange={(e) => { setZipInput(e.target.value.replace(/\D/g, '')); setZipError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchLocationByZip(zipInput); }}
                className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#F5F5F7', border: `1px solid ${BRAND.border}`, color: BRAND.textPrimary }} />
              <button onClick={() => fetchLocationByZip(zipInput)} disabled={zipLoading || zipInput.length !== 5}
                className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40 transition" style={{ backgroundColor: BRAND.primary }}>
                {zipLoading ? '...' : 'Go'}
              </button>
            </div>
            {zipError && <p className="text-red-500 text-xs mt-2">{zipError}</p>}
          </div>
        )}

        {/* IDLE */}
        {appState === 'idle' && (
          <>
            <CameraCapture onCapture={handleCapture} isAnalyzing={false} themeColor={BRAND.primary} />
            <p className="text-center text-sm mt-4 leading-relaxed px-4" style={{ color: BRAND.textMuted }}>
              Scan turf, identify agronomic issues, and receive professional-grade treatment recommendations.
            </p>
          </>
        )}

        {/* ANALYZING */}
        {appState === 'analyzing' && (
          <div className="flex flex-col gap-3">
            {capturedImage && (
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: BRAND.borderAccent }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b64Src(capturedImage)} alt="Captured turf" className="w-full max-h-56 object-cover" />
              </div>
            )}
            <AnalysisProgress themeColor={BRAND.primary} complete={analysisComplete} />
          </div>
        )}

        {/* ERROR */}
        {appState === 'error' && (
          <div className="mt-4 p-4 rounded-xl border bg-white text-center" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <p className="text-red-500 text-sm mb-3">{errorMessage}</p>
            <button onClick={reset} className="px-4 py-2 rounded-lg text-white text-sm font-bold transition" style={{ backgroundColor: BRAND.primary }}>
              Try again
            </button>
          </div>
        )}

        {/* RESULTS */}
        {appState === 'results' && (
          <div id="results">
            {capturedImage && (
              <div className="rounded-2xl overflow-hidden mb-4 relative border" style={{ borderColor: BRAND.borderAccent }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b64Src(capturedImage)} alt="Analyzed turf" className="w-full max-h-64 object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                  <span className="text-white text-xs font-semibold">Analyzed image</span>
                  <button onClick={reset} className="flex items-center gap-1 text-white text-xs font-medium px-2 py-1 rounded-full bg-black/40">
                    <RotateCcw size={10} /> New scan
                  </button>
                </div>
              </div>
            )}
            <AnalysisResults analysis={analysis} mode="light" />
            {analysis && !analysis.parse_error && (
              <div className="mt-4"><DownloadReportButton
                analysis={analysis}
                location={locationData}
                capturedImage={capturedImage}
                accent={BRAND.primary}
                brandName="ProLawn"
                brandTagline="Professional Turf Management — Analysis Report"
              /></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
