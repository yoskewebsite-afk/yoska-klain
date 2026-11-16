# חיבור Supabase ו-Vercel (שלב אחר שלב)

המערכת שומרת תוכן, טיולים, פניות, תמונות וגיבויים ב-Supabase. בלי החיבור, האתר הציבורי ממשיך לעבוד אבל מסך הניהול כבוי.

## 1. פרויקט Supabase
1. נכנסים ל-supabase.com, פותחים חשבון ויוצרים פרויקט חדש (אזור קרוב, למשל Frankfurt). שומרים את סיסמת מסד הנתונים.
2. בתפריט **SQL Editor** ← New query, מדביקים את כל `backend/migrations/001_init.sql` ולוחצים Run. הסקריפט יוצר את הטבלה `kv`, נועל אותה ל-API הציבורי, ויוצר שני buckets: `media` (ציבורי) ו-`backups` (פרטי). אפשר להריץ אותו שוב בלי נזק.
3. בתפריט **Project Settings ← API** מעתיקים:
   - **Project URL** ← `SUPABASE_URL`
   - **service_role key** (הסודי, לא ה-anon) ← `SUPABASE_SERVICE_ROLE_KEY`. אסור להדביק אותו בקוד, בצ׳אט או בדפדפן.

## 2. משתני סביבה ב-Vercel
Project ← Settings ← Environment Variables (לסמן Production ו-Preview):

| משתנה | ערך |
|---|---|
| `SUPABASE_URL` | הכתובת מהשלב הקודם |
| `SUPABASE_SERVICE_ROLE_KEY` | מפתח ה-service_role |
| `SESSION_SECRET` | מחרוזת אקראית ארוכה (`openssl rand -hex 32`) |
| `ADMIN_SETUP_TOKEN` | קוד חד-פעמי להקמת המנהל הראשון |
| `CRON_SECRET` | מחרוזת אקראית, מפעילה את הגיבוי היומי |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | להתראות לטלפון: `node tools/gen_vapid.mjs` מייצר את שלושתם (`VAPID_SUBJECT=mailto:כתובת-המייל-שלך`) |
| `NOTIFY_WEBHOOK_URL` | אופציונלי: Slack/Make/Zapier |
| `RESEND_API_KEY`, `NOTIFY_FROM` | אופציונלי: התראות במייל |

אחרי שינוי משתנים צריך לפרוס מחדש.

## 3. פריסה ובדיקה
1. Preview קודם: `vercel` (או דחיפה לענף). בודקים: `/` נטען עם העיצוב, `/admin` מציג כניסה, `/api/health` מחזיר `"store":"supabase"`.
2. נכנסים ל-`/admin`, מזינים את `ADMIN_SETUP_TOKEN`, שם, מייל וסיסמה (10 תווים לפחות). אחרי היצירה הקוד נסגר.
3. עורכים כותרת בדף הבית, שומרים טיוטה, ״תצוגה מקדימה״, ״פרסום לאתר״, ורואים את השינוי באתר תוך כחצי דקה.
4. שולחים פנייה מהטופס באתר ורואים אותה במסך ״פניות״.
5. רק אז מקדמים לייצור, ופותחים לגוגל בהגדרות האתר (כתובת אתר מלאה + ״פתוח לגוגל״).

## 4. אפליקציה והתראות בטלפון של יוסי
ראו `PHONE_APP_GUIDE.md`. ההודעה הקופצת בצד המסך עובדת בלי שום הגדרה כשהמערכת פתוחה. התראה כשהאפליקציה סגורה דורשת את מפתחות ה-VAPID.
