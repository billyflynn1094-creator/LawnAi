'use client';

import {
  AlertTriangle,
  FlaskConical,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';

/** Build a Home Depot search-results URL for a product name. */
function hdSearchUrl(name: string): string {
  return `https://www.homedepot.com/s/${encodeURIComponent(name)}`;
}

// -- Types --------------------------------------------------------------------

interface Product {
  name: string;
  manufacturer?: string;
  equivalent_product?: string;
  equivalent_manufacturer?: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = Record<string, any>;

// -- Theme tokens -------------------------------------------------------------

interface Tk {
  card: string;
  divider: string;
  outerDivider: string;
  heading: string;
  subheading: string;
  body: string;
  muted: string;
  faint: string;
  label: string;
  rowHover: string;
  btn: string;
  tileHeaderBg: string;
  fmtBadge: Record<string, string>;
  severityBadge: Record<string, string>;
  confidenceBadge: Record<string, string>;
}

const DARK_TK: Tk = {
  card:            'bg-soil-800/60 border border-field-800/40',
  divider:         'border-field-800/30',
  outerDivider:    'border-field-800/40',
  heading:         'text-field-100',
  subheading:      'text-field-200',
  body:            'text-field-300',
  muted:           'text-field-400',
  faint:           'text-field-500',
  label:           'text-field-300 uppercase tracking-wide',
  rowHover:        'hover:bg-field-800/10',
  btn:             'text-field-400 hover:text-field-200',
  tileHeaderBg:    'bg-soil-900/60',
  fmtBadge: {
    granular:        'bg-straw-400/20 text-straw-200 border border-straw-500/30',
    liquid:          'bg-blue-900/30 text-blue-300 border border-blue-700/30',
    wdg:             'bg-purple-900/30 text-purple-300 border border-purple-700/30',
    wettable_powder: 'bg-purple-900/30 text-purple-300 border border-purple-700/30',
    sc:              'bg-blue-900/30 text-blue-300 border border-blue-700/30',
    _default:        'bg-field-800/40 text-field-400 border border-field-700/30',
  },
  severityBadge: {
    critical: 'bg-red-900/40 text-red-300 border border-red-700/40',
    moderate: 'bg-orange-900/40 text-orange-300 border border-orange-700/40',
    mild:     'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
    none:     'bg-field-900/40 text-field-400 border border-field-700/40',
  },
  confidenceBadge: {
    high:   'bg-green-900/30 text-green-300 border border-green-700/30',
    medium: 'bg-amber-900/30 text-amber-300 border border-amber-700/30',
    low:    'bg-red-900/30 text-red-300 border border-red-700/30',
  },
};

const LIGHT_TK: Tk = {
  card:            'bg-white border border-gray-200 shadow-sm',
  divider:         'border-gray-100',
  outerDivider:    'border-gray-200',
  heading:         'text-gray-900',
  subheading:      'text-gray-800',
  body:            'text-gray-700',
  muted:           'text-gray-600',
  faint:           'text-gray-400',
  label:           'text-gray-500 uppercase tracking-wide',
  rowHover:        'hover:bg-gray-50 transition-colors',
  btn:             'text-orange-500 hover:text-orange-600',
  tileHeaderBg:    'bg-gray-50',
  fmtBadge: {
    granular:        'bg-amber-50 text-amber-700 border border-amber-200',
    liquid:          'bg-blue-50 text-blue-600 border border-blue-200',
    wdg:             'bg-purple-50 text-purple-600 border border-purple-200',
    wettable_powder: 'bg-purple-50 text-purple-600 border border-purple-200',
    sc:              'bg-blue-50 text-blue-600 border border-blue-200',
    _default:        'bg-gray-100 text-gray-600 border border-gray-200',
  },
  severityBadge: {
    critical: 'bg-red-50 text-red-600 border border-red-200',
    moderate: 'bg-orange-50 text-orange-600 border border-orange-200',
    mild:     'bg-yellow-50 text-yellow-600 border border-yellow-200',
    none:     'bg-gray-50 text-gray-500 border border-gray-200',
  },
  confidenceBadge: {
    high:   'bg-green-50 text-green-700 border border-green-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    low:    'bg-red-50 text-red-600 border border-red-200',
  },
};

// -- Small shared pieces --------------------------------------------------------

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}

/** A single tile shell: header (icon+title+badges, always visible) wrapping
 *  a tight bullet summary, with a bottom "Elaborate" toggle for deep detail. */
function Tile({
  icon,
  title,
  badges,
  tk,
  children,
  elaborate,
  elaborateLabel = 'Elaborate for full detail',
}: {
  icon: React.ReactNode;
  title: string;
  badges?: React.ReactNode;
  tk: Tk;
  children: React.ReactNode;
  elaborate?: React.ReactNode;
  elaborateLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl overflow-hidden ${tk.card}`}>
      <div className={`flex items-center justify-between gap-2 px-4 py-3 ${tk.tileHeaderBg} border-b ${tk.divider}`}>
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h3 className={`text-sm font-bold ${tk.heading}`}>{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">{badges}</div>
      </div>

      <div className="px-4 py-3">{children}</div>

      {elaborate && (
        <div className={`border-t ${tk.divider}`}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold ${tk.btn} transition`}
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {open ? 'Show less' : elaborateLabel}
          </button>
          {open && <div className="px-4 pb-4">{elaborate}</div>}
        </div>
      )}
    </div>
  );
}

