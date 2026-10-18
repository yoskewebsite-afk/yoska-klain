import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w=1440,h=900,...qs]=process.argv.slice(2); const mobile=+w<900;
const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
for (const q of qs) { // q = progress of the mountain timeline itself (0..1)
  await p.evaluate(q=>{const el=document.querySelector('#back-to-sea'); const sp=document.querySelector('[data-mt-spacer]').offsetHeight; const y=el.getBoundingClientRect().top+scrollY+sp*q; window.__lenis.scrollTo(y,{immediate:true}); window.ScrollTrigger.update();}, +q);
  await p.waitForTimeout(1300); await p.screenshot({path:`output/story/${w}-mt-${q}.jpg`,quality:72,type:'jpeg'}); }
await b.close();
