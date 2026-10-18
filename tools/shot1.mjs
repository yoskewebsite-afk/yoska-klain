import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [url, out, w = '1440', h = '900', full] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe }); const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: !!full }); await b.close();
