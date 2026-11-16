// End-to-end checks of the server side, against a scratch data folder (never live data).
//   node tools/cms_api_test.mjs            starts its own dev server on :4291 with CMS_DATA_DIR=.data-test
import { spawn } from 'node:child_process';
import { rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, '.data-test');
const PORT = 4291, B = `http://127.0.0.1:${PORT}`;
rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
process.env.CMS_STORE = 'file'; process.env.CMS_DATA_DIR = DIR;
const env = { ...process.env, CMS_STORE: 'file', CMS_DATA_DIR: DIR, ADMIN_SETUP_TOKEN: 'setup-test-token' };
const srv = spawn('node', ['tools/dev_server.mjs', String(PORT)], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stderr.on('data', (d) => process.stderr.write(d));
await new Promise((r) => setTimeout(r, 1500));

let pass = 0, fails = 0;
const t = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fails++; console.log('  FAIL', name, extra); } };
let cookie = '', csrf = '';
const call = async (method, url, body, { auth = true, raw = false, headers = {} } = {}) => {
  const r = await fetch(B + url, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(auth && cookie ? { cookie } : {}), ...(auth && csrf && method !== 'GET' ? { 'x-csrf-token': csrf } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch { /* html */ }
  return { s: r.status, j, text, h: r.headers };
};

try {
  console.log('— access control');
  t('anonymous cannot read leads', (await call('GET', '/api/admin/leads', null, { auth: false })).s === 401);
  t('anonymous cannot read bundle', (await call('GET', '/api/admin/bundle', null, { auth: false })).s === 401);
  t('anonymous cannot export CSV', (await call('GET', '/api/admin/leads.csv', null, { auth: false })).s === 401);
  t('anonymous cannot publish', (await call('POST', '/api/admin/publish', {}, { auth: false })).s === 401);
  t('anonymous cannot preview the draft', (await call('GET', '/__preview/', null, { auth: false })).s === 401);
  t('admin shell for anonymous is only a sign-in page', /כניסה/.test((await call('GET', '/admin', null, { auth: false })).text) && !/app\.js/.test((await call('GET', '/admin', null, { auth: false })).text));

  console.log('— first admin');
  t('setup with a wrong token is refused', (await call('POST', '/api/admin/setup', { token: 'x', email: 'a@b.co', password: 'longenough1' }, { auth: false })).s === 403);
  t('setup with a short password is refused', (await call('POST', '/api/admin/setup', { token: 'setup-test-token', email: 'yossi@example.com', password: 'short' }, { auth: false })).s === 400);
  t('setup creates the first admin', (await call('POST', '/api/admin/setup', { token: 'setup-test-token', email: 'yossi@example.com', name: 'יוסי', password: 'correct-horse-9' }, { auth: false })).s === 200);
  t('setup closes once an admin exists', (await call('POST', '/api/admin/setup', { token: 'setup-test-token', email: 'x@example.com', password: 'correct-horse-9' }, { auth: false })).s === 403);
  t('wrong password is refused', (await call('POST', '/api/admin/login', { email: 'yossi@example.com', password: 'nope-nope-nope' }, { auth: false })).s === 401);
  let r = await call('POST', '/api/admin/login', { email: 'yossi@example.com', password: 'correct-horse-9' }, { auth: false });
  t('login works and sets an HttpOnly session cookie', r.s === 200 && /HttpOnly/i.test(r.h.get('set-cookie')) && /SameSite=Strict/i.test(r.h.get('set-cookie')));
  csrf = r.j.csrf;
  t('mutation without CSRF header is refused', (await call('POST', '/api/admin/publish', {}, { headers: { 'x-csrf-token': 'wrong' } })).s === 403);
  t('admin shell for a signed-in admin is the app', /app\.js/.test((await call('GET', '/admin')).text));

  console.log('— public site without content in the database');
  r = await call('GET', '/', null, { auth: false });
  t('homepage is served from defaults', r.s === 200 && r.h.get('x-cms') === 'defaults' && /תפסיקו לשבור את הראש/.test(r.text));

  console.log('— forms and CRM');
  let ipn = 1;
  const post = (b, h = {}) => call('POST', '/api/leads', b, { auth: false, headers: { 'x-forwarded-for': `10.1.0.${ipn++}`, ...h } });
  const base = { kind: 'tour', client_token: 'sub-aaaaaaaa-0001', name: 'דנה כהן', phone: '050-1234567', tour_slug: 'haifa-shel-maala', message: 'שמונה אנשים', source_page: '/tours/haifa-shel-maala.html', website: '' };
  const lp = (o) => ({ ...base, ...o });
  t('a lead without a phone is rejected', (await post(lp({ client_token: 'sub-aaaaaaaa-0002', phone: '' }))).s === 422);
  t('a bad phone is rejected', (await post(lp({ client_token: 'sub-aaaaaaaa-0003', phone: '12' }))).s === 422);
  r = await post(base);
  t('a valid lead is saved (201)', r.s === 201 && r.j.ok && !r.j.duplicate);
  const id = r.j.id;
  r = await post(base);
  t('sending the same submission twice does not create a second lead', r.j.ok && r.j.duplicate);
  r = await call('GET', '/api/admin/leads');
  t('exactly one lead exists', r.j.total === 1, JSON.stringify(r.j.total));
  const lead = r.j.leads[0];
  t('lead keeps page, tour and the labels at the time', lead.page === '/tours/haifa-shel-maala.html' && lead.tour === 'haifa-shel-maala' && lead.tourName === 'חיפה של מעלה' && lead.fieldLabels.phone === 'טלפון' && lead.formId === 'tour' && lead.status === 'new');
  t('honeypot submissions are ignored', (await post(lp({ client_token: 'sub-aaaaaaaa-0004', website: 'http://spam' }))).j.ignored === true && (await call('GET', '/api/admin/leads')).j.total === 1);
  r = await post(lp({ client_token: 'sub-aaaaaaaa-0005', t0: Date.now() - 100, message: 'http://a.co http://b.co http://c.co' }));
  t('link spam is saved as spam, not in the main list', r.j.ok && (await call('GET', '/api/admin/leads')).j.total === 1 && (await call('GET', '/api/admin/leads?view=spam')).j.total === 1);

  console.log('— CRM actions');
  r = await call('PATCH', `/api/admin/leads/${id}`, { status: 'contacted', note: 'התקשרתי, מעדיפים שישי' });
  t('status change and internal note are recorded in the history', r.j.lead.status === 'contacted' && r.j.lead.notes.some((n) => n.kind === 'note') && r.j.lead.notes.some((n) => n.kind === 'status'));
  r = await call('PATCH', `/api/admin/leads/${id}`, { reminder: { at: new Date(Date.now() + 86400e3).toISOString(), text: 'לחזור עם מחיר' } });
  t('reminder is stored', !!r.j.lead.reminder && !r.j.lead.reminder.done);
  r = await call('POST', '/api/admin/leads', { name: 'משה', phone: '052-7654321', channel: 'whatsapp', message: 'כתב בוואטסאפ', tour: 'haifa-ahuvati' });
  t('manual lead can be added', r.j.ok && r.j.lead.manual && r.j.lead.channel === 'whatsapp');
  t('search by phone digits', (await call('GET', '/api/admin/leads?q=7654321')).j.total === 1);
  t('filter by tour', (await call('GET', '/api/admin/leads?tour=haifa-shel-maala')).j.total === 1);
  t('filter by status', (await call('GET', '/api/admin/leads?status=new')).j.total === 1);
  r = await call('GET', '/api/admin/leads.csv?status=all');
  const csvBytes = Buffer.from(await (await fetch(B + '/api/admin/leads.csv?status=all', { headers: { cookie } })).arrayBuffer());
  t('CSV export is UTF-8 with BOM, opens in Excel and respects the filters', csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf && /דנה כהן/.test(r.text) && /משה/.test(r.text) && !/spam/.test(r.text));
  r = await call('PATCH', `/api/admin/leads/${id}`, { archived: true });
  t('archiving removes it from the main list but keeps it', (await call('GET', '/api/admin/leads')).j.total === 1 && (await call('GET', '/api/admin/leads?view=archived')).j.total === 1);
  await call('PATCH', `/api/admin/leads/${id}`, { archived: false });

  console.log('— draft, preview, publish');
  r = await call('GET', '/api/admin/bundle');
  t('bundle carries schema, defaults and tours', r.j.ok && r.j.schema.pages.index.sections.length >= 12 && r.j.tours.length === 7 && Object.keys(r.j.schema.pages).length === 21);
  const idx = r.j.schema.pages.index;
  const heroKey = idx.sections[0].groups[0].fields[0].key;
  const faqKey = idx.sections.find((x) => x.id === 'faq').lists[0].key;
  r = await call('PATCH', '/api/admin/draft', { pages: { index: { seo: { title: 'יוסק׳ה בדיקה: כותרת חדשה', description: 'תיאור חדש לגוגל שהוא באורך סביר ומספיק כדי לא לקבל אזהרה על קצרים.' }, sec: { top: { f: { [heroKey]: 'חיפה בדיקה' } }, faq: { l: { [faqKey]: [{ id: 'q1', 'i.t1': 'שאלה חדשה?', 'i.t2': 'תשובה חדשה.' }] } } } } } });
  t('draft saves', r.j.ok && r.j.status.dirty);
  r = await call('GET', '/', null, { auth: false });
  t('public site does NOT show the draft', /תפסיקו לשבור את הראש/.test(r.text) && !/חיפה בדיקה/.test(r.text));
  r = await call('GET', '/__preview/');
  t('protected preview shows the draft through the real components', r.s === 200 && /חיפה בדיקה/.test(r.text) && /שאלה חדשה\?/.test(r.text) && /noindex/.test(r.text) && /<title>יוסק׳ה בדיקה/.test(r.text));
  t('server strips template injection from text', (await call('PATCH', '/api/admin/draft', { pages: { index: { sec: { top: { f: { [heroKey]: 'x {{set.phone}} y' } } } } } })).j.ok && /x set\.phone y/.test((await call('GET', '/__preview/')).text));
  await call('PATCH', '/api/admin/draft', { pages: { index: { seo: { title: 'יוסק׳ה בדיקה: כותרת חדשה', description: 'תיאור חדש לגוגל שהוא באורך סביר ומספיק כדי לא לקבל אזהרה על קצרים.' }, sec: { top: { f: { [heroKey]: 'חיפה בדיקה' } }, faq: { l: { [faqKey]: [{ id: 'q1', 'i.t1': 'שאלה חדשה?', 'i.t2': 'תשובה חדשה.' }] } } } } } });
  t('hero cannot be hidden', (await call('PATCH', '/api/admin/draft', { pages: { index: { sec: { top: { hidden: true } } } } })).s === 400);
  r = await call('POST', '/api/admin/publish', { note: 'בדיקה ראשונה' });
  t('publish succeeds', r.j.ok && r.j.revision);
  const rev1 = r.j.revision;
  r = await call('GET', '/', null, { auth: false });
  t('public site now shows the published edit, title and the new FAQ', /חיפה בדיקה/.test(r.text) && /<title>יוסק׳ה בדיקה: כותרת חדשה/.test(r.text) && /שאלה חדשה\?/.test(r.text) && r.h.get('x-cms') === 'published');
  t('FAQ list was replaced (the old questions are gone)', !/אפשר להתאים את היום לקבוצה שלנו/.test(r.text));

  console.log('— sections: hide, order, anchors');
  r = await call('PATCH', '/api/admin/draft', { pages: { index: { order: idx.order, sec: { abroad: { hidden: true } } } } });
  t('hiding a section saves', r.j.ok);
  await call('POST', '/api/admin/publish', { note: 'הסתרת מסעות' });
  r = await call('GET', '/', null, { auth: false });
  t('hidden section is gone from the page and its rail link is removed', !/id="abroad"/.test(r.text) && !/data-rail-link="abroad"/.test(r.text));
  r = await call('PATCH', '/api/admin/draft', { pages: { index: { order: ['map', 'top'] } } });
  t('hero cannot be moved', r.s === 400);

  console.log('— tours');
  r = await call('GET', '/api/admin/bundle');
  let tours = r.j.tours;
  const nt = { ...tours[0], id: 'new-tour', slug: 'new-tour', name: 'סיור בדיקה חדש', place: 'מקום בדיקה', blurb: 'תיאור קצר של סיור בדיקה.', fit: '', btn: 'לשאול על הסיור', page: false, status: 'published', home: true, featured: false, order: 99, stops: ['הנמל'], card: tours[0].card };
  r = await call('PATCH', '/api/admin/draft', { tours: [...tours, nt] });
  t('tour added', r.j.ok);
  await call('POST', '/api/admin/publish', { note: 'טיול חדש' });
  const home = (await call('GET', '/', null, { auth: false })).text;
  t('new tour appears in the home rail and in the tours list (card links to WhatsApp: no page yet)', home.includes('סיור בדיקה חדש') && /סיור בדיקה חדש/.test((await call('GET', '/tours/', null, { auth: false })).text) && (await call('GET', '/tours/new-tour.html', null, { auth: false })).s === 404);
  await call('POST', '/api/leads', lp({ client_token: 'sub-bbbbbbbb-0001', name: 'יעל', phone: '050-9998887', tour_slug: 'new-tour' }), { auth: false, headers: { 'x-forwarded-for': '10.3.0.1' } });
  r = await call('GET', '/api/admin/leads?tour=new-tour');
  t('a lead on the new tour is linked to it', r.j.total === 1 && r.j.leads[0].tourName === 'סיור בדיקה חדש');
  tours = (await call('GET', '/api/admin/bundle')).j.tours.map((x) => (x.slug === 'new-tour' ? { ...x, status: 'hidden' } : x.slug === 'teima-mehaifa' ? { ...x, status: 'hidden' } : x));
  await call('PATCH', '/api/admin/draft', { tours }); await call('POST', '/api/admin/publish', { note: 'הסתרת טיולים' });
  t('hidden tour disappears from the list and its page goes down with it', !/סיור בדיקה חדש/.test((await call('GET', '/tours/', null, { auth: false })).text) && (await call('GET', '/tours/teima-mehaifa.html', null, { auth: false })).s === 404);
  t('...but its leads stay', (await call('GET', '/api/admin/leads?tour=new-tour')).j.total === 1);
  tours = (await call('GET', '/api/admin/bundle')).j.tours.map((x) => (x.slug === 'teima-mehaifa' ? { ...x, status: 'published', dates: [{ date: '2099-01-10', time: '17:00', note: 'נפגשים בנמל' }] } : x));
  await call('PATCH', '/api/admin/draft', { tours }); await call('POST', '/api/admin/publish', { note: 'החזרה + מועד' });
  t('restored tour page is back and the upcoming dates API lists its date', (await call('GET', '/tours/teima-mehaifa.html', null, { auth: false })).s === 200 && (await call('GET', '/api/dates', null, { auth: false })).j.dates.some((d) => d.tour_slug === 'teima-mehaifa' && d.date === '2099-01-10'));

  console.log('— SEO and address change');
  r = await call('PATCH', '/api/admin/draft', { pages: { contact: { seo: { path: '/kontakt.html', title: 'יצירת קשר חדש | יוסק׳ה' } } } });
  t('address change saves', r.j.ok);
  r = await call('PATCH', '/api/admin/draft', { pages: { about: { seo: { path: '/kontakt.html' } } } });
  t('collision with another page is refused', r.s === 400 && /כבר בשימוש/.test(r.j.error));
  await call('PATCH', '/api/admin/draft', { pages: { about: { seo: { path: '/about.html' } } } });
  await call('POST', '/api/admin/publish', { note: 'כתובת חדשה לגלריה' });
  r = await call('GET', '/contact.html', null, { auth: false });
  t('old address answers 301 to the new one', r.s === 301 && r.h.get('location') === '/kontakt.html');
  r = await call('GET', '/kontakt.html', null, { auth: false });
  t('new address serves the page with its own title', r.s === 200 && /<title>יצירת קשר חדש/.test(r.text));
  t('internal links point to the new address', /href="\/kontakt\.html"/.test((await call('GET', '/', null, { auth: false })).text) && !/href="\/contact\.html"/.test((await call('GET', '/', null, { auth: false })).text));
  await call('PATCH', '/api/admin/draft', { pages: { contact: { seo: { path: '/contact.html' } } } });
  await call('POST', '/api/admin/publish', { note: 'חזרה לכתובת המקורית' });
  t('moving back removes the redirect (no loop)', (await call('GET', '/contact.html', null, { auth: false })).s === 200 && (await call('GET', '/kontakt.html', null, { auth: false })).s === 301);
  r = await call('GET', '/sitemap.xml', null, { auth: false });
  t('sitemap is closed while the site is closed to Google', r.s === 404 && /Disallow: \//.test((await call('GET', '/robots.txt', null, { auth: false })).text));
  await call('PATCH', '/api/admin/draft', { settings: { indexable: true, siteUrl: 'https://example.test' } });
  await call('POST', '/api/admin/publish', { note: 'פתיחה לגוגל (בדיקה)' });
  r = await call('GET', '/sitemap.xml', null, { auth: false });
  t('sitemap lists public pages only', r.s === 200 && /example\.test\/tours\/haifa-ahuvati\.html/.test(r.text) && !/admin|__preview|new-tour|404|sale/.test(r.text));
  r = await call('GET', '/tours/haifa-ahuvati.html', null, { auth: false });
  t('published title and canonical reach the public HTML', /rel="canonical" href="https:\/\/example\.test\/tours\/haifa-ahuvati\.html"/.test(r.text) && /content="index, follow"/.test(r.text) && /og:image/.test(r.text));

  console.log('— history and restore');
  r = await call('GET', '/api/admin/revisions');
  t('every publish created a revision', r.j.revisions.length >= 6);
  r = await call('POST', '/api/admin/restore', { id: rev1 });
  t('restore of the first revision works', r.j.ok);
  r = await call('GET', '/', null, { auth: false });
  t('restored state is public (abroad is back, the first edit is live)', /id="abroad"/.test(r.text) && /חיפה בדיקה/.test(r.text));

  console.log('— analytics and consent');
  const ev = (b) => call('POST', '/api/event', b, { auth: false });
  const e1 = { c: 1, type: 'pv', eid: 'eid-aaaaaaaa-1', sid: 'sid-aaaaaaaa-1', page: 'index', tour: '', ref: 'www.google.com' };
  await ev(e1); await ev(e1);   // same render twice
  await ev({ ...e1, eid: 'eid-aaaaaaaa-2', page: 'tour-haifa-ahuvati', tour: 'haifa-ahuvati' });
  await ev({ c: 1, type: 'wa', eid: 'eid-aaaaaaaa-3', sid: 'sid-aaaaaaaa-1', page: 'index' });
  await ev({ c: 1, type: 'tel', eid: 'eid-aaaaaaaa-4', sid: 'sid-aaaaaaaa-1', page: 'index' });
  await ev({ c: 0, type: 'pv', eid: 'eid-aaaaaaaa-5', sid: 'sid-bbbbbbbb-1', page: 'index' });   // declined: nothing is stored
  r = await call('GET', '/api/admin/stats');
  t('declined measurement stores nothing', r.j.totals.views === 2, JSON.stringify(r.j.totals));
  t('a repeated render is counted once', r.j.totals.views === 2 && r.j.totals.visits === 1);
  t('phone and WhatsApp clicks are counted', r.j.totals.waClicks === 1 && r.j.totals.telClicks === 1);
  t('source and tour views are reported', r.j.sources[0].k === 'google' && r.j.tours[0].slug === 'haifa-ahuvati');
  t('stats come with leads, reminders and recent leads', r.j.totals.leads >= 2 && r.j.recent.length >= 2 && r.j.reminders.length === 1);
  t('no personal data in events', !JSON.stringify(await (async () => (await import('../api/_lib/store.mjs')).getStore().list('events'))()).match(/דנה|050|http/));

  console.log('— media');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEklEQVR4nGP8z8DwnwEIGBkAAB4OAgUvPJe5AAAAAElFTkSuQmCC', 'base64');
  r = await call('POST', '/api/admin/media', { name: 'בדיקה.png', data: png.toString('base64'), alt: 'תמונת בדיקה' });
  t('image upload is validated by its bytes and sized', r.j.ok && r.j.media.w === 2 && r.j.media.h === 1 && /^\/media\/[a-f0-9]{12}\.png$/.test(r.j.media.url));
  const mediaUrl = r.j.media.url, mediaId = r.j.media.id;
  t('an SVG/HTML file renamed to .png is refused', (await call('POST', '/api/admin/media', { name: 'x.png', data: Buffer.from('<svg onload=alert(1)>').toString('base64') })).s === 415);
  r = await call('GET', mediaUrl, null, { auth: false });
  t('uploaded media is served publicly with a safe type', r.s === 200 && r.h.get('content-type') === 'image/png' && r.h.get('x-content-type-options') === 'nosniff');
  await call('PATCH', '/api/admin/draft', { tours: (await call('GET', '/api/admin/bundle')).j.tours.map((x) => (x.slug === 'haifa-ahuvati' ? { ...x, card: { ...x.card, src: mediaUrl, srcset: '', w: '2', h: '1', alt: 'כיסוי חדש' } } : x)) });
  r = await call('GET', `/api/admin/media/${mediaId}/usage`);
  t('usage shows where the image is used before removal', r.j.usage.some((u) => /חיפה אהובתי/.test(u.where)));
  t('a used image cannot be deleted', (await call('DELETE', `/api/admin/media/${mediaId}`)).s === 409);
  t('the built-in images are listed', (await call('GET', '/api/admin/media')).j.media.filter((m) => m.builtin).length > 50);

  console.log('— forms, settings, integrations');
  t('forms can be switched off from the admin', (await call('PATCH', '/api/admin/draft', { settings: { formsActive: false } })).j.ok);
  await call('POST', '/api/admin/publish', { note: 'כיבוי טפסים' });
  t('a switched-off form answers 410 and saves nothing', (await call('POST', '/api/leads', lp({ client_token: 'sub-cccccccc-0001' }), { auth: false, headers: { 'x-forwarded-for': '10.4.0.1' } })).s === 410);
  await call('PATCH', '/api/admin/draft', { settings: { formsActive: true } }); await call('POST', '/api/admin/publish', { note: 'הפעלת טפסים' });
  r = await call('PATCH', '/api/admin/draft', { settings: { phone: '052-1112233', whatsapp: '972521112233' } });
  await call('POST', '/api/admin/publish', {});
  r = await call('GET', '/', null, { auth: false });
  t('changed phone and WhatsApp number reach every link', /tel:\+972521112233/.test(r.text) && /wa\.me\/972521112233/.test(r.text) && !/972544361667/.test(r.text));
  r = await call('GET', '/api/admin/integrations');
  t('integrations report real states', r.j.integrations.find((i) => i.id === 'db').state === 'dev' && r.j.integrations.find((i) => i.id === 'notify-email').state === 'off');

  console.log('— backup and restore into a scratch store');
  r = await call('POST', '/api/admin/backups');
  t('backup is created', r.j.ok && r.j.backup.counts.leads >= 3 && r.j.backup.counts.revisions >= 6);
  const bk = await call('GET', `/api/admin/backups/${r.j.backup.id}/download`);
  t('backup downloads as JSON', bk.s === 200 && JSON.parse(bk.text).format === 'yoske-backup-1');
  const { restoreInto } = await import('../api/_lib/backup.mjs');
  process.env.CMS_STORE = 'file'; process.env.CMS_DATA_DIR = DIR;
  const { dump } = await import('../api/_lib/backup.mjs');
  const { getStore } = await import('../api/_lib/store.mjs');
  const full = await dump(getStore(), { files: true });
  const scratch = path.join(ROOT, '.data-restore-test'); rmSync(scratch, { recursive: true, force: true });
  process.env.CMS_DATA_DIR = scratch;
  const { resetStore } = await import('../api/_lib/store.mjs'); resetStore();
  await restoreInto(getStore(), full);
  const s2 = getStore();
  const pub = await s2.get('content', 'published');
  const lds = await s2.list('leads');
  const file = await s2.getFile('media', mediaUrl.replace('/media/', ''));
  t('restore: published content is readable', !!pub && JSON.stringify(pub).includes('חיפה בדיקה'));
  t('restore: leads and their notes are back', lds.length >= 3 && lds.some((l) => l.data.name === 'דנה כהן' && l.data.notes.length >= 2));
  t('restore: media files are back and intact', !!file && file.buf.equals(png));
  rmSync(scratch, { recursive: true, force: true });

  let rl = 0; for (let i = 0; i < 8; i++) { const x = await post(lp({ client_token: 'sub-rate-0000' + i, name: 'ספאמר', phone: '050-0000000' }), { 'x-forwarded-for': '10.9.9.9' }); if (x.s === 429) rl++; }
  t('rate limit kicks in', rl > 0 && rl < 8);
  console.log('— logout and expiry');
  r = await call('POST', '/api/admin/logout');
  t('logout works', r.j.ok);
  t('after logout the session is dead', (await call('GET', '/api/admin/leads')).s === 401);
} finally {
  srv.kill();
  rmSync(DIR, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
