// Scene QA: node scene_qa.mjs <width> <height> <tag> [reduce]
// Screenshots scene A and B at fixed progress values, then key sections; logs console errors and horizontal overflow.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, tag = 'd', reduce] = process.argv.slice(2);
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'output/scene-qa', `${w}x${h}${reduce ? '-reduce' : ''}`);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const mobile = +w < 900;
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: reduce ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push(String(e)));
await p.goto(process.env.URL || 'http://127.0.0.1:4190/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const shot = async (name) => { await p.waitForTimeout(450); await p.screenshot({ path: path.join(out, `${name}.jpg`), quality: 70, type: 'jpeg' }); };
const info = { errors, overflow: [] };
const checkOverflow = async (label) => { const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) info.overflow.push([label, o]); };
await shot('A-000');
const A = (process.env.PA || '0.04,0.1,0.2,0.3,0.38,0.46,0.55,0.62,0.68,0.75,0.85,1').split(',');
for (const v of A) { await p.evaluate(v => window.__scene(+v), v); await shot(`A-${String(Math.round(v * 100)).padStart(3, '0')}`); await checkOverflow('A' + v); }
// backwards check: same state after reversing
await p.evaluate(() => window.__scene(.9)); await p.waitForTimeout(300); await p.evaluate(() => window.__scene(.55)); await shot('A-055-back');
if (!process.env.ONLYA) {
  for (const v of ['0', '0.2', '0.45', '0.75', '1']) { await p.evaluate(v => window.__scene(+v, '[data-plan]'), v); await shot(`B-${String(Math.round(v * 100)).padStart(3, '0')}`); }
  for (const id of ['about', 'groups', 'match', 'board', 'south-america', 'faq', 'contact']) {
    await p.evaluate(id => { const el = document.getElementById(id); scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70, behavior: 'instant' }); }, id);
    await p.waitForTimeout(900); await shot(`S-${id}`); await checkOverflow(id);
  }
  await p.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await shot('S-footer');
  await p.screenshot({ path: path.join(out, 'full.jpg'), fullPage: true, quality: 45, type: 'jpeg' }).catch(() => {});
}
info.height = await p.evaluate(() => document.documentElement.scrollHeight);
info.htmlClass = await p.evaluate(() => document.documentElement.className);
fs.writeFileSync(path.join(out, 'info.json'), JSON.stringify(info, null, 1));
console.log(JSON.stringify(info));
await b.close();
