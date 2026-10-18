// Screenshot of one element on a page: node shot_el.mjs <path> <selector> <width> <height> <out>
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [u, sel, w = 1440, h = 900, out = 'output/subpages/el.jpg'] = process.argv.slice(2);
const mobile = +w < 900;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
await p.goto('http://127.0.0.1:4190' + u, { waitUntil: 'networkidle' });
await p.evaluate(s => { const e = document.querySelector(s); scrollTo(0, e.getBoundingClientRect().top + scrollY - 90); }, sel);
await p.waitForTimeout(900);
await p.screenshot({ path: out, quality: 72, type: 'jpeg' });
await b.close();
