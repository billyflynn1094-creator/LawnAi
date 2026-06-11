"use client";

import { MapPin, Thermometer, Droplets, Loader2, AlertCircle } from "lucide-react";

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  weather?: { temp_f: number; humidity: number; condition: string };
}

interface LocationBadgeProps {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

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

  return (
    <div className="flex flex-wrap gap-2">
      {/* Place */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
        <MapPin size={12} className="text-field-400 shrink-0" />
        <span>
          {location.city ? `${location.city}, ${location.state}` : `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}
        </span>
      </div>

      {/* Hardiness zone */}
      {location.hardiness_zone && location.hardiness_zone !== "Unknown" && (
        <div className="px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
          Zone {location.hardiness_zone}
        </div>
      )}

      {/* Soil */}
      {location.soilType && location.soilType !== "Unknown" && (
        <div className="px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs max-w-[180px] truncate">
          🌱 {location.soilType}
        </div>
      )}

      {/* Weather */}
      {location.weather && (
        <>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
            <Thermometer size={12} className="text-straw-300 shrink-0" />
            <span>{location.weather.temp_f}°F</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-soil-800 text-field-200 text-xs">
            <Droplets size={12} className="text-blue-400 shrink-0" />
            <span>{location.weather.humidity}%</span>
          </div>
        </>
      )}
    </div>
  );
}
