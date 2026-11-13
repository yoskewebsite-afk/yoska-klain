# יוסק׳ה, טיולים, חברה, תרבות. אתר בעברית, RTL (גרסה 10.11.2026)

בנייה מחדש על השפה של viennainhebrew.com (קומפוזיציה, צורות, כפתורים, גלילה), בצבעים, בלוגו ובטיפוגרפיה של ספר המותג.
אתר סטטי: `tools/build_site_v4.py` ← `prototype/`. עיצוב והתנהגות משותפים: `prototype/yoske.css`, `prototype/yoske.js` (GSAP 3.13 + ScrollTrigger + Lenis, מקומיים).
מקור דף הבית: `site-src/v4/home.html`. נתוני הסיורים והטקסטים המשפטיים: `tools/build_site.py` (לא שונה, משמש כמקור נתונים).

```bash
python3 tools/build_v4_media.py      # רק אם משנים את תמונת ההירו (צריך את המקור ב-media/commons-originals/)
(cd tools && python3 build_site_v4.py)
python3 tools/serve.py 4190          # http://127.0.0.1:4190/
```

בדיקות (מתוך tools/, עם השרת פועל): `node v4_qa.mjs 1440 900`, `node v4_qa.mjs 390 844`, `node v4_qa.mjs 1440 900 still`, `node v4_interact.mjs` (axe, מקלדת, טופס, טעינה באמצע, שינוי גודל), `node v4_perf.mjs 390 844`, `python3 check_site.py`.
`?still` מציג את הגרסה הסטטית. `window.__hero(0.5)` קופץ לאמצע רצף ההירו. מקורות תמונות: `media/IMAGE_SOURCES.md`. מסירה: `DELIVERY_2026-11-10.md`.
נקודת שחזור לפני הבנייה: התגית `restore/before-vienna-rebuild-2026-11-10`.

---
הגרסאות הקודמות מתועדות למטה לצורך היסטוריה בלבד.

# יוסק׳ה קליין — אתר בעברית, RTL (גרסה 16.10.2026)

אתר סטטי: גנרטור Python (`tools/build_site.py`) ← `prototype/`. GSAP 3.13 + ScrollTrigger מקומיים לתנועה. מסמכים בתוקף: `DESIGN.md`, `COPY.he.md`, `STORYBOARD.md`, `DELIVERY_2026-10-16.md`.

```bash
python3 tools/build_site.py
python3 -m http.server 4190 --bind 127.0.0.1 --directory prototype
```

בדיקות (מתוך tools/, עם השרת פועל): `node scene_qa.mjs 1440 900`, `node scene_qa.mjs 390 844`, `node interact_qa.mjs`, `node perf_qa.mjs 390 844 mobile throttle`, `python3 check_site.py`.
`?still` מציג את הגרסה הסטטית. `window.__scene(0.5)` קופץ לנקודה בסצנה A.

---
הגרסה הקודמת (נדחתה) מתועדת למטה לצורך היסטוריה בלבד.

# יוסק׳ה קליין — אתר בעברית, RTL

13 sections built from the supplied 15 October compositions, using live text and individual original photographs. A static website with no runtime dependencies, local Karantina/Heebo fonts, native scroll, two desktop sticky sequences, and reduced-motion/mobile alternatives. Existing tour detail pages, group page and gallery are retained.

## Local preview

From the project root:

```bash
python3 -m http.server 4181 --bind 127.0.0.1 --directory prototype
```

Open http://127.0.0.1:4181/ . The existing server at this address was verified during handoff. The website is local, not publicly deployed. `?still` shows the final static compositions without scrubbing.

## Source and production output

- `site-src/home.html`: all homepage copy and semantic sections.
- `prototype/styles.css`: shared design, responsive layouts and reduced-motion presentation.
- `prototype/app.js`: native motion scheduler, carousel, accordions, matcher and WhatsApp enquiry preparation.
- `tools/build_site.py`: static generator and retained business/tour data. Generates the deployable `prototype/` folder.
- `tools/build_journey_media.py`: small portrait and authentic sky-crop derivatives.
- `WEBSITE_COPY_HE.md`: separately saved rewritten Hebrew copy.
- `REFERENCE_MAP_2026-10-15.md`: attachment-to-section map, typography and asset substitutions.
- `DELIVERY_2026-10-15.md`: verification and remaining business details.

Build and validate:

```bash
python3 tools/build_site.py
(cd tools && python3 check_site.py)
node --check prototype/app.js
```

Browser checks use the already installed Chromium and Playwright dependency:

```bash
(cd tools && node journey_qa.mjs)
(cd tools && node journey_finish.mjs)
(cd tools && node journey_visual.mjs)
```

Screenshots and JSON evidence: `tools/output/playwright/journey/`. The prior homepage implementation is preserved in `_archive/2026-10-15-before-journey/`. Existing sources and unrelated files remain available.

## Forms

The three-step matcher keeps choices only in page memory. It suggests an existing tour from the selected interest and includes group and pace preferences in the WhatsApp draft. This does not reserve a place or confirm availability. The contact form validates details, shows the prepared text and provides a link to open WhatsApp. No message is sent automatically and no backend stores enquiries.
