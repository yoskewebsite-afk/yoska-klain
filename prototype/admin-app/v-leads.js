// פניות ו-CRM: table (desktop) / cards (phone), filters kept between visits, a drawer for one lead.
import { h, icon, api, toast, drawer, dialog, statusTag, STATUS, fmtDate, fmtDateTime, debounce } from './ui.js';
import { S } from './state.js';
import { go } from './app.js';

const KEY = 'yoske-leads-filter';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } };
let F = load();
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(F)); } catch { /* optional */ } };
const waLink = (p) => { const d = String(p || '').replace(/\D/g, '').replace(/^0/, '972'); return d ? `https://wa.me/${d}` : ''; };

export async function render(root, params) {
  if (params.q.tour) { F = { ...F, tour: params.q.tour }; save(); }
  const q = h('input', { type: 'search', placeholder: 'חיפוש לפי שם או טלפון', 'aria-label': 'חיפוש פניות', value: F.q || '', oninput: debounce((e) => { F.q = e.target.value; save(); fetchList(); }, 250) });
  const sel = (key, opts, label) => h('select', { 'aria-label': label, onchange: (e) => { F[key] = e.target.value; save(); fetchList(); } }, opts.map(([v, l]) => h('option', { value: v, selected: (F[key] || '') === v }, l)));
  const status = sel('status', [['', 'כל הסטטוסים'], ...Object.entries(STATUS)], 'סינון לפי סטטוס');
  const tour = sel('tour', [['', 'כל הטיולים'], ...S.tours.map((t) => [t.slug, t.name])], 'סינון לפי טיול');
  const form = sel('form', [['', 'כל סוגי הפניות'], ['general', 'פנייה כללית'], ['family', 'משפחה וחברים'], ['org', 'חברה או ארגון'], ['tour', 'סיור מסוים'], ['date', 'מועד מהלוח'], ['private', 'קבוצה פרטית'], ['quiz', 'שאלון התאמה'], ['manual', 'הוספה ידנית']], 'סינון לפי טופס');
  const from = h('input', { type: 'date', 'aria-label': 'מתאריך', value: F.from || '', onchange: (e) => { F.from = e.target.value; save(); fetchList(); } });
  const to = h('input', { type: 'date', 'aria-label': 'עד תאריך', value: F.to || '', onchange: (e) => { F.to = e.target.value; save(); fetchList(); } });
  const views = h('div', { class: 'seg', role: 'group', 'aria-label': 'תצוגה' }, [['', 'פעילות'], ['archived', 'ארכיון'], ['spam', 'ספאם']].map(([k, l]) => h('button', { class: 'seg__b', type: 'button', 'aria-pressed': String((F.view || '') === k), onclick: () => { F.view = k; save(); [...views.children].forEach((b, i) => b.setAttribute('aria-pressed', String(['', 'archived', 'spam'][i] === k))); fetchList(); } }, l)));
  const qs = () => new URLSearchParams(Object.fromEntries(Object.entries({ q: F.q, status: F.status, tour: F.tour, form: F.form, from: F.from, to: F.to, view: F.view }).filter(([, v]) => v))).toString();
  const csv = h('a', { class: 'btn', href: '#', onclick: (e) => { e.currentTarget.href = '/api/admin/leads.csv?' + qs(); } }, icon('download'), 'ייצוא לאקסל');
  const add = h('button', { class: 'btn btn--primary', type: 'button', onclick: () => openAdd() }, icon('plus'), 'פנייה חדשה');
  const out = h('div'), count = h('p', { class: 'count', 'aria-live': 'polite', style: 'margin-bottom:8px' });
  // phones: the five filters fold into one "סינון" row (with the number of active filters), so the leads start on the first screen
  const nOn = () => ['status', 'tour', 'form', 'from', 'to'].filter((k) => F[k]).length;
  const fsum = h('summary', { class: 'filters__s' }, icon('gear'), h('span', { text: 'סינון' }), h('b', { class: 'filters__n' }));
  const filters = h('details', { class: 'filters' }, fsum, h('div', { class: 'filters__b' }, status, tour, form, h('div', { class: 'filters__dates' }, from, to)));
  const markN = () => { const n = nOn(); fsum.lastChild.textContent = n ? String(n) : ''; fsum.lastChild.hidden = !n; };
  const wide = matchMedia('(min-width: 961px)'); filters.open = wide.matches; wide.addEventListener('change', () => { filters.open = wide.matches; });
  filters.addEventListener('change', markN); markN();

  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'פניות' }), h('span', { class: 'pagehead__sp' }), csv, add),
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search'), q), filters, views), count, out);

  let rows = [], selected = null;
  async function fetchList() {
    out.replaceChildren(h('div', { class: 'glass skeleton', style: 'height:260px' }));
    try {
      const r = await api('GET', '/api/admin/leads?limit=500&' + qs());
      rows = r.leads; count.textContent = `${r.total} פניות${r.total > rows.length ? ` (מוצגות ${rows.length})` : ''}`; paint();
    } catch (e) { out.replaceChildren(h('div', { class: 'notice notice--danger' }, e.message, ' ', h('button', { class: 'btn btn--sm', type: 'button', onclick: fetchList }, 'ניסיון חוזר'))); }
  }
  function paint() {
    if (!rows.length) { out.replaceChildren(h('div', { class: 'empty' }, h('b', { text: Object.values(F).some(Boolean) ? 'לא נמצאו פניות שמתאימות לסינון' : 'עדיין לא התקבלו פניות' }), Object.values(F).some(Boolean) ? 'נסו לנקות חלק מהמסננים.' : 'כשגולש ישלח את הטופס באתר, הפנייה תופיע כאן. אפשר גם להוסיף פנייה שהגיעה בשיחה או בוואטסאפ.', h('button', { class: 'btn btn--primary', type: 'button', onclick: () => openAdd() }, icon('plus'), 'פנייה חדשה'))); return; }
    const tbl = h('div', { class: 'glass tablewrap has-cards' }, h('table', {}, h('thead', {}, h('tr', {}, ['שם', 'סטטוס', 'טיול', 'התקבלה', 'מקור'].map((t) => h('th', { text: t })))),
      h('tbody', {}, rows.map((l) => { const tr = h('tr', { class: 'rowh', tabindex: '0', 'aria-selected': String(selected === l.id), onclick: () => open(l.id), onkeydown: (e) => { if (e.key === 'Enter') open(l.id); } },
        h('td', {}, h('div', { class: 'cell-main' }, h('b', { text: l.name || '(ללא שם)' }), h('span', { class: 'ltr', text: l.phone }))), h('td', {}, statusTag(l.status), l.reminder && !l.reminder.done ? h('span', { class: 'count', style: 'display:block;margin-top:2px', text: 'תזכורת ' + fmtDate(l.reminder.at, { day: 'numeric', month: 'short' }) }) : null),
        h('td', { text: l.tourName || '—' }), h('td', { text: fmtDateTime(l.createdAt) }), h('td', { text: { form: 'טופס באתר', phone: 'טלפון', whatsapp: 'וואטסאפ', manual: 'ידני' }[l.channel] || '' })); tr.dataset.id = l.id; return tr; }))));
    // phone cards: the whole card opens the lead; call and WhatsApp are one tap away without opening it
    const cards = h('div', { class: 'cards' }, rows.map((l) => h('div', { class: 'lcard' },
      h('button', { class: 'lcard__open', type: 'button', onclick: () => open(l.id) },
        h('div', { class: 'lcard__r' }, h('b', { text: l.name || '(ללא שם)' }), statusTag(l.status)), h('div', { class: 'lcard__r' }, h('span', { text: l.tourName || 'ללא טיול' }), h('small', { text: fmtDateTime(l.createdAt) })), h('small', { class: 'ltr', text: l.phone })),
      l.phone ? h('div', { class: 'lcard__acts' },
        h('a', { class: 'btn btn--sm', href: 'tel:' + String(l.phone).replace(/[^\d+]/g, ''), 'aria-label': 'חיוג ל' + (l.name || 'פונה') }, icon('phone'), 'חיוג'),
        waLink(l.phone) ? h('a', { class: 'btn btn--sm', href: waLink(l.phone), target: '_blank', rel: 'noopener', 'aria-label': 'וואטסאפ ל' + (l.name || 'פונה') }, icon('chat'), 'וואטסאפ') : null) : null)));
    out.replaceChildren(tbl, cards);
  }
  async function open(id) {
    selected = id; paint();
    const sy = scrollY;
    await openLead(id, async () => { selected = null; await fetchList(); scrollTo(0, sy); });
  }
  root.addEventListener('lead:open', (e) => open(e.detail));
  await fetchList();
  if (params.a) open(params.a);
}

