// Leads (פניות): created by the public form or by hand, worked in the CRM screen. Never deleted by hiding a tour or a form.
import { createHash } from 'node:crypto';
import { newId } from './store.mjs';
import { rateLimit, ipHash, sha256 } from './http.mjs';
import { broadcast as pushAll } from './push.mjs';
import { effectiveTours, mergedSettings } from './render.mjs';

export const STATUSES = { new: 'חדשה', contacted: 'נוצר קשר', waiting: 'ממתינה לתשובה', won: 'נסגר טיול', lost: 'נסגר ללא הזמנה' };
export const OPEN_STATUSES = ['new', 'contacted', 'waiting'];
const bad = (m, status = 400) => Object.assign(new Error(m), { status });
const txt = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
export const normPhone = (p) => String(p || '').replace(/[^\d+]/g, '');
const phoneOk = (p) => /^(\+?972|0)\d{8,9}$/.test(normPhone(p));
const linkCount = (s) => (String(s).match(/https?:\/\/|www\./gi) || []).length;

export const KINDS = { general: 'פנייה כללית', family: 'משפחה וחברים', org: 'חברה או ארגון', tour: 'סיור מסוים', date: 'מועד מהלוח', private: 'קבוצה פרטית', quiz: 'שאלון התאמה' };
const PHONE = /^(?:\+?972|0)(?:[23489]|5\d|7\d)\d{7}$/;

/** every lead form of the site posts here (/api/leads). Saved first, notified second: a failing notification never loses or duplicates a lead. */
export async function createFromSite(store, req, b, snap) {
  const settings = mergedSettings(snap);
  if (settings.formsActive === false) throw bad('הטפסים כבויים כרגע. אפשר לפנות בוואטסאפ או בטלפון.', 410);
  if (txt(b.website, 100)) return { ok: true, id: 'ignored', ignored: true };      // honeypot: a person never fills it
  const rl = await rateLimit(store, `lead:${ipHash(req)}`, 6, 10 * 60);
  if (!rl.ok) throw bad('שלחתם כמה פניות ברצף. נסו שוב בעוד כמה דקות, או פנו בוואטסאפ.', 429);
  const tokenIn = txt(b.client_token, 80);
  if (!/^[\w-]{8,80}$/.test(tokenIn)) throw bad('הבקשה לא תקינה. רעננו את הדף ונסו שוב.');
  const kind = KINDS[b.kind] ? b.kind : 'general';
  const id = 'f-' + createHash('sha256').update(kind + ':' + tokenIn).digest('hex').slice(0, 20);   // the same submission can never become two leads
  const name = txt(b.name, 120), phone = txt(b.phone, 40);
  const errors = {};
  if (name.length < 2) errors.name = true;
  if (!PHONE.test(phone.replace(/[\s\-().]/g, ''))) errors.phone = true;
  if (Object.keys(errors).length) throw Object.assign(bad('חלק מהשדות לא תקינים.', 422), { fields: errors });
  const tours = effectiveTours(snap);
  const tourObj = tours.find((t) => t.slug === txt(b.tour_slug, 80));
  const message = txt(b.message, 3000);
  const fields = { name, phone, kind: KINDS[kind] };
  if (message) fields.msg = message;
  if (b.date_id) fields.date = txt(b.date_id, 60);
  if (b.quiz) fields.quiz = txt(JSON.stringify(b.quiz), 1500);
  const spam = linkCount(message) > 2 || (b.t0 && Date.now() - +b.t0 < 1200);
  const now = new Date().toISOString();
  const lead = {
    id, formId: kind, formName: KINDS[kind], createdAt: now, updatedAt: now, status: 'new', channel: 'form', manual: false, name, phone, email: '', message, fields,
    fieldLabels: { name: 'שם', phone: 'טלפון', kind: 'סוג פנייה', msg: 'ההודעה', date: 'מועד שנבחר', quiz: 'תשובות השאלון' },
    tour: tourObj?.slug || '', tourName: tourObj?.name || '', page: txt(b.source_page, 200), pageId: '', source: { ref: txt(b.source_ref, 120), utm: txt(b.utm, 120) },
    spam: !!spam, archived: false, notes: [], reminder: null, notify: { status: 'pending' },
  };
  const { created } = await store.put('leads', id, lead, { ifAbsent: true });
  if (!created) return { ok: true, id, duplicate: true };
  if (!spam) lead.notify = await notify(store, lead, { notifyEmail: settings.notifyEmail }, snap).catch((e) => ({ status: 'failed', error: String(e.message || e).slice(0, 200), at: now }));
  else lead.notify = { status: 'skipped', reason: 'spam' };
  await store.put('leads', id, lead);
  return { ok: true, id };
}

