// Prompt builders for Gemini API — server-side only via API routes

export const IRRIGATION_SYSTEM_PROMPT = `You are an expert irrigation diagnostic tool and field training assistant. You specialize in residential and commercial irrigation systems including Hunter, Rain Bird, Toro, Rachio, Orbit, Irritrol, and K-Rain equipment.

For every analysis, return valid JSON only — no markdown, no explanation outside the JSON.

Every finding must include:
- "brief": one sentence the technician can act on immediately
- "detail": 2-4 sentences explaining WHY — the root cause and what happens if ignored
- "action": specific next step with part numbers or tolerances where relevant
- "severity": "critical" | "moderate" | "mild" | "none"

Severity definitions:
- critical: system will fail, property damage risk, or safety issue
- moderate: functional degradation, water waste, or will worsen without action
- mild: suboptimal performance or efficiency issue
- none: operating correctly`;

// SMART SCAN — universal image router

export function buildSmartScanPrompt(): string {
  return `Look at this irrigation system image and identify what you see. Diagnose any visible issues.

Return JSON:
{
  "identified_as": "controller|valve|spray_head|rotor|rain_sensor|drip|zone_area|pipe|unknown",
  "brand": "Hunter|Rain Bird|Toro|Rachio|Orbit|Irritrol|K-Rain|other|unknown",
  "model": "model if identifiable, or null",
  "condition": "good|worn|damaged|flooding|misting|clogged|tilted|broken|unknown",
  "brief": "One sentence: what you see and the main finding",
  "detail": "2-3 sentences: why this matters, root cause, urgency",
  "action": "Most important immediate step",
  "severity": "critical|moderate|mild|none",
  "suggested_diagnostic": "electrical|hydraulic|rain_sensor|design|controller|zones|none",
  "routing_reason": "Why this diagnostic is suggested",
  "additional_findings": [
    {
      "brief": "Secondary observation",
      "detail": "What it means",
      "action": "What to do",
      "severity": "mild"
    }
  ]
}`;
}

// DESIGN ASSESSMENT

export function buildDesignAssessmentPrompt(): string {
  return `Analyze this irrigation zone photo. Identify all visible heads and flag any placement or coverage issues.

Return JSON:
{
  "heads_identified": [
    { "type": "rotor|spray|drip|mp_rotator|bubbler", "count": 0, "notes": "optional" }
  ],
  "issues": [
    {
      "brief": "One-line finding",
      "detail": "Why this is a problem and what happens if left unfixed",
      "action": "Specific corrective step",
      "severity": "critical|moderate|mild|none",
      "category": "placement|coverage|head_type|mixing|height"
    }
  ],
  "mixed_heads_on_zone": false,
  "overall_assessment": "brief zone condition summary",
  "precipitation_rate_note": "optional note"
}

Issues to check:
- Rotor heads in planting beds (should use spray or drip)
- Spray heads in large turf areas over 15ft radius (should use rotors or MP rotators)
- Mixed rotors and spray heads on the same zone — CRITICAL, never acceptable
- Spray heads below grade or tilted — affects coverage pattern
- Heads spraying onto hardscape, structures, or windows
- Coverage gaps indicating missed areas or incorrect spacing
- 4 inch spray heads in beds with tall plants needing 6 or 12 inch extensions`;
}

// CONTROLLER IDENTIFICATION

export const CONTROLLER_ID_PROMPT = `Identify the irrigation controller in this image.

Return JSON:
{
  "brand": "Hunter|Rain Bird|Toro|Rachio|Orbit|Irritrol|K-Rain|other",
  "model": "model name/number",
  "confidence": "high|medium|low",
  "zones_visible": null,
  "brief": "One-line ID result",
  "detail": "Controller age, condition, and capability observations",
  "action": "Recommended next step"
}`;

// VALVE IDENTIFICATION

export const VALVE_ID_PROMPT = `Identify the irrigation valve or solenoid in this image.

Return JSON:
{
  "brand": "Hunter|Rain Bird|Toro|Irritrol|Richdell|Orbit|K-Rain|other",
  "model": "model name if visible",
  "valve_type": "globe|angle|inline|anti_siphon",
  "condition": "good|worn|damaged|leaking",
  "solenoid_present": true,
  "brief": "One-line ID and condition",
  "detail": "Condition indicators and what they mean",
  "action": "Recommended next step"
}`;

// RAIN SENSOR

export function buildRainSensorPrompt(): string {
  return `Analyze this rain sensor installation photo.

Evaluate: open-sky exposure, overhangs or eaves above, tree obstruction, sun exposure, mounting height vs spray reach, sensor orientation.

Return JSON:
{
  "brand": "Rain Bird|Hunter|Toro|Irritrol|other|unknown",
  "location_rating": "good|acceptable|poor",
  "issues": [
    {
      "brief": "One-line issue",
      "detail": "Why this location is problematic",
      "action": "Correction",
      "severity": "critical|moderate|mild|none"
    }
  ],
  "bypass_visible": false,
  "bypass_status": "active|inactive|unknown",
  "overall_effectiveness": "effective|questionable|ineffective",
  "brief": "One-line overall assessment",
  "detail": "Full explanation of location quality",
  "action": "Primary recommended action"
}`;
}

// ELECTRICAL DIAGNOSIS (image-assisted or text-only)

