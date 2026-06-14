'use client';

import {
  AlertTriangle,
  CheckCircle,
  FlaskConical,
  Leaf,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Activity,
  Drill,
  Scissors,
  Wheat,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ElaborateData {
  why_it_happens?: string;
  how_to_apply?: string;
  what_to_watch_for?: string;
  common_mistakes?: string;
  long_term_pathway?: string;
}

interface Product {
  name: string;
  sku?: string;
  catalog_name?: string;
  format?: string;
  type?: string;
  application_rate?: string;
  timing?: string;
  notes?: string;
}

interface TimelineStage {
  stage?: string;
  title?: string;
  actions?: string[];
  products?: string[];
  milestone?: string;
}

interface MechanicalPractice {
  recommended?: boolean;
  timing?: string;
  method?: string;
  seed_type?: string;
  rate?: string;
  notes?: string;
}

interface MechanicalPractices {
  aeration?: MechanicalPractice;
  dethatching?: MechanicalPractice;
  seeding?: MechanicalPractice;
}

interface SoilProfileInfo {
  label?: string;
  notes?: string;
  fertFrequency?: string;
  drainageClass?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = Record<string, any>;

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-900/40 text-red-300 border border-red-700/40',
  moderate: 'bg-orange-900/40 text-orange-300 border border-orange-700/40',
  mild:     'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
  none:     'bg-field-900/40 text-field-400 border border-field-700/40',
};

const SPREAD_STYLE: Record<string, string> = {
  high:   'bg-red-900/30 text-red-400',
  medium: 'bg-orange-900/30 text-orange-400',
  low:    'bg-field-900/30 text-field-400',
};

const FORMAT_BADGE: Record<string, string> = {
  granular:      'bg-straw-400/20 text-straw-200 border border-straw-500/30',
  liquid:        'bg-blue-900/30 text-blue-300 border border-blue-700/30',
  wdg:           'bg-purple-900/30 text-purple-300 border border-purple-700/30',
  wettable_powder:'bg-purple-900/30 text-purple-300 border border-purple-700/30',
  sc:            'bg-blue-900/30 text-blue-300 border border-blue-700/30',
  spray_ready:   'bg-sky-900/30 text-sky-300 border border-sky-700/30',
};

const FORMAT_LABEL: Record<string, string> = {
  granular:       'Granular',
  liquid:         'Liquid',
  wdg:            'WDG',
  wettable_powder:'WP',
  sc:             'SC',
  spray_ready:    'RTU',
};

const FORMAT_SORT: Record<string, number> = {
  granular: 0, liquid: 1, wdg: 2, wettable_powder: 2, sc: 2, spray_ready: 3,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity?: string }) {
  const s = (severity ?? 'none').toLowerCase();
  const style = SEVERITY_STYLE[s] ?? SEVERITY_STYLE.none;
  const icon =
    s === 'critical' ? <AlertTriangle size={10} /> :
    s === 'moderate' ? <ShieldAlert size={10} /> :
    s === 'mild'     ? <Activity size={10} /> :
    <CheckCircle size={10} />;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${style}`}>
      {icon} {s}
    </span>
  );
}

function ElaborateSub({ title, content }: { title: string; content?: string }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  return (
    <div className="border-t border-field-800/40 first:border-t-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2.5 text-left text-field-300 hover:text-field-100 transition text-xs font-medium"
      >
        {title}
        {open
          ? <ChevronUp size={12} className="text-field-500 shrink-0" />
          : <ChevronDown size={12} className="text-field-500 shrink-0" />
        }
      </button>
      {open && (
        <p className="pb-3 text-xs text-field-400 leading-relaxed">{content}</p>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const fmt = (product.format ?? '').toLowerCase();
  const fmtStyle = FORMAT_BADGE[fmt] ?? 'bg-field-800/40 text-field-400 border border-field-700/30';
  const fmtLabel = FORMAT_LABEL[fmt] ?? (fmt ? fmt.toUpperCase() : '');

  return (
    <div className="border-b border-field-800/30 last:border-b-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between py-2.5 text-left gap-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-field-200 font-medium truncate">{product.name}</span>
          {fmtLabel && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${fmtStyle}`}>
              {fmtLabel}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={12} className="text-field-600 shrink-0" />
          : <ChevronDown size={12} className="text-field-600 shrink-0" />
        }
      </button>
      {expanded && (
        <div className="pb-3 space-y-1.5 pl-1">
          {product.type && (
            <p className="text-[10px] text-field-500 uppercase tracking-wide mb-1">{product.type.replace(/_/g,' ')}</p>
          )}
          {product.application_rate && (
            <p className="text-xs text-field-400">
              <span className="text-field-500">Rate:</span> {product.application_rate}
            </p>
          )}
          {product.timing && (
            <p className="text-xs text-field-400">
              <span className="text-field-500">Timing:</span> {product.timing}
            </p>
          )}
          {product.notes && (
            <p className="text-xs text-field-400 leading-relaxed mt-0.5">{product.notes}</p>
          )}
          {!product.sku && (
            <p className="text-[10px] text-field-600 italic mt-1">
              Source through your local professional turf distributor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MechBlock({ icon, title, practice }: { icon: ReactNode; title: string; practice: MechanicalPractice }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-field-500 mt-0.5 shrink-0">{icon}</span>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-field-300">{title}</p>
        {practice.timing  && <p className="text-xs text-field-400">{practice.timing}</p>}
        {practice.method  && <p className="text-xs text-field-400">{practice.method}</p>}
        {practice.seed_type && <p className="text-xs text-field-400">Seed: {practice.seed_type}</p>}
        {practice.rate    && <p className="text-xs text-field-400">Rate: {practice.rate}</p>}
        {practice.notes   && <p className="text-xs text-field-500 leading-relaxed mt-0.5">{practice.notes}</p>}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function AnalysisResults({ analysis }: { analysis: AnalysisData }) {
  const [showElaborate, setShowElaborate] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);

  if (!analysis) return null;

  // ── Parse response ──────────────────────────────────────────
  if (analysis.parse_error) {
    return (
      <div className="rounded-2xl bg-soil-800/60 border border-field-800/40 p-4">
        <p className="text-xs text-field-400">Analysis received but could not be parsed. Raw output:</p>
        <pre className="mt-2 text-xs text-field-500 whitespace-pre-wrap break-words">{analysis.raw}</pre>
      </div>
    );
  }

  const diagnosis:         AnalysisData        = analysis.diagnosis        ?? {};
  const identified:        AnalysisData        = analysis.identified       ?? {};
  const treatment:         AnalysisData        = analysis.treatment        ?? {};
  const elaborate:         ElaborateData       = treatment.elaborate       ?? {};
  const products:          Product[]           = treatment.products        ?? [];
  const mechanical:        MechanicalPractices = analysis.mechanical_practices ?? {};
  const timeline:          TimelineStage[]     = analysis.timeline         ?? [];
  const prevention:        string[]            = analysis.prevention       ?? [];
  const grassType:         AnalysisData        = analysis.grass_type       ?? {};
  const locationFactors:   AnalysisData        = analysis.location_factors ?? {};
  const overviewBullets:   string[]            = analysis.overview_bullets ?? [];
  const soilProfile:       SoilProfileInfo     = analysis._soil_profile    ?? {};

  const invasiveWatch = locationFactors.invasive_watch;
  const showInvasive  = invasiveWatch && invasiveWatch.toLowerCase() !== 'null' && invasiveWatch.trim();

  // Sort: granular → liquid → other
  const sortedProducts = [...products].sort((a, b) => {
    const fa = FORMAT_SORT[(a.format ?? '').toLowerCase()] ?? 9;
    const fb = FORMAT_SORT[(b.format ?? '').toLowerCase()] ?? 9;
    return fa - fb;
  });

  const hasElaborate =
    elaborate.why_it_happens   || elaborate.how_to_apply  ||
    elaborate.what_to_watch_for || elaborate.common_mistakes || elaborate.long_term_pathway;

  const hasMechanical =
    mechanical.aeration?.recommended  ||
    mechanical.dethatching?.recommended ||
    mechanical.seeding?.recommended;

  const planParts = [
    timeline.length > 0    && 'Timeline',
    prevention.length > 0  && 'Prevention',
    hasMechanical          && 'Practices',
  ].filter(Boolean).join(' · ');

  const hasFullPlan = timeline.length > 0 || prevention.length > 0 || hasMechanical || soilProfile.label;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Issue card (always visible) ───────────────────────────── */}
      <div className="rounded-2xl bg-soil-800/60 border border-field-800/40 overflow-hidden">
        <div className="p-4 space-y-3">

          {/* Badges + issue name */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={diagnosis.severity} />

              {diagnosis.issue_type && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-field-800/60 text-field-400 border border-field-700/30 uppercase tracking-wide font-medium">
                  <Tag size={9} /> {diagnosis.issue_type.replace(/_/g, ' ')}
                </span>
              )}

              {diagnosis.spread_risk && diagnosis.spread_risk !== 'none' && SPREAD_STYLE[diagnosis.spread_risk] && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${SPREAD_STYLE[diagnosis.spread_risk]}`}>
                  ↑ {diagnosis.spread_risk} spread
                </span>
              )}
            </div>

            <h2 className="text-base font-semibold text-field-100 leading-snug">
              {identified.primary ?? 'Lawn Analysis'}
            </h2>

            {grassType.identified && (
              <p className="text-[11px] text-field-500 flex items-center gap-1.5">
                <Leaf size={10} className="text-field-600" /> {grassType.identified}
              </p>
            )}
          </div>

          {/* Overview bullets — always visible, 3-4 bullets */}
          {overviewBullets.length > 0 && (
            <ul className="space-y-2">
              {overviewBullets.slice(0, 4).map((bullet: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-field-300 leading-relaxed">
                  <span className="text-field-600 mt-0.5 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Invasive watch */}
          {showInvasive && (
            <p className="text-xs text-orange-400/80 bg-orange-900/20 rounded-lg px-3 py-2 border border-orange-800/30">
              ⚠ {invasiveWatch}
            </p>
          )}

          {/* Elaborate toggle */}
          {hasElaborate && (
            <div>
              <button
                onClick={() => setShowElaborate(e => !e)}
                className="flex items-center gap-1.5 text-xs text-field-400 hover:text-field-200 transition font-medium py-0.5"
              >
                <FlaskConical size={12} />
                {showElaborate ? 'Close' : 'Elaborate'}
                {showElaborate
                  ? <ChevronUp size={12} className="text-field-600" />
                  : <ChevronDown size={12} className="text-field-600" />
                }
              </button>

              {showElaborate && (
                <div className="mt-3 pl-3 border-l-2 border-field-700/40">
                  <ElaborateSub title="Why It Happens"     content={elaborate.why_it_happens} />
                  <ElaborateSub title="How To Apply"        content={elaborate.how_to_apply} />
                  <ElaborateSub title="What To Watch For"   content={elaborate.what_to_watch_for} />
                  <ElaborateSub title="Common Mistakes"     content={elaborate.common_mistakes} />
                  <ElaborateSub title="Long-Term Pathway"   content={elaborate.long_term_pathway} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Products card ─────────────────────────────────────────── */}
      {sortedProducts.length > 0 && (
        <div className="rounded-2xl bg-soil-800/60 border border-field-800/40 overflow-hidden">
          <div className="px-4 pt-3.5 pb-0.5 flex items-center gap-2">
            <FlaskConical size={13} className="text-field-500" />
            <span className="text-xs font-semibold text-field-300 uppercase tracking-wide">Products</span>
            <span className="text-[10px] text-field-600 ml-0.5">tap to expand</span>
          </div>
          <div className="px-4 pb-2">
            {sortedProducts.map((p, i) => <ProductRow key={i} product={p} />)}
          </div>
        </div>
      )}

      {/* ── See full plan card ────────────────────────────────────── */}
      {hasFullPlan && (
        <div className="rounded-2xl bg-soil-800/60 border border-field-800/40 overflow-hidden">
          <button
            onClick={() => setShowFullPlan(f => !f)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-field-800/10 transition"
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-field-500" />
              <span className="text-sm font-semibold text-field-200">See full plan</span>
              {planParts && (
                <span className="text-[10px] text-field-600">{planParts}</span>
              )}
            </div>
            {showFullPlan
              ? <ChevronUp size={14} className="text-field-500" />
              : <ChevronDown size={14} className="text-field-500" />
            }
          </button>

          {showFullPlan && (
            <div className="px-4 pb-5 pt-1 space-y-5 border-t border-field-800/40">

              {/* Timeline */}
              {timeline.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={12} className="text-field-500" />
                    <span className="text-xs font-semibold text-field-400 uppercase tracking-wide">Timeline</span>
                  </div>
                  <div className="space-y-0">
                    {timeline.map((stage, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <div className="w-2 h-2 rounded-full bg-field-600 shrink-0" />
                          {i < timeline.length - 1 && (
                            <div className="w-px flex-1 bg-field-800/60 mt-1 min-h-[20px]" />
                          )}
                        </div>
                        <div className="pb-4">
                          {stage.stage && (
                            <p className="text-[10px] text-field-500 uppercase tracking-wide font-medium leading-none mb-0.5">
                              {stage.stage}
                            </p>
                          )}
                          {stage.title && (
                            <p className="text-xs text-field-300 font-medium">{stage.title}</p>
                          )}
                          {stage.actions?.map((action, j) => (
                            <p key={j} className="text-xs text-field-400 mt-0.5 flex items-start gap-1.5">
                              <span className="text-field-600 shrink-0 mt-0.5">•</span>
                              {action}
                            </p>
                          ))}
                          {stage.milestone && (
                            <p className="mt-1 text-[10px] text-field-500 italic">✓ {stage.milestone}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prevention */}
              {prevention.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={12} className="text-field-500" />
                    <span className="text-xs font-semibold text-field-400 uppercase tracking-wide">Prevention</span>
                  </div>
                  <ul className="space-y-1.5">
                    {prevention.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-field-400 leading-relaxed">
                        <span className="text-field-600 mt-0.5 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mechanical practices */}
              {hasMechanical && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Drill size={12} className="text-field-500" />
                    <span className="text-xs font-semibold text-field-400 uppercase tracking-wide">Mechanical Practices</span>
                  </div>
                  <div className="space-y-4">
                    {mechanical.aeration?.recommended && (
                      <MechBlock icon={<Activity size={11} />} title="Aeration" practice={mechanical.aeration} />
                    )}
                    {mechanical.dethatching?.recommended && (
                      <MechBlock icon={<Scissors size={11} />} title="Dethatching" practice={mechanical.dethatching} />
                    )}
                    {mechanical.seeding?.recommended && (
                      <MechBlock icon={<Wheat size={11} />} title="Seeding" practice={mechanical.seeding} />
                    )}
                  </div>
                </div>
              )}

              {/* Soil profile */}
              {soilProfile.label && (
                <div className="pt-3 border-t border-field-800/40">
                  <p className="text-[10px] text-field-600 uppercase tracking-wide font-medium mb-1.5">
                    Regional Soil Profile
                  </p>
                  <p className="text-xs text-field-300">{soilProfile.label}</p>
                  {soilProfile.notes && (
                    <p className="text-xs text-field-500 mt-0.5 leading-relaxed">{soilProfile.notes}</p>
                  )}
                  <div className="flex gap-4 mt-1.5">
                    {soilProfile.fertFrequency && (
                      <p className="text-[10px] text-field-600">Fert frequency: {soilProfile.fertFrequency}</p>
                    )}
                    {soilProfile.drainageClass && (
                      <p className="text-[10px] text-field-600">Drainage: {soilProfile.drainageClass}</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
