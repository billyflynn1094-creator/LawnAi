'use client';

import type { JSX } from 'react';

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

interface LocationBadgeProps {
  location: LocationData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  accent?: string;
  mode?: 'light' | 'dark';
  /** Which source is currently active — drives the single toggle button in the header. */
  locationSource?: 'gps' | 'zip';
  /** Opens the ZIP entry field (shown when currently on GPS). */
  onChangeZip?: () => void;
  /** Reverts to GPS-based location (shown when currently on manual ZIP). */
  onUseGps?: () => void;
}

function fmt(n: number | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals);
}

interface MetricTileProps {
  icon: JSX.Element | string;
  label: string;
  value: string;
  historical?: string;
  mode: 'light' | 'dark';
  accent: string;
}

function MetricTile({ icon, label, value, historical, mode, accent }: MetricTileProps) {
  const isLight = mode === 'light';

  if (isLight) {
    return (
      <div
        className="rounded-lg px-2.5 py-1.5 bg-white"
        style={{ border: `1px solid ${accent}20` }}
      >
        {/* Row 1: icon + label */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs leading-none" style={{ color: accent }}>{icon}</span>
          <span
            className="text-[9px] font-bold uppercase tracking-wide leading-none"
            style={{ color: accent }}
          >
            {label}
          </span>
        </div>
        {/* Row 2: actual | historical */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-sm font-bold leading-tight text-gray-900">{value}</span>
          {historical && (
            <span
              className="text-[9px] font-medium leading-none"
              style={{ color: `${accent}80` }}
            >
              hist {historical}
            </span>
          )}
        </div>
      </div>
    );
  }

  // dark mode
  return (
    <div className="rounded-lg px-2.5 py-1.5 bg-soil-800">
      {/* Row 1: icon + label */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-xs leading-none text-field-300">{icon}</span>
        <span className="text-[9px] font-bold text-field-300 uppercase tracking-wide leading-none">
          {label}
        </span>
      </div>
      {/* Row 2: actual | historical */}
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-sm font-bold leading-tight text-white">{value}</span>
        {historical && (
          <span className="text-[9px] font-medium leading-none text-gray-400">
            hist {historical}
          </span>
        )}
      </div>
    </div>
  );
}

export default function LocationBadge({
  location,
  loading = false,
  error = null,
  onRetry,
  accent = '#4a8535',
  mode = 'dark',
  locationSource = 'gps',
  onChangeZip,
  onUseGps,
}: LocationBadgeProps) {
  const isLight = mode === 'light';

  const containerStyle = isLight
    ? {
        backgroundColor: '#ffffff',
        border: `1.5px solid ${accent}28`,
        borderRadius: '1rem',
        overflow: 'hidden' as const,
      }
    : {};

  const containerClass = isLight
    ? 'rounded-2xl overflow-hidden'
    : 'rounded-2xl bg-soil-900 border border-soil-700 overflow-hidden';

  if (loading) {
    return (
      <div className={containerClass} style={isLight ? containerStyle : undefined}>
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-sm animate-spin">🌀</span>
          <span
            className="text-sm font-medium"
            style={{ color: isLight ? accent : undefined }}
          >
            Detecting location...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClass} style={isLight ? containerStyle : undefined}>
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-sm text-red-400 flex-1">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-semibold px-3 py-1 rounded-full transition"
              style={{
                backgroundColor: isLight ? `${accent}15` : undefined,
                color: isLight ? accent : '#86efac',
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!location) return null;

  const { city, state, soilType, weather, weather_hist, soil_temp_surface_f, soil_temp_hist_f, rainfall } = location;

  const headerBg = isLight ? accent : undefined;
  const headerClass = isLight
    ? 'px-4 py-2.5 flex items-center justify-between gap-2'
    : 'px-4 py-2.5 bg-soil-800 flex items-center justify-between gap-2';

  return (
    <div className={containerClass} style={isLight ? containerStyle : undefined}>
      {/* Header row — town + soil type together; single ZIP/GPS toggle on the right */}
      <div
        className={headerClass}
        style={isLight ? { backgroundColor: headerBg } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm shrink-0">📍</span>
          <div className="min-w-0 flex-1">
            {(city || state) ? (
              <span className="text-xs font-bold text-white leading-tight block truncate">
                {[city, state].filter(Boolean).join(', ')}
              </span>
            ) : (
              <span className="text-xs font-medium text-white/80 block truncate">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            )}
            {soilType && (
              <span className="text-[9px] font-medium text-white/75 leading-tight block truncate">
                Soil: {soilType}
              </span>
            )}
          </div>
        </div>

        {(onChangeZip || onUseGps) && (
          <button
            onClick={locationSource === 'zip' ? onUseGps : onChangeZip}
            className="text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0 transition"
            style={{
              backgroundColor: isLight ? 'rgba(255,255,255,0.22)' : 'rgba(74,133,53,0.25)',
              color: '#ffffff',
            }}
          >
            {locationSource === 'zip' ? 'Use GPS' : 'Change ZIP'}
          </button>
        )}
      </div>

      {/* Metric tiles */}
      {(weather || soil_temp_surface_f != null || rainfall) && (
        <div
          className="p-2 grid grid-cols-2 gap-1.5"
          style={{ backgroundColor: isLight ? `${accent}06` : undefined }}
        >
          {weather && (
            <MetricTile
              icon="🌡️"
              label="Air Temp"
              value={`${fmt(weather.avg_high_f)}°F`}
              historical={weather_hist ? `${fmt(weather_hist.avg_high_f)}°F` : undefined}
              mode={mode}
              accent={accent}
            />
          )}
          {soil_temp_surface_f != null && (
            <MetricTile
              icon="🌱"
              label="Soil Temp"
              value={`${fmt(soil_temp_surface_f)}°F`}
              historical={soil_temp_hist_f != null ? `${fmt(soil_temp_hist_f)}°F` : undefined}
              mode={mode}
              accent={accent}
            />
          )}
          {weather && (
            <MetricTile
              icon="💧"
              label="Humidity"
              value={`${fmt(weather.avg_humidity)}%`}
              historical={weather_hist ? `${fmt(weather_hist.avg_humidity)}%` : undefined}
              mode={mode}
              accent={accent}
            />
          )}
          {rainfall && (
            <MetricTile
              icon="🌧️"
              label="Rainfall"
              value={`${fmt(rainfall.recent_in, 2)}"`}
              historical={`${fmt(rainfall.normal_in, 2)}"`}
              mode={mode}
              accent={accent}
            />
          )}
        </div>
      )}
      {/* 7-day rolling avg vs 3-yr label */}
      {(weather || soil_temp_surface_f != null || rainfall) && (
        <div
          className="px-3 pb-1.5 flex items-center gap-1"
          style={{ backgroundColor: isLight ? `${accent}06` : undefined }}
        >
          <span
            className="text-[9px] font-medium italic"
            style={{ color: isLight ? `${accent}99` : '#9ca3af' }}
          >
            7-day rolling avg • hist = 3-yr norm
          </span>
        </div>
      )}
    </div>
  );
}
