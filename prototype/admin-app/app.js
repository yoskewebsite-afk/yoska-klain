// Admin shell: navigation, display modes, unsaved-changes guard, publish and history dialogs.
import { h, $, $$, icon, api, setCsrf, toast, dialog, confirmDialog, drawer, fmtDateTime } from './ui.js';
import { S, load, saveDraft, changes, onChange, refreshBadge } from './state.js';
import { initNotify, installFlow } from './notify.js';

const NAV = [
  ['dashboard', 'ראשי', 'home'], ['leads', 'פניות', 'inbox'], ['pages', 'דפים וסקשנים', 'file'], ['tours', 'טיולים', 'route'],
  ['forms', 'טפסים', 'form'], ['media', 'ספריית מדיה', 'image'], ['settings', 'הגדרות אתר', 'gear'], ['integrations', 'חיבורים', 'plug'],
];
const THEMES = [['light', 'בהיר', 'sun'], ['dark', 'כהה', 'moon'], ['glass', 'Liquid Glass', 'glass']];
const VIEWS = {
  dashboard: () => import('./v-dashboard.js'), leads: () => import('./v-leads.js'), pages: () => import('./v-pages.js'), tours: () => import('./v-tours.js'),
  forms: () => import('./v-forms.js'), media: () => import('./v-media.js'), settings: () => import('./v-settings.js'), integrations: () => import('./v-integrations.js'),
};

const root = $('#app');
let main, cleanup = null, me = null, current = 'dashboard', navTimer = 0;
export const theme = () => document.documentElement.dataset.theme;
export function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('yoske-admin-theme', t); } catch { /* mode lasts for this visit */ } $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeSet === t))); }

