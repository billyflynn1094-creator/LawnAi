"use client";

import { useState } from "react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

const ZONE_TYPES = [
  { id: "spray", label: "Spray zones", icon: "💦", desc: "Fixed spray heads — 4\" 6\" 12\" pop-ups", precip: "1.5-2.0 in/hr", default_min: 8 },
  { id: "rotor", label: "Rotor zones", icon: "🔄", desc: "Hunter PGP, Rain Bird 5000, Toro T5+", precip: "0.4-0.6 in/hr", default_min: 25 },
  { id: "mp_rotator", label: "MP Rotator zones", icon: "🌀", desc: "Hunter MP, Rain Bird R-VAN", precip: "0.4-0.5 in/hr", default_min: 30 },
  { id: "drip", label: "Drip zones", icon: "💧", desc: "Emitters, soaker hose, netafim", precip: "0.1-0.5 in/hr", default_min: 45 },
] as const;

type ZoneTypeId = (typeof ZONE_TYPES)[number]["id"];

export default function ZoneAssessment() {
  const [counts, setCounts] = useState<Record<ZoneTypeId, number>>({ spray: 0, rotor: 0, mp_rotator: 0, drip: 0 });
  const [loading, setLoading] = useState(false);
  const [schedResult, setSchedResult] = useState<DiagResult | null>(null);
  const [zoneResults, setZoneResults] = useState<Array<{ label: string; result: DiagResult }>>([]);

  const totalZones = Object.values(counts).reduce((a, b) => a + b, 0);

  const analyze = async () => {
    if (totalZones === 0) return;
    setLoading(true);
    setSchedResult(null);
    setZoneResults([]);
    try {
      const zones = (Object.entries(counts) as [ZoneTypeId, number][]).filter(([, c]) => c > 0).map(([type, count]) => ({ type, count }));
      const res = await fetch("/api/irrigation-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "zone_assessment", zones }),
      });
      const data = await res.json();
      const a = data.analysis;
      if (a?.scheduling_recommendation) {
        setSchedResult({ brief: a.scheduling_recommendation.brief ?? "", detail: a.scheduling_recommendation.detail ?? undefined, action: a.scheduling_recommendation.action ?? undefined, severity: a.mixed_head_warning ? "moderate" : "none" });
      }
      if (a?.zone_analysis) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setZoneResults((a.zone_analysis as any[]).map(z => ({ label: `${z.zone_type} zones`, result: { brief: `${z.recommended_runtime_min} min — ${z.brief ?? ""}`, detail: [z.detail ?? "", z.scheduling_note ?? ""].filter(Boolean).join("\n\n") || undefined, severity: "none" as DiagResult["severity"] } })));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-gray-400 text-sm">Enter the number of each zone type. AI will calculate runtimes based on precipitation rates and typical ET.</p>
      <div className="space-y-3">
        {ZONE_TYPES.map(z => (
          <div key={z.id} className="flex items-center gap-4 bg-white/3 border border-white/10 rounded-xl p-4">
            <span className="text-2xl flex-shrink-0">{z.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{z.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{z.desc}</p>
              <p className="text-gray-600 text-xs mt-0.5">~{z.precip} · default {z.default_min} min</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setCounts(c => ({ ...c, [z.id]: Math.max(0, (c[z.id] ?? 0) - 1) }))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center transition-all">−</button>
              <span className="text-white font-bold w-6 text-center">{counts[z.id] ?? 0}</span>
              <button onClick={() => setCounts(c => ({ ...c, [z.id]: (c[z.id] ?? 0) + 1 }))} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center transition-all">+</button>
            </div>
          </div>
        ))}
      </div>
      {totalZones > 0 && <div className="bg-blue-900/10 border border-blue-700/30 rounded-xl px-4 py-2.5 text-sm text-blue-300">{totalZones} zone{totalZones !== 1 ? "s" : ""} total</div>}
      <button onClick={analyze} disabled={loading || totalZones === 0}
        className="w-full py-3.5 rounded-xl bg-emerald-600/30 border border-emerald-600/50 text-emerald-200 font-medium text-sm hover:bg-emerald-600/40 transition-colors disabled:opacity-40">
        {loading ? "Calculating…" : "Get Runtime Recommendations"}
      </button>
      {schedResult && <CameraResult result={schedResult} title="Schedule recommendation" />}
      {zoneResults.map((z, i) => <CameraResult key={i} result={z.result} title={z.label} />)}
    </div>
  );
}
