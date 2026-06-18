"use client";

import {
  MapPin,
  Thermometer,
  Droplets,
  Loader2,
  AlertCircle,
  Layers,
  CloudRain,
  Leaf,
  Navigation,
} from "lucide-react";

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: "cool" | "warm" | "transition";
  /** 7-day rolling averages */
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  /** 3-year historical averages for same calendar window */
  weather_hist?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  /** 3-year historical average soil surface temp */
  soil_temp_hist_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

interface LocationBadgeProps {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

type DiffDir = "above" | "below" | "normal";

function getDiffDir(diff: number | null, threshold = 0): DiffDir {
  if (diff === null) return "normal";
  if (diff > threshold) return "above";
  if (diff < -threshold) return "below";
  return "normal";
}

/** Colored variance badge: +N / −N */
function DiffBadge({
  diff,
  unit,
  aboveColor = "text-amber-400",
  belowColor = "text-sky-400",
}: {
  diff: number | null;
  unit: string;
  aboveColor?: string;
  belowColor?: string;
}) {
  if (diff === null) return null;
  const dir = getDiffDir(diff);
  const color =
    dir === "above" ? aboveColor : dir === "below" ? belowColor : "text-field-500";
  const sign = diff >= 0 ? "+" : "";
  return (
    <span className={`text-[9px] font-semibold leading-none ${color}`}>
      {sign}{diff}{unit} vs avg
    </span>
  );
}

/** Single metric tile */
function MetricTile({
  icon,
  primary,
  secondary,
  diffEl,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  diffEl?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl bg-soil-800/70 border border-white/5 min-w-0">
      <div className="text-field-400">{icon}</div>
      <span className="text-[11px] font-semibold text-white leading-none whitespace-nowrap">
        {primary}
      </span>
      {secondary && (
        <span className="text-[9px] text-field-400 leading-none">{secondary}</span>
      )}
      {diffEl}
    </div>
  );
}

const GRASS_LABEL: Record<string, string> = {
  cool: "Cool",
  warm: "Warm",
  transition: "Trans.",
};

export default function LocationBadge({
  location,
  loading,
  error,
  onRetry,
}: LocationBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-soil-800 text-field-300 text-xs">
        <Loader2 size={13} className="animate-spin shrink-0" />
        <span>Detecting location…</span>
      </div>
    );
  }

  if (error) {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rust-500/20 text-rust-300 text-xs hover:bg-rust-500/30 transition w-full"
      >
        <AlertCircle size={13} className="shrink-0" />
        <span>Location unavailable — tap to retry</span>
      </button>
    );
  }

  if (!location) return null;

  const { weather, weather_hist, soil_temp_surface_f, soil_temp_hist_f, rainfall } = location;

  // Compute variances
  const tempHighDiff =
    weather && weather_hist
      ? Math.round(weather.avg_high_f - weather_hist.avg_high_f)
      : null;
  const tempLowDiff =
    weather && weather_hist
      ? Math.round(weather.avg_low_f - weather_hist.avg_low_f)
      : null;
  const humidDiff =
    weather && weather_hist
      ? Math.round(weather.avg_humidity - weather_hist.avg_humidity)
      : null;
  const soilDiff =
    soil_temp_surface_f != null && soil_temp_hist_f != null
      ? Math.round(soil_temp_surface_f - soil_temp_hist_f)
      : null;
  const rainDiff =
    rainfall && rainfall.normal_in > 0 ? rainfall.pct_of_normal - 100 : null;

  const grassLabel =
    location.grassClass ? GRASS_LABEL[location.grassClass] ?? "—" : null;

  return (
    <div className="rounded-2xl bg-soil-900/60 border border-white/8 overflow-hidden">
      {/* ── Row 1: Location identity ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 flex-wrap">
        {location.city && (
          <div className="flex items-center gap-1 text-field-200">
            <MapPin size={10} className="text-field-500 shrink-0" />
            <span className="text-[11px] font-medium">
              {location.state ? `${location.city}, ${location.state}` : location.city}
            </span>
          </div>
        )}
        {location.hardiness_zone && location.hardiness_zone !== "Unknown" && (
          <>
            <span className="text-field-600 text-[10px]">·</span>
            <span className="text-[10px] text-field-400">
              Zone {location.hardiness_zone}
            </span>
          </>
        )}
        {grassLabel && (
          <>
            <span className="text-field-600 text-[10px]">·</span>
            <div className="flex items-center gap-0.5">
              <Leaf size={9} className="text-field-500 shrink-0" />
              <span className="text-[10px] text-field-400">{grassLabel} Season</span>
            </div>
          </>
        )}
        {location.soilType && (
          <>
            <span className="text-field-600 text-[10px]">·</span>
            <span className="text-[10px] text-field-500 truncate max-w-[140px]">
              🪨 {location.soilType.split(" — ")[0]}
            </span>
          </>
        )}
      </div>

      {/* ── Row 2: Metric tiles ── */}
      <div className="flex gap-1.5 px-2 py-2">
        {/* Air Temp */}
        {weather ? (
          <MetricTile
            icon={<Thermometer size={12} />}
            primary={`${weather.avg_high_f}° / ${weather.avg_low_f}°`}
            secondary="Air H/L °F"
            diffEl={
              tempHighDiff !== null ? (
                <DiffBadge diff={tempHighDiff} unit="°" />
              ) : null
            }
          />
        ) : (
          <MetricTile icon={<Thermometer size={12} />} primary="—" secondary="Air temp" />
        )}

        {/* Soil Temp */}
        {soil_temp_surface_f != null ? (
          <MetricTile
            icon={<Layers size={12} />}
            primary={`${soil_temp_surface_f}°F`}
            secondary="Soil temp"
            diffEl={<DiffBadge diff={soilDiff} unit="°" />}
          />
        ) : (
          <MetricTile icon={<Layers size={12} />} primary="—" secondary="Soil temp" />
        )}

        {/* Humidity */}
        {weather ? (
          <MetricTile
            icon={<Droplets size={12} />}
            primary={`${weather.avg_humidity}%`}
            secondary="Humidity"
            diffEl={
              <DiffBadge
                diff={humidDiff}
                unit="%"
                aboveColor="text-sky-400"
                belowColor="text-amber-400"
              />
            }
          />
        ) : (
          <MetricTile icon={<Droplets size={12} />} primary="—" secondary="Humidity" />
        )}

        {/* Rainfall */}
        {rainfall ? (
          <MetricTile
            icon={<CloudRain size={12} />}
            primary={`${rainfall.recent_in}"`}
            secondary="Rain 7d"
            diffEl={
              rainDiff !== null ? (
                <DiffBadge
                  diff={rainDiff}
                  unit="%"
                  aboveColor="text-sky-400"
                  belowColor="text-amber-400"
                />
              ) : null
            }
          />
        ) : (
          <MetricTile icon={<CloudRain size={12} />} primary="—" secondary="Rain 7d" />
        )}
      </div>

      {/* ── Row 3: Data label ── */}
      <div className="flex items-center justify-center gap-1 pb-1.5">
        <Navigation size={8} className="text-field-600" />
        <span className="text-[9px] text-field-600 font-medium tracking-wide">
          7-DAY AVG · 3-YR BASELINE
        </span>
      </div>
    </div>
  );
}
