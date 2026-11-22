// 22.11.2026: the admin guide for Yossi as a PDF (Hebrew, RTL, brand colours, screenshots of the real admin).
// node tools/admin_shots.mjs <base> <shotsdir> <email> <password>   (first, to refresh the screenshots)
// node tools/build_guide_pdf.mjs <shotsdir> <out.pdf>
import { chromium } from 'playwright-core'; import path from 'node:path'; import os from 'node:os'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
const [shots, out] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = 'file://' + path.join(ROOT, 'prototype/fonts/heebo-hebrew-300-900.woff2');
const logo = 'file://' + path.join(ROOT, 'prototype/assets/brand/logo-horizontal.svg');
const img = (n) => 'file://' + path.join(shots, n + '.png');

const fig = (n, cap) => `<figure><img src="${img(n)}" alt=""><figcaption>${cap}</figcaption></figure>`;
const steps = (...a) => `<ol class="steps">${a.map((x) => `<li>${x}</li>`).join('')}</ol>`;

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>מדריך למערכת הניהול של האתר</title>
<style>
@font-face { font-family: Heebo; src: url(${font}) format('woff2'); font-weight: 300 900; }
@page { size: A4; margin: 16mm 15mm 18mm; }
:root { --navy: #2A3A5C; --teal: #25A0B5; --sun: #F2B632; --orange: #F7643C; --leaf: #2E9E7A; --paper: #F5F9FA; }
* { box-sizing: border-box; }
body { margin: 0; font: 400 11.5pt/1.65 Heebo, sans-serif; color: #1F2B45; }
h1, h2, h3 { margin: 0; color: var(--navy); font-weight: 800; line-height: 1.2; }
h2 { font-size: 20pt; margin: 0 0 10pt; padding-top: 4pt; border-top: 3pt solid var(--teal); display: inline-block; padding-inline-end: 24pt; }
h3 { font-size: 13pt; margin: 14pt 0 4pt; }
p { margin: 0 0 8pt; }
section { page-break-before: always; }
.cover { page-break-before: auto; min-height: 255mm; display: flex; flex-direction: column; justify-content: center; gap: 18pt; }
.cover img { width: 90mm; }
.cover h1 { font-size: 40pt; }
.cover h1 b { color: var(--orange); }
.cover p { font-size: 15pt; color: #3A4A6B; max-width: 120mm; }
.cover .bar { display: flex; height: 6pt; width: 110mm; }
.cover .bar i { flex: 1; } .cover .bar i:nth-child(1) { background: var(--teal); } .cover .bar i:nth-child(2) { background: var(--sun); } .cover .bar i:nth-child(3) { background: var(--orange); } .cover .bar i:nth-child(4) { background: var(--leaf); } .cover .bar i:nth-child(5) { background: var(--navy); }
.note { background: #FDF3DC; border-inline-start: 4pt solid var(--sun); padding: 8pt 12pt; border-radius: 6pt; margin: 10pt 0; }
.key { background: #E4F3EE; border-inline-start: 4pt solid var(--leaf); padding: 8pt 12pt; border-radius: 6pt; margin: 10pt 0; }
ol.steps { list-style: none; counter-reset: s; padding: 0; margin: 8pt 0 12pt; }
ol.steps li { counter-increment: s; position: relative; padding-inline-start: 26pt; margin-bottom: 6pt; }
ol.steps li::before { content: counter(s); position: absolute; inset-inline-start: 0; top: 1pt; width: 18pt; height: 18pt; border-radius: 50%; background: var(--navy); color: #fff; font-weight: 700; font-size: 10pt; display: grid; place-items: center; line-height: 18pt; text-align: center; }
figure { margin: 10pt 0 14pt; break-inside: avoid; }
figure img { width: 100%; max-height: 92mm; object-fit: cover; object-position: top; border: 1pt solid #D6E0E4; border-radius: 8pt; display: block; }
figcaption { font-size: 9.5pt; color: #5A6B84; margin-top: 4pt; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10.5pt; }
th, td { text-align: right; vertical-align: top; padding: 6pt 8pt; border-bottom: 1pt solid #D6E0E4; }
th { background: var(--paper); color: var(--navy); width: 30%; }
code { direction: ltr; unicode-bidi: isolate; white-space: nowrap; display: inline-block; background: var(--paper); padding: 0 3pt; border-radius: 3pt; font-size: 10pt; }
.small { font-size: 9.5pt; color: #5A6B84; }
</style></head><body>

<div class="cover">
  <img src="${logo}" alt="">
  <div class="bar"><i></i><i></i><i></i><i></i><i></i></div>
  <h1>מדריך למערכת <b>הניהול</b> של האתר</h1>
  <p>איך נכנסים, מה אפשר לערוך, איך מוסיפים סיור קרוב ולוגו, ואיך מעלים שינוי לאתר. כל מה שיוסי צריך, בעמודים אחדים.</p>
  <p class="small">מצורף סרטון הדרכה של כשתי דקות וחצי.</p>
</div>

<section>
  <h2>1. כניסה</h2>
  <p>המערכת נמצאת בכתובת האתר ואחריה הסיומת הסודית, למשל:</p><p style="text-align:center"><code>https://yoske.co.il/yoske-nihul-7k4q</code></p><p>כדאי לשמור אותה במועדפים. הכתובת הרגילה <code>/admin</code> לא קיימת, וזה בכוונה: ככה לא מוצאים את הכניסה.</p>
  ${fig('login', 'מסך הכניסה. אחרי שמגדירים קוד, מופיע כפתור ״עם קוד״ ליד ״מייל וסיסמה״.')}
  ${steps('נכנסים עם <b>מייל וסיסמה</b> שקיבלתם.', 'ב״הגדרות אתר״ מחליפים את הסיסמה לסיסמה שלכם (<b>החלפת סיסמה</b>), לפחות 10 תווים.', 'אם רוצים, מגדירים <b>קוד כניסה</b> של 6 עד 12 ספרות, ומהפעם הבאה נכנסים רק איתו.')}
  <div class="note"><b>בטלפון:</b> פותחים את כתובת הניהול ב-Safari או ב-Chrome, בוחרים ״הוספה למסך הבית״, ונכנסים ל״אפליקציה והתראות״ כדי לקבל התראה על כל פנייה חדשה.</div>
</section>

<section>
  <h2>2. הכלל הכי חשוב: טיוטה ואז פרסום</h2>
  <p>כל שינוי שעושים נשמר קודם <b>כטיוטה</b>, והאתר לא משתנה. רק כשלוחצים על <b>״פרסום לאתר״</b> (הכפתור הירוק למעלה) השינוי עולה.</p>
  ${steps('<b>עורכים</b> ולוחצים ״שמור טיוטה״.', '<b>תצוגה מקדימה</b> מראה בדיוק איך הדף ייראה, במחשב ובטלפון.', '<b>פרסום לאתר</b> מעלה את השינוי. אחרי כחצי דקה הוא מופיע.')}
  <div class="key"><b>טעיתם?</b> ״היסטוריה״ (בתפריט הצד) מחזירה כל גרסה קודמת של האתר בלחיצה.</div>
  ${fig('dashboard', 'המסך הראשי: כמה נכנסו לאתר, כמה פניות חדשות, ומאיפה הגיעו. למעלה קיצורי דרך לסיורים קרובים, ללוגואים ולקוד כניסה.')}
</section>

<section>
  <h2>3. דפים וסקשנים</h2>
  <p>כל דף באתר מורכב מסקשנים (קטעים). בוחרים דף, אחר כך סקשן, ועורכים את הטקסטים, הכפתורים והתמונות שבו.</p>
  ${fig('pages', 'דף הבית: רשימת הסקשנים בצד, ולחיצה על סקשן פותחת את השדות שלו.')}
  <table>
    <tr><th>להזיז סקשן</th><td>גוררים אותו בידית שליד השם, או בחצים.</td></tr>
    <tr><th>להסתיר ולהחזיר</th><td>המתג ״מוצג באתר״. הסקשן נשאר במערכת ואפשר להחזיר אותו בכל רגע.</td></tr>
    <tr><th>להוסיף סקשן חדש</th><td>״הוספת סקשן״: ספרייה של 11 סוגים (טקסט, תמונה וטקסט, כרטיסים, גלריה, שאלות ותשובות, ציטוט ועוד), וגם בחירה של צבע רקע, מרווחים ועיצוב.</td></tr>
    <tr><th>מילה מודגשת בכותרת</th><td>כותבים אותה בין כוכביות, <code>*כך*</code>, והיא נצבעת בצבע ההדגשה.</td></tr>
  </table>
</section>

<section>
  <h2>4. סיורים קרובים</h2>
  <p>הסקשן ״הסיורים הקרובים״ בדף הבית כבר מלא בסיורים של יוסי. לכל סיור יש תמונה, שורת תיאור, כפתור <b>״להרשמה ותשלום״</b> שפותח את דף הסליקה, וכפתור ״לשאול בוואטסאפ״ שכולל את שם הסיור. בתחתית יש כפתור לקטלוג בוואטסאפ.</p>
  ${fig('trips', 'עריכת הסקשן: כותרת, טקסט, הכפתורים שבתחתית, ולמטה רשימת הסיורים.')}
  ${steps('<b>דפים וסקשנים</b> ← <b>דף הבית</b> ← <b>סיורים קרובים</b>.', 'לסיור קיים: פותחים אותו ומשנים תיאור, תמונה, <b>מתי</b> (למשל ״שישי 26.12, 9:00״) וקישור ההרשמה.', 'לסיור חדש: <b>״הוספת סיור״</b>, ואז <b>״בחירה מהסיורים שלי״</b>. השם והתמונה מתמלאים לבד. אפשר גם סיור שלא ברשימה.', '<b>פרסום לאתר</b>.')}
  <div class="note"><b>בחגים או כשאין מועדים:</b> מוחקים את הסיורים מהרשימה והסקשן נעלם מהאתר לגמרי, ואיתו גם הקישור אליו בתפריט. מוסיפים סיור והוא חוזר. העיצוב של שאר הדף לא משתנה.</div>
</section>

<section>
  <h2>5. לוגואים של לקוחות</h2>
  <p>ברצועה ״כבר יצאנו לדרך עם״ הלוגואים נעים לאט, ונעצרים כשמעבירים עליהם עכבר. היא מופיעה באתר מהלוגו הראשון, ועד אז היא מוסתרת.</p>
  ${fig('logos', 'הסקשן ״לוגואים של לקוחות״ בדף הבית.')}
  ${steps('<b>דפים וסקשנים</b> ← <b>דף הבית</b> ← <b>לוגואים של לקוחות</b>.', '<b>״הוספת לוגו״</b> פותח את ספריית התמונות. מעלים את הקובץ ורושמים את שם הארגון.', '<b>פרסום לאתר</b>.')}
  <div class="key"><b>סוג הקובץ:</b> JPG, PNG או WebP. הכי טוב <b>PNG עם רקע שקוף</b>. קובצי SVG לא נתמכים בהעלאה (מטעמי אבטחה), ואפשר להמיר אותם ל-PNG בכל כלי חינמי.</div>
  <div class="note"><b>לפני שמפרסמים:</b> לוודא שהארגון מסכים שהלוגו שלו יופיע באתר.</div>
</section>

<section>
  <h2>6. פניות, סיורים ומדיה</h2>
  <h3>פניות</h3>
  <p>כל מי שמילא טופס באתר מופיע כאן, עם התראה. לוחצים על פנייה כדי להתקשר, לכתוב בוואטסאפ, לשנות סטטוס ולהוסיף הערה. ״פנייה חדשה״ מוסיף פנייה שהגיעה בטלפון, ו״ייצוא לאקסל״ מוריד את כולן.</p>
  ${fig('leads', 'מסך הפניות.')}
  <h3>טיולים</h3>
  <p>כל הסיורים: שם, תיאור, תמונה, משך, תחנות ומועדים. אפשר להוסיף סיור חדש, להסתיר סיור או לשנות את הסדר שלו.</p>
  ${fig('tours', 'מסך הטיולים.')}
</section>

<section>
  <h2>7. תמונות והגדרות</h2>
  <h3>ספריית מדיה</h3>
  <p>כל התמונות של האתר. גוררים לכאן תמונה מהמחשב או מהטלפון, והיא מוקטנת אוטומטית כדי שהאתר יישאר מהיר.</p>
  ${fig('media', 'ספריית המדיה.')}
  <h3>הגדרות אתר</h3>
  <p>קוד כניסה, החלפת סיסמה, טלפון, וואטסאפ, מייל, פייסבוק, הלוגו, ופתיחת האתר לגוגל (בשלב ההשקה).</p>
  ${fig('settings', 'הגדרות האתר.')}
</section>

<section>
  <h2>8. אם משהו לא עובד</h2>
  <table>
    <tr><th>שינוי לא מופיע באתר</th><td>בודקים שלחצתם על ״פרסום לאתר״, ומרעננים את הדף אחרי חצי דקה.</td></tr>
    <tr><th>העליתי תמונה והיא לא נקלטה</th><td>הקובץ צריך להיות JPG, PNG או WebP, עד 3MB.</td></tr>
    <tr><th>הסקשן נעלם</th><td>בדף הסקשנים בודקים שהמתג ״מוצג באתר״ דלוק. בסיורים קרובים ובלוגואים: ודאו שיש לפחות פריט אחד ברשימה.</td></tr>
    <tr><th>שכחתי סיסמה או קוד</th><td>פונים לינאי.</td></tr>
    <tr><th>רוצה לחזור לגרסה קודמת</th><td>״היסטוריה״ בתפריט הצד.</td></tr>
  </table>
</section>
</body></html>`;

const tmp = path.join(shots, 'guide.html'); fs.writeFileSync(tmp, html);
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage(); await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
await b.close(); console.log('pdf', out, fs.statSync(out).size);
