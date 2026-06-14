"use client";

import { useState, useCallback } from "react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

const SYMPTOM_OPTIONS = [
  { value: "low_pressure", label: "Low pressure — heads not popping or weak spray" },
  { value: "high_pressure", label: "High pressure — heads misting or fogging" },
  { value: "broken_head", label: "Broken head — water shooting up uncontrolled" },
  { value: "clogged_nozzle", label: "Clogged nozzle — restricted or no spray pattern" },
  { value: "valve_not_closing", label: "Valve not closing — zone draining after shutoff" },
  { value: "backflow_issue", label: "Backflow device — reduced system pressure" },
];

interface Props {
  preset?: string;
}

export default function HydraulicDiag({ preset = "" }: Props) {
  const [symptom, setSymptom] = useState(preset || "low_pressure");
  const [loading, setLoading] = useState(false);
  const [mainResult, setMainResult] = useState<DiagResult | null>(null);
  const [steps, setSteps] = useState<DiagResult[]>([]);

  const diagnose = useCallback(async () => {
    setLoading(true);
    setMainResult(null);
    setSteps([]);
    try {
      const res = await fetch("/api/irrigation-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "hydraulic_diagnosis", symptom }),
      });
      const data = await res.json();
      const a = data.analysis;
      if (a?.diagnosis) setMainResult(a.diagnosis as DiagResult);
      if (a?.steps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSteps((a.steps as any[]).map(s => ({
          brief: s.title ? `${s.title}: ${s.brief ?? ""}` : (s.brief ?? ""),
          detail: [s.detail ?? "", s.instruction ? `How: ${s.instruction}` : "", s.expected_fail ? `If fail: ${s.expected_fail}` : "", s.tool_needed && s.tool_needed !== "none" ? `Tool: ${s.tool_needed}` : ""].filter(Boolean).join("\n\n"),
          action: s.expected_pass ?? undefined,
          severity: (s.severity as DiagResult["severity"]) ?? "mild",
        })));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [symptom]);

  return (
    <div className="space-y-5">
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1.5">Hydraulic symptom</label>
        <select value={symptom} onChange={e => setSymptom(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50">
          {SYMPTOM_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-[#0a1f35]">{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-xl p-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pressure reference</p>
        <p className="text-xs text-gray-400">Static: 50-80 PSI · Spray zones: 30-45 PSI · Rotor zones: 35-50 PSI · Drip: 15-30 PSI</p>
      </div>

      <button onClick={diagnose} disabled={loading}
        className="w-full py-3.5 rounded-xl bg-blue-600/30 border border-blue-600/50 text-blue-200 font-medium text-sm hover:bg-blue-600/40 transition-colors disabled:opacity-40">
        {loading ? "Analyzing…" : "Run Diagnosis"}
      </button>

      {mainResult && (
        <div className="space-y-3">
          <CameraResult result={mainResult} title="Primary finding" />
          {steps.length > 0 && (
            <>
              <p className="text-gray-500 text-xs uppercase tracking-wide pt-1">Diagnostic steps</p>
              {steps.map((step, i) => <CameraResult key={i} result={step} title={`Step ${i + 1}`} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
