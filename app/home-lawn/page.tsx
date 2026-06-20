'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/Camera';
import PhotoUpload from '@/components/PhotoUpload';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import DownloadReportButton from '@/components/DownloadReportButton';
import { RotateCcw, MapPin, Navigation, Home } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

type AppState = 'idle' | 'analyzing' | 'results' | 'error';
type LocationSource = 'gps' | 'zip';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#F96302',
  primaryDark: '#D14E00',
  primaryLight: '#FFB347',
  bgPage: '#0f0f0f',
  bgCard: '#1a1a1a',
  bgCardHover: '#222222',
  border: 'rgba(249,99,2,0.25)',
  textAccent: '#F96302',
  textMuted: '#a0a0a0',
};

export default function HomeLawnAnalyzer() {
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

  const fetchLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported.');
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
          if (!res.ok) throw new Error();
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
                setLocationData(await locRes.json());
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
      setLocationData(await locationRes.json());
      setLocationSource('zip');
      setShowZipInput(false);
      setZipInput('');
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Could not find that ZIP code.');
    } finally { setZipLoading(false); }
  };

  const revertToGps = () => {
    setShowZipInput(false); setZipInput(''); setZipError(null); fetchLocation();
  };

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const handleCapture = async (base64: string) => {
    setCapturedImage(base64); setAppState('analyzing'); setAnalysis(null); setErrorMessage(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, location: locationData ?? { lat: 0, lng: 0 } }),
      });
      if (!res.ok) {
        let errMsg = 'Analysis failed';
        try { const err = await res.json(); errMsg = err.error ?? errMsg; } catch { errMsg = `Server error (${res.status})`; }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setAnalysis(data.analysis);
      setAppState('results');
      setTimeout(() => { document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setAppState('error');
    }
  };

  const reset = () => { setAppState('idle'); setAnalysis(null); setCapturedImage(null); setErrorMessage(null); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.bgPage, color: '#ffffff' }}>

      {/* ── HEADER ── */}
      <header style={{ backgroundColor: BRAND.primary }} className="sticky top-0 z-20 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition">
              <Home size={16} className="text-white" />
            </Link>
            <div className="flex flex-col leading-none ml-1">
              <span className="font-bold text-[18px] text-white tracking-tight">
                Home<span className="font-black">Lawn</span>
              </span>
              <span className="text-[9px] text-white/80 tracking-[0.2em] uppercase">Smart Lawn Care</span>
            </div>
          </div>
          {appState === 'results' && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition"
            >
              <RotateCcw size={12} /> New scan
            </button>
          )}
        </div>
      </header>

      {/* ── BACK BUTTON ── */}
      <div className="max-w-lg mx-auto px-4 pt-3 pb-1 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-1.5 text-xs font-medium hover:text-white transition-colors" style={{ color: BRAND.textMuted }}>
          ← Back to Home
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-10">

        {/* ── LOCATION ── */}
        <div className="mb-3 mt-2">
          <LocationBadge location={locationData} loading={locationLoading} error={locationError} onRetry={fetchLocation} />
        </div>

        {/* Location controls */}
        {!locationLoading && (
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: BRAND.textMuted }}>
              {locationSource === 'gps'
                ? <><Navigation size={11} style={{ color: BRAND.primary }} /> GPS location</>
                : <><MapPin size={11} style={{ color: BRAND.primary }} /> Manual ZIP</>}
            </span>
            {locationSource === 'zip' && (
              <button onClick={revertToGps} className="text-xs hover:text-white transition-colors" style={{ color: BRAND.textMuted }}>
                Use my GPS ↩
              </button>
            )}
            <button
              onClick={() => { setShowZipInput(v => !v); setZipError(null); }}
              className="text-xs hover:text-white transition-colors"
              style={{ color: BRAND.textMuted }}
            >
              Change ZIP
            </button>
          </div>
        )}

        {/* ZIP input */}
        {showZipInput && (
          <div className="mb-3 p-3 rounded-xl border" style={{ backgroundColor: BRAND.bgCard, borderColor: BRAND.border }}>
            <p className="text-xs font-medium text-white mb-2">Enter ZIP code to change location</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 08833"
                value={zipInput}
                onChange={(e) => { setZipInput(e.target.value.replace(/\D/g, '')); setZipError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchLocationByZip(zipInput); }}
                className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-colors"
                style={{ backgroundColor: '#111', border: `1px solid ${BRAND.border}` }}
              />
              <button
                onClick={() => fetchLocationByZip(zipInput)}
                disabled={zipLoading || zipInput.length !== 5}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition"
                style={{ backgroundColor: BRAND.primary }}
              >
                {zipLoading ? '…' : 'Go'}
              </button>
            </div>
            {zipError && <p className="text-red-400 text-xs mt-2">{zipError}</p>}
          </div>
        )}

        {/* ── CAMERA / UPLOAD ── */}
        {appState !== 'results' && (
          <>
            <CameraCapture onCapture={handleCapture} isAnalyzing={appState === 'analyzing'} />
            <PhotoUpload onCapture={handleCapture} isAnalyzing={appState === 'analyzing'} />
          </>
        )}

        {/* ── IDLE PROMPT ── */}
        {appState === 'idle' && (
          <p className="text-center text-sm mt-6 leading-relaxed px-4" style={{ color: BRAND.textMuted }}>
            Point your camera at any lawn issue — weeds, bare patches, discoloration — and get instant guidance.
          </p>
        )}

        {/* ── ERROR ── */}
        {appState === 'error' && (
          <div className="mt-4 p-4 rounded-xl border text-center" style={{ backgroundColor: BRAND.bgCard, borderColor: 'rgba(239,68,68,0.3)' }}>
            <p className="text-red-400 text-sm mb-3">{errorMessage}</p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
              style={{ backgroundColor: BRAND.primary }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── RESULTS ── */}
        {appState === 'results' && (
          <div id="results">
            {capturedImage && (
              <div className="rounded-2xl overflow-hidden mb-4 relative border" style={{ borderColor: BRAND.border }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedImage} alt="Analyzed lawn" className="w-full max-h-64 object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
                  <span className="text-white text-xs font-semibold">📸 Analyzed photo</span>
                  <button onClick={reset} className="flex items-center gap-1 text-white text-xs font-medium px-2 py-1 rounded-full bg-black/40">
                    <RotateCcw size={10} /> New scan
                  </button>
                </div>
              </div>
            )}
            <AnalysisResults analysis={analysis} />
            {analysis && !analysis.parse_error && (
              <div className="mt-4">
                <DownloadReportButton analysis={analysis} locationData={locationData} capturedImage={capturedImage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
