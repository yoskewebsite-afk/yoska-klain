// Client-side working copy of the draft. Edits change this object; "שמור טיוטה" sends only the parts that were touched.
import { api, clone, rid } from './ui.js';

export const S = {
  schema: null, defaults: null, draft: { pages: {}, shared: { f: {} } }, published: null, status: {}, settings: {}, tours: [], form: null, report: [], store: '',
  unsaved: false, touched: { pages: new Set(), shared: false, tours: false, settings: false, forms: false }, newLeads: 0, listeners: new Set(),
};
export const onChange = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
const emit = () => S.listeners.forEach((f) => f());

export async function load() {
  const b = await api('GET', '/api/admin/bundle');
  if (b.me) S.me = b.me;
  Object.assign(S, { blocks: b.blocks, schema: b.schema, defaults: b.defaults, draft: b.draft || { v: 1, pages: {}, shared: { f: {} } }, published: b.published, status: b.status, settings: b.settings, tours: b.tours, form: b.form, report: b.report, store: b.store });
  S.draft.pages ||= {}; S.draft.shared ||= { f: {} };
  S.unsaved = false; S.touched = { pages: new Set(), shared: false, tours: false, settings: false, forms: false };
  emit();
}
export async function refreshBadge() {
  try { S.newLeads = (await api('GET', '/api/admin/leads?status=new&limit=1')).total; emit(); } catch { /* badge is optional */ }
}

export function touch(kind, pid) {
  S.unsaved = true;
  if (kind === 'pages') S.touched.pages.add(pid); else S.touched[kind] = true;
  emit();
}

export async function saveDraft() {
  const patch = {};
  if (S.touched.pages.size) patch.pages = Object.fromEntries([...S.touched.pages].map((p) => [p, S.draft.pages[p]]));
  if (S.touched.shared) patch.shared = S.draft.shared;
  if (S.touched.tours) patch.tours = S.tours;
  if (S.touched.settings) patch.settings = S.draft.settings || {};
  if (S.touched.forms) patch.forms = { contact: S.form };
  if (!Object.keys(patch).length) return;
  const r = await api('PATCH', '/api/admin/draft', patch);
  if (S.touched.tours) S.draft.tours = clone(S.tours);
  if (S.touched.forms) S.draft.forms = { ...(S.draft.forms || {}), contact: clone(S.form) };
  S.status = r.status; S.report = r.report; S.unsaved = false;
  S.touched = { pages: new Set(), shared: false, tours: false, settings: false, forms: false };
  S.lastSaved = new Date();
  emit();
}

// ---- pages / sections
export const pageDef = (pid) => S.schema.pages[pid];
export function pageState(pid) { const p = (S.draft.pages[pid] ||= {}); p.seo ||= {}; p.sec ||= {}; return p; }
export function secState(pid, sid) { const p = pageState(pid); return (p.sec[sid] ||= { hidden: false, removed: false, f: {}, l: {} }); }
// the page's added sections: the saved ones, or (until the owner touches them) the built-in ones from the defaults
const customView = (pid) => S.draft.pages[pid]?.custom ?? S.defaults.pages[pid]?.custom ?? {};
export const order = (pid) => {
  const ids = [...pageDef(pid).sections.map((s) => s.id), ...Object.keys(customView(pid))];
  const base = (S.defaults.pages[pid]?.order || ids).filter((i) => ids.includes(i)); ids.forEach((i) => !base.includes(i) && base.push(i));
  const o = (S.draft.pages[pid]?.order || base).filter((i) => ids.includes(i));
  base.forEach((i, k) => { if (o.includes(i)) return; const prev = base.slice(0, k).reverse().find((x) => o.includes(x)); o.splice(prev ? o.indexOf(prev) + 1 : 0, 0, i); });
  return o;
};
export function setOrder(pid, o) { customOf(pid); pageState(pid).order = o; touch('pages', pid); }

