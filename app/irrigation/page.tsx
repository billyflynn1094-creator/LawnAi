"use client";

import { useState } from "react";
import { Droplets, ArrowLeft } from "lucide-react";
import ControllerGuide from "@/components/irrigation/ControllerGuide";
import AuditReport from "@/components/irrigation/AuditReport";
import ElectricalDiag from "@/components/irrigation/ElectricalDiag";
import HydraulicDiag from "@/components/irrigation/HydraulicDiag";
import RainSensorDiag from "@/components/irrigation/RainSensorDiag";
import ZoneAssessment from "@/components/irrigation/ZoneAssessment";
import DesignScan from "@/components/irrigation/DesignScan";

type Screen =
  | "home"
  | "broken"
  | "audit"
  | "electrical"
  | "hydraulic"
  | "rain_sensor"
  | "design"
  | "controller"
  | "zones"
  | "audit_report";

const SYMPTOMS = [
  { id: "zone_not_on",   label: "Zone not coming on",      desc: "A zone won't activate",                  icon: "🔌", screen: "electrical" as Screen, preset: "zone_not_on" },
  { id: "zone_stuck",    label: "Zone stuck on",           desc: "Won't shut off after cycle",              icon: "🚰", screen: "electrical" as Screen, preset: "zone_stuck_on" },
  { id: "low_pressure",  label: "Low pressure / weak spray", desc: "Heads not popping or poor arc",         icon: "📉", screen: "hydraulic" as Screen, preset: "low_pressure" },
  { id: "misting",       label: "Head misting / fogging",  desc: "Fine mist instead of clean spray",        icon: "💨", screen: "hydraulic" as Screen, preset: "high_pressure" },
  { id: "controller",   label: "Controller not working",  desc: "Programming or display issue",             icon: "🎛️", screen: "controller" as Screen },
  { id: "coverage",     label: "Dry spots / coverage gap", desc: "Brown patches or uneven watering",        icon: "🌱", screen: "design" as Screen },
  { id: "rain",         label: "Running after rain",       desc: "System ignoring rain sensor",             icon: "🌧️", screen: "rain_sensor" as Screen },
  { id: "schedule",     label: "Optimize watering schedule", desc: "Set runtimes by zone type",            icon: "📊", screen: "zones" as Screen },
];

const AUDIT_STEPS = [
  { id: "controller", label: "Scan controller",     desc: "Identify make, model, zone count",          icon: "🎛️", screen: "controller" as Screen },
  { id: "zones",      label: "Zone assessment",      desc: "Enter zone types and count",                icon: "📊", screen: "zones" as Screen },
  { id: "design",     label: "Scan zone heads",      desc: "Camera scan of head placement per zone",   icon: "📷", screen: "design" as Screen },
  { id: "rain",       label: "Rain sensor check",    desc: "Location and effectiveness assessment",     icon: "🌧️", screen: "rain_sensor" as Screen },
  { id: "report",     label: "Audit report",         desc: "View findings and export",                  icon: "📋", screen: "audit_report" as Screen },
];

const SCREEN_LABELS: Record<Screen, string> = {
  home: "Home",
  broken: "Diagnose",
  audit: "Inspection",
  electrical: "Electrical",
  hydraulic: "Hydraulic",
  rain_sensor: "Rain Sensor",
  design: "Design Scan",
  controller: "Controller Guide",
  zones: "Zone Assessment",
  audit_report: "Audit Report",
};

