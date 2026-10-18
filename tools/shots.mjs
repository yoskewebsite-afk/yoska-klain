// Screenshots of real implemented states, for visual QA. No video is produced.
//   node shots.mjs story            -> the pinned story at fixed progress values (1440x900)
//   node shots.mjs sections         -> the chapters below the story, scrolled to (1440x900)
//   node shots.mjs pages            -> inner pages, full page (1440 wide)
//   node shots.mjs mobile           -> every page at 390px, full page, reduced motion off
// Output: $OUT or ../captures/site
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = process.env.PROTO_URL || 'http://localhost:4173';
const mode = process.argv[2] || 'story';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.env.OUT || path.resolve(here, '../captures/site');
fs.mkdirSync(out, { recursive: true });
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const problems = [];

async function open(w, h, url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'he-IL', ...opts });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') problems.push(url + ' console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push(url + ' error: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(url + ' ' + r.status() + ' ' + r.url()); });
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(400);
  return page;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const PAGES = { home: '/', tours: '/tours/', tour: '/tours/haifa-ahuvati.html', tour2: '/tours/sodot-veremazim.html', groups: '/groups.html', gallery: '/gallery.html', notfound: '/404.html' };

if (mode === 'story') {
  const [w, h] = (process.env.SIZE || '1440x900').split('x').map(Number);
  const page = await open(w, h, '/?capture=1');
  const states = (process.env.P || '0,0.2,0.3,0.47,0.68,0.8,0.88,1').split(',');
  for (const p of states) {
    await page.evaluate((v) => window.__render(v), Number(p));
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, `story-${p.replace('.', '_')}.png`) });
  }
} else if (mode === 'sections') {
  const page = await open(1440, 900, '/');
  for (const id of ['about', 'groups', 'moments', 'voices', 'south-america', 'faq', 'contact']) {
    await page.evaluate((i) => { const e = document.getElementById(i); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - (i === 'moments' ? -700 : 60)); }, id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, `section-${id}.png`) });
  }
  console.log('overflow home 1440:', await overflow(page));
} else if (mode === 'pages') {
  for (const [name, url] of Object.entries(PAGES)) {
    if (name === 'home') continue;
    const page = await open(1440, 900, url, { reducedMotion: 'reduce' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `page-${name}.png`), fullPage: true });
    console.log(name, 'overflow 1440:', await overflow(page));
  }
} else if (mode === 'mobile') {
  for (const [name, url] of Object.entries(PAGES)) {
    const page = await open(390, 844, url, { isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `mobile-${name}.png`), fullPage: true });
    console.log(name, 'overflow 390:', await overflow(page));
  }
}
console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'no console errors, no failed requests');
await browser.close();