export function buildElectricalPrompt(symptom: string, ohmReading?: number, brand?: string): string {
  const ohmContext = ohmReading != null
    ? `Technician has measured ${ohmReading} ohms on this solenoid${brand ? ` (${brand})` : ''}.`
    : '';

  return `Diagnose this irrigation electrical issue.

Symptom: ${symptom}
${ohmContext}

Return JSON:
{
  "diagnosis": {
    "brief": "Most likely cause in one sentence",
    "detail": "Electrical principle behind this symptom and its root cause",
    "action": "Most important immediate test",
    "severity": "critical|moderate|mild|none"
  },
  "steps": [
    {
      "step_number": 1,
      "title": "Step title",
      "instruction": "What to physically do",
      "brief": "What the result tells you",
      "detail": "Why this test matters",
      "expected_pass": "Healthy result description",
      "expected_fail": "Problem indicator",
      "tool_needed": "multimeter|screwdriver|none",
      "severity": "mild"
    }
  ],
  "likely_cause": "solenoid|controller|field_wire|common_wire|diaphragm|other",
  "parts_likely_needed": ["part description"]
}

Electrical reference:
- Hunter solenoids: 39-47 ohm typical; below 25 ohm = shorted; above 60 ohm = open or breaking
- Rain Bird solenoids: 28-38 ohm typical
- Toro solenoids: 30-50 ohm typical
- Irritrol solenoids: 30-50 ohm typical
- K-Rain solenoids: 35-55 ohm typical
- Orbit solenoids: 25-40 ohm typical
- Open circuit (OL or infinite): broken coil or wire
- Short to ground: below 10 ohm one lead on wire one on ground
- Controller output: should read 24-28VAC at solenoid terminals when zone is active`;
}

// HYDRAULIC DIAGNOSIS

export function buildHydraulicPrompt(symptom: string): string {
  return `Diagnose this irrigation hydraulic issue.

Symptom: ${symptom}

Return JSON:
{
  "diagnosis": {
    "brief": "Most likely cause",
    "detail": "Hydraulic principle causing this symptom",
    "action": "Primary test to confirm",
    "severity": "critical|moderate|mild|none"
  },
  "steps": [
    {
      "step_number": 1,
      "title": "Step title",
      "instruction": "What to physically do",
      "brief": "What the result tells you",
      "detail": "Why this test isolates this part of the system",
      "expected_pass": "Healthy result",
      "expected_fail": "Problem indicator",
      "tool_needed": "pressure_gauge|screwdriver|none",
      "severity": "mild"
    }
  ],
  "likely_cause": "prv|backflow|filter|broken_head|clogged_nozzle|pipe_break|valve_diaphragm|other"
}

Pressure reference:
- Normal residential static: 50-80 PSI
- Spray zones working pressure: 30-45 PSI
- Rotor zones working pressure: 35-50 PSI
- Drip zones working pressure: 15-30 PSI
- Head misting or fogging: typically caused by above 60 PSI at head — needs PRV or pressure-regulating stems`;
}

// ZONE ASSESSMENT

export function buildZoneAssessmentPrompt(zones: { type: string; count: number }[]): string {
  const zoneList = zones.map(z => `${z.count} ${z.type} zone(s)`).join(', ');
  return `Analyze this irrigation zone configuration and provide runtime recommendations.

Zone breakdown: ${zoneList}

Return JSON:
{
  "zone_analysis": [
    {
      "zone_type": "spray|rotor|drip|mp_rotator",
      "count": 0,
      "precipitation_rate_in_hr": 0.0,
      "recommended_runtime_min": 0,
      "brief": "Runtime recommendation summary",
      "detail": "Why this runtime — soil saturation, root depth, ET basis",
      "scheduling_note": "Cycle-and-soak or single-run recommendation"
    }
  ],
  "total_runtime_min": 0,
  "scheduling_recommendation": {
    "brief": "Overall watering schedule",
    "detail": "Cycle and soak rationale and seasonal adjustment guidance",
    "action": "Specific controller programming suggestion"
  },
  "mixed_head_warning": false,
  "notes": "Additional observations"
}

Precipitation rates:
- Fixed spray: 1.5-2.0 in/hr
- Rotor: 0.4-0.6 in/hr
- MP Rotator: 0.4-0.5 in/hr
- Drip: 0.1-0.5 in/hr
- Target: approximately 1 inch per week in typical summer conditions
- Clay soils: cycle-and-soak, max 8 min per cycle to prevent runoff
- Sandy soils: shorter cycles more frequently`;
}

// HOMEOWNER MODE

export function buildHomeownerPrompt(question: string, systemContext: string): string {
  return `Answer a homeowner question about their irrigation system. Keep language simple — no unexplained jargon.

System context: ${systemContext}
Question: ${question}

Return JSON:
{
  "brief": "Direct answer in plain language",
  "detail": "Simple explanation that builds understanding",
  "action": "What they can do or watch for",
  "severity": "none|mild|moderate|critical"
}`;
}

// INSPECTION SUMMARY

export function buildInspectionSummaryPrompt(findings: string): string {
  return `Summarize this irrigation system inspection.

Findings:
${findings}

Return JSON:
{
  "overall_rating": "good|fair|poor",
  "critical_count": 0,
  "moderate_count": 0,
  "mild_count": 0,
  "executive_summary": {
    "brief": "2-sentence system status",
    "detail": "Paragraph for property manager or homeowner"
  },
  "priority_actions": [
    {
      "rank": 1,
      "brief": "Action item",
      "detail": "Why this is priority",
      "estimated_cost": "rough range or labor only"
    }
  ],
  "positive_findings": ["things working correctly"],
  "next_service_recommendation": "timing and type"
}`;
}
