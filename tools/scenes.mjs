// Screenshots of the homepage scenes at fixed progress values, for visual QA.
//   node scenes.mjs [WxH] [scene:p,scene:p,...] [outdir]
//   e.g. node scenes.mjs 1440x900 journey:0,journey:0.15 ../captures/v2
// Also reports console errors, failed requests and horizontal overflow.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const BASE = process.env.PROTO_URL || 'http://localhost:4173';
const [size = '1440x900', list = 'journey:0', outArg] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(outArg || path.join(here, '../captures/v2'));
fs.mkdirSync(out, { recursive: true });
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b = await chromium.launch({ executablePath: exe });
const mobile = w < 900;
const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'he-IL',
  reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('pageerror', (e) => problems.push('error: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) problems.push(r.status() + ' ' + r.url()); });
await page.goto(BASE + (process.env.URL || '/'), { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(1600);
for (const item of list.split(',')) {
  const [scene, p] = item.split(':');
  if (scene === 'full') {
    await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }));
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `${w}-full.jpg`), fullPage: true, type: 'jpeg', quality: 70 });
    continue;
  }
  await page.evaluate(([s, v]) => {
    const el = s === 'top' ? document.body : (document.querySelector(`[data-scene="${s}"]`) || document.getElementById(s));
    const top = el.getBoundingClientRect().top + scrollY;
    const range = Math.max(0, el.offsetHeight - innerHeight);
    window.scrollTo(0, range > innerHeight * 0.2 ? top + Number(v) * range : top + Number(v) * el.offsetHeight - (s === 'top' ? 0 : 80));
  }, [scene, p]);
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelectorAll('img').forEach((i) => { if (i.getBoundingClientRect().top < innerHeight * 2) i.loading = 'eager'; }));
  await page.evaluate(async () => { await Promise.all([...document.images].filter((i) => i.loading === 'eager').map((i) => i.decode().catch(() => {}))); });
  await page.evaluate(() => window.__settle && window.__settle());
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, `${w}-${scene}-${p.replace('.', '_')}.jpg`), type: 'jpeg', quality: 78 });
}
const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('overflow:', ov);
console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'no console errors, no failed requests');
await b.close();
