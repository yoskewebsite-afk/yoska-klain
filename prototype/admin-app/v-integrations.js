// חיבורים, גיבויים ותחזוקה: the real state of every service, what is missing, backups and the audit log.
import { h, icon, api, toast, fmtDateTime } from './ui.js';

const STATE = { on: ['פעיל', 'tag--new'], dev: ['מצב פיתוח', 'tag--waiting'], ready: ['מוכן לחיבור', 'tag--contacted'], off: ['לא מחובר', 'tag--mute'], none: ['לא בשימוש', 'tag--mute'] };

export async function render(root) {
  const [ig, bk, au] = await Promise.all([api('GET', '/api/admin/integrations'), api('GET', '/api/admin/backups'), api('GET', '/api/admin/audit')]);
  const backups = h('div');
  const paintBk = (list) => backups.replaceChildren(list.length ? h('div', { class: 'rows' }, list.map((b) => h('div', { class: 'rowlink', style: 'cursor:default' }, h('div', { class: 'rowlink__t' }, h('b', { text: fmtDateTime(b.at) }), h('span', { text: `${b.by} · פניות ${b.counts.leads}, גרסאות ${b.counts.revisions}, תמונות ${b.mediaFiles}` })), h('a', { class: 'btn btn--sm', href: `/api/admin/backups/${b.id}/download` }, icon('download'), 'הורדה')))) : h('p', { class: 'count', text: 'עדיין לא נוצר גיבוי.' }));
  paintBk(bk.backups);
  const mk = h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { mk.setAttribute('aria-busy', 'true'); try { const r = await api('POST', '/api/admin/backups', {}); paintBk([r.backup, ...bk.backups]); bk.backups.unshift(r.backup); toast('הגיבוי נוצר'); } catch (e) { toast(e.message, 'err'); } finally { mk.removeAttribute('aria-busy'); } } }, icon('save'), 'יצירת גיבוי עכשיו');
  root.append(h('div', { class: 'pagehead' }, h('h1', { text: 'חיבורים' })),
    h('div', { class: 'grid', style: 'gap:14px' }, ig.integrations.map((i) => { const [l, c] = STATE[i.state] || STATE.off;
      return h('article', { class: 'glass card' }, h('div', { class: 'intg' }, h('span', { class: `tag ${c}`, text: l }), h('div', {}, h('h2', { style: 'font-size:17px;font-weight:800', text: i.name }), h('p', { class: 'intg__d', text: i.detail }), i.missing.length ? h('div', {}, h('p', { class: 'count', style: 'margin-top:8px;font-weight:700', text: 'מה חסר כדי לחבר:' }), h('ul', {}, i.missing.map((m) => h('li', { text: m })))) : null))); })),
    h('section', { class: 'glass card', style: 'margin-top:20px' }, h('h2', { class: 'card__h' }, 'גיבויים', h('span', { style: 'flex:1' }), mk),
      h('p', { class: 'count', style: 'margin-bottom:12px', text: `הגיבוי כולל תוכן (טיוטה, פורסם וכל הגרסאות), טיולים, פניות, הגדרות, הפניות, רשומות מדיה ויומן פעולות. נשמרות ${bk.keep} הגרסאות האחרונות. קבצי התמונות מגובים בנפרד (tools/backup.mjs --files). ייצוא פניות לבדו אינו גיבוי.` }), backups),
    h('section', { class: 'glass card', style: 'margin-top:20px' }, h('h2', { class: 'card__h', text: 'יומן פעולות ניהול' }), au.audit.length ? h('div', { class: 'rows' }, au.audit.slice(0, 30).map((a) => h('div', { class: 'rowlink', style: 'cursor:default;min-height:44px' }, h('div', { class: 'rowlink__t' }, h('b', { text: { login: 'כניסה למערכת', publish: 'פרסום', restore: 'שחזור גרסה', 'discard-draft': 'ביטול טיוטה', backup: 'גיבוי', 'media-delete': 'מחיקת תמונה', setup: 'הקמת מנהל' }[a.action] || a.action }), h('span', { text: `${a.who} · ${fmtDateTime(a.at)}${a.detail?.note ? ' · ' + a.detail.note : ''}` }))))) : h('p', { class: 'count', text: 'אין פעולות ביומן.' })));
}
