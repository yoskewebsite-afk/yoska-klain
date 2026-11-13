// Visual QA for the 10.11.2026 rebuild. usage (server on :4190): node v4_qa.mjs 1440 900 [still] [page]
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, mode = '', pg = '/'] = process.argv.slice(2);
const out = path.resolve('output/v4'); fs.mkdirSync(out, { recursive: true });
const mobile = +w < 700;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: mode === 'still' ? 'reduce' : 'no-preference' });
const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:4190' + pg, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
const tag = `${w}${mode ? '-' + mode : ''}${pg === '/' ? '' : pg.replace(/[\/.]/g, '_')}`;
const shot = async name => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${tag}-${name}.jpg`, quality: 70, type: 'jpeg' }); };
if (pg === '/') {
  if (mode !== 'still') for (const q of [0, .12, .25, .4, .55, .7, .9, 1]) { await p.evaluate(q => window.__hero ? window.__hero(q) : 0, q); await shot('hero-' + String(q).replace('.', '_')); }
  for (const id of ['map', 'tours', 'about', 'groups', 'moments', 'reviews', 'faq', 'abroad', 'contact']) {
    await p.evaluate(id => { const el = document.getElementById(id); scrollTo(0, el.getBoundingClientRect().top + scrollY - 20); }, id);
    await shot(id);
  }
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await shot('end');
} else {
  for (let i = 0; i < 4; i++) { await p.evaluate(i => scrollTo(0, i * innerHeight * .9), i); await shot('s' + i); }
}
const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight,
  wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.rail__track,.moments,.chips,.groups__cards,.hero,.about,.foot,.arc,.map'); }).slice(0, 5).map(e => e.className) }));
console.log(JSON.stringify({ tag, ...m, errs }));
await b.close();
