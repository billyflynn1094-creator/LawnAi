// SiteOne Golf Catalog — structured product database
// Source: SiteOneGolfCatalog.pdf training data

export interface CatalogProduct {
  sku: string;
  name: string;
  category: 'herbicide' | 'fungicide' | 'pesticide' | 'fertilizer' | 'amendment' | 'organic';
  subcategory: string;
  activeIngredient?: string;
  description: string;
  useCase: string[];
  baseRate: string;
  rateUnit: string;
  frequency: string;
  timing: string;
  notes: string;
}

export const GOLF_CATALOG: CatalogProduct[] = [
  // ─── PRE-EMERGENT HERBICIDES ───────────────────────────────────────────────
  {
    sku: '00278316',
    name: 'Dimension 2EW Herbicide 64 oz',
    category: 'herbicide',
    subcategory: 'pre-emergent',
    activeIngredient: 'Dithiopyr 22.8%',
    description: 'Season-long pre-emergence control of 45+ annual grassy and broadleaf weeds in turf and landscape',
    useCase: ['crabgrass', 'annual bluegrass', 'poa annua', 'pre-emergent', 'grassy weeds', 'weed prevention', 'weed control', 'goosegrass'],
    baseRate: '0.5–0.75',
    rateUnit: 'oz/1000 sq ft',
    frequency: 'Once per season',
    timing: 'Apply before soil temps reach 55°F (early spring)',
    notes: 'Non-staining. Can be used over 125+ ornamentals. Multiple formulation flexibility.',
  },
  {
    sku: '00278317',
    name: 'Dimension 2EW Herbicide 2.5 gal',
    category: 'herbicide',
    subcategory: 'pre-emergent',
    activeIngredient: 'Dithiopyr 22.8%',
    description: 'Season-long pre-emergence control — 2.5 gallon bulk size for larger turf areas',
    useCase: ['crabgrass', 'annual bluegrass', 'pre-emergent', 'grassy weeds', 'weed prevention', 'large area weed control'],
    baseRate: '0.5–0.75',
    rateUnit: 'oz/1000 sq ft',
    frequency: 'Once per season',
    timing: 'Apply before soil temps reach 55°F (early spring)',
    notes: 'Non-staining. Bulk 2.5 gal jug for larger applications.',
  },
  {
    sku: '00278318',
    name: 'Dimension 2EW Herbicide 30 gal Drum',
    category: 'herbicide',
    subcategory: 'pre-emergent',
    activeIngredient: 'Dithiopyr 22.8%',
    description: 'Season-long pre-emergence control — commercial drum for golf courses and large turf',
    useCase: ['crabgrass', 'pre-emergent', 'golf course', 'commercial turf', 'large area weed control'],
    baseRate: '0.5–0.75',
    rateUnit: 'oz/1000 sq ft',
    frequency: 'Once per season',
    timing: 'Apply before soil temps reach 55°F (early spring)',
    notes: 'Commercial 30-gallon drum for golf course and large-scale turf management.',
  },
  {
    sku: '00004908',
    name: 'Snapshot 2.5 TG Herbicide 50 lb',
    category: 'herbicide',
    subcategory: 'pre-emergent granular',
    activeIngredient: 'Trifluralin 2.5% + Isoxaben 0.5%',
    description: 'Granular pre-emergence specialty herbicide providing up to 8 months of weed control',
    useCase: ['broadleaf weeds', 'grassy weeds', 'landscape beds', 'ornamental beds', 'long-term weed prevention', 'annual weeds'],
    baseRate: '4–5',
    rateUnit: 'lbs/1000 sq ft',
    frequency: 'Once or twice per season',
    timing: 'Apply in early spring before weed germination; water in after application',
    notes: 'Controls 125 broadleaf and grassy weeds. Effective on 636 field-grown ornamentals.',
  },
  {
    sku: '11033860',
    name: 'Snapshot 2.5 DG Herbicide 25 lb',
    category: 'herbicide',
    subcategory: 'pre-emergent granular',
    activeIngredient: 'Trifluralin 2.5% + Isoxaben 0.5%',
    description: 'Dispersible granule pre-emergence herbicide — 25 lb bag for medium-scale applications',
    useCase: ['broadleaf weeds', 'grassy weeds', 'landscape ornamentals', 'weed prevention'],
    baseRate: '4–5',
    rateUnit: 'lbs/1000 sq ft',
    frequency: 'Once or twice per season',
    timing: 'Apply in early spring before weed germination; water in after application',
    notes: 'Dispersible granule formula for uniform distribution.',
  },
  // ─── FUNGICIDES ───────────────────────────────────────────────────────────
  {
    sku: '040-3011',
    name: 'Phospho-Jet 1 Liter (45.8% Phosphorous Acid)',
    category: 'fungicide',
    subcategory: 'systemic fungicide',
    activeIngredient: '45.8% Phosphorous Acid',
    description: 'Systemic fungicide and plant health response elicitor for suppression of various plant diseases',
    useCase: ['phytophthora', 'root rot', 'anthracnose', 'pythium', 'black spot', 'scab', 'fire blight', 'fungal disease', 'downy mildew', 'canker blight', 'sudden oak death', 'dollar spot'],
    baseRate: '1–2',
    rateUnit: 'oz per gallon water',
    frequency: 'Every 14–21 days during active disease pressure',
    timing: 'Apply in spring or fall; 1 liter treats 20 trees (10" DBH)',
    notes: 'Effective for Sudden Oak Death, Anthracnose, Phytophthora, Black Spot, Root Rot. Use spring or fall.',
  },
  // ─── FERTILIZERS ──────────────────────────────────────────────────────────
  {
    sku: '030-4103',
    name: 'NutriRoot 2-2-3 + Micros/Kelp/Humates 1 Gal',
    category: 'fertilizer',
    subcategory: 'liquid fertilizer',
    activeIngredient: 'N-P-K 2-2-3 + Micronutrients + Kelp Extract + Humates',
    description: '2-part formula with nutrient pack and water manager for turf, trees, shrubs, and landscape plants',
    useCase: ['nutrient deficiency', 'yellowing turf', 'pale grass', 'nitrogen deficiency', 'iron deficiency', 'establishment', 'transplant stress', 'general fertilization', 'turf health', 'slow growth'],
    baseRate: '2–3',
    rateUnit: 'oz per gallon water per 1000 sq ft',
    frequency: 'Every 6–8 weeks during growing season',
    timing: 'Apply at planting or as maintenance throughout the growing season',
    notes: 'Contains kelp extract and humates for soil health. Suitable for turf, trees, and shrubs.',
  },
  {
    sku: '030-4101',
    name: 'NutriRoot 2-2-3 + Micros/Kelp/Humates 1 Qt',
    category: 'fertilizer',
    subcategory: 'liquid fertilizer',
    activeIngredient: 'N-P-K 2-2-3 + Micronutrients + Kelp Extract + Humates',
    description: '2-part liquid fertilizer — 1 quart size for spot applications and smaller turf areas',
    useCase: ['nutrient deficiency', 'yellowing turf', 'nitrogen deficiency', 'turf health', 'spot treatment', 'establishment'],
    baseRate: '2–3',
    rateUnit: 'oz per gallon water per 1000 sq ft',
    frequency: 'Every 6–8 weeks during growing season',
    timing: 'Apply at planting or as maintenance throughout the growing season',
    notes: 'Quart size ideal for spot treatments and smaller turf areas.',
  },
];

/**
 * Find catalog products that match the given keywords (issue types, product names, etc.)
 */
export function findMatchingProducts(keywords: string[]): CatalogProduct[] {
  if (!keywords.length) return [];
  const terms = keywords.map(k => k.toLowerCase()).filter(Boolean);
  return GOLF_CATALOG.filter(product =>
    terms.some(term =>
      product.useCase.some(uc => uc.toLowerCase().includes(term) || term.includes(uc.toLowerCase())) ||
      product.name.toLowerCase().includes(term) ||
      product.subcategory.toLowerCase().includes(term) ||
      product.category.toLowerCase() === term ||
      (product.activeIngredient?.toLowerCase().includes(term) ?? false) ||
      product.description.toLowerCase().includes(term)
    )
  );
}

/**
 * Returns a human-readable catalog summary for injection into the AI system prompt.
 */
export function getCatalogSummary(): string {
  return GOLF_CATALOG
    .map(p => `• ${p.name} (SKU: ${p.sku}) [${p.category}/${p.subcategory}] — treats: ${p.useCase.slice(0, 5).join(', ')}`)
    .join('\n');
}
