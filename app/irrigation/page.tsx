"use client";

import { useState, useRef } from "react";
import { Droplets, ArrowLeft, Camera, Upload } from "lucide-react";
import ControllerGuide from "@/components/irrigation/ControllerGuide";
import AuditReport from "@/components/irrigation/AuditReport";
import ElectricalDiag from "@/components/irrigation/ElectricalDiag";
import HydraulicDiag from "@/components/irrigation/HydraulicDiag";
import RainSensorDiag from "@/components/irrigation/RainSensorDiag";
import ZoneAssessment from "@/components/irrigation/ZoneAssessment";
import DesignScan from "@/components/irrigation/DesignScan";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

type Screen =
  | "home" | "broken" | "audit"
  | "electrical" | "hydraulic" | "rain_sensor"
  | "design" | "controller" | "zones" | "audit_report";

const BROKEN_SYMPTOMS = [
  { id: "zone_not_on",  label: "Zone not coming on",        desc: "Won't activate",                  icon: "🔌", screen: "electrical" as Screen, preset: "zone_not_on" },
  { id: "zone_stuck",   label: "Zone stuck on",             desc: "Won't shut off after cycle",       icon: "🚰", screen: "electrical" as Screen, preset: "zone_stuck_on" },
  { id: "low_pressure", label: "Low pressure / weak spray", desc: "Heads not popping or poor arc",    icon: "📉", screen: "hydraulic" as Screen,  preset: "low_pressure" },
  { id: "misting",      label: "Head misting / fogging",    desc: "Fine mist instead of clean spray", icon: "💨", screen: "hydraulic" as Screen,  preset: "high_pressure" },
  { id: "controller",  label: "Controller not working",    desc: "Programming or display issue",      icon: "🎛️", screen: "controller" as Screen },
  { id: "coverage",    label: "Dry spots / coverage gap",   desc: "Brown patches or uneven watering", icon: "🌱", screen: "design" as Screen },
  { id: "rain",        label: "Running after rain",         desc: "System ignoring rain sensor",       icon: "🌧️", screen: "rain_sensor" as Screen },
  { id: "schedule",    label: "Optimize watering schedule", desc: "Set runtimes by zone type",        icon: "📊", screen: "zones" as Screen },
];

const AUDIT_STEPS = [
  { id: "controller", label: "Scan controller",  desc: "Identify make, model, zone count",        icon: "🎛️", screen: "controller" as Screen },
  { id: "zones",      label: "Zone assessment",   desc: "Enter zone types and count",              icon: "📊", screen: "zones" as Screen },
  { id: "design",     label: "Scan zone heads",   desc: "Camera scan of head placement per zone", icon: "📷", screen: "design" as Screen },
  { id: "rain",       label: "Rain sensor check", desc: "Location and effectiveness assessment",  icon: "🌧️", screen: "rain_sensor" as Screen },
  { id: "report",     label: "Audit report",      desc: "View findings and export",               icon: "📋", screen: "audit_report" as Screen },
];

const SCREEN_LABELS: Record<Screen, string> = {
  home: "Home", broken: "Diagnose", audit: "Inspection",
  electrical: "Electrical", hydraulic: "Hydraulic", rain_sensor: "Rain Sensor",
  design: "Design Scan", controller: "Controller Guide", zones: "Zone Assessment", audit_report: "Audit Report",
};

type SmartScanResult = {
  brief: string; detail?: string; action?: string;
  severity: DiagResult["severity"];
  suggested_diagnostic?: string;
  brand?: string; model?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additional_findings?: any[];
};

