"use client";

import { useState } from "react";
import { ClipboardList, Plus, Trash, ChevronDown, ChevronUp, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

export interface AuditIssue {
  id?: string;
  zone?: string;
  severity: "critical" | "moderate" | "mild";
  triage?: string;
  issue: string;
  short_fix?: string;
  cost_reality?: string;
  resolution?: string;
  estimated_cost?: string;
}

export interface AuditData {
  property_address?: string;
  tech_name?: string;
  date: string;
  zones?: { id: number; type: string }[];
  controller_brand?: string;
  controller_model?: string;
  zone_count?: number;
  water_source?: string;
  backflow_present?: boolean;
  rain_sensor_present?: boolean;
  issues: AuditIssue[];
  overall_rating: "good" | "fair" | "poor";
  recommendations: string[];
  notes?: string;
}

function severityIcon(s: AuditIssue["severity"]) {
  if (s === "critical") return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (s === "moderate") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <CheckCircle className="w-4 h-4 text-emerald-400" />;
}

function severityBg(s: AuditIssue["severity"]) {
  if (s === "critical") return "border-red-700/40 bg-red-900/10";
  if (s === "moderate") return "border-amber-700/40 bg-amber-900/10";
  return "border-emerald-700/40 bg-emerald-900/10";
}

function ratingColor(r: AuditData["overall_rating"]) {
  if (r === "good") return "text-emerald-400";
  if (r === "fair") return "text-amber-400";
  return "text-red-400";
}

const emptyAudit = (): AuditData => ({
  date: new Date().toLocaleDateString("en-US"),
  issues: [],
  overall_rating: "fair",
  recommendations: [],
});

function newIssue(): AuditIssue {
  return { id: Math.random().toString(36).slice(2), zone: "", severity: "moderate", issue: "", resolution: "" };
}

export default function AuditReport({ initialData, audit: auditProp, onNewAudit }: { initialData?: Partial<AuditData>; audit?: AuditData; onNewAudit?: () => void }) {
  const [audit, setAudit] = useState<AuditData>(auditProp ?? { ...emptyAudit(), ...initialData });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recInput, setRecInput] = useState("");

  const update = (field: keyof AuditData, value: unknown) =>
    setAudit(prev => ({ ...prev, [field]: value }));

  const addIssue = () => {
    const issue = newIssue();
    setAudit(prev => ({ ...prev, issues: [...prev.issues, issue] }));
    setExpanded(issue.id ?? null);
  };

  const updateIssue = (id: string, field: keyof AuditIssue, value: string) =>
    setAudit(prev => ({
      ...prev,
      issues: prev.issues.map(i => i.id === id ? { ...i, [field]: value } : i),
    }));

  const removeIssue = (id: string) =>
    setAudit(prev => ({ ...prev, issues: prev.issues.filter(i => i.id !== id) }));

  const addRec = () => {
    if (!recInput.trim()) return;
    update("recommendations", [...audit.recommendations, recInput.trim()]);
    setRecInput("");
  };

  const criticalCount = audit.issues.filter(i => i.severity === "critical").length;
  const moderateCount = audit.issues.filter(i => i.severity === "moderate").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(["property_address", "tech_name", "controller_brand", "controller_model"] as (keyof AuditData)[]).map(field => (
          <div key={field as string}>
            <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">{(field as string).replace(/_/g, " ")}</label>
            <input
              type="text"
              value={(audit[field] as string) || ""}
              onChange={e => update(field, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-water-500/50"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Zones</label>
          <input type="number" value={audit.zone_count || ""} onChange={e => update("zone_count", parseInt(e.target.value))}
            placeholder="8" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Water Source</label>
          <select value={audit.water_source || ""} onChange={e => update("water_source", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Select</option>
            <option value="municipal">Municipal</option>
            <option value="well">Well</option>
            <option value="reclaimed">Reclaimed</option>
            <option value="pond">Pond / Lake</option>
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Backflow</label>
          <select value={audit.backflow_present === undefined ? "" : audit.backflow_present ? "yes" : "no"} onChange={e => update("backflow_present", e.target.value === "yes")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Select</option>
            <option value="yes">Present</option>
            <option value="no">Not Present</option>
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Rain Sensor</label>
          <select value={audit.rain_sensor_present === undefined ? "" : audit.rain_sensor_present ? "yes" : "no"} onChange={e => update("rain_sensor_present", e.target.value === "yes")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Select</option>
            <option value="yes">Present</option>
            <option value="no">Not Present</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-2">Overall System Rating</label>
        <div className="flex gap-3">
          {(["good", "fair", "poor"] as AuditData["overall_rating"][]).map(r => (
            <button key={r} onClick={() => update("overall_rating", r)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                audit.overall_rating === r ? ratingColor(r) + " border-current bg-white/5" : "text-gray-500 border-white/10 hover:border-white/20"
              }`}>{r}</button>
          ))}
        </div>
      </div>

      {audit.issues.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Critical</p>
          </div>
          <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{moderateCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Moderate</p>
          </div>
          <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{audit.issues.length - criticalCount - moderateCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Mild</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-water-300 text-xs uppercase tracking-wide font-medium">Issues Found</p>
          <button onClick={addIssue} className="flex items-center gap-1.5 text-xs text-water-400 hover:text-water-300 transition-colors">
            <Plus className="w-3.5 h-3.5" />Add Issue
          </button>
        </div>
        {audit.issues.length === 0 ? (
          <div className="text-center py-8 text-gray-600 border border-dashed border-white/10 rounded-xl">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No issues logged yet</p>
            <button onClick={addIssue} className="text-xs text-water-400 mt-2 hover:underline">Add first issue</button>
          </div>
        ) : (
          <div className="space-y-2">
            {audit.issues.map(issue => (
              <div key={issue.id ?? Math.random().toString(36)} className={`border rounded-xl overflow-hidden ${severityBg(issue.severity)}`}>
                <button onClick={() => setExpanded(expanded === (issue.id ?? "") ? null : (issue.id ?? null))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/3 transition-colors">
                  {severityIcon(issue.severity)}
                  <span className="flex-1 text-sm font-medium text-white">{issue.issue || "New issue"}</span>
                  <span className="text-xs text-gray-500">{issue.zone ? "Zone " + issue.zone : ""}</span>
                  {expanded === (issue.id ?? "") ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  <button onClick={e => { e.stopPropagation(); removeIssue(issue.id ?? ""); }} className="text-gray-600 hover:text-red-400 transition-colors ml-1">
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </button>
                {expanded === (issue.id ?? "") && (
                  <div className="px-4 pb-4 pt-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs block mb-1">Zone</label>
                        <input type="text" value={issue.zone} onChange={e => updateIssue(issue.id ?? "", "zone", e.target.value)}
                          placeholder="e.g. Zone 3" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs block mb-1">Severity</label>
                        <select value={issue.severity} onChange={e => updateIssue(issue.id ?? "", "severity", e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none">
                          <option value="critical">Critical</option>
                          <option value="moderate">Moderate</option>
                          <option value="mild">Mild</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Issue Description</label>
                      <input type="text" value={issue.issue} onChange={e => updateIssue(issue.id ?? "", "issue", e.target.value)}
                        placeholder="Describe the issue" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Resolution</label>
                      <input type="text" value={issue.resolution} onChange={e => updateIssue(issue.id ?? "", "resolution", e.target.value)}
                        placeholder="What was done or recommended" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Estimated Cost</label>
                      <input type="text" value={issue.estimated_cost || ""} onChange={e => updateIssue(issue.id ?? "", "estimated_cost", e.target.value)}
                        placeholder="e.g. $35-50 parts + labor" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-water-300 text-xs uppercase tracking-wide font-medium mb-2">Recommendations</p>
        {audit.recommendations.map((r, i) => (
          <div key={i} className="flex items-start gap-2 mb-1.5">
            <span className="text-water-400 mt-0.5 text-xs">•</span>
            <span className="text-sm text-gray-300 flex-1">{r}</span>
            <button onClick={() => update("recommendations", audit.recommendations.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 transition-colors">
              <Trash className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input type="text" value={recInput} onChange={e => setRecInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addRec()}
            placeholder="Add recommendation…" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-water-500/50" />
          <button onClick={addRec} className="px-3 py-2 rounded-lg bg-water-600/30 border border-water-600/50 text-water-300 text-sm hover:bg-water-600/40 transition-colors">Add</button>
        </div>
      </div>

      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Notes</label>
        <textarea value={audit.notes || ""} onChange={e => update("notes", e.target.value)} rows={3}
          placeholder="Additional field notes…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-water-500/50 resize-none" />
      </div>
    </div>
  );
}
