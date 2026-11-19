// 19.11.2026 QA: element screenshots of the new home parts. node tools/qa_1911.mjs <base> <outdir> <width>
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [base, out, w] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, isMobile: +w < 700, hasTouch: +w < 700, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('yk-prefs', JSON.stringify({ v: 1, measure: false, decided: true })); } catch {} });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.evaluate(() => document.querySelector('.cookie, [data-cookie]')?.remove());
for (const id of ['top', 'about', 'tours', 'upcoming', 'groups', 'unique', 'abroad']) {
  const el = await p.$('#' + id); if (!el) { console.log('missing', id); continue; }
  await el.scrollIntoViewIfNeeded(); await p.evaluate((i) => { const e = document.getElementById(i); scrollTo(0, e.getBoundingClientRect().top + scrollY - 200); }, id);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${w}-${id}.png` });
}
const logos = await p.$('.cb--logos'); if (logos) { await logos.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await logos.screenshot({ path: `${out}/${w}-logos.png` }); } else console.log('no logos section');
const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log('overflow', ov, 'stripes', await p.$$eval('.stripes', (x) => x.map((e) => e.style.getPropertyValue('--p')).join(',')), 'errors', errs);
await b.close();
