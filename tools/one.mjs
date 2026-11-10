// one screenshot at a section: node one.mjs w h selector offset name [still]
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w, h, sel, off = 0, name = 'one', mode = '', pg = '/'] = process.argv.slice(2);
const mobile = +w < 700;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: mode === 'still' ? 'reduce' : 'no-preference' });
await p.goto('http://127.0.0.1:4190' + pg, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
await p.evaluate(([s, o]) => { const el = document.querySelector(s); scrollTo(0, el.getBoundingClientRect().top + scrollY + +o); }, [sel, off]);
await p.waitForTimeout(2500);
await p.screenshot({ path: `output/v4/${name}.jpg`, quality: 75, type: 'jpeg' });
await b.close();
