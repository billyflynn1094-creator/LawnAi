'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LocationBadge from '@/components/LocationBadge';
import {
  Sprout,
  Scan,
  Calendar,
  BookOpen,
  BarChart3,
  ChevronRight,
  Settings,
  ArrowUpRight,
} from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: 'cool' | 'warm' | 'transition';
  weather?: { temp_f: number; humidity: number; condition: string };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

interface ModuleItem {
  id: string;
  icon: React.ElementType;
  title: string;
  meta: string;
  body: string;
  href: string;
  active: boolean;
  badge?: string;
}

const MODULES: ModuleItem[] = [
  {
    id: 'turf-analyzer',
    icon: Scan,
    title: 'Turf Analyzer',
    meta: 'AI-Powered Diagnosis',
    body: 'Point your camera at any lawn or turf issue. Get instant AI identification of weeds, disease, bare patches, and discoloration with location-aware remediation steps.',
    href: '/turf-analyzer',
    active: true,
  },
  {
    id: 'timeline',
    icon: Calendar,
    title: 'Treatment Timeline',
    meta: 'Seasonal Schedule',
    body: 'Smart treatment programs calibrated to your USDA hardiness zone, grass type, soil temperature, and current conditions.',
    href: '#',
    active: false,
    badge: 'Coming Soon',
  },
  {
    id: 'catalog',
    icon: BookOpen,
    title: 'Product Catalog',
    meta: 'Pro Recommendations',
    body: 'Curated turf protection products from Syngenta, Bayer (Envu), BASF, Nufarm, and Corteva — granular and liquid options for precision treatment.',
    href: '#',
    active: false,
    badge: 'Coming Soon',
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Field Reports',
    meta: 'Property Intelligence',
    body: 'Historical scan data, trend analysis, and cumulative treatment records for your lawn or golf course.',
    href: '#',
    active: false,
    badge: 'Coming Soon',
  },
];

