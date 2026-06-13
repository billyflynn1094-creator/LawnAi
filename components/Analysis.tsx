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
} from 'lucide-react';
import { useState } from 'react';
import TimelineComponent from '@/components/Timeline';

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

interface Analysis {
  identified: { primary: string; confidence: string; description: string };
  diagnosis: {
    issue_type: string;
    severity: string;
    cause: string;
    spread_risk: string;
  };
  location_factors: { relevant_notes: string; invasive_watch: string | null };
  treatment: {
    immediate_actions: string[];
    products: Product[];
    cultural_practices: string[];
  };
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

const DRAINAGE_BADGE: Record<string, string> = {
  rapid: 'text-sky-300 bg-sky-900/30',
  moderate: 'text-field-300 bg-field-800/40',
  slow: 'text-straw-300 bg-straw-400/20',
};

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
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-soil-800/60 hover:bg-soil-700/60 transition"
      >
        <span className="flex items-center gap-2 text-field-200 text-sm font-medium">
          {icon} {title}
        </span>
        {open ? (
          <ChevronUp size={15} className="text-field-500" />
        ) : (
          <ChevronDown size={15} className="text-field-500" />
        )}
      </button>
      {open && <div className="px-4 py-3 space-y-2">{children}</div>}
    </div>
  );
}

export default function AnalysisResults({ analysis }: AnalysisProps) {
  if (!analysis) return null;

  // Fallback for parse errors
  if (analysis.parse_error) {
    return (
      <div className="rounded-2xl bg-soil-800 border border-field-800/50 p-4">
        <p className="text-field-200 text-sm whitespace-pre-wrap">{analysis.raw}</p>
      </div>
    );
  }

  const sevClass =
    SEVERITY_COLOR[analysis.diagnosis?.severity] ?? SEVERITY_COLOR.none;

  return (
    <div className="space-y-3">
      {/* Professional alert */}
      {analysis.professional_needed && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/30 border border-red-700/40">
          <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
          <p className="text-red-300 text-sm">
            This issue may require a certified lawn care professional. Do not apply
            pesticides or herbicides without confirming with a local expert.
          </p>
        </div>
      )}

      {/* Issue ID + Severity */}
      <div className="rounded-2xl bg-soil-800 border border-field-800/50 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-field-100 font-display text-lg leading-tight">
            {analysis.identified?.primary}
          </h2>
          <span
            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${sevClass}`}
          >
            {analysis.diagnosis?.severity}
          </span>
        </div>
        <p className="text-field-400 text-sm leading-relaxed">
          {analysis.identified?.description}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs px-2.5 py-1 rounded-full bg-soil-700 text-field-300">
            {analysis.diagnosis?.issue_type}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-soil-700 text-field-300">
            Spread risk: {analysis.diagnosis?.spread_risk}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-soil-700 text-field-300 capitalize">
            Confidence: {analysis.identified?.confidence}
          </span>
        </div>
        {analysis.location_factors?.relevant_notes && (
          <p className="text-field-500 text-xs pt-1 border-t border-field-800/40 mt-2">
            📍 {analysis.location_factors.relevant_notes}
          </p>
        )}
        {analysis.location_factors?.invasive_watch && (
          <p className="text-rust-300 text-xs flex items-center gap-1">
            <AlertTriangle size={12} /> {analysis.location_factors.invasive_watch}
          </p>
        )}
      </div>

      {/* Soil Profile */}
      {analysis._soil_profile && (
        <div className="rounded-xl bg-soil-800/60 border border-field-800/40 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-field-400 text-xs font-medium uppercase tracking-wide">
              Soil Profile — {analysis._soil_profile.label}
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                DRAINAGE_BADGE[analysis._soil_profile.drainageClass] ?? 'text-field-400'
              }`}
            >
              {analysis._soil_profile.drainageClass} drainage
            </span>
          </div>
          <p className="text-field-400 text-xs">{analysis._soil_profile.notes}</p>
          <p className="text-field-500 text-xs">
            💊 Fertilizer schedule: {analysis._soil_profile.fertFrequency}
          </p>
        </div>
      )}

      {/* Immediate actions */}
      {analysis.treatment?.immediate_actions?.length > 0 && (
        <Section
          title="Immediate Actions"
          icon={<CheckCircle size={15} className="text-field-400" />}
        >
          <ul className="space-y-1.5">
            {analysis.treatment.immediate_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-field-300">
                <span className="text-field-500 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recommended Products */}
      {analysis.treatment?.products?.length > 0 && (
        <Section
          title="Recommended Products"
          icon={<FlaskConical size={15} className="text-straw-300" />}
        >
          <div className="space-y-3">
            {analysis.treatment.products.map((p, i) => (
              <div
                key={i}
                className="rounded-xl bg-soil-900/60 border border-field-800/30 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-field-100 text-sm font-medium">{p.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      PRODUCT_BADGE[p.type] ?? 'bg-soil-700 text-field-300'
                    }`}
                  >
                    {p.type}
                  </span>
                </div>

                {/* SKU badge — shown when catalog product matched */}
                {p.sku && (
                  <div className="flex items-center gap-1.5">
                    <Tag size={11} className="text-straw-500" />
                    <span className="text-xs text-straw-300 font-mono">SKU: {p.sku}</span>
                    {p.catalog_name && p.catalog_name !== p.name && (
                      <span className="text-xs text-field-600">({p.catalog_name})</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div>
                    <p className="text-field-600 text-xs uppercase tracking-wide">Rate</p>
                    <p className="text-field-300 text-xs">{p.application_rate}</p>
                  </div>
                  <div>
                    <p className="text-field-600 text-xs uppercase tracking-wide">Timing</p>
                    <p className="text-field-300 text-xs">{p.timing}</p>
                  </div>
                </div>
                {p.notes && (
                  <p className="text-field-500 text-xs pt-1 border-t border-field-800/30">
                    {p.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Treatment Timeline */}
      {analysis.timeline && analysis.timeline.length > 0 && (
        <Section
          title="Treatment Timeline"
          icon={<Calendar size={15} className="text-field-400" />}
        >
          <TimelineComponent timeline={analysis.timeline} />
        </Section>
      )}

      {/* Cultural practices */}
      {analysis.treatment?.cultural_practices?.length > 0 && (
        <Section
          title="Cultural Practices"
          icon={<Leaf size={15} className="text-field-400" />}
          defaultOpen={false}
        >
          <ul className="space-y-1.5">
            {analysis.treatment.cultural_practices.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-field-300">
                <span className="text-field-500 shrink-0">•</span> {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Prevention */}
      {analysis.prevention?.length > 0 && (
        <Section
          title="Prevention"
          icon={<ShieldAlert size={15} className="text-field-400" />}
          defaultOpen={false}
        >
          <ul className="space-y-1.5">
            {analysis.prevention.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-field-300">
                <span className="text-field-500 shrink-0">•</span> {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Follow-up */}
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