// ------------------------------------------------------------ route
export function parse() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  return { view: parts[0] || 'dashboard', a: parts[1], b: parts[2], q: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export const go = (hash) => { location.hash = hash; };
let prevHash = location.hash, ignore = false;
window.addEventListener('hashchange', async () => {
  if (ignore) { ignore = false; return; }
  if (S.unsaved && parse().view !== undefined && !S.bypass) {
    const target = location.hash;
    ignore = true; location.hash = prevHash;
    const c = await unsavedDialog();
    if (c === 'cancel') return;
    if (c === 'save') { try { await saveDraft(); } catch (e) { toast(e.message, 'err'); return; } } else { await load(); }
    ignore = true; location.hash = target; prevHash = target; route(); return;
  }
  prevHash = location.hash; route(); initNotify();
});
export const unsavedDialog = () => dialog({ title: 'יש שינויים שלא נשמרו', body: h('p', { text: 'לשמור אותם כטיוטה לפני שממשיכים? טיוטה לא מופיעה באתר עד הפרסום.' }),
  actions: [{ label: 'ביטול', value: 'cancel' }, { label: 'צא בלי לשמור', value: 'discard', cls: 'btn--danger' }, { label: 'שמור טיוטה והמשך', value: 'save', cls: 'btn--primary', focus: true }] }).then((v) => v || 'cancel');
addEventListener('beforeunload', (e) => { if (S.unsaved) { e.preventDefault(); e.returnValue = ''; } });

async function route() {
  const p = parse();
  const def = NAV.find((n) => n[0] === p.view) || NAV[0];
  current = def[0];
  cleanup && cleanup(); cleanup = null;
  $$('.nav a, .bottom a').forEach((a) => (a.dataset.v === current ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('.top__crumb').textContent = def[1];
  document.title = `${def[1]} | ניהול יוסק׳ה`;
  main.replaceChildren(h('div', { class: 'skeleton', style: 'height:48px;width:240px;margin-bottom:20px' }), h('div', { class: 'skeleton', style: 'height:220px' }));
  try {
    const mod = await VIEWS[current]();
    main.replaceChildren();
    cleanup = (await mod.render(main, p)) || null;
    if (!p.keepScroll) scrollTo(0, 0);
  } catch (e) {
    if (e.status === 401) return;
    main.replaceChildren(h('div', { class: 'notice notice--danger' }, h('strong', { text: 'לא הצלחנו לטעון את המסך' }), h('p', { text: e.message }), h('button', { class: 'btn', type: 'button', onclick: route }, 'ניסיון חוזר')));
  }
  refreshBadge();
}
export const rerender = () => route();

// ------------------------------------------------------------ publish + history
export async function publishFlow() {
  if (S.unsaved) { try { await saveDraft(); } catch (e) { toast(e.message, 'err'); return false; } }
  const list = changes();
  const warn = (S.report || []).filter((r) => r.level !== 'info');
  const errors = warn.filter((r) => r.level === 'error');
  const note = h('input', { type: 'text', placeholder: 'למשל: עדכון מחירים (לא חובה)', maxlength: '200', 'aria-label': 'הערה לגרסה' });
  const body = h('div', { style: 'display:grid;gap:14px' },
    list.length ? h('div', {}, h('p', { style: 'font-weight:700;margin-bottom:6px', text: 'מה יתעדכן באתר:' }), h('ul', { class: 'changes' }, list.map((c) => h('li', {}, h('b', { text: c.what }), h('span', { class: 'count', text: ' — ' + c.where }))))) : h('p', { text: 'אין הבדלים מהגרסה שפורסמה. אפשר לפרסם שוב בכל זאת.' }),
    warn.length ? h('div', { class: 'notice notice--warn' }, h('strong', { text: errors.length ? 'צריך לתקן לפני פרסום:' : 'כדאי לבדוק:' }), h('ul', { class: 'deps' }, warn.map((r) => h('li', {}, `${r.where}: ${r.msg}`)))) : null,
    h('div', { class: 'fld' }, h('label', { text: 'הערה לגרסה' }), note),
    h('p', { class: 'count', text: 'הפרסום מתבצע כפעולה אחת. אם משהו נכשל, האתר נשאר כמו שהיה, ותמיד אפשר לשחזר גרסה קודמת מההיסטוריה.' }));
  const ok = await dialog({ title: 'פרסום לאתר', body, actions: [{ label: 'ביטול', value: false }, { label: 'פרסום לאתר', cls: 'btn--primary', value: true, focus: true }] });
  if (!ok) return false;
  try {
    const r = await api('POST', '/api/admin/publish', { note: note.value });
    S.status = r.status; S.published = JSON.parse(JSON.stringify(S.draft)); toast('פורסם. השינויים יופיעו באתר תוך כחצי דקה.'); renderTop(); return true;
  } catch (e) { toast(e.message, 'err'); return false; }
}
export async function historyFlow() {
  let revs;
  try { revs = (await api('GET', '/api/admin/revisions')).revisions; } catch (e) { return toast(e.message, 'err'); }
  const body = revs.length ? h('div', { class: 'rows', style: 'max-height:52dvh;overflow:auto' }, revs.map((r, i) => h('div', { class: 'rowlink', style: 'cursor:default' },
    h('div', { class: 'rowlink__t' }, h('b', { text: fmtDateTime(r.at) + (i === 0 ? ' (הגרסה החיה)' : '') }), h('span', { text: `${r.by}${r.note ? ' · ' + r.note : ''}` })),
    i ? h('button', { class: 'btn btn--sm', type: 'button', onclick: async (ev) => {
      if (!(await confirmDialog({ title: 'שחזור גרסה', text: `לשחזר את הגרסה מ-${fmtDateTime(r.at)} ולפרסם אותה עכשיו? הגרסה הנוכחית נשמרת בהיסטוריה.`, confirm: 'שחזור ופרסום' }))) return;
      ev.target.setAttribute('aria-busy', 'true');
      try { await api('POST', '/api/admin/restore', { id: r.id }); await load(); toast('הגרסה שוחזרה ופורסמה.'); document.querySelector('.dlg .btn')?.click(); rerender(); renderTop(); } catch (e) { toast(e.message, 'err'); ev.target.removeAttribute('aria-busy'); }
    } }, icon('history'), 'שחזור') : null))) : h('div', { class: 'empty' }, h('b', { text: 'עדיין לא פורסמו גרסאות' }), 'אחרי הפרסום הראשון תופיע כאן ההיסטוריה.');
  dialog({ title: 'היסטוריית פרסומים', body, actions: [{ label: 'סגירה', value: true, focus: true }] });
}

// ------------------------------------------------------------ shell
function modeSeg() {
  return h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'מצב תצוגה' }, THEMES.map(([k, l, ic]) => h('button', { class: 'seg__b', type: 'button', role: 'radio', 'data-theme-set': k, 'aria-checked': String(theme() === k), onclick: () => setTheme(k) }, icon(ic), l)));
}
function modeSheet() {
  const box = h('div', { class: 'dlg__box', style: 'gap:8px' }, h('h2', { text: 'מצב תצוגה' }), ...THEMES.map(([k, l, ic]) => h('button', { class: 'seg__b', type: 'button', role: 'radio', 'aria-checked': String(theme() === k), style: 'min-height:48px;justify-content:flex-start;width:100%', onclick: () => { setTheme(k); close(); } }, icon(ic), l)));
  const scrim = h('div', { class: 'scrim' }), wrap = h('div', { class: 'dlg sheet' }, box);
  document.body.append(scrim, wrap); requestAnimationFrame(() => { scrim.classList.add('on'); box.classList.add('on'); });
  const close = () => { scrim.remove(); wrap.remove(); };
  scrim.addEventListener('click', close); wrap.addEventListener('keydown', (e) => e.key === 'Escape' && close()); $('button', box.querySelector('button') ? box : wrap).focus();
}
function moreSheet() {
  const items = NAV.filter((n) => !['dashboard', 'leads', 'pages', 'tours'].includes(n[0]));
  const box = h('div', { class: 'dlg__box', style: 'gap:6px' }, h('h2', { text: 'עוד' }),
    ...items.map(([k, l, ic]) => h('a', { class: 'seg__b', href: '#/' + k, style: 'min-height:48px;width:100%;border-radius:12px;text-decoration:none;color:var(--text)', onclick: () => close() }, icon(ic), l)),
    h('button', { class: 'seg__b', type: 'button', style: 'min-height:48px;width:100%;justify-content:flex-start', onclick: () => { close(); modeSheet(); } }, icon('glass'), 'מצב תצוגה'),
    h('button', { class: 'seg__b', type: 'button', style: 'min-height:48px;width:100%;justify-content:flex-start', onclick: () => { close(); installFlow(); } }, icon('inbox'), 'אפליקציה והתראות'),
    h('button', { class: 'seg__b', type: 'button', style: 'min-height:48px;width:100%;justify-content:flex-start', onclick: () => { close(); historyFlow(); } }, icon('history'), 'היסטוריית פרסומים'),
    h('button', { class: 'seg__b', type: 'button', style: 'min-height:48px;width:100%;justify-content:flex-start', onclick: logout }, icon('logout'), 'יציאה'));
  const scrim = h('div', { class: 'scrim' }), wrap = h('div', { class: 'dlg sheet' }, box);
  document.body.append(scrim, wrap); requestAnimationFrame(() => { scrim.classList.add('on'); box.classList.add('on'); });
  const close = () => { scrim.remove(); wrap.remove(); };
  scrim.addEventListener('click', close); wrap.addEventListener('keydown', (e) => e.key === 'Escape' && close()); box.querySelector('a').focus();
}
async function logout() { try { await api('POST', '/api/admin/logout', {}); } catch { /* leaving anyway */ } location.href = '/admin'; }

function renderTop() {
  const dirty = S.unsaved || S.status?.dirty;
  const slot = $('.top__act'); if (!slot) return;
  slot.replaceChildren(
    h('span', { class: 'tag ' + (dirty ? 'tag--warn' : 'tag--mute'), text: S.unsaved ? 'שינויים שלא נשמרו' : dirty ? 'טיוטה לא מפורסמת' : 'מפורסם' }),
    h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: publishFlow }, icon('send'), h('span', { class: 'pubtxt', text: 'פרסום לאתר' })));
  const b = $('.nav a[data-v="leads"] .badge'); if (b) { b.textContent = S.newLeads; b.hidden = !S.newLeads; }
  const b2 = $('.bottom a[data-v="leads"] .badge'); if (b2) { b2.textContent = S.newLeads; b2.hidden = !S.newLeads; }
}

