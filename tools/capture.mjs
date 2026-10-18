// Steps the prototype's own timeline frame by frame and saves PNG frames.
// Usage:
//   node capture.mjs keys                 -> key-state screenshots into ../captures/keyframes
//   node capture.mjs frames [fps]         -> every frame into <scratch>/frames (then encode.py)
//   node capture.mjs mobile               -> full-page 390px screenshots
// Requires the local server:  python3 -m http.server 4173 --directory prototype
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = process.env.PROTO_URL || 'http://localhost:4173/';
const mode = process.argv[2] || 'keys';
const [VW, VH] = (process.env.SIZE || '1440x900').split('x').map(Number);
const here = path.dirname(new URL(import.meta.url).pathname);
const outKeys = path.resolve(here, '../captures/keyframes');
const outFrames = process.env.FRAMES_DIR || path.join(os.tmpdir(), 'yoske-frames');

// Use an already-installed Chromium if Playwright's own revision is not downloaded.
function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (!fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    for (const sub of ['chrome-mac', 'chrome-mac-arm64']) {
      const p = path.join(cache, d, sub, 'Chromium.app/Contents/MacOS/Chromium');
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChromium() });

async function open(width, height, query = '') {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'he-IL' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(BASE + query, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.loading = 'eager', i.decode().catch(() => {}))));
  });
  return page;
}

if (mode === 'keys') {
  fs.mkdirSync(outKeys, { recursive: true });
  const page = await open(VW, VH, '?capture=1' + (process.env.QUERY || ''));
  const keys = process.env.TIMES
    ? Object.fromEntries(process.env.TIMES.split(',').map((t) => ['t' + t.padStart(4, '0'), Number(t)]))
    : { '01-invitation': 2.0, '02-entering': 5.4, '03-through-the-lens': 8.3, '04-windows-open': 10.6, '05-my-haifa': 14.6, '06-window-becomes-scene': 16.6, '07-invitation': 21.0 };
  for (const [name, t] of Object.entries(keys)) {
    await page.evaluate((t) => window.__seek(t), t);
    await page.screenshot({ path: path.join(process.env.OUT || outKeys, name + '.png') });
  }
  console.log('keyframes ->', outKeys);
} else if (mode === 'frames') {
  const fps = Number(process.argv[3] || 30);
  fs.rmSync(outFrames, { recursive: true, force: true });
  fs.mkdirSync(outFrames, { recursive: true });
  const page = await open(VW, VH, '?capture=1');
  const duration = await page.evaluate(() => window.__duration);
  const total = Math.round(duration * fps);
  for (let i = 0; i <= total; i++) {
    await page.evaluate((t) => window.__seek(t), i / fps);
    await page.screenshot({ path: path.join(outFrames, String(i).padStart(5, '0') + '.png') });
  }
  console.log(total + 1, 'frames at', fps, 'fps ->', outFrames);
} else if (mode === 'mobile') {
  fs.mkdirSync(outKeys, { recursive: true });
  const page = await open(390, 844);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: path.join(outKeys, 'mobile-390-top.png') });
  await page.screenshot({ path: path.join(outKeys, 'mobile-390-full.png'), fullPage: true });
  for (const w of [390, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 844 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log('horizontal overflow at', w, '=', over);
  }
}

await browser.close();
