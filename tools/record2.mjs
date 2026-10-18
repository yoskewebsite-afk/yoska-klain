// Records a walkthrough of the redesigned homepage (scroll-driven scenes), frame by frame.
// Each frame: scroll the real page to y, wait two animation frames for the scenes to paint, screenshot.
// Usage: node record2.mjs   (FRAMES_DIR, SIZE optional)  then: python3 encode.py <dir> <out.mp4> 30
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const FPS = 30;
const [W, H] = (process.env.SIZE || '1920x1080').split('x').map(Number);
const dir = process.env.FRAMES_DIR || path.join(os.tmpdir(), 'yoske-site2-frames');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const page = await (await b.newContext({ viewport: { width: W, height: H }, locale: 'he-IL' })).newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4173/?capture=1', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
});
await page.waitForTimeout(1000);
// scroll positions of each scene: [id, fraction of its pinned range or of its height]
const P = await page.evaluate(() => {
  const at = (id, f) => { const e = document.getElementById(id); const top = e.getBoundingClientRect().top + scrollY;
    const range = e.offsetHeight - innerHeight; return Math.round(range > innerHeight * 0.2 ? top + f * range : top + f * e.offsetHeight - 70); };
  const max = document.documentElement.scrollHeight - innerHeight;
  return { at: null, max, j0: at('top', 0), j30: at('top', 0.3), j55: at('top', 0.55), j100: at('top', 1),
    pl22: at('places', 0.22), pl55: at('places', 0.55), pl90: at('places', 0.92), ab: at('about', 0),
    tr: at('tours', 0), mo50: at('moments', 0.5), mo95: at('moments', 0.95), sa90: at('south-america', 0.9),
    pn90: at('plan', 0.9), vo: at('voices', 0), fi: max };
});
// [target, seconds to travel, seconds to hold]
const plan = [[P.j0, 0, 2.2], [P.j30, 4.2, 0.6], [P.j55, 3.2, 1.2], [P.j100, 3.0, 0.4], [P.pl22, 2.2, 1.4], [P.pl55, 3.0, 1.2],
  [P.pl90, 3.0, 1.2], [P.ab, 2.2, 2.4], [P.tr, 2.0, 1.8], [P.mo50, 2.6, 0.4], [P.mo95, 2.4, 1.0], [P.sa90, 3.4, 1.8],
  [P.pn90, 3.4, 1.4], [P.vo, 2.0, 2.4], [P.fi, 2.6, 3.0]];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let f = 0, y = 0;
const shot = async () => { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: path.join(dir, String(f++).padStart(5, '0') + '.png') }); };
for (const [to, travel, hold] of plan) {
  const from = y, n = Math.round(travel * FPS);
  for (let i = 1; i <= n; i++) { y = from + (to - from) * ease(i / n); await page.evaluate((v) => scrollTo(0, v), y); await shot(); }
  if (!n) { y = to; await page.evaluate((v) => scrollTo(0, v), y); }
  for (let i = 0; i < Math.round(hold * FPS); i++) await shot();
}
console.log(f, 'frames', (f / FPS).toFixed(1) + 's', errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors');
await b.close();
