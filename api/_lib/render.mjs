// Renders public pages from the extracted templates (cms/templates) plus the published (or draft) content snapshot.
// Pure functions, no I/O except the one-time read of the bundled templates. Works with an empty snapshot: the defaults
// reproduce the site exactly as it was built, so the public site never depends on the database being reachable.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CMS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../cms');
let ASSETS = null;
export function assets() {
  if (ASSETS) return ASSETS;
  const templates = {};
  const schema = JSON.parse(readFileSync(path.join(CMS, 'schema.json'), 'utf8'));
  for (const n of Object.keys(schema.pages)) templates[n] = readFileSync(path.join(CMS, 'templates', n + '.html'), 'utf8');
  ASSETS = { templates, defaults: JSON.parse(readFileSync(path.join(CMS, 'defaults.json'), 'utf8')), schema };
  return ASSETS;
}

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
export const waEnc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const clean = (s) => String(s ?? '').replace(/\{\{|\}\}/g, (m) => (m === '{{' ? '{ {' : '} }'));  // no template injection through content

// ------------------------------------------------------------------ effective content
export function mergedSettings(snap) {
  const d = assets().defaults.settings;
  const o = snap?.settings || {};
  return { ...d, ...o };
}
export function effectiveTours(snap) {
  const list = (snap?.tours || assets().defaults.tours).map((t) => ({ ...t }));
  return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
export const hasPage = (t) => !!t.page;
export const tourPath = (t) => `/tours/${t.slug}.html`;
const isLive = (t) => t.status === 'published';
export function defaultPath(pid) { return assets().defaults.pages[pid].path; }
export const tourOfPage = (snap, pid) => (pid.startsWith('tour-') ? effectiveTours(snap).find((t) => t.slug === pid.slice(5)) : null);
export function pagePath(snap, pid) {
  return snap?.pages?.[pid]?.seo?.path || defaultPath(pid);
}
/** old default path -> current path, for every page whose address was changed (used to keep internal links working) */
export function pathMap(snap) {
  const m = {};
  for (const pid of Object.keys(assets().defaults.pages)) {
    if (pid === 'index' || pid === 'notfound' || pid.startsWith('tour-')) continue;
    const cur = pagePath(snap, pid), def = defaultPath(pid);
    if (cur !== def) m[def] = cur;
  }
  return m;
}

function pageValues(snap, pid) {
  const A = assets();
  const vals = { ...A.defaults.pages[pid].fields, ...A.defaults.shared.fields };
  const pg = snap?.pages?.[pid];
  for (const s of Object.values(pg?.sec || {})) Object.assign(vals, s.f || {});
  Object.assign(vals, snap?.shared?.f || {});
  return vals;
}
function listItems(snap, pid, sid, key) {
  const o = snap?.pages?.[pid]?.sec?.[sid]?.l?.[key];
  return o || assets().defaults.pages[pid].lists[key] || [];
}

// ------------------------------------------------------------------ token engine
function lookup(vals, key) {
  if (key in vals) { const v = vals[key]; return typeof v === 'string' ? v : v == null ? '' : String(v); }
  const i = key.lastIndexOf('.');
  if (i < 0) return '';
  const base = key.slice(0, i), prop = key.slice(i + 1);
  const o = vals[base];
  if (o && typeof o === 'object') {
    const m = /^s(\d+)$/.exec(prop);
    if (m) return (o.s || [])[+m[1]] ?? '';
    return o[prop] ?? '';
  }
  return '';
}
const EXT = ' target="_blank" rel="noopener"';
const styOf = (vals, key) => { const o = vals[key]; return o && o.pos ? ` style="object-position:${esc(o.pos)}"` : ''; };
const extOf = (href) => (/^https?:/i.test(href) ? EXT : '');
function fill(tpl, vals) {
  tpl = tpl.replace(/\{\{ext:([\w.\-]+)\}\}/g, (m, key) => extOf(lookup(vals, key))).replace(/\{\{sty:([\w.\-]+)\}\}/g, (m, key) => styOf(vals, key));
  return tpl.replace(/(?<!\{)\{\{([\w.\-]+)\}\}(?!\})/g, (m, key) => (key.startsWith('set.') || key.startsWith('seo.') ? m : esc(lookup(vals, key))));
}
function renderList(tpl, items) {
  return items.map((it, idx) => {
    let t = tpl.replace(/\{\{#if first\}\}([\s\S]*?)\{\{\/if\}\}/g, idx === 0 ? '$1' : '');
    t = t.replace(/\{\{ext:(i\.[\w.\-]+)\}\}/g, (m, key) => extOf(lookup(it, key))).replace(/\{\{sty:(i\.[\w.\-]+)\}\}/g, (m, key) => styOf(it, key));
    return t.replace(/\{\{(i\.[\w.]+)\}\}/g, (m, key) => esc(lookup(it, key)));
  }).join('');
}

// ------------------------------------------------------------------ regions: data-driven parts
const bicon = (name, accent = 'teal') => `<svg class="bicon bicon--${accent}" aria-hidden="true"><use href="#b-${name}"/></svg>`;
const waTour = (name) => `https://wa.me/{{set.waNumber}}?text=${waEnc(`היי יוסק׳ה, נשמח לפרטים על הסיור ״${name}״.`)}`;
const STOP_KEYS = { 'הגנים הבהאיים': 'bahai', 'טיילת לואי': 'louis', 'הכרמלית': 'carmelit', 'תחנה בכרמלית': 'carmelit', 'כיכר פריז': 'paris', 'הנמל': 'port',
  'רובע המדרגות': 'stairs', 'גן האם': 'ganhaem', 'בניין המפרש': 'sail', 'מגדל השעון': 'clock', 'השוק הטורקי': 'market', 'המושבה הגרמנית': 'german' };

function photoImg(img, sizes, mode = '', pos = '') {
  const im = img || {};
  const load = mode === 'eager' ? 'fetchpriority="high"' : mode === 'low' ? 'loading="lazy" decoding="async" fetchpriority="low"' : 'loading="lazy" decoding="async"';
  const p = pos || im.pos || '';
  const st = p ? ` style="object-position:${esc(p)}"` : '';
  return `<img src="${esc(im.src)}"${im.srcset ? ` srcset="${esc(im.srcset)}"` : ''} sizes="${esc(sizes)}"${im.w ? ` width="${esc(im.w)}" height="${esc(im.h)}"` : ''} alt="${esc(im.alt || '')}" ${load}${st}>`;
}

const onMap = (t) => isLive(t) && hasPage(t) && t.featured;
function mapParts(tours) {
  const feat = tours.filter(onMap);
  const chips = [], panels = [];
  feat.forEach((t, k) => {
    const stops = (t.stops || []).map((s) => STOP_KEYS[s]).filter(Boolean);
    chips.push(`            <button class="chip" type="button" role="tab" id="mt-${esc(t.slug)}" aria-selected="${k === 0}" aria-controls="mp-${esc(t.slug)}" tabindex="${k === 0 ? 0 : -1}" data-stops="${stops.join(' ')}">${esc(t.name)}</button>`);
    const facts = t.duration ? `<li>${bicon('clock', 'orange')}<span>${esc(t.duration)}</span></li>` : '';
    const stopsLine = (t.stops || []).length ? `<p class="mpanel__stops"><b>בין התחנות:</b> ${t.stops.map(esc).join(', ')} ועוד.</p>`
      : '<p class="mpanel__stops">המסלול נקבע לפי הקבוצה והגילים, ולכן אין לו תחנות קבועות במפה.</p>';
    panels.push(`            <div class="mpanel" role="tabpanel" id="mp-${esc(t.slug)}" aria-labelledby="mt-${esc(t.slug)}"${k === 0 ? '' : ' hidden'}>
              <p class="mpanel__place">${esc(t.place)}</p>
              <h3 class="mpanel__name">${esc(t.name)}</h3>
              ${stopsLine}
              <ul class="mpanel__facts">${facts}</ul>
              <div class="btnrow"><a class="btn btn--ink btn--sm" href="${tourPath(t)}">לפרטי הסיור<svg aria-hidden="true"><use href="#i-arrow"/></svg></a><a class="textlink" href="${waTour(t.name)}" target="_blank" rel="noopener">לבדוק מועד<span class="visually-hidden"> ל${esc(t.name)}</span></a></div>
            </div>`);
  });
  return [chips.join('\n'), panels.join('\n')];
}

function tourCards(list) {
  return list.map((t) => {
    const did = `td-${t.slug}`;
    let details, link;
    const full = hasPage(t);
    if (full) {
      const meta = [t.duration || 'לכל הקבוצות', 'בתיאום מראש'].join(' · ');
      details = `<p class="acard__place">${esc(t.place)}</p><p>${esc(t.blurb)}</p><p class="acard__meta">${esc(meta)}</p>`
        + `<div class="btnrow"><a class="btn btn--ink btn--sm" href="${tourPath(t)}">לפרטי הסיור<span class="visually-hidden"> ${esc(t.name)}</span></a>`
        + `<a class="textlink" href="${waTour(t.name)}" target="_blank" rel="noopener">לתאם<span class="visually-hidden"> את ${esc(t.name)}</span></a></div>`;
      link = tourPath(t);
    } else {
      details = '<p>עוד סיור מהרשימה של יוסק׳ה. הפרטים המלאים עדיין לא באתר, אז הכי פשוט לשאול.</p>'
        + `<div class="btnrow"><a class="btn btn--ink btn--sm" href="${waTour(t.name)}" target="_blank" rel="noopener">לשאול על הסיור<span class="visually-hidden"> ${esc(t.name)}</span></a></div>`;
      link = waTour(t.name);
    }
    return `          <li class="acard" data-card>
            <div class="acard__media">${photoImg(t.card, '(min-width: 900px) 25vw, 78vw', 'low')}<h3 class="acard__title"><a href="${link}"${full ? '' : ' target="_blank" rel="noopener"'}>${esc(t.name)}</a></h3></div>
            <button class="acard__toggle" type="button" aria-expanded="false" aria-controls="${esc(did)}" data-card-toggle>פרטים<span class="visually-hidden"> על ${esc(t.name)}</span><svg aria-hidden="true"><use href="#i-plus"/></svg></button>
            <div class="acard__details" id="${esc(did)}" data-card-details>${details}</div>
          </li>`;
  }).join('\n');
}

function tourGrid(list) {
  return list.map((t) => {
    const href = hasPage(t) ? tourPath(t) : waTour(t.name);
    const fit = t.fit ? `<p class="tc2__fit"><b>מתאים במיוחד ל:</b> ${esc(t.fit)}</p>` : '';
    const dur = t.duration ? `<p class="tc2__dur">${bicon('clock', 'orange')}<span>משך משוער: ${esc(t.duration)}</span></p>` : '';
    return `<li class="tc2"><a class="tc2__img" href="${href}" tabindex="-1" aria-hidden="true">${photoImg(t.card, '(min-width: 1000px) 26vw, (min-width: 600px) 44vw, 92vw', 'low')}</a>
            <div class="tc2__body"><h3 class="tc2__name"><a href="${href}">${esc(t.name)}</a></h3><p class="tc2__benefit">${esc(t.place)}</p><p>${esc(t.blurb)}</p>${fit}${dur}
              <a class="btn btn--ink btn--sm" href="${href}" data-track="home_tour_card_open">${esc(t.btn || 'לפרטי הסיור')}</a></div></li>`;
  }).join('');
}

// ------------------------------------------------------------------ page assembly
const SECTION_RE = /<!--cms:s ([\w\-]+)-->([\s\S]*?)<!--\/cms:s \1-->/g;

export function sectionState(snap, pid) {
  const A = assets();
  const sch = A.schema.pages[pid];
  const pg = snap?.pages?.[pid];
  const ids = sch.sections.map((s) => s.id);
  let order = (pg?.order || ids).filter((i) => ids.includes(i));
  for (const i of ids) if (!order.includes(i)) order.push(i);
  const hidden = new Set(ids.filter((i) => pg?.sec?.[i]?.hidden || pg?.sec?.[i]?.removed));
  return { ids, order, hidden };
}

/** anchors that point at hidden or removed home sections (so menus and rails can drop the dead links) */
export function deadAnchors(snap) {
  const st = sectionState(snap, 'index');
  const set = new Set();
  for (const id of st.hidden) { set.add('#' + id); set.add('/#' + id); }
  return set;
}

export function renderPage({ snap, pid, draft = false, origin = '' }) {
  const A = assets();
  const settings = mergedSettings(snap);
  const tours = effectiveTours(snap);
  const vals = pageValues(snap, pid);
  const dead = deadAnchors(snap);
  let tpl = A.templates[pid];
  const pg = snap?.pages?.[pid];
  const tour = tourOfPage(snap, pid);
  const seo = { ...A.defaults.pages[pid].seo, ...(pg?.seo || {}) };
  const regions = (name, args, secVals) => {
    const cur = /current=(\S*)/.exec(args || '')?.[1] ?? '';
    switch (name) {
      case 'tour-chips': return mapParts(tours)[0];
      case 'tour-panels': return mapParts(tours)[1];
      case 'tour-cards-rail': return tourCards(tours.filter((t) => isLive(t) && t.home));
      case 'tour-cards-grid': return tourGrid(tours.filter(isLive));
      default: return '';
    }
  };
  const renderRegions = (s) => s.replace(/<!--cms:r ([\w\-]+)(?: ([^>]*?))?--><!--\/cms:r-->/g, (m, name, args) => regions(name, args));
  const renderLists = (s, sid) => s.replace(/<!--cms:list ([\w.\-]+)-->([\s\S]*?)<!--\/cms:list-->/g, (m, key, t) => renderList(t, listItems(snap, pid, sid, key)));

  // sections: order / hidden / removed
  let out;
  {
    const st = sectionState(snap, pid);
    const blocks = {};
    let first = -1, last = 0;
    tpl.replace(SECTION_RE, (m, id, body, off) => { blocks[id] = body; if (first < 0) first = off; last = off + m.length; return m; });
    if (first < 0) { out = renderRegions(tpl); } else {
      const mid = st.order.filter((i) => !st.hidden.has(i)).map((i) => '    ' + renderRegions(renderLists(blocks[i], i))).join('\n\n');
      out = tpl.slice(0, first) + mid + '\n' + tpl.slice(last);
      out = renderRegions(out);
      // dead rail / tab links
      for (const id of st.hidden) out = out.replace(new RegExp(`<li><a href="#${id}" data-rail-link="${id}">[\\s\\S]*?</a></li>`, 'g'), '');
    }
  }
  out = fill(out, vals);

  // head: seo, robots, canonical, social image
  const siteUrl = String(settings.siteUrl || '').replace(/\/+$/, '');
  const livePath = pagePath(snap, pid);
  const indexable = !draft && settings.indexable && siteUrl && pid !== 'notfound' && !seo.noindex && !(tour && !isLive(tour));
  const ogImg = seo.ogImage || settings.ogImage;
  let extra = '';
  if (indexable) extra += `\n  <link rel="canonical" href="${esc(siteUrl + livePath)}">\n  <meta property="og:url" content="${esc(siteUrl + livePath)}">`;
  if (siteUrl && ogImg) {
    extra += `\n  <meta property="og:image" content="${esc(/^https?:/.test(ogImg) ? ogImg : siteUrl + ogImg)}">`;
    if (ogImg === settings.ogImage) extra += '\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta property="og:image:alt" content="יוסק׳ה קליין עומד ליד מעקה מול מפרץ חיפה, מוקף בקבוצה">';
    extra += '\n  <meta name="twitter:card" content="summary_large_image">';
  }
  const cfg = { page: pid, tour: tour ? tour.slug : '', v: 1, ...(draft ? { preview: true } : {}) };
  const headExtra = `\n  <script type="application/json" id="site-config">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>\n`;
  const sub = {
    'seo.title': seo.title, 'seo.description': seo.description || '', 'seo.ogTitle': seo.ogTitle || seo.title, 'seo.ogDescription': seo.ogDescription || seo.description || '',
    'seo.robots': indexable ? 'index, follow' : 'noindex',
  };
  out = out.replace(/\{\{\{seo\.extra\}\}\}/g, extra).replace(/\{\{\{head\.extra\}\}\}/g, headExtra);
  out = out.replace(/\{\{(seo\.[\w]+)\}\}/g, (m, k) => esc(sub[k] ?? ''));
  if (draft) out = out.replace('<head>', '<head>\n  <base target="_self">').replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow">');

  // settings tokens (phone, whatsapp, e-mail, links, logos)
  const phoneIntl = String(settings.phone || '').replace(/\D/g, '').replace(/^0/, '972');
  const set = {
    siteName: settings.siteName, phone: settings.phone, phoneIntl, waNumber: String(settings.whatsapp || '').replace(/\D/g, '').replace(/^0/, '972'), email: settings.email,
    facebook: settings.facebook, logo: settings.logo, logoDark: settings.logoDark,
  };
  out = out.replace(/\{\{set\.waTextEnc\}\}/g, waEnc(settings.waText || ''));
  out = out.replace(/\{\{set\.(\w+)\}\}/g, (m, k) => esc(set[k] ?? ''));

  // addresses that were changed: keep every internal link pointing to the new address
  const pm = pathMap(snap);
  for (const [from, to] of Object.entries(pm)) out = out.split(`href="${from}"`).join(`href="${to}"`).split(`href="${from}#`).join(`href="${to}#`);
  return out;
}

export const _test = { esc, waEnc };
