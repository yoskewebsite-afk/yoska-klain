// Keyboard walk: Tab through the page; every focused element must be on screen, opaque, and show a focus indicator. Then Shift+Tab back.
import { chromium } from 'playwright-core';
import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, page = '/'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto((process.env.URL || 'http://localhost:4190') + page, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
const seen = []; const bad = [];
const probe = () => p.evaluate(() => {
  const e = document.activeElement; if (!e || e === document.body) return null;
  const r = e.getBoundingClientRect(); let o = 1, n = e; while (n && n !== document) { o *= +getComputedStyle(n).opacity; n = n.parentElement; }
  const cs = getComputedStyle(e);
  const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 || cs.boxShadow !== 'none';
  const covered = (() => { const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 20); const t = document.elementFromPoint(x, y); return t && !(e === t || e.contains(t) || t.contains(e)); })();
  return { label: (e.getAttribute('aria-label') || e.textContent || e.value || e.name || e.tagName).trim().slice(0, 40), tag: e.tagName, onScreen: r.bottom > 0 && r.top < innerHeight && r.width > 0, opacity: +o.toFixed(2), ring, covered };
});
for (let i = 0; i < 140; i++) {
  await p.keyboard.press('Tab'); await p.waitForTimeout(900);
  const s = await probe(); if (!s) continue;
  seen.push(s.label);
  if (!s.onScreen || s.opacity < .95 || !s.ring || s.covered) bad.push(`${i}: ${s.tag} "${s.label}" onScreen=${s.onScreen} opacity=${s.opacity} ring=${s.ring} covered=${s.covered}`);
  if (s.label.includes('מסעות באתר ברזילאו') && seen.filter(x => x === s.label).length > 1) break;
}
for (let i = 0; i < 8; i++) { await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(120); }
const back = await probe();
console.log(`focus stops: ${seen.length}; problems: ${bad.length}; shift+tab ok: ${!!back}`);
console.log(bad.join('\n'));
console.log('order sample:', seen.slice(0, 40).join(' | '));
await b.close();
