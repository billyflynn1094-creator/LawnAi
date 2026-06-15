"use client";

import { useState, useRef } from "react";
import { Camera, Upload } from "lucide-react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

interface HeadFound { type: string; count: number; notes?: string; }

export default function DesignScan() {
  const [scanning, setScanning]     = useState(false);
  const [headsFound, setHeadsFound] = useState<HeadFound[]>([]);
  const [issues, setIssues]         = useState<DiagResult[]>([]);
  const [summary, setSummary]       = useState("");
  const [mixed, setMixed]           = useState(false);
  const [scanned, setScanned]       = useState(false);
  const [scanError, setScanError]   = useState<DiagResult | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
      setScanning(true);
      setHeadsFound([]);
      setIssues([]);
      setSummary("");
      setMixed(false);
      setScanned(false);
      setScanError(null);
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
          if (a && !a.error) {
            setHeadsFound(a.heads_identified ?? []);
            setMixed(a.mixed_heads_on_zone ?? false);
            setSummary(a.overall_assessment ?? "");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setIssues((a.issues ?? []).map((issue: any) => ({
              brief: issue.brief ?? "",
              detail: issue.detail ?? undefined,
              action: issue.action ?? undefined,
              severity: (issue.severity as DiagResult["severity"]) ?? "mild",
            })));
            setScanned(true);
          } else {
            setScanError({
              brief: "Couldn't analyze this zone image",
              detail: data.error ?? "Try capturing more of the zone area with multiple heads visible, improve lighting, or upload a photo from your gallery.",
              action: "Try again with more heads visible in frame",
              severity: "mild",
            });
          }
        } catch (err) {
          setScanError({
            brief: "Scan failed — " + (err instanceof Error ? err.message : "Network error"),
            detail: "Check your connection or upload a photo from your gallery.",
            severity: "moderate",
          });
        } finally { setScanning(false); }
      };
      reader.readAsDataURL(file);
  };

  const openInput = (useCamera: boolean) => {
    const ref = useCamera ? cameraInputRef : galleryInputRef;
    if (ref.current) {
      ref.current.value = "";
      ref.current.click();
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-gray-300 text-sm">Capture the zone area — get multiple heads in frame where possible.</p>
        <p className="text-xs text-gray-600">AI identifies head types, flags placement issues, and detects mixed-head problems.</p>
      </div>

      <div className="space-y-2">
        <button onClick={() => openInput(true)} disabled={scanning}
          className="w-full py-10 rounded-2xl border-2 border-dashed border-emerald-600/40 bg-emerald-900/10 hover:bg-emerald-900/20 transition-all disabled:opacity-40">
          <Camera className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 text-sm font-medium">
            {scanning ? "Analyzing zone…" : scanned ? "Scan another zone" : "Take a photo of the zone"}
          </p>
          <p className="text-gray-500 text-xs mt-1">Aim to capture 3+ heads in the same frame</p>
        </button>
        {!scanning && (
          <button onClick={() => openInput(false)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-emerald-600/30 hover:text-emerald-300 text-gray-400 text-sm transition-all">
            <Upload className="w-4 h-4" />
            Upload from gallery
          </button>
        )}
      </div>

      {scanError && <CameraResult result={scanError} />}

      {scanned && (
        <div className="space-y-3">
          {summary && (
            <div className="p-3 rounded-xl bg-white/3 border border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Zone summary</p>
              <p className="text-sm text-gray-300">{summary}</p>
            </div>
          )}

          {headsFound.length > 0 && (
            <div className="p-3 rounded-xl bg-white/3 border border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Heads identified</p>
              <div className="flex flex-wrap gap-2">
                {headsFound.map((h, i) => (
                  <span key={i} className="text-xs bg-white/8 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full">
                    {h.count}× {h.type}{h.notes ? ` — ${h.notes}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mixed && (
            <CameraResult result={{
              brief: "Mixed head types detected on this zone",
              detail: "Rotors and spray heads on the same zone have incompatible precipitation rates. Rotors apply 0.4-0.6 in/hr while spray heads apply 1.5-2.0 in/hr — one type will always over- or under-water. This is the single most common cause of dry spots and soggy areas.",
              action: "Separate rotor and spray zones at the valve. Run rotors on one program and sprays on another.",
              severity: "critical",
            }} title="Critical issue" />
          )}

          {issues.length > 0 && (
            <>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Issues found</p>
              {issues.map((issue, i) => <CameraResult key={i} result={issue} />)}
            </>
          )}

          {issues.length === 0 && !mixed && (
            <CameraResult result={{ brief: "No major placement issues detected in this zone", severity: "none" }} />
          )}
        </div>
      )}

      {/* Stable file inputs — off-screen to avoid iOS Safari display:none bug */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
        className="fixed -left-[9999px] -top-[9999px] w-px h-px"
        onChange={handlePickerChange} />
      <input ref={galleryInputRef} type="file" accept="image/*"
        className="fixed -left-[9999px] -top-[9999px] w-px h-px"
        onChange={handlePickerChange} />
    </div>
  );
}
