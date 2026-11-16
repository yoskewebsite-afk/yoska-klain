import { h, icon, api, chart, statusTag, fmtDateTime, toast } from './ui.js';
import { go } from './app.js';

const SRC = { google: 'גוגל', facebook: 'פייסבוק', instagram: 'אינסטגרם', whatsapp: 'וואטסאפ', search: 'מנועי חיפוש אחרים', social: 'רשתות אחרות', other: 'אתרים אחרים', direct: 'כניסה ישירה' };
const iso = (d) => d.toISOString().slice(0, 10);
const RANGES = [['7', '7 ימים'], ['30', '30 יום'], ['90', '90 יום']];
let range = { days: '30', from: '', to: '' }, bucket = 'day';

export async function render(root) {
  const head = h('div', { class: 'pagehead' }, h('h1', { text: 'ראשי' }), h('span', { class: 'pagehead__sp' }));
  const rangeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'טווח תאריכים' }, RANGES.map(([k, l]) => h('button', { class: 'seg__b', type: 'button', 'aria-pressed': String(range.days === k), onclick: () => { range = { days: k, from: '', to: '' }; load(); } }, l)));
  const from = h('input', { type: 'date', 'aria-label': 'מתאריך', value: range.from, onchange: () => { range.days = ''; range.from = from.value; range.to = to.value || iso(new Date()); load(); } });
  const to = h('input', { type: 'date', 'aria-label': 'עד תאריך', value: range.to, onchange: () => { range.days = ''; range.from = from.value || range.from; range.to = to.value; load(); } });
  const bseg = h('div', { class: 'seg', role: 'group', 'aria-label': 'קיבוץ' }, [['day', 'לפי יום'], ['week', 'לפי שבוע']].map(([k, l]) => h('button', { class: 'seg__b', type: 'button', 'aria-pressed': String(bucket === k), onclick: () => { bucket = k; load(); } }, l)));
  // phones: the custom from/to range folds away (the 7/30/90 buttons cover the everyday case) so the numbers start on the first screen
  const custom = h('details', { class: 'filters filters--range' }, h('summary', { class: 'filters__s' }, icon('clock'), h('span', { text: 'טווח תאריכים אחר' })),
    h('div', { class: 'filters__b' }, h('span', { class: 'count filters__or', text: 'או' }), h('div', { class: 'filters__dates' }, from, h('span', { class: 'count', text: 'עד' }), to)));
  const wide = matchMedia('(min-width: 961px)'); custom.open = wide.matches || !!range.from; wide.addEventListener('change', () => { custom.open = wide.matches || !!range.from; });
  const toolbar = h('div', { class: 'toolbar' }, rangeSeg, custom, h('span', { class: 'pagehead__sp' }), bseg);
  const body = h('div', { style: 'display:grid;gap:20px' });
  root.append(head, toolbar, body);

  async function load() {
    $$all(rangeSeg).forEach((b, i) => b.setAttribute('aria-pressed', String(range.days === RANGES[i][0])));
    $$all(bseg).forEach((b, i) => b.setAttribute('aria-pressed', String(bucket === ['day', 'week'][i])));
    body.replaceChildren(h('div', { class: 'grid grid--4' }, [0, 1, 2, 3].map(() => h('div', { class: 'glass metric' }, h('div', { class: 'skeleton', style: 'height:16px;width:60%' }), h('div', { class: 'skeleton', style: 'height:36px;width:40%' })))), h('div', { class: 'glass skeleton', style: 'height:320px' }));
    const to_ = range.days ? iso(new Date()) : range.to, from_ = range.days ? iso(new Date(Date.now() - (+range.days - 1) * 86400e3)) : range.from;
    if (from_ > to_) { body.replaceChildren(h('div', { class: 'notice notice--warn', text: 'תאריך ההתחלה מאוחר מתאריך הסיום.' })); return; }
    let d;
    try { d = await api('GET', `/api/admin/stats?from=${from_}&to=${to_}&bucket=${bucket}`); } catch (e) { body.replaceChildren(h('div', { class: 'notice notice--danger' }, e.message, ' ', h('button', { class: 'btn btn--sm', type: 'button', onclick: load }, 'ניסיון חוזר'))); return; }
    const t = d.totals, has = d.hasData;
    const metric = (l, n, sub, empty, ic, hero, key) => h('div', { class: 'glass metric' + (hero ? ' metric--hero' : '') }, h('div', { class: 'metric__top' }, h('span', { class: 'metric__l', text: l }), h('span', { class: 'metric__ic' }, icon(ic))), h('span', { class: 'metric__n' + (empty ? ' is-empty' : ''), text: empty ? '—' : n.toLocaleString('he-IL') }), h('span', { class: 'metric__s', text: sub }), key && d.series.length > 1 && !empty ? spark(d.series.map((x) => x[key] || 0)) : null);
    const leadsLink = (hash, label, ic) => h('a', { class: 'btn btn--sm', href: hash }, icon(ic), label);
    body.replaceChildren(
      h('div', { class: 'grid grid--4' },
        metric('ביקורים באתר', t.visits, has ? `${t.views.toLocaleString('he-IL')} צפיות בעמודים` : 'עדיין לא נאספו נתוני מדידה', !has, 'eye', true, 'visits'),
        metric('פניות חדשות', t.leads, 'התקבלו בטווח שנבחר', false, 'inbox', false, 'leads'),
        metric('פניות שמחכות לטיפול', t.pending, 'חדשה, נוצר קשר או ממתינה', false, 'clock'),
        metric('טיולים שנסגרו', t.won, 'לפי סטטוס ״נסגר טיול״ ב-CRM', false, 'check')),
      h('div', { class: 'grid grid--main' },
        h('section', { class: 'glass card', 'aria-labelledby': 'cv' }, h('h2', { id: 'cv', class: 'card__h' }, 'ביקורים וצפיות', h('small', { text: 'מבקרים שאישרו מדידה' })),
          has ? chart({ data: d.series, series: [{ k: 'visits', label: 'ביקורים' }, { k: 'views', label: 'צפיות בעמודים' }], ariaLabel: 'גרף ביקורים וצפיות בעמודים לפי ' + (bucket === 'week' ? 'שבוע' : 'יום') })
            : h('div', { class: 'empty' }, h('b', { text: 'עדיין אין נתונים להצגה' }), 'המדידה היא אנונימית ואופציונלית: היא מתחילה להצטבר כשמבקרים מאשרים אותה בהודעה באתר. הפניות מהטופס נספרות תמיד.')),
        h('section', { class: 'glass card', 'aria-labelledby': 'cl' }, h('h2', { id: 'cl', class: 'card__h' }, 'פניות', h('small', { text: 'לפי ' + (bucket === 'week' ? 'שבוע' : 'יום') })),
          t.leads || d.series.some((s) => s.leads) ? chart({ data: d.series, series: [{ k: 'leads', label: 'פניות' }], kind: 'bar', ariaLabel: 'גרף פניות לפי ' + (bucket === 'week' ? 'שבוע' : 'יום') })
            : h('div', { class: 'empty' }, h('b', { text: 'לא התקבלו פניות בטווח הזה' }), 'כשהטופס יישלח או שתוסיפו פנייה ידנית, היא תופיע כאן.', leadsLink('#/leads', 'הוספת פנייה ידנית', 'plus')))),
      h('div', { class: 'grid grid--3' },
        h('section', { class: 'glass card' }, h('h2', { class: 'card__h', text: 'דפים וטיולים נצפים' }), has && (d.pages.length || d.tours.length) ? h('div', {}, [...d.tours.map((x) => [x.name, x.views, 'טיול']), ...d.pages.map((x) => [x.label, x.views, 'עמוד'])].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l, n, k], _, arr) => bar(l + ' · ' + k, n, arr[0][1]))) : h('p', { class: 'count', text: 'יופיע כשיהיו צפיות.' })),
        h('section', { class: 'glass card' }, h('h2', { class: 'card__h', text: 'קליקים' }), has ? h('div', {}, bar('וואטסאפ', t.waClicks, Math.max(t.waClicks, t.telClicks, t.mailClicks, 1)), bar('טלפון', t.telClicks, Math.max(t.waClicks, t.telClicks, t.mailClicks, 1)), bar('מייל', t.mailClicks, Math.max(t.waClicks, t.telClicks, t.mailClicks, 1)), h('p', { class: 'count', style: 'margin-top:8px', text: `פניות שנשלחו בטופס: ${t.leads}` })) : h('p', { class: 'count', text: 'יופיע כשיהיו נתוני מדידה.' })),
        h('section', { class: 'glass card' }, h('h2', { class: 'card__h', text: 'מקורות תנועה' }), has && d.sources.length ? h('div', {}, d.sources.slice(0, 7).map((s) => bar(SRC[s.k] || s.k, s.n, d.sources[0].n))) : h('p', { class: 'count', text: 'המקור מזוהה כשהגולש הגיע מגוגל, מרשת חברתית או מקישור.' }))),
      h('div', { class: 'grid grid--2' },
        h('section', { class: 'glass card' }, h('h2', { class: 'card__h' }, 'פניות אחרונות', h('a', { class: 'btn btn--sm btn--ghost', href: '#/leads', style: 'margin-inline-start:auto' }, 'לכל הפניות')),
          d.recent.length ? h('div', { class: 'rows' }, d.recent.map((l) => h('a', { class: 'rowlink', href: '#/leads/' + l.id }, h('div', { class: 'rowlink__t' }, h('b', { text: l.name || l.phone }), h('span', { text: [l.tourName, fmtDateTime(l.createdAt)].filter(Boolean).join(' · ') })), statusTag(l.status)))) : h('div', { class: 'empty' }, h('b', { text: 'אין עדיין פניות' }), 'פנייה חדשה תופיע כאן ברגע שתתקבל.')),
        h('section', { class: 'glass card' }, h('h2', { class: 'card__h', text: 'תזכורות פתוחות' }),
          d.reminders.length ? h('div', { class: 'rows' }, d.reminders.map((r) => h('a', { class: 'rowlink', href: '#/leads/' + r.id }, icon('clock'), h('div', { class: 'rowlink__t' }, h('b', { text: r.name || 'פנייה' }), h('span', { text: [fmtDateTime(r.at), r.text].filter(Boolean).join(' · ') })), r.overdue ? h('span', { class: 'tag tag--danger', text: 'באיחור' }) : null))) : h('p', { class: 'count', text: 'אין תזכורות פתוחות.' }))));
  }
  const bar = (l, n, max) => h('div', { class: 'bar' }, h('span', { class: 'bar__l', text: l }), h('span', { class: 'bar__n', text: n }), h('span', { class: 'bar__t' }, h('i', { style: `width:${Math.max(3, (n / (max || 1)) * 100)}%` })));
  await load();
}
const $$all = (el) => [...el.querySelectorAll('button')];

function spark(vals) {
  const W = 200, H = 46, max = Math.max(1, ...vals), pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, H - 6 - (v / max) * (H - 14)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const w = h('span', { html: `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".25"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="a" d="${line}L${W} ${H}L0 ${H}Z"/><path class="l" d="${line}"/></svg>`, style: 'display:contents' });
  return w.firstChild;
}
