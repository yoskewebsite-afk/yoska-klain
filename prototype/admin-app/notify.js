// New-lead notifications: a popup at the side while the app is open, optional phone/desktop push, and the install guide.
import { h, icon, api, toast, dialog, fmtDateTime } from './ui.js';
import { refreshBadge } from './state.js';

let since = new Date().toISOString(), box, deferred = null, reg = null;
const SEEN = 'yoske-admin-install-seen';

export function sideNote({ title, text, actions = [], ms = 15000 }) {
  box ||= document.body.appendChild(h('div', { class: 'sidenotes', 'aria-live': 'polite' }));
  const close = () => { n.classList.remove('on'); setTimeout(() => n.remove(), 220); };
  const n = h('div', { class: 'sidenote', role: 'status' }, h('span', { class: 'sidenote__ic' }, icon('inbox')), h('div', { class: 'sidenote__b' }, h('b', { text: title }), h('span', { text })),
    h('div', { class: 'sidenote__a' }, actions.map((a) => h('button', { class: 'btn btn--sm' + (a.primary ? ' btn--primary' : ''), type: 'button', onclick: () => { close(); a.onclick(); } }, a.label)), h('button', { class: 'btn btn--sm btn--icon btn--ghost', type: 'button', 'aria-label': 'סגירה', onclick: close }, icon('x'))));
  box.append(n); requestAnimationFrame(() => n.classList.add('on'));
  if (ms) setTimeout(close, ms);
  return close;
}

async function poll() {
  try {
    const r = await api('GET', '/api/admin/poll?since=' + encodeURIComponent(since));
    since = r.now;
    for (const l of r.leads.reverse()) {
      const text = [l.name || 'פנייה חדשה', l.tourName].filter(Boolean).join(' · ');
      sideNote({ title: 'פנייה חדשה מהאתר', text, actions: [{ label: 'פתיחה', primary: true, onclick: () => { location.hash = '#/leads/' + l.id; } }] });
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && reg) reg.showNotification('פנייה חדשה מהאתר', { body: text, icon: '/admin-app/icon-192.png', dir: 'rtl', lang: 'he', tag: 'lead-' + l.id, data: { url: '/yoske-nihul-7k4q#/leads/' + l.id } });
    }
    if (r.leads.length) refreshBadge();
  } catch { /* offline or signed out: the next tick tries again */ }
}