export default function IrrigationPage() {
  const [screen, setScreen]               = useState<Screen>("home");
  const [electricalPreset, setElectricalPreset] = useState("");
  const [hydraulicPreset, setHydraulicPreset]   = useState("");
  const [seniorMode, setSeniorMode]       = useState(false);
  const [auditStep, setAuditStep]         = useState(0);
  const [scanning, setScanning]           = useState(false);
  const [smartResult, setSmartResult]     = useState<SmartScanResult | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [smartFindings, setSmartFindings] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = (s: Screen, preset?: string) => {
    if (s === "electrical" && preset) setElectricalPreset(preset);
    if (s === "hydraulic"  && preset) setHydraulicPreset(preset);
    setScreen(s);
  };

  const back = () => setScreen("home");

  const openInput = (useCamera: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (useCamera) input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setScanning(true);
      setSmartResult(null);
      setSmartFindings([]);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const res = await fetch("/api/irrigation-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "smart_scan", image: base64 }),
          });
          const data = await res.json();
          const a = data.analysis;
          if (a && !a.error) {
            setSmartResult({
              brief: a.brief ?? "Scan complete",
              detail: a.detail ?? undefined,
              action: a.action ?? undefined,
              severity: (a.severity as DiagResult["severity"]) ?? "mild",
              suggested_diagnostic: a.suggested_diagnostic,
              brand: a.brand,
              model: a.model,
            });
            setSmartFindings(a.additional_findings ?? []);
          } else {
            setSmartResult({
              brief: "Couldn't analyze this image",
              detail: data.error ?? "Try better lighting, get closer to the component, or upload a photo from your gallery.",
              action: "Try again or choose a path below",
              severity: "moderate",
            });
          }
        } catch (err) {
          setSmartResult({
            brief: "Scan failed — " + (err instanceof Error ? err.message : "Network error"),
            detail: "Check your connection or upload a saved photo instead.",
            severity: "moderate",
          });
        } finally { setScanning(false); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const DIAG_ROUTES: Record<string, { screen: Screen; preset?: string }> = {
    electrical:  { screen: "electrical" },
    hydraulic:   { screen: "hydraulic" },
    rain_sensor: { screen: "rain_sensor" },
    design:      { screen: "design" },
    controller:  { screen: "controller" },
    zones:       { screen: "zones" },
  };

  // HOME
  if (screen === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
        <header className="px-4 pt-6 pb-2">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold tracking-tight">IrrigationPro</span>
            </div>
            <button onClick={() => setSeniorMode(!seniorMode)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                seniorMode ? "border-purple-500 bg-purple-900/30 text-purple-300" : "border-white/10 text-gray-600 hover:text-gray-400"
              }`}>
              Sr. Tech
            </button>
          </div>
        </header>

        <main className="px-4 max-w-lg mx-auto pb-10">
          {/* PRIMARY: Camera + upload */}
          <div className="mt-6 mb-5 space-y-2">
            <button onClick={() => openInput(true)} disabled={scanning}
              className="w-full py-12 rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-900/10 hover:bg-blue-900/20 transition-all disabled:opacity-50 active:scale-[0.98]">
              <Camera className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-blue-200 font-semibold text-base">{scanning ? "Analyzing…" : "Take a photo"}</p>
              <p className="text-gray-500 text-sm mt-1">Point at the controller, head, valve, or any component</p>
            </button>
            {!scanning && (
              <button onClick={() => openInput(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-blue-500/30 hover:bg-blue-900/8 text-gray-400 hover:text-blue-300 text-sm transition-all">
                <Upload className="w-4 h-4" />
                Upload from gallery
              </button>
            )}
          </div>

          {/* Smart scan result */}
          {smartResult && (
            <div className="space-y-3 mb-5">
              <CameraResult result={smartResult} title={smartResult.brand && smartResult.brand !== "unknown" ? smartResult.brand : "AI found"} />
              {smartFindings.map((f, i) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <CameraResult key={i} result={{ brief: (f as any).brief ?? "", detail: (f as any).detail, action: (f as any).action, severity: (f as any).severity ?? "mild" }} />
              ))}
              {smartResult.suggested_diagnostic && smartResult.suggested_diagnostic !== "none" && DIAG_ROUTES[smartResult.suggested_diagnostic] && (
                <button onClick={() => nav(DIAG_ROUTES[smartResult.suggested_diagnostic!].screen, DIAG_ROUTES[smartResult.suggested_diagnostic!].preset)}
                  className="w-full py-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-sm font-medium hover:bg-blue-600/30 transition-colors">
                  Continue: {SCREEN_LABELS[DIAG_ROUTES[smartResult.suggested_diagnostic].screen]} →
                </button>
              )}
            </div>
          )}

          {/* SECONDARY paths */}
          <p className="text-gray-600 text-xs uppercase tracking-wide mb-3">{smartResult ? "Or start fresh with" : "Or choose a path"}</p>
          <div className="space-y-2.5">
            <button onClick={() => setScreen("broken")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-red-700/40 bg-red-900/8 hover:bg-red-900/15 text-left transition-all">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="text-white text-sm font-semibold">Something&apos;s broken</p>
                <p className="text-red-300/60 text-xs">Pick the symptom, run diagnosis</p>
              </div>
            </button>
            <button onClick={() => { setAuditStep(0); setScreen("audit"); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-blue-700/40 bg-blue-900/8 hover:bg-blue-900/15 text-left transition-all">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-white text-sm font-semibold">Full inspection</p>
                <p className="text-blue-300/60 text-xs">Systematic camera walkthrough</p>
              </div>
            </button>
            <button onClick={() => nav("controller")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/3 hover:border-purple-500/40 hover:bg-purple-900/10 text-left transition-all">
              <span className="text-2xl">🎛️</span>
              <div>
                <p className="text-white text-sm font-medium">Controller Guide</p>
                <p className="text-gray-500 text-xs">Program any controller, step by step</p>
              </div>
            </button>
            {seniorMode && (
              <button onClick={() => nav("electrical", "two_wire")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-purple-700/40 bg-purple-900/10 hover:bg-purple-900/20 text-left transition-all">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="text-purple-200 text-sm font-medium">Two-Wire Decoder Diag</p>
                  <p className="text-purple-400/60 text-xs">Senior tech mode</p>
                </div>
              </button>
            )}
          </div>
        </main>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" />
      </div>
    );
  }

  // BROKEN
  if (screen === "broken") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
        <header className="px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={back} className="text-blue-400 hover:text-blue-300 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <p className="text-white font-semibold">What&apos;s the problem?</p>
          </div>
        </header>
        <main className="px-4 max-w-lg mx-auto pb-8 space-y-2.5">
          {BROKEN_SYMPTOMS.map(s => (
            <button key={s.id} onClick={() => nav(s.screen, s.preset)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/3 hover:border-blue-500/40 hover:bg-blue-900/10 text-left transition-all">
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

  // AUDIT
  if (screen === "audit") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
        <header className="px-4 pt-6 pb-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={back} className="text-blue-400 hover:text-blue-300 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
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
                <button key={step.id}
                  onClick={() => { if (status !== "upcoming") nav(step.screen); }}
                  disabled={status === "upcoming"}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    status === "current" ? "border-blue-500/60 bg-blue-900/20 hover:bg-blue-900/30" :
                    status === "done"    ? "border-emerald-700/40 bg-emerald-900/10" : "border-white/5 opacity-40"
                  }`}>
                  <span className="text-2xl w-8 text-center flex-shrink-0">{status === "done" ? "✅" : step.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${status === "upcoming" ? "text-gray-600" : "text-white"}`}>{step.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                  </div>
                  {status === "current" && <span className="text-xs text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full flex-shrink-0">Start</span>}
                </button>
              );
            })}
          </div>
          {auditStep < AUDIT_STEPS.length && (
            <button onClick={() => setAuditStep(s => Math.min(s + 1, AUDIT_STEPS.length - 1))}
              className="w-full mt-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-all">
              Mark step complete →
            </button>
          )}
        </main>
      </div>
    );
  }

  // SPECIFIC SCREEN
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
          <button onClick={back} className="text-blue-400 hover:text-blue-300 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <p className="text-white font-semibold text-sm">{SCREEN_LABELS[screen]}</p>
        </div>
      </header>
      <main className="px-4 max-w-lg mx-auto py-5 pb-10">{renderContent()}</main>
    </div>
  );
}
