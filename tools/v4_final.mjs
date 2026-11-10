// Final delivery screenshots (server on :4190) → captures/2026-11-10/
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const out = path.resolve('../captures/2026-11-10');
const b = await chromium.launch({ executablePath: exe });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const m = w < 700;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: m ? 2 : 1, isMobile: m, hasTouch: m });
  await p.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const snap = async n => { await p.waitForTimeout(2600); await p.screenshot({ path: `${out}/${m ? 'mobile' : 'desktop'}-${n}.jpg`, quality: 80, type: 'jpeg' }); };
  for (const [q, n] of [[0, '01-hero'], [.22, '02-scene-rises'], [.9, '03-scene-anchored']]) { await p.evaluate(q => window.__hero(q), q); await snap(n); }
  let i = 4;
  for (const id of ['map', 'tours', 'about', 'groups', 'moments', 'reviews', 'faq', 'contact']) {
    await p.evaluate(id => { const el = document.getElementById(id); scrollTo(0, el.getBoundingClientRect().top + scrollY - (id === 'tours' ? 0 : 10)); }, id);
    if (id === 'tours') { await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('[data-card-toggle]').click()); }
    await snap(String(i++).padStart(2, '0') + '-' + id);
  }
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await snap('12-footer');
  await p.goto('http://127.0.0.1:4190/tours/haifa-ahuvati.html', { waitUntil: 'networkidle' }); await snap('13-tour-page');
  await p.evaluate(() => scrollTo(0, innerHeight * .9)); await snap('14-tour-page-details');
  await p.close();
}
await b.close();
