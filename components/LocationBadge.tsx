"use client";

import {
  MapPin, Thermometer, Droplets, Loader2, AlertCircle, Layers, CloudRain, Leaf, Navigation,
} from "lucide-react";

interface LocationData {
  lat: number; lng: number; city?: string; state?: string; soilType?: string;
  hardiness_zone?: string; grassClass?: "cool" | "warm" | "transition";
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  weather_hist?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number; soil_temp_6cm_f?: number; soil_temp_hist_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

interface LocationBadgeProps {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const GRASS_LABEL: Record<string, string> = {
  cool: "Cool Season", warm: "Warm Season", transition: "Transition Zone",
};

function MetricTile({
  icon, label, value, diff, diffUnit, diffPositive,
}: {
  icon: React.ReactNode; label: string; value: string;
  diff?: number | null; diffUnit?: string; diffPositive?: boolean;
}) {
  const aboveColor = diffPositive === false ? "text-sky-400" : "text-amber-400";
  const belowColor = diffPositive === false ? "text-amber-400" : "text-sky-400";

  let diffEl: React.ReactNode = null;
  if (diff != null) {
    const color = diff > 0 ? aboveColor : diff < 0 ? belowColor : "text-field-500";
    const sign = diff >= 0 ? "+" : "";
    diffEl = (
      <span className={`text-xs font-semibold leading-none ${color}`}>
        {sign}{diff}{diffUnit}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-soil-800/70 border border-white/6 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-field-400">
        {icon}
        <span className="text-[10px] font-medium text-field-400 uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-lg font-bold text-white leading-tight">{value}</span>
      {diffEl ?? <span className="text-[10px] text-field-700 italic">no baseline</span>}
    </div>
  );
}

export default function LocationBadge({ location, loading, error, onRetry }: LocationBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-soil-800 text-field-300">
        <Loader2 size={15} className="animate-spin shrink-0" />
        <span className="text-sm">Detecting location…</span>
      </div>
    );
  }

  if (error) {
    return (
      <button onClick={onRetry} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rust-500/20 text-rust-300 hover:bg-rust-500/30 transition w-full">
        <AlertCircle size={15} className="shrink-0" />
        <span className="text-sm">Location unavailable — tap to retry</span>
      </button>
    );
  }

  if (!location) return null;

  const { weather, weather_hist, soil_temp_surface_f, soil_temp_hist_f, rainfall } = location;

  const tempHighDiff = weather && weather_hist ? Math.round(weather.avg_high_f - weather_hist.avg_high_f) : null;
  const humidDiff = weather && weather_hist ? Math.round(weather.avg_humidity - weather_hist.avg_humidity) : null;
  const soilDiff = soil_temp_surface_f != null && soil_temp_hist_f != null ? Math.round(soil_temp_surface_f - soil_temp_hist_f) : null;
  const rainDiff = rainfall && rainfall.normal_in > 0 ? rainfall.pct_of_normal - 100 : null;

  const grassLabel = location.grassClass ? GRASS_LABEL[location.grassClass] ?? null : null;
  const airValue = weather ? `${weather.avg_high_f}° / ${weather.avg_low_f}°` : "—";
  const soilValue = soil_temp_surface_f != null ? `${soil_temp_surface_f}°F` : "—";
  const humidValue = weather ? `${weather.avg_humidity}%` : "—";
  const rainValue = rainfall ? `${rainfall.recent_in}"` : "—";

  return (
    <div className="rounded-2xl bg-soil-900/70 border border-white/8 overflow-hidden">

      {/* Location identity row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2.5 pb-2">
        {location.city && (
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-field-500 shrink-0" />
            <span className="text-sm font-semibold text-field-100">
              {location.state ? `${location.city}, ${location.state}` : location.city}
            </span>
          </div>
        )}
        {location.hardiness_zone && location.hardiness_zone !== "Unknown" && (
          <span className="text-[10px] text-field-400 bg-soil-800 rounded-full px-2 py-0.5">
            Zone {location.hardiness_zone}
          </span>
        )}
        {grassLabel && (
          <span className="flex items-center gap-1 text-[10px] text-field-400 bg-soil-800 rounded-full px-2 py-0.5">
            <Leaf size={9} className="shrink-0" />{grassLabel}
          </span>
        )}
        {location.soilType && (
          <span className="text-[10px] text-field-500 truncate max-w-[160px]">
            🪨 {location.soilType.split(" — ")[0]}
          </span>
        )}
      </div>

      {/* 2×2 metric grid */}
      <div className="grid grid-cols-2 gap-1.5 px-2.5 pb-2">
        <MetricTile icon={<Thermometer size={12} />} label="Air H / L °F" value={airValue} diff={tempHighDiff} diffUnit="°" diffPositive={true} />
        <MetricTile icon={<Layers size={12} />} label="Soil Temp" value={soilValue} diff={soilDiff} diffUnit="°" diffPositive={true} />
        <MetricTile icon={<Droplets size={12} />} label="Humidity" value={humidValue} diff={humidDiff} diffUnit="%" diffPositive={false} />
        <MetricTile icon={<CloudRain size={12} />} label="Rain 7-Day" value={rainValue} diff={rainDiff} diffUnit="%" diffPositive={false} />
      </div>

      {/* Data label */}
      <div className="flex items-center justify-center gap-1 pb-2">
        <Navigation size={8} className="text-field-600" />
        <span className="text-[9px] text-field-600 font-medium tracking-widest uppercase">
          7-Day Avg · 3-Yr Baseline
        </span>
      </div>
    </div>
  );
}