export default function CoverPage() {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
          if (!res.ok) throw new Error();
          setLocationData(await res.json());
        } catch {
          setLocationData({ lat, lng });
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationError('Location access denied.');
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 bg-field-900/90 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-field-400 to-field-600 flex items-center justify-center shadow-[0_0_16px_rgba(74,133,53,0.35)]">
              <Sprout size={15} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-[17px] text-white tracking-[0.15em] leading-tight">
                TURF<span className="text-field-400">AI</span>
              </span>
              <span className="text-[8px] text-field-300 tracking-[0.25em] uppercase mt-0.5">
                Professional Diagnostics
              </span>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-field-200 hover:text-white hover:bg-field-800/60 transition-all">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="relative px-5 pt-10 pb-8 max-w-lg mx-auto w-full">
        {/* Atmospheric glow orbs */}
        <div
          className="absolute -top-8 right-0 w-72 h-72 rounded-full pointer-events-none animate-glow"
          style={{ background: 'radial-gradient(circle, rgba(74,133,53,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-24 -left-16 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(42,82,32,0.12) 0%, transparent 70%)' }}
        />

        {/* Eyebrow — decorative, lighter green OK */}
        <p
          className="animate-entry text-field-200 text-[10px] tracking-[0.35em] uppercase font-semibold mb-3"
          style={{ animationDelay: '0ms' }}
        >
          National US Coverage
        </p>

        {/* Headline */}
        <h1
          className="animate-entry font-display text-[3.25rem] leading-[0.97] text-white mb-5"
          style={{ animationDelay: '80ms' }}
        >
          Precision<br />
          <span className="italic text-field-200">Turf Care,</span><br />
          <span className="text-field-400">Elevated.</span>
        </h1>

        {/* Sub-tagline — max contrast */}
        <p
          className="animate-entry text-field-50 text-[13px] leading-relaxed max-w-[300px] mb-6"
          style={{ animationDelay: '160ms' }}
        >
          AI diagnostics and expert guidance — calibrated to your location, soil profile, and live weather conditions.
        </p>

        {/* Location data */}
        <div className="animate-entry" style={{ animationDelay: '240ms' }}>
          <LocationBadge
            location={locationData}
            loading={locationLoading}
            error={locationError}
            onRetry={fetchLocation}
          />
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div
        className="animate-entry max-w-lg mx-auto px-5 pb-4 w-full"
        style={{ animationDelay: '320ms' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-field-700/50" />
          <span className="text-field-200 text-[9px] tracking-[0.3em] uppercase font-bold">Modules</span>
          <div className="flex-1 h-px bg-field-700/50" />
        </div>
      </div>

      {/* ── MODULE CARDS ── */}
      <div className="flex-1 max-w-lg mx-auto px-4 pb-10 w-full space-y-2.5">
        {MODULES.map((mod, i) => {
          const Icon = mod.icon;
          const delay = 380 + i * 80;

          if (mod.active) {
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className="animate-entry group relative flex gap-4 p-5 rounded-2xl bg-field-800/40 border border-field-600/30 hover:border-field-500/55 hover:bg-field-800/60 transition-all duration-200 active:scale-[0.985] overflow-hidden"
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Left accent bar */}
                <div className="absolute left-0 inset-y-5 w-[3px] rounded-full bg-gradient-to-b from-field-400 to-field-600" />
                {/* Hover shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-field-600/0 via-field-500/5 to-field-600/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Icon */}
                <div className="shrink-0 w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-field-500/90 to-field-700 flex items-center justify-center shadow-[0_4px_20px_rgba(74,133,53,0.3)]">
                  <Icon size={22} className="text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-0.5">
                    <span className="font-display text-[1.3rem] text-white leading-tight">{mod.title}</span>
                    <ArrowUpRight
                      size={15}
                      className="shrink-0 mt-1 text-field-300 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                  {/* Meta label — decorative, green accent OK */}
                  <p className="text-field-300 text-[9px] tracking-[0.22em] uppercase font-bold mb-2">{mod.meta}</p>
                  {/* Body — near-white for legibility */}
                  <p className="text-field-50 text-[13px] leading-relaxed">{mod.body}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-field-200 text-[11px] font-semibold tracking-wide group-hover:text-white transition-colors">
                    Open Module <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <div
              key={mod.id}
              className="animate-entry relative flex gap-4 p-5 rounded-2xl bg-field-900/30 border border-field-800/25 opacity-60 cursor-not-allowed overflow-hidden"
              style={{ animationDelay: `${delay}ms` }}
            >
              <div className="shrink-0 w-[52px] h-[52px] rounded-xl bg-field-900/60 border border-field-800/40 flex items-center justify-center">
                <Icon size={22} className="text-field-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-0.5">
                  {/* Inactive title — still needs to be readable */}
                  <span className="font-display text-[1.3rem] text-field-100 leading-tight">{mod.title}</span>
                  {mod.badge && (
                    <span className="shrink-0 text-[8px] px-2 py-0.5 rounded-full bg-field-800/60 border border-field-700/30 text-field-200 font-bold tracking-widest uppercase">
                      {mod.badge}
                    </span>
                  )}
                </div>
                {/* Meta — decorative */}
                <p className="text-field-300 text-[9px] tracking-[0.22em] uppercase font-bold mb-2">{mod.meta}</p>
                {/* Inactive body — still readable */}
                <p className="text-field-100 text-[13px] leading-relaxed">{mod.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <div className="max-w-lg mx-auto px-5 pb-8 w-full">
        <div className="border-t border-field-700/40 pt-4 flex items-center justify-between">
          <span className="text-field-200 text-[10px] tracking-wide">Powered by Gemini AI</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-field-400 animate-pulse" />
            <span className="text-field-200 text-[10px] tracking-wide">v1.0 · US Coverage</span>
          </div>
        </div>
      </div>
    </main>
  );
}
