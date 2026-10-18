// Visual QA for the inner pages: full-page and first-viewport screenshots at a given size.
// usage (server on :4190): node subpage_qa.mjs 1440 900 [tag]
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900, tag = 'after'] = process.argv.slice(2);
const out = path.resolve('output/subpages'); fs.mkdirSync(out, { recursive: true });
const mobile = +w < 900;
const pages = ['/tours/', '/tours/haifa-ahuvati.html', '/tours/sodot-veremazim.html', '/groups.html', '/gallery.html', '/404.html', '/privacy.html', '/terms.html', '/accessibility.html'];
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const res = {};
for (const u of pages) {
  const errs = []; p.removeAllListeners('pageerror'); p.removeAllListeners('console');
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const r = await p.goto('http://127.0.0.1:4190' + u, { waitUntil: 'networkidle' });
  const name = `${tag}-${w}-${u.replace(/\//g, '_').replace(/^_|\.html$/g, '') || 'tours'}`;
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}-top.jpg`, quality: 70, type: 'jpeg' });
  // walk down so lazy images and reveals fire, then capture the whole page
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .7) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${name}-full.jpg`, quality: 60, type: 'jpeg', fullPage: true });
  res[u] = { status: r.status(), errs, sw: await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };
}
console.log(JSON.stringify(res));
await b.close();