// ---------------------------------------------------------------- notifications (optional, after the save)
export async function notify(store, lead, form, snap) {
  const at = new Date().toISOString();
  const text = `פנייה חדשה מהאתר: ${lead.name} ${lead.phone}${lead.tourName ? ` | סיור: ${lead.tourName}` : ''}${lead.message ? ` | ${lead.message}` : ''}`.slice(0, 600);
  const results = [];
  try { const pr = await pushAll(store, { title: 'פנייה חדשה מהאתר', body: `${lead.name || lead.phone}${lead.tourName ? ' · ' + lead.tourName : ''}`, url: `/admin#/leads/${lead.id}`, tag: 'lead-' + lead.id }); if (pr.sent) results.push('push'); } catch { /* optional */ }
  const ctl = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
  if (process.env.NOTIFY_WEBHOOK_URL) {
    try {
      const r = await fetch(process.env.NOTIFY_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl(5000), body: JSON.stringify({ text, content: text, lead: { id: lead.id, name: lead.name, phone: lead.phone, tour: lead.tourName, message: lead.message, at: lead.createdAt } }) });
      results.push(r.ok ? 'webhook' : `webhook:${r.status}`);
    } catch (e) { results.push('webhook:error'); }
  }
  const to = String(form?.notifyEmail || '').split(/[,\s;]+/).filter(Boolean);
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_FROM && to.length) {
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', signal: ctl(6000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.NOTIFY_FROM, to, subject: `פנייה חדשה מהאתר: ${lead.name}`, text: `${text}\n\nלפתיחה במערכת: ${mergedSettings(snap).siteUrl || ''}/admin#/leads/${lead.id}` }) });
      results.push(r.ok ? 'email' : `email:${r.status}`);
    } catch (e) { results.push('email:error'); }
  }
  if (!results.length) return { status: 'none', at };
  const ok = results.some((x) => !x.includes(':'));
  return { status: ok ? 'sent' : 'failed', channels: results, at };
}

// ---------------------------------------------------------------- the CRM
export async function listLeads(store, q = {}) {
  const rows = (await store.list('leads', { limit: 20000 })).map((r) => r.data);
  const needle = String(q.q || '').trim().toLowerCase();
  const digits = needle.replace(/\D/g, '');
  const from = q.from ? new Date(q.from).toISOString() : '', to = q.to ? new Date(new Date(q.to).getTime() + 86400e3).toISOString() : '';
  let out = rows.filter((l) => {
    if (q.view === 'spam' ? !l.spam : l.spam) return false;
    if (q.view === 'archived' ? !l.archived : (q.view !== 'spam' && l.archived)) return false;
    if (q.status && q.status !== 'all' && l.status !== q.status) return false;
    if (q.open === '1' && !OPEN_STATUSES.includes(l.status)) return false;
    if (q.form && l.formId !== q.form) return false;
    if (q.tour && l.tour !== q.tour) return false;
    if (from && l.createdAt < from) return false;
    if (to && l.createdAt >= to) return false;
    if (needle) { const hay = `${l.name} ${l.message}`.toLowerCase(); if (!(hay.includes(needle) || (digits.length >= 3 && normPhone(l.phone).includes(digits)))) return false; }
    return true;
  });
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}

