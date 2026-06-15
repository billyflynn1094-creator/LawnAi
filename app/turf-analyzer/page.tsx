'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/Camera';
import LocationBadge from '@/components/LocationBadge';
import AnalysisResults from '@/components/Analysis';
import { Scan, RotateCcw, ArrowLeft } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  weather?: { temp_f: number; humidity: number; condition: string };
}

type AppState = 'idle' | 'analyzing' | 'results' | 'error';

export default function TurfAnalyzer() {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

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
        } catch {
          setLocationData({ lat, lng });
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocationError('Location access denied.');
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

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
      <header className="sticky top-0 z-10 bg-field-900/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-field-200 hover:text-white hover:bg-field-800/60 transition-all"
              aria-label="Back to home"
            >
              <ArrowLeft size={17} />
            </Link>
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
        <LocationBadge
          location={locationData}
          loading={locationLoading}
          error={locationError}
          onRetry={fetchLocation}
        />

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
          </div>
        )}
      </div>
    </main>
  );
}
