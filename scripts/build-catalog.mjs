// Builds the Rexsun consumer catalogue from the Amit Electricals trade file.
//
// The B2B catalogue counts SKUs; a consumer store counts products. One ceiling
// fan sold in 4 sweeps x 7 finishes is 28 rows there and one product page here,
// so the bulk of this script is working out which axes a group of SKUs varies
// along and turning them back into pickers.
//
//   node scripts/build-catalog.mjs
//
// Writes src/data/catalog.json + src/data/taxonomy.json and copies every image
// the shortlist needs into public/products/.

import fs from "node:fs";
import path from "node:path";

const B2B = "/Users/shivambhandari/Desktop/Claude code/amit-electricals";
const HERE = path.resolve(import.meta.dirname, "..");
const src = JSON.parse(fs.readFileSync(path.join(B2B, "src/data/catalog.json"), "utf8"));

// ---------------------------------------------------------------- taxonomy

// Ten departments a person recognises, not the four manufacturers' own trees.
export const DEPARTMENTS = [
  { slug: "fans", name: "Fans", blurb: "Ceiling, table, pedestal, wall and exhaust" },
  { slug: "lighting", name: "Lighting", blurb: "Bulbs, battens, panels and downlights" },
  { slug: "decorative-lighting", name: "Decorative Lighting", blurb: "Strip, rope and accent lights" },
  { slug: "kitchen-appliances", name: "Kitchen Appliances", blurb: "Mixers, kettles, induction and more" },
  { slug: "water-heaters", name: "Water Heaters", blurb: "Geysers and immersion rods" },
  { slug: "coolers-heaters", name: "Coolers & Heaters", blurb: "Air coolers and room heaters" },
  { slug: "garment-care", name: "Garment Care", blurb: "Dry and steam irons" },
  { slug: "torches-emergency", name: "Torches & Emergency", blurb: "Rechargeable torches and lanterns" },
  { slug: "home-essentials", name: "Home Essentials", blurb: "Spike guards, holders and doorbells" },
];

// name pattern -> [department, category]. First match wins, so the specific
// patterns (immersion, air cooler) have to sit above the generic ones.
const RULES = [
  [/immersion/i, "water-heaters", "Immersion Rods"],
  [/geyser|water heater|instant water|storage water|insta-?hot|insta-?warm|atlantic|arctic|cubis|heatx|aura instant|avianca/i, "water-heaters", "Geysers & Water Heaters"],
  [/air cooler|cooler|breezo/i, "coolers-heaters", "Air Coolers"],
  [/room heater|halogen room|zolta/i, "coolers-heaters", "Room Heaters"],
  [/mixer grinder|juicer|chopper|blender/i, "kitchen-appliances", "Mixer Grinders & Juicers"],
  [/kettle/i, "kitchen-appliances", "Electric Kettles"],
  [/induction|cooktop|chulha/i, "kitchen-appliances", "Induction & Cooktops"],
  [/air fryer/i, "kitchen-appliances", "Air Fryers"],
  [/\biron\b|dry iron/i, "garment-care", "Irons"],
  [/exhaust|ventilation|axial|fresh air/i, "fans", "Exhaust Fans"],
  [/pedestal|farrata|stand fan/i, "fans", "Pedestal Fans"],
  [/wall fan|wall hanging/i, "fans", "Wall Fans"],
  [/table fan|personal fan|cabin fan|AP-12/i, "fans", "Table & Personal Fans"],
  [/torch|lantern/i, "torches-emergency", "Torches & Lanterns"],
  [/mosquito racket/i, "home-essentials", "Mosquito Rackets"],
  [/spikeguard|spike ?guard|extension|USB|socket|\d-Pin/i, "home-essentials", "Extension & Spike Guards"],
  [/multiplug|multi plug|plug top|universal/i, "home-essentials", "Plugs & Multiplugs"],
  [/holder|ceiling rose/i, "home-essentials", "Holders & Ceiling Roses"],
  [/ding|door ?bell/i, "home-essentials", "Doorbells"],
  [/rope light|strip light|string light|jag-mag|profile strip/i, "decorative-lighting", "Strip & Rope Lights"],
  [/batten|tube|PLL/i, "lighting", "Battens & Tubelights"],
  [/panel|downlight|dazzle|aura|spot|striker|bulkhead/i, "lighting", "Panels & Downlights"],
  [/lamp|bulb/i, "lighting", "Bulbs & Lamps"],
  [/cob|deco|rainbow/i, "decorative-lighting", "Decorative COB"],
];

