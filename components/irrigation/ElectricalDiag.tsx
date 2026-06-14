"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronUp, Clock, Wrench } from "lucide-react";
import { SOLENOID_DATABASE, interpretOhmReading } from "@/lib/irrigation/solenoids";

type Symptom = "stuck_on" | "not_coming_on" | "intermittent" | "short_circuit";

interface DiagStep {
  step: number;
  title: string;
  instruction: string;
  tool_needed: string | null;
  meter_setting: string | null;
  expected_result: string;
  if_pass: string;
  if_fail: string;
  why: string;
  time_estimate: string;
}

interface DiagResult {
  diagnosis: {
    most_likely_cause: string;
    confidence: "high" | "medium" | "low";
    severity: "critical" | "moderate" | "mild";
    triage: string;
  };
  steps: DiagStep[];
  parts_needed: string[];
  estimated_repair_time: string;
  cost_reality: string;
  homeowner_explanation: string;
}

const SYMPTOMS: { id: Symptom; label: string; desc: string; triage: string }[] = [
  { id: "stuck_on", label: "Zone Stuck ON", desc: "Zone will not shut off after cycle", triage: "🔴" },
  { id: "not_coming_on", label: "Zone Not Coming On", desc: "Zone will not activate from controller", triage: "🔴" },
  { id: "intermittent", label: "Intermittent Issue", desc: "Zone works sometimes, fails other times", triage: "🟡" },
  { id: "short_circuit", label: "Short Circuit / Error", desc: "Controller shows Short, Open, or Fault", triage: "🔴" },
];

export default function ElectricalDiag() {
  const [symptom, setSymptom] = useState<Symptom | null>(null);
  const [ohmReading, setOhmReading] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [ohmVerdict, setOhmVerdict] = useState<ReturnType<typeof interpretOhmReading> | null>(null);

  const handleOhmChange = (val: string) => {
    setOhmReading(val);
    const num = parseFloat(val);
    if (!isNaN(num) && brand) {
      const spec = SOLENOID_DATABASE.find(s => s.brand.toLowerCase() === brand.toLowerCase());
      if (spec) setOhmVerdict(interpretOhmReading(num, spec));
    }
  };

  const runDiagnosis = async () => {
    if (!symptom) return;
    setLoading(true);
    try {
      const res = await fetch("/api/irrigation-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "electrical_diagnosis",
          symptom,
          ohmReading: ohmReading ? parseFloat(ohmReading) : undefined,
          brand: brand || undefined,
        }),
      });
      const data = await res.json();
      setResult(data.analysis);
      setExpandedStep(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s: string) => {
    if (s === "critical") return "text-red-400 border-red-700/50 bg-red-900/10";
    if (s === "moderate") return "text-amber-400 border-amber-700/50 bg-amber-900/10";
    return "text-emerald-400 border-emerald-700/50 bg-emerald-900/10";
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-water-300 text-sm font-medium mb-3 uppercase tracking-wide">Select Symptom</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SYMPTOMS.map(s => (
            <button
              key={s.id}
              onClick={() => setSymptom(s.id)}
              className={`text-left p-3 rounded-lg border transition-all ${
                symptom === s.id
                  ? "border-amber-500 bg-amber-900/20 text-white"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-white/30"
              }`}
            >
              <span className="text-base mr-2">{s.triage}</span>
              <span className="font-medium text-sm">{s.label}</span>
              <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Ohm Reading (optional)</label>
          <input
            type="number"
            value={ohmReading}
            onChange={e => handleOhmChange(e.target.value)}
            placeholder="e.g. 44"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          />
          {ohmVerdict && (
            <p className={`text-xs mt-1 ${ohmVerdict.severity === "none" ? "text-emerald-400" : "text-red-400"}`}>
              {ohmVerdict.verdict}
            </p>
          )}
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Valve Brand (optional)</label>
          <select
            value={brand}
            onChange={e => setBrand(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Unknown / Not sure</option>
            {SOLENOID_DATABASE.map(s => (
              <option key={s.brand} value={s.brand}>{s.brand}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={runDiagnosis}
        disabled={!symptom || loading}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Diagnosing…
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Run Electrical Diagnosis
          </>
        )}
      </button>

      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className={`p-4 rounded-xl border ${severityColor(result.diagnosis.severity)}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{result.diagnosis.triage}</span>
              <span className="font-bold text-white">{result.diagnosis.most_likely_cause}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/10">{result.diagnosis.confidence} confidence</span>
            </div>
            <p className="text-sm text-gray-300">{result.homeowner_explanation}</p>
          </div>

          <div>
            <p className="text-water-300 text-xs uppercase tracking-wide mb-2 font-medium">Field Steps</p>
            <div className="space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white/5 hover:bg-white/8 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-bold flex-shrink-0">{step.step}</span>
                    <span className="font-medium text-sm text-white flex-1">{step.title}</span>
                    <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500 flex-shrink-0">{step.time_estimate}</span>
                    {expandedStep === i ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expandedStep === i && (
                    <div className="px-4 pb-4 pt-2 space-y-3 bg-white/3">
                      <p className="text-sm text-gray-200">{step.instruction}</p>
                      {step.tool_needed && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Wrench className="w-3 h-3" />
                          <span>Tool: <span className="text-amber-300">{step.tool_needed}</span></span>
                          {step.meter_setting && <span className="ml-2">Setting: <span className="text-amber-300">{step.meter_setting}</span></span>}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-2">
                          <p className="text-emerald-400 font-medium mb-0.5">Expected</p>
                          <p className="text-gray-300">{step.expected_result}</p>
                        </div>
                        <div className="bg-white/3 border border-white/10 rounded-lg p-2">
                          <p className="text-gray-400 font-medium mb-0.5">Pass: {step.if_pass}</p>
                          <p className="text-red-400/80 mt-1">Fail: {step.if_fail}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 italic">{step.why}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {result.parts_needed?.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">Parts Likely Needed</p>
              <ul className="space-y-1">
                {result.parts_needed.map((p, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span>{p}</li>)}
              </ul>
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
                <span>Est. repair time: <span className="text-white">{result.estimated_repair_time}</span></span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{result.cost_reality}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
