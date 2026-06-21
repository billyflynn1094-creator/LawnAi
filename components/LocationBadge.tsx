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
}

function fmt(n: number | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals);
}

function diffSign(n: number): string {
  return n > 0 ? '+' : '';
}

interface MetricTileProps {
  icon: JSX.Element | string;
  label: string;
  value: string;
  diff?: string;
  diffUnit?: string;
  mode: 'light' | 'dark';
  accent: string;
}

function MetricTile({ icon, label, value, diff, diffUnit, mode, accent }: MetricTileProps) {
  const isLight = mode === 'light';

  if (isLight) {
    return (
      <div
        className="flex flex-col gap-1 rounded-xl px-2.5 py-1.5 bg-white"
        style={{ border: `1px solid ${accent}20` }}
      >
        <span className="text-sm leading-none" style={{ color: accent }}>{icon}</span>
        <span
          className="text-[9px] font-bold uppercase tracking-wide leading-none"
          style={{ color: accent }}
        >
          {label}
        </span>
        <span className="text-[15px] font-bold leading-tight text-gray-900">{value}</span>
        {diff && (
          <span className="text-[9px] font-semibold leading-none" style={{ color: accent }}>
            {diff}{diffUnit ?? ''}
          </span>
        )}
      </div>
    );
  }

  // dark mode (original)
  const diffNum = diff ? parseFloat(diff) : null;
  const diffColor =
    diffNum == null ? '' : diffNum > 0 ? 'text-amber-400' : diffNum < 0 ? 'text-sky-400' : 'text-gray-400';

  return (
    <div className="flex flex-col gap-1 rounded-xl px-3 py-2.5 bg-soil-800">
      <span className="text-base leading-none text-field-300">{icon}</span>
      <span className="text-[10px] font-bold text-field-300 uppercase tracking-wide leading-none">
        {label}
      </span>
      <span className="text-lg font-bold leading-tight text-white">{value}</span>
      {diff && (
        <span className={`text-[10px] font-semibold leading-none ${diffColor}`}>
          {diff}{diffUnit ?? ''}
        </span>
      )}
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

  const { city, state, soilType, hardiness_zone, grassClass, weather, weather_hist, soil_temp_surface_f, soil_temp_6cm_f, soil_temp_hist_f, rainfall } = location;

  const airTempDiff =
    weather && weather_hist
      ? weather.avg_high_f - weather_hist.avg_high_f
      : null;

  const soilTempDiff =
    soil_temp_surface_f != null && soil_temp_hist_f != null
      ? soil_temp_surface_f - soil_temp_hist_f
      : null;

  const rainfallPct = rainfall?.pct_of_normal ?? null;

  const grassLabel: Record<string, string> = {
    cool: 'Cool-Season',
    warm: 'Warm-Season',
    transition: 'Transition Zone',
  };

  const headerBg = isLight ? accent : undefined;
  const headerClass = isLight
    ? 'px-4 py-2.5 flex items-center justify-between'
    : 'px-4 py-2.5 bg-soil-800 flex items-center justify-between';

  return (
    <div className={containerClass} style={isLight ? containerStyle : undefined}>
      {/* Header row */}
      <div
        className={headerClass}
        style={isLight ? { backgroundColor: headerBg } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">📍</span>
          <div className="min-w-0">
            {(city || state) ? (
              <>
                <span className="text-sm font-bold text-white leading-tight block truncate">
                  {[city, state].filter(Boolean).join(', ')}
                </span>
                {hardiness_zone && (
                  <span className="text-[10px] font-medium text-white/70 leading-none">
                    Zone {hardiness_zone}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm font-medium text-white/80">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            )}
          </div>
        </div>
        {grassClass && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              backgroundColor: isLight ? 'rgba(255,255,255,0.25)' : 'rgba(74,133,53,0.25)',
              color: '#ffffff',
            }}
          >
            {grassLabel[grassClass] ?? grassClass}
          </span>
        )}
      </div>

      {/* Soil type */}
      {soilType && (
        <div
          className="px-4 py-1.5 border-b"
          style={{
            borderColor: isLight ? `${accent}20` : undefined,
            backgroundColor: isLight ? `${accent}08` : undefined,
          }}
        >
          <span
            className="text-[11px] font-medium"
            style={{ color: isLight ? accent : '#86efac' }}
          >
            Soil: {soilType}
          </span>
        </div>
      )}

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
              diff={airTempDiff != null ? `${diffSign(airTempDiff)}${fmt(airTempDiff, 1)}°` : undefined}
              mode={mode}
              accent={accent}
            />
          )}
          {soil_temp_surface_f != null && (
            <MetricTile
              icon="🌱"
              label="Soil Temp"
              value={`${fmt(soil_temp_surface_f)}°F`}
              diff={soilTempDiff != null ? `${diffSign(soilTempDiff)}${fmt(soilTempDiff, 1)}°` : undefined}
              mode={mode}
              accent={accent}
            />
          )}
          {weather && (
            <MetricTile
              icon="💧"
              label="Humidity"
              value={`${fmt(weather.avg_humidity)}%`}
              mode={mode}
              accent={accent}
            />
          )}
          {rainfall && (
            <MetricTile
              icon="🌧️"
              label="Rainfall"
              value={`${fmt(rainfall.recent_in, 2)}"`}
              diff={rainfallPct != null ? `${fmt(rainfallPct, 0)}% of norm` : undefined}
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
            7-day rolling avg • vs 3-yr historical norm
          </span>
        </div>
      )}
    </div>
  );
}
