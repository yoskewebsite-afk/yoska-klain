// Interaction checks: reverse scrolling returns to the same state, keyboard focus order, link targets.
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
const a = await p.screenshot();
for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(30); }
await p.waitForTimeout(800);
const mid = await p.evaluate(() => scrollY);
for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, -300); await p.waitForTimeout(30); }
await p.waitForTimeout(1500);
const bshot = await p.screenshot();
fs.writeFileSync('/tmp/yk-a.png', a); fs.writeFileSync('/tmp/yk-b.png', bshot);
console.log('scrolled to', mid, 'and back; screenshots in /tmp/yk-a.png /tmp/yk-b.png');
// keyboard
await p.keyboard.press('Tab');
for (let i = 0; i < 22; i++) {
  await p.keyboard.press('Tab');
  const f = await p.evaluate(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e.closest('[data-j]') || e);
    return `${e.tagName} "${(e.textContent || '').trim().slice(0, 30)}" y=${Math.round(r.top + scrollY)} visibleInViewport=${r.top >= 0 && r.bottom <= innerHeight} opacity=${cs.opacity}`; });
  console.log('tab', i + 2, f);
}
// the hero primary action lands on the tours chapter
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
await p.click('.j-hero .btn--primary'); await p.waitForTimeout(1200);
console.log('after hero CTA, #tours top =', await p.evaluate(() => Math.round(document.getElementById('tours').getBoundingClientRect().top)));
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await b.close();
