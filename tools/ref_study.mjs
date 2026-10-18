// Screenshots of reference sites at successive scroll positions, for motion study only (not site assets).
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../references/motion-study');
const [name, url, steps = '10', stepPx = '450'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' })).newPage();
await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(5000);
console.log(await p.title(), await p.evaluate(() => document.documentElement.scrollHeight));
for (let i = 0; i <= +steps; i++) {
  await p.screenshot({ path: path.join(out, `${name}-${String(i).padStart(2, '0')}.jpg`), quality: 60, type: 'jpeg' });
  for (let k = 0; k < 6; k++) { await p.mouse.wheel(0, +stepPx / 6); await p.waitForTimeout(60); }
  await p.waitForTimeout(1300);
}
await b.close();
