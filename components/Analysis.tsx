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
  Sprout,
  Drill,
  Scissors,
  Wheat,
  CircleCheck,
  CircleX,
  HelpCircle,
  Eye,
  TrendingUp,
  BookOpen,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import TimelineComponent from '@/components/Timeline';

// ── Type definitions ────────────────────────────────────────────────────────

interface ElaborateData {
  why_it_happens?: string;
  how_to_apply?: string;
  what_to_watch_for?: string;
  common_mistakes?: string;
  long_term_pathway?: string;
}

interface GrassType {
  identified: string;
  notes: string;
}

interface TimelineStage {
  stage: string;
  title: string;
  actions: string[];
  products: string[];
  milestone: string;
}

interface Product {
  name: string;
  sku?: string;
  catalog_name?: string;
  format?: 'granular' | 'liquid' | 'wettable_powder' | 'spray_ready';
  type: string;
  application_rate: string;
  timing: string;
  notes: string;
}

interface SoilProfileInfo {
  label: string;
  notes: string;
  fertFrequency: string;
  drainageClass: string;
}

interface MechanicalPractice {
  recommended: boolean;
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

interface Analysis {
  overview_bullets?: string[];
  grass_type?: GrassType;
  identified: { primary: string; description: string };
  diagnosis: {
    issue_type: string;
    severity: string;
    cause: string;
    spread_risk: string;
  };
  location_factors: { relevant_notes: string; invasive_watch: string | null };
  treatment: {
    immediate_actions: string[];
    elaborate?: ElaborateData;
    products: Product[];
    cultural_practices: string[];
  };
  mechanical_practices?: MechanicalPractices;
  timeline?: TimelineStage[];
  prevention: string[];
  follow_up: string;
  professional_needed: boolean;
  _soil_profile?: SoilProfileInfo;
  raw?: string;
  parse_error?: boolean;
}

interface AnalysisProps {
  analysis: Analysis | null;
}

// ── Style maps ──────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-900/30',
  moderate: 'text-straw-300 bg-straw-400/20',
  mild: 'text-field-300 bg-field-800/40',
  none: 'text-field-400 bg-field-900/40',
};

const PRODUCT_BADGE: Record<string, string> = {
  herbicide: 'bg-rust-500/20 text-rust-300',
  fungicide: 'bg-purple-900/40 text-purple-300',
  pesticide: 'bg-orange-900/40 text-orange-300',
  fertilizer: 'bg-field-800/60 text-field-300',
  amendment: 'bg-straw-400/20 text-straw-300',
  organic: 'bg-emerald-900/40 text-emerald-300',
};

const FORMAT_BADGE: Record<string, string> = {
  granular: 'bg-straw-400/25 text-straw-200 border border-straw-500/30',
  liquid: 'bg-blue-900/30 text-blue-300 border border-blue-700/30',
  wettable_powder: 'bg-purple-900/30 text-purple-300 border border-purple-700/30',
  spray_ready: 'bg-field-800/40 text-field-300 border border-field-700/30',
};

const FORMAT_LABEL: Record<string, string> = {
  granular: 'Granular',
  liquid: 'Liquid',
  wettable_powder: 'Wettable Powder',
  spray_ready: 'Spray-Ready',
};

const DRAINAGE_BADGE: Record<string, string> = {
  rapid: 'text-sky-300 bg-sky-900/30',
  moderate: 'text-field-300 bg-field-800/40',
  slow: 'text-straw-300 bg-straw-400/20',
};

// ── Reusable components ─────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-field-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-soil-800/60 hover:bg-soil-700/60 transition"
      >
        <span className="flex items-center gap-2 text-field-200 text-sm font-medium">
          {icon} {title}
        </span>
        {open ? <ChevronUp size={15} className="text-field-500" /> : <ChevronDown size={15} className="text-field-500" />}
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  );
}

/** Single sub-section inside an Elaborate panel (individually collapsible) */
function ElaborateSub({ icon, label, content }: { icon: React.ReactNode; label: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-field-800/30 first:border-t-0 pt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-1.5 text-xs text-field-400 hover:text-field-200 transition"
      >
        <span className="flex items-center gap-1.5 font-medium">{icon} {label}</span>
        {open ? <ChevronUp size={11} className="shrink-0" /> : <ChevronDown size={11} className="shrink-0" />}
      </button>
      {open && (
        <p className="text-field-300 text-xs leading-relaxed pb-2 pl-4">{content}</p>
      )}
    </div>
  );
}

