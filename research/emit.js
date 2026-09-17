const fs = require('fs');
const list = JSON.parse(fs.readFileSync('shortlist.json', 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inr = n => '₹' + n.toLocaleString('en-IN');
const price = p => !p.priced ? '<span class="np">price TBD</span>'
  : p.priceLow === p.priceHigh ? inr(p.priceLow) : inr(p.priceLow) + '–' + inr(p.priceHigh);
const shortName = n => n.length > 78 ? n.slice(0, 75).replace(/[ ,(]+$/, '') + '…' : n;

const ORDER = ['Fans', 'Lighting', 'Decorative Lighting', 'Kitchen Appliances', 'Water Heaters',
  'Air Coolers', 'Room Heaters', 'Garment Care', 'Torches & Emergency', 'Home Essentials'];

const dept = {};
list.forEach(p => ((dept[p.dept2] = dept[p.dept2] || {})[p.cat2] = (dept[p.dept2][p.cat2] || [])).push(p));

let html = '';
for (const d of ORDER) {
  const cats = dept[d]; if (!cats) continue;
  const items = Object.values(cats).flat();
  const lo = Math.min(...items.filter(p => p.priced).map(p => p.priceLow));
  const hi = Math.max(...items.filter(p => p.priced).map(p => p.priceHigh));
  html += `<section class="dept">
<header class="dept-h"><h3>${esc(d)}</h3><p class="dept-m"><span>${items.length} products</span><span>${items.reduce((s, p) => s + p.skuCount, 0)} source SKUs</span><span>${inr(lo)}–${inr(hi)}</span></p></header>`;
  for (const [c, ps] of Object.entries(cats)) {
    html += `<div class="cat"><h4>${esc(c)} <em>${ps.length}</em></h4><ul class="plist">`;
    ps.sort((a, b) => (b.priced - a.priced) || (b.skuCount - a.skuCount)).forEach(p => {
      html += `<li${p.own ? ' class="own"' : ''}><span class="pb">${esc(p.brand)}</span><span class="pn">${esc(shortName(p.name))}</span><span class="pv">${p.skuCount > 1 ? p.skuCount + ' var' : ''}</span><span class="pp">${price(p)}</span></li>`;
    });
    html += '</ul></div>';
  }
  html += '</section>';
}
fs.writeFileSync('products.html', html);

// summary table rows
let rows = '';
for (const d of ORDER) {
  const cats = dept[d]; if (!cats) continue;
  for (const [c, ps] of Object.entries(cats)) {
    const pr = ps.filter(p => p.priced);
    const brands = [...new Set(ps.map(p => p.brand))].join(', ');
    rows += `<tr><td>${esc(d)}</td><td>${esc(c)}</td><td class="n">${ps.length}</td><td class="n">${ps.length - pr.length || ''}</td><td class="n">${pr.length ? inr(Math.min(...pr.map(p => p.priceLow))) + '–' + inr(Math.max(...pr.map(p => p.priceHigh))) : '—'}</td><td>${esc(brands)}</td></tr>`;
  }
}
fs.writeFileSync('rows.html', rows);
console.log('products', list.length, 'depts', Object.keys(dept).length,
  'cats', Object.values(dept).reduce((s, c) => s + Object.keys(c).length, 0));
