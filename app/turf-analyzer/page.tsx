'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/Camera';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import DownloadReportButton from '@/components/DownloadReportButton';
import { Scan, RotateCcw, ArrowLeft, MapPin, Navigation } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  /** 7-day rolling averages */
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

type AppState = 'idle' | 'analyzing' | 'results' | 'error';
type LocationSource = 'gps' | 'zip';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        // Try a silent IP-based fallback before giving up
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
        } catch { /* IP fallback failed — show ZIP prompt */ }
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
          // Non-JSON error body (e.g. Vercel timeout page)
          errMsg = `Server error (${res.status}) — please try again`;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
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

  const reset = () => {
    setAppState('idle');
    setAnalysis(null);
    setCapturedImage(null);
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen pb-16">

      {/* ── HEADER ── */}
      <header className="sticky top-12 z-10 bg-field-900/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">

            <div className="flex items-center gap-2">
              <Scan size={15} className="text-field-400" />
              <span className="font-display text-[15px] text-white tracking-[0.12em]">
                Turf<span className="text-field-400">Analyzer</span>
              </span>
            </div>
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

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Location context */}
        <div className="space-y-2">
          <LocationBadge
            location={locationData}
            loading={locationLoading}
            error={locationError}
            onRetry={fetchLocation}
          />

          {/* Location source indicator + change controls */}
          {!locationLoading && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs text-field-400">
                {locationSource === 'gps' ? (
                  <>
                    <Navigation size={11} className="text-field-500" />
                    <span>GPS location</span>
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
                    onClick={revertToGps}
                    className="text-xs text-field-300 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Navigation size={10} /> Use my GPS ↩
                  </button>
                )}
                <button
                  onClick={() => { setShowZipInput(v => !v); setZipError(null); }}
                  className="text-xs text-field-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  <MapPin size={10} /> Change ZIP
                </button>
              </div>
            </div>
          )}

          {/* ZIP code input panel */}
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
                  onChange={e => { setZipInput(e.target.value.replace(/\D/g, '')); setZipError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') fetchLocationByZip(zipInput); }}
                  className="flex-1 rounded-lg bg-field-900/80 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-field-500 focus:outline-none focus:border-field-400 transition-colors"
                />
                <button
                  onClick={() => fetchLocationByZip(zipInput)}
                  disabled={zipLoading || zipInput.length !== 5}
                  className="px-4 py-2 rounded-lg bg-field-600 text-white text-sm font-medium hover:bg-field-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {zipLoading ? '…' : 'Go'}
                </button>
              </div>
              {zipError && (
                <p className="text-xs text-red-400">{zipError}</p>
              )}
            </div>
          )}
        </div>

        {/* Camera — idle & analyzing */}
        {appState !== 'results' && (
          <CameraCapture
            onCapture={handleCapture}
            isAnalyzing={appState === 'analyzing'}
          />
        )}

        {/* Idle prompt */}
        {appState === 'idle' && (
          <div className="text-center py-2">
            <p className="text-field-50 text-sm leading-relaxed">
              Point your camera at any turf issue — weeds, disease, bare patches,
              discoloration — and get instant, location-aware guidance.
            </p>
          </div>
        )}

        {/* Error state */}
        {appState === 'error' && (
          <div className="rounded-xl bg-red-900/30 border border-red-700/40 p-4 text-center space-y-3">
            <p className="text-red-200 text-sm">{errorMessage}</p>
            <button
              onClick={reset}
              className="px-5 py-2 rounded-xl bg-field-600 text-white text-sm hover:bg-field-500 transition"
            >
              Try again
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
            <AnalysisResults analysis={analysis} />
            <DownloadReportButton analysis={analysis} location={locationData} />
          </div>
        )}
      </div>
    </main>
  );
}
