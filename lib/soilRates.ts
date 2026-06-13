// Soil type profiles with rate multipliers and agronomic notes
// Used to adjust AI product recommendations based on detected soil type

export interface SoilProfile {
  label: string;
  rateMultiplier: number;
  drainageClass: 'rapid' | 'moderate' | 'slow';
  notes: string;
  fertFrequency: string;
}

export const SOIL_PROFILES: Record<string, SoilProfile> = {
  sandy: {
    label: 'Sandy',
    rateMultiplier: 0.75,
    drainageClass: 'rapid',
    notes: 'Sandy soils drain quickly — use lower rates but apply more frequently to prevent nutrient leaching.',
    fertFrequency: 'Every 4–6 weeks (light, frequent applications)',
  },
  'sandy loam': {
    label: 'Sandy Loam',
    rateMultiplier: 0.9,
    drainageClass: 'moderate',
    notes: 'Good drainage with moderate retention — slightly below standard rates.',
    fertFrequency: 'Every 6–8 weeks',
  },
  loam: {
    label: 'Loam',
    rateMultiplier: 1.0,
    drainageClass: 'moderate',
    notes: 'Ideal soil structure — use standard label rates.',
    fertFrequency: 'Every 6–8 weeks',
  },
  'silt loam': {
    label: 'Silt Loam',
    rateMultiplier: 1.0,
    drainageClass: 'moderate',
    notes: 'Good structure and water retention — standard rates. Monitor for surface compaction.',
    fertFrequency: 'Every 6–8 weeks',
  },
  'clay loam': {
    label: 'Clay Loam',
    rateMultiplier: 1.15,
    drainageClass: 'slow',
    notes: 'High retention — slightly higher rates, less frequent. Annual core aeration strongly recommended.',
    fertFrequency: 'Every 8–10 weeks',
  },
  clay: {
    label: 'Clay',
    rateMultiplier: 1.25,
    drainageClass: 'slow',
    notes: 'High nutrient retention, prone to compaction — higher initial rates, less frequent. Core aerate annually.',
    fertFrequency: 'Every 10–12 weeks',
  },
};

/**
 * Returns the soil profile for the given soil type string, with loam as default.
 */
export function getSoilProfile(soilType?: string): SoilProfile {
  if (!soilType) return SOIL_PROFILES.loam;
  const key = soilType.toLowerCase().trim();
  if (SOIL_PROFILES[key]) return SOIL_PROFILES[key];
  // Fuzzy match
  for (const [k, v] of Object.entries(SOIL_PROFILES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return SOIL_PROFILES.loam;
}

/**
 * Adjusts a rate string (e.g. "2–3 lbs/1000 sq ft") by the soil multiplier.
 */
export function adjustRate(baseRate: string, soilType?: string): string {
  const profile = getSoilProfile(soilType);
  if (profile.rateMultiplier === 1.0) return baseRate;
  const m = baseRate.match(/^([\d.]+)(?:[–-]([\d.]+))?(.*)$/);
  if (!m) return baseRate;
  const fmt = (n: number) => parseFloat(n.toFixed(2)).toString();
  const lo = fmt(parseFloat(m[1]) * profile.rateMultiplier);
  const hi = m[2] ? fmt(parseFloat(m[2]) * profile.rateMultiplier) : null;
  return hi ? `${lo}–${hi}${m[3]}` : `${lo}${m[3]}`;
}
