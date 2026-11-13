"""Review screenshots for the reviews wall (11.11.2026).

Source: the folder of review screenshots the user attached (Facebook / Instagram / WhatsApp / a survey), copied as-is
into media/review-shots-originals/ (gitignored, personal data of the reviewers stays out of git history).
Each kept shot is cropped only to remove the phone's own chrome (status bar, app header, comment box, nav bar),
never the review itself, and saved as WebP in prototype/assets/reviews/. Duplicates are skipped.
Writes site-src/v4/review-shots.html (the <li> list the page build drops into the wall).

  python3 tools/build_review_shots.py [source-folder]
"""
import html, json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'media/review-shots-originals'
OUT = ROOT / 'prototype/assets/reviews'
SNIP = ROOT / 'site-src/v4/review-shots.html'

# file, who wrote it (as shown in the shot), where, crop (top, bottom) in source pixels removed
SHOTS = [
    ('Screenshot_20220726-205705_Facebook.jpg', 'שרון ירדני', 'פייסבוק', (0, 0)),
    ('Screenshot_20220726-205836_Facebook.jpg', 'קסניה גרלייב', 'המלצה בפייסבוק', (0, 0)),
    ('Screenshot_20220726-205850_Facebook.jpg', 'ליאב הלפרין', 'המלצה בפייסבוק', (0, 0)),
    ('Screenshot_20220726-220210_Facebook.jpg', 'מאיה נמרי', 'המלצה בפייסבוק', (0, 0)),
    ('Screenshot_20220726-220226_Facebook.jpg', 'מירב רביב', 'המלצה בפייסבוק', (0, 0)),
    ('Screenshot_20220730-213009_Facebook.jpg', 'אפי יוספי', 'המלצה בפייסבוק', (0, 0)),
    ('Screenshot_20221209-041658_Facebook.jpg', 'ורד יאיר ורעומה נחום', 'תגובות בפייסבוק', (292, 300)),
    ('Screenshot_20221013-181337_Facebook.jpg', 'סואלי טולוב', 'פייסבוק', (0, 0)),
    ('Screenshot_20221209-041706_Facebook.jpg', 'ורד יאיר', 'פוסט בפייסבוק', (292, 300)),
    ('Screenshot_20220813-115613_Facebook.jpg', 'שוקי רוק', 'פוסט בפייסבוק', (150, 120)),
    ('Screenshot_20221013-181340_Facebook.jpg', 'קובי רינת', 'פייסבוק', (0, 0)),
    ('Screenshot_20221013-181402_Facebook.jpg', 'נטלי אייזנברג', 'המלצה בפייסבוק', (0, 0)),
    ('Screenshot_20220824-193900_Facebook.jpg', 'חן שכטר', 'פוסט בפייסבוק', (292, 300)),
    ('Screenshot_20221209-041947_Facebook.jpg', 'גל כליל החורש', 'המלצה בפייסבוק', (292, 300)),
    ('Screenshot_20221013-181502_Facebook.jpg', 'קובי ומיקה רינת', 'פוסט בפייסבוק', (0, 0)),
    ('Screenshot_20221013-185927_Facebook.jpg', 'איציק לינדנר', 'פייסבוק', (0, 0)),
    ('Screenshot_20221013-215723_Facebook.jpg', 'חגית לונדנר', 'פייסבוק', (0, 0)),
    ('Screenshot_20221221-133233_Facebook.jpg', 'טלי פרידלר', 'פוסט בפייסבוק', (292, 300)),
    ('Screenshot_20221224-163912_Facebook.jpg', 'שירה כמה דר', 'פוסט בפייסבוק', (292, 300)),
    ('IMG_20220822_140021_783.webp', 'קובי הלפגוט', 'אינסטגרם', (0, 150)),
    ('image (1).png', 'אלישבע רוק', 'פוסט בפייסבוק', (0, 0)),
    ('IMG-20221012-WA0082.jpg', 'סופי כץ, Visit Haifa', 'הודעה', (0, 0)),
    ('IMG-20221013-WA0078.jpg', 'משתתפי סיור', 'משוב מסקר', (0, 0)),
    ('IMG-20221013-WA0079.jpg', 'משתתפי סיור', 'משוב מסקר', (0, 0)),
    ('IMG-20221013-WA0080.jpg', 'משתתפי סיור', 'משוב מסקר', (0, 0)),
]
# skipped on purpose: Screenshot_20220822-135933_Instagram.jpg (same post as IMG_20220822_140021_783.webp),
# image.png (same post as Screenshot_20220824-193900), IMG_20220822_141906_645.webp (same post as 20220813-115613),
# IMG-20221013-WA0081/82/83.jpg (survey bar charts, not reviews).


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = []
    for i, (name, who, where, (top, bottom)) in enumerate(SHOTS, 1):
        im = Image.open(SRC / name).convert('RGB')
        w, h = im.size
        im = im.crop((0, top, w, h - bottom))
        stem = f'r{i:02d}'
        big = im.copy(); big.thumbnail((1080, 2400)); big.save(OUT / f'{stem}.webp', quality=82, method=6)
        sm = im.copy(); sm.thumbnail((480, 1100)); sm.save(OUT / f'{stem}-480.webp', quality=78, method=6)
        items.append((stem, who, where, sm.size, big.size))
    lines = []
    for stem, who, where, (sw, sh), (bw, bh) in items:
        alt = html.escape(f'צילום מסך של ביקורת על יוסק׳ה: {who}, {where}')
        lines.append(
            f'          <li class="rshot"><a class="rshot__a" href="/assets/reviews/{stem}.webp" data-shot '
            f'aria-label="{html.escape(f"להגדלה: ביקורת של {who}")}">'
            f'<img src="/assets/reviews/{stem}-480.webp" srcset="/assets/reviews/{stem}-480.webp {sw}w, /assets/reviews/{stem}.webp {bw}w" '
            f'sizes="(min-width: 700px) 330px, 46vw" width="{sw}" height="{sh}" alt="{alt}" loading="lazy" decoding="async"></a></li>')
    SNIP.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{len(items)} shots ->', OUT.relative_to(ROOT), '+', SNIP.relative_to(ROOT))
    json.dump([{'file': s[0], 'source': n[0]} for s, n in zip(items, SHOTS)], open(OUT / 'sources.json', 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
