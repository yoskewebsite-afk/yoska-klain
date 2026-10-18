import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [url,out,w,h]=process.argv.slice(2); const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:+w||1440,height:+h||900}});
await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(800); await p.screenshot({path:out,fullPage:true}); await b.close();
