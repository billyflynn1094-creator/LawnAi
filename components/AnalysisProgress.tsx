'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { label: 'Processing photo',             min: 0  },
  { label: 'Identifying grass type',        min: 12 },
  { label: 'Reading environmental data',    min: 28 },
  { label: 'Analyzing turf conditions',     min: 45 },
  { label: 'Building recommendations',      min: 62 },
  { label: 'Reviewing treatment options',   min: 78 },
  { label: 'Finalizing report',             min: 91 },
  { label: 'Complete',                      min: 100 },
];

interface AnalysisProgressProps {
  themeColor?: string;
  complete?: boolean;
}

export default function AnalysisProgress({
  themeColor = '#4a8535',
  complete = false,
}: AnalysisProgressProps) {
  const [pct, setPct] = useState(0);

  // Gradual advance while waiting for the API — holds at ~97%
  useEffect(() => {
    if (complete) return;
    const timer = setInterval(() => {
      setPct((prev) => {
        if (prev >= 97) return prev;
        const bump = Math.random() * 0.9 + 0.4; // 0.4 – 1.3% per tick
        return Math.min(prev + bump, 97);
      });
    }, 160);
    return () => clearInterval(timer);
  }, [complete]);

  // When API returns, ramp quickly to 100
  useEffect(() => {
    if (!complete) return;
    const ramp = setInterval(() => {
      setPct((prev) => {
        const next = prev + 4;
        if (next >= 100) { clearInterval(ramp); return 100; }
        return next;
      });
    }, 30);
    return () => clearInterval(ramp);
  }, [complete]);

  const rounded = Math.floor(pct);
  const currentStep =
    [...STEPS].reverse().find((s) => rounded >= s.min)?.label ?? STEPS[0].label;

  return (
    <div
      className="w-full rounded-2xl bg-white border overflow-hidden"
      style={{ borderColor: `${themeColor}22` }}
    >
      {/* Header: label + percentage */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span
          className="text-[12px] font-semibold tracking-wide"
          style={{ color: themeColor }}
        >
          Analyzing…
        </span>
        <span
          className="text-[22px] font-black tabular-nums leading-none"
          style={{ color: themeColor }}
        >
          {rounded}%
        </span>
      </div>

      {/* Progress bar track */}
      <div
        className="mx-4 h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: `${themeColor}18` }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${themeColor}99, ${themeColor})`,
            boxShadow: `0 0 10px ${themeColor}44`,
          }}
        />
      </div>

      {/* Step label */}
      <div className="px-4 pt-2 pb-4 flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: themeColor }}
        />
        <span className="text-[11px] font-medium text-gray-400 tracking-wide">
          {currentStep}
        </span>
      </div>
    </div>
  );
}
