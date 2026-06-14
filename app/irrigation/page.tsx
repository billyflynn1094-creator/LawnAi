"use client";

import { useState } from "react";
import { Droplets, Camera, Zap, Gauge, CloudRain, ClipboardList, BookOpen, User, ArrowLeft, Cpu, Search } from "lucide-react";
import ElectricalDiag from "@/components/irrigation/ElectricalDiag";
import ControllerGuideComponent from "@/components/irrigation/ControllerGuide";
import HomeownerMode from "@/components/irrigation/HomeownerMode";
import AuditReport from "@/components/irrigation/AuditReport";
import type { AuditData } from "@/components/irrigation/AuditReport";

// ─── Types ────────────────────────────────────────────────────────────────────

type MainModule =
  | "quick_diagnosis"
  | "full_inspection"
  | "controller"
  | "electrical"
  | "hydraulic"
  | "rain_sensor"
  | "homeowner"
  | "report";

type QuickSymptom =
  | "valve_stuck"
  | "zone_not_on"
  | "low_pressure"
  | "controller_issue"
  | "coverage_problem"
  | "rain_sensor_issue";

// ─── Module config ────────────────────────────────────────────────────────────

const MODULES = [
  { id: "quick_diagnosis" as MainModule, icon: Search, label: "Quick Diagnosis", desc: "Jump to a specific problem", color: "text-red-400", accent: "border-red-700/50 bg-red-900/10 hover:border-red-600" },
  { id: "full_inspection" as MainModule, icon: ClipboardList, label: "Full Inspection", desc: "Guided top-to-bottom audit", color: "text-water-400", accent: "border-water-700/50 bg-water-900/10 hover:border-water-600" },
  { id: "controller" as MainModule, icon: Cpu, label: "Controller Guide", desc: "Program any controller", color: "text-purple-400", accent: "border-purple-700/50 bg-purple-900/10 hover:border-purple-600" },
  { id: "electrical" as MainModule, icon: Zap, label: "Electrical", desc: "Solenoid & wire diagnosis", color: "text-amber-400", accent: "border-amber-700/50 bg-amber-900/10 hover:border-amber-600" },
  { id: "hydraulic" as MainModule, icon: Gauge, label: "Hydraulic", desc: "Pressure & flow issues", color: "text-blue-400", accent: "border-blue-700/50 bg-blue-900/10 hover:border-blue-600" },
  { id: "rain_sensor" as MainModule, icon: CloudRain, label: "Rain Sensor", desc: "Location & effectiveness", color: "text-teal-400", accent: "border-teal-700/50 bg-teal-900/10 hover:border-teal-600" },
  { id: "homeowner" as MainModule, icon: User, label: "Homeowner Mode", desc: "Answer questions on-site", color: "text-emerald-400", accent: "border-emerald-700/50 bg-emerald-900/10 hover:border-emerald-600" },
  { id: "report" as MainModule, icon: BookOpen, label: "Audit Report", desc: "View & send service report", color: "text-straw-300", accent: "border-straw-500/30 bg-straw-900/10 hover:border-straw-400" },
];

const QUICK_SYMPTOMS: { id: QuickSymptom; label: string; module: MainModule; desc: string }[] = [
  { id: "valve_stuck", label: "🔴 Valve Stuck Open", module: "electrical", desc: "Zone won't shut off" },
  { id: "zone_not_on", label: "🔴 Zone Not Coming On", module: "electrical", desc: "Zone won't activate" },
  { id: "low_pressure", label: "🟡 Low Pressure", module: "hydraulic", desc: "Heads not popping or weak spray" },
  { id: "controller_issue", label: "🟡 Controller Problem", module: "controller", desc: "Timer not working or lost program" },
  { id: "coverage_problem", label: "🟡 Coverage Issue", module: "full_inspection", desc: "Dry spots or wet spots" },
  { id: "rain_sensor_issue", label: "🟢 Rain Sensor Check", module: "rain_sensor", desc: "System running after rain" },
];

// ─── Camera scan component (shared) ─────────────────────────────────────────

