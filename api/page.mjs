// Serves everything that is not an /api call: public pages (from published content), the protected draft preview,
// the admin shell, uploaded media, robots.txt and sitemap.xml. vercel.json routes the matching paths here with ?w=<what>&u=<path>.
import { getStore } from './_lib/store.mjs';
import { send, fail, urlOf } from './_lib/http.mjs';
import { renderPage, assets, mergedSettings, pagePath, tourOfPage } from './_lib/render.mjs';
import { publishedSnapshot } from './_lib/routes.mjs';
import { session } from './_lib/auth.mjs';
import { getDraft } from './_lib/content.mjs';
import { appShell, loginShell, ADMIN_CSP } from './_lib/shell.mjs';
import { userCount } from './_lib/auth.mjs';
import * as media from './_lib/media.mjs';

const HTML = { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };

/** which page does this address belong to? */
export function resolve(snap, p, { draft = false } = {}) {
  const A = assets();
  let path = decodeURIComponent(p || '/').split('?')[0];
  if (path === '/index.html') path = '/';
  const alt = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path + '/';
  for (const pid of Object.keys(A.defaults.pages)) {
    if (pid === 'notfound') continue;
    const t = tourOfPage(snap, pid);
    if (pid.startsWith('tour-') && (!t || (!draft && t.status !== 'published'))) continue;   // a hidden tour takes its page down with it
    const here = pagePath(snap, pid);
    if (here === path || (here.endsWith('/') && here.slice(0, -1) === path)) return { pid };
  }
  const red = [...(snap?.redirects || []), ...A.defaults.redirects].find((r) => r.from === path || r.from === alt);
  if (red) return { redirect: red.to };
  return { pid: 'notfound', status: 404 };
}

function sitemap(snap) {
  const s = mergedSettings(snap), A = assets();
  const base = String(s.siteUrl || '').replace(/\/+$/, '');
  const urls = [];
  for (const pid of Object.keys(A.defaults.pages)) {
    if (pid === 'notfound') continue;
    const t = tourOfPage(snap, pid);
    if (pid.startsWith('tour-') && (!t || t.status !== 'published')) continue;
    if ({ ...A.defaults.pages[pid].seo, ...(snap?.pages?.[pid]?.seo || {}) }.noindex) continue;
    urls.push(pagePath(snap, pid));
  }
  const last = (snap?.savedAt || new Date().toISOString()).slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc><lastmod>${last}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

export default async function handler(req, res) {
  const url = urlOf(req);
  const w = url.searchParams.get('w') || 'page';
  const p = url.searchParams.get('u') || '/';
  const store = getStore();
  try {
    if (w === 'media') {
      const f = store ? await media.serve(store, p.replace(/^\/media\//, '')) : null;
      if (!f) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
      return send(res, 200, f.buf, { 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" });
    }
    if (w === 'robots' || w === 'sitemap') {
      const snap = await publishedSnapshot(store);
      const s = mergedSettings(snap);
      const open = s.indexable && s.siteUrl;
      if (w === 'robots') return send(res, 200, open ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /__preview\nSitemap: ${String(s.siteUrl).replace(/\/+$/, '')}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n', { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=60' });
      if (!open) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
      return send(res, 200, sitemap(snap), { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' });
    }
    if (w === 'admin') {
      const h = { ...HTML, 'Content-Security-Policy': ADMIN_CSP, 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' };
      if (!store) return send(res, 200, loginShell('nostore'), h);
      const s = await session(store, req);
      if (s && !s.expired) return send(res, 200, appShell(), h);
      const first = !(await userCount(store)) && !!process.env.ADMIN_SETUP_TOKEN;
      return send(res, s?.expired ? 401 : 200, loginShell(first ? 'setup' : 'login'), h);
    }
    if (w === 'preview') {
      const s = store ? await session(store, req) : null;
      if (!s || s.expired) return send(res, 401, 'נדרשת התחברות לניהול כדי לראות תצוגה מקדימה.', { 'Content-Type': 'text/plain; charset=utf-8' });
      const snap = await getDraft(store);
      const r = resolve(snap, p || '/', { draft: true });
      if (r.redirect) return send(res, 302, '', { Location: '/__preview' + r.redirect });
      let html = renderPage({ snap, pid: r.pid, draft: true });
      html = html.replace(/<a ([^>]*?)href="\/(?!__preview|assets\/|fonts\/|vendor\/|media\/|api\/|admin)([^"]*)"/g, '<a $1href="/__preview/$2"');
      return send(res, r.status || 200, html, { ...HTML, 'Cache-Control': 'no-store', 'X-Frame-Options': 'SAMEORIGIN', 'X-Robots-Tag': 'noindex, nofollow' });
    }
    // public page
    const snap = await publishedSnapshot(store);
    const r = resolve(snap, p);
    if (r.redirect) return send(res, 301, '', { Location: r.redirect, 'Cache-Control': 'public, s-maxage=300' });
    const html = renderPage({ snap, pid: r.pid });
    return send(res, r.status || 200, html, { ...HTML, 'X-Frame-Options': 'DENY', 'Cache-Control': r.status === 404 ? 'public, s-maxage=60' : 'public, max-age=0, s-maxage=30, stale-while-revalidate=600', 'X-CMS': snap ? 'published' : 'defaults' });
  } catch (e) {
    console.error('page error', p, e?.message);
    return fail(res, 500, 'אירעה תקלה בטעינת העמוד.');
  }
}
