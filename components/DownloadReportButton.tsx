'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface LocationData {
  lat: number; lng: number;
  city?: string; state?: string;
  soilType?: string; hardiness_zone?: string;
  grassClass?: 'cool' | 'warm' | 'transition';
  weather?: { avg_high_f: number; avg_low_f: number; avg_humidity: number };
  soil_temp_surface_f?: number; soil_temp_6cm_f?: number;
  rainfall?: { recent_in: number; normal_in: number; pct_of_normal: number };
}

interface DownloadReportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: Record<string, any>;
  location: LocationData | null;
}

const FORMAT_LABEL: Record<string, string> = {
  granular: 'Granular', liquid: 'Liquid', wdg: 'WDG',
  wettable_powder: 'WP', sc: 'SC', spray_ready: 'RTU',
};

const FORMAT_SORT: Record<string, number> = {
  granular: 0, liquid: 1, wdg: 2, wettable_powder: 2, sc: 2, spray_ready: 3,
};

function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function row(label: string, value: unknown): string {
  if (!value) return '';
  return `<div class="row"><span class="label">${escHtml(label)}</span><span class="val">${escHtml(value)}</span></div>`;
}

function bullet(text: string): string {
  return `<li>${escHtml(text)}</li>`;
}

function section(title: string, content: string): string {
  if (!content.trim()) return '';
  return `<div class="section"><h3>${escHtml(title)}</h3>${content}</div>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildReportHTML(analysis: Record<string, any>, location: LocationData | null): string {
  const diagnosis       = analysis.diagnosis        ?? {};
  const identified      = analysis.identified       ?? {};
  const treatment       = analysis.treatment        ?? {};
  const elaborate       = treatment.elaborate       ?? {};
  const rawProducts     = (treatment.products       ?? []) as Array<Record<string, string>>;
  const grassType       = analysis.grass_type       ?? {};
  const overviewBullets = (analysis.overview_bullets ?? []) as string[];
  const locationFactors = analysis.location_factors ?? {};
  const mechanical      = analysis.mechanical_practices ?? {};
  const timeline        = (analysis.timeline        ?? []) as Array<Record<string, unknown>>;
  const prevention      = (analysis.prevention      ?? []) as string[];
  const soilProfile     = analysis._soil_profile    ?? {};

  const products = [...rawProducts].sort((a, b) =>
    (FORMAT_SORT[(a.format ?? '').toLowerCase()] ?? 9) -
    (FORMAT_SORT[(b.format ?? '').toLowerCase()] ?? 9)
  );

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const sev = (diagnosis.severity ?? '').toLowerCase();
  const sevColors: Record<string, string> = {
    critical: '#c0392b', moderate: '#e67e22', mild: '#f1c40f',
  };
  const sevColor = sevColors[sev] ?? '#7f8c8d';

  // ── Location block ──────────────────────────────────────────────────────────
  let locBlock = '';
  if (location) {
    const locStr = [location.city, location.state].filter(Boolean).join(', ');
    const meta: string[] = [];
    if (location.soilType) meta.push(`Soil: ${location.soilType}`);
    if (location.hardiness_zone) meta.push(`Zone ${location.hardiness_zone}`);
    if (location.grassClass) {
      const gc = location.grassClass;
      meta.push(`${gc.charAt(0).toUpperCase() + gc.slice(1)}-season grass`);
    }
    const wx = location.weather;
    const wxParts: string[] = [];
    if (wx) {
      wxParts.push(`Air Temp: ${wx.avg_low_f}&ndash;${wx.avg_high_f}&deg;F &nbsp;&bull;&nbsp; Humidity: ${wx.avg_humidity}% RH &nbsp;<em>(7-day avg)</em>`);
    }
    if (location.soil_temp_surface_f) {
      wxParts.push(`Soil Temp: ${location.soil_temp_surface_f}&deg;F surface`);
    }
    if (location.rainfall) {
      const r = location.rainfall;
      const diff = Math.round(r.pct_of_normal - 100);
      wxParts.push(`Rainfall: ${r.recent_in}&Prime; / 7d &nbsp;(${diff >= 0 ? '+' : ''}${diff}% vs 3-yr avg)`);
    }
    locBlock = `
      <div class="loc-block">
        ${locStr ? `<div class="loc-name">${escHtml(locStr)}</div>` : ''}
        ${meta.length ? `<div class="loc-meta">${meta.map(escHtml).join(' &nbsp;&bull;&nbsp; ')}</div>` : ''}
        ${wxParts.map(p => `<div class="loc-wx">${p}</div>`).join('')}
      </div>`;
  }

  // ── Overview ────────────────────────────────────────────────────────────────
  const overviewHTML = overviewBullets.length
    ? `<ul>${overviewBullets.map(bullet).join('')}</ul>` : '';

  // ── Invasive watch ──────────────────────────────────────────────────────────
  const invasive = locationFactors.invasive_watch as string | undefined;
  const invasiveHTML = (invasive && invasive.toLowerCase() !== 'null' && invasive.trim())
    ? `<div class="warn-box">&#9888; ${escHtml(invasive)}</div>` : '';

  // ── Elaborate ───────────────────────────────────────────────────────────────
  const elabParts = [
    { title: 'Why It Happens',    val: elaborate.why_it_happens },
    { title: 'How To Apply',      val: elaborate.how_to_apply },
    { title: 'What To Watch For', val: elaborate.what_to_watch_for },
    { title: 'Common Mistakes',   val: elaborate.common_mistakes },
    { title: 'Long-Term Pathway', val: elaborate.long_term_pathway },
  ].filter(e => e.val);

  const elaborateHTML = elabParts.length ? elabParts.map(e =>
    `<div class="elab-item"><div class="elab-title">${escHtml(e.title)}</div><p>${escHtml(e.val)}</p></div>`
  ).join('') : '';

  // ── Products ────────────────────────────────────────────────────────────────
  const productsHTML = products.map(p => {
    const fmt = (p.format ?? '').toLowerCase();
    const fmtLabel = FORMAT_LABEL[fmt] ?? (fmt ? fmt.toUpperCase() : '');
    return `
      <div class="product">
        <div class="product-header">
          <span class="product-name">${escHtml(p.name)}</span>
          ${fmtLabel ? `<span class="product-fmt">${escHtml(fmtLabel)}</span>` : ''}
        </div>
        ${p.type ? `<div class="product-type">${escHtml((p.type as string).replace(/_/g, ' '))}</div>` : ''}
        ${row('Application Rate', p.application_rate)}
        ${row('Timing', p.timing)}
        ${p.notes ? `<p class="product-notes">${escHtml(p.notes)}</p>` : ''}
      </div>`;
  }).join('');

  // ── Timeline ────────────────────────────────────────────────────────────────
  const timelineHTML = timeline.map((stage) => `
    <div class="timeline-stage">
      ${stage.stage ? `<div class="stage-label">${escHtml(stage.stage as string)}</div>` : ''}
      ${stage.title ? `<div class="stage-title">${escHtml(stage.title as string)}</div>` : ''}
      ${Array.isArray(stage.actions) && (stage.actions as string[]).length
        ? `<ul>${(stage.actions as string[]).map(bullet).join('')}</ul>` : ''}
      ${stage.milestone ? `<div class="milestone">&#10003; ${escHtml(stage.milestone as string)}</div>` : ''}
    </div>`).join('');

  // ── Prevention ──────────────────────────────────────────────────────────────
  const preventionHTML = prevention.length
    ? `<ul>${prevention.map(bullet).join('')}</ul>` : '';

  // ── Mechanical practices ─────────────────────────────────────────────────────
  const mechParts = [
    { label: 'Aeration',    d: mechanical.aeration },
    { label: 'Dethatching', d: mechanical.dethatching },
    { label: 'Seeding',     d: mechanical.seeding },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ].filter(m => (m.d as any)?.recommended);

  const mechHTML = mechParts.map(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = m.d as any;
    return `
      <div class="mech-item">
        <div class="mech-label">${escHtml(m.label)}</div>
        ${row('Timing', d.timing)}
        ${row('Method', d.method)}
        ${row('Seed Type', d.seed_type)}
        ${row('Rate', d.rate)}
        ${d.notes ? `<p>${escHtml(d.notes)}</p>` : ''}
      </div>`;
  }).join('');

  // ── Soil profile ────────────────────────────────────────────────────────────
  const soilHTML = soilProfile.label ? `
    <div class="soil-block">
      <div class="soil-label">${escHtml(soilProfile.label)}</div>
      ${soilProfile.notes ? `<p>${escHtml(soilProfile.notes)}</p>` : ''}
      ${row('Fert Frequency', soilProfile.fertFrequency)}
      ${row('Drainage', soilProfile.drainageClass)}
    </div>` : '';

  // ── Badges ──────────────────────────────────────────────────────────────────
  const badges = [
    sev ? `<span class="badge" style="background:${sevColor}20;color:${sevColor};border:1px solid ${sevColor}50">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>` : '',
    diagnosis.issue_type ? `<span class="badge">${escHtml((diagnosis.issue_type as string).replace(/_/g, ' '))}</span>` : '',
    (diagnosis.spread_risk && diagnosis.spread_risk !== 'none')
      ? `<span class="badge badge-warn">${escHtml(diagnosis.spread_risk)} spread risk</span>` : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lawn AI Report &mdash; ${escHtml(identified.primary ?? 'Analysis')}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 18mm 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         font-size: 11px; line-height: 1.6; color: #1a2018; background: #fff; }

  /* ── header ── */
  .report-header { background: #5f8a3a; color: #fff; padding: 12px 16px; display: flex;
    align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .header-left { display: flex; flex-direction: column; gap: 2px; }
  .header-brand { font-size: 18px; font-weight: 800; letter-spacing: 0.08em; }
  .header-sub   { font-size: 10px; opacity: 0.85; }
  .header-date  { font-size: 10px; opacity: 0.85; text-align: right; }

  /* ── location ── */
  .loc-block { background: #f5f8f3; border: 1px solid #d0dcc8; border-radius: 6px;
    padding: 10px 12px; margin-bottom: 14px; }
  .loc-name  { font-size: 14px; font-weight: 700; color: #1a2018; margin-bottom: 3px; }
  .loc-meta  { font-size: 10px; color: #5a6b52; margin-bottom: 4px; }
  .loc-wx    { font-size: 10px; color: #4a5e43; }

  /* ── issue header ── */
  .issue-name  { font-size: 18px; font-weight: 800; color: #1a2018; margin-bottom: 6px; }
  .badge-row   { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
  .badge { display: inline-block; font-size: 9px; padding: 2px 8px; border-radius: 99px;
    background: #eef3eb; color: #4a6640; border: 1px solid #c0d4b5; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em; }
  .badge-warn { background: #fff3e0; color: #e67e22; border-color: #f0c080; }
  .grass-id { font-size: 10px; color: #7a8a72; margin-bottom: 10px; }

  /* ── sections ── */
  .section { margin-bottom: 16px; break-inside: avoid; }
  .section h3 { font-size: 8px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #7a8a72; padding-bottom: 4px;
    border-bottom: 1px solid #d8e4d2; margin-bottom: 8px; }
  .section ul { padding-left: 16px; }
  .section ul li { margin-bottom: 3px; }
  p { margin-bottom: 6px; }

  /* ── warn box ── */
  .warn-box { background: #fff8e1; border: 1px solid #f0c040; border-radius: 5px;
    padding: 7px 10px; font-size: 10px; color: #8a6000; margin-bottom: 10px; }

  /* ── elaborate ── */
  .elab-item { margin-bottom: 10px; break-inside: avoid; }
  .elab-title { font-size: 10px; font-weight: 700; color: #3d5e2a; margin-bottom: 3px; }

  /* ── products ── */
  .product { border-bottom: 1px solid #e8ede4; padding: 8px 0; break-inside: avoid; }
  .product:last-child { border-bottom: none; }
  .product-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .product-name { font-size: 11px; font-weight: 700; color: #1a2018; }
  .product-fmt  { font-size: 9px; font-weight: 600; background: #eef3eb;
    color: #4a6640; border: 1px solid #c0d4b5; border-radius: 99px; padding: 1px 7px; }
  .product-type { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #8a9a82; margin-bottom: 3px; }
  .product-notes { font-size: 10px; color: #6a7a62; font-style: italic; margin-top: 3px; }
  .row { font-size: 10px; color: #3a4a32; margin-bottom: 2px; }
  .label { font-weight: 600; color: #5a6a52; margin-right: 4px; }

  /* ── timeline ── */
  .timeline-stage { border-left: 2px solid #82b04a; padding-left: 10px; margin-bottom: 10px;
    break-inside: avoid; }
  .stage-label { font-size: 8px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #8a9a72; }
  .stage-title { font-size: 11px; font-weight: 700; color: #1a2018; margin-bottom: 4px; }
  .milestone   { font-size: 10px; color: #5a7a3a; font-style: italic; margin-top: 3px; }

  /* ── mechanical ── */
  .mech-item { background: #f8faf6; border-radius: 5px; padding: 8px 10px;
    margin-bottom: 8px; break-inside: avoid; }
  .mech-label { font-size: 11px; font-weight: 700; color: #3d5e2a; margin-bottom: 4px; }

  /* ── soil ── */
  .soil-block { background: #f5f8f3; border: 1px solid #d0dcc8; border-radius: 5px;
    padding: 8px 10px; }
  .soil-label { font-size: 11px; font-weight: 700; color: #1a2018; margin-bottom: 4px; }

  /* ── footer ── */
  .report-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #d0dcc8;
    font-size: 9px; color: #9aaa92; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<div class="report-header">
  <div class="header-left">
    <div class="header-brand">LAWN AI</div>
    <div class="header-sub">Turf Analysis Report</div>
  </div>
  <div class="header-date">${escHtml(dateStr)}</div>
</div>

${locBlock}

<div class="issue-name">${escHtml(identified.primary ?? 'Lawn Analysis')}</div>
${badges ? `<div class="badge-row">${badges}</div>` : ''}
${grassType.identified ? `<div class="grass-id">Grass: ${escHtml(grassType.identified)}</div>` : ''}

${overviewBullets.length ? section('Overview', overviewHTML) : ''}
${invasiveHTML}
${elaborateHTML ? section('Detailed Context', elaborateHTML) : ''}
${products.length ? section('Recommended Products', productsHTML) : ''}
${timeline.length ? section('Treatment Timeline', timelineHTML) : ''}
${prevention.length ? section('Prevention', preventionHTML) : ''}
${mechParts.length ? section('Mechanical Practices', mechHTML) : ''}
${soilProfile.label ? section('Regional Soil Profile', soilHTML) : ''}

<div class="report-footer">
  <span>Generated by Lawn AI &mdash; lawn-ai.vercel.app</span>
  <span>${escHtml(dateStr)}</span>
</div>

</body>
</html>`;
}

export default function DownloadReportButton({ analysis, location }: DownloadReportButtonProps) {
  const [blocked, setBlocked] = useState(false);

  const handleDownload = () => {
    setBlocked(false);
    const html = buildReportHTML(analysis, location);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      setBlocked(true);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Give the browser a moment to render before triggering print
    setTimeout(() => {
      win.print();
    }, 600);
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl bg-field-700/40 hover:bg-field-600/50 border border-field-600/30 text-field-200 hover:text-white text-sm font-medium transition"
      >
        <Download size={14} className="shrink-0" />
        Download Full Report PDF
      </button>
      {blocked && (
        <p className="text-xs text-amber-400 text-center px-2">
          Pop-up blocked &mdash; please allow pop-ups for this site, then try again.
        </p>
      )}
    </div>
  );
}
