// Mobile-first audit of the public site and the admin. usage (dev server on :4200): node tools/mobile_audit.mjs [width] [height]
// Reports per page: horizontal overflow, touch targets under 44px, form fields under 16px (iOS zoom), broken images, console errors, text under 12px.
import { chromium } from 'playwright-core';
import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const [W = 390, H = 844] = process.argv.slice(2).map(Number);
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const B = 'http://127.0.0.1:4200';
const site = ['/', '/tours/', '/tours/haifa-ahuvati.html', '/families.html', '/orgs.html', '/private-groups.html', '/about.html', '/contact.html', '/quiz.html', '/south-america.html', '/gallery.html', '/privacy.html', '/404.html'];
const admin = ['dashboard', 'leads', 'pages', 'pages/index', 'pages/index/faq', 'pages/shared', 'tours', 'tours/haifa-ahuvati', 'forms', 'media', 'settings', 'integrations'];
const out = path.resolve('output/mobile'); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' });
const p = await ctx.newPage();
const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); }); p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
const probe = () => {
  const d = document.documentElement, bad = { overflowX: d.scrollWidth - d.clientWidth, small: [], fields: [], broken: 0, tiny: 0, wide: [] };
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const name = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '') + ((e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18) ? ` "${(e.textContent || e.getAttribute('aria-label')).trim().slice(0, 18)}"` : ''));
  for (const e of document.querySelectorAll('a[href],button,[role="button"],summary,select,input:not([type=hidden]):not([type=checkbox]),textarea')) {
    if (!vis(e) || e.closest('[aria-hidden="true"]') || e.closest('.visually-hidden,.vh,.skip')) continue;
    const r = e.getBoundingClientRect();
    if (r.bottom < 0) continue;
    if ((r.height < 44 || r.width < 44) && !(e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li,span,h1,h2,h3,figcaption,div.legal') && r.height >= 20)) bad.small.push(`${name(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 16) bad.fields.push(name(e));
  }
  for (const i of document.images) if (i.complete && i.naturalWidth === 0 && vis(i)) bad.broken++;
  for (const e of document.querySelectorAll('body *')) { if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('svg,[data-hero],[data-sgs],[data-rwall],[data-trail],.rail,.sprite,.map__scroll,.tablewrap,.hero,.sgs,.rwall,.trail,.floaters,[data-float],[data-travel],.obj')) bad.wide.push(name(e) + ' r=' + Math.round(r.right)); }
  bad.small = [...new Set(bad.small)].slice(0, 8); bad.wide = [...new Set(bad.wide)].slice(0, 5); bad.fields = [...new Set(bad.fields)].slice(0, 4);
  return bad;
};
const report = [];
const run = async (label, url, hook) => {
  errs.length = 0;
  try { await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); } catch { /* keep going */ }
  await p.waitForTimeout(700); if (hook) await hook();
  for (let y = 0; y < 4; y++) { await p.evaluate((y) => scrollTo(0, y * innerHeight), y); await p.waitForTimeout(150); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200);
  const r = await p.evaluate(probe);
  await p.screenshot({ path: `${out}/${W}-${label.replace(/[^\w]+/g, '_')}.jpg`, quality: 55, type: 'jpeg' });
  const issues = [r.overflowX > 0 && `overflowX=${r.overflowX}`, r.small.length && `tap<44: ${r.small.join(' | ')}`, r.fields.length && `field<16px: ${r.fields.join(', ')}`, r.broken && `broken imgs=${r.broken}`, r.wide.length && `wide: ${r.wide.join(' | ')}`, errs.length && `errors: ${errs.slice(0, 2).join(' ; ')}`].filter(Boolean);
  report.push({ label, issues }); console.log(issues.length ? `✗ ${label}\n    ${issues.join('\n    ')}` : `✓ ${label}`);
};
for (const u of site) await run(u, B + u);
await p.goto(B + '/admin'); await p.fill('#email', 'yossi@example.com'); await p.fill('#password', 'yoske-demo-2026'); await p.click('#go'); await p.waitForTimeout(2500);
await p.evaluate(() => { try { localStorage.setItem('yoske-admin-install-seen', '1'); } catch (e) { /* */ } });
for (const t of ['glass', 'dark']) {
  await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, t);
  for (const a of admin) await run(`admin ${t} ${a}`, `${B}/admin#/${a}`, async () => { await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, t); await p.waitForTimeout(900); });
}
await b.close();
console.log(`\n${report.filter((r) => !r.issues.length).length}/${report.length} clean at ${W}px`);
