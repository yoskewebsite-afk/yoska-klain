import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const b=await chromium.launch({executablePath:exe}); const r={};
for (const [w,h] of [[1440,900],[390,844]]) {
  const mobile=w<900; const p=await b.newPage({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://127.0.0.1:4190/',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  const k=`${w}`; r[k]={};
  // story dialog
  await p.evaluate(()=>document.querySelector('#stories').scrollIntoView()); await p.waitForTimeout(900);
  const y0=await p.evaluate(()=>scrollY);
  await p.click('[data-story="hands"]'); await p.waitForTimeout(900);
  r[k].dialogOpen=await p.evaluate(()=>document.querySelector('[data-story-dialog]').open);
  r[k].dialogTitle=await p.textContent('[data-sd-title]');
  r[k].focusInDialog=await p.evaluate(()=>document.activeElement.closest('dialog')!==null);
  await p.screenshot({path:`output/story/${w}-dialog.jpg`,quality:72,type:'jpeg'});
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  r[k].dialogClosed=!(await p.evaluate(()=>document.querySelector('[data-story-dialog]').open));
  r[k].focusBack=await p.evaluate(()=>document.activeElement.dataset.story||'');
  r[k].scrollKept=Math.abs((await p.evaluate(()=>scrollY))-y0)<4;
  // form
  await p.evaluate(()=>document.querySelector('#contact').scrollIntoView()); await p.waitForTimeout(800);
  await p.click('[data-contact] button[type=submit]'); r[k].nameErr=await p.isVisible('#c-name-err');
  await p.fill('#c-name','בדיקה'); await p.fill('#c-phone','12'); await p.click('[data-contact] button[type=submit]'); r[k].phoneErr=await p.isVisible('#c-phone-err');
  await p.fill('#c-phone','050-1234567'); await p.click('[data-contact] button[type=submit]'); await p.waitForTimeout(200);
  r[k].ready=await p.isVisible('[data-ready]'); r[k].waHref=(await p.getAttribute('[data-open-wa]','href')).slice(0,40);
  r[k].waLinks=await p.evaluate(()=>[...new Set([...document.querySelectorAll('a[href*="wa.me"]')].map(a=>a.href.split('?')[0]))]);
  // faq
  await p.click('#faq details:nth-of-type(3) summary'); r[k].faqOpen=await p.evaluate(()=>document.querySelector('#faq details:nth-of-type(3)').open);
  if (mobile) { await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(500); await p.click('.nav__menu'); r[k].menu=await p.isVisible('#menu'); await p.screenshot({path:`output/story/${w}-menu.jpg`,quality:72,type:'jpeg'}); await p.click('#menu a[href="/#about"]'); await p.waitForTimeout(1800); r[k].menuNav=await p.evaluate(()=>Math.round(document.querySelector('#about').getBoundingClientRect().top)); }
  else { // keyboard: tab into the 3rd tour card link while it waits behind
    await p.evaluate(()=>document.querySelector('#tours').scrollIntoView()); await p.waitForTimeout(800);
    await p.focus('[data-tk]:nth-child(3) .btn'); await p.waitForTimeout(900);
    r[k].kbCard=await p.evaluate(()=>{const c=document.querySelectorAll('[data-tk]')[2].getBoundingClientRect();return [Math.round(c.top),Math.round(c.left), getComputedStyle(document.querySelectorAll('[data-tk]')[2]).opacity]});
    r[k].trNum=await p.textContent('[data-tr-num]');
  }
  r[k].errs=errs; await p.close();
}
console.log(JSON.stringify(r,null,1)); await b.close();
