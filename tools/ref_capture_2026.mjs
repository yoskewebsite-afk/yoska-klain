// Motion study of six live references (study only, never site assets).
// Usage: node ref_capture_2026.mjs [filter]. Writes JPGs + log into ../references/2026-10-16/
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../references/2026-10-16');
const REFS = [
  ['apple-airpods', 'https://www.apple.com/airpods-pro/', 22, 450],
  ['porsche', 'https://www.porsche.com/international/', 12, 600],
  ['patagonia', 'https://www.patagonia.com/stories/', 10, 700],
  ['rimowa', 'https://www.rimowa.com/', 12, 600],
  ['porsche911', 'https://www.porsche.com/international/models/911/', 14, 600],
  ['locomotive', 'https://locomotive.ca/en', 12, 500],
  ['lusion', 'https://lusion.co/', 16, 450],
  ['activetheory', 'https://activetheory.net/', 10, 500],
];
const only = process.argv[2];
fs.mkdirSync(root, { recursive: true });
const log = [];
const b = await chromium.launch({ executablePath: exe, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [name, url, steps, px] of REFS) {
  if (only && !name.includes(only)) continue;
  for (const [vw, vh, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, isMobile: tag === 'm', hasTouch: tag === 'm',
      userAgent: tag === 'm' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' });
    const p = await ctx.newPage();
    const entry = { name, url, tag, shots: [] };
    try {
      await p.goto(url, { waitUntil: 'load', timeout: 60000 });
      await p.waitForTimeout(7000);
      // decline non-essential cookies where a banner blocks the page (privacy-preserving option only)
      for (const re of [/only necessary/i, /reject all/i, /decline/i, /necessary only/i, /reject/i]) {
        const btn = p.getByRole('button', { name: re }).first();
        if (await btn.count() && await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); entry.consent = String(re); await p.waitForTimeout(1500); break; }
      }
      entry.title = await p.title();
      entry.height = await p.evaluate(() => document.documentElement.scrollHeight);
      // record which elements are sticky/fixed: the "what stays" evidence
      entry.sticky = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e).position; return s === 'sticky' || s === 'fixed'; }).slice(0, 25).map(e => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 50)} [${getComputedStyle(e).position}] ${Math.round(e.getBoundingClientRect().height)}px`));
      await p.mouse.move(vw / 2, vh / 2);
      const n = tag === 'm' ? Math.ceil(steps * 0.7) : steps;
      for (let i = 0; i <= n; i++) {
        const f = `${name}-${tag}-${String(i).padStart(2, '0')}.jpg`;
        await p.screenshot({ path: path.join(root, f), quality: 55, type: 'jpeg' });
        entry.shots.push({ f, y: await p.evaluate(() => Math.round(scrollY)) });
        for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, px / 6); await p.waitForTimeout(60); }
        await p.waitForTimeout(1100);
      }
    } catch (e) { entry.error = e.message.split('\n')[0]; }
    log.push(entry); console.log(name, tag, entry.error || `${entry.shots.length} shots, h=${entry.height}, ${entry.title}`);
    await ctx.close();
  }
}
fs.writeFileSync(path.join(root, `capture-log${only ? '-' + only : ''}.json`), JSON.stringify(log, null, 1));
await b.close();