export async function patchLead(store, id, p, who) {
  const l = await store.get('leads', id);
  if (!l) throw bad('הפנייה לא נמצאה.', 404);
  const now = new Date().toISOString();
  const log = (kind, text) => l.notes.unshift({ id: newId(4), at: now, by: who, kind, text });
  if (p.status && p.status !== l.status) {
    if (!STATUSES[p.status]) throw bad('סטטוס לא מוכר.');
    log('status', `סטטוס: ${STATUSES[l.status]} ← ${STATUSES[p.status]}`);
    l.status = p.status;
    if (p.status === 'won') l.closedAt = now; else delete l.closedAt;
  }
  if (p.note) log('note', txt(p.note, 3000));
  if (p.reminder !== undefined) {
    if (p.reminder === null) { if (l.reminder) log('system', 'התזכורת הוסרה'); l.reminder = null; }
    else {
      const at = new Date(p.reminder.at);
      if (isNaN(+at)) throw bad('תאריך התזכורת לא תקין.');
      l.reminder = { at: at.toISOString(), text: txt(p.reminder.text, 200), done: false };
      log('system', `תזכורת לחזרה ללקוח: ${at.toLocaleString('he-IL')}${l.reminder.text ? ` (${l.reminder.text})` : ''}`);
    }
  }
  if (p.reminderDone !== undefined && l.reminder) { l.reminder.done = !!p.reminderDone; log('system', p.reminderDone ? 'התזכורת סומנה כבוצעה' : 'התזכורת נפתחה מחדש'); }
  for (const k of ['name', 'phone', 'email', 'message']) if (p[k] !== undefined) l[k] = txt(p[k], k === 'message' ? 3000 : 200);
  if (p.tour !== undefined) { l.tour = txt(p.tour, 80); }
  if (p.spam !== undefined) { l.spam = !!p.spam; log('system', l.spam ? 'סומנה כספאם' : 'הוחזרה מספאם'); }
  if (p.archived !== undefined) { l.archived = !!p.archived; log('system', l.archived ? 'הועברה לארכיון' : 'הוחזרה מהארכיון'); }
  l.updatedAt = now;
  await store.put('leads', id, l);
  return l;
}

export async function addManual(store, b, who, snap) {
  const name = txt(b.name, 120), phone = txt(b.phone, 40);
  if (!name && !phone) throw bad('צריך לפחות שם או טלפון.');
  const tours = effectiveTours(snap);
  const tour = tours.find((t) => t.slug === b.tour);
  const now = new Date().toISOString();
  const id = 'm-' + newId(8);
  const lead = {
    id, formId: 'manual', formName: 'הוספה ידנית', createdAt: now, updatedAt: now, status: STATUSES[b.status] ? b.status : 'new', channel: ['phone', 'whatsapp', 'manual'].includes(b.channel) ? b.channel : 'manual', manual: true,
    name, phone, email: txt(b.email, 120), message: txt(b.message, 3000), fields: {}, fieldLabels: {}, tour: tour?.slug || '', tourName: tour?.name || '', page: '', pageId: '', source: null,
    spam: false, archived: false, notes: [{ id: newId(4), at: now, by: who, kind: 'system', text: 'נוספה ידנית' }], reminder: null, notify: { status: 'none' },
  };
  await store.put('leads', id, lead);
  return lead;
}

const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
/** UTF-8 with BOM so Excel opens the Hebrew correctly */
export function toCsv(leads) {
  const head = ['מזהה', 'תאריך', 'סטטוס', 'שם', 'טלפון', 'מייל', 'הודעה', 'טיול', 'טופס', 'עמוד מקור', 'ערוץ', 'תזכורת', 'הערות'];
  const rows = leads.map((l) => [l.id, new Date(l.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }), STATUSES[l.status], l.name, l.phone, l.email, l.message, l.tourName, l.formName, l.page,
    { form: 'טופס באתר', phone: 'טלפון', whatsapp: 'וואטסאפ', manual: 'ידני' }[l.channel] || l.channel, l.reminder ? new Date(l.reminder.at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) : '',
    l.notes.filter((n) => n.kind === 'note').map((n) => n.text).join(' | ')]);
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}
export { sha256 };
