"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";
import { SOLENOID_DATABASE, interpretOhmReading } from "@/lib/irrigation/solenoids";

const SYMPTOM_OPTIONS = [
  { value: "zone_not_on", label: "Zone not coming on — won't activate" },
  { value: "zone_stuck_on", label: "Zone stuck on — won't shut off" },
  { value: "intermittent", label: "Zone activates intermittently" },
  { value: "two_wire", label: "Two-wire path issue (senior tech)" },
];

interface Props {
  preset?: string;
  seniorMode?: boolean;
}

type OhmVerdict = ReturnType<typeof interpretOhmReading>;

export default function ElectricalDiag({ preset = "", seniorMode = false }: Props) {
  const [symptom, setSymptom] = useState(preset || "zone_not_on");
  const [ohmReading, setOhmReading] = useState("");
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(false);
  const [mainResult, setMainResult] = useState<DiagResult | null>(null);
  const [steps, setSteps] = useState<DiagResult[]>([]);
  const [ohmVerdict, setOhmVerdict] = useState<OhmVerdict | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const handleOhmChange = (val: string) => {
    setOhmReading(val);
    const num = parseFloat(val);
    if (!isNaN(num) && brand) {
      const spec = SOLENOID_DATABASE.find(s => s.brand.toLowerCase() === brand.toLowerCase());
      if (spec) setOhmVerdict(interpretOhmReading(num, spec));
      else setOhmVerdict(null);
    } else {
      setOhmVerdict(null);
    }
  };

  const handleBrandChange = (val: string) => {
    setBrand(val);
    const num = parseFloat(ohmReading);
    if (!isNaN(num) && val) {
      const spec = SOLENOID_DATABASE.find(s => s.brand.toLowerCase() === val.toLowerCase());
      if (spec) setOhmVerdict(interpretOhmReading(num, spec));
      else setOhmVerdict(null);
    } else {
      setOhmVerdict(null);
    }
  };

  const diagnose = useCallback(async () => {
    setLoading(true);
    setMainResult(null);
    setSteps([]);
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
        setExpandedStep(0);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [symptom, ohmReading, brand]);

  const visibleSymptoms = seniorMode ? SYMPTOM_OPTIONS : SYMPTOM_OPTIONS.filter(s => s.value !== "two_wire");

  return (
    <div className="space-y-5">
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1.5">Symptom</label>
        <select value={symptom} onChange={e => setSymptom(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50">
          {visibleSymptoms.map(s => <option key={s.value} value={s.value} className="bg-[#0a1f35]">{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1.5">
          Solenoid Ohm Reading <span className="text-gray-600 normal-case">(optional — multimeter on solenoid wires)</span>
        </label>
        <div className="flex gap-2">
          <input type="number" value={ohmReading} onChange={e => handleOhmChange(e.target.value)} placeholder="e.g. 44"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50" />
          <select value={brand} onChange={e => handleBrandChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50">
            <option value="" className="bg-[#0a1f35]">Brand</option>
            {SOLENOID_DATABASE.map(s => <option key={s.brand} value={s.brand} className="bg-[#0a1f35]">{s.brand}</option>)}
          </select>
        </div>
        {ohmVerdict && (
          <div className="mt-2">
            <CameraResult result={{ brief: ohmVerdict.verdict, detail: ohmVerdict.action, severity: ohmVerdict.severity }} />
          </div>
        )}
      </div>

      <button onClick={diagnose} disabled={loading}
        className="w-full py-3.5 rounded-xl bg-amber-600/30 border border-amber-600/50 text-amber-200 font-medium text-sm hover:bg-amber-600/40 transition-colors disabled:opacity-40">
        {loading ? "Analyzing…" : "Run Diagnosis"}
      </button>

      {mainResult && (
        <div className="space-y-3">
          <CameraResult result={mainResult} title="Primary finding" />
          {steps.length > 0 && (
            <>
              <p className="text-gray-500 text-xs uppercase tracking-wide pt-1">Step-by-step procedure</p>
              {steps.map((step, i) => (
                <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/3 hover:bg-white/5 text-left transition-colors">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-white font-medium truncate">{step.brief.split(":")[0]}</span>
                    {expandedStep === i ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                  </button>
                  {expandedStep === i && (
                    <div className="px-4 py-3 space-y-2 border-t border-white/10">
                      <p className="text-sm text-gray-200">{step.brief.includes(":") ? step.brief.split(":").slice(1).join(":").trim() : step.brief}</p>
                      {step.detail && <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">{step.detail}</p>}
                      {step.action && <p className="text-xs text-emerald-400 font-medium">&#x2713; {step.action}</p>}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
