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
  /** Raw base64 or data-URL of the analyzed photo, shown at the top of the report. */
  capturedImage?: string | null;
  /** Brand accent color (hex) — matches the app's HomeLawn orange / ProLawn navy. */
  accent?: string;
  brandName?: string;
  brandTagline?: string;
}

const FORMAT_LABEL: Record<string, string> = {
  granular: 'Granular', liquid: 'Liquid', wdg: 'WDG',
  wettable_powder: 'WP', sc: 'SC', spray_ready: 'RTU',
};

function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function b64Src(b64: string | null | undefined): string {
  if (!b64) return '';
  if (b64.startsWith('data:')) return b64;
  return `data:image/jpeg;base64,${b64}`;
}

function bullet(text: string): string {
  return `<li>${escHtml(text)}</li>`;
}

function row(label: string, value: unknown): string {
  if (!value) return '';
  return `<div class="row"><span class="label">${escHtml(label)}</span><span class="val">${escHtml(value)}</span></div>`;
}

/** A single tile matching the app's card design: colored header bar, white body. */
function tile(accent: string, title: string, badgeHtml: string, bodyHtml: string): string {
  if (!bodyHtml.trim()) return '';
  return `
    <div class="tile">
      <div class="tile-header" style="background:${accent}">
        <span class="tile-title">${escHtml(title)}</span>
        ${badgeHtml}
      </div>
      <div class="tile-body">${bodyHtml}</div>
    </div>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildReportHTML(
  analysis: Record<string, any>,
  location: LocationData | null,
  capturedImage: string | null | undefined,
  accent: string,
  brandName: string,
  brandTagline: string,
): string {
  const diagnosis       = analysis.diagnosis        ?? {};
  const identified      = analysis.identified       ?? {};
  const grassType       = analysis.grass_type       ?? {};
  const locationFactors = analysis.location_factors ?? {};
  const treatment       = analysis.treatment        ?? {};
  const elaborate       = treatment.elaborate       ?? {};
  const products        = (treatment.products       ?? []) as Array<Record<string, string>>;
  const productsRelationship = treatment.products_relationship as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asWellGroups     = (treatment.as_well_products ?? []) as Array<Record<string, any>>;
  const culturalPractices = (treatment.cultural_practices ?? []) as string[];
  const mechanical       = analysis.mechanical_practices ?? {};
  const timeline         = (analysis.timeline ?? []) as Array<Record<string, unknown>>;
  const prevention       = (analysis.prevention ?? []) as string[];
  const ruledOut          = (analysis.ruled_out ?? []) as Array<Record<string, string>>;
  const treeRootFactor    = analysis.tree_root_factor as string | undefined;
  const overviewBullets   = (analysis.overview_bullets ?? []) as string[];
  const soilProfile       = analysis._soil_profile ?? {};
  const confidence        = (analysis.confidence_level ?? '').toLowerCase();

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const sev = (diagnosis.severity ?? '').toLowerCase();
  const sevColors: Record<string, string> = {
    critical: '#c0392b', moderate: '#e67e22', mild: '#d4a017', none: '#7f8c8d',
  };
  const sevColor = sevColors[sev] ?? '#7f8c8d';

  const confColors: Record<string, string> = {
    high: '#2e7d32', medium: '#b7791f', low: '#c0392b',
  };
  const confColor = confColors[confidence] ?? '#7f8c8d';

  // ── Photo ────────────────────────────────────────────────────────────────────────────────────────
  const photoSrc = b64Src(capturedImage);
  const photoHTML = photoSrc
    ? `<div class="photo-wrap" style="border-color:${accent}30"><img src="${photoSrc}" alt="Analyzed photo" /></div>`
    : '';

  // ── Location block ──────────────────────────────────────────────────────────────────────────────────────
  let locBlock = '';
  if (location) {
    const locStr = [location.city, location.state].filter(Boolean).join(', ');
    const soilLine = location.soilType ? `Soil: ${escHtml(location.soilType)}` : '';
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
      <div class="loc-block" style="background:${accent}08;border-color:${accent}30">
        <div class="loc-header" style="background:${accent}">
          ${locStr ? `<span class="loc-name">📍 ${escHtml(locStr)}</span>` : ''}
        </div>
        <div class="loc-body">
          ${soilLine ? `<div class="loc-soil">${soilLine}</div>` : ''}
          ${wxParts.map(p => `<div class="loc-wx">${p}</div>`).join('')}
        </div>
      </div>`;
  }

  // ── TILE 1: Findings ──────────────────────────────────────────────────────────────────────────────
  const findingsBullets: string[] = [];
  if (identified.primary) findingsBullets.push(`<strong>${escHtml(identified.primary)}</strong>`);
  if (grassType.identified) findingsBullets.push(`Grass type: ${escHtml(grassType.identified)}`);
  if (diagnosis.cause) findingsBullets.push(escHtml(diagnosis.cause));
  if (treeRootFactor) findingsBullets.push(`Tree root factor: ${escHtml(treeRootFactor)}`);
  if (locationFactors.relevant_notes) findingsBullets.push(escHtml(locationFactors.relevant_notes));
  overviewBullets.slice(0, 3).forEach(b => findingsBullets.push(escHtml(b)));
  if (diagnosis.spread_risk && diagnosis.spread_risk !== 'none') {
    findingsBullets.push(`Spread risk: <strong>${escHtml(diagnosis.spread_risk)}</strong>`);
  }

  const invasive = locationFactors.invasive_watch as string | undefined;
  const invasiveHTML = (invasive && invasive.toLowerCase() !== 'null' && invasive.trim())
    ? `<div class="warn-box">&#9888; ${escHtml(invasive)}</div>` : '';

  const ruledOutHTML = ruledOut.length
    ? `<div class="sub-block"><div class="sub-title">Other possibilities considered</div><ul class="ruled-out">${
        ruledOut.map(r => `<li><strong>${escHtml(r.cause ?? 'Alternative')}:</strong> ${escHtml(r.reason ?? '')}</li>`).join('')
      }</ul></div>` : '';

  const elabParts = [
    { title: 'Why It Happens',    val: elaborate.why_it_happens },
    { title: 'How To Apply',      val: elaborate.how_to_apply },
    { title: 'What To Watch For', val: elaborate.what_to_watch_for },
    { title: 'Common Mistakes',   val: elaborate.common_mistakes },
    { title: 'Long-Term Pathway', val: elaborate.long_term_pathway },
  ].filter(e => e.val);
  const elaborateHTML = elabParts.length ? `<div class="sub-block">${elabParts.map(e =>
    `<div class="elab-item"><div class="elab-title">${escHtml(e.title)}</div><p>${escHtml(e.val)}</p></div>`
  ).join('')}</div>` : '';

  const findingsBody = [
    findingsBullets.length ? `<ul>${findingsBullets.map(b => `<li>${b}</li>`).join('')}</ul>` : '',
    invasiveHTML,
    elaborateHTML,
    ruledOutHTML,
  ].filter(Boolean).join('');

  const sevBadge = sev ? `<span class="tile-badge" style="background:${sevColor}30;color:#fff">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>` : '';
  const findingsTile = tile(accent, 'Findings', sevBadge, findingsBody);

  // ── TILE 2: Suggested Products ───────────────────────────────────────────────────
  function productBlock(p: Record<string, string>): string {
    const fmt = (p.format ?? '').toLowerCase();
    const fmtLabel = FORMAT_LABEL[fmt] ?? (fmt ? fmt.toUpperCase() : '');
    return `
      <div class="product">
        <div class="product-header">
          <span class="product-name">${escHtml(p.name)}</span>
          ${fmtLabel ? `<span class="product-fmt" style="background:${accent}15;color:${accent};border-color:${accent}40">${escHtml(fmtLabel)}</span>` : ''}
        </div>
        ${row('Rate', p.application_rate)}
        ${row('Timing', p.timing)}
        ${p.notes ? `<p class="product-notes">${escHtml(p.notes)}</p>` : ''}
        ${p.manufacturer ? `<div class="row"><span class="label">Mfr</span><span class="val">${escHtml(p.manufacturer)}</span></div>` : ''}
        ${p.equivalent_product ? `<div class="row"><span class="label">Or equiv.</span><span class="val">${escHtml(p.equivalent_product)}${p.equivalent_manufacturer ? ` (${escHtml(p.equivalent_manufacturer)})` : ''}</span></div>` : ''}
      </div>`;
  }

  const productsListHTML = products.map((p, i) =>
    (i > 0 ? '<div class="or-divider">— or choose —</div>' : '') + productBlock(p)
  ).join('');

  const relationshipHTML = products.length > 1
    ? `<div class="choose-one" style="color:${accent}">${escHtml(productsRelationship ?? 'Choose ONE of the following based on application method — do not apply both for the same treatment.')}</div>`
    : '';

  const asWellHTML = asWellGroups.length ? `
    <div class="sub-block">
      <div class="optional-label">
        <span class="tile-badge" style="background:#2563eb30;color:#1d4ed8">Optional</span>
        For improvement — ${escHtml(asWellGroups.map(g => g.category).filter(Boolean).join(', '))}
      </div>
      ${asWellGroups.map(g => `
        ${g.compatibility_note ? `<div class="compat-note">&#9888; ${escHtml(g.compatibility_note)}</div>` : ''}
        ${((g.products ?? []) as Array<Record<string, string>>).map((p: Record<string, string>, i: number) =>
          (i > 0 ? '<div class="or-divider">— or choose —</div>' : '') + productBlock(p)
        ).join('')}
      `).join('')}
    </div>` : '';

  const immediateHTML = treatment.immediate_actions?.length
    ? `<div class="sub-block"><div class="sub-title">Immediate Actions</div><ul>${
        (treatment.immediate_actions as string[]).map(bullet).join('')
      }</ul></div>` : '';

  const productsBody = [relationshipHTML, productsListHTML, asWellHTML, immediateHTML].filter(Boolean).join('');
  const productCountBadge = products.length ? `<span class="tile-badge" style="background:rgba(255,255,255,0.25);color:#fff">${products.length} item${products.length === 1 ? '' : 's'}</span>` : '';
  const productsTile = products.length ? tile(accent, 'Suggested Products', productCountBadge, productsBody) : '';

  // ── TILE 3: Best Practices ─────────────────────────────────────────────────────
  const bestPracticesBody = culturalPractices.length ? `<ul>${culturalPractices.map(bullet).join('')}</ul>` : '';
  const bestPracticesTile = culturalPractices.length ? tile(accent, 'Best Practices', '', bestPracticesBody) : '';

  // ── TILE 4: Timeline ──────────────────────────────────────────────────────
  const timelineStagesHTML = timeline.map((stage) => `
    <div class="timeline-stage" style="border-color:${accent}">
      ${stage.stage ? `<div class="stage-label">${escHtml(stage.stage as string)}</div>` : ''}
      ${stage.title ? `<div class="stage-title">${escHtml(stage.title as string)}</div>` : ''}
      ${Array.isArray(stage.actions) && (stage.actions as string[]).length
        ? `<ul>${(stage.actions as string[]).map(bullet).join('')}</ul>` : ''}
      ${stage.milestone ? `<div class="milestone">&#10003; ${escHtml(stage.milestone as string)}</div>` : ''}
    </div>`).join('');

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
        <div class="mech-label">${escHtml(m.label)}${d.timing ? ` — ${escHtml(d.timing)}` : ''}</div>
        ${d.notes ? `<p>${escHtml(d.notes)}</p>` : ''}
      </div>`;
  }).join('');

  const preventionHTML = prevention.length
    ? `<div class="sub-block"><div class="sub-title">Prevention</div><ul>${prevention.map(bullet).join('')}</ul></div>` : '';

  const followUpHTML = analysis.follow_up
    ? `<p class="follow-up"><strong>Follow up:</strong> ${escHtml(analysis.follow_up)}</p>` : '';

  const soilHTML = soilProfile.notes
    ? `<p class="soil-note">Soil profile (${escHtml(soilProfile.label)}): ${escHtml(soilProfile.notes)}</p>` : '';

  const timelineBody = [timelineStagesHTML, mechHTML, preventionHTML, followUpHTML, soilHTML].filter(Boolean).join('');
  const timelineTile = timelineBody ? tile(accent, 'Timeline', '', timelineBody) : '';

  // ── Confidence banner ───────────────────────────────────────────────────────────
  const confidenceBanner = confidence
    ? `<div class="conf-banner" style="border-color:${accent}30">
        <span>Diagnostic Confidence</span>
        <span class="tile-badge" style="background:${confColor}20;color:${confColor};border:1px solid ${confColor}50">${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span>
      </div>` : '';

  const professionalBanner = analysis.professional_needed === true
    ? `<div class="warn-box" style="background:#fdeaea;border-color:#e0a0a0;color:#a02020;">&#9888; This issue is recommended for evaluation by a licensed professional.</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escHtml(brandName)} Report &mdash; ${escHtml(identified.primary ?? 'Analysis')}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 16mm 14mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         font-size: 11px; line-height: 1.6; color: #1a1a1a; background: #FAFAF8; }

  .report-header { background: ${accent}; color: #fff; padding: 14px 16px; display: flex;
    align-items: center; justify-content: space-between; margin-bottom: 14px; border-radius: 10px; }
  .header-left { display: flex; flex-direction: column; gap: 2px; }
  .header-brand { font-size: 19px; font-weight: 800; letter-spacing: 0.02em; }
  .header-sub   { font-size: 9px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.12em; }
  .header-date  { font-size: 10px; opacity: 0.9; text-align: right; }

  .photo-wrap { width: 100%; max-height: 340px; overflow: hidden; border-radius: 12px;
    margin-bottom: 14px; border: 1.5px solid; }
  .photo-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; max-height: 340px; }

  .loc-block { border-radius: 12px; border: 1.5px solid; overflow: hidden; margin-bottom: 14px; }
  .loc-header { padding: 8px 14px; }
  .loc-name { color: #fff; font-size: 13px; font-weight: 700; }
  .loc-body { padding: 8px 14px; }
  .loc-soil { font-size: 10px; color: #444; margin-bottom: 3px; }
  .loc-wx   { font-size: 10px; color: #555; }

  .conf-banner { display: flex; align-items: center; justify-content: space-between;
    border: 1px solid; border-radius: 10px; padding: 8px 12px; margin-bottom: 12px;
    font-size: 10px; font-weight: 600; color: #555; background: #fff; }

  .tile { background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px;
    margin-bottom: 14px; overflow: hidden; break-inside: avoid; }
  .tile-header { color: #fff; padding: 8px 14px; display: flex; align-items: center;
    justify-content: space-between; }
  .tile-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  .tile-badge { font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 99px;
    text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  .tile-body { padding: 12px 14px; }
  .tile-body ul { padding-left: 16px; }
  .tile-body ul li { margin-bottom: 4px; font-size: 10.5px; }
  .tile-body p { margin-bottom: 6px; font-size: 10px; }

  .sub-block { margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; break-inside: avoid; }
  .sub-block:first-child { margin-top: 0; padding-top: 0; border-top: none; }
  .sub-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: #888; margin-bottom: 6px; }

  .warn-box { background: #fff8e1; border: 1px solid #f0c040; border-radius: 6px;
    padding: 7px 10px; font-size: 10px; color: #8a6000; margin-top: 8px; }

  .elab-item { margin-bottom: 8px; }
  .elab-title { font-size: 9.5px; font-weight: 700; color: #333; margin-bottom: 2px; }

  .ruled-out { list-style: none; padding-left: 0 !important; }
  .ruled-out li { font-size: 9.5px; color: #666; margin-bottom: 4px; }

  .choose-one { font-size: 9.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.03em; margin-bottom: 8px; }
  .or-divider { text-align: center; font-size: 9px; font-weight: 700; text-transform: uppercase;
    color: #999; padding: 4px 0; }

  .product { border-bottom: 1px solid #eee; padding: 8px 0; break-inside: avoid; }
  .product:last-child { border-bottom: none; }
  .product-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .product-name { font-size: 11px; font-weight: 700; color: #1a1a1a; }
  .product-fmt  { font-size: 9px; font-weight: 600; border: 1px solid; border-radius: 99px; padding: 1px 7px; }
  .product-notes { font-size: 10px; color: #666; font-style: italic; margin-top: 3px; }
  .row { font-size: 10px; color: #444; margin-bottom: 2px; }
  .label { font-weight: 600; color: #777; margin-right: 4px; }

  .optional-label { font-size: 9.5px; color: #555; margin-bottom: 8px; display: flex;
    align-items: center; gap: 6px; }
  .compat-note { font-size: 9.5px; font-style: italic; color: #1d4ed8; margin-bottom: 6px; }

  .timeline-stage { border-left: 2px solid; padding-left: 10px; margin-bottom: 10px; break-inside: avoid; }
  .stage-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; }
  .stage-title { font-size: 11px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .milestone   { font-size: 10px; color: #555; font-style: italic; margin-top: 3px; }

  .mech-item { background: #f8f8f6; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; break-inside: avoid; }
  .mech-label { font-size: 10.5px; font-weight: 700; color: #333; margin-bottom: 3px; }

  .follow-up, .soil-note { font-size: 10px; color: #555; margin-top: 6px; }

  .report-footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #ddd;
    font-size: 9px; color: #999; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<div class="report-header">
  <div class="header-left">
    <div class="header-brand">${escHtml(brandName)}</div>
    <div class="header-sub">${escHtml(brandTagline)}</div>
  </div>
  <div class="header-date">${escHtml(dateStr)}</div>
</div>

${photoHTML}
${locBlock}
${confidenceBanner}
${professionalBanner}

${findingsTile}
${productsTile}
${bestPracticesTile}
${timelineTile}

<div class="report-footer">
  <span>Generated by ${escHtml(brandName)} &mdash; lawn-ai.vercel.app</span>
  <span>${escHtml(dateStr)}</span>
</div>

</body>
</html>`;
}

export default function DownloadReportButton({
  analysis,
  location,
  capturedImage,
  accent = '#4a8535',
  brandName = 'Lawn AI',
  brandTagline = 'Turf Analysis Report',
}: DownloadReportButtonProps) {
  const [blocked, setBlocked] = useState(false);

  const handleDownload = () => {
    setBlocked(false);
    const html = buildReportHTML(analysis, location, capturedImage, accent, brandName, brandTagline);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      setBlocked(true);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Give the browser a moment to render (incl. the embedded photo) before printing
    setTimeout(() => {
      win.print();
    }, 700);
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        <Download size={14} className="shrink-0" />
        Download Full Report PDF
      </button>
      {blocked && (
        <p className="text-xs text-amber-600 text-center px-2">
          Pop-up blocked &mdash; please allow pop-ups for this site, then try again.
        </p>
      )}
    </div>
  );
}
