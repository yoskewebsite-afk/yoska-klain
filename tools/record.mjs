// Records a walkthrough of the real site, frame by frame (no screen recorder involved).
// The pinned story is painted with window.__render(p); the chapters below are reached by
// scrolling the actual page. Frames go to $FRAMES_DIR; encode with encode.py.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FPS = 30;
const [W, H] = (process.env.SIZE || '1920x1080').split('x').map(Number);
const dir = process.env.FRAMES_DIR || path.join(os.tmpdir(), 'yoske-site-frames');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'he-IL' })).newPage();
await page.goto('http://localhost:4173/?capture=1', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await document.fonts.ready;
  document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  document.querySelectorAll('.will-reveal').forEach((n) => n.classList.add('is-in'));
});
await page.waitForTimeout(800);

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let frame = 0;
async function shot() { await page.screenshot({ path: path.join(dir, String(frame++).padStart(5, '0') + '.png') }); }

// 1. the pinned story: [seconds, from p, to p]; intro plays during the first hold
const story = [[2.6, 0, 0], [5.5, 0, 0.3], [2.6, 0.3, 0.47], [1.8, 0.47, 0.47], [4.2, 0.47, 0.8], [2.6, 0.8, 1], [2.6, 1, 1]];
let t0 = 0;
for (const [sec, a, b] of story) {
  const n = Math.round(sec * FPS);
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 1;
    const intro = Math.min(1, (t0 + i / FPS) / 1.2);
    await page.evaluate(([p, k]) => window.__render(p, k), [a + (b - a) * ease(t), intro]);
    await shot();
  }
  t0 += sec;
}

// 2. the chapters below, by scrolling the page itself: [element, seconds to travel, seconds to hold, offset]
const stops = [['about', 2.4, 2.2, 0], ['groups', 2.2, 2.2, 40], ['moments', 1.8, 0, 0], ['moments-end', 4.2, 1.0, 0], ['voices', 2.0, 2.4, 0], ['south-america', 2.2, 2.4, 0], ['faq', 1.8, 1.4, 0], ['contact', 2.2, 3.0, 0]];
let y = 0;
for (const [id, travel, hold, off] of stops) {
  const target = await page.evaluate(([i, o]) => {
    if (i === 'moments-end') { const m = document.getElementById('moments'); return m.offsetTop + m.offsetHeight - innerHeight; }
    const e = document.getElementById(i);
    return Math.min(e.getBoundingClientRect().top + scrollY - 70 - o, document.documentElement.scrollHeight - innerHeight);
  }, [id, off]);
  const from = y, n = Math.round(travel * FPS);
  for (let i = 1; i <= n; i++) {
    y = from + (target - from) * ease(i / n);
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(16);
    await shot();
  }
  for (let i = 0; i < Math.round(hold * FPS); i++) { await page.waitForTimeout(8); await shot(); }
}
console.log(frame, 'frames,', (frame / FPS).toFixed(1), 's at', W + 'x' + H, '->', dir);
await browser.close();
