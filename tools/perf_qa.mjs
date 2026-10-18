// Lab performance sample: node perf_qa.mjs <w> <h> <label> [throttle]
// Fresh context, optional throttling (1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT, CPU x4). Reports LCP, CLS, transfer by type, long tasks.
import { chromium } from 'playwright-core';
import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 390, h = 844, label = 'mobile', throttle] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 900, hasTouch: +w < 900, deviceScaleFactor: +w < 900 ? 3 : 1 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
if (throttle) {
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
await p.addInitScript(() => {
  window.__perf = { lcp: 0, lcpEl: '', cls: 0, long: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__perf.lcp = e.startTime; window.__perf.lcpEl = (e.element && (e.element.tagName + '.' + (e.element.className || '') + ' ' + (e.url || '').split('/').pop())) || ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.long += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
});
const t0 = Date.now();
await p.goto(process.env.URL || 'http://localhost:4190/', { waitUntil: 'load', timeout: 120000 });
const loadMs = Date.now() - t0;
await p.waitForTimeout(3000);
// scroll through the page to let CLS from late content register
for (let y = 0; y < 6; y++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(250); }
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const res = performance.getEntriesByType('resource'); const nav = performance.getEntriesByType('navigation')[0];
  const by = {}; let total = nav.transferSize;
  for (const e of res) { const k = e.initiatorType + (e.name.match(/\.(\w+)(\?|$)/) || ['', ''])[1]; by[k] = (by[k] || 0) + e.transferSize; total += e.transferSize; }
  const atLoad = res.filter(e => e.responseEnd < nav.loadEventEnd).reduce((a, e) => a + e.transferSize, nav.transferSize);
  return { ...window.__perf, totalKB: Math.round(total / 1024), initialKB: Math.round(atLoad / 1024), byKB: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round(v / 1024)])), requests: res.length, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime };
});
console.log(JSON.stringify({ label, viewport: `${w}x${h}`, throttle: !!throttle, loadMs, ...r, lcp: Math.round(r.lcp), fcp: Math.round(r.fcp), cls: +r.cls.toFixed(4), long: Math.round(r.long) }));
await b.close();
