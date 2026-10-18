"""Contact sheet of captured reference states: python3 ref_sheet.py <dir> <prefix> <out.jpg>"""
import sys, glob, os
from PIL import Image, ImageDraw
d, pre, out = sys.argv[1:4]
fs = sorted(glob.glob(os.path.join(d, pre + '-*.jpg')))
W, H, cols = 480, 300, 4
rows = (len(fs) + cols - 1) // cols
s = Image.new('RGB', (W * cols, (H + 16) * rows), 'white'); dr = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    im = Image.open(f); im.thumbnail((W - 4, H - 4)); x, y = (i % cols) * W, (i // cols) * (H + 16)
    s.paste(im, (x + 2, y + 2)); dr.text((x + 4, y + H), os.path.basename(f), fill='black')
s.save(out, quality=78)
