import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [url, w, h, ...exprs] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe }); const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:4173' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
for (const e of exprs) console.log(e, '=>', JSON.stringify(await p.evaluate(e)));
await b.close();