export default function IrrigationPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [electricalPreset, setElectricalPreset] = useState("");
  const [hydraulicPreset, setHydraulicPreset] = useState("");
  const [seniorMode, setSeniorMode] = useState(false);
  const [auditStep, setAuditStep] = useState(0);

  const nav = (s: Screen, preset?: string) => {
    if (s === "electrical" && preset) setElectricalPreset(preset);
    if (s === "hydraulic" && preset) setHydraulicPreset(preset);
    setScreen(s);
  };

  const back = () => {
    if (screen === "broken" || screen === "audit") setScreen("home");
    else setScreen("home");
  };

  // ── HOME ───────────────────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold tracking-tight">IrrigationPro</span>
            </div>
            <button
              onClick={() => setSeniorMode(!seniorMode)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                seniorMode
                  ? "border-purple-500 bg-purple-900/30 text-purple-300"
                  : "border-white/10 text-gray-600 hover:text-gray-400"
              }`}
            >
              Sr. Tech
            </button>
          </div>
        </header>

        <main className="px-4 max-w-lg mx-auto pb-10">
          <p className="text-gray-500 text-sm mb-6 text-center">What brings you here?</p>

          <div className="space-y-3">
            <button
              onClick={() => setScreen("broken")}
              className="w-full p-5 rounded-2xl border border-red-700/50 bg-red-900/10 hover:bg-red-900/20 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🔴</span>
                <div>
                  <p className="text-white font-semibold">Something&apos;s broken</p>
                  <p className="text-red-300/70 text-sm mt-0.5">Diagnose a specific problem</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setAuditStep(0); setScreen("audit"); }}
              className="w-full p-5 rounded-2xl border border-blue-700/50 bg-blue-900/10 hover:bg-blue-900/20 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">📋</span>
                <div>
                  <p className="text-white font-semibold">Full inspection</p>
                  <p className="text-blue-300/70 text-sm mt-0.5">Systematic site walkthrough</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6">
            <p className="text-gray-600 text-xs uppercase tracking-wide mb-3">Quick access</p>
            <button
              onClick={() => nav("controller")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-white/3 hover:border-purple-500/40 hover:bg-purple-900/10 transition-all text-left"
            >
              <span className="text-xl">🎛️</span>
              <div>
                <p className="text-white text-sm font-medium">Controller Guide</p>
                <p className="text-gray-500 text-xs">Program any controller, step by step</p>
              </div>
            </button>
          </div>

          {seniorMode && (
            <div className="mt-3">
              <button
                onClick={() => nav("electrical", "two_wire")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-purple-700/40 bg-purple-900/10 hover:bg-purple-900/20 transition-all text-left"
              >
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Two-Wire Decoder Diag</p>
                  <p className="text-purple-400/60 text-xs">Senior tech mode</p>
                </div>
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── BROKEN: symptom picker ─────────────────────────────────────────────────
  if (screen === "broken") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
        <header className="px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setScreen("home")} className="text-blue-400 hover:text-blue-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <p className="text-white font-semibold">What&apos;s the problem?</p>
          </div>
        </header>
        <main className="px-4 max-w-lg mx-auto pb-8 space-y-2.5">
          {SYMPTOMS.map(s => (
            <button
              key={s.id}
              onClick={() => nav(s.screen, s.preset)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/3 hover:border-blue-500/40 hover:bg-blue-900/10 text-left transition-all"
            >
              <span className="text-2xl w-8 text-center flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{s.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
              </div>
            </button>
          ))}
        </main>
      </div>
    );
  }

  // ── AUDIT: sequential steps ────────────────────────────────────────────────
  if (screen === "audit") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
        <header className="px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setScreen("home")} className="text-blue-400 hover:text-blue-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <p className="text-white font-semibold">Full Inspection</p>
          </div>
        </header>
        <main className="px-4 max-w-lg mx-auto pb-8">
          <div className="flex gap-1.5 mb-6">
            {AUDIT_STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < auditStep ? "bg-emerald-500" : i === auditStep ? "bg-blue-500" : "bg-white/10"}`} />
            ))}
          </div>

          <div className="space-y-2.5">
            {AUDIT_STEPS.map((step, i) => {
              const status = i < auditStep ? "done" : i === auditStep ? "current" : "upcoming";
              return (
                <button
                  key={step.id}
                  onClick={() => { if (status !== "upcoming") nav(step.screen); }}
                  disabled={status === "upcoming"}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    status === "current" ? "border-blue-500/60 bg-blue-900/20 hover:bg-blue-900/30" :
                    status === "done" ? "border-emerald-700/40 bg-emerald-900/10" :
                    "border-white/5 bg-white/2 opacity-40"
                  }`}
                >
                  <span className="text-2xl w-8 text-center flex-shrink-0">{status === "done" ? "✅" : step.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${status === "upcoming" ? "text-gray-600" : "text-white"}`}>{step.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                  </div>
                  {status === "current" && (
                    <span className="text-xs text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full flex-shrink-0">Start</span>
                  )}
                </button>
              );
            })}
          </div>

          {auditStep < AUDIT_STEPS.length && (
            <button
              onClick={() => setAuditStep(s => Math.min(s + 1, AUDIT_STEPS.length - 1))}
              className="w-full mt-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-all"
            >
              Mark step complete →
            </button>
          )}
        </main>
      </div>
    );
  }

  // ── SPECIFIC SCREEN ────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (screen) {
      case "electrical":   return <ElectricalDiag preset={electricalPreset} seniorMode={seniorMode} />;
      case "hydraulic":    return <HydraulicDiag preset={hydraulicPreset} />;
      case "rain_sensor":  return <RainSensorDiag />;
      case "design":       return <DesignScan />;
      case "controller":   return <ControllerGuide />;
      case "zones":        return <ZoneAssessment />;
      case "audit_report": return <AuditReport onNewAudit={() => setScreen("audit")} />;
      default:             return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
      <header className="sticky top-0 z-10 bg-[#05111f]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={back} className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-white font-semibold text-sm">{SCREEN_LABELS[screen]}</p>
        </div>
      </header>
      <main className="px-4 max-w-lg mx-auto py-5 pb-10">
        {renderContent()}
      </main>
    </div>
  );
}
