// הגדרות אתר: contact details, logo, menu, cookie notice, opening the site to search engines, and a SEO overview of every page.
import { h, icon, toast, pickMedia, clone, api } from './ui.js';
import { S, setSetting, touch, saveDraft, onChange, seoOf, pathOf } from './state.js';
import { publishFlow } from './app.js';

export async function render(root) {
  const s = S.settings;
  const status = h('span', { class: 'savebar__st', role: 'status' }, h('i'), h('span'));
  const paintSt = () => { status.className = 'savebar__st ' + (S.unsaved ? 'is-dirty' : 'is-saved'); status.lastChild.textContent = S.unsaved ? 'יש שינויים שלא נשמרו' : S.status?.dirty ? 'נשמר כטיוטה, עוד לא פורסם' : 'הכול מפורסם'; };
  const save = h('button', { class: 'btn', type: 'button', onclick: async () => { save.setAttribute('aria-busy', 'true'); try { await saveDraft(); toast('הטיוטה נשמרה'); } catch (e) { toast(e.message, 'err'); } finally { save.removeAttribute('aria-busy'); paintSt(); } } }, icon('save'), 'שמור טיוטה');
  const off = onChange(paintSt); paintSt();
  const fld = (label, el, hint) => h('div', { class: 'fld' }, h('label', { text: label }), el, hint ? h('span', { class: 'hint', text: hint }) : null);
  const text = (k, o = {}) => { const el = o.area ? h('textarea', { rows: String(o.rows || 3) }) : h('input', { type: o.type || 'text' }); el.value = s[k] || ''; if (o.dir) { el.dir = 'ltr'; el.classList.add('ltr'); } if (o.ph) el.placeholder = o.ph; el.addEventListener('input', () => setSetting(k, el.value)); return el; };
  const ck = (k, o = {}) => { const el = o.area ? h('textarea', { rows: '4' }) : h('input', { type: 'text' }); el.value = s.cookies?.[k] || ''; el.addEventListener('input', () => setCookie(k, el.value)); if (o.dir) { el.dir = 'ltr'; el.classList.add('ltr'); } return el; };
  const logo = (k, label, dark) => {
    const img = h('img', { src: s[k] || '', alt: '', style: 'max-width:180px;max-height:70px;object-fit:contain' });
    return fld(label, h('div', { style: `display:flex;gap:12px;align-items:center;padding:10px;border-radius:12px;background:${dark ? '#2A3A5C' : '#fff'};border:1px solid var(--line)` }, img, h('button', { class: 'btn btn--sm', type: 'button', onclick: async () => { const m = await pickMedia({ current: s[k] }); if (m) { setSetting(k, m.url); img.src = m.url; } } }, icon('image'), 'החלפה')));
  };
  const idx = h('input', { type: 'checkbox', checked: !!s.indexable }); idx.addEventListener('change', () => setSetting('indexable', idx.checked));
  const seoRows = Object.keys(S.schema.pages).filter((p) => !['tour'].includes(p)).map((p) => { const seo = seoOf(p); const bad = !seo.title || !seo.description || seo.description.length > 170 || seo.title.length > 65;
    return h('a', { class: 'rowlink', href: `#/pages/${p}?tab=seo` }, h('div', { class: 'rowlink__t' }, h('b', { text: S.schema.pages[p].label }), h('span', { text: seo.title || '(חסרה כותרת)' })), h('span', { class: 'ltr count', text: pathOf(p) }), bad ? h('span', { class: 'tag tag--warn', text: 'לבדוק' }) : h('span', { class: 'tag tag--new', text: 'תקין' })); });

  // 19.11.2026: personal sign-in code (instead of mail + password)
  const codeCard = () => {
    const box = h('section', { class: 'glass card codebox', id: 'code' });
    const paint = () => {
      const on = !!S.me?.hasCode;
      const a = h('input', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '12', autocomplete: 'new-password', dir: 'ltr', 'aria-label': 'קוד חדש' });
      const b = h('input', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '12', autocomplete: 'new-password', dir: 'ltr', 'aria-label': 'הקוד שוב' });
      const err = h('p', { class: 'fld__err', role: 'alert', hidden: true });
      const fail = (m) => { err.textContent = m; err.hidden = false; };
      const saveCode = h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => {
        err.hidden = true;
        if (!/^\d{6,12}$/.test(a.value)) return fail('הקוד צריך להיות 6 עד 12 ספרות.');
        if (a.value !== b.value) return fail('שני הקודים לא זהים.');
        saveCode.setAttribute('aria-busy', 'true');
        try { await api('POST', '/api/admin/code', { code: a.value }); S.me = { ...(S.me || {}), hasCode: true }; toast('הקוד נשמר. מעכשיו אפשר להיכנס איתו.'); paint(); }
        catch (e) { fail(e.message); } finally { saveCode.removeAttribute('aria-busy'); }
      } }, icon('save'), on ? 'החלפת הקוד' : 'שמירת הקוד');
      const offBtn = on ? h('button', { class: 'btn btn--ghost', type: 'button', onclick: async () => {
        try { await api('POST', '/api/admin/code', { code: null }); S.me = { ...(S.me || {}), hasCode: false }; toast('הכניסה עם קוד כובתה.'); paint(); } catch (e) { fail(e.message); }
      } }, 'כיבוי הכניסה עם קוד') : null;
      box.replaceChildren(h('h2', { class: 'card__h', text: 'כניסה עם קוד אישי' }),
        h('div', { class: on ? 'notice notice--ok' : 'notice' }, h('strong', { text: on ? 'הכניסה עם קוד פעילה.' : 'אפשר להיכנס למערכת עם קוד של ספרות, במקום מייל וסיסמה.' }),
          h('p', { text: 'בחרו קוד של 6 עד 12 ספרות שרק אתם יודעים (לא תאריך לידה ולא רצף). המייל והסיסמה ממשיכים לעבוד גם הם. אחרי כמה ניסיונות שגויים הכניסה עם קוד ננעלת לזמן מה.' })),
        h('div', { class: 'codebox__row' }, fld(on ? 'קוד חדש' : 'קוד', a), fld('הקוד שוב', b)), err,
        h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, saveCode, offBtn));
    };
    paint();
    return box;
  };

  if (location.hash.includes('code')) setTimeout(() => document.getElementById('code')?.scrollIntoView({ block: 'start' }), 50);
  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'הגדרות אתר' })),
    h('div', { class: 'savebar glass shellglass' }, status, h('span', { class: 'savebar__sp' }), save, h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { await publishFlow(); paintSt(); } }, icon('send'), 'פרסום לאתר')),
    h('div', { class: 'grid grid--2', style: 'align-items:start' },
      h('div', { style: 'display:grid;gap:20px' },
        codeCard(),
        h('section', { class: 'glass card', style: 'display:grid;gap:14px' }, h('h2', { class: 'card__h', text: 'העסק ויצירת קשר' }),
          fld('שם העסק', text('siteName')), h('div', { class: 'grid grid--2' }, fld('טלפון (להצגה ולחיוג)', text('phone', { dir: true, type: 'tel' })), fld('מספר וואטסאפ', text('whatsapp', { dir: true }), 'בפורמט בינלאומי, למשל 972501234567.')),
          fld('הודעת הפתיחה בוואטסאפ', text('waText', { area: true }), 'הטקסט שמוכן מראש כשגולש לוחץ על וואטסאפ.'), fld('מייל', text('email', { dir: true, type: 'email' })),
          h('div', { class: 'grid grid--2' }, fld('עמוד פייסבוק', text('facebook', { dir: true })), fld('אינסטגרם', text('instagram', { dir: true, ph: 'https://instagram.com/…' })))),
        h('section', { class: 'glass card', style: 'display:grid;gap:14px' }, h('h2', { class: 'card__h', text: 'לוגו' }), logo('logo', 'לוגו בראש האתר', false), logo('logoDark', 'לוגו על רקע כהה (פוטר)', true)),
        h('section', { class: 'glass card', style: 'display:grid;gap:12px' }, h('h2', { class: 'card__h', text: 'תפריט, כותרת עליונה ופוטר' }), h('p', { class: 'count', text: 'קישורי התפריט, כפתורי הכותרת העליונה וטקסט הפוטר הם תוכן משותף לכל הדפים, ונערכים כמו כל סקשן.' }), h('a', { class: 'btn btn--sm', style: 'justify-self:start', href: '#/pages/shared' }, 'עריכת תפריט ופוטר'))),
      h('div', { style: 'display:grid;gap:20px' },
        h('section', { class: 'glass card', style: 'display:grid;gap:10px' }, h('h2', { class: 'card__h', text: 'עוגיות ומדידה' }), h('p', { class: 'count', text: 'הגולש בוחר באתר אם לאשר מדידה אנונימית (חלון ״העדפות עוגיות״ בפוטר), ויכול לשנות את הבחירה. הטפסים עובדים בכל מקרה. הטקסטים של ההודעה כתובים בקובץ prefs.js ולא נערכים מכאן בגרסה הנוכחית.' }), h('a', { class: 'btn btn--sm', style: 'justify-self:start', href: '/privacy.html#cookies', target: '_blank', rel: 'noopener' }, 'למדיניות הפרטיות')),
        h('section', { class: 'glass card', style: 'display:grid;gap:14px' }, h('h2', { class: 'card__h', text: 'חיפוש בגוגל' }),
          h('label', { class: 'switch' }, idx, h('span', { class: 'switch__t' }), 'האתר פתוח לגוגל (מפת אתר ו-robots פעילים)'),
          h('div', { class: s.indexable ? 'notice notice--ok' : 'notice notice--warn' }, h('strong', { text: s.indexable ? 'האתר יתפרסם לגוגל אחרי הפרסום.' : 'האתר סגור לגוגל (noindex). מומלץ להשאיר כך עד ההשקה.' })),
          fld('כתובת האתר המלאה', text('siteUrl', { dir: true, ph: 'https://…' }), 'נדרשת לפתיחה לגוגל, לקישור canonical ולמפת האתר.'),
          fld('תמונת שיתוף כללית', (() => { const im = h('img', { src: s.ogImage || '', alt: '', style: 'max-width:240px;border-radius:10px' }); return h('div', { style: 'display:grid;gap:8px;justify-items:start' }, im, h('button', { class: 'btn btn--sm', type: 'button', onclick: async () => { const m = await pickMedia({ current: s.ogImage }); if (m) { setSetting('ogImage', m.url); im.src = m.url; } } }, icon('image'), 'החלפה')); })())),
        h('section', { class: 'glass card' }, h('h2', { class: 'card__h', text: 'SEO בכל הדפים' }), h('div', { class: 'rows' }, seoRows)))));
  return off;
}