function Bullet({ tk, children }: { tk: Tk; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2 text-xs leading-relaxed ${tk.body}`}>
      <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${tk.faint === 'text-gray-400' ? 'bg-gray-400' : 'bg-field-500'}`} />
      <span>{children}</span>
    </li>
  );
}

function ProductLine({ product, tk, shopLinks }: { product: Product; tk: Tk; shopLinks?: 'homedepot' }) {
  const fmt = (product.format ?? '').toLowerCase();
  const fmtStyle = tk.fmtBadge[fmt] ?? tk.fmtBadge._default;
  const fmtLabel =
    fmt === 'granular' ? 'Granular' :
    fmt === 'liquid'   ? 'Liquid'   :
    fmt === 'wdg'      ? 'WDG'      :
    fmt === 'wettable_powder' ? 'WP' :
    fmt === 'sc'       ? 'SC'       :
    fmt ? fmt.toUpperCase() : '';

  return (
    <li className={`flex items-center justify-between gap-2 py-1.5 border-b ${tk.divider} last:border-b-0`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`mt-0 w-1 h-1 rounded-full shrink-0 ${tk.faint === 'text-gray-400' ? 'bg-gray-400' : 'bg-field-500'}`} />
        {shopLinks === 'homedepot' ? (
          <a
            href={hdSearchUrl(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${tk.subheading} font-medium truncate underline decoration-dotted underline-offset-2 hover:opacity-70`}
          >
            {product.name}
          </a>
        ) : (
          <span className={`text-xs ${tk.subheading} font-medium truncate`}>{product.name}</span>
        )}
      </div>
      {fmtLabel && <Badge label={fmtLabel} style={fmtStyle} />}
    </li>
  );
}

function ProductDetail({ product, tk, shopLinks }: { product: Product; tk: Tk; shopLinks?: 'homedepot' }) {
  return (
    <div className={`py-2 border-b ${tk.divider} last:border-b-0`}>
      <p className={`text-xs font-semibold ${tk.subheading} mb-1`}>{product.name}</p>
      <div className="space-y-1">
        {product.application_rate && (
          <p className={`text-[11px] ${tk.muted}`}><span className={tk.faint}>Rate:</span> {product.application_rate}</p>
        )}
        {product.timing && (
          <p className={`text-[11px] ${tk.muted}`}><span className={tk.faint}>Timing:</span> {product.timing}</p>
        )}
        {product.notes && <p className={`text-[11px] ${tk.muted} leading-relaxed`}>{product.notes}</p>}
        {product.manufacturer && (
          <p className={`text-[10px] ${tk.faint}`}>Mfr: {product.manufacturer}</p>
        )}
        {product.equivalent_product && (
          <p className={`text-[10px] ${tk.faint}`}>
            Or equivalent:{' '}
            {shopLinks === 'homedepot' ? (
              <a href={hdSearchUrl(product.equivalent_product)} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
                {product.equivalent_product}
              </a>
            ) : product.equivalent_product}
            {product.equivalent_manufacturer ? ` (${product.equivalent_manufacturer})` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function mechLine(name: string, m?: MechanicalPractice): string | null {
  if (!m || !m.recommended) return null;
  const parts = [name];
  if (m.timing) parts.push(`— ${m.timing}`);
  return parts.join(' ');
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondOpinionData?: Record<string, any> | null;
  secondOpinionLoading?: boolean;
  onSecondOpinion?: () => void;
  shopLinks?: 'homedepot';
}) {
  const tk = mode === 'light' ? LIGHT_TK : DARK_TK;

  if (!analysis) return null;

  if (analysis.parse_error) {
    return (
      <div className={`rounded-2xl ${tk.card} p-4`}>
        <p className={`text-xs ${tk.muted}`}>Analysis received but could not be parsed. Raw output:</p>
        <pre className={`mt-2 text-xs ${tk.faint} whitespace-pre-wrap break-words`}>{analysis.raw}</pre>
      </div>
    );
  }

  const diagnosis:        AnalysisData      = analysis.diagnosis        ?? {};
  const identified:       AnalysisData      = analysis.identified       ?? {};
  const grassType:        AnalysisData      = analysis.grass_type       ?? {};
  const locationFactors:  AnalysisData      = analysis.location_factors ?? {};
  const treatment:        AnalysisData      = analysis.treatment        ?? {};
  const elaborateData:    AnalysisData      = treatment.elaborate       ?? {};
  const products:         Product[]         = treatment.products        ?? [];
  const asWellGroups:     AsWellProductGroup[] = treatment.as_well_products ?? [];
  const culturalPractices: string[]         = treatment.cultural_practices ?? [];
  const mechanical:       AnalysisData      = analysis.mechanical_practices ?? {};
  const timeline:         TimelineStage[]   = analysis.timeline         ?? [];
  const prevention:       string[]          = analysis.prevention       ?? [];
  const ruledOut:         AnalysisData[]    = analysis.ruled_out        ?? [];
  const treeRootFactor:   string | undefined = analysis.tree_root_factor;
  const overviewBullets:  string[]          = analysis.overview_bullets ?? [];
  const confidence:       string            = (analysis.confidence_level ?? '').toLowerCase();
  const professionalNeeded = analysis.professional_needed === true;
  const soilProfile:      AnalysisData | undefined = analysis._soil_profile;

  const severity = (diagnosis.severity ?? '').toLowerCase();
  const severityStyle = tk.severityBadge[severity] ?? tk.severityBadge.none;
  const confidenceStyle = tk.confidenceBadge[confidence] ?? tk.confidenceBadge.medium;

  const primaryProductCount = products.length;
  const asWellCount = asWellGroups.reduce((n, g) => n + (g.products?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">

      {/* Confidence banner — surfaced above tiles so it's never missed */}
      {confidence && (
        <div className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 ${tk.card}`}>
          <span className={`text-xs font-medium ${tk.muted}`}>
            Diagnostic confidence
          </span>
          <Badge label={confidence.charAt(0).toUpperCase() + confidence.slice(1)} style={confidenceStyle} />
        </div>
      )}

      {professionalNeeded && (
        <div className={`rounded-xl px-3 py-2.5 flex items-start gap-2 ${mode === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800/40'}`}>
          <ShieldAlert size={15} className={mode === 'light' ? 'text-red-500 shrink-0 mt-0.5' : 'text-red-400 shrink-0 mt-0.5'} />
          <p className={`text-xs ${mode === 'light' ? 'text-red-700' : 'text-red-300'}`}>
            This issue is recommended for evaluation by a licensed professional.
          </p>
        </div>
      )}

      {/* ============================= TILE 1 — FINDINGS ============================= */}
      <Tile
        icon={<AlertTriangle size={16} className={severity === 'critical' ? 'text-red-500' : severity === 'moderate' ? 'text-orange-500' : tk.faint} />}
        title="Findings"
        badges={severity && <Badge label={severity.charAt(0).toUpperCase() + severity.slice(1)} style={severityStyle} />}
        tk={tk}
        elaborateLabel="Elaborate on findings"
        elaborate={
          <div className="space-y-3">
            {elaborateData.why_it_happens && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>Why it happens</p>
                <p className={`text-xs ${tk.muted} leading-relaxed`}>{elaborateData.why_it_happens}</p>
              </div>
            )}
            {elaborateData.what_to_watch_for && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>What to watch for</p>
                <p className={`text-xs ${tk.muted} leading-relaxed`}>{elaborateData.what_to_watch_for}</p>
              </div>
            )}
            {elaborateData.common_mistakes && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>Common mistakes</p>
                <p className={`text-xs ${tk.muted} leading-relaxed`}>{elaborateData.common_mistakes}</p>
              </div>
            )}
            {elaborateData.long_term_pathway && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>Long-term pathway</p>
                <p className={`text-xs ${tk.muted} leading-relaxed`}>{elaborateData.long_term_pathway}</p>
              </div>
            )}
            {locationFactors.invasive_watch && (
              <div className={`rounded-lg px-3 py-2 ${mode === 'light' ? 'bg-orange-50 border border-orange-200' : 'bg-orange-900/20 border border-orange-800/30'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${mode === 'light' ? 'text-orange-700' : 'text-orange-300'}`}>Regional invasive watch</p>
                <p className={`text-xs ${mode === 'light' ? 'text-orange-700' : 'text-orange-300/90'}`}>{locationFactors.invasive_watch}</p>
              </div>
            )}
            {ruledOut.length > 0 && (
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>Other possibilities considered</p>
                <ul className="space-y-1">
                  {ruledOut.map((r, i) => (
                    <li key={i} className={`text-xs ${tk.muted} leading-relaxed`}>
                      <span className={`font-medium ${tk.subheading}`}>{r.cause ?? r.category ?? 'Alternative'}:</span>{' '}
                      {r.reason ?? r.why ?? '—'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Second opinion */}
            <div className={`pt-2 border-t ${tk.divider}`}>
              {secondOpinionData ? (
                <div className={`rounded-lg px-3 py-2 ${mode === 'light' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-800/30'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${mode === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>Second opinion</p>
                  <p className={`text-xs ${mode === 'light' ? 'text-blue-700' : 'text-blue-300/90'} leading-relaxed`}>
                    {secondOpinionData.second_opinion_reasoning ?? 'Independent review agrees with the original diagnosis.'}
                  </p>
                </div>
              ) : onSecondOpinion ? (
                <button
                  onClick={onSecondOpinion}
                  disabled={secondOpinionLoading}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${mode === 'light' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-field-800/40 hover:bg-field-800/60 text-field-300'} disabled:opacity-50`}
                >
                  {secondOpinionLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {secondOpinionLoading ? 'Getting second opinion…' : 'Get a second opinion'}
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        <ul className="space-y-1.5">
          {identified.primary && (
            <Bullet tk={tk}><span className={`font-semibold ${tk.subheading}`}>{identified.primary}</span></Bullet>
          )}
          {grassType.identified && (
            <Bullet tk={tk}>Grass type: <span className={tk.subheading}>{grassType.identified}</span></Bullet>
          )}
          {diagnosis.cause && <Bullet tk={tk}>{diagnosis.cause}</Bullet>}
          {treeRootFactor && <Bullet tk={tk}>Tree root factor: {treeRootFactor}</Bullet>}
          {locationFactors.relevant_notes && <Bullet tk={tk}>{locationFactors.relevant_notes}</Bullet>}
          {overviewBullets.slice(0, 2).map((b: string, i: number) => (
            <Bullet key={i} tk={tk}>{b}</Bullet>
          ))}
          {diagnosis.spread_risk && diagnosis.spread_risk !== 'none' && (
            <Bullet tk={tk}>Spread risk: <span className="font-medium">{diagnosis.spread_risk}</span></Bullet>
          )}
        </ul>
      </Tile>

      {/* ======================= TILE 2 — SUGGESTED PRODUCTS ======================= */}
      {(primaryProductCount > 0 || culturalPractices.length > 0) && (
        <Tile
          icon={<FlaskConical size={16} className={tk.faint} />}
          title="Suggested Products"
          badges={primaryProductCount > 0 && <span className={`text-[10px] ${tk.faint}`}>{primaryProductCount} item{primaryProductCount === 1 ? '' : 's'}</span>}
          tk={tk}
          elaborateLabel="Elaborate on application"
          elaborate={
            <div className="space-y-3">
              {products.map((p, i) => <ProductDetail key={i} product={p} tk={tk} shopLinks={shopLinks} />)}
              {asWellGroups.map((g, gi) => (
                <div key={gi}>
                  {g.label && <p className={`text-[11px] ${tk.faint} italic mb-1`}>As well — {g.label}</p>}
                  {(g.products ?? []).map((p, i) => <ProductDetail key={i} product={p} tk={tk} shopLinks={shopLinks} />)}
                </div>
              ))}
              {treatment.immediate_actions?.length > 0 && (
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>Immediate actions</p>
                  <ul className="space-y-1">
                    {treatment.immediate_actions.map((a: string, i: number) => <Bullet key={i} tk={tk}>{a}</Bullet>)}
                  </ul>
                </div>
              )}
            </div>
          }
        >
          <ul>
            {products.map((p, i) => <ProductLine key={i} product={p} tk={tk} shopLinks={shopLinks} />)}
          </ul>
          {asWellCount > 0 && (
            <p className={`text-[11px] ${tk.faint} italic mt-2`}>
              As well — {asWellCount} supplementary product{asWellCount === 1 ? '' : 's'} for {asWellGroups.map(g => g.category).filter(Boolean).join(', ')}
            </p>
          )}
          {culturalPractices.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {culturalPractices.map((c: string, i: number) => <Bullet key={`cp-${i}`} tk={tk}>{c}</Bullet>)}
            </ul>
          )}
        </Tile>
      )}

      {/* ===================== TILE 3 — TIMELINE / CALENDAR ===================== */}
      {(timeline.length > 0 || mechanical.aeration || mechanical.dethatching || mechanical.seeding) && (
        <Tile
          icon={<Calendar size={16} className={tk.faint} />}
          title="Timeline"
          tk={tk}
          elaborateLabel="Elaborate on schedule"
          elaborate={
            <div className="space-y-3">
              {timeline.map((stage, i) => (
                <div key={i} className={`pb-2 border-b ${tk.divider} last:border-b-0`}>
                  <p className={`text-xs font-semibold ${tk.subheading}`}>{stage.stage}{stage.title ? ` — ${stage.title}` : ''}</p>
                  {stage.actions?.map((a, ai) => (
                    <p key={ai} className={`text-[11px] ${tk.muted} mt-0.5`}>• {a}</p>
                  ))}
                  {stage.milestone && <p className={`text-[11px] ${tk.faint} italic mt-1`}>Milestone: {stage.milestone}</p>}
                </div>
              ))}
              {mechanical.aeration?.notes && (
                <div><p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-0.5`}>Aeration notes</p><p className={`text-xs ${tk.muted}`}>{mechanical.aeration.notes}</p></div>
              )}
              {mechanical.dethatching?.notes && (
                <div><p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-0.5`}>Dethatching notes</p><p className={`text-xs ${tk.muted}`}>{mechanical.dethatching.notes}</p></div>
              )}
              {mechanical.seeding?.notes && (
                <div><p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-0.5`}>Seeding notes</p><p className={`text-xs ${tk.muted}`}>{mechanical.seeding.notes}</p></div>
              )}
              {prevention.length > 0 && (
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${tk.label} mb-1`}>Prevention</p>
                  <ul className="space-y-1">{prevention.map((p: string, i: number) => <Bullet key={i} tk={tk}>{p}</Bullet>)}</ul>
                </div>
              )}
              {analysis.follow_up && (
                <p className={`text-xs ${tk.muted}`}><span className={`font-semibold ${tk.subheading}`}>Follow up:</span> {analysis.follow_up}</p>
              )}
              {soilProfile?.notes && (
                <p className={`text-[11px] ${tk.faint}`}>Soil profile ({soilProfile.label}): {soilProfile.notes}</p>
              )}
            </div>
          }
        >
          <ul className="space-y-1.5">
            {timeline.slice(0, 4).map((stage, i) => (
              <Bullet key={i} tk={tk}>
                <span className={`font-semibold ${tk.subheading}`}>{stage.stage}</span>
                {stage.milestone ? ` — ${stage.milestone}` : stage.title ? ` — ${stage.title}` : ''}
              </Bullet>
            ))}
            {[
              mechLine('Aeration', mechanical.aeration),
              mechLine('Dethatching', mechanical.dethatching),
              mechLine('Seeding', mechanical.seeding),
            ].filter(Boolean).map((line, i) => (
              <Bullet key={`mech-${i}`} tk={tk}>{line}</Bullet>
            ))}
          </ul>
        </Tile>
      )}
    </div>
  );
}
