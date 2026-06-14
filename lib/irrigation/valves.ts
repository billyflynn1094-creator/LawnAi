export interface ValveSpec {
  brand: string;
  models: string[];
  type: "globe" | "angle" | "inline" | "anti-siphon";
  flow_range_gpm: [number, number];
  pressure_range_psi: [number, number];
  solenoid_ohms: [number, number];
  visual_identifiers: string[];
  common_failure_modes: string[];
  diaphragm_replaceable: boolean;
  parts_availability: "excellent" | "good" | "limited" | "discontinued";
}

export const VALVE_DATABASE: ValveSpec[] = [
  {
    brand: "Hunter",
    models: ["PGV", "ICV", "ICZ", "HV", "ACZ"],
    type: "globe",
    flow_range_gpm: [0.25, 50],
    pressure_range_psi: [15, 150],
    solenoid_ohms: [20, 60],
    visual_identifiers: ["Orange or gray bonnet", "Hunter logo embossed on body", "Purple for reclaimed water variants"],
    common_failure_modes: ["Diaphragm tear from debris", "Solenoid coil failure", "Flow control stem O-ring"],
    diaphragm_replaceable: true,
    parts_availability: "excellent",
  },
  {
    brand: "Rain Bird",
    models: ["DV", "DVF", "EFB-CP", "ASVF", "PESB", "CP"],
    type: "globe",
    flow_range_gpm: [0.5, 50],
    pressure_range_psi: [15, 150],
    solenoid_ohms: [20, 60],
    visual_identifiers: ["Red or white bonnet", "Rain Bird name molded in plastic", "Black solenoid with yellow wire leads"],
    common_failure_modes: ["Diaphragm cracking", "Solenoid plunger sticking", "Flow control O-ring wear"],
    diaphragm_replaceable: true,
    parts_availability: "excellent",
  },
  {
    brand: "Toro",
    models: ["252", "253", "254", "EZ-FLO", "264", "LB"],
    type: "globe",
    flow_range_gpm: [0.5, 35],
    pressure_range_psi: [15, 125],
    solenoid_ohms: [22, 66],
    visual_identifiers: ["Blue or black bonnet with Toro logo", "Ribbed solenoid housing"],
    common_failure_modes: ["Diaphragm failure", "Flow control stem leak", "Bonnet bolt corrosion"],
    diaphragm_replaceable: true,
    parts_availability: "good",
  },
  {
    brand: "Irritrol",
    models: ["205T", "700", "721", "760", "761", "R201"],
    type: "globe",
    flow_range_gpm: [0.25, 40],
    pressure_range_psi: [15, 150],
    solenoid_ohms: [20, 60],
    visual_identifiers: ["Gray or green body", "Irritrol or Hardie name on bonnet", "Round solenoid housing"],
    common_failure_modes: ["Diaphragm stiffening with age", "Solenoid coil open circuit", "Spring failure"],
    diaphragm_replaceable: true,
    parts_availability: "good",
  },
  {
    brand: "Richdell",
    models: ["200", "205", "R211", "R212", "311"],
    type: "globe",
    flow_range_gpm: [0.5, 30],
    pressure_range_psi: [15, 125],
    solenoid_ohms: [25, 70],
    visual_identifiers: ["Older gray or beige body", "Richdell stamped on bonnet", "Often found in pre-1995 systems"],
    common_failure_modes: ["Diaphragm hardening — most common", "Solenoid failure from age"],
    diaphragm_replaceable: true,
    parts_availability: "limited",
  },
  {
    brand: "Orbit",
    models: ["57253", "57100", "WaterMaster"],
    type: "globe",
    flow_range_gpm: [0.5, 25],
    pressure_range_psi: [10, 125],
    solenoid_ohms: [18, 55],
    visual_identifiers: ["Black body with Orbit branding", "Compact housing"],
    common_failure_modes: ["Diaphragm failure within 3-5 years", "Solenoid coil burn-out"],
    diaphragm_replaceable: true,
    parts_availability: "good",
  },
  {
    brand: "K-Rain",
    models: ["3000", "6000", "RPS75", "RPS100"],
    type: "globe",
    flow_range_gpm: [0.5, 35],
    pressure_range_psi: [15, 125],
    solenoid_ohms: [20, 60],
    visual_identifiers: ["Blue or black body", "K-Rain logo on bonnet"],
    common_failure_modes: ["Diaphragm failure", "Flow control O-ring"],
    diaphragm_replaceable: true,
    parts_availability: "good",
  },
];

