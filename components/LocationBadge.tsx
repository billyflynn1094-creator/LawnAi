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
} from "lucide-react";

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  grassClass?: "cool" | "warm" | "transition";
  weather?: { temp_f: number; humidity: number; condition: string };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

interface LocationBadgeProps {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const GRASS_CLASS_STYLE: Record<
  string,
  { label: string; classes: string }
> = {
  cool: {
    label: "Cool Season",
    classes: "bg-field-800/60 text-field-300",
  },
  warm: {
    label: "Warm Season",
    classes: "bg-straw-400/20 text-straw-300",
  },
  transition: {
    label: "Transition Zone",
    classes: "bg-purple-900/40 text-purple-300",
  },
};

export default function LocationBadge({
  location,
  loading,
  error,
  onRetry,
}: LocationBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-soil-800 text-field-300 text-xs">
        <Loader2 size={13} className="animate-spin" />
        <span>Detecting location…</span>
      </div>
    );
  }

  if (error) {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rust-500/20 text-rust-300 text-xs hover:bg-rust-500/30 transition"
      >
        <AlertCircle size={13} />
        <span>Location unavailable — tap to retry</span>
      </button>
    );
  }

  if (!location) return null;

  const rain = location.rainfall;
  const rainDiff = rain ? rain.pct_of_normal - 100 : 0;
  const rainColor =
    rain && rain.pct_of_normal >= 120
      ? "bg-blue-900/40 text-blue-300"
      : rain && rain.pct_of_normal < 80
      ? "bg-straw-400/20 text-straw-300"
      : "bg-soil-800 text-field-200";

  const grassStyle =
    location.grassClass
      ? GRASS_CLASS_STYLE[location.grassClass] ?? GRASS_CLASS_STYLE.cool
      : null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Town name */}
      {location.city && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
          <MapPin size={12} className="text-field-400 shrink-0" />
          <span>
            {location.state
              ? `${location.city}, ${location.state}`
              : location.city}
          </span>
        </div>
      )}

      {/* USDA Hardiness zone */}
      {location.hardiness_zone && location.hardiness_zone !== "Unknown" && (
        <div className="px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
          Zone {location.hardiness_zone}
        </div>
      )}

      {/* Grass class badge — cool / warm / transition */}
      {grassStyle && (
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs ${grassStyle.classes}`}
        >
          <Leaf size={11} className="shrink-0" />
          <span>{grassStyle.label}</span>
        </div>
      )}

      {/* Geologic / USDA soil series name */}
      {location.soilType && location.soilType !== "Unknown" && (
        <div className="px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs max-w-[220px] truncate">
          🪨 {location.soilType}
        </div>
      )}

      {/* Air temperature */}
      {location.weather && (
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
          <Thermometer size={12} className="text-straw-300 shrink-0" />
          <span>{location.weather.temp_f}°F air</span>
        </div>
      )}

      {/* Soil temp — immediately after air temp */}
      {location.soil_temp_surface_f != null && (
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
          <Layers size={12} className="text-straw-400 shrink-0" />
          <span>
            {location.soil_temp_surface_f}°F soil
            {location.soil_temp_6cm_f != null &&
            location.soil_temp_6cm_f !== location.soil_temp_surface_f
              ? ` / ${location.soil_temp_6cm_f}°F @ 6cm`
              : ""}
          </span>
        </div>
      )}

      {/* Humidity */}
      {location.weather && (
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
          <Droplets size={12} className="text-blue-400 shrink-0" />
          <span>{location.weather.humidity}% RH</span>
        </div>
      )}

      {/* 30-day rainfall vs 3-year average */}
      {rain && (
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs ${rainColor}`}
        >
          <CloudRain size={12} className="shrink-0" />
          <span>
            {rain.recent_in}in
            {rain.normal_in > 0 && (
              <>
                {" "}
                ({rainDiff >= 0 ? "+" : ""}
                {rainDiff}% vs 3yr avg)
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
