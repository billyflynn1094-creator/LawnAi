"use client";

import { useState, useCallback } from "react";
import { Cpu, ChevronDown, ChevronUp, Search, BookOpen } from "lucide-react";
import { CONTROLLER_DATABASE, getAllBrands, findController } from "@/lib/irrigation/controllers";

export default function ControllerGuideComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedController, setSelectedController] = useState<typeof CONTROLLER_DATABASE[0] | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [idMode, setIdMode] = useState(false);
  const [idQuery, setIdQuery] = useState("");
  const [idResult, setIdResult] = useState<typeof CONTROLLER_DATABASE[0] | null>(null);
  const [idLoading, setIdLoading] = useState(false);

  const brands = getAllBrands();

  const filtered = searchQuery
    ? CONTROLLER_DATABASE.filter(c =>
        c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nicknames && c.nicknames.some((n: string) => n.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    : CONTROLLER_DATABASE;

  const selectController = (c: typeof CONTROLLER_DATABASE[0]) => {
    setSelectedController(c);
    setSelectedTask(c.guides[0]?.task || null);
    setExpandedStep(0);
  };

  const handleIdSearch = useCallback(async () => {
    if (!idQuery.trim()) return;
    setIdLoading(true);
    const local = findController(idQuery);
    if (local) {
      setIdResult(local);
      setIdLoading(false);
      return;
    }
    setIdResult(null);
    setIdLoading(false);
  }, [idQuery]);

  const currentGuide = selectedController?.guides.find((g: { task: string }) => g.task === selectedTask);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setIdMode(false)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${!idMode ? "border-purple-500 bg-purple-900/20 text-purple-300" : "border-white/10 text-gray-500 hover:border-white/20"}`}>
          <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />Browse Guides
        </button>
        <button onClick={() => setIdMode(true)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${idMode ? "border-purple-500 bg-purple-900/20 text-purple-300" : "border-white/10 text-gray-500 hover:border-white/20"}`}>
          <Search className="w-3.5 h-3.5 inline mr-1.5" />Identify Controller
        </button>
      </div>

      {idMode ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={idQuery} onChange={e => setIdQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleIdSearch()}
              placeholder="Describe what you see (e.g. gray box with dial and LCD)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            <button onClick={handleIdSearch} disabled={idLoading} className="px-4 py-2.5 rounded-xl bg-purple-600/30 border border-purple-600/50 text-purple-300 text-sm hover:bg-purple-600/40 transition-colors disabled:opacity-40">
              {idLoading ? "…" : "Search"}
            </button>
          </div>
          {idResult ? (
            <div className="bg-purple-900/10 border border-purple-700/40 rounded-xl p-4">
              <p className="text-xs text-purple-400 uppercase tracking-wide mb-1 font-medium">Match Found</p>
              <p className="text-white font-semibold">{idResult.brand} {idResult.model}</p>
              {idResult.nicknames?.length > 0 && <p className="text-xs text-gray-500 mt-0.5">Also known as: {idResult.nicknames.join(", ")}</p>}
              <p className="text-sm text-gray-300 mt-2">{idResult.description}</p>
              <div className="flex gap-3 mt-3 text-xs text-gray-400">
                <span>Type: <span className="text-white">{idResult.type}</span></span>
                <span>Zones: <span className="text-white">{idResult.zone_range}</span></span>
              </div>
              <button onClick={() => { selectController(idResult); setIdMode(false); }}
                className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline transition-colors">
                View programming guides
              </button>
            </div>
          ) : idQuery && !idLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">No match found. Try using the camera scan on the Full Inspection module.</p>
          ) : null}
          <div>
            <p className="text-gray-500 text-xs mb-3 uppercase tracking-wide">Or select by brand:</p>
            <div className="flex flex-wrap gap-2">
              {brands.map((b: string) => (
                <button key={b} onClick={() => { setSearchQuery(b); setIdMode(false); }}
                  className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-400 hover:text-white hover:border-white/30 transition-all">
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : selectedController ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedController(null)} className="text-gray-500 hover:text-white transition-colors text-xs">Back</button>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{selectedController.brand} {selectedController.model}</p>
              <p className="text-xs text-gray-500">{selectedController.type} · {selectedController.zone_range} zones</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedController.guides.map((g: { task: string }) => (
              <button key={g.task} onClick={() => { setSelectedTask(g.task); setExpandedStep(0); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize ${
                  selectedTask === g.task ? "border-purple-500 bg-purple-900/20 text-purple-300" : "border-white/10 text-gray-500 hover:border-white/20"
                }`}>
                {g.task.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {currentGuide && (
            <div className="space-y-2">
              {currentGuide.steps.map((step: { title: string; instruction: string; display_shows?: string; tip?: string }, i: number) => (
                <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white/5 hover:bg-white/8 transition-colors">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <span className="flex-1 font-medium text-sm text-white">{step.title}</span>
                    {expandedStep === i ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expandedStep === i && (
                    <div className="px-4 pb-4 pt-2 space-y-2">
                      <p className="text-sm text-gray-200">{step.instruction}</p>
                      {step.display_shows && (
                        <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-purple-300">
                          Display: {step.display_shows}
                        </div>
                      )}
                      {step.tip && (
                        <p className="text-xs text-amber-400/80 italic border-l-2 border-amber-700/40 pl-2">{step.tip}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedController.common_issues.length > 0 && (
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">Common Issues</p>
              <ul className="space-y-1.5">
                {selectedController.common_issues.map((ci: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>{ci}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search controller brand or model…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map((c: typeof CONTROLLER_DATABASE[0]) => (
              <button key={c.brand + "-" + c.model} onClick={() => selectController(c)}
                className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/3 hover:border-purple-500/40 hover:bg-purple-900/10 transition-all">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{c.brand} {c.model}</p>
                    <p className="text-xs text-gray-500 truncate">{c.description}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-800/30 text-purple-400 flex-shrink-0">{c.zone_range} zones</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-6">No controllers found for &ldquo;{searchQuery}&rdquo;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
