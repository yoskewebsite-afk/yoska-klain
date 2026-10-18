import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'});
await p.evaluate(()=>window.__lenis.scrollTo(document.querySelector('.sb__list'),{immediate:true,offset:-200})); await p.waitForTimeout(1200);
const a=await p.evaluate(()=>scrollY); await p.click('[data-story="rio"]'); await p.waitForTimeout(1000);
const f=await p.evaluate(()=>document.activeElement.className); await p.mouse.wheel(0,600); await p.waitForTimeout(500);
await p.click('[data-sd-close]'); await p.waitForTimeout(800); const c=await p.evaluate(()=>scrollY);
console.log({a,c,f,focus:await p.evaluate(()=>document.activeElement.dataset.story)}); await b.close();
