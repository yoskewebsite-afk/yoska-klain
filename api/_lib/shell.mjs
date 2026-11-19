// The two HTML documents of the admin: sign-in (or first-run setup) and the application shell.
// The app code lives in /admin-app/ (static files with no data in them); every byte of data comes from the authenticated API.
import { createHash } from 'node:crypto';

// runs before first paint so the saved display mode is applied with no flash (its hash is whitelisted in the CSP)
export const THEME_JS = "try{var t=localStorage.getItem('yoske-admin-theme');if(t!=='light'&&t!=='dark'&&t!=='glass')t='glass';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='glass'}";
const HASH = createHash('sha256').update(THEME_JS).digest('base64');
export const ADMIN_CSP = `default-src 'self'; script-src 'self' 'sha256-${HASH}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`;

const head = (title) => `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>${title}</title>
<link rel="icon" href="/assets/brand/symbol.svg" type="image/svg+xml">
<link rel="manifest" href="/admin-app/manifest.webmanifest">
<link rel="apple-touch-icon" href="/admin-app/icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="יוסק׳ה ניהול">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#226649">
<link rel="preload" href="/fonts/heebo-hebrew-300-900.woff2" as="font" type="font/woff2" crossorigin>
<script>${THEME_JS}</script>
<link rel="stylesheet" href="/admin-app/admin.css">
</head>`;

export function appShell() {
  return `${head('ניהול האתר | יוסק׳ה')}
<body>
<div id="app" class="boot" aria-busy="true"><p class="boot__t">טוענים את מערכת הניהול…</p></div>
<link rel="modulepreload" href="/admin-app/ui.js">
<link rel="modulepreload" href="/admin-app/state.js">
<link rel="modulepreload" href="/admin-app/notify.js">
<link rel="modulepreload" href="/admin-app/v-dashboard.js">
<script type="module" src="/admin-app/app.js"></script>
</body>
</html>`;
}

/** mode: login | setup | nostore */
export function loginShell(mode = 'login', { code = false } = {}) {
  return `${head('כניסה לניהול | יוסק׳ה')}
<body class="auth" data-mode="${mode}">
<main class="auth__wrap">
  <section class="auth__card glass" aria-labelledby="t">
    <img class="auth__logo" src="/assets/brand/symbol.svg" width="56" height="56" alt="">
    <p class="auth__sys">ניהול האתר</p>
    <h1 id="t">${mode === 'setup' ? 'הקמת מנהל ראשון' : 'כניסה למערכת הניהול'}</h1>
    ${mode === 'nostore'
      ? `<div class="notice notice--warn" role="status"><strong>מסד הנתונים עדיין לא מחובר.</strong><p>כדי להפעיל את הניהול צריך להגדיר בפריסה את SUPABASE_URL ואת SUPABASE_SERVICE_ROLE_KEY ולהריץ את המיגרציה. הצעדים המדויקים כתובים ב-ADMIN_GUIDE.md. האתר הציבורי ממשיך לעבוד כרגיל.</p></div>`
      : `<form id="f" class="auth__form" novalidate>
      ${mode === 'setup' ? `<div class="fld"><label for="token">קוד הקמה</label><input id="token" name="token" type="password" autocomplete="off" dir="ltr" required></div>
      <div class="fld"><label for="name">שם</label><input id="name" name="name" autocomplete="name" required></div>` : ''}
      ${mode === 'login' && code ? `<div class="seg auth__seg" role="tablist" aria-label="דרך הכניסה"><button class="seg__b" type="button" role="tab" aria-selected="true" data-way="code">עם קוד</button><button class="seg__b" type="button" role="tab" aria-selected="false" data-way="pw">מייל וסיסמה</button></div>
      <div class="fld" data-for="code"><label for="code">הקוד האישי</label><input id="code" name="code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="12" dir="ltr" class="auth__code"></div>` : ''}
      <div class="fld"${mode === 'login' && code ? ' data-for="pw" hidden' : ''}><label for="email">מייל</label><input id="email" name="email" type="email" autocomplete="username" dir="ltr" required></div>
      <div class="fld"${mode === 'login' && code ? ' data-for="pw" hidden' : ''}><label for="password">סיסמה${mode === 'setup' ? ' (10 תווים לפחות)' : ''}</label><input id="password" name="password" type="password" autocomplete="${mode === 'setup' ? 'new-password' : 'current-password'}" dir="ltr" required></div>
      <p class="fld__err" id="err" role="alert" hidden></p>
      <button class="btn btn--primary" type="submit" id="go">${mode === 'setup' ? 'יצירת מנהל' : 'כניסה'}</button>
    </form>`}
  </section>
</main>
<script type="module" src="/admin-app/login.js"></script>
</body>
</html>`;
}
