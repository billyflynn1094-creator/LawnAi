"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

export interface DiagResult {
  brief: string;
  detail?: string;
  action?: string;
  severity: "critical" | "moderate" | "mild" | "none";
}

const SEVERITY = {
  critical: { Icon: AlertCircle, color: "text-red-400", bg: "bg-red-900/20", border: "border-red-700/50", label: "Critical", dot: "🔴" },
  moderate: { Icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-900/20", border: "border-amber-700/50", label: "Moderate", dot: "🟡" },
  mild: { Icon: Info, color: "text-blue-400", bg: "bg-blue-900/20", border: "border-blue-700/50", label: "Mild", dot: "🔵" },
  none: { Icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-700/50", label: "OK", dot: "✅" },
} as const;

interface Props {
  result: DiagResult;
  title?: string;
}

export default function CameraResult({ result, title }: Props) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY[result.severity];
  const { Icon } = cfg;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <div className="p-4">
        {title && (
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2.5 font-medium">
            {title}
          </p>
        )}
        <div className="flex gap-3">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-0.5 ${cfg.color}`}>
              {cfg.dot} {cfg.label}
            </p>
            <p className="text-white text-sm leading-snug">{result.brief}</p>
          </div>
        </div>
        {result.detail && (
          <>
            <button
              onClick={() => setOpen(!open)}
              className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Elaborate
            </button>
            {open && (
              <p className="mt-2 pt-3 border-t border-white/10 text-sm text-gray-300 leading-relaxed">
                {result.detail}
              </p>
            )}
          </>
        )}
      </div>
      {result.action && (
        <div className="px-4 py-3 bg-black/20 border-t border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Next step</p>
          <p className="text-sm text-white">{result.action}</p>
        </div>
      )}
    </div>
  );
}