// ---- sections the owner adds (custom blocks)
export const customOf = (pid) => (pageState(pid).custom ||= clone(S.defaults.pages[pid]?.custom || {}));
export const isCustom = (pid, id) => !!customView(pid)[id];
const newCid = () => 'c-' + Math.random().toString(36).slice(2, 9).replace(/[^a-z0-9]/g, 'x').padEnd(6, '0');
export function addBlock(pid, type, afterId) {
  const T = S.blocks.types[type];
  const cid = newCid();
  const b = { type, c: clone(T.sample || {}), d: clone(T.d) };
  if (T.items) b.items = (T.sampleItems || []).map((x) => ({ id: rid(), ...clone(x) }));
  const o = order(pid);
  customOf(pid)[cid] = b;
  const at = afterId ? o.indexOf(afterId) : -1;
  o.splice(at < 0 ? o.length : at + 1, 0, cid);
  setOrder(pid, o);
  return cid;
}
export function dupBlock(pid, cid) {
  const cid2 = newCid(), b = clone(customOf(pid)[cid]);
  if (b.items) b.items = b.items.map((it) => ({ ...it, id: rid() }));
  if (b.d?.anchor) delete b.d.anchor;
  const o = order(pid); customOf(pid)[cid2] = b; o.splice(o.indexOf(cid) + 1, 0, cid2); setOrder(pid, o);
  return cid2;
}
export function removeBlock(pid, cid) {
  const p = pageState(pid); customOf(pid);
  delete p.custom[cid]; delete p.sec?.[cid];
  p.order = order(pid).filter((i) => i !== cid);
  touch('pages', pid);
}
// read-only look at a block (does not copy the built-in sections into the draft); editing goes through editBlock
export const blockOf = (pid, cid) => customView(pid)[cid];
export const editBlock = (pid, cid) => customOf(pid)[cid];
export function blockTitle(b) {
  const T = S.blocks.types[b.type];
  const t = [b.c?.t1, b.c?.t2].filter(Boolean).join(' ').replace(/\*/g, '') || b.c?.quote || '';
  return { type: T?.label || b.type, title: t.length > 42 ? t.slice(0, 40) + '…' : t };
}

export function val(pid, key) {
  if (key.startsWith('shared.')) return S.draft.shared?.f?.[key] ?? S.defaults.shared.fields[key];
  const sid = key.split('.')[0];
  const o = S.draft.pages[pid]?.sec?.[sid]?.f;
  return o && key in o ? o[key] : S.defaults.pages[pid].fields[key];
}
export function setVal(pid, sid, key, v) {
  if (key.startsWith('shared.')) { (S.draft.shared.f ||= {})[key] = v; touch('shared'); return; }
  secState(pid, sid).f[key] = v; touch('pages', pid);
}
export function items(pid, sid, lk) {
  const o = S.draft.pages[pid]?.sec?.[sid]?.l?.[lk];
  return o || S.defaults.pages[pid].lists[lk].map((it) => ({ id: it.id || rid(), ...clone(it) }));
}
export function setItems(pid, sid, lk, arr) { secState(pid, sid).l[lk] = arr; touch('pages', pid); }

export function seoOf(pid) { return { ...S.defaults.pages[pid].seo, ...(S.draft.pages[pid]?.seo || {}) }; }
export function setSeo(pid, k, v) { pageState(pid).seo[k] = v; touch('pages', pid); }
export const pathOf = (pid) => S.draft.pages[pid]?.seo?.path || S.defaults.pages[pid].path;

// ---- tours / settings / forms
export const tourByslug = (slug) => S.tours.find((t) => t.slug === slug);
export function setSetting(k, v) { (S.draft.settings ||= {})[k] = v; S.settings[k] = v; touch('settings'); }
export function setCookie(k, v) { const c = ((S.draft.settings ||= {}).cookies ||= { ...S.settings.cookies }); c[k] = v; S.settings.cookies = c; touch('settings'); }
export function setMenu(menu) { (S.draft.settings ||= {}).menu = menu; S.settings.menu = menu; touch('settings'); }

/** what changed against the published version, in words the owner understands */
export function changes() {
  const out = [], pub = S.published || {};
  for (const [pid, p] of Object.entries(S.draft.pages || {})) {
    if (JSON.stringify(p) !== JSON.stringify(pub.pages?.[pid] || {})) out.push({ what: `עמוד: ${S.schema.pages[pid]?.label || pid}`, where: S.defaults.pages[pid]?.path === '/' ? 'דף הבית' : pathOf(pid) });
  }
  if (JSON.stringify(S.draft.shared || {}) !== JSON.stringify(pub.shared || { f: {} }) && Object.keys(S.draft.shared?.f || {}).length) out.push({ what: 'פוטר האתר', where: 'מוצג בכל הדפים' });
  if (S.draft.tours && JSON.stringify(S.draft.tours) !== JSON.stringify(pub.tours || [])) out.push({ what: 'הטיולים', where: 'דף הבית, רשימת הסיורים ועמודי הטיול' });
  if (S.draft.settings && JSON.stringify(S.draft.settings) !== JSON.stringify(pub.settings || {})) out.push({ what: 'הגדרות האתר', where: 'פרטי קשר, תפריט והודעת העוגיות בכל הדפים' });
  if (S.draft.forms && JSON.stringify(S.draft.forms) !== JSON.stringify(pub.forms || {})) out.push({ what: 'הטפסים', where: 'דף הבית (יצירת קשר)' });
  return out;
}
