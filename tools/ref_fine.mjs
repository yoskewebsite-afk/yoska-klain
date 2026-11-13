// Fine-grained scroll capture of the reference hero sequence + element positions.
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, from = 0, to = 1400, step = 100] = process.argv.slice(2).map(Number);
const out = path.resolve('output/ref/fine'); fs.mkdirSync(out, { recursive: true });
const mobile = w < 900;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
await p.goto('https://viennainhebrew.com/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await p.waitForTimeout(2500);
let y = 0;
for (let t = from; t <= to; t += step) {
  await p.mouse.move(w / 2, h / 2);
  while (y < t) { await p.mouse.wheel(0, Math.min(50, t - y)); y += Math.min(50, t - y); await p.waitForTimeout(25); }
  await p.waitForTimeout(500);
  const meta = await p.evaluate(() => {
    const r = []; document.querySelectorAll('img').forEach(i => { const b = i.getBoundingClientRect(); if (b.width > 500 && b.bottom > 0 && b.top < innerHeight) { const s = getComputedStyle(i); const pp = i.closest('[data-settings]'); r.push({ src: i.src.split('/').pop(), top: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width), op: s.opacity, tf: s.transform, pos: getComputedStyle(i.parentElement).position, set: pp?.getAttribute('data-settings')?.slice(0, 300) }); } });
    return { sy: scrollY, r };
  });
  console.log(t, JSON.stringify(meta));
  await p.screenshot({ path: `${out}/${w}-${String(t).padStart(5, '0')}.jpg`, quality: 55, type: 'jpeg' });
}
await b.close();
