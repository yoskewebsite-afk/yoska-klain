import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b=await chromium.launch({executablePath:exe}); const out=[];
const cases=[['#top',0,['.op__title','.op__lede','.op__hero .kicker','.nav__links a']],['#top',.4,['.op__eyes-title']],['MT',1,['.mt__title']],['#contact',0,['.ct__title','.ct__lead p','.ct__phone']]];
for (const [w,h] of [[1440,900],[390,844]]) {
  const p=await b.newPage({viewport:{width:w,height:h}});
  await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'});
  for (const [sec,q,sels] of cases) {
    await p.evaluate(([s,q])=>{ if(s==='MT'){const el=document.querySelector('#back-to-sea');const sp=document.querySelector('[data-mt-spacer]').offsetHeight;window.__lenis.scrollTo(el.getBoundingClientRect().top+scrollY+sp*q,{immediate:true});window.ScrollTrigger.update();} else window.__at(s,q)},[sec,q]); await p.waitForTimeout(1300);
    for (const sel of sels) {
      const box=await p.evaluate(s=>{const e=[...document.querySelectorAll(s)].find(e=>{const r=e.getBoundingClientRect();return r.width&&r.bottom>0&&r.top<innerHeight});if(!e)return null;const r=e.getBoundingClientRect();const c=getComputedStyle(e).color;return {x:r.left,y:r.top,w:r.width,h:r.height,c}},sel);
      if(!box||box.w<2) continue;
      await p.addStyleTag({content:`${sel}, ${sel} *{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}`}).then(t=>t);
      const id='x'+Math.random().toString(36).slice(2); const f=`output/story/_c.png`;
      await p.screenshot({path:f,clip:{x:Math.max(0,box.x),y:Math.max(0,box.y),width:Math.min(box.w,w-box.x),height:Math.min(box.h,h-box.y)}});
      await p.evaluate(()=>document.querySelectorAll('style').forEach(s=>{if(s.textContent.includes('transparent!important'))s.remove()}));
      out.push({w,sel,color:box.c,file:fs.readFileSync(f).toString('base64')});
    }
  }
  await p.close();
}
fs.writeFileSync('output/story/contrast.json',JSON.stringify(out)); await b.close();
