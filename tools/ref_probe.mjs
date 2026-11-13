// Probe the design reference (viennainhebrew.com): fonts, computed styles, scroll screenshots.
// usage: node ref_probe.mjs 1440 900
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900] = process.argv.slice(2).map(Number);
const out = path.resolve('output/ref'); fs.mkdirSync(out, { recursive: true });
const mobile = w < 900;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
await p.goto('https://viennainhebrew.com/', { waitUntil: 'networkidle', timeout: 90000 }).catch(e => console.log('goto', e.message));
await p.waitForTimeout(3000);
await p.evaluate(() => document.fonts.ready);
const info = await p.evaluate(() => {
  const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`);
  const pick = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: el.className?.toString().slice(0, 80), text: el.textContent.trim().slice(0, 60), ff: s.fontFamily, fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, color: s.color, bg: s.backgroundColor, x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const heads = [...document.querySelectorAll('h1,h2,h3,h4')].slice(0, 40).map(pick);
  const btns = [...document.querySelectorAll('a.elementor-button, button, .elementor-button')].slice(0, 20).map(el => { const s = getComputedStyle(el); return { ...pick(el), radius: s.borderRadius, border: s.border, shadow: s.boxShadow, pad: s.padding }; });
  const body = pick(document.body);
  const ps = [...document.querySelectorAll('p')].slice(0, 12).map(pick);
  return { fonts, heads, btns, body, ps, height: document.documentElement.scrollHeight, title: document.title };
});
fs.writeFileSync(`${out}/info-${w}.json`, JSON.stringify(info, null, 1));
console.log(info.fonts.join('\n'), '\nheight', info.height);
const H = info.height; let i = 0;
for (let y = 0; y < H; y += Math.round(h * 0.5)) {
  await p.mouse.wheel(0, 0); await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${w}-${String(i++).padStart(3, '0')}.jpg`, quality: 60, type: 'jpeg' });
  if (i > 70) break;
}
await b.close();
