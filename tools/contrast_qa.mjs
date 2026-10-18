// Measures text contrast over photos/gradients, which axe cannot decide.
// For each element: hide its glyphs, screenshot its box, and compare the text colour with the background pixels.
// Reports the contrast against the median background and against the 90th-percentile worst pixel. node contrast_qa.mjs <w> <h>
import { chromium } from 'playwright-core';
import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900] = process.argv.slice(2).map(Number);
const STATES = [
  [0, ['.nav__links a', '.wordmark', '.sc-stations li', '.sc-hero .eyebrow', '#hero-title', '.sc-hero__lead', '.trust a', '.sc-hero .btn--line']],
  [0.22, ['[data-beat-above] .station-label', '[data-beat-above] .d2', '[data-beat-above] .lead']],
  [0.56, ['[data-beat-close] .d2', '[data-beat-close] .station-label', '.tcard__facet span', '.tcard__facet strong']],
  [0.9, ['[data-beat-tours] .d2', '[data-beat-tours] .textlink', '.tcard__tour > span', '.tcard__tour em']],
];
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900 });
await p.goto(process.env.URL || 'http://localhost:4190/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
const rows = [];
for (const [prog, sels] of STATES) {
  await p.evaluate(v => window.__scene(v), prog); await p.waitForTimeout(700);
  for (const sel of sels) {
    const els = await p.$$(sel);
    for (const el of els.slice(0, 3)) {
      const info = await el.evaluate(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { color: cs.color, vis: cs.visibility !== 'hidden' && +cs.opacity > .9 && r.width > 0 && r.bottom > 0 && r.top < innerHeight, size: cs.fontSize, weight: cs.fontWeight, box: { x: r.x, y: r.y, width: r.width, height: r.height } }; });
      if (!info.vis) continue;
      const fg = info.color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      await el.evaluate(e => { e.dataset.oc = e.style.color; e.style.setProperty('color', 'transparent', 'important'); e.querySelectorAll('*').forEach(c => c.style.setProperty('color', 'transparent', 'important')); });
      const clip = { x: Math.max(0, info.box.x), y: Math.max(0, info.box.y), width: Math.min(info.box.width, w - Math.max(0, info.box.x)), height: Math.min(info.box.height, h - Math.max(0, info.box.y)) };
      const buf = await p.screenshot({ clip, type: 'png' });
      await el.evaluate(e => { e.style.removeProperty('color'); e.querySelectorAll('*').forEach(c => c.style.removeProperty('color')); });
      const px = await p.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const out = []; for (let i = 0; i < d.length; i += 16) out.push([d[i], d[i + 1], d[i + 2]]); return out; }, buf.toString('base64'));
      // pixels with (near) the text colour are the element's own border, marker or cable line, not background
      const cr = px.map(c => ratio(fg, c)).filter(v => v > 1.25).sort((a, b) => a - b);
      const large = parseFloat(info.size) >= 24 || (parseFloat(info.size) >= 18.66 && +info.weight >= 700);
      const need = large ? 3 : 4.5;
      rows.push({ p: prog, sel, size: info.size, med: cr[cr.length >> 1].toFixed(2), worst10: cr[Math.floor(cr.length * .1)].toFixed(2), need, pass: cr[Math.floor(cr.length * .1)] >= need });
    }
  }
}
for (const r of rows) console.log(`${r.pass ? 'PASS' : 'FAIL'} p=${r.p} ${r.sel} (${r.size}) median ${r.med}:1, 10th-pct ${r.worst10}:1, needs ${r.need}`);
await b.close();