/** Elaborate expandable block — appears at the bottom of any section that has it */
function Elaborate({ data }: { data: ElaborateData }) {
  const [open, setOpen] = useState(false);
  const entries: Array<{ key: keyof ElaborateData; label: string; icon: React.ReactNode }> = [
    { key: 'why_it_happens', label: 'Why It Happens', icon: <HelpCircle size={11} /> },
    { key: 'how_to_apply', label: 'How To Apply', icon: <ChevronRight size={11} /> },
    { key: 'what_to_watch_for', label: 'What To Watch For', icon: <Eye size={11} /> },
    { key: 'common_mistakes', label: 'Common Mistakes', icon: <AlertTriangle size={11} /> },
    { key: 'long_term_pathway', label: 'Long-Term Pathway', icon: <TrendingUp size={11} /> },
  ];
  const available = entries.filter(e => !!data[e.key]);
  if (!available.length) return null;

  return (
    <div className="mt-3 pt-2 border-t border-field-800/30">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-field-500 hover:text-field-300 transition"
      >
        <BookOpen size={11} />
        <span>{open ? 'Close' : 'Elaborate'}</span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div className="mt-2 bg-soil-900/70 rounded-lg px-3 py-1">
          {available.map(e => (
            <ElaborateSub key={e.key} icon={e.icon} label={e.label} content={data[e.key]!} />
          ))}
        </div>
      )}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-field-300">
          <span className="text-field-500 shrink-0 mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MechanicalRow({
  icon,
  label,
  practice,
}: {
  icon: React.ReactNode;
  label: string;
  practice: MechanicalPractice | undefined;
}) {
  if (!practice) return null;
  return (
    <div className="rounded-xl bg-soil-900/50 border border-field-800/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-field-400">{icon}</span>
          <span className="text-field-200 text-sm font-medium">{label}</span>
        </div>
        {practice.recommended ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-field-800/60 text-field-300">
            <CircleCheck size={11} /> Recommended now
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-soil-700/60 text-field-500">
            <CircleX size={11} /> Not recommended now
          </span>
        )}
      </div>
      {practice.timing && (
        <div className="flex items-start gap-1.5">
          <Calendar size={11} className="text-straw-400 mt-0.5 shrink-0" />
          <p className="text-straw-300 text-xs">{practice.timing}</p>
        </div>
      )}
      {practice.method && (
        <p className="text-field-400 text-xs">
          <span className="text-field-600 uppercase tracking-wide text-[10px] mr-1">Method:</span>
          {practice.method}
        </p>
      )}
      {practice.seed_type && (
        <p className="text-field-400 text-xs">
          <span className="text-field-600 uppercase tracking-wide text-[10px] mr-1">Seed type:</span>
          {practice.seed_type}
        </p>
      )}
      {practice.rate && (
        <p className="text-field-400 text-xs">
          <span className="text-field-600 uppercase tracking-wide text-[10px] mr-1">Rate:</span>
          {practice.rate}
        </p>
      )}
      {practice.notes && (
        <p className="text-field-500 text-xs pt-1 border-t border-field-800/30">{practice.notes}</p>
      )}
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export default function AnalysisResults({ analysis }: AnalysisProps) {
  if (!analysis) return null;

  if (analysis.parse_error) {
    return (
      <div className="rounded-2xl bg-soil-800 border border-field-800/50 p-4">
        <p className="text-field-200 text-sm whitespace-pre-wrap">{analysis.raw}</p>
      </div>
    );
  }

  const sevClass = SEVERITY_COLOR[analysis.diagnosis?.severity] ?? SEVERITY_COLOR.none;
  const mp = analysis.mechanical_practices;
  const hasMechanical = mp && (mp.aeration || mp.dethatching || mp.seeding);
  const invasiveWatch = analysis.location_factors?.invasive_watch;
  const showInvasive = invasiveWatch && invasiveWatch.toLowerCase() !== 'null';

  // Sort products: catalog items first, then granular, then liquid
  const sortedProducts = [...(analysis.treatment?.products ?? [])].sort((a, b) => {
    const aScore = (a.sku ? 10 : 0) + (a.format === 'granular' ? 1 : 0);
    const bScore = (b.sku ? 10 : 0) + (b.format === 'granular' ? 1 : 0);
    return bScore - aScore;
  });

  return (
    <div className="space-y-3">
      {/* Professional alert */}
      {analysis.professional_needed && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/30 border border-red-700/40">
          <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
          <p className="text-red-300 text-sm">
            This issue may require a certified lawn care professional. Confirm with a local expert before applying pesticides or herbicides.
          </p>
        </div>
      )}

      {/* ── Main issue card ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-soil-800 border border-field-800/50 p-4 space-y-3">
        {/* Title + severity */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-field-100 font-display text-lg leading-tight">
            {analysis.identified?.primary}
          </h2>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${sevClass}`}>
            {analysis.diagnosis?.severity}
          </span>
        </div>

        {/* Overview bullets (replaces generic description paragraph) */}
        {analysis.overview_bullets && analysis.overview_bullets.length > 0 ? (
          <BulletList items={analysis.overview_bullets} />
        ) : (
          <p className="text-field-400 text-sm leading-relaxed">{analysis.identified?.description}</p>
        )}

        {/* Tags — issue type and spread risk only (no confidence) */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-soil-700 text-field-300">
            {analysis.diagnosis?.issue_type?.replace(/_/g, ' ')}
          </span>
          {analysis.diagnosis?.spread_risk && analysis.diagnosis.spread_risk !== 'none' && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-soil-700 text-field-300">
              Spread risk: {analysis.diagnosis.spread_risk}
            </span>
          )}
        </div>

        {/* Location context */}
        {analysis.location_factors?.relevant_notes && (
          <p className="text-field-500 text-xs leading-relaxed pt-1 border-t border-field-800/40">
            {analysis.location_factors.relevant_notes}
          </p>
        )}
        {showInvasive && (
          <p className="text-rust-300 text-xs flex items-start gap-1.5">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {invasiveWatch}
          </p>
        )}
      </div>

      {/* ── Grass type ───────────────────────────────────────────────── */}
      {analysis.grass_type && (
        <div className="rounded-xl bg-field-900/50 border border-field-700/40 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Sprout size={15} className="text-field-400 shrink-0" />
            <p className="text-field-400 text-xs font-medium uppercase tracking-wide">
              Grass Type Identified
            </p>
          </div>
          <p className="text-field-100 font-display text-base">
            {analysis.grass_type.identified}
          </p>
          {analysis.grass_type.notes && (
            <p className="text-field-400 text-xs leading-relaxed">{analysis.grass_type.notes}</p>
          )}
        </div>
      )}

      {/* ── Soil profile ─────────────────────────────────────────────── */}
      {analysis._soil_profile && (
        <div className="rounded-xl bg-soil-800/60 border border-field-800/40 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-straw-400 shrink-0" />
              <p className="text-field-400 text-xs font-medium uppercase tracking-wide">
                Regional Soil Profile
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DRAINAGE_BADGE[analysis._soil_profile.drainageClass] ?? 'text-field-400'}`}>
              {analysis._soil_profile.drainageClass} drainage
            </span>
          </div>
          <p className="text-field-200 text-sm font-medium">{analysis._soil_profile.label}</p>
          <p className="text-field-400 text-xs">{analysis._soil_profile.notes}</p>
          <p className="text-field-500 text-xs">
            Fertilizer schedule: {analysis._soil_profile.fertFrequency} — recommend a professional soil test for precision rates.
          </p>
        </div>
      )}

      {/* ── Immediate actions + Elaborate ───────────────────────────── */}
      {analysis.treatment?.immediate_actions?.length > 0 && (
        <Section
          title="Immediate Actions"
          icon={<CheckCircle size={15} className="text-field-400" />}
        >
          <ol className="space-y-2">
            {analysis.treatment.immediate_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-field-300">
                <span className="text-field-500 text-xs mt-0.5 shrink-0 font-medium">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ol>
          {analysis.treatment.elaborate && (
            <Elaborate data={analysis.treatment.elaborate} />
          )}
        </Section>
      )}

      {/* ── Products ─────────────────────────────────────────────────── */}
      {sortedProducts.length > 0 && (
        <Section
          title="Recommended Products"
          icon={<FlaskConical size={15} className="text-straw-300" />}
        >
          <div className="space-y-3">
            {sortedProducts.map((p, i) => (
              <div key={i} className="rounded-xl bg-soil-900/60 border border-field-800/30 p-3 space-y-1.5">
                {/* Product header */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-field-100 text-sm font-medium leading-snug">{p.name}</span>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {p.format && FORMAT_LABEL[p.format] && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FORMAT_BADGE[p.format] ?? ''}`}>
                        {FORMAT_LABEL[p.format]}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRODUCT_BADGE[p.type] ?? 'bg-soil-700 text-field-300'}`}>
                      {p.type}
                    </span>
                  </div>
                </div>
                {/* SKU */}
                {p.sku ? (
                  <div className="flex items-center gap-1.5">
                    <Tag size={11} className="text-straw-500" />
                    <span className="text-xs text-straw-300 font-mono">SKU: {p.sku}</span>
                    {p.catalog_name && p.catalog_name !== p.name && (
                      <span className="text-xs text-field-600">({p.catalog_name})</span>
                    )}
                  </div>
                ) : (
                  <p className="text-field-600 text-xs italic">General recommendation — source locally</p>
                )}
                {/* Rate + timing grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                  <div>
                    <p className="text-field-600 text-[10px] uppercase tracking-wide">Rate</p>
                    <p className="text-field-300 text-xs">{p.application_rate}</p>
                  </div>
                  <div>
                    <p className="text-field-600 text-[10px] uppercase tracking-wide">Timing</p>
                    <p className="text-field-300 text-xs">{p.timing}</p>
                  </div>
                </div>
                {p.notes && (
                  <p className="text-field-500 text-xs pt-1 border-t border-field-800/30">{p.notes}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Mechanical practices ─────────────────────────────────────── */}
      {hasMechanical && (
        <Section
          title="Aeration, Dethatching & Seeding"
          icon={<Drill size={15} className="text-straw-300" />}
        >
          <div className="space-y-3">
            <MechanicalRow icon={<Drill size={14} />} label="Aeration" practice={mp?.aeration} />
            <MechanicalRow icon={<Scissors size={14} />} label="Dethatching" practice={mp?.dethatching} />
            <MechanicalRow icon={<Wheat size={14} />} label="Seeding" practice={mp?.seeding} />
          </div>
        </Section>
      )}

      {/* ── Treatment timeline ───────────────────────────────────────── */}
      {analysis.timeline && analysis.timeline.length > 0 && (
        <Section
          title="Treatment Timeline"
          icon={<Calendar size={15} className="text-field-400" />}
          defaultOpen={false}
        >
          <TimelineComponent timeline={analysis.timeline} />
        </Section>
      )}

      {/* ── Cultural practices ───────────────────────────────────────── */}
      {analysis.treatment?.cultural_practices?.length > 0 && (
        <Section
          title="Cultural Practices"
          icon={<Leaf size={15} className="text-field-400" />}
          defaultOpen={false}
        >
          <BulletList items={analysis.treatment.cultural_practices} />
        </Section>
      )}

      {/* ── Prevention ───────────────────────────────────────────────── */}
      {analysis.prevention?.length > 0 && (
        <Section
          title="Prevention"
          icon={<ShieldAlert size={15} className="text-field-400" />}
          defaultOpen={false}
        >
          <BulletList items={analysis.prevention} />
        </Section>
      )}

      {/* ── Follow-up ────────────────────────────────────────────────── */}
      {analysis.follow_up && (
        <div className="rounded-xl bg-soil-800/60 border border-field-800/40 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={13} className="text-field-500" />
            <p className="text-field-500 text-xs uppercase tracking-wide">Follow-up</p>
          </div>
          <p className="text-field-300 text-sm">{analysis.follow_up}</p>
        </div>
      )}
    </div>
  );
}
