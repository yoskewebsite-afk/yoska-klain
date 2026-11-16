// טפסים: the site's lead forms (every form saves to the CRM), where they send notifications, counts per kind, export by date range.
import { h, icon, api, toast, fmtDate } from './ui.js';
import { S, setSetting, saveDraft, onChange } from './state.js';
import { publishFlow } from './app.js';

const KINDS = [['general', 'פנייה כללית (דף הבית, יצירת קשר)'], ['family', 'משפחה וחברים'], ['org', 'חברה או ארגון'], ['tour', 'סיור מסוים (עמודי הטיולים)'], ['date', 'מועד מהלוח'], ['private', 'קבוצה פרטית'], ['quiz', 'שאלון ההתאמה']];

export async function render(root) {
  let stats = {};
  try { stats = (await api('GET', '/api/admin/forms/stats')).forms; } catch { /* counts optional */ }
  const s = S.settings;
  const status = h('span', { class: 'savebar__st', role: 'status' }, h('i'), h('span'));
  const paintSt = () => { status.className = 'savebar__st ' + (S.unsaved ? 'is-dirty' : 'is-saved'); status.lastChild.textContent = S.unsaved ? 'יש שינויים שלא נשמרו' : S.status?.dirty ? 'נשמר כטיוטה, עוד לא פורסם' : 'הכול מפורסם'; };
  const save = h('button', { class: 'btn', type: 'button', onclick: async () => { save.setAttribute('aria-busy', 'true'); try { await saveDraft(); toast('הטיוטה נשמרה'); } catch (e) { toast(e.message, 'err'); } finally { save.removeAttribute('aria-busy'); paintSt(); } } }, icon('save'), 'שמור טיוטה');
  const off = onChange(paintSt); paintSt();
  const email = h('input', { type: 'text', dir: 'ltr', class: 'ltr', value: s.notifyEmail || '', placeholder: 'name@example.com', oninput: (e) => setSetting('notifyEmail', e.target.value), 'aria-label': 'כתובות להתראה' });
  const active = h('input', { type: 'checkbox', checked: s.formsActive !== false }); active.addEventListener('change', () => setSetting('formsActive', active.checked));
  const from = h('input', { type: 'date', 'aria-label': 'מתאריך' }), to = h('input', { type: 'date', 'aria-label': 'עד תאריך' });
  const exp = h('a', { class: 'btn', href: '#', onclick: (e) => { const p = new URLSearchParams({ status: 'all', ...(from.value ? { from: from.value } : {}), ...(to.value ? { to: to.value } : {}) }); e.currentTarget.href = '/api/admin/leads.csv?' + p; } }, icon('download'), 'ייצוא פניות לאקסל');
  const total = Object.values(stats).reduce((n, x) => n + x.total - x.spam, 0);
  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'טפסים' })),
    h('div', { class: 'savebar glass shellglass' }, status, h('span', { class: 'savebar__sp' }), save, h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { await publishFlow(); paintSt(); } }, icon('send'), 'פרסום לאתר')),
    h('div', { class: 'grid grid--main' },
      h('section', { class: 'glass card' }, h('h2', { class: 'card__h' }, 'הטפסים באתר', h('small', { text: `${total} פניות בסך הכול` })),
        h('p', { class: 'count', style: 'margin-bottom:10px', text: 'כל טפסי האתר שומרים את הפנייה ב-CRM לפני שמוצגת הודעת ההצלחה. סוג הפנייה נקבע לפי הטופס או הכפתור שממנו הגיעו. השדות והטקסטים בתוך הטפסים הם חלק מקוד האתר, ואת הכותרות והטקסטים שסביבם עורכים בעורך הדפים.' }),
        h('div', { class: 'rows' }, KINDS.map(([k, l]) => { const st = stats[k] || { total: 0, spam: 0, last: '' }; return h('a', { class: 'rowlink', href: '#/leads?form=' + k }, h('div', { class: 'rowlink__t' }, h('b', { text: l }), h('span', { text: st.last ? 'אחרונה: ' + fmtDate(st.last) : 'עדיין לא התקבלו פניות' })), h('span', { class: 'tag tag--new', text: String(st.total - st.spam) }), icon('left')); }))),
      h('div', { style: 'display:grid;gap:20px;align-content:start' },
        h('section', { class: 'glass card', style: 'display:grid;gap:14px' }, h('h2', { class: 'card__h', text: 'הגדרות' }), h('label', { class: 'switch' }, active, h('span', { class: 'switch__t' }), 'הטפסים פעילים באתר'),
          h('div', { class: 'fld' }, h('label', { text: 'לאן נשלחת התראה במייל על פנייה חדשה' }), email, h('span', { class: 'hint', text: 'כמה כתובות מופרדות בפסיק. דורש חיבור Resend (מסך חיבורים). בלי זה הפנייה נשמרת ונראית ב-CRM.' }))),
        h('section', { class: 'glass card', style: 'display:grid;gap:10px' }, h('h2', { class: 'card__h', text: 'ייצוא לפי טווח תאריכים' }), h('div', { class: 'grid grid--2', style: 'gap:8px' }, from, to), exp))));
  return off;
}
