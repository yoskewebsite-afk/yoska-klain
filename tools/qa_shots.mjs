// Deterministic QA captures of the v3 homepage: node qa_shots.mjs <width> <height> <out-dir> scene:p [scene:p ...] | sel:#id
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w, h, outDir, ...states] = process.argv.slice(2);
const base = process.env.BASE || 'http://localhost:4180/';
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 600, hasTouch: +w < 600, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const errors = [];
p.on('console', m => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', e => errors.push(e.message));
await p.goto(base, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
for (const s of states) {
  const [name, v] = s.split(':');
  if (name === 'sel') await p.evaluate(sel => { const el = document.querySelector(sel); scrollTo(0, el.getBoundingClientRect().top + scrollY); }, v);
  else if (name === 'y') await p.evaluate(y => scrollTo(0, +y), v);
  else await p.evaluate(([n, x]) => window.__scene(n, +x), [name, v]);
  await p.waitForTimeout(name === 'sel' ? 1400 : 450);
  await p.screenshot({ path: path.join(outDir, `${w}-${name}-${v.replace(/[.#]/g, '_')}.jpg`), type: 'jpeg', quality: 72 });
}
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(JSON.stringify({ errors, overflow }));
await b.close();
