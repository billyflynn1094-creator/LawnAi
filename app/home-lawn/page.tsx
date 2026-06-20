'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/Camera';
import PhotoUpload from '@/components/PhotoUpload';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import DownloadReportButton from '@/components/DownloadReportButton';
import { RotateCcw, MapPin, Navigation, Home, Users, Star, ExternalLink, Loader2 } from 'lucide-react';

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

interface LocalPro {
  name: string;
  address: string;
  rating?: number;
  ratings_count?: number;
  open_now?: boolean;
  place_id: string;
  maps_url: string;
}

type AppState = 'idle' | 'analyzing' | 'results' | 'error';
type LocationSource = 'gps' | 'zip';

const BRAND = {
  primary: '#F96302',
  primaryDark: '#D14E00',
  bgPage: '#FAFAF8',
  border: '#E8E4DF',
  borderAccent: 'rgba(249,99,2,0.22)',
  textPrimary: '#1A1A1A',
  textAccent: '#F96302',
  textMuted: '#888888',
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

  const [localPros, setLocalPros] = useState<LocalPro[]>([]);
  const [prosLoading, setProsLoading] = useState(false);
  const [prosError, setProsError] = useState<string | null>(null);
  const [prosSearched, setProsSearched] = useState(false);

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
        setLocationError('Location unavailable. Enter your ZIP code below.');
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

  const revertToGps = () => { setShowZipInput(false); setZipInput(''); setZipError(null); fetchLocation(); };

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const handleCapture = async (base64: string) => {
    setCapturedImage(base64); setAppState('analyzing'); setAnalysis(null); setErrorMessage(null);
    setLocalPros([]); setProsError(null); setProsSearched(false);
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

  const handleFindPros = async () => {
    if (!locationData?.lat || !locationData?.lng) { setProsError('Location required to find nearby specialists.'); return; }
    setProsLoading(true); setProsError(null); setLocalPros([]); setProsSearched(true);
    try {
      const res = await fetch(`/api/find-pros?lat=${locationData.lat}&lng=${locationData.lng}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      if (!data.pros || data.pros.length === 0) {
        setProsError('No lawn care specialists found nearby. Try the Google Maps search below.');
      } else {
        setLocalPros(data.pros);
      }
    } catch (err) {
      setProsError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setProsLoading(false);
      setTimeout(() => { document.getElementById('pros-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }
  };

  const reset = () => {
    setAppState('idle'); setAnalysis(null); setCapturedImage(null); setErrorMessage(null);
    setLocalPros([]); setProsError(null); setProsSearched(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND.bgPage, color: BRAND.textPrimary }}>

      <header style={{ backgroundColor: BRAND.primary }} className="sticky top-0 z-20 shadow-md">
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
            <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition">
              <RotateCcw size={12} /> New scan
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-3 pb-1">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70" style={{ color: BRAND.textMuted }}>
          &larr; Back to Home
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">

        <div className="mb-3 mt-2">
          <LocationBadge location={locationData} loading={locationLoading} error={locationError} onRetry={fetchLocation} accent={BRAND.primary} mode="light" />
        </div>

        {!locationLoading && (
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: BRAND.textMuted }}>
              {locationSource === 'gps'
                ? <><Navigation size={11} style={{ color: BRAND.primary }} /> GPS location</>
                : <><MapPin size={11} style={{ color: BRAND.primary }} /> Manual ZIP</>}
            </span>
            {locationSource === 'zip' && (
              <button onClick={revertToGps} className="text-xs transition hover:opacity-70" style={{ color: BRAND.textMuted }}>Use GPS</button>
            )}
            <button onClick={() => { setShowZipInput(v => !v); setZipError(null); }} className="text-xs transition hover:opacity-70" style={{ color: BRAND.textAccent, fontWeight: 600 }}>
              Change ZIP
            </button>
          </div>
        )}

        {showZipInput && (
          <div className="mb-3 p-3 rounded-xl border bg-white" style={{ borderColor: BRAND.borderAccent }}>
            <p className="text-xs font-semibold mb-2" style={{ color: BRAND.textPrimary }}>Enter ZIP code to change location</p>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" maxLength={5} placeholder="e.g. 08833" value={zipInput}
                onChange={(e) => { setZipInput(e.target.value.replace(/\D/g, '')); setZipError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchLocationByZip(zipInput); }}
                className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ backgroundColor: '#F5F5F3', border: `1px solid ${BRAND.border}`, color: BRAND.textPrimary }}
              />
              <button onClick={() => fetchLocationByZip(zipInput)} disabled={zipLoading || zipInput.length !== 5}
                className="px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-40 transition" style={{ backgroundColor: BRAND.primary }}>
                {zipLoading ? '...' : 'Go'}
              </button>
            </div>
            {zipError && <p className="text-red-500 text-xs mt-2">{zipError}</p>}
          </div>
        )}

        {appState !== 'results' && (
          <div className="space-y-3">
            <CameraCapture onCapture={handleCapture} isAnalyzing={appState === 'analyzing'} themeColor={BRAND.primary} />
            <PhotoUpload onCapture={handleCapture} isAnalyzing={appState === 'analyzing'} themeColor={BRAND.primary} />
          </div>
        )}

        {appState === 'idle' && (
          <p className="text-center text-sm mt-4 leading-relaxed px-4" style={{ color: BRAND.textMuted }}>
            Point your camera at any lawn issue and get instant guidance.
          </p>
        )}

        {appState === 'error' && (
          <div className="mt-4 p-4 rounded-xl border bg-white text-center" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <p className="text-red-500 text-sm mb-3">{errorMessage}</p>
            <button onClick={reset} className="px-4 py-2 rounded-lg text-white text-sm font-bold transition" style={{ backgroundColor: BRAND.primary }}>Try again</button>
          </div>
        )}

        {appState === 'results' && (
          <div id="results" className="space-y-4">

            {capturedImage && (
              <div className="rounded-2xl overflow-hidden relative border" style={{ borderColor: BRAND.borderAccent }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedImage} alt="Analyzed lawn" className="w-full max-h-64 object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }}>
                  <span className="text-white text-xs font-semibold">Analyzed photo</span>
                  <button onClick={reset} className="flex items-center gap-1 text-white text-xs font-medium px-2 py-1 rounded-full bg-black/40">
                    <RotateCcw size={10} /> New scan
                  </button>
                </div>
              </div>
            )}

            <AnalysisResults analysis={analysis} mode="light" />

            {analysis && !analysis.parse_error && (
              <DownloadReportButton analysis={analysis} location={locationData} />
            )}

            {analysis && !analysis.parse_error && (
              <div id="pros-section" className="pt-2">
                {!prosSearched ? (
                  <button
                    onClick={handleFindPros}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-[15px] shadow-md active:scale-[0.98] transition-transform"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)` }}
                  >
                    <Users size={18} />
                    🌿 Find Local Lawn Specialists
                  </button>
                ) : (
                  <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BRAND.borderAccent }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND.primary }}>
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-white" />
                        <span className="text-white font-bold text-sm">Local Lawn Specialists</span>
                      </div>
                      <button onClick={handleFindPros} disabled={prosLoading} className="text-white/80 text-xs hover:text-white transition">
                        {prosLoading ? <Loader2 size={14} className="animate-spin" /> : 'Refresh'}
                      </button>
                    </div>

                    {prosLoading && (
                      <div className="bg-white py-6 flex flex-col items-center gap-2">
                        <Loader2 size={24} className="animate-spin" style={{ color: BRAND.primary }} />
                        <p className="text-xs text-gray-400">Searching nearby specialists…</p>
                      </div>
                    )}

                    {!prosLoading && prosError && (
                      <div className="bg-white px-4 py-5">
                        <p className="text-sm text-gray-500 mb-3">{prosError}</p>
                        <a
                          href={`https://www.google.com/maps/search/lawn+care+fertilization+near+${locationData?.city ?? 'me'}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                          style={{ backgroundColor: BRAND.primary }}
                        >
                          <ExternalLink size={14} /> Search on Google Maps
                        </a>
                      </div>
                    )}

                    {!prosLoading && localPros.length > 0 && (
                      <div className="bg-white divide-y divide-gray-100">
                        {analysis?.identified?.primary && (
                          <div className="px-4 py-2.5 bg-orange-50">
                            <p className="text-xs text-orange-700">
                              💡 <strong>Tell them about:</strong> {analysis.identified.primary}
                            </p>
                          </div>
                        )}
                        {localPros.map((pro, i) => (
                          <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate text-gray-900">{pro.name}</p>
                              <p className="text-xs mt-0.5 truncate text-gray-500">{pro.address}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {pro.rating && (
                                  <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
                                    <Star size={11} fill="currentColor" />{pro.rating.toFixed(1)}
                                    {pro.ratings_count && <span className="text-gray-400">({pro.ratings_count})</span>}
                                  </span>
                                )}
                                {pro.open_now !== undefined && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pro.open_now ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                    {pro.open_now ? 'Open' : 'Closed'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <a href={pro.maps_url} target="_blank" rel="noopener noreferrer"
                              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                              style={{ backgroundColor: BRAND.primary }}>
                              <ExternalLink size={11} /> Maps
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
