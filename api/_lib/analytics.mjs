// First-party, cookie-free measurement. Events exist only for visitors who allowed measurement, carry no personal data
// (no name, phone, e-mail, message text, IP or full URL) and are de-duplicated by a per-page-load id.
import { rateLimit, ipHash } from './http.mjs';
import { assets, effectiveTours, pagePath } from './render.mjs';
import { OPEN_STATUSES } from './leads.mjs';

const TYPES = new Set(['pv', 'wa', 'tel', 'mail']);
const txt = (s, n) => String(s ?? '').replace(/[^\w\-.:/]/g, '').slice(0, n);

export function refCategory(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!h) return 'direct';
  if (/(^|\.)google\./.test(h)) return 'google';
  if (/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$|^m\.facebook\.com$/.test(h)) return 'facebook';
  if (/(^|\.)instagram\.com$|^l\.instagram\.com$/.test(h)) return 'instagram';
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(h)) return 'whatsapp';
  if (/(^|\.)(bing|duckduckgo|yahoo|ecosia)\./.test(h)) return 'search';
  if (/(^|\.)(youtube|t\.co|twitter|x|tiktok|linkedin)\./.test(h)) return 'social';
  return 'other';
}

export async function record(store, req, b, snap) {
  if (!b.c) return { ok: true, skipped: 'no-consent' };
  if (!TYPES.has(b.type)) return { ok: false, status: 400 };
  const eid = txt(b.eid, 40), sid = txt(b.sid, 40);
  if (eid.length < 8 || sid.length < 8) return { ok: false, status: 400 };
  const rl = await rateLimit(store, `ev:${ipHash(req)}`, 240, 60);
  if (!rl.ok) return { ok: true, skipped: 'rate' };
  const pid = assets().defaults.pages[b.page] ? b.page : '';
  const tour = effectiveTours(snap).some((t) => t.slug === b.tour) ? b.tour : '';
  const ref = b.type === 'pv' ? (txt(b.utm, 30) || refCategory(b.ref)) : '';
  const { created } = await store.put('events', eid, { type: b.type, page: pid, tour, ref, sid, at: new Date().toISOString() }, { ifAbsent: true });
  return { ok: true, duplicate: !created };
}

const day = (iso) => new Date(new Date(iso).getTime() + 2 * 3600e3).toISOString().slice(0, 10);   // Israel time, close enough for daily buckets
const week = (iso) => { const d = new Date(day(iso)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); };

export async function stats(store, { from, to, bucket = 'day' }, snap) {
  const A = assets();
  const fromIso = new Date(from + 'T00:00:00+02:00').toISOString();
  const toIso = new Date(new Date(to + 'T23:59:59+02:00').getTime()).toISOString();
  const [events, leadRows] = await Promise.all([store.list('events', { since: fromIso, until: toIso, limit: 100000 }), store.list('leads', { limit: 20000 })]);
  const ev = events.map((r) => ({ ...r.data, at: r.data.at || r.created_at }));
  const leads = leadRows.map((r) => r.data).filter((l) => !l.spam);
  const inRange = leads.filter((l) => l.createdAt >= fromIso && l.createdAt <= toIso);
  const key = bucket === 'week' ? week : day;

  const series = new Map();
  const slot = (k) => { if (!series.has(k)) series.set(k, { k, visits: new Set(), views: 0, leads: 0 }); return series.get(k); };
  // fill empty buckets so the chart has a continuous axis
  for (let t = new Date(fromIso); t <= new Date(toIso); t = new Date(t.getTime() + 86400e3)) slot(key(t.toISOString()));
  const sessions = new Map();   // sid -> first pv (source)
  const pages = new Map(), tours = new Map(), clicks = { wa: 0, tel: 0, mail: 0 };
  for (const e of ev.sort((a, b) => (a.at < b.at ? -1 : 1))) {
    if (e.type === 'pv') {
      const s = slot(key(e.at)); s.views++; s.visits.add(e.sid);
      if (!sessions.has(e.sid)) sessions.set(e.sid, e.ref || 'direct');
      const label = e.tour ? null : e.page; if (label) pages.set(label, (pages.get(label) || 0) + 1);
      if (e.tour) tours.set(e.tour, (tours.get(e.tour) || 0) + 1);
    } else if (clicks[e.type] !== undefined) clicks[e.type]++;
  }
  for (const l of inRange) slot(key(l.createdAt)).leads++;
  const sources = {};
  for (const ref of sessions.values()) sources[ref] = (sources[ref] || 0) + 1;
  const tourNames = Object.fromEntries(effectiveTours(snap).map((t) => [t.slug, t.name]));
  const pv = ev.filter((e) => e.type === 'pv');
  const now = new Date().toISOString();
  const open = leads.filter((l) => !l.archived && OPEN_STATUSES.includes(l.status));
  return {
    range: { from, to, bucket },
    hasData: ev.length > 0,
    totals: {
      visits: sessions.size, views: pv.length, leads: inRange.filter((l) => !l.archived || true).length,
      pending: open.length, won: leads.filter((l) => l.status === 'won' && l.closedAt && l.closedAt >= fromIso && l.closedAt <= toIso).length,
      waClicks: clicks.wa, telClicks: clicks.tel, mailClicks: clicks.mail,
    },
    series: [...series.values()].sort((a, b) => (a.k < b.k ? -1 : 1)).map((s) => ({ k: s.k, visits: s.visits.size, views: s.views, leads: s.leads })),
    pages: [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, n]) => ({ page: p, label: A.schema.pages[p]?.label || p, path: p && A.defaults.pages[p] ? pagePath(snap, p) : '', views: n })),
    tours: [...tours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => ({ slug: t, name: tourNames[t] || t, views: n })),
    sources: Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n })),
    recent: leads.filter((l) => !l.archived).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6).map((l) => ({ id: l.id, name: l.name, status: l.status, tourName: l.tourName, createdAt: l.createdAt, phone: l.phone })),
    reminders: leads.filter((l) => l.reminder && !l.reminder.done && !l.archived).sort((a, b) => (a.reminder.at < b.reminder.at ? -1 : 1)).slice(0, 6)
      .map((l) => ({ id: l.id, name: l.name, at: l.reminder.at, text: l.reminder.text, overdue: l.reminder.at < now })),
  };
}