// Source categories that qualify a SKU for the consumer store at all.
const CEILING = new Set(["BLDC Fan", "BLDC Celing Fan", "BLDC Technology Fans", "Designer Fan",
  "High Speed Fan", "Standard Fan", "Ceiling Fan", "Ceiling Fans", "Decorative Ceiling",
  "Decorative Ceiling Fan", "Standard Ceiling", "Premium Ceiling"]);

const GROUPS = [
  ["ceiling", 55, [...CEILING]],
  ["tpw", 30, ["Table Fan", "Table Fans", "Pedestal Fan", "Pedestal Fans", "Wall Fan", "Wall Fans", "Personal Fans", "Inverter Table Fans", "Climate Control"]],
  ["exhaust", 14, ["Exhaust Fan", "Exhaust Fans", "Domestic Exhaust"]],
  ["bulbs", 20, ["LED Bulb", "LED Lamps"]],
  ["battens", 15, ["LED Batten", "LED Battens", "LED Tubelights Decorative Battens"]],
  ["panels", 20, ["Panel Light", "Panels LED Downlighters", "Downlight", "LED Downlighters", "2X2 Panels"]],
  ["deco", 14, ["Decorative Lights", "Decorative COB", "Rope and Strip Lights"]],
  ["torch", 6, ["Torches", "Torches and Emergency Lights"]],
  ["kitchen", 28, ["Air Fryers", "Cooking Range", "Food Preparation", "Induction", "Infrared Cooktop", "Kettle", "Kitchen", "Mixer Grinder", "General"]],
  ["water", 18, ["Geyser", "Instant Water Heater", "Storage Water Heater", "Water Heater", "Immersion Heaters", "Immersion Rod", "Solar Heater"]],
  ["garment", 12, ["Iron", "Irons", "Garment Care"]],
  ["heating", 10, ["Room Heater", "Heating Appliances"]],
  ["essentials", 20, ["Extension Cord", "Extension Boards", "Spikeguard", "Multiplug", "Multi Plug", "Plug Tops", "Lamp Holders", "Doorbells", "Door Bell", "Ceiling Rose", "Bug Zapper", "Mosquito Rackets", "Electrical Accessories"]],
];

const catToGroup = new Map();
GROUPS.forEach(([g, , cats]) => cats.forEach((c) => catToGroup.set(c, g)));

// Which rooms a category belongs to. Powers "shop by room", which is how most
// people actually arrive — they have a room that needs sorting, not a SKU.
const ROOMS = {
  "Ceiling Fans": ["living-room", "bedroom"],
  "Table & Personal Fans": ["bedroom", "living-room"],
  "Pedestal Fans": ["living-room", "bedroom"],
  "Wall Fans": ["kitchen", "living-room"],
  "Exhaust Fans": ["bathroom", "kitchen"],
  "Bulbs & Lamps": ["living-room", "bedroom", "kitchen"],
  "Battens & Tubelights": ["kitchen", "living-room"],
  "Panels & Downlights": ["living-room", "bathroom", "kitchen"],
  "Strip & Rope Lights": ["living-room", "outdoor"],
  "Decorative COB": ["living-room", "bedroom"],
  "Mixer Grinders & Juicers": ["kitchen"],
  "Electric Kettles": ["kitchen"],
  "Induction & Cooktops": ["kitchen"],
  "Air Fryers": ["kitchen"],
  "Geysers & Water Heaters": ["bathroom", "kitchen"],
  "Immersion Rods": ["bathroom"],
  "Air Coolers": ["living-room", "bedroom"],
  "Room Heaters": ["bedroom", "living-room"],
  Irons: ["bedroom"],
  "Torches & Lanterns": ["outdoor"],
  "Mosquito Rackets": ["living-room"],
  "Extension & Spike Guards": ["living-room", "bedroom"],
  "Plugs & Multiplugs": ["living-room"],
  "Holders & Ceiling Roses": ["living-room"],
  Doorbells: ["outdoor"],
};

