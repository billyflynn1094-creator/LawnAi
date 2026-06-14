"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

const CHECKLIST = [
  { id: "sky", question: "Is the sensor mounted in open sky with no roof, eaves, or gutters directly above?", fail_brief: "Sensor mounted under overhang — rain won't reach it", fail_detail: "Mounting under eaves prevents rain from reaching the hygroscopic disc. The sensor will not trigger even in heavy rain, defeating its purpose entirely. This is the most common rain sensor installation error.", fail_action: "Relocate sensor to a position with clear open sky from all directions. Keep at least 12 inches clear of any overhang." },
  { id: "trees", question: "Is the sensor away from tree branches or dense vegetation that could block rainfall?", fail_brief: "Tree canopy intercepting rain before it reaches sensor", fail_detail: "Tree canopy intercepts rain before it reaches the sensor. Dense foliage can prevent triggering during moderate rainfall events, resulting in unnecessary watering after rain.", fail_action: "Move sensor to a position clear of any vegetation canopy within a 3-foot radius." },
  { id: "spray", question: "Is the sensor located above the reach of all irrigation spray heads?", fail_brief: "Sensor within irrigation spray reach — causes false triggers", fail_detail: "Irrigation spray hitting the sensor disc causes false triggers — the sensor thinks it is raining and shuts off the system mid-cycle. This is one of the most common rain sensor installation errors.", fail_action: "Mount sensor at least 2 feet above the tallest spray head in the area, or relocate to a position away from spray zones." },
  { id: "bypass", question: "Is the controller bypass switch set to ACTIVE (not bypassed)?", fail_brief: "Rain sensor bypassed at controller — sensor is disconnected", fail_detail: "Most controllers have a physical rain sensor bypass switch. If set to BYPASS, the sensor wire is disconnected regardless of sensor status. This is frequently left in bypass position after service visits and forgotten.", fail_action: "Set controller bypass switch to ACTIVE or SENSOR position. On older controllers this is a physical slide switch near the terminal strip." },
  { id: "sun", question: "Is the sensor avoiding excessive direct afternoon sun that would cause rapid disc evaporation?", fail_brief: "Heavy afternoon sun causing sensor disc to dry too fast", fail_detail: "Heavy afternoon sun can dry the sensor disc within 1-2 hours after rain on hot days, causing the system to re-enable watering too soon after rainfall. The sensor is functional but the effective shutoff window is shortened.", fail_action: "East or north-facing mounting reduces rapid evaporation. Adjust the sensitivity collar up one notch to require more water before triggering." },
];

export default function RainSensorDiag() {
  const [mode, setMode] = useState<"camera" | "checklist">("camera");
  const [scanning, setScanning] = useState(false);
  const [cameraResult, setCameraResult] = useState<DiagResult | null>(null);
  const [cameraIssues, setCameraIssues] = useState<DiagResult[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const scanCamera = () => {
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
            body: JSON.stringify({ mode: "rain_sensor", image: base64 }),
          });
          const data = await res.json();
          const a = data.analysis;
          if (a) {
            setCameraResult({ brief: a.brief ?? a.overall_effectiveness ?? "Analysis complete", detail: a.detail ?? undefined, action: a.action ?? undefined, severity: a.location_rating === "good" ? "none" : a.location_rating === "acceptable" ? "mild" : "moderate" });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCameraIssues((a.issues ?? []).map((issue: any) => ({ brief: issue.brief ?? "", detail: issue.detail ?? undefined, action: issue.action ?? undefined, severity: (issue.severity as DiagResult["severity"]) ?? "mild" })));
          }
        } catch { /* silent */ } finally { setScanning(false); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const failingChecks = CHECKLIST.filter(c => answers[c.id] === false);
  const allAnswered = Object.keys(answers).length === CHECKLIST.length;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setMode("camera")} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${mode === "camera" ? "border-teal-500 bg-teal-900/20 text-teal-300" : "border-white/10 text-gray-500"}`}>📷 Camera Scan</button>
        <button onClick={() => setMode("checklist")} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${mode === "checklist" ? "border-teal-500 bg-teal-900/20 text-teal-300" : "border-white/10 text-gray-500"}`}>✅ Checklist</button>
      </div>

      {mode === "camera" ? (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Point your camera at the rain sensor and its mounting location. Include the surrounding area so obstruction can be assessed.</p>
          <button onClick={scanCamera} disabled={scanning}
            className="w-full py-12 rounded-2xl border-2 border-dashed border-teal-600/40 bg-teal-900/10 hover:bg-teal-900/20 transition-all disabled:opacity-40">
            <Camera className="w-8 h-8 text-teal-400 mx-auto mb-2" />
            <p className="text-teal-300 text-sm font-medium">{scanning ? "Analyzing…" : "Scan rain sensor location"}</p>
            <p className="text-gray-500 text-xs mt-1">Include sensor, mount, and sky above in frame</p>
          </button>
          {cameraResult && <CameraResult result={cameraResult} title="Location assessment" />}
          {cameraIssues.map((issue, i) => <CameraResult key={i} result={issue} title={`Issue ${i + 1}`} />)}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm mb-1">Answer each question about the sensor installation.</p>
          {CHECKLIST.map(item => (
            <div key={item.id} className="border border-white/10 rounded-xl p-4">
              <p className="text-sm text-white mb-3">{item.question}</p>
              <div className="flex gap-2">
                <button onClick={() => setAnswers(a => ({ ...a, [item.id]: true }))} className={`flex-1 py-2 rounded-lg text-sm transition-all ${answers[item.id] === true ? "bg-emerald-700/40 border border-emerald-600/60 text-emerald-300" : "bg-white/5 border border-white/10 text-gray-400"}`}>✓ Yes</button>
                <button onClick={() => setAnswers(a => ({ ...a, [item.id]: false }))} className={`flex-1 py-2 rounded-lg text-sm transition-all ${answers[item.id] === false ? "bg-red-800/40 border border-red-700/60 text-red-300" : "bg-white/5 border border-white/10 text-gray-400"}`}>✗ No</button>
              </div>
            </div>
          ))}
          {failingChecks.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-gray-500 text-xs uppercase tracking-wide">{failingChecks.length} issue{failingChecks.length > 1 ? "s" : ""} found</p>
              {failingChecks.map(item => <CameraResult key={item.id} result={{ brief: item.fail_brief, detail: item.fail_detail, action: item.fail_action, severity: "moderate" }} />)}
            </div>
          )}
          {allAnswered && failingChecks.length === 0 && (
            <CameraResult result={{ brief: "Rain sensor location is good — all placement criteria passed.", detail: "The sensor is positioned to accurately detect rainfall and interrupt the irrigation schedule as intended. Open sky exposure, no obstruction, and correct mounting height all confirmed.", action: "Verify wiring at controller terminal and confirm bypass switch is set to ACTIVE.", severity: "none" }} />
          )}
        </div>
      )}
    </div>
  );
}
