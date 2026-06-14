"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

interface HeadFound { type: string; count: number; notes?: string; }

export default function DesignScan() {
  const [scanning, setScanning] = useState(false);
  const [headsFound, setHeadsFound] = useState<HeadFound[]>([]);
  const [issues, setIssues] = useState<DiagResult[]>([]);
  const [summary, setSummary] = useState("");
  const [mixed, setMixed] = useState(false);
  const [scanned, setScanned] = useState(false);

  const scan = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setScanning(true);
      setHeadsFound([]);
      setIssues([]);
      setSummary("");
      setMixed(false);
      setScanned(false);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const res = await fetch("/api/irrigation-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "design_assessment", image: base64 }),
          });
          const data = await res.json();
          const a = data.analysis;
          if (a) {
            setHeadsFound(a.heads_identified ?? []);
            setMixed(a.mixed_heads_on_zone ?? false);
            setSummary(a.overall_assessment ?? "");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setIssues((a.issues ?? []).map((issue: any) => ({ brief: issue.brief ?? "", detail: issue.detail ?? undefined, action: issue.action ?? undefined, severity: (issue.severity as DiagResult["severity"]) ?? "mild" })));
            setScanned(true);
          }
        } catch { /* silent */ } finally { setScanning(false); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-gray-300 text-sm">Point the camera at the zone area. Capture multiple heads in frame where possible.</p>
        <p className="text-xs text-gray-600">AI identifies head types, flags placement issues, and detects mixed-head problems.</p>
      </div>
      <button onClick={scan} disabled={scanning}
        className="w-full py-12 rounded-2xl border-2 border-dashed border-emerald-600/40 bg-emerald-900/10 hover:bg-emerald-900/20 transition-all disabled:opacity-40">
        <Camera className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <p className="text-emerald-300 text-sm font-medium">{scanning ? "Analyzing zone…" : scanned ? "Scan another zone" : "Scan zone area"}</p>
        <p className="text-gray-500 text-xs mt-1">Tap to open camera or photo library</p>
      </button>
      {headsFound.length > 0 && (
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Heads identified</p>
          <div className="flex flex-wrap gap-2">
            {headsFound.map((h, i) => <span key={i} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs text-white">{h.count}&times; {h.type}{h.notes ? ` (${h.notes})` : ""}</span>)}
          </div>
          {summary && <p className="text-sm text-gray-300 mt-3 leading-relaxed">{summary}</p>}
        </div>
      )}
      {mixed && (
        <CameraResult title="Mixed head warning" result={{ brief: "Mixed head types detected on this zone.", detail: "Mixing rotor heads and spray heads on the same zone is a fundamental design error. Spray heads apply water at 1.5-2.0 in/hr while rotors apply at 0.4-0.6 in/hr. Running them together means spray zones are over-watered while rotor areas are under-watered — you cannot create a schedule that optimizes for both.", action: "Separate rotor and spray heads onto dedicated zones. If rewiring is not feasible short-term, convert spray heads to MP Rotators to match precipitation rates.", severity: "critical" }} />
      )}
      {issues.length > 0 && (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">{issues.length} issue{issues.length !== 1 ? "s" : ""} found</p>
          {issues.map((issue, i) => <CameraResult key={i} result={issue} />)}
        </div>
      )}
      {scanned && !mixed && issues.length === 0 && (
        <CameraResult result={{ brief: "No placement or design issues detected in this zone.", detail: "Head types and placement appear appropriate. Continue scanning additional zones to complete the design assessment.", action: "Scan additional zones or proceed to rain sensor check.", severity: "none" }} />
      )}
    </div>
  );
}