// ------------------------------------------------------------ one lead
export async function openLead(id, onDone) {
  let lead;
  try { lead = (await api('GET', '/api/admin/leads/' + id)).lead; } catch (e) { return toast(e.message, 'err'); }
  const body = h('div', { style: 'display:grid;gap:18px' });
  const dr = drawer({ title: lead.name || 'פנייה', body, cls: '', onClose: () => { onDone && onDone(); } });
  const patch = async (p, okMsg) => {
    try { lead = (await api('PATCH', '/api/admin/leads/' + id, p)).lead; paint(); if (okMsg) toast(okMsg); } catch (e) { toast(e.message, 'err'); }
  };
  function paint() {
    const wa = waLink(lead.phone);
    const stBtns = h('div', { class: 'statusrow', role: 'group', 'aria-label': 'שינוי סטטוס' }, Object.entries(STATUS).map(([k, l]) => h('button', { class: 'seg__b', style: 'border:1px solid var(--line-strong);border-radius:10px', type: 'button', 'aria-pressed': String(lead.status === k), onclick: () => lead.status !== k && patch({ status: k }, 'הסטטוס עודכן: ' + l) }, l)));
    const note = h('textarea', { 'aria-label': 'הערה פנימית', placeholder: 'מה סוכם, מה צריך לזכור…', style: 'min-height:78px' });
    const rDate = h('input', { type: 'datetime-local', 'aria-label': 'מועד התזכורת', value: lead.reminder ? new Date(new Date(lead.reminder.at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' });
    const rText = h('input', { type: 'text', 'aria-label': 'נושא התזכורת', placeholder: 'לחזור עם מחיר', value: lead.reminder?.text || '' });
    const kv = [['טלפון', h('a', { class: 'ltr', href: 'tel:' + lead.phone, text: lead.phone })], lead.email ? ['מייל', h('a', { class: 'ltr', href: 'mailto:' + lead.email, text: lead.email })] : null, ['טיול', lead.tourName ? h('a', { href: '#/tours/' + lead.tour, text: lead.tourName }) : '—'],
      ['טופס', lead.formName || '—'], ['עמוד מקור', lead.page ? h('span', { class: 'ltr', text: lead.page }) : '—'], ['התקבלה', fmtDateTime(lead.createdAt)], lead.source?.ref ? ['הגיע מ', lead.source.ref] : null].filter(Boolean);
    const extra = Object.entries(lead.fields || {}).filter(([k]) => !['name', 'phone', 'msg', 'tour', 'email'].includes(k));
    body.replaceChildren(
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center' }, statusTag(lead.status), lead.spam ? h('span', { class: 'tag tag--danger', text: 'ספאם' }) : null, lead.archived ? h('span', { class: 'tag tag--mute', text: 'בארכיון' }) : null,
        h('span', { style: 'flex:1' }), lead.phone ? h('a', { class: 'btn btn--sm', href: 'tel:' + lead.phone }, icon('phone'), 'חיוג') : null, wa ? h('a', { class: 'btn btn--sm', href: wa, target: '_blank', rel: 'noopener' }, icon('chat'), 'וואטסאפ') : null),
      h('dl', { class: 'kv' }, kv.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', {}, v)])),
      lead.message ? h('div', { class: 'group' }, h('span', { class: 'group__h', text: (lead.fieldLabels?.msg || 'ההודעה') }), h('p', { text: lead.message, style: 'white-space:pre-wrap' })) : null,
      extra.length ? h('dl', { class: 'kv' }, extra.flatMap(([k, v]) => [h('dt', { text: lead.fieldLabels?.[k] || k }), h('dd', { text: v })])) : null,
      h('div', { class: 'group' }, h('span', { class: 'group__h', text: 'סטטוס' }), stBtns),
      h('div', { class: 'group' }, h('span', { class: 'group__h' }, icon('clock'), 'תזכורת לחזרה ללקוח'), lead.reminder && !lead.reminder.done ? h('p', { class: 'tag tag--warn', style: 'justify-self:start', text: 'פתוחה: ' + fmtDateTime(lead.reminder.at) }) : lead.reminder ? h('p', { class: 'tag tag--mute', style: 'justify-self:start', text: 'בוצעה' }) : null,
        h('div', { class: 'grid grid--2', style: 'gap:10px' }, rDate, rText),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: () => { if (!rDate.value) return toast('בחרו תאריך ושעה לתזכורת.', 'err'); patch({ reminder: { at: new Date(rDate.value).toISOString(), text: rText.value } }, 'התזכורת נשמרה'); } }, 'שמירת תזכורת'),
          lead.reminder && !lead.reminder.done ? h('button', { class: 'btn btn--sm', type: 'button', onclick: () => patch({ reminderDone: true }, 'סומנה כבוצעה') }, icon('check'), 'סימון כבוצעה') : null, lead.reminder ? h('button', { class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => patch({ reminder: null }) }, 'הסרה') : null)),
      h('div', { class: 'group' }, h('span', { class: 'group__h', text: 'הערות והיסטוריה' }), note, h('button', { class: 'btn btn--primary btn--sm', style: 'justify-self:start', type: 'button', onclick: () => { if (!note.value.trim()) return toast('כתבו הערה קודם.', 'err'); patch({ note: note.value }, 'ההערה נוספה'); } }, 'הוספת הערה'),
        h('div', { class: 'timeline' }, lead.notes.map((n) => h('div', { class: 'tl tl--' + n.kind }, h('span', { text: n.text, style: 'white-space:pre-wrap' }), h('small', { text: `${fmtDateTime(n.at)} · ${n.by}` }))))),
      lead.notify && lead.notify.status !== 'none' ? h('p', { class: 'count', text: 'התראה ליוסי: ' + ({ sent: 'נשלחה', failed: 'נכשלה (הפנייה נשמרה)', pending: 'ממתינה', skipped: 'לא נשלחה' }[lead.notify.status] || lead.notify.status) }) : null,
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:14px' },
        h('button', { class: 'btn btn--sm', type: 'button', onclick: () => patch({ archived: !lead.archived }, lead.archived ? 'הוחזרה מהארכיון' : 'הועברה לארכיון') }, lead.archived ? 'החזרה מהארכיון' : 'העברה לארכיון'),
        h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: () => patch({ spam: !lead.spam }, lead.spam ? 'הוחזרה מספאם' : 'סומנה כספאם') }, lead.spam ? 'זו לא ספאם' : 'סימון כספאם'),
        lead.notify && ['failed', 'skipped'].includes(lead.notify.status) ? h('button', { class: 'btn btn--sm', type: 'button', onclick: async () => { try { lead = (await api('POST', `/api/admin/leads/${id}/notify`, {})).lead; paint(); toast('נשלחה התראה'); } catch (e) { toast(e.message, 'err'); } } }, 'שליחה חוזרת של ההתראה') : null));
  }
  paint();
}

