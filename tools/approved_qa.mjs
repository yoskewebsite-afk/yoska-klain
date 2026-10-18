import {chromium} from 'playwright-core';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const root=path.resolve('output/playwright');fs.mkdirSync(root,{recursive:true});
const browser=await chromium.launch({executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium')});
const report={cases:[],failures:[]};const base='http://127.0.0.1:4181/';
function check(value,label){if(!value)report.failures.push(label);}
const sections=['home','perspective','tours','about','moments','plan','stories','south-america','faq','contact'];
for(const [name,width,height,reduced] of [['desktop',1440,900,false],['mobile',390,844,false],['small',320,740,false],['tablet',768,1024,false],['reduced',1440,900,true]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:reduced?'reduce':'no-preference'});const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.metrics={lcp:0,cls:0};new PerformanceObserver(l=>l.getEntries().forEach(e=>window.metrics.lcp=e.startTime)).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.metrics.cls+=e.value;})).observe({type:'layout-shift',buffered:true});});
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
 const initial=await page.evaluate(()=>({metrics:window.metrics,font:getComputedStyle(document.querySelector('h1')).fontFamily,bodyFont:getComputedStyle(document.body).fontFamily,loadedImages:[...document.images].filter(i=>i.complete&&i.naturalWidth).length,requests:performance.getEntriesByType('resource').length}));
 check(initial.font.includes('Karantina'),name+' heading font');check(initial.bodyFont.includes('Heebo'),name+' body font');
 if(name==='desktop'||name==='mobile')await page.screenshot({path:`${root}/${name}-hero.png`});
 await page.locator('[data-view="gardens"]').click();check((await page.locator('[data-view="gardens"]').getAttribute('aria-pressed'))==='true',name+' hero control');await page.locator('[data-view="haifa-panorama"]').click();
 let maxOverflow=0;
 for(const id of sections){await page.evaluate(id=>{const el=document.getElementById(id);scrollTo(0,el.getBoundingClientRect().top+scrollY);},id);await page.waitForTimeout(600);maxOverflow=Math.max(maxOverflow,await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth));if(['desktop','mobile'].includes(name))await page.screenshot({path:`${root}/${name}-${id}.jpg`,type:'jpeg',quality:85});}
 check(maxOverflow===0,name+' horizontal overflow '+maxOverflow);
 await page.locator('[data-tour-next]').scrollIntoViewIfNeeded();await page.locator('[data-tour-next]').click();await page.waitForTimeout(700);check((await page.locator('[data-tour-link]').getAttribute('href')).includes('haifa-shel-maala'),name+' carousel next');
 await page.locator('[data-tour-prev]').click();await page.waitForTimeout(700);check((await page.locator('[data-tour-link]').getAttribute('href')).includes('haifa-ahuvati'),name+' carousel previous');
 const sync=[];
 if(width>=760&&!reduced){for(const p of [0,.4,.76,.99,.4,0]){await page.evaluate(p=>{const e=document.getElementById('stories');scrollTo(0,e.offsetTop+(e.offsetHeight-innerHeight)*p)},p);await page.waitForTimeout(120);sync.push(await page.locator('[data-story][aria-expanded="true"]').getAttribute('data-story'));}check(sync.join(',')==='0,1,2,2,1,0',name+' reverse scroll synchronization '+sync.join(','));}
 for(const i of [1,2,0]){await page.locator(`[data-story="${i}"]`).click();await page.waitForTimeout(180);check((await page.locator(`[data-story="${i}"]`).getAttribute('aria-expanded'))==='true',name+' story click '+i);}
 await page.locator('.faq-list summary').first().click();await page.waitForTimeout(100);check(await page.locator('.faq-list details').first().evaluate(e=>e.open),name+' FAQ opens');await page.locator('.faq-list summary').nth(1).click();await page.waitForTimeout(100);check(!(await page.locator('.faq-list details').first().evaluate(e=>e.open)),name+' FAQ single open');
 if(width<760){await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);await page.locator('.nav__menu').click();check(await page.locator('#menu').isVisible(),name+' mobile menu');await page.keyboard.press('Escape');check(!(await page.locator('#menu').isVisible()),name+' escape menu');}
 const distance=await page.evaluate(()=>{let s=document.getElementById('stories'),a=document.getElementById('south-america');return (a.offsetTop-s.offsetTop)/innerHeight;});
 if(width>=760&&!reduced)check(Math.abs(distance-2)<.01,name+' accordion-to-arrival distance '+distance);
 const broken=await page.evaluate(()=>[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));check(!broken.length,name+' broken images');check(!errors.length,name+' console '+errors.join(';'));
 report.cases.push({name,width,height,initial,maxOverflow,errors,broken,sync,accordionToArrivalViewports:distance});await context.close();
}
// Check retained useful pages in a real browser.
const page=await browser.newPage();for(const route of ['tours/','tours/haifa-ahuvati.html','groups.html','gallery.html']){await page.goto(base+route,{waitUntil:'networkidle'});check(await page.locator('h1').count()===1,'inner page '+route);check(await page.locator('a[href^="https://wa.me/972544361667"]').count()>0,'contact '+route);}
// Cold-cache emulated mobile network: 1.6 Mbit/s download, 150ms RTT, CPU x4.
const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await p.addInitScript(()=>{window.m={lcp:0,cls:0};new PerformanceObserver(l=>l.getEntries().forEach(e=>window.m.lcp=e.startTime)).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.m.cls+=e.value;})).observe({type:'layout-shift',buffered:true});});await p.goto(base,{waitUntil:'networkidle'});await p.waitForTimeout(1500);report.throttledMobile=await p.evaluate(()=>({...window.m,transferBytes:performance.getEntriesByType('resource').reduce((sum,e)=>sum+e.transferSize,0)}));await ctx.close();
fs.writeFileSync(root+'/qa-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();process.exitCode=report.failures.length?1:0;
