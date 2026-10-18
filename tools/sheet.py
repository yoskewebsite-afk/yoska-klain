"""python3 sheet.py out.jpg cols thumbW file1 file2 ...  — labelled contact sheet"""
import sys, os
from PIL import Image, ImageDraw
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); fs = sys.argv[4:]
ims = [Image.open(f) for f in fs]
th = max(int(tw * im.height / im.width) for im in ims)
rows = (len(fs) + cols - 1) // cols
s = Image.new('RGB', (cols * tw, rows * (th + 18)), 'white'); d = ImageDraw.Draw(s)
for i, (f, im) in enumerate(zip(fs, ims)):
    im = im.copy(); im.thumbnail((tw - 4, th)); x, y = (i % cols) * tw, (i // cols) * (th + 18)
    s.paste(im, (x + 2, y)); d.text((x + 4, y + th + 3), os.path.basename(f), fill='black')
s.save(out, quality=82)
