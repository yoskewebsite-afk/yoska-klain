// Local server that behaves like the Vercel deployment: static files from prototype/, the same routing rules as vercel.json,
// and the real functions from api/. Data goes to CMS_DATA_DIR (default .data). usage: node tools/dev_server.mjs [port]
import http from 'node:http';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = path.join(ROOT, 'prototype');
const port = +process.argv[2] || +process.env.PORT || 4200;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };

const pageMod = await import('../api/page.mjs');
const catchAll = await import('../api/index.mjs');

/** mirrors the "routes" array of vercel.json, in the same order */
function route(pathname) {
  let m;
  if (pathname.startsWith('/api/')) return { fn: 'api' };
  if ((m = /^\/media\/(.+)$/.exec(pathname))) return { fn: 'page', w: 'media', u: '/media/' + m[1] };
  if (pathname === '/robots.txt') return { fn: 'page', w: 'robots' };
  if (pathname === '/sitemap.xml') return { fn: 'page', w: 'sitemap' };
  if (/^\/admin(\/.*)?$/.test(pathname)) return { fn: 'page', w: 'admin' };
  if ((m = /^\/__preview(\/.*)?$/.exec(pathname))) return { fn: 'page', w: 'preview', u: m[1] || '/' };
  if (/^\/(assets|fonts|vendor|admin-app)\//.test(pathname)) return null;
  if (/^\/[^.]*$/.test(pathname) || /\.html$/.test(pathname)) return { fn: 'page', w: 'page', u: pathname };
  return null;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const pathname = decodeURIComponent(u.pathname);
  const r = route(pathname);
  try {
    if (r?.fn === 'api') {
      if (pathname === '/api/page') return await pageMod.default(req, res);
      return await catchAll.default(req, res);
    }
    if (r?.fn === 'page') {
      req.url = `/api/page?w=${r.w}&u=${encodeURIComponent(r.u || '/')}`;
      return await pageMod.default(req, res);
    }
    let f = path.join(STATIC, pathname);
    if (!f.startsWith(STATIC)) { res.statusCode = 403; return res.end(); }
    const st = await fs.stat(f).catch(() => null);
    if (!st || st.isDirectory()) { res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(await fs.readFile(path.join(STATIC, '404.html'))); }
    res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    if (pathname === '/admin-app/sw.js') res.setHeader('Service-Worker-Allowed', '/admin');
    createReadStream(f).pipe(res);
  } catch (e) {
    console.error(e);
    res.statusCode = 500; res.end('dev server error');
  }
}).listen(port, '127.0.0.1', () => console.log(`dev server http://127.0.0.1:${port}  (data: ${process.env.CMS_DATA_DIR || '.data'})`));
