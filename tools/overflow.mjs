import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w=1440,h=900]=process.argv.slice(2);
const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:+w,height:+h}});
await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
for (const y of [0, 5000, 10000, 15000, 20000]) { await p.evaluate(y=>scrollTo(0,y), y); await p.waitForTimeout(300);
console.log(y, JSON.stringify(await p.evaluate(()=>{const cw=document.documentElement.clientWidth;return {sw:document.documentElement.scrollWidth, bad:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return (r.right>cw+1||r.left<-1)&&r.width>0 && !e.closest('.op__stage,.mt__stage,.jr__stage,.jn__gridwrap')}).slice(0,6).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().left)+'/'+Math.round(e.getBoundingClientRect().right))}}))); }
await b.close();
