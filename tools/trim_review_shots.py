"""17.11.2026 (partner feedback): trim review screenshots that carried long or unrelated parts around the review itself
(Yoske's own thank-you replies, like/reply bars, "sent from my iPhone", a long survey list).

Crops the published shots in prototype/assets/reviews/ (the originals stay out of git, see build_review_shots.py) and
updates their size in site-src/v4/review-shots.html. Trimmed shots carry a "t" suffix (r07t) so browsers that cached
the old picture for a year (/assets is immutable) load the new one. Idempotent: a shot is cropped only while it still has its
original size.   python3 tools/trim_review_shots.py
"""
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'prototype/assets/reviews'
SNIP = ROOT / 'site-src/v4/review-shots.html'

# stem: (original size of the big file, crop box (left, top, right, bottom) in the big file's pixels, new label or None)
TRIM = {
    'r07t': ((1080, 1131), (0, 650, 1080, 1022), 'רעומה נחום'),     # only Reuma's review; Yoske's reply and the like bars out
    'r20t': ((1080, 611), (0, 74, 1080, 402), None),                 # Yoske's own reply and the time stamp out
    'r22t': ((1080, 713), (0, 0, 1080, 588), None),                  # "sent from my iPhone" out
    'r23t': ((540, 544), (0, 0, 540, 296), None),                    # the first two survey answers, not the whole list
    'r13t': ((1080, 844), (0, 0, 1080, 760), None),                  # trailing hashtag line out
}


def main():
    snip = SNIP.read_text(encoding='utf-8')
    for stem, (orig, box, who) in TRIM.items():
        big = OUT / f'{stem}.webp'
        im = Image.open(big).convert('RGB')
        if im.size == orig:
            im = im.crop(box)
            im.save(big, quality=82, method=6)
            sm = im.copy(); sm.thumbnail((480, 1100)); sm.save(OUT / f'{stem}-480.webp', quality=78, method=6)
        sw, sh = Image.open(OUT / f'{stem}-480.webp').size
        bw = Image.open(big).size[0]
        line = re.search(rf'.*/assets/reviews/{stem}\.webp.*', snip).group(0)
        new = re.sub(r'width="\d+" height="\d+"', f'width="{sw}" height="{sh}"', line)
        new = re.sub(rf'{stem}-480\.webp \d+w, /assets/reviews/{stem}\.webp \d+w', f'{stem}-480.webp {sw}w, /assets/reviews/{stem}.webp {bw}w', new)
        if who:
            new = re.sub(r'ביקורת של [^"]+"', f'ביקורת של {who}"', new)
            new = re.sub(r'(alt="צילום מסך של ביקורת על יוסק׳ה: )[^,]+,', rf'\g<1>{who},', new)
        snip = snip.replace(line, new)
        print(stem, Image.open(big).size)
    SNIP.write_text(snip, encoding='utf-8')


if __name__ == '__main__':
    main()
