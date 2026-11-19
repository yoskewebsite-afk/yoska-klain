// The whole HTTP API behind /api/*. Public routes: lead, event, health. Everything under /api/admin needs a signed-in admin.
import { spec as blockSpec } from './blocks.mjs';
import { getStore, buckets } from './store.mjs';
import { send, fail, readJson, urlOf } from './http.mjs';
import * as auth from './auth.mjs';
import * as content from './content.mjs';
import * as leads from './leads.mjs';
import * as analytics from './analytics.mjs';
import * as media from './media.mjs';
import * as backup from './backup.mjs';
import * as push from './push.mjs';
import { assets, mergedSettings, effectiveTours, hasPage } from './render.mjs';

let PUB_CACHE = { at: 0, snap: null };
export async function publishedSnapshot(store) {
  if (!store) return null;
  if (Date.now() - PUB_CACHE.at < 5000) return PUB_CACHE.snap;
  try { PUB_CACHE = { at: Date.now(), snap: await content.getPublished(store) }; } catch { /* the database being down must not take the site down */ }
  return PUB_CACHE.snap;
}
export const bustCache = () => { PUB_CACHE = { at: 0, snap: null }; };

export function integrations(store, snap) {
  const e = process.env;
  const s = mergedSettings(snap);
  return [
    { id: 'db', name: 'מסד נתונים ואחסון', state: store?.kind === 'supabase' ? 'on' : store?.kind === 'file' ? 'dev' : 'off',
      detail: store?.kind === 'supabase' ? 'Supabase מחובר: תוכן, פניות, מדיה וגיבויים נשמרים בין פריסות.' : store?.kind === 'file' ? 'מצב פיתוח מקומי: הנתונים נשמרים בקבצים בתיקיית .data ולא ישרדו פריסה ל-Vercel.' : 'לא מחובר. הפרטים הציבוריים מוצגים מהתוכן שנבנה באתר, והניהול כבוי.',
      missing: store?.kind === 'supabase' ? [] : ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'להריץ את backend/migrations/001_init.sql וליצור שני buckets: media (ציבורי) ו-backups (פרטי)'] },
    { id: 'forms', name: 'טפסים ו-CRM', state: store ? 'on' : 'off', detail: 'כל טפסי האתר שומרים את הפנייה במסד לפני שמוצגת הודעת הצלחה. הגנות: honeypot, הגבלת קצב, מזהה שליחה נגד כפילויות.', missing: [] },
    { id: 'notify-webhook', name: 'התראה ליוסי (Webhook)', state: e.NOTIFY_WEBHOOK_URL ? 'on' : 'off', detail: e.NOTIFY_WEBHOOK_URL ? 'כל פנייה חדשה נשלחת ל-Webhook אחרי השמירה.' : 'לא מחובר. אפשר לחבר Slack, Make, Zapier או כל שירות שמקבל POST.', missing: e.NOTIFY_WEBHOOK_URL ? [] : ['NOTIFY_WEBHOOK_URL'] },
    { id: 'notify-email', name: 'התראה במייל (Resend)', state: e.RESEND_API_KEY && e.NOTIFY_FROM ? 'on' : 'off', detail: e.RESEND_API_KEY && e.NOTIFY_FROM ? 'מיילים נשלחים לכתובות שהוגדרו בטופס.' : 'לא מחובר. נדרש חשבון Resend ודומיין שולח מאומת, ואז כתובת יעד במסך הטפסים.', missing: e.RESEND_API_KEY && e.NOTIFY_FROM ? [] : ['RESEND_API_KEY', 'NOTIFY_FROM'] },
    { id: 'analytics', name: 'אנליטיקה (פנימית, ללא עוגיות)', state: store ? 'on' : 'off', detail: 'נספרים רק מבקרים שאישרו מדידה: צפיות, קליקים על טלפון ווואטסאפ, מקור הגעה. אפשר להוסיף ספק חיצוני דרך yoskeTrack.addProvider (ראו ADMIN_GUIDE.md).', missing: [] },
    { id: 'push', name: 'התראות לטלפון (אפליקציה)', state: push.configured() ? 'on' : 'off', detail: push.configured() ? 'פנייה חדשה מקפיצה התראה לטלפונים שהפעילו התראות במסך הניהול (גם כשהאפליקציה סגורה).' : 'בזמן שמסך הניהול פתוח מופיעה הודעה קופצת בצד גם בלי הגדרה. כדי שההתראה תגיע לטלפון כשהאפליקציה סגורה צריך מפתחות VAPID.', missing: push.configured() ? [] : ['להריץ node tools/gen_vapid.mjs ולהגדיר VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT'] },
    { id: 'mailing', name: 'דיוור', state: 'ready', detail: 'נקודת חיבור מוכנה (ראו ADMIN_GUIDE.md). פנייה ב-CRM לא מצרפת אף אחד לרשימת תפוצה אוטומטית.', missing: ['בחירת שירות דיוור והסכמת הגולש לקבלת דיוור'] },
    { id: 'payments', name: 'סליקה וקטלוגים', state: 'none', detail: 'האתר אינו מוכר אונליין ולכן אין סליקה או קטלוג. נקודות החיבור האפשריות מתועדות ב-ADMIN_GUIDE.md.', missing: [] },
    { id: 'backup', name: 'גיבוי מתוזמן', state: e.CRON_SECRET && store?.kind === 'supabase' ? 'on' : 'off', detail: e.CRON_SECRET ? 'Vercel Cron מפעיל גיבוי יומי (vercel.json) שנשמר ב-bucket פרטי.' : 'הקוד קיים וה-cron מוגדר ב-vercel.json, אבל טרם הופעל: חסר CRON_SECRET בפריסה.', missing: e.CRON_SECRET ? [] : ['CRON_SECRET'] },
    { id: 'seo', name: 'פתיחה לגוגל', state: s.indexable && s.siteUrl ? 'on' : 'off', detail: s.indexable ? `פתוח לאינדוקס (${s.siteUrl})` : 'האתר סגור לגוגל. מפת האתר ו-robots נפתחים כשמסמנים "פתוח לגוגל" ומזינים כתובת אתר.', missing: [] },
  ];
}

