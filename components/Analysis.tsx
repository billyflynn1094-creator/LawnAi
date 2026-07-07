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

/** Build a Home Depot search-results URL for a product name. Home Depot's own
 *  site auto-detects the visitor's nearest store/zip on load — no geo lookup
 *  needed on our end. */
function hdSearchUrl(name: string): string {
  return `https://www.homedepot.com/s/${encodeURIComponent(name)}`;
}

// -- Types --------------------------------------------------------------------

interface ElaborateData {
  why_it_happens?: string;
  how_to_apply?: string;
  what_to_watch_for?: string;
  common_mistakes?: string;
  long_term_pathway?: string;
}

interface Product {
  name: string;
  manufacturer?: string;
  equivalent_product?: string;
  equivalent_manufacturer?: string;
  sku?: string;
  catalog_name?: string;
  format?: string;
  type?: string;
  application_rate?: string;
  timing?: string;
  notes?: string;
}

interface AsWellProductGroup {
  category?: string;
  label?: string;
  products?: Product[];
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

// -- Theme tokens -------------------------------------------------------------

interface Tk {
  card: string;
  innerCard: string;
  divider: string;
  outerDivider: string;
  heading: string;
  subheading: string;
  body: string;
  muted: string;
  faint: string;
  icon: string;
  label: string;
  rowHover: string;
  btn: string;
  elaborateBorder: string;
  invasive: string;
  dotColor: string;
  stemColor: string;
  fmtBadge: Record<string, string>;
  severityBadge: Record<string, string>;
  spreadBadge: Record<string, string>;
  categoryBadge: string;
  asWellBg: string;
  asWellBorder: string;
  timelineDot: string;
  timelineStem: string;
}

const DARK_TK: Tk = {
  card:            'bg-soil-800/60 border border-field-800/40',
  innerCard:       'bg-soil-800/60 border border-field-800/40',
  divider:         'border-field-800/30',
  outerDivider:    'border-field-800/40',
  heading:         'text-field-100',
  subheading:      'text-field-200',
  body:            'text-field-300',
  muted:           'text-field-400',
  faint:           'text-field-500',
  icon:            'text-field-500',
  label:           'text-field-300 uppercase tracking-wide',
  rowHover:        'hover:bg-field-800/10',
  btn:             'text-field-400 hover:text-field-200',
  elaborateBorder: 'border-field-700/40',
  invasive:        'text-orange-400/80 bg-orange-900/20 border border-orange-800/30',
  dotColor:        'bg-field-600',
  stemColor:       'bg-field-800/60',
  fmtBadge: {
    granular:        'bg-straw-400/20 text-straw-200 border border-straw-500/30',
    liquid:          'bg-blue-900/30 text-blue-300 border border-blue-700/30',
    wdg:             'bg-purple-900/30 text-purple-300 border border-purple-700/30',
    wettable_powder: 'bg-purple-900/30 text-purple-300 border border-purple-700/30',
    sc:              'bg-blue-900/30 text-blue-300 border border-blue-700/30',
    spray_ready:     'bg-sky-900/30 text-sky-300 border border-sky-700/30',
    _default:        'bg-field-800/40 text-field-400 border border-field-700/30',
  },
  severityBadge: {
    critical: 'bg-red-900/40 text-red-300 border border-red-700/40',
    moderate: 'bg-orange-900/40 text-orange-300 border border-orange-700/40',
    mild:     'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
    none:     'bg-field-900/40 text-field-400 border border-field-700/40',
  },
  spreadBadge: {
    high:   'bg-red-900/30 text-red-400',
    medium: 'bg-orange-900/30 text-orange-400',
    low:    'bg-field-900/30 text-field-400',
  },
  categoryBadge: 'bg-field-800/60 text-field-400 border border-field-700/30',
  asWellBg:     'bg-soil-800/60',
  asWellBorder: 'border-field-800/40',
  timelineDot:  'bg-field-600',
  timelineStem: 'bg-field-800/60',
};

const LIGHT_TK: Tk = {
  card:            'bg-white border border-gray-200 shadow-sm',
  innerCard:       'bg-white border border-gray-200 shadow-sm',
  divider:         'border-gray-100',
  outerDivider:    'border-gray-200',
  heading:         'text-gray-900',
  subheading:      'text-gray-800',
  body:            'text-gray-700',
  muted:           'text-gray-600',
  faint:           'text-gray-400',
  icon:            'text-gray-400',
  label:           'text-gray-500 uppercase tracking-wide',
  rowHover:        'hover:bg-gray-50 transition-colors',
  btn:             'text-orange-500 hover:text-orange-600',
  elaborateBorder: 'border-orange-200',
  invasive:        'text-orange-700 bg-orange-50 border border-orange-200',
  dotColor:        'bg-gray-400',
  stemColor:       'bg-gray-200',
  fmtBadge: {
    granular:        'bg-amber-50 text-amber-700 border border-amber-200',
    liquid:          'bg-blue-50 text-blue-600 border border-blue-200',
    wdg:             'bg-purple-50 text-purple-600 border border-purple-200',
    wettable_powder: 'bg-purple-50 text-purple-600 border border-purple-200',
    sc:              'bg-blue-50 text-blue-600 border border-blue-200',
    spray_ready:     'bg-sky-50 text-sky-600 border border-sky-200',
    _default:        'bg-gray-100 text-gray-600 border border-gray-200',
  },
  severityBadge: {
    critical: 'bg-red-50 text-red-600 border border-red-200',
    moderate: 'bg-orange-50 text-orange-600 border border-orange-200',
    mild:     'bg-yellow-50 text-yellow-600 border border-yellow-200',
    none:     'bg-gray-50 text-gray-500 border border-gray-200',
  },
  spreadBadge: {
    high:   'bg-red-50 text-red-500',
    medium: 'bg-orange-50 text-orange-500',
    low:    'bg-gray-50 text-gray-500',
  },
  categoryBadge: 'bg-gray-100 text-gray-600 border border-gray-200',
  asWellBg:     'bg-white',
  asWellBorder: 'border-gray-200',
  timelineDot:  'bg-gray-400',
  timelineStem: 'bg-gray-200',
};

// -- Sub-components ------------------------------------------------------------

function SeverityBadge({ severity, tk }: { severity?: string; tk: Tk }) {
  const s = (severity ?? 'none').toLowerCase();
  const style = tk.severityBadge[s] ?? tk.severityBadge.none;
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

function ElaborateSub({ title, content, tk }: { title: string; content?: string; tk: Tk }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  return (
    <div className={`border-t ${tk.divider} first:border-t-0`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between py-2.5 text-left ${tk.muted} hover:${tk.body} transition text-xs font-medium`}
      >
        {title}
        {open
          ? <ChevronUp size={12} className={`${tk.faint} shrink-0`} />
          : <ChevronDown size={12} className={`${tk.faint} shrink-0`} />
        }
      </button>
      {open && (
        <p className={`pb-3 text-xs ${tk.muted} leading-relaxed`}>{content}</p>
      )}
    </div>
  );
}

function ProductRow({ product, tk, shopLinks }: { product: Product; tk: Tk; shopLinks?: 'homedepot' }) {
  const [expanded, setExpanded] = useState(false);
  const fmt = (product.format ?? '').toLowerCase();
  const fmtStyle = tk.fmtBadge[fmt] ?? tk.fmtBadge._default;
  const fmtLabel =
    fmt === 'granular' ? 'Granular' :
    fmt === 'liquid'   ? 'Liquid'   :
    fmt === 'wdg'      ? 'WDG'      :
    fmt === 'wettable_powder' ? 'WP' :
    fmt === 'sc'       ? 'SC'       :
    fmt === 'spray_ready' ? 'RTU'   :
    fmt ? fmt.toUpperCase() : '';

  return (
    <div className={`border-b ${tk.divider} last:border-b-0`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center justify-between py-2.5 text-left gap-3 ${tk.rowHover}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {shopLinks === 'homedepot' ? (
            <a
              href={hdSearchUrl(product.name)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-xs ${tk.subheading} font-medium truncate underline decoration-dotted underline-offset-2 hover:opacity-70`}
            >
              {product.name}
            </a>
          ) : (
            <span className={`text-xs ${tk.subheading} font-medium truncate`}>{product.name}</span>
          )}
          {fmtLabel && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 ${fmtStyle}`}>
              {fmtLabel}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={12} className={`${tk.faint} shrink-0`} />
          : <ChevronDown size={12} className={`${tk.faint} shrink-0`} />
        }
      </button>
      {expanded && (
        <div className="pb-3 space-y-1.5 pl-1">
          {product.type && (
            <p className={`text-[10px] ${tk.faint} uppercase tracking-wide mb-1`}>{product.type.replace(/_/g,' ')}</p>
          )}
          {product.application_rate && (
            <p className={`text-xs ${tk.muted}`}>
              <span className={tk.faint}>Rate:</span> {product.application_rate}
            </p>
          )}
          {product.timing && (
            <p className={`text-xs ${tk.muted}`}>
              <span className={tk.faint}>Timing:</span> {product.timing}
            </p>
          )}
          {product.notes && (
            <p className={`text-xs ${tk.muted} leading-relaxed mt-0.5`}>{product.notes}</p>
          )}
          {product.manufacturer && (
            <p className={`text-[10px] ${tk.faint} mt-0.5`}>
              <span className={tk.faint}>Mfr:</span> {product.manufacturer}
            </p>
          )}
          {product.equivalent_product && (
            <div className={`mt-2 pt-2 border-t ${tk.divider}`}>
              <p className={`text-[10px] ${tk.faint} uppercase tracking-wide font-medium mb-0.5`}>Or equivalent</p>
              <p className={`text-xs ${tk.muted}`}>
                {shopLinks === 'homedepot' ? (
                  <a
                    href={hdSearchUrl(product.equivalent_product)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:opacity-70"
                  >
                    {product.equivalent_product}
                  </a>
                ) : product.equivalent_product}
                {product.equivalent_manufacturer && (
                  <span className={tk.faint}> ({product.equivalent_manufacturer})</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MechBlock({ icon, title, practice, tk }: { icon: ReactNode; title: string; practice: MechanicalPractice; tk: Tk }) {
  return (
    <div className="flex gap-2.5">
      <span className={`${tk.icon} mt-0.5 shrink-0`}>{icon}</span>
      <div className="space-y-0.5">
        <p className={`text-xs font-medium ${tk.body}`}>{title}</p>
        {practice.timing   && <p className={`text-xs ${tk.muted}`}>{practice.timing}</p>}
        {practice.method   && <p className={`text-xs ${tk.muted}`}>{practice.method}</p>}
        {practice.seed_type && <p className={`text-xs ${tk.muted}`}>Seed: {practice.seed_type}</p>}
        {practice.rate     && <p className={`text-xs ${tk.muted}`}>Rate: {practice.rate}</p>}
        {practice.notes    && <p className={`text-xs ${tk.faint} leading-relaxed mt-0.5`}>{practice.notes}</p>}
      </div>
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  herbicide:   'Herbicide',
  insecticide: 'Insecticide',
  fungicide:   'Fungicide',
  fertilizer:  'Fertilizer',
};

function AsWellSection({ groups, tk, shopLinks }: { groups: AsWellProductGroup[]; tk: Tk; shopLinks?: 'homedepot' }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!groups.length) return null;

  return (
    <div className={`rounded-2xl ${tk.asWellBg} border ${tk.asWellBorder} overflow-hidden`}>
      <div className={`px-4 pt-3.5 pb-1 flex items-center gap-2 border-b ${tk.divider}`}>
        <FlaskConical size={13} className={tk.icon} />
        <span className={`text-xs font-semibold ${tk.label}`}>As Well</span>
        <span className={`text-[10px] ${tk.faint} ml-0.5`}>additional products to consider</span>
      </div>
      {groups.map((group, gi) => {
        const catLabel = CATEGORY_LABEL[(group.category ?? '').toLowerCase()] ?? (group.category ?? 'Products');
        const isOpen = openIdx === gi;
        return (
          <div key={gi} className={`border-t ${tk.divider}`}>
            <button
              onClick={() => setOpenIdx(isOpen ? null : gi)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${tk.rowHover}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-semibold ${tk.body} shrink-0`}>{catLabel}</span>
                {group.label && (
                  <span className={`text-[10px] ${tk.faint} truncate`}>{group.label}</span>
                )}
              </div>
              {isOpen
                ? <ChevronUp size={12} className={`${tk.faint} shrink-0`} />
                : <ChevronDown size={12} className={`${tk.faint} shrink-0`} />}
            </button>
            {isOpen && group.products && group.products.length > 0 && (
              <div className="px-4 pb-3">
                {group.products.map((p, pi) => {
                  const fmt = (p.format ?? '').toLowerCase();
                  const fmtStyle = tk.fmtBadge[fmt] ?? tk.fmtBadge._default;
                  const fmtLabel =
                    fmt === 'granular' ? 'Granular' :
                    fmt === 'liquid'   ? 'Liquid'   :
                    fmt === 'wdg'      ? 'WDG'      :
                    fmt === 'wettable_powder' ? 'WP' :
                    fmt === 'sc'       ? 'SC'       :
                    fmt === 'spray_ready' ? 'RTU'   :
                    fmt ? fmt.toUpperCase() : '';
                  return (
                    <div key={pi} className={`border-b ${tk.divider} last:border-b-0 py-2.5`}>
                      <div className="flex items-center justify-between mb-1">
                        {shopLinks === 'homedepot' ? (
                          <a
                            href={hdSearchUrl(p.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs ${tk.subheading} font-medium underline decoration-dotted underline-offset-2 hover:opacity-70`}
                          >
                            {p.name}
                          </a>
                        ) : (
                          <span className={`text-xs ${tk.subheading} font-medium`}>{p.name}</span>
                        )}
                        {fmtLabel && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${fmtStyle}`}>
                            {fmtLabel}
                          </span>
                        )}
                      </div>
                      {p.manufacturer && <p className={`text-[10px] ${tk.faint}`}>Mfr: {p.manufacturer}</p>}
                      {p.application_rate && (
                        <p className={`text-xs ${tk.muted} mt-0.5`}><span className={tk.faint}>Rate:</span> {p.application_rate}</p>
                      )}
                      {p.timing && (
                        <p className={`text-xs ${tk.muted}`}><span className={tk.faint}>Timing:</span> {p.timing}</p>
                      )}
                      {p.equivalent_product && (
                        <p className={`text-xs ${tk.faint} mt-1`}>
                          <span className={tk.faint}>Or equivalent:</span>{' '}
                          {shopLinks === 'homedepot' ? (
                            <a
                              href={hdSearchUrl(p.equivalent_product)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline decoration-dotted underline-offset-2 hover:opacity-70"
                            >
                              {p.equivalent_product}
                            </a>
                          ) : p.equivalent_product}
                          {p.equivalent_manufacturer && ` (${p.equivalent_manufacturer})`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -- Main Export ---------------------------------------------------------------

export default function AnalysisResults({
  analysis,
  mode = 'dark',
  secondOpinionData,
  secondOpinionLoading,
  onSecondOpinion,
  shopLinks,
}: {
  analysis: AnalysisData;
  mode?: 'dark' | 'light';
  secondOpinionData?: Record<string, any> | null;
  secondOpinionLoading?: boolean;
  onSecondOpinion?: () => void;
  /** 'homedepot' = link product names to Home Depot search (HomeLawn only). Omit for ProLawn. */
  shopLinks?: 'homedepot';
}) {
  const tk = mode === 'light' ? LIGHT_TK : DARK_TK;
  const [showElaborate, setShowElaborate] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);

  if (!analysis) return null;

  if (analysis.parse_error) {
    return (
      <div className={`rounded-2xl ${tk.card} p-4`}>
        <p className={`text-xs ${tk.muted}`}>Analysis received but could not be parsed. Raw output:</p>
        <pre className={`mt-2 text-xs ${tk.faint} whitespace-pre-wrap break-words`}>{analysis.raw}</pre>
      </div>
    );
  }

  const diagnosis:         AnalysisData        = analysis.diagnosis        ?? {};
  const identified:        AnalysisData        = analysis.identified       ?? {};
  const treatment:         AnalysisData        = analysis.treatment        ?? {};
  const elaborate:         ElaborateData       = treatment.elaborate       ?? {};
  const products:          Product[]           = treatment.products        ?? [];
  const asWellGroups:      AsWellProductGroup[] = (treatment.as_well_products ?? []) as AsWellProductGroup[];
  const mechanical:        MechanicalPractices = analysis.mechanical_practices ?? {};
  const timeline:          TimelineStage[]     = analysis.timeline         ?? [];
  const prevention:        string[]            = analysis.prevention       ?? [];
  const grassType:         AnalysisData        = analysis.grass_type       ?? {};
  const locationFactors:   AnalysisData        = analysis.location_factors ?? {};
  const overviewBullets:   string[]            = analysis.overview_bullets ?? [];
  const soilProfile:       SoilProfileInfo     = analysis._soil_profile    ?? {};

  const invasiveWatch = locationFactors.invasive_watch;
  const showInvasive  = invasiveWatch && invasiveWatch.toLowerCase() !== 'null' && invasiveWatch.trim();

  const FORMAT_SORT: Record<string, number> = { granular: 0, liquid: 1, wdg: 2, wettable_powder: 2, sc: 2, spray_ready: 3 };
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

  return (
    <div className="space-y-3">

      {/* -- Issue card ------------------------------------------- */}
      <div className={`rounded-2xl ${tk.card} overflow-hidden`}>
        <div className="p-4 space-y-3">

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={diagnosis.severity} tk={tk} />

              {diagnosis.issue_type && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${tk.categoryBadge} uppercase tracking-wide font-medium`}>
                  <Tag size={9} /> {diagnosis.issue_type.replace(/_/g, ' ')}
                </span>
              )}

              {diagnosis.spread_risk && diagnosis.spread_risk !== 'none' && tk.spreadBadge[diagnosis.spread_risk] && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${tk.spreadBadge[diagnosis.spread_risk]}`}>
                  ↑ {diagnosis.spread_risk} spread
                </span>
              )}
            </div>

            <h2 className={`text-base font-semibold ${tk.heading} leading-snug`}>
              {identified.primary ?? 'Lawn Analysis'}
            </h2>

            {grassType.identified && (
              <p className={`text-[11px] ${tk.faint} flex items-center gap-1.5`}>
                <Leaf size={10} className={tk.faint} /> {grassType.identified}
              </p>
            )}
          </div>

          {overviewBullets.length > 0 && (
            <ul className="space-y-2">
              {overviewBullets.slice(0, 4).map((bullet: string, i: number) => (
                <li key={i} className={`flex items-start gap-2 text-xs ${tk.body} leading-relaxed`}>
                  <span className={`${tk.faint} mt-0.5 shrink-0 font-bold`}>•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {showInvasive && (
            <p className={`text-xs rounded-lg px-3 py-2 ${tk.invasive}`}>
              ⚠ {invasiveWatch}
            </p>
          )}

          {hasElaborate && (
            <div>
              <button
                onClick={() => setShowElaborate(e => !e)}
                className={`flex items-center gap-1.5 text-xs ${tk.btn} transition font-medium py-0.5`}
              >
                <FlaskConical size={12} />
                {showElaborate ? 'Close' : 'Elaborate'}
                {showElaborate
                  ? <ChevronUp size={12} className={tk.faint} />
                  : <ChevronDown size={12} className={tk.faint} />
                }
              </button>

              {showElaborate && (
                <div className={`mt-3 pl-3 border-l-2 ${tk.elaborateBorder}`}>
                  <ElaborateSub title="Why It Happens"     content={elaborate.why_it_happens}    tk={tk} />
                  <ElaborateSub title="How To Apply"       content={elaborate.how_to_apply}       tk={tk} />
                  <ElaborateSub title="What To Watch For"  content={elaborate.what_to_watch_for}  tk={tk} />
                  <ElaborateSub title="Common Mistakes"    content={elaborate.common_mistakes}    tk={tk} />
                  <ElaborateSub title="Long-Term Pathway"  content={elaborate.long_term_pathway}  tk={tk} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -- Products card ----------------------------------------- */}
      {sortedProducts.length > 0 && (
        <div className={`rounded-2xl ${tk.card} overflow-hidden`}>
          <div className={`px-4 pt-3.5 pb-0.5 flex items-center gap-2 border-b ${tk.divider}`}>
            <FlaskConical size={13} className={tk.icon} />
            <span className={`text-xs font-semibold ${tk.label}`}>Products</span>
            <span className={`text-[10px] ${tk.faint} ml-0.5`}>tap to expand</span>
          </div>
          <div className="px-4 pb-2">
            {sortedProducts.map((p, i) => <ProductRow key={i} product={p} tk={tk} shopLinks={shopLinks} />)}
          </div>
        </div>
      )}

      {/* -- As Well products card --------------------------------- */}
      {asWellGroups.length > 0 && (
        <AsWellSection groups={asWellGroups} tk={tk} shopLinks={shopLinks} />
      )}

      {/* -- See full plan card ----------------------------------- */}
      {hasFullPlan && (
        <div className={`rounded-2xl ${tk.card} overflow-hidden`}>
          <button
            onClick={() => setShowFullPlan(f => !f)}
            className={`w-full flex items-center justify-between px-4 py-3.5 ${tk.rowHover}`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className={tk.icon} />
              <span className={`text-sm font-semibold ${tk.body}`}>See full plan</span>
              {planParts && (
                <span className={`text-[10px] ${tk.faint}`}>{planParts}</span>
              )}
            </div>
            {showFullPlan
              ? <ChevronUp size={14} className={tk.faint} />
              : <ChevronDown size={14} className={tk.faint} />
            }
          </button>

          {showFullPlan && (
            <div className={`px-4 pb-5 pt-1 space-y-5 border-t ${tk.outerDivider}`}>

              {timeline.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={12} className={tk.icon} />
                    <span className={`text-xs font-semibold ${tk.label}`}>Timeline</span>
                  </div>
                  <div className="space-y-0">
                    {timeline.map((stage, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-2 h-2 rounded-full ${tk.timelineDot} shrink-0`} />
                          {i < timeline.length - 1 && (
                            <div className={`w-px flex-1 ${tk.timelineStem} mt-1 min-h-[20px]`} />
                          )}
                        </div>
                        <div className="pb-4">
                          {stage.stage && (
                            <p className={`text-[10px] ${tk.faint} uppercase tracking-wide font-medium leading-none mb-0.5`}>
                              {stage.stage}
                            </p>
                          )}
                          {stage.title && (
                            <p className={`text-xs ${tk.body} font-medium`}>{stage.title}</p>
                          )}
                          {stage.actions?.map((action, j) => (
                            <p key={j} className={`text-xs ${tk.muted} mt-0.5 flex items-start gap-1.5`}>
                              <span className={`${tk.faint} shrink-0 mt-0.5`}>•</span>
                              {action}
                            </p>
                          ))}
                          {stage.milestone && (
                            <p className={`mt-1 text-[10px] ${tk.faint} italic`}>✓ {stage.milestone}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prevention.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={12} className={tk.icon} />
                    <span className={`text-xs font-semibold ${tk.label}`}>Prevention</span>
                  </div>
                  <ul className="space-y-1.5">
                    {prevention.map((item, i) => (
                      <li key={i} className={`flex items-start gap-2 text-xs ${tk.muted} leading-relaxed`}>
                        <span className={`${tk.faint} mt-0.5 shrink-0`}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasMechanical && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Drill size={12} className={tk.icon} />
                    <span className={`text-xs font-semibold ${tk.label}`}>Mechanical Practices</span>
                  </div>
                  <div className="space-y-4">
                    {mechanical.aeration?.recommended && (
                      <MechBlock icon={<Activity size={11} />} title="Aeration" practice={mechanical.aeration} tk={tk} />
                    )}
                    {mechanical.dethatching?.recommended && (
                      <MechBlock icon={<Scissors size={11} />} title="Dethatching" practice={mechanical.dethatching} tk={tk} />
                    )}
                    {mechanical.seeding?.recommended && (
                      <MechBlock icon={<Wheat size={11} />} title="Seeding" practice={mechanical.seeding} tk={tk} />
                    )}
                  </div>
                </div>
              )}

              {soilProfile.label && (
                <div className={`pt-3 border-t ${tk.outerDivider}`}>
                  <p className={`text-[10px] ${tk.faint} uppercase tracking-wide font-medium mb-1.5`}>
                    Regional Soil Profile
                  </p>
                  <p className={`text-xs ${tk.body}`}>{soilProfile.label}</p>
                  {soilProfile.notes && (
                    <p className={`text-xs ${tk.muted} mt-0.5 leading-relaxed`}>{soilProfile.notes}</p>
                  )}
                  <div className="flex gap-4 mt-1.5">
                    {soilProfile.fertFrequency && (
                      <p className={`text-[10px] ${tk.faint}`}>Fert frequency: {soilProfile.fertFrequency}</p>
                    )}
                    {soilProfile.drainageClass && (
                      <p className={`text-[10px] ${tk.faint}`}>Drainage: {soilProfile.drainageClass}</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* -- Second Opinion --------------------------------------- */}
      {onSecondOpinion && (
        <div className="mt-6">
          {!secondOpinionData && (
            <button
              onClick={onSecondOpinion}
              disabled={secondOpinionLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border ${tk.outerDivider} ${mode === 'light' ? 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900' : 'bg-field-900/40 hover:bg-field-800/60 border-field-700/60 text-field-300 hover:text-field-100'} text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {secondOpinionLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Getting second opinion...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Get Second Opinion</span>
                </>
              )}
            </button>
          )}

          {secondOpinionData && (
            <div className="space-y-3">
              {secondOpinionData.second_opinion_reasoning && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-[10px] text-amber-500 uppercase tracking-widest font-semibold mb-1.5">
                    Why Second Opinion Was Selected
                  </p>
                  <p className={`text-sm ${mode === 'light' ? 'text-amber-800' : 'text-amber-100/80'} leading-relaxed`}>
                    {secondOpinionData.second_opinion_reasoning}
                  </p>
                </div>
              )}
              <div className={`rounded-xl border ${tk.outerDivider} overflow-hidden`}>
                <div className={`px-4 py-2.5 border-b ${tk.divider} flex items-center gap-2`}>
                  <span className={`text-[10px] ${tk.faint} uppercase tracking-widest font-semibold`}>Second Opinion Analysis</span>
                </div>
                <div className="p-1">
                  <AnalysisResults analysis={secondOpinionData as AnalysisData} mode={mode} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
