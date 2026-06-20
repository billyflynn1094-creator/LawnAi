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
  Droplets,
  Home,
  Briefcase,
} from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: 'cool' | 'warm' | 'transition';
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
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
  // Brand theming
  accent?: string;       // left bar + icon bg color
  accentGlow?: string;   // glow shadow rgba
  brandTag?: string;     // optional corner tag (e.g. "PRO")
  brandTagColor?: string;
}

const MODULES: ModuleItem[] = [
  {
    id: 'home-lawn',
    icon: Home,
    title: 'HomeLawn',
    meta: 'For Homeowners',
    body: 'Snap a photo of any lawn issue — weeds, bare patches, discoloration — and get instant plain-language diagnosis with easy DIY steps and Home Depot product links.',
    href: '/home-lawn',
    active: true,
    accent: '#F96302',
    accentGlow: 'rgba(249,99,2,0.28)',
    brandTag: 'Consumer',
    brandTagColor: '#F96302',
  },
  {
    id: 'pro-lawn',
    icon: Briefcase,
    title: 'ProLawn',
    meta: 'For Contractors',
    body: 'Professional turf diagnosis with technical detail — disease ID, weed pressure, soil health, and industry-grade product recommendations calibrated to your region.',
    href: '/pro-lawn',
    active: true,
    accent: '#1B3A6B',
    accentGlow: 'rgba(27,58,107,0.35)',
    brandTag: 'PRO',
    brandTagColor: '#3B7F5E',
  },
  {
    id: 'turf-analyzer',
    icon: Scan,
    title: 'Turf Analyzer',
    meta: 'Dev / Legacy',
    body: 'Original AI-powered turf diagnosis tool. Use HomeLawn or ProLawn for the branded experience.',
    href: '/turf-analyzer',
    active: true,
    accent: '#4a8535',
    accentGlow: 'rgba(74,133,53,0.25)',
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
  {
    id: 'irrigation',
    icon: Droplets,
    title: 'IrrigationPro',
    meta: 'Field Diagnostic Tool',
    body: 'Diagnose any irrigation issue — electrical, hydraulic, controller programming, or coverage — with AI-powered field guidance.',
    href: '/irrigation',
    active: true,
    accent: '#0369a1',
    accentGlow: 'rgba(3,105,161,0.28)',
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
        <div
          className="absolute -top-8 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(74,133,53,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-24 -left-16 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(42,82,32,0.12) 0%, transparent 70%)' }}
        />

        <p className="animate-entry text-field-200 text-[10px] tracking-[0.35em] uppercase font-semibold mb-3">
          National US Coverage
        </p>

        <h1 className="animate-entry font-display text-[3.25rem] leading-[0.97] text-white mb-5">
          Precision<br />
          <span className="italic text-field-200">Turf Care,</span><br />
          <span className="text-field-400">Elevated.</span>
        </h1>

        <p className="animate-entry text-field-50 text-[13px] leading-relaxed max-w-[300px] mb-6">
          AI diagnostics and expert guidance — calibrated to your location, soil profile, and live weather conditions.
        </p>

        <div className="animate-entry">
          <LocationBadge
            location={locationData}
            loading={locationLoading}
            error={locationError}
            onRetry={fetchLocation}
          />
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="animate-entry max-w-lg mx-auto px-5 pb-4 w-full">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-field-700/50" />
          <span className="text-field-200 text-[9px] tracking-[0.3em] uppercase font-bold">Choose Your Experience</span>
          <div className="flex-1 h-px bg-field-700/50" />
        </div>
      </div>

      {/* ── MODULE CARDS ── */}
      <div className="flex-1 max-w-lg mx-auto px-4 pb-10 w-full space-y-2.5">
        {MODULES.map((mod, i) => {
          const Icon = mod.icon;
          const delay = 380 + i * 80;
          const accent = mod.accent ?? '#4a8535';
          const accentGlow = mod.accentGlow ?? 'rgba(74,133,53,0.25)';

          if (mod.active) {
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className="animate-entry group relative flex gap-4 p-5 rounded-2xl bg-field-800/40 border border-field-600/30 hover:border-field-500/55 hover:bg-field-800/60 transition-all duration-200 active:scale-[0.985] overflow-hidden"
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 inset-y-5 w-[3px] rounded-full"
                  style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}88)` }}
                />
                {/* Hover shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: `linear-gradient(to right, transparent, ${accent}08, transparent)` }} />

                {/* Icon */}
                <div
                  className="shrink-0 w-[52px] h-[52px] rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${accent}CC, ${accent}88)`,
                    boxShadow: `0 4px 20px ${accentGlow}`,
                  }}
                >
                  <Icon size={22} className="text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-0.5">
                    <span className="font-display text-[1.3rem] text-white leading-tight">{mod.title}</span>
                    <div className="flex items-center gap-1.5">
                      {mod.brandTag && (
                        <span
                          className="shrink-0 text-[8px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase text-white"
                          style={{ backgroundColor: mod.brandTagColor ?? accent }}
                        >
                          {mod.brandTag}
                        </span>
                      )}
                      <ArrowUpRight
                        size={15}
                        className="shrink-0 mt-1 text-field-300 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] tracking-[0.22em] uppercase font-bold mb-2" style={{ color: accent }}>
                    {mod.meta}
                  </p>
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
                  <span className="font-display text-[1.3rem] text-field-100 leading-tight">{mod.title}</span>
                  {mod.badge && (
                    <span className="shrink-0 text-[8px] px-2 py-0.5 rounded-full bg-field-800/60 border border-field-700/30 text-field-200 font-bold tracking-widest uppercase">
                      {mod.badge}
                    </span>
                  )}
                </div>
                <p className="text-field-300 text-[9px] tracking-[0.22em] uppercase font-bold mb-2">{mod.meta}</p>
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