function CameraScan({
  mode,
  label,
  onResult,
}: {
  mode: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResult: (analysis: any) => void;
}) {
  const [scanning, setScanning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  const scan = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setScanning(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const res = await fetch("/api/irrigation-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, image: base64 }),
          });
          const data = await res.json();
          setResult(data.analysis);
          onResult(data.analysis);
        } catch (err) {
          console.error(err);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="space-y-3">
      <button
        onClick={scan}
        disabled={scanning}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-water-700/60 text-water-400 hover:border-water-500 hover:text-water-300 transition"
      >
        <Camera size={20} />
        <span className="font-medium">{scanning ? "Analyzing..." : label}</span>
      </button>

      {result && !result.parse_error && (
        <div className="space-y-2">
          {result.issues?.map((issue: { triage: string; issue: string; short_fix: string; cost_reality?: string }, i: number) => (
            <div
              key={i}
              className={`rounded-xl border p-3 space-y-1 ${
                issue.triage === "🔴" ? "border-red-700/50 bg-red-900/10" :
                issue.triage === "🟡" ? "border-amber-700/50 bg-amber-900/10" :
                "border-emerald-700/50 bg-emerald-900/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{issue.triage}</span>
                <span className="text-slate-200 text-sm font-medium">{issue.issue}</span>
              </div>
              <p className="text-slate-400 text-xs">{issue.short_fix}</p>
              {issue.cost_reality && (
                <p className="text-straw-300 text-xs">{issue.cost_reality}</p>
              )}
            </div>
          ))}
          {result.homeowner_summary && (
            <div className="rounded-xl bg-water-900/20 border border-water-800/40 p-3">
              <p className="text-xs text-water-400 mb-1">Homeowner summary</p>
              <p className="text-water-200 text-sm">{result.homeowner_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hydraulic Diagnosis ──────────────────────────────────────────────────────

function HydraulicDiag() {
  const [symptom, setSymptom] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const symptoms = [
    "Low pressure — heads not popping up",
    "High pressure — heads misting",
    "Uneven coverage — wet and dry spots",
    "Water hammer on shutdown",
    "Backflow preventer leaking",
    "Valve leaking around body",
    "Water pooling after zone shuts off",
  ];

  const diagnose = async () => {
    if (!symptom) return;
    setLoading(true);
    try {
      const res = await fetch("/api/irrigation-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "hydraulic", symptom }),
      });
      const data = await res.json();
      setResult(data.analysis);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Gauge className="text-blue-400" size={18} />
        <h2 className="text-water-100 font-medium">Hydraulic Diagnosis</h2>
      </div>

      {!result && (
        <div className="space-y-3">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Select symptom</p>
          <div className="space-y-2">
            {symptoms.map((s) => (
              <button
                key={s}
                onClick={() => setSymptom(s)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                  symptom === s
                    ? "border-blue-500 bg-blue-900/20 text-blue-200"
                    : "border-navy-600 bg-navy-800/60 text-slate-300 hover:border-blue-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={diagnose}
            disabled={!symptom || loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition"
          >
            {loading ? "Diagnosing..." : "Diagnose →"}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-blue-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Analyzing hydraulic issue...
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          <div className="rounded-xl bg-navy-800 border border-navy-600 p-3">
            <p className="text-water-200 font-medium text-sm">{result.diagnosis?.most_likely_cause}</p>
            <p className="text-slate-500 text-xs mt-0.5">{result.diagnosis?.triage} {result.diagnosis?.severity}</p>
          </div>
          {result.steps?.map((step: any, i: number) => (
            <div key={i} className="rounded-xl bg-navy-800/60 border border-navy-700 p-3 space-y-1">
              <p className="text-xs text-slate-500 font-mono">Step {step.step}</p>
              <p className="text-slate-200 text-sm font-medium">{step.title}</p>
              <p className="text-slate-400 text-sm">{step.instruction}</p>
              {step.tool_needed && <p className="text-xs text-amber-400">🔧 {step.tool_needed}</p>}
            </div>
          ))}
          {result.cost_reality && (
            <p className="text-straw-300 text-xs">{result.cost_reality}</p>
          )}
          <button onClick={() => { setResult(null); setSymptom(""); }}
            className="w-full py-2.5 rounded-xl border border-navy-600 text-slate-400 text-sm hover:bg-navy-800 transition">
            New Diagnosis
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Rain Sensor Assessment ────────────────────────────────────────────────────

function RainSensorAssessment() {
  const [result, setResult] = useState<any>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <CloudRain className="text-teal-400" size={18} />
        <h2 className="text-water-100 font-medium">Rain Sensor Assessment</h2>
      </div>
      <p className="text-slate-400 text-sm">Point camera at the rain sensor and its mounting location.</p>
      <CameraScan mode="rain_sensor" label="Scan Rain Sensor" onResult={setResult} />
      {result && !result.parse_error && (
        <div className="space-y-2">
          <div className={`rounded-xl border p-3 ${
            result.effectiveness_rating === "effective" ? "border-emerald-700/50 bg-emerald-900/10" :
            result.effectiveness_rating === "questionable" ? "border-amber-700/50 bg-amber-900/10" :
            "border-red-700/50 bg-red-900/10"
          }`}>
            <p className="text-slate-200 text-sm font-medium">{result.brand ?? "Sensor"} — {result.effectiveness_rating}</p>
            <p className="text-slate-400 text-xs mt-1">{result.placement_rating} placement · {result.sun_exposure} sun exposure</p>
          </div>
          {result.recommendation && (
            <p className="text-slate-300 text-sm px-1">{result.recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IrrigationPage() {
  const [activeModule, setActiveModule] = useState<MainModule | null>(null);

  const mockAudit: AuditData = {
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    zones: [
      { id: 1, type: "spray" }, { id: 2, type: "spray" },
      { id: 3, type: "rotor" }, { id: 4, type: "drip" },
    ],
    issues: [
      { severity: "critical", triage: "🔴", issue: "Zone 2 solenoid open circuit", short_fix: "Replace solenoid — Hunter PGV compatible", cost_reality: "$8-12 parts, 15 min labor" },
      { severity: "moderate", triage: "🟡", issue: "3 spray heads below grade in back lawn", short_fix: "Raise heads to flush with turf surface", cost_reality: "$15-25 per head raise, bundle with next visit" },
      { severity: "mild", triage: "🟢", issue: "Rain sensor mounted under eave overhang", short_fix: "Relocate to open sky exposure", cost_reality: "$35-50 relocation" },
    ],
    overall_rating: "fair",
    recommendations: ["Schedule zone 2 repair before next watering cycle", "Consider MP Rotator conversion on spray zones for 30% water savings"],
  };

  const renderModule = () => {
    switch (activeModule) {
      case "quick_diagnosis":
        return (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs uppercase tracking-wide">What's the issue?</p>
            {QUICK_SYMPTOMS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveModule(s.module)}
                className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-navy-800/60 border border-navy-700 hover:border-water-600 text-left transition"
              >
                <div className="flex-1">
                  <p className="text-slate-200 text-sm font-medium">{s.label}</p>
                  <p className="text-slate-500 text-xs">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        );
      case "full_inspection":
        return (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Scan each area</p>
            <CameraScan mode="design_assessment" label="Scan Zone / Head Layout" onResult={() => {}} />
            <CameraScan mode="valve_id" label="Scan Valve Box" onResult={() => {}} />
            <CameraScan mode="controller_id" label="Scan Controller" onResult={() => {}} />
            <button
              onClick={() => setActiveModule("report")}
              className="w-full py-3 rounded-xl bg-straw-500/20 border border-straw-500/40 text-straw-300 text-sm font-medium hover:bg-straw-500/30 transition"
            >
              Generate Report →
            </button>
          </div>
        );
      case "controller": return <ControllerGuideComponent />;
      case "electrical": return <ElectricalDiag />;
      case "hydraulic": return <HydraulicDiag />;
      case "rain_sensor": return <RainSensorAssessment />;
      case "homeowner": return <HomeownerMode systemContext="Residential irrigation system in service visit." />;
      case "report": return <AuditReport audit={mockAudit} onNewAudit={() => setActiveModule("full_inspection")} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05111f] to-[#0a1f35]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#05111f]/90 backdrop-blur-md border-b border-water-900/60">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {activeModule ? (
            <button
              onClick={() => setActiveModule(null)}
              className="flex items-center gap-1.5 text-water-400 hover:text-water-300 transition"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Droplets className="text-water-400" size={20} />
              <span className="font-display text-lg text-water-100 tracking-tight">
                Irrigation<span className="text-water-400">Pro</span>
              </span>
            </div>
          )}
          {activeModule && (
            <p className="text-water-200 text-sm font-medium">
              {MODULES.find((m) => m.id === activeModule)?.label}
            </p>
          )}
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-16">
        {!activeModule ? (
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">
              Field diagnostic tool for irrigation service technicians.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    className={`p-4 rounded-2xl border text-left transition ${mod.accent}`}
                  >
                    <Icon size={22} className={`${mod.color} mb-2`} />
                    <p className="text-slate-200 text-sm font-medium leading-tight">{mod.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-tight">{mod.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          renderModule()
        )}
      </div>
    </div>
  );
}
