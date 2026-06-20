"use client";

import { useState, useEffect, useCallback } from "react";
import LocationBadge from "./LocationBadge";

interface LocationData {
  lat: number; lng: number; city?: string; state?: string; soilType?: string;
  hardiness_zone?: string; grassClass?: "cool" | "warm" | "transition";
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  weather_hist?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number; soil_temp_6cm_f?: number; soil_temp_hist_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

/**
 * LocationPanel -- self-contained location data panel.
 * Fetches the user's location internally, then delegates rendering to LocationBadge.
 * Accepts optional zipCode prop for remote-location overrides.
 */
export default function LocationPanel() {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`);
          const data: LocationData = await res.json();
          setLocationData(data);
        } catch {
          setLocationData({ lat, lng });
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return (
    <LocationBadge
      location={locationData}
      loading={loading}
      error={error}
      onRetry={fetchLocation}
    />
  );
}
