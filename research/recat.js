// The B2B feed's categories come straight from each brand's own site, and they
// disagree with each other (Indo files geysers under "Iron", Surya files water
// heaters under "Heating Appliances", air coolers hide inside "General").
// A consumer store can't ship that. This maps every shortlisted product onto a
// single shopper-facing taxonomy using the product name, then re-caps.
const fs = require('fs');
const list = JSON.parse(fs.readFileSync('shortlist.json', 'utf8'));

const RULES = [
  [/immersion/i,                                   'Water Heaters',        'Immersion Rods'],
  [/geyser|water heater|instant water|storage water|insta-?hot|insta-?warm|atlantic|arctic|cubis|heatx/i, 'Water Heaters', 'Geysers & Water Heaters'],
  [/air cooler|cooler|breezo/i,                    'Air Coolers',          'Air Coolers'],
  [/room heater|halogen room|blower/i,             'Room Heaters',         'Room Heaters'],
  [/mixer grinder|juicer|chopper|blender/i,        'Kitchen Appliances',   'Mixer Grinders & Juicers'],
  [/kettle/i,                                      'Kitchen Appliances',   'Electric Kettles'],
  [/induction|cooktop|chulha/i,                    'Kitchen Appliances',   'Induction & Cooktops'],
  [/air fryer/i,                                   'Kitchen Appliances',   'Air Fryers'],
  [/\biron\b|dry iron/i,                           'Garment Care',         'Irons'],
  [/exhaust|ventilation|axial/i,                   'Fans',                 'Exhaust Fans'],
  [/pedestal|farrata|stand fan/i,                  'Fans',                 'Pedestal Fans'],
  [/wall fan|wall hanging/i,                       'Fans',                 'Wall Fans'],
  [/table fan|personal fan|cabin fan|AP-12/i,      'Fans',                 'Table & Personal Fans'],
  [/torch/i,                                       'Torches & Emergency',  'Torches'],
  [/mosquito racket/i,                             'Home Essentials',      'Mosquito Rackets'],
  [/spikeguard|spike guard|extension/i,            'Home Essentials',      'Extension & Spike Guards'],
  [/multiplug|multi plug|plug top/i,               'Home Essentials',      'Plugs & Multiplugs'],
  [/holder|ceiling rose/i,                         'Home Essentials',      'Holders & Ceiling Roses'],
  [/ding|door ?bell/i,                             'Home Essentials',      'Doorbells'],
  [/rope light|strip light|string light|jag-mag/i, 'Decorative Lighting',  'Strip & Rope Lights'],
  [/batten|tube/i,                                 'Lighting',             'Battens & Tubelights'],
  [/panel|downlight|dazzle|aura|spot|striker/i,    'Lighting',             'Panels & Downlights'],
  [/lamp|bulb/i,                                   'Lighting',             'Bulbs & Lamps'],
  [/cob|deco/i,                                    'Decorative Lighting',  'Decorative COB'],
];

const GROUP_FALLBACK = {
  'Ceiling Fans': ['Fans', 'Ceiling Fans'],
  'Table, Pedestal & Wall': ['Fans', 'Table & Personal Fans'],
  'Exhaust & Ventilation': ['Fans', 'Exhaust Fans'],
  'Bulbs & Lamps': ['Lighting', 'Bulbs & Lamps'],
  'Battens & Tubelights': ['Lighting', 'Battens & Tubelights'],
  'Panels & Downlights': ['Lighting', 'Panels & Downlights'],
  'Decorative & Strip': ['Decorative Lighting', 'Decorative COB'],
  'Torches & Emergency': ['Torches & Emergency', 'Torches'],
  'Kitchen Appliances': ['Kitchen Appliances', 'Small Kitchen'],
  'Water Heating': ['Water Heaters', 'Geysers & Water Heaters'],
  'Garment Care': ['Garment Care', 'Irons'],
  'Room Heating': ['Room Heaters', 'Room Heaters'],
  'Home Electricals': ['Home Essentials', 'Accessories'],
};

// Ceiling fans must not be stolen by the generic /lamp|bulb/ rule (SILENCIO
// MINI LED etc.), so anything already grouped as a ceiling fan short-circuits.
for (const p of list) {
  if (p.group === 'Ceiling Fans' && !/exhaust|pedestal|wall|table/i.test(p.name)) {
    [p.dept2, p.cat2] = ['Fans', 'Ceiling Fans'];
    continue;
  }
  const hit = RULES.find(([re]) => re.test(p.name));
  [p.dept2, p.cat2] = hit ? [hit[1], hit[2]] : GROUP_FALLBACK[p.group];
}

fs.writeFileSync('shortlist.json', JSON.stringify(list, null, 1));

const t = {};
list.forEach(p => {
  const k = p.dept2 + ' / ' + p.cat2;
  t[k] = t[k] || { n: 0, priced: 0, lo: [], hi: [] };
  t[k].n++; if (p.priced) t[k].priced++;
  if (p.priceLow) { t[k].lo.push(p.priceLow); t[k].hi.push(p.priceHigh); }
});
Object.entries(t).sort().forEach(([k, v]) =>
  console.log(String(v.n).padStart(3), k.padEnd(42), 'priced', String(v.priced).padStart(3),
    '₹', v.lo.length ? Math.min(...v.lo) + '–' + Math.max(...v.hi) : 'n/a'));
console.log('TOTAL', list.length, '| priced', list.filter(p => p.priced).length);