function buildShell() {
  root.className = 'app'; root.removeAttribute('aria-busy');
  const link = ([k, l, ic]) => h('a', { href: '#/' + k, 'data-v': k }, icon(ic), l, k === 'leads' ? h('span', { class: 'badge', hidden: true }) : null);
  const side = h('aside', { class: 'side shellglass' },
    h('a', { class: 'side__brand', href: '#/dashboard' }, h('img', { src: '/assets/brand/symbol.svg', alt: '' }), h('div', {}, h('b', { text: 'יוסק׳ה' }), h('span', { text: 'ניהול האתר' }))),
    h('nav', { class: 'nav', 'aria-label': 'ניווט ראשי' }, NAV.map(link)),
    h('div', { class: 'side__user' }, h('b', { text: me.name || 'מנהל' }), h('span', { class: 'ltr', text: me.email }),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: historyFlow }, icon('history'), 'היסטוריה'), h('button', { class: 'btn btn--sm', type: 'button', onclick: logout }, icon('logout'), 'יציאה')),
      h('button', { class: 'btn btn--sm', type: 'button', onclick: installFlow }, icon('inbox'), 'אפליקציה והתראות'),
      h('a', { class: 'btn btn--sm', href: '/', target: '_blank', rel: 'noopener' }, icon('arrowout'), 'לאתר החי')));
  const top = h('header', { class: 'top shellglass' }, h('span', { class: 'top__crumb' }), h('span', { class: 'top__sp' }), h('div', { class: 'top__act', style: 'display:flex;gap:10px;align-items:center' }), modeSeg(),
    h('button', { class: 'btn btn--icon modebtn', type: 'button', 'aria-label': 'מצב תצוגה', onclick: modeSheet }, icon('glass')));
  main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
  const bottomItems = [['dashboard', 'ראשי', 'home'], ['leads', 'פניות', 'inbox'], ['pages', 'תוכן', 'file'], ['tours', 'טיולים', 'route']];
  const bottom = h('nav', { class: 'bottom shellglass', 'aria-label': 'ניווט תחתון' }, bottomItems.map(link), h('button', { type: 'button', onclick: moreSheet }, icon('more'), 'עוד'));
  root.replaceChildren(side, top, main, bottom);
  onChange(renderTop); renderTop();
}

async function boot() {
  try {
    // the bundle carries the signed-in user too (one request instead of two in a row); the first view's code loads meanwhile
    VIEWS[parse().view]?.().catch(() => {});
    await load();
    const j = S.me || await api('GET', '/api/admin/me'); me = j.user; setCsrf(j.csrf);
  } catch (e) { if (e.status === 401) return (location.href = '/admin'); root.replaceChildren(h('div', { class: 'boot' }, h('div', { class: 'notice notice--danger' }, h('strong', { text: 'מערכת הניהול לא נטענה' }), h('p', { text: e.message })))); return; }
  buildShell();
  document.addEventListener('admin:expired', () => { dialog({ title: 'ההתחברות פגה', body: h('p', { text: 'מטעמי אבטחה צריך להתחבר מחדש. השינויים שלא נשמרו עדיין פתוחים בדף הזה: אחרי הכניסה אפשר לחזור אליהם בלשונית אחרת, או לשמור קודם.' }), actions: [{ label: 'כניסה מחדש', cls: 'btn--primary', value: 1, focus: true }] }).then(() => window.open('/admin', '_blank')); });
  prevHash = location.hash; route(); initNotify();
}
boot();
