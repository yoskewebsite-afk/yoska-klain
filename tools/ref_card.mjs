import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('https://viennainhebrew.com/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await p.waitForTimeout(2000);
for (let y = 0; y < 3200; y += 100) { await p.mouse.wheel(0, 100); await p.waitForTimeout(40); }
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const out = []; document.querySelectorAll('.swiper-slide, [class*=jet-listing-grid__item]').forEach(el => { const r = el.getBoundingClientRect(); if (r.top > 0 && r.top < innerHeight && r.width > 100) { const pick = e => { const s = getComputedStyle(e); return [e.className.toString().slice(0, 60), s.borderRadius, s.border, s.borderBottom, s.boxShadow.slice(0, 200), s.backgroundImage.slice(0, 160)]; }; out.push({ r: [r.x, r.y, r.width, r.height].map(Math.round), self: pick(el), kids: [...el.querySelectorAll('*')].slice(0, 30).map(e => { const s = getComputedStyle(e); return (s.borderTopLeftRadius !== '0px' || s.borderBottomWidth !== '0px' || s.backgroundImage !== 'none') ? pick(e) : null; }).filter(Boolean).slice(0, 8) }); } });
  return out.slice(0, 3);
});
console.log(JSON.stringify(info, null, 1).slice(0, 5000));
await p.screenshot({ path: 'output/ref/cards-2x.png' });
const c = await p.$('.swiper-slide'); if (c) { await c.hover(); await p.waitForTimeout(800); await p.screenshot({ path: 'output/ref/cards-hover.png' }); }
await b.close();
