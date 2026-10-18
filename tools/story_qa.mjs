// Visual QA for the 18.10.2026 homepage: viewport screenshots at points inside every sticky scene.
// usage (server on :4190): node story_qa.mjs 1440 900 [still]
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, mode = ''] = process.argv.slice(2);
const out = path.resolve('output/story'); fs.mkdirSync(out, { recursive: true });
const mobile = +w < 900;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: mode === 'still' ? 'reduce' : 'no-preference' });
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
const tag = `${w}${mode ? '-' + mode : ''}`;
const shot = async name => { await p.waitForTimeout(1100); await p.screenshot({ path: `${out}/${tag}-${name}.jpg`, quality: 72, type: 'jpeg' }); };
const at = async (sel, prog) => { await p.evaluate(([s, q]) => window.__at ? window.__at(s, q) : document.querySelector(s).scrollIntoView(), [sel, prog]); };
const plan = mode === 'still' ? [['#top', 0], ['#eyes-title', 0], ['#tours', 0], ['#route', 0], ['#about', 0], ['#journeys', 0], ['#back-to-sea', 0], ['#stories', 0], ['#voices', 0], ['#faq', 0], ['#contact', 0]]
  : [['#top', 0], ['#top', .1], ['#top', .3], ['#top', .55], ['#top', .8], ['#tours', 0], ['#tours', .35], ['#tours', .7], ['#tours', 1],
     ['#route', .1], ['#route', .6], ['#about', .2], ['#about', .5], ['#journeys', 0], ['#journeys', .5], ['#journeys', 1],
     ['#back-to-sea', 0], ['#back-to-sea', .07], ['#back-to-sea', .15], ['#back-to-sea', .2], ['#back-to-sea', .27], ['#back-to-sea', .4], ['#back-to-sea', .6], ['#back-to-sea', .8],
     ['#back-to-sea', .9], ['#back-to-sea', 1], ['#voices', 0], ['#voices', .45], ['#faq', 0], ['#contact', 0]];
for (const [sel, q] of plan) {
  if (mode === 'still') await p.evaluate(s => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY - 80); }, sel);
  else await at(sel, q);
  await shot(`${sel.slice(1)}-${String(q).replace('.', '_')}`);
}
const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
console.log(JSON.stringify({ tag, ...m, errs }));
await b.close();
