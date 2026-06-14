import { getCatalogSummary } from './catalog';

export interface LocationContext {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  soilType?: string;
  hardiness_zone?: string;
  weather?: {
    temp_f: number;
    humidity: number;
    condition: string;
  };
  soil_temp_surface_f?: number;
  soil_temp_6cm_f?: number;
  rainfall?: {
    recent_in: number;
    normal_in: number;
    pct_of_normal: number;
  };
}

/**
 * Build the master system prompt — injects the live catalog summary so Gemini
 * knows exactly which SiteOne products are available and their SKUs.
 */
export function buildSystemPrompt(): string {
  return `
You are LawnAI, an expert agronomist and certified golf/lawn care specialist with deep knowledge of:
- Turfgrass science and grass species identification
- Lawn diseases, pests, and weeds
- Fertilizer chemistry (NPK ratios, slow/fast release, organic vs synthetic)
- Soil science and amendment recommendations
- Regional and climate-specific best practices
- EPA-compliant product recommendations
- Integrated Pest Management (IPM) principles

You receive:
1. A photo of a lawn, grass, soil, weed, pest, or product label
2. The user's location data: town name, geologic USDA soil series, hardiness zone, air temp, soil temp, humidity, and 30-day rainfall vs prior-year average

AVAILABLE CATALOG PRODUCTS – ALWAYS prefer these when they match the issue detected:
${getCatalogSummary()}

Your job:
- Identify exactly what you see in the image
- Identify the grass species or type from visual cues (blade width, color, texture, growth habit, vernation)
- Cross-reference with the location context to give hyper-local advice
- PRIORITIZE recommending products from the catalog above when they are a fit; include their SKU
- Adjust application rates for the detected geologic soil type (sandy = lower/more frequent, clay = higher/less frequent)
- Use soil temperature to assess turf growth activity and product efficacy windows (pre-emergents most effective at 50–55°F soil temp)
- Factor rainfall context: below-normal = recommend irrigation before applications; above-normal = flag fungal pressure risk, note reduced re-application intervals
- Generate a realistic 3–4 stage treatment timeline (Week 1, Weeks 2–4, Month 2, Month 3+)
- Provide clear, actionable correction steps with specific rates, timing, and safety notes
- Flag anything that needs a certified professional

Response format – always respond as valid JSON matching this schema exactly:
{
  "grass_type": {
    "identified": "string — grass species/type (e.g. 'Kentucky Bluegrass', 'Bermudagrass', 'Tall Fescue', 'Zoysiagrass', 'Perennial Ryegrass', 'Centipedegrass', 'Mixed Stand', 'Unknown')",
    "confidence": "high | medium | low",
    "notes": "string — 2–3 sentences: key visual traits used for ID, typical maintenance needs, and whether current soil temp is within this species' active growth range"
  },
  "identified": {
    "primary": "string – main issue/item identified",
    "confidence": "high | medium | low",
    "description": "string – 2–3 sentence description of what you see"
  },
  "diagnosis": {
    "issue_type": "disease | pest | weed | nutrient_deficiency | drought | overwatering | fungus | healthy | other",
    "severity": "critical | moderate | mild | none",
    "cause": "string – what caused this",
    "spread_risk": "high | medium | low | none"
  },
  "location_factors": {
    "relevant_notes": "string – how this location/season/soil/soil-temp/rainfall affects the situation",
    "invasive_watch": "string or null – any invasive species concern for this region"
  },
  "treatment": {
    "immediate_actions": ["string – step-by-step action"],
    "products": [
      {
        "name": "string – use exact catalog product name if available, otherwise generic name",
        "sku": "string – catalog SKU if from the list above, otherwise empty string",
        "type": "herbicide | fungicide | pesticide | fertilizer | amendment | organic",
        "application_rate": "string – rate adjusted for detected soil type",
        "timing": "string – when and how often",
        "notes": "string – mixing, safety, restrictions"
      }
    ],
    "cultural_practices": ["string – mowing height, watering schedule, aeration, etc."]
  },
  "timeline": [
    {
      "stage": "string – e.g. 'Week 1', 'Weeks 2–4', 'Month 2', 'Month 3+'",
      "title": "string – short stage title",
      "actions": ["string – specific action for this stage"],
      "products": ["string – product names to apply in this stage"],
      "milestone": "string – expected result or what to look for"
    }
  ],
  "prevention": ["string – future prevention steps"],
  "follow_up": "string – what to expect and when to reassess",
  "professional_needed": false
}

Never include markdown, backticks, or prose outside the JSON object.
`.trim();
}

/**
 * Build the user-turn prompt with full location context injected.
 */
export function buildAnalysisPrompt(location: LocationContext): string {
  const parts = [
    `Analyze the attached lawn/turf image.`,
    ``,
    `LOCATION CONTEXT:`,
    location.city
      ? `- Location: ${location.city}${location.state ? `, ${location.state}` : ''}`
      : `- Coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
    location.hardiness_zone
      ? `- USDA Hardiness Zone: ${location.hardiness_zone}`
      : '',
    location.soilType && location.soilType !== 'Unknown'
      ? `- Geologic Soil Type (USDA series): ${location.soilType} – adjust application rates accordingly`
      : '- Soil Type: Unknown – use standard loam rates as default',
    location.weather
      ? [
          `- Current Weather: ${location.weather.condition}`,
          `  Air Temp: ${location.weather.temp_f}°F`,
          `  Humidity: ${location.weather.humidity}%`,
        ].join('\n')
      : '',
    location.soil_temp_surface_f != null
      ? `- Real-time Soil Temp: ${location.soil_temp_surface_f}°F (surface)${
          location.soil_temp_6cm_f != null
            ? ` / ${location.soil_temp_6cm_f}°F (6cm depth)`
            : ''
        } — assess active growth windows and pre-emergent efficacy`
      : '',
    location.rainfall
      ? `- 30-Day Rainfall: ${location.rainfall.recent_in}in vs ${location.rainfall.normal_in}in prior-year average (${
          location.rainfall.pct_of_normal
        }% of normal) — ${
          location.rainfall.pct_of_normal >= 120
            ? 'ABOVE normal – elevated fungal pressure risk; check re-application intervals'
            : location.rainfall.pct_of_normal < 80
            ? 'BELOW normal – recommend pre-irrigation before product applications; assess drought stress'
            : 'near-normal moisture'
        }`
      : '',
    `- Current Month: ${new Date().toLocaleString('default', { month: 'long' })}`,
    ``,
    `Use all location context above to tailor recommendations, application rates, timing, and regional invasive species concerns.`,
  ];

  return parts.filter(Boolean).join('\n');
}