function openAdd() {
  const f = (label, el) => h('div', { class: 'fld' }, h('label', { text: label }), el);
  const name = h('input', { type: 'text', autocomplete: 'off' }), phone = h('input', { type: 'tel', dir: 'ltr', autocomplete: 'off' }), msg = h('textarea', { placeholder: 'מה הלקוח ביקש או סיפר' });
  const ch = h('select', {}, [['phone', 'שיחת טלפון'], ['whatsapp', 'וואטסאפ'], ['manual', 'אחר']].map(([v, l]) => h('option', { value: v, text: l })));
  const tour = h('select', {}, h('option', { value: '', text: 'לא ידוע' }), S.tours.map((t) => h('option', { value: t.slug, text: t.name })));
  const err = h('p', { class: 'fld__err', hidden: true, role: 'alert' });
  const save = h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => {
    err.hidden = true;
    if (!name.value.trim() && !phone.value.trim()) { err.textContent = 'צריך לפחות שם או טלפון.'; err.hidden = false; return; }
    save.setAttribute('aria-busy', 'true');
    try { const r = await api('POST', '/api/admin/leads', { name: name.value, phone: phone.value, message: msg.value, channel: ch.value, tour: tour.value }); await dr.close(true); toast('הפנייה נוספה'); go('#/leads/' + r.lead.id); location.reload(); }
    catch (e) { err.textContent = e.message; err.hidden = false; } finally { save.removeAttribute('aria-busy'); }
  } }, 'שמירת פנייה');
  const dr = drawer({ title: 'פנייה חדשה', body: h('div', { style: 'display:grid;gap:14px' }, f('שם', name), f('טלפון', phone), f('איך הגיעה?', ch), f('טיול שמעניין אותם', tour), f('מה סוכם / נאמר', msg), err), footer: [save, h('button', { class: 'btn', type: 'button', onclick: () => dr.close() }, 'ביטול')] });
}
