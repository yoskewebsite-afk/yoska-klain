import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [w = 1440, h = 900] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, deviceScaleFactor: w < 700 ? 2 : 1 });
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
if (w < 700) { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 1024 / 1000 * 1000, uploadThroughput: 750e3 / 8 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
let bytes = 0; p.on('response', async r => { try { bytes += (await r.body()).length; } catch {} });
await p.addInitScript(() => { window.__lcp = 0; window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => window.__lcp = e.startTime)).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
await p.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
console.log(JSON.stringify({ w, lcp: Math.round(await p.evaluate(() => window.__lcp)), cls: +(await p.evaluate(() => window.__cls)).toFixed(4), kb: Math.round(bytes / 1024) }));
await b.close();