export const ROOM_LIST = [
  { slug: "living-room", name: "Living Room" },
  { slug: "bedroom", name: "Bedroom" },
  { slug: "kitchen", name: "Kitchen" },
  { slug: "bathroom", name: "Bathroom" },
  { slug: "outdoor", name: "Outdoor" },
];

// ---------------------------------------------------------------- helpers

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const baseName = (n) => n.split("·")[0].trim();
const nameParts = (n) => n.split("·").slice(1).map((s) => s.trim()).filter(Boolean);

const skuPrice = (p) =>
  p.mrp || (p.variants || []).map((v) => v.mrp).filter(Boolean).sort((a, b) => a - b)[0] || null;

// A name segment tells us which axis it belongs to by what it says.
function classifySegment(seg) {
  if (/\bK\b|K,|cool white|warm white|natural white|daylight|CCT|tri-?colo/i.test(seg)) return "cct";
  if (/sweep|\bmm\b/i.test(seg)) return "size";
  if (/blade/i.test(seg)) return "blades";
  if (/wattage|\bwatt\b|\bW\b/i.test(seg)) return "wattage";
  if (/mount type|surface|recess|pole/i.test(seg)) return "mount";
  if (/round|square|sqaure/i.test(seg)) return "shape";
  return "finish";
}

const cleanCct = (s) =>
  s.replace(/^\d+\s*Wattage\s*·?\s*/i, "")
    .replace(/,?\s*(Daylight\/Neutral White)/i, ", Neutral White")
    .trim();

const titleCase = (s) =>
  s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bLed\b/g, "LED").replace(/\bBldc\b/g, "BLDC").replace(/\bCob\b/g, "COB")
    .replace(/\bHs\b/g, "HS").replace(/\bDlx\b/g, "DLX").replace(/\bSs\b/g, "SS")
    .replace(/\bCct\b/g, "CCT").replace(/\bPtfe\b/g, "PTFE").replace(/\bRpm\b/g, "RPM")
    .replace(/\bHqi\b/g, "HQI").replace(/\bJb\b/g, "JB").replace(/\bUsb\b/g, "USB")
    .replace(/\bNxt-G\b/gi, "NXT-G")
    .replace(/(\d)\s*w\b/gi, "$1W")
    .replace(/\bEs Metal\b/g, "ES Metal");

