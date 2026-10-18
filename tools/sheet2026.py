"""Contact sheet: python3 sheet2026.py <prefix> -> references/2026-10-16/_sheet-<prefix>.jpg"""
import sys, glob, os
from PIL import Image, ImageDraw
d = os.path.join(os.path.dirname(__file__), '../references/2026-10-16')
pre = sys.argv[1]
fs = sorted(glob.glob(f'{d}/{pre}-[0-9]*.jpg'))
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 4
w = 360
ims = [Image.open(f) for f in fs]
h = int(ims[0].height * w / ims[0].width)
S = Image.new('RGB', (cols * (w + 6), ((len(ims) + cols - 1) // cols) * (h + 22)), 'white')
for i, im in enumerate(ims):
    x, y = (i % cols) * (w + 6), (i // cols) * (h + 22)
    S.paste(im.resize((w, h)), (x, y + 18)); ImageDraw.Draw(S).text((x + 4, y + 3), os.path.basename(fs[i]), fill='black')
S.save(f'{d}/_sheet-{pre}.jpg', quality=70); print(f'{d}/_sheet-{pre}.jpg', len(ims))
