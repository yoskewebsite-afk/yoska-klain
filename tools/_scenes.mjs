import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [out, vw, vh] = [process.argv[2], +process.argv[3], +process.argv[4]]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=metal','--enable-gpu'] });
const p = await b.newPage({ viewport: { width: vw, height: vh }, isMobile: vw < 600, hasTouch: vw < 600 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:4190/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 60 }); };
await shot('a-hero-0');
const plan = [['[data-nf]', [.15, .3, .45, .9]], ['[data-tc]', [.05, .25, .42, .6, .78, .95]], ['[data-cont]', [.15, .3, .8]]];
for (const [sel, ps] of plan) { if (!(await p.$(sel))) continue; for (const pr of ps) { await p.evaluate(([pp, s]) => window.__scene(pp, s), [pr, sel]); await shot(`${sel.replace(/\W/g, '')}-${pr}`); } }
for (const sel of ['.os__hero', '.os__box', '.os__why', '.os__ovals', '#contact']) { await p.evaluate(s => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY - 0; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }, sel); await shot('z' + sel.slice(1)); }
console.log(JSON.stringify(errs));
await b.close();
