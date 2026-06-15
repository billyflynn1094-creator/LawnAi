"use client";

import { useState } from "react";
import { Camera, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { CONTROLLER_DATABASE, type ControllerGuide as ControllerGuideType } from "@/lib/irrigation/controllers";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

const TASK_LABELS: Record<string, string> = {
  set_time:     "Set time / date",
  set_watering: "Set watering schedule",
  manual_run:   "Manual / test run",
  rain_delay:   "Rain delay",
};

function findControllerFromScan(brand: string, model?: string | null): ControllerGuideType | null {
  const b = brand.toLowerCase();
  const m = (model ?? "").toLowerCase();

  // Exact brand + model/alias match
  const exact = CONTROLLER_DATABASE.find(c =>
    c.brand.toLowerCase() === b &&
    (
      c.model.toLowerCase() === m ||
      c.aliases.some(a => a.toLowerCase() === m) ||
      (m.length > 2 && c.model.toLowerCase().includes(m)) ||
      (m.length > 2 && c.aliases.some(a => a.toLowerCase().includes(m)))
    )
  );
  if (exact) return exact;

  // Brand-only fallback — return first (most prominent) for that brand
  return CONTROLLER_DATABASE.find(c =>
    c.brand.toLowerCase() === b || c.brand.toLowerCase().includes(b)
  ) ?? null;
}

type ScanResult = DiagResult & { brand?: string; model?: string | null; confidence?: string };

export default function ControllerGuide() {
  const [scanning, setScanning]       = useState(false);
  const [scanResult, setScanResult]   = useState<ScanResult | null>(null);
  const [controller, setController]   = useState<ControllerGuideType | null>(null);
  const [selectedTask, setSelectedTask] = useState<keyof ControllerGuideType["programming"]>("set_time");
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const scanCamera = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setScanning(true);
      setScanResult(null);
      setController(null);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const res = await fetch("/api/irrigation-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "controller_id", image: base64 }),
          });
          const data = await res.json();
          const a = data.analysis;
          if (a) {
            setScanResult({
              brief: a.brief ?? `${a.brand ?? "Controller"} identified`,
              detail: a.detail ?? undefined,
              action: a.action ?? undefined,
              severity: "none" as const,
              brand: a.brand,
              model: a.model,
              confidence: a.confidence,
            });
            // Auto-load guide if brand is recognizable
            if (a.brand && a.brand !== "other" && a.brand !== "unknown") {
              const match = findControllerFromScan(a.brand, a.model);
              if (match) {
                setController(match);
                setSelectedTask("set_time");
                setExpandedStep(0);
              }
            }
          }
        } catch { /* silent */ } finally { setScanning(false); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const BRANDS = [...new Set(CONTROLLER_DATABASE.map(c => c.brand))];

  // ── GUIDE LOADED ──────────────────────────────────────────
  if (controller) {
    const steps = controller.programming[selectedTask] ?? [];
    return (
      <div className="space-y-5">

        {/* Identity bar */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-900/15 border border-emerald-700/30">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-emerald-200 text-sm font-semibold">{controller.brand} {controller.model}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {controller.zones_max} zones · {controller.type}
              {controller.wifi ? " · WiFi" : ""}
              {controller.two_wire ? " · Two-wire" : ""}
            </p>
          </div>
          <button
            onClick={() => { setController(null); setScanResult(null); }}
            className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
          >
            Change
          </button>
        </div>

        {/* Task selector */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">What do you need to do?</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TASK_LABELS) as Array<keyof typeof TASK_LABELS>).map(task => (
              <button key={task}
                onClick={() => {
                  setSelectedTask(task as keyof ControllerGuideType["programming"]);
                  setExpandedStep(0);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-left transition-all ${
                  selectedTask === task
                    ? "border-blue-500/60 bg-blue-900/25 text-blue-200"
                    : "border-white/10 bg-white/3 text-gray-400 hover:border-white/20 hover:text-gray-200"
                }`}
              >
                {TASK_LABELS[task]}
              </button>
            ))}
          </div>
        </div>

        {/* Steps accordion */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/3 hover:bg-white/6 text-left transition-colors"
              >
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
                  expandedStep === i ? "bg-blue-500/30 text-blue-300" : "bg-white/8 text-gray-400"
                }`}>
                  {step.step}
                </span>
                <span className="flex-1 text-sm text-white font-medium">{step.title}</span>
                {expandedStep === i
                  ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                }
              </button>
              {expandedStep === i && (
                <div className="px-4 py-3 border-t border-white/10 space-y-2">
                  <p className="text-sm text-gray-200 leading-relaxed">{step.instruction}</p>
                  {step.tip     && <p className="text-xs text-blue-400">💡 {step.tip}</p>}
                  {step.warning && <p className="text-xs text-amber-400">⚠️ {step.warning}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Scan again — small secondary */}
        <button
          onClick={scanCamera}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-gray-500 text-sm hover:border-blue-500/30 hover:text-blue-400 transition-all"
        >
          <Camera className="w-4 h-4" />
          Scan a different controller
        </button>
      </div>
    );
  }

  // ── HOME / SCAN ───────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* PRIMARY: Big camera scan */}
      <button
        onClick={scanCamera}
        disabled={scanning}
        className="w-full py-14 rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-900/10 hover:bg-blue-900/20 transition-all disabled:opacity-50 active:scale-[0.98]"
      >
        <Camera className="w-10 h-10 text-blue-400 mx-auto mb-3" />
        <p className="text-blue-200 font-semibold text-base">
          {scanning ? "Identifying controller…" : "Scan your controller"}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          AI identifies brand and model — guide loads automatically
        </p>
      </button>

      {/* Scan result when AI found something but no DB match */}
      {scanResult && !controller && (
        <div className="space-y-3">
          <CameraResult result={scanResult} title={scanResult.brand ?? "Scan result"} />
          <p className="text-gray-500 text-xs text-center">
            No exact guide found for this model — select your brand below
          </p>
        </div>
      )}

      {/* FALLBACK: Brand / model picker */}
      <div>
        <p className="text-gray-600 text-xs uppercase tracking-wide mb-3">Or select manually</p>
        <div className="space-y-3">
          {BRANDS.map(brand => {
            const models = CONTROLLER_DATABASE.filter(c => c.brand === brand);
            return (
              <div key={brand}>
                {models.length === 1 ? (
                  <button
                    onClick={() => { setController(models[0]); setSelectedTask("set_time"); setExpandedStep(0); }}
                    className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-white/10 bg-white/3 hover:border-blue-500/40 hover:bg-blue-900/10 text-left transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{brand}</p>
                      <p className="text-gray-500 text-xs">{models[0].model} · {models[0].zones_max} zones</p>
                    </div>
                    <span className="text-gray-600 text-xs">→</span>
                  </button>
                ) : (
                  <div>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide px-1 mb-1.5">{brand}</p>
                    <div className="space-y-1.5">
                      {models.map(m => (
                        <button
                          key={m.model}
                          onClick={() => { setController(m); setSelectedTask("set_time"); setExpandedStep(0); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 hover:border-blue-500/40 hover:bg-blue-900/10 text-left transition-all"
                        >
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{m.model}</p>
                            <p className="text-gray-500 text-xs">{m.zones_max} zones{m.wifi ? " · WiFi" : ""}{m.two_wire ? " · Two-wire" : ""}</p>
                          </div>
                          <span className="text-gray-600 text-xs">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
