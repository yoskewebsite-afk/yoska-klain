// Content snapshots: draft, published, revisions. Validation and sanitising happen here, on the server, for every write.
import { assets, mergedSettings, effectiveTours, pagePath, defaultPath, hasPage, sectionState, tourOfPage } from './render.mjs';
import { newId } from './store.mjs';
import { audit } from './auth.mjs';

const MAX_REVISIONS = 60;
const RESERVED = ['/api', '/admin', '/admin-app', '/assets', '/fonts', '/vendor', '/media', '/__preview'];
const cleanText = (s, max = 6000) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\{\{|\}\}/g, '').slice(0, max);
const isUrl = (u) => /^(\/(?!\/)|#|https?:\/\/|tel:|mailto:)/i.test(u) || u === '';
const cleanUrl = (u) => { const s = cleanText(u, 2000).trim(); if (!isUrl(s)) throw bad(`כתובת לא מורשית: ${s.slice(0, 60)}`); return s; };
const bad = (m) => Object.assign(new Error(m), { status: 400 });
const SLUG = /^[a-z0-9][a-z0-9\-]{0,60}$/;
const PATHRE = /^\/[a-z0-9\-_/]*(\.html)?$/;

// ---------------------------------------------------------------- reading
export async function getPublished(store) { return store ? ((await store.get('content', 'published')) || null) : null; }
export async function getDraft(store) { return (await store.get('content', 'draft')) || (await store.get('content', 'published')) || null; }
export async function status(store) {
  const [d, p] = await Promise.all([store.get('content', 'draft'), store.get('content', 'published')]);
  const dirty = !!d && JSON.stringify(strip(d)) !== JSON.stringify(strip(p || {}));
  return { hasDraft: !!d, dirty, publishedAt: p?.savedAt || null, publishedBy: p?.savedBy || null, draftAt: d?.savedAt || null };
}
const strip = (s) => { const { savedAt, savedBy, ...r } = s || {}; return r; };

// ---------------------------------------------------------------- sanitising incoming parts
function cleanValue(key, v) {
  if (v && typeof v === 'object') {   // an image object
    const o = {};
    for (const k of ['src', 'srcset', 'alt', 'w', 'h', 'pos']) if (v[k] !== undefined) o[k] = k === 'src' || k === 'srcset' ? cleanUrlList(v[k]) : cleanText(v[k], 400);
    if (Array.isArray(v.s)) o.s = v.s.map((x) => cleanUrlList(x));
    return o;
  }
  if (/(^|\.)(i\.)?l\d+$/.test(key) || key.endsWith('.href')) return cleanUrl(v);
  return cleanText(v);
}
const cleanUrlList = (s) => cleanText(s, 2000).trim();

function cleanPage(pid, p, schema) {
  const sch = schema.pages[pid];
  if (!sch) throw bad(`עמוד לא מוכר: ${pid}`);
  const out = { seo: {}, order: undefined, sec: {} };
  const seo = p.seo || {};
  for (const k of ['title', 'description', 'ogTitle', 'ogDescription']) if (seo[k] !== undefined) out.seo[k] = cleanText(seo[k], 400);
  if (seo.ogImage !== undefined) out.seo.ogImage = cleanUrl(seo.ogImage);
  if (seo.noindex !== undefined) out.seo.noindex = !!seo.noindex;
  if (seo.path !== undefined && seo.path !== '') {
    const pth = cleanText(seo.path, 120).trim().toLowerCase();
    if (pid === 'index' || pid === 'notfound') throw bad('אי אפשר לשנות את הכתובת של דף הבית ושל עמוד 404.');
    if (!PATHRE.test(pth)) throw bad('הכתובת יכולה להכיל רק אותיות לטיניות קטנות, ספרות ומקפים, ולהתחיל ב-/.');
    if (RESERVED.some((r) => pth === r || pth.startsWith(r + '/'))) throw bad('הכתובת שמורה למערכת.');
    out.seo.path = pth;
  }
  const ids = sch.sections.map((s) => s.id);
  if (Array.isArray(p.order)) {
    const order = p.order.filter((i) => ids.includes(i));
    for (const s of sch.sections) if (!order.includes(s.id)) order.push(s.id);
    for (const s of sch.sections.filter((x) => x.locked)) if (order.indexOf(s.id) !== ids.indexOf(s.id)) throw bad(`הסקשן "${s.label}" נעול במקומו.`);
    out.order = order;
  }
  for (const [sid, st] of Object.entries(p.sec || {})) {
    const ss = sch.sections.find((s) => s.id === sid);
    if (!ss) continue;
    if (ss.locked && (st.hidden || st.removed)) throw bad(`הסקשן "${ss.label}" לא ניתן להסתרה או להסרה.`);
    const o = { hidden: !!st.hidden, removed: !!st.removed, f: {}, l: {} };
    for (const [k, v] of Object.entries(st.f || {})) {
      if (!k.startsWith(sid + '.')) continue;
      if (ss.groups.some((g) => g.fields.some((f) => f.key === k && f.locked))) continue;
      o.f[k] = cleanValue(k, v);
    }
    for (const [k, arr] of Object.entries(st.l || {})) {
      if (!ss.lists.some((l) => l.key === k) || !Array.isArray(arr)) continue;
      if (arr.length > 200) throw bad('יותר מדי פריטים ברשימה.');
      o.l[k] = arr.map((it) => { const r = { id: cleanText(it.id || newId(4), 40) }; for (const [ik, iv] of Object.entries(it)) if (ik.startsWith('i.')) r[ik] = ik === 'i.cls' ? cleanText(iv, 120) : cleanValue(ik, iv); return r; });
    }
    out.sec[sid] = o;
  }
  return out;
}

function cleanTour(t, i) {
  if (!SLUG.test(t.slug || '')) throw bad(`הכתובת של הטיול "${t.name || i + 1}" לא תקינה (אותיות לטיניות קטנות, ספרות ומקפים).`);
  const img = (x) => (x ? { src: cleanUrl(x.src), srcset: cleanText(x.srcset, 1500), w: cleanText(x.w, 8), h: cleanText(x.h, 8), alt: cleanText(x.alt, 300), pos: cleanText(x.pos, 30) } : null);
  const name = cleanText(t.name, 120).trim();
  if (!name) throw bad('לכל טיול צריך שם.');
  return {
    id: cleanText(t.id || t.slug, 60), slug: t.slug, name, place: cleanText(t.place, 200), blurb: cleanText(t.blurb, 700), fit: cleanText(t.fit, 300), btn: cleanText(t.btn, 60),
    stops: (t.stops || []).map((s) => cleanText(s, 80)).filter(Boolean).slice(0, 40), duration: cleanText(t.duration, 80), page: !!t.page,
    dates: (t.dates || []).map((d) => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') ? d.date : '', time: cleanText(d.time, 20), note: cleanText(d.note, 200), price: cleanText(d.price, 80), meeting: cleanText(d.meeting, 160) })).filter((d) => d.date).slice(0, 60),
    card: img(t.card), status: ['published', 'hidden', 'archived'].includes(t.status) ? t.status : 'hidden', home: !!t.home, featured: !!t.featured, order: +t.order || i,
  };
}

function cleanSettings(s) {
  const o = {};
  const t = (k, max = 200) => { if (s[k] !== undefined) o[k] = cleanText(s[k], max).trim(); };
  ['siteName', 'phone', 'waText'].forEach((k) => t(k));
  if (s.whatsapp !== undefined) o.whatsapp = cleanText(s.whatsapp, 30).replace(/[^\d+]/g, '');
  if (s.email !== undefined) { const e = cleanText(s.email, 120).trim(); if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw bad('כתובת המייל בהגדרות לא תקינה.'); o.email = e; }
  for (const k of ['facebook', 'instagram', 'logo', 'logoDark', 'siteUrl', 'ogImage']) if (s[k] !== undefined) o[k] = cleanUrl(s[k]);
  if (s.indexable !== undefined) o.indexable = !!s.indexable;
  if (s.formsActive !== undefined) o.formsActive = !!s.formsActive;
  if (s.notifyEmail !== undefined) o.notifyEmail = cleanText(s.notifyEmail, 400).trim();
  return o;
}

function cleanForms(f) {
  const out = {};
  for (const [id, form] of Object.entries(f || {})) {
    if (!assets().defaults.forms[id]) continue;
    out[id] = {
      name: cleanText(form.name, 80), active: form.active !== false, notifyEmail: cleanText(form.notifyEmail, 400), submit: cleanText(form.submit, 40), success: cleanText(form.success, 400), note: cleanText(form.note, 300),
      fields: (form.fields || []).slice(0, 12).map((x) => ({ key: cleanText(x.key, 20).replace(/[^\w]/g, ''), label: cleanText(x.label, 80), type: ['text', 'tel', 'email', 'tour'].includes(x.type) ? x.type : 'text', required: !!x.required, enabled: x.enabled !== false })),
    };
    for (const must of ['name', 'phone']) {
      const fx = out[id].fields.find((x) => x.key === must);
      if (!fx || !fx.enabled) throw bad('שדות השם והטלפון חייבים להישאר בטופס, כדי שאפשר יהיה לחזור ללקוח.');
      if (!fx.required) fx.required = true;
    }
  }
  return out;
}

// ---------------------------------------------------------------- saving the draft
export async function saveDraft(store, patch, who) {
  const A = assets();
  const cur = (await getDraft(store)) || { v: 1, pages: {}, shared: { f: {} } };
  const next = { ...cur, v: 1, pages: { ...(cur.pages || {}) } };
  for (const [pid, p] of Object.entries(patch.pages || {})) next.pages[pid] = cleanPage(pid, p, A.schema);
  if (patch.shared) next.shared = { f: Object.fromEntries(Object.entries(patch.shared.f || {}).filter(([k]) => k.startsWith('shared.')).map(([k, v]) => [k, cleanValue(k, v)])) };
  if (patch.tours) {
    const tours = patch.tours.map(cleanTour);
    const slugs = new Set();
    for (const t of tours) { if (slugs.has(t.slug)) throw bad(`הכתובת "${t.slug}" מופיעה בשני טיולים.`); slugs.add(t.slug); }
    next.tours = tours;
  }
  if (patch.settings) next.settings = { ...(cur.settings || {}), ...cleanSettings(patch.settings) };
  next.savedAt = new Date().toISOString();
  next.savedBy = who;
  checkPaths(next);
  await store.put('content', 'draft', next);
  return next;
}

/** every public address must be unique; reserved prefixes are off limits */
export function livePaths(snap) {
  const out = [];
  for (const pid of Object.keys(assets().defaults.pages)) {
    const t = tourOfPage(snap, pid);
    if (pid.startsWith('tour-') && (!t || t.status !== 'published')) continue;
    out.push({ path: pagePath(snap, pid), what: assets().schema.pages[pid].label });
  }
  return out;
}
function checkPaths(snap) {
  const seen = new Map();
  for (const { path, what } of livePaths(snap)) {
    if (seen.has(path)) throw bad(`הכתובת ${path} כבר בשימוש (${seen.get(path)} ו-${what}).`);
    seen.set(path, what);
  }
}

// ---------------------------------------------------------------- redirects (301) kept in sync with address changes
function computeRedirects(prev, next) {
  const list = (next.redirects || prev?.redirects || []).map((r) => ({ ...r }));
  const before = new Map(livePaths(prev || {}).map((p) => [p.what, p.path]));
  for (const { path, what } of livePaths(next)) { const old = before.get(what); if (old && old !== path) list.push({ from: old, to: path, auto: true }); }
  const live = new Set(livePaths(next).map((p) => p.path));
  // drop redirects whose source is a live page again, flatten chains, detect loops
  let r = list.filter((x) => x.from !== x.to && !live.has(x.from));
  const map = new Map(); for (const x of r) map.set(x.from, x.to);
  const out = [];
  for (const [from] of map) {
    let to = map.get(from); const seen = new Set([from]);
    while (map.has(to)) { if (seen.has(to)) throw bad(`נוצרה לולאת הפניות סביב ${to}.`); seen.add(to); to = map.get(to); }
    if (!live.has(to)) continue;   // target no longer exists
    out.push({ from, to, auto: !!r.find((x) => x.from === from)?.auto });
  }
  return out;
}

// ---------------------------------------------------------------- checks shown to the admin before publishing
export function reportFor(snap) {
  const A = assets(), items = [];
  const settings = mergedSettings(snap);
  for (const pid of Object.keys(A.defaults.pages)) {
    if (pid === 'notfound') continue;
    const seo = { ...A.defaults.pages[pid].seo, ...(snap?.pages?.[pid]?.seo || {}) };
    const label = A.schema.pages[pid].label;
    if (!seo.title) items.push({ level: 'error', where: label, msg: 'חסרה כותרת SEO.' });
    else if (seo.title.length > 65) items.push({ level: 'warn', where: label, msg: `כותרת ה-SEO ארוכה (${seo.title.length} תווים). גוגל מציג בערך 60.` });
    if (!seo.description) items.push({ level: 'warn', where: label, msg: 'חסר תיאור מטא.' });
    else if (seo.description.length > 170) items.push({ level: 'warn', where: label, msg: `תיאור המטא ארוך (${seo.description.length} תווים). עדיף עד 160.` });
    else if (seo.description.length < 50) items.push({ level: 'warn', where: label, msg: 'תיאור המטא קצר מאוד.' });
  }
  if (settings.indexable && !settings.siteUrl) items.push({ level: 'error', where: 'הגדרות', msg: 'האתר מסומן כפתוח לגוגל אבל לא הוגדרה כתובת האתר (siteUrl).' });
  if (!settings.indexable) items.push({ level: 'info', where: 'הגדרות', msg: 'האתר עדיין סגור לגוגל (noindex ו-robots חוסמים). פתחו אותו בהגדרות כשמוכנים להשקה.' });
  const st = sectionState(snap, 'index');
  if (st.hidden.size) items.push({ level: 'info', where: 'דף הבית', msg: `סקשנים מוסתרים: ${[...st.hidden].join(', ')}. קישורי הניווט אליהם מוסרים אוטומטית.` });
  return items;
}

// ---------------------------------------------------------------- publish / restore
export async function publish(store, who, note = '') {
  const draft = await store.get('content', 'draft');
  if (!draft) throw bad('אין שינויים לפרסם.');
  const prev = await store.get('content', 'published');
  const errors = reportFor(draft).filter((i) => i.level === 'error');
  if (errors.length) throw Object.assign(new Error(errors.map((e) => `${e.where}: ${e.msg}`).join(' ')), { status: 422 });
  checkPaths(draft);
  const snap = { ...draft, redirects: computeRedirects(prev, draft), savedAt: new Date().toISOString(), savedBy: who };
  const revId = `${Date.now().toString(36)}-${newId(3)}`;
  await store.put('revisions', revId, { id: revId, at: snap.savedAt, by: who, note: cleanText(note, 200), snapshot: snap, applied: false });
  await store.put('content', 'published', snap);          // one document write: the page is never half published
  await store.put('content', 'draft', snap);
  await store.put('revisions', revId, { id: revId, at: snap.savedAt, by: who, note: cleanText(note, 200), snapshot: snap, applied: true });
  await audit(store, who, 'publish', { revision: revId, note });
  await pruneRevisions(store);
  return { revision: revId, savedAt: snap.savedAt, redirects: snap.redirects.length };
}

export async function listRevisions(store) {
  const rows = await store.list('revisions', { limit: 200 });
  return rows.map((r) => ({ id: r.data.id, at: r.data.at, by: r.data.by, note: r.data.note, applied: r.data.applied })).sort((a, b) => (a.at < b.at ? 1 : -1));
}
async function pruneRevisions(store) {
  const rows = await store.list('revisions', { limit: 500 });
  for (const r of rows.slice(MAX_REVISIONS)) await store.del('revisions', r.id);
}
export async function restoreRevision(store, id, who) {
  const rev = await store.get('revisions', id);
  if (!rev) throw Object.assign(new Error('הגרסה לא נמצאה.'), { status: 404 });
  await store.put('content', 'draft', { ...rev.snapshot, savedAt: new Date().toISOString(), savedBy: who });
  const r = await publish(store, who, `שחזור גרסה מ-${rev.at}`);
  await audit(store, who, 'restore', { from: id, to: r.revision });
  return r;
}
export async function discardDraft(store, who) {
  const p = await store.get('content', 'published');
  if (p) await store.put('content', 'draft', p); else await store.del('content', 'draft');
  await audit(store, who, 'discard-draft', {});
}
export { defaultPath };
