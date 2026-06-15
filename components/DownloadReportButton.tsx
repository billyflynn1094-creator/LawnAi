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

export default function DownloadReportButton({ analysis, location }: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = 210;
      const MARGIN = 18;
      const CW = W - MARGIN * 2;
      let y = 0;

      type RGB = [number, number, number];
      const C = {
        heading:   [245, 245, 240] as RGB,
        body:      [180, 190, 175] as RGB,
        muted:     [100, 110,  95] as RGB,
        accent:    [130, 165, 110] as RGB,
        bg:        [ 22,  28,  20] as RGB,
        sep:       [ 50,  60,  45] as RGB,
        critical:  [220,  80,  80] as RGB,
        moderate:  [220, 140,  60] as RGB,
        mild:      [200, 190,  60] as RGB,
        warn:      [220, 140,  60] as RGB,
      };

      // Fill page background
      const bgFill = () => {
        doc.setFillColor(...C.bg);
        doc.rect(0, 0, W, 297, 'F');
      };
      bgFill();

      const addPage = () => {
        doc.addPage();
        bgFill();
        y = MARGIN;
      };

      const checkY = (needed = 10) => { if (y + needed > 283) addPage(); };

      const drawLine = (text: string, size: number, color: RGB, bold = false, indent = 0) => {
        checkY(size * 0.5 + 3);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(text, MARGIN + indent, y);
        y += size * 0.42 + 1.8;
      };

      const drawPara = (text: string, size: number, color: RGB, indent = 0) => {
        if (!text?.trim()) return;
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, CW - indent);
        for (const l of lines) {
          checkY(size * 0.42 + 2);
          doc.text(l, MARGIN + indent, y);
          y += size * 0.42 + 1.4;
        }
        y += 0.8;
      };

      const drawBullet = (text: string, size: number, color: RGB, indent = 0) => {
        const lines = doc.splitTextToSize(text, CW - indent - 5);
        checkY(size * 0.42 + 2);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.setFont('helvetica', 'normal');
        doc.text('•', MARGIN + indent, y);
        let first = true;
        for (const l of lines) {
          checkY(size * 0.42 + 2);
          doc.text(l, MARGIN + indent + 4, y);
          y += size * 0.42 + (first ? 1.4 : 1.2);
          first = false;
        }
        y += 0.5;
      };

      const sectionHead = (label: string) => {
        checkY(12);
        y += 2;
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.setFont('helvetica', 'bold');
        doc.text(label.toUpperCase(), MARGIN, y);
        y += 4;
        doc.setDrawColor(...C.sep);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, W - MARGIN, y);
        y += 4;
      };

      // ── HEADER BAR ──────────────────────────────────────────────────────────
      doc.setFillColor(...C.accent);
      doc.rect(0, 0, W, 22, 'F');
      doc.setFontSize(15);
      doc.setTextColor(...C.bg);
      doc.setFont('helvetica', 'bold');
      doc.text('LAWN AI', MARGIN, 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Turf Analysis Report', MARGIN, 16.5);
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      doc.setFontSize(8);
      doc.text(dateStr, W - MARGIN, 16.5, { align: 'right' });
      y = 30;

      // ── LOCATION ────────────────────────────────────────────────────────────
      if (location) {
        const locStr = [location.city, location.state].filter(Boolean).join(', ');
        if (locStr) drawLine(locStr, 12, C.heading, true);
        const meta: string[] = [];
        if (location.soilType) meta.push(`Soil: ${location.soilType}`);
        if (location.hardiness_zone) meta.push(`Zone ${location.hardiness_zone}`);
        if (location.grassClass) {
          const gc = location.grassClass;
          meta.push(`${gc.charAt(0).toUpperCase() + gc.slice(1)}-season grass`);
        }
        if (meta.length) drawPara(meta.join('  ·  '), 8, C.muted);
        const wx = location.weather;
        if (wx) {
          const wxParts = [`${wx.avg_low_f}–${wx.avg_high_f}°F air  ·  ${wx.avg_humidity}% RH  (7-day avg)`];
          if (location.soil_temp_surface_f) wxParts.push(`Soil: ${location.soil_temp_surface_f}°F surface`);
          if (location.rainfall) {
            const r = location.rainfall;
            const diff = Math.round(r.pct_of_normal - 100);
            wxParts.push(`Rainfall: ${r.recent_in}in 7d (${diff >= 0 ? '+' : ''}${diff}% vs 3yr avg)`);
          }
          drawPara(wxParts.join('   '), 7.5, C.muted);
        }
        y += 2;
        doc.setDrawColor(...C.sep);
        doc.setLineWidth(0.4);
        doc.line(MARGIN, y, W - MARGIN, y);
        y += 6;
      }

      // ── PARSE DATA ──────────────────────────────────────────────────────────
      const diagnosis       = analysis.diagnosis        ?? {};
      const identified      = analysis.identified       ?? {};
      const treatment       = analysis.treatment        ?? {};
      const elaborate       = treatment.elaborate       ?? {};
      const products        = (treatment.products       ?? []) as Array<Record<string, string>>;
      const grassType       = analysis.grass_type       ?? {};
      const overviewBullets = (analysis.overview_bullets ?? []) as string[];
      const locationFactors = analysis.location_factors ?? {};
      const mechanical      = analysis.mechanical_practices ?? {};
      const timeline        = (analysis.timeline        ?? []) as Array<Record<string, unknown>>;
      const prevention      = (analysis.prevention      ?? []) as string[];
      const soilProfile     = analysis._soil_profile    ?? {};

      const sev = (diagnosis.severity ?? 'none').toLowerCase();
      const sevColor: RGB = sev === 'critical' ? C.critical : sev === 'moderate' ? C.moderate : sev === 'mild' ? C.mild : C.muted;

      // Issue name
      checkY(15);
      doc.setFontSize(14);
      doc.setTextColor(...C.heading);
      doc.setFont('helvetica', 'bold');
      const issueLines = doc.splitTextToSize(identified.primary ?? 'Lawn Analysis', CW);
      for (const l of issueLines) { doc.text(l, MARGIN, y); y += 7; }

      // Severity + badges
      const badges: string[] = [];
      if (sev && sev !== 'none') badges.push(sev.charAt(0).toUpperCase() + sev.slice(1));
      if (diagnosis.issue_type) badges.push((diagnosis.issue_type as string).replace(/_/g, ' '));
      if (diagnosis.spread_risk && diagnosis.spread_risk !== 'none') badges.push(`${diagnosis.spread_risk} spread risk`);
      if (badges.length) {
        doc.setFontSize(8); doc.setTextColor(...sevColor); doc.setFont('helvetica', 'normal');
        doc.text(badges.join('  ·  '), MARGIN, y); y += 5;
      }
      if (grassType.identified) {
        doc.setFontSize(8); doc.setTextColor(...C.muted); doc.setFont('helvetica', 'italic');
        doc.text(`Grass: ${grassType.identified}`, MARGIN, y);
        doc.setFont('helvetica', 'normal'); y += 5;
      }
      y += 2;

      // ── OVERVIEW ────────────────────────────────────────────────────────────
      if (overviewBullets.length) {
        sectionHead('Overview');
        for (const b of overviewBullets) drawBullet(b, 9, C.body);
        y += 1;
      }

      // Invasive watch
      if (locationFactors.invasive_watch && (locationFactors.invasive_watch as string).toLowerCase() !== 'null') {
        drawPara(`⚠  ${locationFactors.invasive_watch}`, 8.5, C.warn);
      }

      // ── PRODUCTS ────────────────────────────────────────────────────────────
      const FORMAT_SORT: Record<string, number> = { granular: 0, liquid: 1, wdg: 2, wettable_powder: 2, sc: 2, spray_ready: 3 };
      const sortedProducts = [...products].sort((a, b) => {
        return (FORMAT_SORT[(a.format ?? '').toLowerCase()] ?? 9) - (FORMAT_SORT[(b.format ?? '').toLowerCase()] ?? 9);
      });

      if (sortedProducts.length) {
        sectionHead('Recommended Products');
        for (const p of sortedProducts) {
          checkY(18);
          const fmt = (p.format ?? '').toLowerCase();
          const fmtLabel = FORMAT_LABEL[fmt] ?? (fmt ? fmt.toUpperCase() : '');
          doc.setFontSize(9.5); doc.setTextColor(...C.heading); doc.setFont('helvetica', 'bold');
          const pName = doc.splitTextToSize(p.name, CW - 20);
          doc.text(pName[0], MARGIN, y);
          if (fmtLabel) {
            doc.setFontSize(8); doc.setTextColor(...C.accent);
            doc.text(fmtLabel, W - MARGIN, y, { align: 'right' });
          }
          y += 5;
          if (p.type) { doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.setFont('helvetica', 'normal'); doc.text((p.type as string).replace(/_/g, ' ').toUpperCase(), MARGIN, y); y += 4; }
          if (p.application_rate) { doc.setFontSize(8); doc.setTextColor(...C.body); doc.text(`Rate: ${p.application_rate}`, MARGIN, y); y += 4; }
          if (p.timing)           { doc.setFontSize(8); doc.setTextColor(...C.body); doc.text(`Timing: ${p.timing}`, MARGIN, y); y += 4; }
          if (p.notes) drawPara(p.notes, 8, C.muted);
          y += 1;
          doc.setDrawColor(...C.sep); doc.setLineWidth(0.2);
          doc.line(MARGIN, y, W - MARGIN, y); y += 3;
        }
      }

      // ── DETAILED CONTEXT ────────────────────────────────────────────────────
      const elabParts = [
        { title: 'Why It Happens',    content: elaborate.why_it_happens },
        { title: 'How To Apply',      content: elaborate.how_to_apply },
        { title: 'What To Watch For', content: elaborate.what_to_watch_for },
        { title: 'Common Mistakes',   content: elaborate.common_mistakes },
        { title: 'Long-Term Pathway', content: elaborate.long_term_pathway },
      ].filter(e => e.content);

      if (elabParts.length) {
        sectionHead('Detailed Context');
        for (const e of elabParts) {
          drawLine(e.title, 9, C.accent, true);
          drawPara(e.content!, 8.5, C.body);
          y += 1;
        }
      }

      // ── TIMELINE ────────────────────────────────────────────────────────────
      if (timeline.length) {
        sectionHead('Treatment Timeline');
        for (const stage of timeline) {
          checkY(15);
          if (stage.stage) { doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.setFont('helvetica', 'bold'); doc.text((stage.stage as string).toUpperCase(), MARGIN, y); y += 4; }
          if (stage.title) { doc.setFontSize(9); doc.setTextColor(...C.heading); doc.setFont('helvetica', 'bold'); doc.text(stage.title as string, MARGIN, y); y += 4.5; }
          if (Array.isArray(stage.actions)) for (const a of stage.actions as string[]) drawBullet(a, 8.5, C.body);
          if (stage.milestone) { doc.setFontSize(8); doc.setTextColor(...C.muted); doc.setFont('helvetica', 'italic'); doc.text(`✓ ${stage.milestone}`, MARGIN, y); y += 4; }
          y += 2;
        }
      }

      // ── PREVENTION ──────────────────────────────────────────────────────────
      if (prevention.length) {
        sectionHead('Prevention');
        for (const item of prevention) drawBullet(item, 8.5, C.body);
      }

      // ── MECHANICAL PRACTICES ────────────────────────────────────────────────
      const mechItems = [
        { label: 'Aeration',     data: mechanical.aeration },
        { label: 'Dethatching',  data: mechanical.dethatching },
        { label: 'Seeding',      data: mechanical.seeding },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ].filter(m => (m.data as any)?.recommended);

      if (mechItems.length) {
        sectionHead('Mechanical Practices');
        for (const m of mechItems) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = m.data as any;
          drawLine(m.label, 9, C.accent, true);
          if (d.timing)    drawPara(`Timing: ${d.timing}`, 8.5, C.body);
          if (d.method)    drawPara(`Method: ${d.method}`, 8.5, C.body);
          if (d.seed_type) drawPara(`Seed type: ${d.seed_type}`, 8.5, C.body);
          if (d.rate)      drawPara(`Rate: ${d.rate}`, 8.5, C.body);
          if (d.notes)     drawPara(d.notes, 8, C.muted);
          y += 2;
        }
      }

      // ── SOIL PROFILE ────────────────────────────────────────────────────────
      if (soilProfile.label) {
        sectionHead('Regional Soil Profile');
        drawLine(soilProfile.label, 9, C.heading, true);
        if (soilProfile.notes) drawPara(soilProfile.notes, 8.5, C.body);
        const spMeta: string[] = [];
        if (soilProfile.fertFrequency) spMeta.push(`Fert frequency: ${soilProfile.fertFrequency}`);
        if (soilProfile.drainageClass)  spMeta.push(`Drainage: ${soilProfile.drainageClass}`);
        if (spMeta.length) drawPara(spMeta.join('   ·   '), 8, C.muted);
      }

      // ── FOOTER on every page ────────────────────────────────────────────────
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(...C.muted);
        doc.text(`Generated by Lawn AI  ·  lawn-ai.vercel.app  ·  ${dateStr}`, MARGIN, 291);
        doc.text(`${i} / ${total}`, W - MARGIN, 291, { align: 'right' });
      }

      // ── SAVE ────────────────────────────────────────────────────────────────
      const city = location?.city ? `-${location.city.replace(/\s+/g, '-')}` : '';
      const today = new Date().toISOString().slice(0, 10);
      doc.save(`lawn-ai-report${city}-${today}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl bg-field-700/40 hover:bg-field-600/50 border border-field-600/30 text-field-200 hover:text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download size={14} className="shrink-0" />
      {loading ? 'Generating PDF…' : 'Download Full Report PDF'}
    </button>
  );
}
