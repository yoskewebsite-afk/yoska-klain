import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b=await chromium.launch({executablePath:exe}); const p=await b.newPage({viewport:{width:1280,height:800}}); const res={};
for (const u of ['/tours/','/tours/haifa-ahuvati.html','/groups.html','/gallery.html','/privacy.html']) {
  const errs=[]; p.removeAllListeners('pageerror'); p.on('pageerror',e=>errs.push(String(e)));
  const r=await p.goto('http://127.0.0.1:4190'+u,{waitUntil:'networkidle'}); await p.waitForTimeout(300);
  res[u]={status:r.status(), errs, sw:await p.evaluate(()=>document.documentElement.scrollWidth), cls:await p.evaluate(()=>document.documentElement.className)};
  if (u==='/tours/haifa-ahuvati.html') await p.screenshot({path:'output/story/sub-tour.jpg',quality:65,type:'jpeg'});
}
// broken internal links on the homepage
await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'});
const links=await p.evaluate(()=>[...new Set([...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href').split('#')[0]).filter(Boolean))]);
const ids=await p.evaluate(()=>[...document.querySelectorAll('a[href*="#"]')].map(a=>a.getAttribute('href').split('#')[1]).filter(id=>id&&!document.getElementById(id)));
for (const l of links) { const r=await p.request.get('http://127.0.0.1:4190'+l); if (r.status()!==200) res['BROKEN '+l]=r.status(); }
res.missingAnchors=ids; console.log(JSON.stringify(res,null,1)); await b.close();
