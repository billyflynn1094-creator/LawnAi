export interface SolenoidSpec {
  brand: string;
  models: string[];
  ohm_min: number;
  ohm_max: number;
  ohm_nominal: number;
  voltage_ac: number;
  inrush_amps: number;
  holding_amps: number;
  notes: string;
}

export const SOLENOID_DATABASE: SolenoidSpec[] = [
  {
    brand: "Hunter",
    models: ["PGV", "ICV", "ICZ", "HV", "ACZ", "IBV", "ICV-G"],
    ohm_min: 20,
    ohm_max: 60,
    ohm_nominal: 24,
    voltage_ac: 24,
    inrush_amps: 0.41,
    holding_amps: 0.19,
    notes: "Hunter uses a 24VAC inductive solenoid. Readings below 20Ω indicate short/coil damage. Above 60Ω indicates open circuit or broken wire.",
  },
  {
    brand: "Rain Bird",
    models: ["DV", "DVF", "EFB-CP", "ASVF", "CP", "HV", "PGA", "PESB", "PESC"],
    ohm_min: 20,
    ohm_max: 60,
    ohm_nominal: 28,
    voltage_ac: 24,
    inrush_amps: 0.36,
    holding_amps: 0.17,
    notes: "Rain Bird solenoids run slightly higher nominal than Hunter. DVF series often reads 25-35Ω in good condition.",
  },
  {
    brand: "Toro",
    models: ["252", "253", "254", "EZ-FLO", "264", "LB"],
    ohm_min: 22,
    ohm_max: 66,
    ohm_nominal: 30,
    voltage_ac: 24,
    inrush_amps: 0.38,
    holding_amps: 0.18,
    notes: "Toro solenoids vary more by model generation. Older 252 series reads higher. Always cross-reference model number.",
  },
  {
    brand: "Orbit",
    models: ["57253", "57100", "57101", "WaterMaster", "B-Hyve Valve"],
    ohm_min: 18,
    ohm_max: 55,
    ohm_nominal: 26,
    voltage_ac: 24,
    inrush_amps: 0.42,
    holding_amps: 0.20,
    notes: "Budget-tier solenoid. Higher failure rate on inrush. If reading is borderline (50-55Ω), recommend proactive replacement.",
  },
  {
    brand: "Richdell",
    models: ["200", "205", "311", "R211", "R212"],
    ohm_min: 25,
    ohm_max: 70,
    ohm_nominal: 35,
    voltage_ac: 24,
    inrush_amps: 0.35,
    holding_amps: 0.16,
    notes: "Older Richdell solenoids run high nominal. Units reading 60-70Ω may still function. Test by manual bleed first.",
  },
  {
    brand: "Irritrol",
    models: ["205T", "700", "721", "760", "761", "R201", "R221"],
    ohm_min: 20,
    ohm_max: 60,
    ohm_nominal: 26,
    voltage_ac: 24,
    inrush_amps: 0.39,
    holding_amps: 0.18,
    notes: "Irritrol solenoids are similar spec to Hunter/Rain Bird. Compatible with most 24VAC controllers.",
  },
  {
    brand: "Weathermatic",
    models: ["N-100", "N-200", "SLV", "M-100"],
    ohm_min: 20,
    ohm_max: 58,
    ohm_nominal: 25,
    voltage_ac: 24,
    inrush_amps: 0.40,
    holding_amps: 0.19,
    notes: "Weathermatic uses industry-standard solenoid specs. SLV series is compatible with SmartLine controllers.",
  },
  {
    brand: "K-Rain",
    models: ["3000", "6000", "RPS75", "RPS100"],
    ohm_min: 20,
    ohm_max: 60,
    ohm_nominal: 27,
    voltage_ac: 24,
    inrush_amps: 0.38,
    holding_amps: 0.18,
    notes: "K-Rain uses standard solenoid specs. Common in builder-grade systems. Diaphragm failure is more common than solenoid failure in this brand.",
  },
  {
    brand: "Buckner",
    models: ["30", "31", "32", "BV"],
    ohm_min: 22,
    ohm_max: 60,
    ohm_nominal: 28,
    voltage_ac: 24,
    inrush_amps: 0.37,
    holding_amps: 0.17,
    notes: "Older commercial brand. Parts availability limited. If solenoid fails, recommend full valve replacement.",
  },
  {
    brand: "Nelson",
    models: ["8500", "8600", "7645"],
    ohm_min: 20,
    ohm_max: 60,
    ohm_nominal: 26,
    voltage_ac: 24,
    inrush_amps: 0.39,
    holding_amps: 0.18,
    notes: "Nelson primarily used in agricultural and large turf applications. Standard 24VAC solenoid specs.",
  },
];

export function getSolenoidSpec(brand: string): SolenoidSpec | null {
  const normalized = brand.toLowerCase().trim();
  return (
    SOLENOID_DATABASE.find((s) =>
      s.brand.toLowerCase().includes(normalized) ||
      normalized.includes(s.brand.toLowerCase())
    ) ?? null
  );
}

export function interpretOhmReading(
  reading: number,
  spec: SolenoidSpec
): {
  status: "good" | "warning" | "fail";
  severity: "critical" | "moderate" | "mild" | "none";
  verdict: string;
  action: string;
} {
  if (reading < spec.ohm_min * 0.7) {
    return {
      status: "fail",
      severity: "critical",
      verdict: `${reading}Ω — Short circuit detected. Coil is shorted.`,
      action: "Replace solenoid immediately. Check for water intrusion in wire connections.",
    };
  }
  if (reading < spec.ohm_min) {
    return {
      status: "warning",
      severity: "moderate",
      verdict: `${reading}Ω — Below spec (min ${spec.ohm_min}Ω). Coil degrading.`,
      action: "Replace solenoid at next service visit. Monitor for intermittent operation.",
    };
  }
  if (reading > spec.ohm_max * 1.5) {
    return {
      status: "fail",
      severity: "critical",
      verdict: `${reading}Ω — Open circuit. Coil is broken or wire disconnected.`,
      action: "Check wire connections at solenoid first. If connections are good, replace solenoid.",
    };
  }
  if (reading > spec.ohm_max) {
    return {
      status: "warning",
      severity: "moderate",
      verdict: `${reading}Ω — Above spec (max ${spec.ohm_max}Ω). High resistance.`,
      action: "Inspect wire connections for corrosion. Replace solenoid if connections are clean.",
    };
  }
  return {
    status: "good",
    severity: "none",
    verdict: `${reading}Ω — Within spec (${spec.ohm_min}\u2013${spec.ohm_max}Ω). Solenoid is good.`,
    action: "No action needed. Investigate controller output or field wiring if zone still fails.",
  };
}