export interface NozzleSpec {
  brand: string;
  model: string;
  type: "spray" | "rotor" | "mp_rotator" | "drip";
  radius_ft: number;
  gpm: number;
  precip_rate_in_hr: number;
  arc_options: string[];
  matched_precip: boolean;
  notes: string;
}

export const NOZZLE_DATABASE: NozzleSpec[] = [
  { brand: "Hunter", model: "Pro-Spray / Fixed", type: "spray", radius_ft: 15, gpm: 2.64, precip_rate_in_hr: 1.5, arc_options: ["90°","120°","180°","360°"], matched_precip: true, notes: "Standard residential spray." },
  { brand: "Rain Bird", model: "1800 / Fixed", type: "spray", radius_ft: 15, gpm: 2.60, precip_rate_in_hr: 1.49, arc_options: ["90°","120°","180°","360°"], matched_precip: true, notes: "Industry standard fixed spray." },
  { brand: "Hunter", model: "MP Rotator 1000", type: "mp_rotator", radius_ft: 15, gpm: 0.42, precip_rate_in_hr: 0.4, arc_options: ["90°-210°","210°-270°","360°"], matched_precip: true, notes: "Low flow, high efficiency. 2-3x longer run times needed vs spray." },
  { brand: "Rain Bird", model: "R-VAN 14", type: "mp_rotator", radius_ft: 14, gpm: 0.38, precip_rate_in_hr: 0.39, arc_options: ["45°-270°","360°"], matched_precip: true, notes: "Rain Bird rotary nozzle." },
  { brand: "Hunter", model: "PGP Ultra", type: "rotor", radius_ft: 42, gpm: 3.40, precip_rate_in_hr: 0.62, arc_options: ["40°-360° adjustable"], matched_precip: false, notes: "Standard lawn rotor." },
  { brand: "Rain Bird", model: "5000 Series", type: "rotor", radius_ft: 38, gpm: 2.80, precip_rate_in_hr: 0.63, arc_options: ["40°-360° adjustable"], matched_precip: false, notes: "Most widely installed rotor in US residential/commercial." },
];

export function calcPrecipRate(gpm: number, headSpacingFt: number, rowSpacingFt: number): number {
  return (96.25 * gpm) / (headSpacingFt * rowSpacingFt);
}

export function calcRunTime(targetInches: number, precipRateInHr: number): number {
  return (targetInches / precipRateInHr) * 60;
}

export const WATER_REQUIREMENTS: Record<string, { summer: number; spring_fall: number; winter: number }> = {
  "cool_humid": { summer: 1.0, spring_fall: 0.5, winter: 0 },
  "cool_arid": { summer: 1.5, spring_fall: 0.75, winter: 0 },
  "transition": { summer: 1.25, spring_fall: 0.75, winter: 0.25 },
  "warm_humid": { summer: 1.0, spring_fall: 0.5, winter: 0 },
  "warm_arid": { summer: 2.0, spring_fall: 1.0, winter: 0.25 },
  "desert": { summer: 2.5, spring_fall: 1.25, winter: 0.5 },
};

export function identifyValve(description: string): ValveSpec | null {
  const d = description.toLowerCase();
  return VALVE_DATABASE.find(v =>
    v.brand.toLowerCase().includes(d) ||
    v.models.some(m => m.toLowerCase().includes(d)) ||
    v.visual_identifiers.some(i => i.toLowerCase().includes(d))
  ) ?? null;
}
