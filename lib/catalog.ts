/**
 * LawnAI Professional Product Reference
 *
 * Organized by category → subcategory → format.
 * Injected into Gemini's system prompt as a professional knowledge base.
 * Gemini uses its deep product knowledge to recommend specific products
 * from these manufacturer lines by name, active ingredient, and formulation.
 *
 * Architecture note:
 * SKU/pricing/availability is intentionally absent here.
 * Phase 2: replace getCatalogSummary() injection with a live distributor
 * inventory API keyed by user zip code (Central Pro Supply, Heritage Group,
 * SiteOne, Rehms, etc.) so recommendations resolve to locally available
 * inventory with pricing — enabling per-territory licensing model.
 */

export function getCatalogSummary(): string {
  return `
PROFESSIONAL PRODUCT REFERENCE
Recommend products by name from these manufacturer lines.
Always include at least one GRANULAR and one LIQUID option per issue.
Include active ingredient, manufacturer, and format in product notes.

────────────────────────────────────────────────────────────────
HERBICIDES — PRE-EMERGENT
────────────────────────────────────────────────────────────────
GRANULAR:
• Barricade 0.48G (Syngenta) — Prodiamine 0.48%; crabgrass, goosegrass, poa annua, annual bluegrass; apply before soil reaches 55°F
• Pendulum WDG (BASF) — Pendimethalin; crabgrass, annual bluegrass, chickweed; dispersible granule; split spring/fall applications
• Pre-M 60 DG (Control Solutions) — Pendimethalin 1.71%; annual grasses + broadleaf; DG particle activates with rainfall
• Snapshot 2.5 TG (Corteva) — Trifluralin + Isoxaben; 125+ weed species; granular, 8-month residual; landscape beds and turf edges
• Ronstar G (Bayer/Envu) — Oxadiazon; annual bluegrass, chickweed; granular; safe on overseeded bermuda

LIQUID / SC / EW:
• Dimension 2EW (Corteva) — Dithiopyr 22.8%; crabgrass + goosegrass; unique post-emergent activity on young crabgrass tillers; liquid
• Barricade 4FL (Syngenta) — Prodiamine 40.7%; season-long residual; cost-effective large-area liquid application
• Specticle FLO (Bayer/Envu) — Indaziflam; ultra-low rate (3–6 oz/A); annual grasses + broadleaf; bermudagrass overseeding programs
• Echelon 4SC (Syngenta) — Sulfentrazone + Prodiamine; controls sedges AND annual grasses pre-emergent; safe on bermudagrass

WDG / DF:
• Prodiamine 65 WDG (Quali-Pro) — Generic prodiamine; same MOA as Barricade; economical large-area applications
• Gallery 75 DF (Corteva) — Isoxaben; broadleaf pre-emergent only; pair with grass pre-emergents; excellent on ornamental beds
• SureGuard SC (Nufarm) — Flumioxazin; pre/early post broadleaf + grass control

────────────────────────────────────────────────────────────────
HERBICIDES — POST-EMERGENT SELECTIVE
────────────────────────────────────────────────────────────────
LIQUID — COOL-SEASON SAFE:
• Tenacity (Syngenta) — Mesotrione 40%; bleaches/kills crabgrass, nutsedge, nimblewill, many broadleaf weeds; safe on KBG, tall fescue, centipede; unique whitening indicator; REQUIRES surfactant
• SpeedZone (PBI Gordon) — 2,4-D + Carfentrazone + MCPP + Dicamba; rapid knockdown of broadleaf weeds in cool-season turf; works in cooler temps
• Q4 Plus (PBI Gordon) — Quinclorac + Sulfentrazone + 2,4-D + Dicamba; broadleaf + crabgrass post-emergent combo; cool-season turf
• Trimec Classic (PBI Gordon) — 2,4-D + MCPP + Dicamba; reliable broadleaf standard; cool and transition zone
• Drive XLR8 (BASF) — Quinclorac 18.9%; mature crabgrass post-emergent; yellow nutsedge; use with methylated seed oil adjuvant
• T-Zone (Nufarm) — Triclopyr + 2,4-D + Dicamba + Sulfentrazone; difficult broadleaf (ground ivy, wild violet, creeping Charlie)
• Escalade 2 (Nufarm) — 2,4-D + Triclopyr + Fluroxypyr; broadleaf with improved vine/brush control
• Surge (Nufarm) — 2,4-D + Dicamba + MCPP; economical broadleaf standard
• Confront (Corteva) — Triclopyr + Clopyralid; clover, black medic, ground ivy; leguminous broadleaf weeds
• Pylex (BASF) — Topramezone; bermudagrass suppression in cool-season turf; nutsedge; bleaching action

LIQUID — WARM-SEASON SAFE:
• Celsius WG (Bayer/Envu) — Thiencarbazone + Iodosulfuron + Dicamba; bermuda/zoysia/St. Augustine safe; controls sedges + broadleaf + some grassy weeds
• Tribute Total (Bayer/Envu) — Thiencarbazone + Foramsulfuron + Halosulfuron; nutsedge + bermudagrass suppression in warm-season turf
• Blindside WDG (Control Solutions) — Sulfentrazone + Metsulfuron; wide-spectrum broadleaf including wild violet; warm-season safe

WDG / DF:
• Quinclorac 75 DF (Quali-Pro) — Generic quinclorac; crabgrass post-emergent; cost-effective alternative to Drive
• Kerb SC (BASF) — Pronamide; poa annua control in dormant bermuda; winter/early spring use
• Manuscript (Syngenta) — Trifloxysulfuron; broadleaf + nutsedge in warm-season turf
• Hatchet (Corteva) — Dicamba + Fluroxypyr; broadleaf weed control

────────────────────────────────────────────────────────────────
FUNGICIDES — LIQUID / SC / WG
────────────────────────────────────────────────────────────────
STROBILURINS (Group 11 — Preventive, rainfast):
• Heritage (Syngenta) — Azoxystrobin; broad-spectrum preventive + systemic; dollar spot, brown patch, anthracnose, pythium; industry standard
• Heritage TL (Syngenta) — Azoxystrobin with tank-mix label; enhanced rain-fastness formulation
• Kabuto (PBI Gordon/Nufarm) — Trifloxystrobin + Tebuconazole; strobilurin + DMI combo; dollar spot, anthracnose, brown patch

SDHIs (Group 7 — Excellent dollar spot + resistance management):
• Velista (Syngenta) — Penthiopyrad; dollar spot, anthracnose, brown patch, summer patch; excellent rotation partner
• Xzemplar (BASF) — Fluxapyroxad; dollar spot, anthracnose, brown patch; strong curative activity
• Emerald (BASF) — Boscalid; dollar spot, powdery mildew, anthracnose
• Aramax (BASF) — Dual SDHI + DMI; 26 cool and warm season turf diseases; 2024 launch
• Exteris Stressgard (Bayer/Envu) — Fluopyram + Trifloxystrobin; SDHI + strobilurin; broad-spectrum including fairy ring

DMIs (Group 3 — Curative, systemic):
• Banner Maxx II (Syngenta) — Propiconazole 14.3%; dollar spot, brown patch, anthracnose; cost-effective systemic standard
• Headway (Syngenta) — Azoxystrobin + Propiconazole; dual-mode broad-spectrum; preventive and early curative
• Tourney (Nufarm) — Metconazole; strong root uptake; dollar spot, anthracnose, brown patch
• Propiconazole 14.3 (Quali-Pro) — Generic DMI; cost-effective dollar spot program
• Instrata Elite (Corteva) — Fludioxonil + Propiconazole + Chlorothalonil; triple-mode preventive

CONTACT FUNGICIDES (multi-site, resistance management):
• Daconil WeatherStik (Syngenta) — Chlorothalonil 82.5%; broad-spectrum contact; dollar spot, brown patch, leaf spot; pair with systemics
• Chlorothalonil 720 (Quali-Pro) — Generic contact; economical resistance management
• Iprodione Pro 2SE (Quali-Pro) — Dicarboximide; dollar spot, brown patch

PYTHIUM / ROOT DISEASE SPECIFIC:
• Signature XTRA Stressgard (Bayer/Envu) — Fosetyl-Al + Phosphonate; pythium, phytophthora, downy mildew; stress tolerance benefit
• Banol (Bayer/Envu) — Propamocarb; pythium root rot, pythium blight; pour-on for severe pressure
• Prostar 70WG (Bayer/Envu) — Flutolanil; white patch, Rhizoctonia, helminthosporium; systemic soil-active

────────────────────────────────────────────────────────────────
FERTILIZERS — GRANULAR (SLOW/CONTROLLED RELEASE)
────────────────────────────────────────────────────────────────
• The Andersons 24-4-8 DG Pro with Humic — CarbonCoat PCU + DG particle; 8–10 week release; humic acid for soil biology
• The Andersons 18-4-8 CarbonCoat — Polymer-coated; 8–12 week controlled release; maintenance programs
• The Andersons Innova Organic 7-1-2 DG — Feather meal base; organic nitrogen; no burn; environmentally sensitive areas
• The Andersons PGF Complete 16-4-8 — DG particle; strong iron; year-round maintenance
• Proscape 30-0-12 Meth-Ex 40 (Lebanon Turf) — 40% methylene urea; 8–12 week release; cool-season maintenance standard
• Proscape 24-5-11 50% MESA (Lebanon Turf) — Methylene-Extended Sulfate of Ammonia; 55-day release; balanced NPK
• E-Blend 25-3-10 PCU (Lebanon Turf) — Polymer-coated urea; long-season release; renovation/establishment programs
• Proscape 19-0-7 Organic N (Lebanon Turf) — 50% organic N from feather meal/IBDU; slow steady release
• LESCO 24-5-11 40% MESA (SiteOne/Lesco) — Industry workhorse; balanced NPK; available through SiteOne branches
• LESCO 30-0-12 DG (SiteOne/Lesco) — High nitrogen maintenance; DG particle; golf and sports turf
• Polyon 43-0-0 PCU (ICL/Everris) — Polymer-coated urea; 3–4 month release; used in specialty blend programs
• Osmocote Pro 17-7-12 (ICL/Everris) — 5–6 month release; ideal for establishment and renovation
• Apex 15-5-10 (Simplot Partners) — Sulfur-coated + controlled release; balanced; lawn care operator standard
• Poly-S 39-0-0 ESN (Simplot) — Polymer-encapsulated sulfur-coated urea; slow-release with quick-release component
• LESCO 21-7-14 (SiteOne/Lesco) — Balanced NPK quick release; spring/fall starter programs
• Harrell's Custom Blends — Made-to-order granular blends; widely used by golf and high-end lawn care operators

────────────────────────────────────────────────────────────────
FERTILIZERS — LIQUID
────────────────────────────────────────────────────────────────
• Lebanon Liquid Proscape 30-0-5 Iron — High-analysis liquid + chelated iron; rapid green-up; cool-season turf
• Harrell's Liquid Programs — Custom NPK liquids; multiple ratios; professional lawn care distribution
• Simplot Liquid Gold 18-3-6 — Iron + manganese; sports fields and golf maintenance
• Ewing Nutri-20 Plus — 20-0-0 + micronutrients; rapid response liquid nitrogen; professional distribution
• NutriRoot 2-2-3 + Kelp/Humates (The Andersons) — Root stimulant + liquid nutrition; transplant/establishment stress support

────────────────────────────────────────────────────────────────
PROFESSIONAL SEED — COOL-SEASON
────────────────────────────────────────────────────────────────
• RPR Perennial Ryegrass (Barenbrug) — Regenerating ryegrass; self-repairs via lateral shoots; low-maintenance; sports fields and golf roughs
• HGT Kentucky Bluegrass (Barenbrug) — Heat/Humidity Tolerant; transition zone; disease resistant
• Integra II Perennial Ryegrass (Pennington Pro) — Disease resistant; fast establishment; NE and Midwest overseeding
• Soprano Perennial Ryegrass (Pennington Pro) — Elite brown patch resistance; golf and athletic use
• Caddyshack Creeping Bentgrass (Seed Research of Oregon) — Golf greens; heat/drought tolerant
• T-1 Kentucky Bluegrass (Seed Research of Oregon) — Elite low-mow KBG; disease package
• Triple Play Tall Fescue Blend (Turf-Seed) — 3-variety heat/drought tolerant blend; residential and commercial
• Zodiac Hard Fescue (Turf-Seed) — Low-maintenance; shade tolerant; minimal irrigation fine fescue
• Team Pro Tall Fescue/KBG/Rye Blend (Pennington Pro) — Versatile residential blend; quick establishment
• La Crosse Seed Tall Fescue Blends — Strong Midwest and mid-Atlantic distribution; regional performance data

────────────────────────────────────────────────────────────────
PROFESSIONAL SEED — WARM-SEASON
────────────────────────────────────────────────────────────────
• Princess 77 Bermudagrass (Pennington) — Fine-textured seeded bermuda; golf and sports; rapid establishment
• Sunbird Bermudagrass (Pennington) — Coated seed; improved germination rate; home lawns and sports zones 7–10
• Sahara II Bermudagrass (Allied Seed) — Fast-establishing; heat/drought tolerant; widely used SE US
• Empire Zoysia Plugs (Allied Seed) — Dense canopy; low maintenance; Gulf Coast and SE US
• Jacklin Elite Creeping Bentgrass (Jacklin/Barenbrug) — Golf course grade; putting greens and tees
`.trim();
}
