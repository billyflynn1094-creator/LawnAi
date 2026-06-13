'use client';

import { Calendar, CheckCircle, Clock, Zap, ArrowRight } from 'lucide-react';

interface TimelineStage {
  stage: string;
  title: string;
  actions: string[];
  products: string[];
  milestone: string;
}

interface TimelineProps {
  timeline: TimelineStage[];
}

const STAGE_STYLES = [
  { dot: 'border-field-400 bg-field-500/30', card: 'bg-field-900/40 border-field-700/40', label: 'text-field-400' },
  { dot: 'border-straw-500 bg-straw-400/20', card: 'bg-soil-800/60 border-straw-400/20', label: 'text-straw-400' },
  { dot: 'border-field-600 bg-soil-800', card: 'bg-soil-800/40 border-field-800/40', label: 'text-field-500' },
  { dot: 'border-field-700 bg-soil-900', card: 'bg-soil-900/40 border-field-800/30', label: 'text-field-600' },
];

export default function Timeline({ timeline }: TimelineProps) {
  if (!timeline?.length) return null;

  return (
    <div className="space-y-0">
      {timeline.map((stage, i) => {
        const style = STAGE_STYLES[i] ?? STAGE_STYLES[STAGE_STYLES.length - 1];
        const isFirst = i === 0;
        const isLast = i === timeline.length - 1;

        return (
          <div key={i} className="relative flex gap-3">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-[17px] top-9 bottom-0 w-px bg-field-800/50" />
            )}

            {/* Timeline dot */}
            <div className="flex-shrink-0 pt-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                  style.dot
                }`}
              >
                {isFirst ? (
                  <Zap size={15} className="text-field-300" />
                ) : (
                  <Calendar size={13} className="text-field-500" />
                )}
              </div>
            </div>

            {/* Stage card */}
            <div className={`flex-1 rounded-xl border ${style.card} p-3 mb-3 space-y-2`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={`text-xs uppercase tracking-wide font-medium ${style.label}`}>
                    {stage.stage}
                  </p>
                  <h4 className="text-field-100 text-sm font-semibold leading-tight">
                    {stage.title}
                  </h4>
                </div>
                {isFirst && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-field-500/20 text-field-300 font-medium shrink-0 border border-field-500/30">
                    Start now
                  </span>
                )}
              </div>

              {/* Actions */}
              {stage.actions?.length > 0 && (
                <ul className="space-y-1.5">
                  {stage.actions.map((action, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-field-300">
                      <CheckCircle size={12} className="text-field-500 mt-0.5 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              )}

              {/* Products for this stage */}
              {stage.products?.filter(Boolean).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {stage.products.filter(Boolean).map((product, j) => (
                    <span
                      key={j}
                      className="text-xs px-2 py-0.5 rounded-full bg-soil-700/80 text-straw-300 border border-straw-400/20"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              )}

              {/* Milestone / expected outcome */}
              {stage.milestone && (
                <div className="flex items-start gap-1.5 pt-1.5 border-t border-field-800/40">
                  <ArrowRight size={11} className="text-field-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-field-500 italic">{stage.milestone}</p>
                </div>
              )}

              {/* Timing hint for non-first stages */}
              {!isFirst && (
                <div className="flex items-center gap-1 text-xs text-field-600">
                  <Clock size={10} />
                  <span>{stage.stage}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
