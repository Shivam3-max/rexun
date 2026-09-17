// Builds the D2C shortlist for the Rexsun storefront from the Amit Electricals
// B2B catalogue. Collapses colour-temperature / wattage SKU explosions into one
// consumer product, keeps only categories a household actually buys online,
// then caps each merchandising group so the store stays browsable.
const fs = require('fs');
const SRC = '/Users/shivambhandari/Desktop/Claude code/amit-electricals/src/data/catalog.json';
const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const GROUPS = [
  ['Ceiling Fans',            55, ['BLDC Fan','BLDC Celing Fan','BLDC Technology Fans','Designer Fan','High Speed Fan','Standard Fan','Ceiling Fan','Ceiling Fans','Decorative Ceiling','Decorative Ceiling Fan','Standard Ceiling','Premium Ceiling']],
  ['Table, Pedestal & Wall',  30, ['Table Fan','Table Fans','Pedestal Fan','Pedestal Fans','Wall Fan','Wall Fans','Personal Fans','Inverter Table Fans','Climate Control']],
  ['Exhaust & Ventilation',   14, ['Exhaust Fan','Exhaust Fans','Domestic Exhaust']],
  ['Bulbs & Lamps',           20, ['LED Bulb','LED Lamps']],
  ['Battens & Tubelights',    15, ['LED Batten','LED Battens','LED Tubelights Decorative Battens']],
  ['Panels & Downlights',     20, ['Panel Light','Panels LED Downlighters','Downlight','LED Downlighters','2X2 Panels']],
  ['Decorative & Strip',      14, ['Decorative Lights','Decorative COB','Rope and Strip Lights']],
  ['Torches & Emergency',      6, ['Torches','Torches and Emergency Lights']],
  ['Kitchen Appliances',      28, ['Air Fryers','Cooking Range','Food Preparation','Induction','Infrared Cooktop','Kettle','Kitchen','Mixer Grinder','General']],
  ['Water Heating',           18, ['Geyser','Instant Water Heater','Storage Water Heater','Water Heater','Immersion Heaters','Immersion Rod','Solar Heater']],
  ['Garment Care',            12, ['Iron','Irons','Garment Care']],
  ['Room Heating',            10, ['Room Heater','Heating Appliances']],
  ['Home Electricals',        20, ['Extension Cord','Extension Boards','Spikeguard','Multiplug','Multi Plug','Plug Tops','Lamp Holders','Doorbells','Door Bell','Ceiling Rose','Bug Zapper','Mosquito Rackets','Electrical Accessories']],
];

const catToGroup = new Map();
GROUPS.forEach(([g, , cats]) => cats.forEach(c => catToGroup.set(c, g)));

const baseName = n => n.split('·')[0].trim();
const priceOf = p => p.mrp || (p.variants || []).map(v => v.mrp).filter(Boolean).sort((a, b) => a - b)[0] || null;

// ---- collapse variant SKUs into one consumer product ----------------------
const products = new Map();
for (const p of all) {
  const group = catToGroup.get(p.category);
  if (!group) continue;
  const key = `${p.brand}|${group}|${baseName(p.name)}`;
  if (!products.has(key)) {
    products.set(key, {
      key, group, brand: p.brand, dept: p.dept, category: p.category,
      name: baseName(p.name), description: p.description,
      skus: [], prices: [], images: new Set(),
    });
  }
  const rec = products.get(key);
  rec.skus.push(p.code);
  const pr = priceOf(p);
  if (pr) rec.prices.push(pr);
  (p.localImages || []).forEach(i => rec.images.add(i));
}

const list = [...products.values()].map(r => ({
  ...r,
  images: [...r.images],
  skuCount: r.skus.length,
  priceLow: r.prices.length ? Math.min(...r.prices) : null,
  priceHigh: r.prices.length ? Math.max(...r.prices) : null,
  priced: r.prices.length > 0,
}));

// ---- rank & cap -----------------------------------------------------------
// Priced products first (we can list them today), then ones with the widest
// variant range (a real family, not a one-off), then image coverage.
const rank = (a, b) =>
  (b.priced - a.priced) ||
  (b.images.length > 0) - (a.images.length > 0) ||
  (b.skuCount - a.skuCount) ||
  a.name.localeCompare(b.name);

const out = [];
for (const [group, cap] of GROUPS) {
  const pool = list.filter(p => p.group === group).sort(rank);
  out.push(...pool.slice(0, cap));
}

// Rexsun own-brand heroes are added by hand (creatives, not in the B2B feed).
const REXSUN = [
  ['Rexsun Chopper 300W',                'Kitchen Appliances', 'Small Kitchen'],
  ['Rexsun Hand Blender 300W',           'Kitchen Appliances', 'Small Kitchen'],
  ['Rexsun Juicer Mixer Grinder 500W',   'Kitchen Appliances', 'Mixer Grinders'],
  ['Rexsun Mixer Grinder 550W (3 Jar)',  'Kitchen Appliances', 'Mixer Grinders'],
  ['Rexsun Mixer Grinder 500W (2 Jar)',  'Kitchen Appliances', 'Mixer Grinders'],
  ['Rexsun Storage Water Heater 25L',    'Water Heating',      'Water Heaters'],
].map(([name, group, category]) => ({
  key: 'Rexsun|' + name, group, brand: 'Rexsun', dept: 'appliances', category,
  name, description: 'Rexsun own-label', skus: [], images: [], skuCount: 1,
  priceLow: null, priceHigh: null, priced: false, own: true,
}));

const final = [...REXSUN, ...out];
fs.writeFileSync('/Users/shivambhandari/Desktop/Claude code/rexsun/research/shortlist.json',
  JSON.stringify(final, null, 1));

// ---- report ---------------------------------------------------------------
const tally = {};
final.forEach(p => {
  const t = (tally[p.group] = tally[p.group] || { n: 0, skus: 0, priced: 0, brands: {}, lo: [], hi: [] });
  t.n++; t.skus += p.skuCount; if (p.priced) t.priced++;
  t.brands[p.brand] = (t.brands[p.brand] || 0) + 1;
  if (p.priceLow) { t.lo.push(p.priceLow); t.hi.push(p.priceHigh); }
});
console.log('TOTAL products', final.length, '| underlying SKUs', final.reduce((s, p) => s + p.skuCount, 0));
for (const [g, t] of Object.entries(tally)) {
  console.log(String(t.n).padStart(3), g.padEnd(24),
    'skus', String(t.skus).padStart(4),
    'priced', String(t.priced).padStart(3),
    '₹', t.lo.length ? Math.min(...t.lo) + '-' + Math.max(...t.hi) : 'n/a',
    '|', Object.entries(t.brands).map(([b, n]) => b + ':' + n).join(' '));
}
const bb = {}; final.forEach(p => bb[p.brand] = (bb[p.brand] || 0) + 1);
console.log('BRANDS', bb);
console.log('PRICED', final.filter(p => p.priced).length, '/', final.length);