export async function initNotify() {
  if ('serviceWorker' in navigator) { try { reg = await navigator.serviceWorker.register('/admin-app/sw.js', { scope: '/yoske-nihul-7k4q' }); } catch { reg = null; } }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  setInterval(poll, 25000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  // one-time invitation, never in the way
  let seen = false; try { seen = !!localStorage.getItem(SEEN); } catch { seen = true; }
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!seen && !standalone) setTimeout(() => sideNote({ title: 'רוצים התראות על פניות חדשות?', text: 'אפשר להוסיף את הניהול למסך הבית של הטלפון כאפליקציה, ולקבל התראה בכל פנייה.', ms: 0,
    actions: [{ label: 'איך מוסיפים', primary: true, onclick: () => { try { localStorage.setItem(SEEN, '1'); } catch { /* optional */ } installFlow(); } }, { label: 'לא עכשיו', onclick: () => { try { localStorage.setItem(SEEN, '1'); } catch { /* optional */ } } }] }), 5000);
}

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export async function installFlow() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const status = h('div', { class: 'notice' });
  const state = () => {
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    status.replaceChildren(h('strong', { text: 'מצב נוכחי' }), h('ul', { class: 'deps', style: 'margin:0;padding:0' },
      h('li', { text: standalone ? 'המערכת פתוחה כאפליקציה.' : 'המערכת פתוחה בדפדפן, לא כאפליקציה.' }),
      h('li', { text: { granted: 'התראות מאושרות במכשיר הזה.', denied: 'התראות חסומות במכשיר. צריך לאפשר אותן בהגדרות הדפדפן או הטלפון.', default: 'התראות עדיין לא הופעלו.', unsupported: 'המכשיר או הדפדפן לא תומכים בהתראות (באייפון צריך קודם להוסיף למסך הבית).' }[perm] })));
  };
  state();
  const install = deferred ? h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { deferred.prompt(); await deferred.userChoice; deferred = null; state(); } }, icon('plus'), 'התקנה כאפליקציה') : null;
  const enable = h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => {
    if (!supported) { toast(ios && !standalone ? 'באייפון קודם מוסיפים למסך הבית ופותחים משם (ראו ההוראות).' : 'המכשיר לא תומך בהתראות.', 'err'); return; }
    enable.setAttribute('aria-busy', 'true');
    try {
      const perm = await Notification.requestPermission(); state();
      if (perm !== 'granted') { toast('ההתראות לא אושרו.', 'err'); return; }
      const key = (await api('GET', '/api/admin/push/key')).publicKey;
      if (!key) { toast('ההתראות מופעלות בזמן שהמערכת פתוחה. כדי לקבל גם כשהיא סגורה צריך לחבר מפתחות VAPID בשרת (מסך חיבורים).'); return; }
      reg ||= await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
      await api('POST', '/api/admin/push/subscribe', { subscription: sub.toJSON() });
      toast('ההתראות הופעלו במכשיר הזה.');
    } catch (e) { toast(e.message || 'לא הצלחנו להפעיל התראות.', 'err'); } finally { enable.removeAttribute('aria-busy'); }
  } }, icon('inbox'), 'הפעלת התראות');
  const test = h('button', { class: 'btn', type: 'button', onclick: async () => { try { const r = await api('POST', '/api/admin/push/test', {}); toast(r.sent ? 'נשלחה התראת בדיקה.' : 'לא נשלחה: אין מכשיר רשום או שמפתחות VAPID לא הוגדרו.', r.sent ? '' : 'err'); } catch (e) { toast(e.message, 'err'); } } }, 'שליחת התראת בדיקה');
  const guide = (title, steps, open) => h('details', { class: 'group', ...(open ? { open: '' } : {}) }, h('summary', { style: 'cursor:pointer;font-weight:700', text: title }), h('ol', { style: 'margin:10px 0 0;padding-inline-start:20px;display:grid;gap:6px' }, steps.map((x) => h('li', { text: x }))));
  dialog({ title: 'אפליקציה והתראות', cls: 'dlg--lg', body: h('div', { style: 'display:grid;gap:14px' },
    h('p', { text: 'אפשר להוסיף את מערכת הניהול למסך הבית של הטלפון, כך שתיפתח כמו אפליקציה, ולקבל התראה בכל פעם שנכנסת פנייה חדשה.' }), status,
    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, install, enable, test),
    guide('אייפון (Safari, iOS 16.4 ומעלה)', ['פותחים את כתובת מערכת הניהול ב-Safari (לא בכרום).', 'לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה) בתחתית המסך.', 'בוחרים ״הוספה למסך הבית״ ואז ״הוספה״.', 'פותחים את האפליקציה מהאייקון במסך הבית (חשוב: לא מהדפדפן).', 'מתחברים, נכנסים ל״אפליקציה והתראות״ ולוחצים ״הפעלת התראות״ ו״אפשר״.', 'אם ההתראות לא מגיעות: הגדרות ← התראות ← ניהול יוסק׳ה, ולוודא שהן מופעלות.'], ios),
    guide('אנדרואיד (Chrome)', ['פותחים את כתובת מערכת הניהול ב-Chrome.', 'לוחצים על שלוש הנקודות בפינה ובוחרים ״התקנת אפליקציה״ (או ״הוספה למסך הבית״).', 'פותחים את האפליקציה מהאייקון.', 'נכנסים ל״אפליקציה והתראות״ ולוחצים ״הפעלת התראות״ ו״אפשר״.'], !ios && /android/i.test(navigator.userAgent)),
    guide('מחשב (Chrome או Edge)', ['בשורת הכתובת לוחצים על סמל ההתקנה, או בתפריט ״התקנת ניהול יוסק׳ה״.', 'נכנסים ל״אפליקציה והתראות״ ולוחצים ״הפעלת התראות״.'], !ios && !/android/i.test(navigator.userAgent)),
    h('p', { class: 'count', text: 'בזמן שהמערכת פתוחה, פנייה חדשה מקפיצה הודעה בצד המסך בלי שום הגדרה. התראה לטלפון כשהאפליקציה סגורה דורשת גם הגדרת מפתחות בשרת (מסך חיבורים).' })),
    actions: [{ label: 'סגירה', value: true, focus: true }] });
}
