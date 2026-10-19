import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
console.log(await p.evaluate(()=>{const r=e=>{const el=document.querySelector(e);const b=el.getBoundingClientRect();return [Math.round(b.left),Math.round(b.width),getComputedStyle(el).transform]}; return {stage:r('.hx__stage'),sky:r('.hx__sky'),photo:r('.hx__photo'),ui:r('.hx__ui'),hx:r('.hx')}}));
await b.close();