const ok = (res, data = {}) => send(res, 200, { ok: true, ...data });
const NOTSTORED = (res) => fail(res, 503, 'מסד הנתונים עדיין לא מחובר.', { code: 'no-store' });

export async function handle(req, res, path) {
  const store = getStore();
  const url = urlOf(req);
  const q = Object.fromEntries(url.searchParams);
  const m = req.method;
  try {
    // ------------------------------------------------ public
    if (path === '/api/health') return ok(res, { store: store?.kind || null, time: new Date().toISOString() });
    if (path === '/api/leads' && m === 'POST') {
      if (!store) return NOTSTORED(res);
      const snap = await publishedSnapshot(store);
      const body = await readJson(req, 40_000);
      try { return send(res, 201, await leads.createFromSite(store, req, body, snap)); }
      catch (e) { return fail(res, e.status || 500, e.status ? e.message : 'לא הצלחנו לשמור את הפנייה.', e.fields ? { fields: e.fields } : {}); }
    }
    if (path === '/api/dates' && m === 'GET') {     // upcoming open dates of published tours, for the "upcoming" boxes on the site
      const snap = await publishedSnapshot(store);
      const today = new Date().toISOString().slice(0, 10);
      const dates = [];
      for (const t of effectiveTours(snap)) if (t.status === 'published') for (const d of t.dates || []) if (d.date >= today) dates.push({ id: `${t.slug}-${d.date}`, date: d.date, time: d.time || '', title: t.name, tour_slug: hasPage(t) ? t.slug : '', meeting_point: d.meeting || '', note: d.note || '', price_note: d.price || '', action: 'inquire' });
      dates.sort((a, b) => (a.date < b.date ? -1 : 1));
      return send(res, 200, { ok: true, dates }, { 'Cache-Control': 'public, s-maxage=60' });
    }
    if (path === '/api/event' && m === 'POST') {
      if (!store) return send(res, 204, '');
      const r = await analytics.record(store, req, await readJson(req, 4000), await publishedSnapshot(store));
      return send(res, r.ok ? 204 : (r.status || 400), '');
    }
    if (path === '/api/cron/backup') {
      if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return fail(res, 401, 'לא מורשה.');
      return ok(res, { backup: await backup.createStored(store, 'cron') });
    }

    // ------------------------------------------------ admin session
    if (path === '/api/admin/setup' && m === 'POST') {
      if (!store) return NOTSTORED(res);
      const b = await readJson(req, 4000);
      if (await auth.userCount(store)) return fail(res, 403, 'כבר הוגדר מנהל. התחברו.');
      if (!process.env.ADMIN_SETUP_TOKEN || b.token !== process.env.ADMIN_SETUP_TOKEN) return fail(res, 403, 'קוד ההקמה לא נכון.');
      const id = await auth.createUser(store, b);
      await auth.audit(store, id, 'setup', {});
      return ok(res, { email: id });
    }
    if (path === '/api/admin/login' && m === 'POST') { if (!store) return NOTSTORED(res); return auth.login(store, req, res); }
    if (path === '/api/admin/logout' && m === 'POST') return auth.logout(store, req, res);

    // everything below needs a signed-in admin
    if (!path.startsWith('/api/admin/')) return fail(res, 404, 'לא נמצא.');
    const sess = await auth.requireAdmin(store, req, res);
    if (!sess) return;
    const who = sess.email;
    const draftSnap = async () => content.getDraft(store);

    if (path === '/api/admin/password' && m === 'POST') {
      const b = await readJson(req);
      try { await auth.changePassword(store, sess.email, b.current, b.next); } catch (e) { return fail(res, e.status || 400, e.message); }
      return ok(res, {});
    }
    if (path === '/api/admin/code' && m === 'POST') {   // sign-in code: set (6-12 digits) or turn off (code: null)
      const b = await readJson(req);
      try { await auth.setCode(store, sess.email, b.code === null ? null : String(b.code ?? '').trim()); } catch (e) { return fail(res, e.status || 400, e.message); }
      return ok(res, { hasCode: b.code !== null });
    }
    if (path === '/api/admin/me') return ok(res, { user: { email: sess.email, name: sess.name }, csrf: sess.csrf });
    if (path === '/api/admin/bundle') {
      const A = assets();
      // one round trip for both documents (was five sequential reads)
      const [d, published] = await Promise.all([store.get('content', 'draft'), store.get('content', 'published')]);
      const draft = d || published || null;
      const meRec = await store.get('users', sess.email);
      return ok(res, {
        me: { user: { email: sess.email, name: sess.name }, csrf: sess.csrf, hasCode: !!meRec?.code },
        schema: A.schema, blocks: blockSpec(), defaults: { pages: A.defaults.pages, shared: A.defaults.shared, tours: A.defaults.tours, settings: A.defaults.settings },
        draft, published, status: await content.status(store, [d, published]), settings: mergedSettings(draft), tours: effectiveTours(draft), report: content.reportFor(draft), store: store.kind,
      });
    }
    if (path === '/api/admin/draft' && m === 'PATCH') {
      const next = await content.saveDraft(store, await readJson(req), who);
      return ok(res, { status: await content.status(store), savedAt: next.savedAt, report: content.reportFor(next) });
    }
    if (path === '/api/admin/draft/discard' && m === 'POST') { await content.discardDraft(store, who); return ok(res, { draft: await draftSnap(), status: await content.status(store) }); }
    if (path === '/api/admin/publish' && m === 'POST') {
      const b = await readJson(req, 4000);
      try { const r = await content.publish(store, who, b.note); bustCache(); return ok(res, { ...r, status: await content.status(store) }); }
      catch (e) { return fail(res, e.status || 500, e.message || 'הפרסום נכשל. שום דבר לא פורסם חלקית.'); }
    }
    if (path === '/api/admin/revisions') return ok(res, { revisions: await content.listRevisions(store) });
    if (path === '/api/admin/restore' && m === 'POST') {
      const b = await readJson(req, 2000);
      const r = await content.restoreRevision(store, String(b.id || ''), who); bustCache();
      return ok(res, { ...r, draft: await draftSnap(), status: await content.status(store) });
    }

    // ------------------------------------------------ phone / browser notifications
    if (path === '/api/admin/push/key') return ok(res, { publicKey: push.configured() ? push.publicKey() : null });
    if (path === '/api/admin/push/subscribe' && m === 'POST') { await push.save(store, who, (await readJson(req, 4000)).subscription); return ok(res); }
    if (path === '/api/admin/push/unsubscribe' && m === 'POST') { await push.remove(store, (await readJson(req, 2000)).endpoint); return ok(res); }
    if (path === '/api/admin/push/test' && m === 'POST') return ok(res, await push.broadcast(store, { title: 'בדיקת התראה', body: 'ההתראות פעילות. כך תראו פנייה חדשה.', url: '/admin#/leads', tag: 'test' }));
    if (path === '/api/admin/poll') {   // the open app asks every ~25s: anything new since the last check?
      const since = q.since || new Date(Date.now() - 60000).toISOString();
      const fresh = (await leads.listLeads(store, {})).filter((l) => l.createdAt > since).slice(0, 5).map((l) => ({ id: l.id, name: l.name, tourName: l.tourName, createdAt: l.createdAt }));
      return ok(res, { now: new Date().toISOString(), leads: fresh });
    }

    // ------------------------------------------------ leads
    if (path === '/api/admin/leads' && m === 'GET') { const all = await leads.listLeads(store, q); const lim = Math.min(+q.limit || 200, 1000); return ok(res, { total: all.length, leads: all.slice(+q.offset || 0, (+q.offset || 0) + lim) }); }
    if (path === '/api/admin/leads' && m === 'POST') return ok(res, { lead: await leads.addManual(store, await readJson(req, 20000), who, await draftSnap()) });
    if (path === '/api/admin/leads.csv') { const rows = await leads.listLeads(store, q); return send(res, 200, leads.toCsv(rows), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"` }); }
    let mm = /^\/api\/admin\/leads\/([\w-]+)(\/notify)?$/.exec(path);
    if (mm) {
      if (mm[2] && m === 'POST') {
        const l = await store.get('leads', mm[1]); if (!l) return fail(res, 404, 'הפנייה לא נמצאה.');
        const snap = await draftSnap();
        l.notify = await leads.notify(store, l, { notifyEmail: mergedSettings(snap).notifyEmail }, snap); await store.put('leads', l.id, l);
        return ok(res, { lead: l });
      }
      if (m === 'GET') { const l = await store.get('leads', mm[1]); return l ? ok(res, { lead: l }) : fail(res, 404, 'הפנייה לא נמצאה.'); }
      if (m === 'PATCH') return ok(res, { lead: await leads.patchLead(store, mm[1], await readJson(req, 20000), who) });
    }

    // ------------------------------------------------ stats and forms
    if (path === '/api/admin/stats') {
      const today = new Date().toISOString().slice(0, 10), from = q.from || new Date(Date.now() - 29 * 86400e3).toISOString().slice(0, 10);
      // the draft is passed as a promise, so it is read alongside the stats queries instead of before them
      return ok(res, await analytics.stats(store, { from, to: q.to || today, bucket: q.bucket === 'week' ? 'week' : 'day' }, draftSnap()));
    }
    if (path === '/api/admin/forms/stats') {
      const rows = (await store.list('leads', { limit: 20000 })).map((r) => r.data);
      const by = {};
      for (const l of rows) { const b = (by[l.formId] ||= { total: 0, spam: 0, last: '' }); b.total++; if (l.spam) b.spam++; if (l.createdAt > b.last) b.last = l.createdAt; }
      return ok(res, { forms: by });
    }

    // ------------------------------------------------ media
    if (path === '/api/admin/media' && m === 'GET') return ok(res, { media: await media.list(store) });
    if (path === '/api/admin/media' && m === 'POST') return ok(res, { media: await media.upload(store, await readJson(req), who) });
    mm = /^\/api\/admin\/media\/([\w-]+)(\/usage)?$/.exec(path);
    if (mm) {
      const meta = (await media.list(store)).find((x) => x.id === mm[1]);
      if (mm[2]) return ok(res, { usage: meta ? await media.usageOf(store, meta.url) : [] });
      if (m === 'PATCH') return ok(res, { media: await media.patch(store, mm[1], await readJson(req, 4000)) });
      if (m === 'DELETE') { await media.remove(store, mm[1], q.force === '1'); await auth.audit(store, who, 'media-delete', { id: mm[1] }); return ok(res); }
    }

    // ------------------------------------------------ integrations, backups, audit
    if (path === '/api/admin/integrations') { const [d, bk] = await Promise.all([draftSnap(), backup.listStored(store)]); return ok(res, { integrations: integrations(store, d), lastBackup: bk[0] || null }); }
    if (path === '/api/admin/backups' && m === 'GET') return ok(res, { backups: await backup.listStored(store), keep: backup.KEEP });
    if (path === '/api/admin/backups' && m === 'POST') { const meta = await backup.createStored(store, who); await auth.audit(store, who, 'backup', { id: meta.id }); return ok(res, { backup: meta }); }
    mm = /^\/api\/admin\/backups\/([\w-]+)\/download$/.exec(path);
    if (mm) { const f = await backup.readStored(store, mm[1]); return f ? send(res, 200, f.buf, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${f.name}"` }) : fail(res, 404, 'הגיבוי לא נמצא.'); }
    if (path === '/api/admin/audit') return ok(res, { audit: (await store.list('audit', { limit: 200 })).map((r) => r.data) });

    return fail(res, 404, 'לא נמצא.');
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message, e.usage ? { usage: e.usage } : {});
    console.error('api error', path, e?.message);          // never the body: it may hold personal details
    return fail(res, 500, 'אירעה תקלה בשרת. נסו שוב.');
  }
}
export { buckets };