// Trade names run long ("Indo 4 Litre Digital Air Fryer with Touch Panel, uses
// up to 90% less fat, 8 Pre-set Menu..."). Cut at the first clause.
function consumerName(raw, brand) {
  let n = raw.replace(/\s+/g, " ").trim();
  n = n.replace(new RegExp(`^${brand}\\s+`, "i"), "");
  n = n.split(/,| with advance| with Touch| For Effortless| \(Water Heater/i)[0].trim();
  if (n.length > 62) n = n.slice(0, 60).replace(/[\s(–-]+$/, "") + "";
  return `${brand} ${titleCase(n)}`.replace(/\s+/g, " ");
}

// ---------------------------------------------------------------- pricing

// Selling price against MRP, by department. Round down to a .9 ending — the
// admin panel overrides any of these per product later.
const DISCOUNT = {
  fans: 0.14, lighting: 0.2, "decorative-lighting": 0.2, "kitchen-appliances": 0.15,
  "water-heaters": 0.16, "coolers-heaters": 0.15,
  "garment-care": 0.18, "torches-emergency": 0.18, "home-essentials": 0.12,
};
const sellPrice = (mrp, dept) => {
  const p = Math.round(mrp * (1 - (DISCOUNT[dept] ?? 0.15)));
  return p >= 1000 ? Math.floor(p / 10) * 10 - 1 : Math.floor(p / 10) * 10 + 9;
};

// ---------------------------------------------------------------- build

const merged = new Map();
for (const p of src) {
  const g = catToGroup.get(p.category);
  if (!g) continue;
  const key = `${p.brand}|${g}|${baseName(p.name)}`;
  if (!merged.has(key)) merged.set(key, { key, g, brand: p.brand, skus: [] });
  merged.get(key).skus.push(p);
}

const rank = (a, b) =>
  (b.priced - a.priced) ||
  (b.hasImg - a.hasImg) ||
  (b.skus.length - a.skus.length) ||
  a.base.localeCompare(b.base);

const pool = [...merged.values()].map((m) => ({
  ...m,
  base: baseName(m.skus[0].name),
  priced: m.skus.some(skuPrice) ? 1 : 0,
  hasImg: m.skus.some((s) => s.localImages?.length) ? 1 : 0,
}));

const chosen = [];
for (const [g, cap] of GROUPS) {
  chosen.push(...pool.filter((p) => p.g === g).sort(rank).slice(0, cap));
}

// ---- category medians, so an unpriced product gets a believable number -----
const medians = {};
for (const m of chosen) {
  const cat = categoryOf(m);
  const prices = m.skus.map(skuPrice).filter(Boolean);
  if (!prices.length) continue;
  (medians[cat] ||= []).push(...prices);
}
for (const k of Object.keys(medians)) {
  const s = medians[k].sort((a, b) => a - b);
  medians[k] = s[Math.floor(s.length / 2)];
}
const FALLBACK_MRP = {
  "Mixer Grinders & Juicers": 3490, "Geysers & Water Heaters": 7990, "Air Coolers": 8990,
  "Room Heaters": 2490, "Ceiling Fans": 3990, "Bulbs & Lamps": 199, "Irons": 999,
  "Torches & Lanterns": 899, "Exhaust Fans": 1690, "Table & Personal Fans": 2290,
  "Pedestal Fans": 2990, "Wall Fans": 2490, "Battens & Tubelights": 590,
  "Panels & Downlights": 690, "Decorative COB": 890,
};

function categoryOf(m) {
  const nm = m.base;
  if (m.g === "ceiling" && !/exhaust|pedestal|wall|table/i.test(nm)) return "Ceiling Fans";
  const hit = RULES.find(([re]) => re.test(nm));
  if (hit) return hit[2];
  return {
    ceiling: "Ceiling Fans", tpw: "Table & Personal Fans", exhaust: "Exhaust Fans",
    bulbs: "Bulbs & Lamps", battens: "Battens & Tubelights", panels: "Panels & Downlights",
    deco: "Decorative COB", torch: "Torches & Lanterns", kitchen: "Mixer Grinders & Juicers",
    water: "Geysers & Water Heaters", garment: "Irons", heating: "Room Heaters",
    essentials: "Extension & Spike Guards",
  }[m.g];
}
function deptOf(cat, m) {
  if (cat === "Ceiling Fans") return "fans";
  const hit = RULES.find(([, , c]) => c === cat);
  return hit ? hit[1] : "home-essentials";
}

// ---- turn each merged group into a product with option axes ---------------
const products = [];
const usedSlugs = new Set();

for (const m of chosen) {
  const category = categoryOf(m);
  const dept = deptOf(category, m);
  const first = m.skus[0];

  const variants = m.skus.map((s) => {
    const attrs = {};
    for (const seg of nameParts(s.name)) {
      const axis = classifySegment(seg);
      attrs[axis] = axis === "cct" ? cleanCct(seg) : seg;
    }
    if (!attrs.size && s.facets?.sweep) attrs.size = `${s.facets.sweep}mm`;
    if (!attrs.wattage && s.facets?.wattage) attrs.wattage = `${s.facets.wattage}W`;
    if (!attrs.cct && s.facets?.colourTemp) attrs.cct = cleanCct(s.facets.colourTemp);
    if (!attrs.finish && s.specs?.Colour) attrs.finish = s.specs.Colour;
    // Surya/Halonix carry their choices as nested variants instead of SKUs.
    for (const v of s.variants || []) if (v.label && !attrs.size) attrs.size = String(v.label);

    const mrp = skuPrice(s);
    return {
      sku: s.code,
      attrs,
      mrp,
      image: s.localImages?.[0] || null,
      specs: s.specs || {},
      inStock: s.stock !== "out-of-stock",
    };
  });

  // An axis is a real picker only when the SKUs actually differ along it.
  const AXES = [
    ["size", "Size"], ["wattage", "Wattage"], ["cct", "Light Colour"],
    ["finish", "Finish"], ["blades", "Blades"], ["shape", "Shape"], ["mount", "Mounting"],
  ];
  const options = [];
  for (const [k, label] of AXES) {
    const vals = [...new Set(variants.map((v) => v.attrs[k]).filter(Boolean))];
    if (vals.length > 1) options.push({ key: k, label, values: vals });
  }

  // Wattage and blade count aren't choices on a fan — they follow from the
  // sweep. Showing them as pickers invites a shopper to pick a combination
  // that was never manufactured, so where one axis fully determines another,
  // the dependent one comes off the page and stays on the spec table.
  const determines = (a, b) => {
    const map = new Map();
    for (const v of variants) {
      const from = v.attrs[a];
      const to = v.attrs[b];
      if (!from || !to) continue;
      if (map.has(from) && map.get(from) !== to) return false;
      map.set(from, to);
    }
    return map.size > 0;
  };
  for (const dependent of ["wattage", "blades", "shape"]) {
    if (options.some((o) => o.key === "size") && determines("size", dependent)) {
      const at = options.findIndex((o) => o.key === dependent);
      if (at !== -1) options.splice(at, 1);
    }
  }

  // Fill missing prices from the category median so the store is shoppable
  // today; flagged so the admin panel can list exactly what to correct.
  let estimated = false;
  const known = variants.map((v) => v.mrp).filter(Boolean);
  if (!known.length) {
    estimated = true;
    const guess = medians[category] || FALLBACK_MRP[category] || 999;
    variants.forEach((v, i) => { v.mrp = Math.round(guess * (1 + i * 0.08) / 10) * 10 - 1; });
  } else {
    const fill = Math.round(known.reduce((a, b) => a + b, 0) / known.length);
    variants.forEach((v) => { if (!v.mrp) { v.mrp = fill; estimated = true; } });
  }
  variants.forEach((v) => { v.price = sellPrice(v.mrp, dept); });

  const images = [...new Set(m.skus.flatMap((s) => s.localImages || []))].slice(0, 6);
  const specs = first.specs && Object.keys(first.specs).length ? first.specs : (variants[0]?.specs || {});

  let slug = slugify(`${m.brand}-${m.base}`);
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${slugify(`${m.brand}-${m.base}`)}-${n++}`;
  usedSlugs.add(slug);

  const prices = variants.map((v) => v.price);
  const mrps = variants.map((v) => v.mrp);
  const wattage = Number(first.facets?.wattage) || null;
  const sweep = Number(first.facets?.sweep) || null;

  products.push({
    id: slug,
    slug,
    name: consumerName(m.base, m.brand),
    brand: m.brand,
    dept,
    category,
    categorySlug: slugify(category),
    rooms: ROOMS[category] || [],
    tagline: first.description?.split(/\.\s/)[0]?.slice(0, 120) || "",
    specs,
    options,
    variants: variants.map(({ specs: _drop, ...v }) => v),
    price: Math.min(...prices),
    priceMax: Math.max(...prices),
    mrp: Math.min(...mrps),
    mrpMax: Math.max(...mrps),
    estimatedPrice: estimated,
    images,
    wattage,
    sweep,
    warranty: specs.Warranty || first.facets?.warranty || null,
    skuCount: m.skus.length,
    inStock: true,
  });
}

// ---------------------------------------------------------------- Rexsun

// The house label. Six products, from the brand creatives — priced here rather
// than derived, because we set these ourselves.
const REXSUN = [
  {
    slug: "rexsun-chopper-300w", name: "Rexsun Chopper 300W",
    category: "Mixer Grinders & Juicers", dept: "kitchen-appliances",
    tagline: "Quick chopping, everyday cooking easy",
    mrp: 2499, price: 1499,
    specs: { "Power (Watt)": "300", Blades: "Stainless Steel", Bowl: "Large capacity", Operation: "One touch", Warranty: "1 Year" },
    highlights: ["300 W motor chops onions, garlic and herbs in seconds", "Sharp stainless steel blades", "Large capacity bowl", "One-touch operation"],
  },
  {
    slug: "rexsun-hand-blender-300w", name: "Rexsun Hand Blender 300W",
    category: "Mixer Grinders & Juicers", dept: "kitchen-appliances",
    tagline: "Blend, mix, puree",
    mrp: 1999, price: 1199,
    specs: { "Power (Watt)": "300", Blades: "Stainless Steel", Body: "Food grade material", Warranty: "1 Year" },
    highlights: ["300 W motor for smoothies, soups and purees", "Stainless steel blades", "Comfortable ergonomic grip", "Food-grade materials, safe for baby food"],
  },
  {
    slug: "rexsun-juicer-mixer-grinder-500w", name: "Rexsun Juicer Mixer Grinder 500W",
    category: "Mixer Grinders & Juicers", dept: "kitchen-appliances",
    tagline: "One appliance, many possibilities",
    mrp: 4999, price: 3299,
    specs: { "Power (Watt)": "500", Jars: "Juicer + blender + grinder", Speed: "2 speed with incher", Blades: "Stainless Steel", Warranty: "1 Year" },
    highlights: ["3-in-1: juicer, mixer and grinder", "500 W motor for fast, efficient grinding", "2 speed control with incher", "Strong, robust body built for long life"],
  },
  {
    slug: "rexsun-mixer-grinder-550w", name: "Rexsun Mixer Grinder 550W",
    category: "Mixer Grinders & Juicers", dept: "kitchen-appliances",
    tagline: "Perfect grinding every time",
    mrp: 4499, price: 2999,
    specs: { "Power (Watt)": "550", Jars: "2 stainless steel jars", Speed: "3 speed with whip", Blades: "Stainless Steel", Warranty: "1 Year" },
    highlights: ["550 W motor for fast, fine grinding", "Rust-free stainless steel jars", "3 speed control with whip function", "Grinding, blending and whipping in one"],
  },
  {
    slug: "rexsun-mixer-grinder-500w", name: "Rexsun Mixer Grinder 500W",
    category: "Mixer Grinders & Juicers", dept: "kitchen-appliances",
    tagline: "One appliance, many possibilities",
    mrp: 3999, price: 2599,
    specs: { "Power (Watt)": "500", Jars: "2 stainless steel jars", Speed: "3 speed with whip", Blades: "Stainless Steel", Warranty: "1 Year" },
    highlights: ["500 W motor for everyday grinding", "Rust-free stainless steel jars", "3 speed control with whip function", "Easy to use and easy to clean"],
  },
  {
    slug: "rexsun-storage-water-heater-25l", name: "Rexsun Storage Water Heater 25L",
    category: "Geysers & Water Heaters", dept: "water-heaters",
    tagline: "Smart heating. Better living.",
    mrp: 12999, price: 8999,
    specs: { Capacity: "25 Litre", "ISI Mark": "IS 302-2", Tank: "Rust proof", Features: "Fast heating, energy efficient", Warranty: "2 Years" },
    highlights: ["25 L capacity, right for a family bathroom", "Fast heating with high safety cut-off", "Rust-proof tank built for long life", "Energy efficient — lower running cost"],
  },
];

for (const r of REXSUN) {
  products.unshift({
    id: r.slug, slug: r.slug, name: r.name, brand: "Rexsun",
    dept: r.dept, category: r.category, categorySlug: slugify(r.category),
    rooms: ROOMS[r.category] || [], tagline: r.tagline, specs: r.specs,
    highlights: r.highlights, options: [],
    variants: [{ sku: r.slug.toUpperCase(), attrs: {}, mrp: r.mrp, price: r.price, image: `/products/rexsun/${r.slug}.svg`, inStock: true }],
    price: r.price, priceMax: r.price, mrp: r.mrp, mrpMax: r.mrp,
    estimatedPrice: false, images: [`/products/rexsun/${r.slug}.svg`],
    wattage: Number(r.specs["Power (Watt)"]) || null, sweep: null,
    warranty: r.specs.Warranty, skuCount: 1, inStock: true, own: true,
  });
}

// ---------------------------------------------------------------- copy art

const outImg = path.join(HERE, "public/products");
let copied = 0, missing = 0;
for (const p of products) {
  for (const img of p.images) {
    if (img.endsWith(".svg")) continue;
    const from = path.join(B2B, "public", img);
    const to = path.join(outImg, img.replace(/^\/products\//, ""));
    if (!fs.existsSync(from)) { missing++; continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (!fs.existsSync(to)) { fs.copyFileSync(from, to); copied++; }
  }
  p.images = p.images.filter((i) => i.endsWith(".svg") || fs.existsSync(path.join(outImg, i.replace(/^\/products\//, ""))));
  p.variants.forEach((v) => {
    if (v.image && !v.image.endsWith(".svg") && !fs.existsSync(path.join(outImg, v.image.replace(/^\/products\//, "")))) v.image = null;
  });
}

// ---------------------------------------------------------------- write

const categories = [];
const seen = new Set();
for (const p of products) {
  if (seen.has(p.categorySlug)) continue;
  seen.add(p.categorySlug);
  categories.push({ slug: p.categorySlug, name: p.category, dept: p.dept });
}
for (const c of categories) c.count = products.filter((p) => p.categorySlug === c.slug).length;

const brands = [...new Set(products.map((p) => p.brand))].map((b) => ({
  slug: slugify(b), name: b, count: products.filter((p) => p.brand === b).length,
}));

fs.mkdirSync(path.join(HERE, "src/data"), { recursive: true });
fs.writeFileSync(path.join(HERE, "src/data/catalog.json"), JSON.stringify(products, null, 1));
fs.writeFileSync(path.join(HERE, "src/data/taxonomy.json"), JSON.stringify({
  departments: DEPARTMENTS.map((d) => ({ ...d, count: products.filter((p) => p.dept === d.slug).length })),
  categories, brands, rooms: ROOM_LIST.map((r) => ({ ...r, count: products.filter((p) => p.rooms.includes(r.slug)).length })),
}, null, 1));

console.log(`products      ${products.length}`);
console.log(`variants      ${products.reduce((s, p) => s + p.variants.length, 0)}`);
console.log(`with options  ${products.filter((p) => p.options.length).length}`);
console.log(`est. prices   ${products.filter((p) => p.estimatedPrice).length}`);
console.log(`no image      ${products.filter((p) => !p.images.length).length}`);
console.log(`images copied ${copied} (missing ${missing})`);
console.log(`departments   ${DEPARTMENTS.length}  categories ${categories.length}  brands ${brands.length}`);
