import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
// scroll down through everything with the wheel, then back up, then check the first frames match
for (let i=0;i<60;i++){ await p.mouse.wheel(0,500); await p.waitForTimeout(40); }
await p.waitForTimeout(800);
for (let i=0;i<70;i++){ await p.mouse.wheel(0,-500); await p.waitForTimeout(40); }
await p.waitForTimeout(1500);
const st=await p.evaluate(()=>({y:scrollY, yoske:getComputedStyle(document.querySelector('.hx__cut')).opacity, hero:getComputedStyle(document.querySelector('[data-hx-hero]')).opacity, eyes:getComputedStyle(document.querySelector('[data-hx-closer]')).opacity}));
await p.screenshot({path:'output/story/1440-reverse-top.jpg',quality:70,type:'jpeg'});
console.log(st); await b.close();
