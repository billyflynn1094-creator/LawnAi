"use client";

import { useState, useRef } from "react";
import { Camera, Upload } from "lucide-react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

const CHECKLIST = [
  { id: "sky",    question: "Is the sensor mounted in open sky with no roof, eaves, or gutters directly above?",            fail_brief: "Sensor mounted under overhang — rain won't reach it",           fail_detail: "Mounting under eaves prevents rain from reaching the hygroscopic disc. The sensor will not trigger even in heavy rain, defeating its purpose entirely. This is the most common rain sensor installation error.", fail_action: "Relocate sensor to a position with clear open sky from all directions. Keep at least 12 inches clear of any overhang." },
  { id: "trees",  question: "Is the sensor away from tree branches or dense vegetation that could block rainfall?",          fail_brief: "Tree canopy intercepting rain before it reaches sensor",         fail_detail: "Tree canopy intercepts rain before it reaches the sensor. Dense foliage can prevent triggering during moderate rainfall events, resulting in unnecessary watering after rain.", fail_action: "Move sensor to a position clear of any vegetation canopy within a 3-foot radius." },
  { id: "spray",  question: "Is the sensor located above the reach of all irrigation spray heads?",                         fail_brief: "Sensor within irrigation spray reach — causes false triggers",   fail_detail: "Irrigation spray hitting the sensor disc causes false triggers — the sensor thinks it is raining and shuts off the system mid-cycle. This is one of the most common rain sensor installation errors.", fail_action: "Mount sensor at least 2 feet above the tallest spray head in the area, or relocate away from spray zones." },
  { id: "bypass", question: "Is the controller bypass switch set to ACTIVE (not bypassed)?",                                fail_brief: "Rain sensor bypassed at controller — sensor is disconnected",    fail_detail: "Most controllers have a physical rain sensor bypass switch. If set to BYPASS, the sensor wire is disconnected regardless of sensor status. This is frequently left in bypass position after service visits.", fail_action: "Set controller bypass switch to ACTIVE or SENSOR position. On older controllers this is a physical slide switch near the terminal strip." },
  { id: "sun",    question: "Is the sensor avoiding excessive direct afternoon sun that would cause rapid disc evaporation?", fail_brief: "Heavy afternoon sun causing sensor disc to dry too fast",        fail_detail: "Heavy afternoon sun can dry the sensor disc within 1-2 hours after rain on hot days, causing the system to re-enable watering too soon after rainfall.", fail_action: "East or north-facing mounting reduces rapid evaporation. Adjust the sensitivity collar up one notch to require more water before triggering." },
];

export default function RainSensorDiag() {
  const [mode, setMode]               = useState<"camera" | "checklist">("camera");
  const [scanning, setScanning]       = useState(false);
  const [cameraResult, setCameraResult] = useState<DiagResult | null>(null);
  const [checks, setChecks]           = useState<Record<string, boolean | null>>({});

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
      setScanning(true);
      setCameraResult(null);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const res = await fetch("/api/irrigation-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "rain_sensor", image: base64 }),
          });
          const data = await res.json();
          const a = data.analysis;
          if (a && !a.error) {
            setCameraResult({
              brief: a.brief ?? "Rain sensor assessed",
              detail: a.detail ?? undefined,
              action: a.action ?? undefined,
              severity: (a.location_rating === "poor" ? "critical" : a.location_rating === "acceptable" ? "moderate" : "none") as DiagResult["severity"],
            });
          } else {
            setCameraResult({
              brief: "Couldn't analyze this rain sensor image",
              detail: data.error ?? "Try capturing the sensor and its surroundings clearly, including the mounting position and anything above it. Or use the checklist below.",
              action: "Switch to checklist mode for manual assessment",
              severity: "mild",
            });
          }
        } catch (err) {
          setCameraResult({
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

  const toggle = (id: string, val: boolean) => setChecks(c => ({ ...c, [id]: val }));
  const failing = CHECKLIST.filter(c => checks[c.id] === false);
  const answered = CHECKLIST.filter(c => checks[c.id] !== undefined);

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        {(["camera", "checklist"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            }`}>
            {m === "camera" ? "📷 Camera scan" : "☑️ Checklist"}
          </button>
        ))}
      </div>

      {mode === "camera" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <button onClick={() => openInput(true)} disabled={scanning}
              className="w-full py-10 rounded-2xl border-2 border-dashed border-sky-600/40 bg-sky-900/10 hover:bg-sky-900/20 transition-all disabled:opacity-40">
              <Camera className="w-7 h-7 text-sky-400 mx-auto mb-2" />
              <p className="text-sky-300 text-sm font-medium">{scanning ? "Assessing sensor…" : cameraResult ? "Take another photo" : "Take a photo of the rain sensor"}</p>
              <p className="text-gray-500 text-xs mt-1">Capture the sensor and its mounting position</p>
            </button>
            {!scanning && (
              <button onClick={() => openInput(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/3 hover:border-sky-600/30 hover:text-sky-300 text-gray-400 text-sm transition-all">
                <Upload className="w-4 h-4" />
                Upload from gallery
              </button>
            )}
          </div>
          {cameraResult && <CameraResult result={cameraResult} title="Sensor assessment" />}
          <p className="text-gray-600 text-xs text-center">For a detailed walkthrough, switch to Checklist mode above</p>
        </div>
      )}

      {mode === "checklist" && (
        <div className="space-y-3">
          {CHECKLIST.map(item => (
            <div key={item.id} className="border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4">
                <p className="text-sm text-gray-200 leading-relaxed mb-3">{item.question}</p>
                <div className="flex gap-2">
                  <button onClick={() => toggle(item.id, true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      checks[item.id] === true ? "border-emerald-600/60 bg-emerald-900/25 text-emerald-300" : "border-white/10 text-gray-500 hover:border-white/20"
                    }`}>Yes ✓</button>
                  <button onClick={() => toggle(item.id, false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      checks[item.id] === false ? "border-red-600/60 bg-red-900/20 text-red-300" : "border-white/10 text-gray-500 hover:border-white/20"
                    }`}>No ✗</button>
                </div>
              </div>
              {checks[item.id] === false && (
                <div className="border-t border-red-900/30">
                  <CameraResult result={{ brief: item.fail_brief, detail: item.fail_detail, action: item.fail_action, severity: "moderate" }} />
                </div>
              )}
            </div>
          ))}

          {answered.length === CHECKLIST.length && failing.length === 0 && (
            <CameraResult result={{ brief: "Rain sensor installation looks correct", detail: "All five placement criteria are met. If the system is still running after rain, the issue is likely a wiring fault at the controller terminal strip or a failed sensor disc.", action: "Test by manually wetting the sensor disc — system should pause within 30 seconds.", severity: "none" }} />
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
