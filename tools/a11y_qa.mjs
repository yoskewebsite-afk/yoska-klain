// Accessibility + privacy runtime audit: axe-core (WCAG 2.0/2.1/2.2 A+AA) on every page, plus cookies, storage and request origins.
// node a11y_qa.mjs [w] [h] [reduce]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const axe = fs.readFileSync(new globalThis.URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const [w = 1440, h = 900, reduce] = process.argv.slice(2);
const BASE = process.env.URL || 'http://localhost:4190';
const pages = ['/', '/tours/', '/tours/haifa-ahuvati.html', '/tours/sodot-veremazim.html', '/groups.html', '/gallery.html', '/404.html', ...(process.env.EXTRA || '').split(',').filter(Boolean)];
const b = await chromium.launch({ executablePath: exe });
// bypassCSP only lets the test inject axe; the page's own CSP violations are still logged from the console
const ctx = await b.newContext({ bypassCSP: !!process.env.BYPASS, viewport: { width: +w, height: +h }, isMobile: +w < 900, hasTouch: +w < 900, reducedMotion: reduce ? 'reduce' : 'no-preference' });
const origins = new Set(); const out = [];
for (const u of pages) {
  const p = await ctx.newPage(); const csp = [];
  p.on('request', r => origins.add(new globalThis.URL(r.url()).origin));
  p.on('console', m => { if (/Content Security Policy|Refused/.test(m.text())) csp.push(m.text().slice(0, 160)); });
  await p.goto(BASE + u, { waitUntil: 'networkidle' });
  // walk the page so scroll-driven states and lazy content are exercised, then come back to a resting state
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(60); }
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(500);
  await p.addScriptTag({ content: axe });
  const r = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })));
  const storage = await p.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie }));
  out.push({ page: u, violations: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) })), incomplete: r.incomplete.map(v => `${v.id}(${v.nodes.length})`), storage, csp });
  await p.close();
}
const cookies = await ctx.cookies();
const res = { viewport: `${w}x${h}${reduce ? ' reduce' : ''}`, cookies: cookies.length, origins: [...origins], pages: out };
fs.mkdirSync('output/a11y', { recursive: true });
fs.writeFileSync(`output/a11y/axe-${w}x${h}${reduce ? '-reduce' : ''}.json`, JSON.stringify(res, null, 1));
console.log(`cookies=${res.cookies} origins=${res.origins.join(' ')}`);
for (const pg of out) console.log(`${pg.page}: ${pg.violations.length ? pg.violations.map(v => `${v.id}[${v.impact}]x${v.n}`).join(', ') : 'no violations'} | storage ${JSON.stringify(pg.storage)} | incomplete ${pg.incomplete.join(' ')}${pg.csp.length ? ' | CSP ' + pg.csp.join(';') : ''}`);
await b.close();
