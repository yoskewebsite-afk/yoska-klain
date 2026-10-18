import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b = await chromium.launch({ executablePath: exe });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' })).newPage();
for (const u of process.argv.slice(2)) {
  try {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ title: document.title, links: [...document.querySelectorAll('a')].map(a => a.textContent.trim().slice(0,40) + ' -> ' + a.href).filter(s => /demo|github|Development|code/i.test(s)).slice(0, 15), text: document.body.innerText.slice(0, 6000) }));
    console.log('=== ' + u + '\n' + r.title + '\n' + r.links.join('\n') + '\n---\n' + r.text);
  } catch (e) { console.log('FAIL ' + u + ' ' + e.message); }
}
await b.close();
