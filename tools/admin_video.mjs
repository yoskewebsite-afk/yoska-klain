// 21.11.2026: a guided video of the admin for Yossi (Hebrew captions on screen). Records a local server, no edits are saved.
// node tools/admin_video.mjs <base> <outdir> <email> <password>
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [base, out, email, pw] = process.argv.slice(2);
const A = base + '/yoske-nihul-7k4q';
const b = await chromium.launch({ executablePath: exe });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: out, size: { width: 1280, height: 800 } } });
await ctx.addInitScript(() => { try { localStorage.setItem('yoske-code-nudge', JSON.stringify({ never: true, at: Date.now() })); localStorage.setItem('yoske-admin-install-seen', '1'); } catch {} });
const p = await ctx.newPage();
const cap = async (title, text, ms = 6500) => {
  await p.evaluate(([t, x]) => {
    let d = document.getElementById('vcap');
    if (!d) { d = document.createElement('div'); d.id = 'vcap'; document.body.append(d);
      Object.assign(d.style, { position: 'fixed', zIndex: 99999, left: '50%', bottom: '28px', transform: 'translateX(-50%)', width: 'min(880px, 92vw)', padding: '18px 26px', borderRadius: '18px',
        background: 'rgba(31,43,69,.94)', color: '#fff', font: '500 22px/1.45 Heebo, Arial, sans-serif', direction: 'rtl', textAlign: 'right', boxShadow: '0 18px 40px rgba(0,0,0,.35)' }); }
    d.innerHTML = `<b style="display:block;color:#F2B632;font-size:24px;margin-bottom:4px">${t}</b>${x}`;
  }, [title, text]);
  await p.waitForTimeout(ms);
};
const go = async (hash, wait = 1800) => { await p.evaluate(() => document.getElementById('vcap')?.remove()); await p.goto(A + hash); await p.waitForTimeout(wait); };
const glow = async (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (e) { e.scrollIntoView({ block: 'center' }); e.style.outline = '4px solid #F7643C'; e.style.outlineOffset = '4px'; e.style.borderRadius = '12px'; } }, sel);

await p.goto(A); await p.waitForTimeout(1200);
await cap('כניסה למערכת הניהול', 'הכתובת: שם האתר ואחריו ‎/yoske-nihul-7k4q‎ . נכנסים עם מייל וסיסמה, או עם קוד ספרות אחרי שמגדירים אותו בהגדרות.', 7000);
if (await p.$('[data-way="pw"]')) await p.click('[data-way="pw"]');
await p.fill('#email', email); await p.fill('#password', pw); await p.click('#go'); await p.waitForSelector('#main'); await p.waitForTimeout(2500);
await cap('המסך הראשי', 'כמה נכנסו לאתר, כמה לחצו על וואטסאפ וטלפון, ומאיפה הגיעו. למעלה קיצורי דרך: סיורים קרובים, לוגואים וכניסה עם קוד.', 8000);
await go('#/leads'); await cap('פניות', 'כל מי שמילא טופס באתר מופיע כאן. לוחצים על פנייה כדי להתקשר, לכתוב בוואטסאפ, לשנות סטטוס ולהוסיף הערה. אפשר גם להוסיף פנייה ידנית.', 8000);
await go('#/pages'); await cap('דפים וסקשנים', 'כל דף באתר. בוחרים דף, ואז סקשן, ועורכים כל טקסט, כפתור ותמונה שמופיעים בו.', 7000);
await go('#/pages/index', 2400); await cap('הסקשנים של דף הבית', 'אפשר להזיז סקשן למעלה או למטה, להסתיר אותו ולהחזיר, או להוסיף סקשן חדש מספרייה של 11 סוגים (טקסט, תמונה, כרטיסים, שאלות ועוד).', 8500);
await go('#/pages/index/c-trips01', 2600); await cap('סיורים קרובים', 'הסקשן כבר מלא בסיורים של יוסי, ולכל סיור כפתור ״להרשמה ותשלום״ שפותח את דף הסליקה. לוחצים על סיור כדי לשנות תיאור, תמונה, תאריך וקישור. ״הוספת סיור״ מוסיף עוד אחד, ו״בחירה מהסיורים שלי״ ממלא את הפרטים לבד.', 11000);
await cap('סיורים קרובים: להסתיר ולהחזיר', 'מוחקים את כל הסיורים מהרשימה והסקשן נעלם מהאתר, ואיתו הקישור אליו בתפריט. מוסיפים סיור והוא חוזר. ככה אפשר להשאיר אותו רק בחגים או כשיש מועד.', 9000);
await go('#/pages/index/c-logos01', 2600); await cap('לוגואים של לקוחות', '״הוספת לוגו״ פותח את ספריית התמונות. מעלים קובץ PNG על רקע שקוף (לא SVG) ורושמים את שם הארגון. הרצועה מופיעה באתר מהלוגו הראשון.', 9000);
await go('#/tours', 2200); await cap('הסיורים', 'כל הסיורים של יוסי: שם, תיאור, תמונה, משך, תחנות ומועדים. אפשר להוסיף סיור חדש, להסתיר סיור או לשנות את הסדר שלו באתר.', 8000);
await go('#/media', 2200); await cap('ספריית מדיה', 'כל התמונות של האתר. גוררים לכאן תמונה מהמחשב או מהטלפון, והיא מוקטנת אוטומטית כדי שהאתר יישאר מהיר.', 7500);
await go('#/forms', 2000); await cap('טפסים', 'לאן נשלחת התראה על פנייה חדשה, ומה כתוב בהודעת התודה אחרי שליחה.', 6500);
await go('#/settings', 2200); await cap('הגדרות', 'כאן: קוד כניסה אישי, החלפת סיסמה, טלפון, וואטסאפ, מייל, לוגו ופתיחת האתר לגוגל.', 7500);
await glow('#code'); await cap('קוד כניסה', 'מגדירים קוד של 6 עד 12 ספרות, ומהפעם הבאה אפשר להיכנס רק איתו. הסיסמה ממשיכה לעבוד.', 7000);
await go('#/pages/index', 2000); await glow('.savebar .btn--primary, button.btn--primary');
await cap('שמירה ופרסום', 'כל שינוי נשמר קודם כטיוטה ולא מופיע באתר. ״תצוגה מקדימה״ מראה בדיוק איך זה ייראה, ו״פרסום לאתר״ מעלה את השינוי. ״היסטוריה״ מחזירה גרסה קודמת אם משהו השתבש.', 9500);
await cap('אפליקציה בטלפון', 'בטלפון: פותחים את כתובת הניהול, ״הוספה למסך הבית״, ונכנסים ל״אפליקציה והתראות״ כדי לקבל התראה על כל פנייה חדשה.', 8000);
const v = p.video(); await ctx.close(); await b.close();
const src = await v.path(); const dst = path.join(out, 'yossi-admin-guide.webm'); fs.renameSync(src, dst); console.log(dst);
