import sys, glob, os
from PIL import Image, ImageDraw
tag, names = sys.argv[1], sys.argv[2].split(',')
tw = int(sys.argv[3]) if len(sys.argv) > 3 else 480
ims = [(n, Image.open(f'output/story/{tag}-{n}.jpg')) for n in names]
th = round(ims[0][1].height * tw / ims[0][1].width); cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + 8), rows * (th + 26)), 'white'); d = ImageDraw.Draw(S)
for i, (n, im) in enumerate(ims):
    x, y = (i % cols) * (tw + 8), (i // cols) * (th + 26)
    S.paste(im.resize((tw, th)), (x, y + 22)); d.text((x + 4, y + 4), n, fill='black')
S.save(f'output/story/sheet-{tag}-{sys.argv[5] if len(sys.argv)>5 else "a"}.jpg', quality=80)
