"""Opening-scene layers from ONE original photograph (run from tools/: python3 build_scene.py).

Source: media/facebook-originals/fb-845822378219479.jpg (3013x1392), the lookout over Haifa bay,
https://www.facebook.com/photo/?fbid=845822378219479 . Cropped to x 1250-3013 so the visitors standing
on the left of the terrace are outside the frame (no person is altered or removed: they are cropped).

What is real and what is synthetic:
- hero-fore.webp: original pixels of the railing, the stone terrace and the trees right behind the
  railing, cut out with a hand-placed band + luminance threshold, largest connected part only. Nothing is painted.
- hero-plate.jpg: the same photo. Under the foreground the pixels are INPAINTED (OpenCV Telea) and
  therefore synthetic. The motion is choreographed so this area leaves the bottom of the frame before the
  railing fades: the inpainted pixels are not meant to be seen.
This is a 2.5D separation of one flat photo into two planes. It is not a 3D model.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

SRC = Path('../media/facebook-originals/fb-845822378219479.jpg')
OUT = Path('../prototype/assets/scene'); OUT.mkdir(parents=True, exist_ok=True)
X0 = 1250
im = np.array(Image.open(SRC).convert('RGB'))[:, X0:]
H, W = im.shape[:2]


def poly(pts):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(pts, fill=255); return np.array(m) > 0


top = [(0, 826), (400, 868), (800, 902), (1000, 921), (1200, 941), (1763, 1000)]   # top rail of the railing
terr = [(0, 1040), (400, 1110), (800, 1180), (1100, 1240), (1500, 1320), (1763, 1370)]  # edge of the terrace
band = poly(top + [(W, H), (0, H)])
meander = band & ~poly([(x, y + 75) for x, y in top] + [(W, H), (0, H)])
lower = band & ~meander
lum = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(int)
mask = (meander & (lum < 52)) | (lower & (lum < 78)) | poly(terr + [(W, H), (0, H)])
handrail = poly([(1120, 1070), (1360, 965), (1395, 962), (1470, 1000), (1470, H), (1425, H), (1440, 1020), (1390, 995), (1140, 1100)])
mask |= handrail & (lum < 200)
m = mask.astype(np.uint8) * 255
# keep only what is physically attached to the railing/terrace: the largest connected component
n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
keep = 1 + int(np.argmax(st[1:, 4]))
m = np.where(lab == keep, 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(m, (0, 0), 0.7)

hole = cv2.dilate((alpha > 10).astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
plate = cv2.inpaint(np.ascontiguousarray(im[:, :, ::-1]), hole, 9, cv2.INPAINT_TELEA)[:, :, ::-1]


def save(arr, name, width, rgba=False, q=84):
    img = Image.fromarray(arr)
    if width < img.width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    if rgba:
        img.save(OUT / name, quality=q, method=6)
    else:
        img.convert('RGB').save(OUT / name, quality=q, optimize=True, progressive=True)
    print(name, img.size, (OUT / name).stat().st_size // 1024, 'KB')


fore = np.dstack([im, alpha])
# crop the foreground to its bounding rows so the browser decodes less; CSS places it by percentage
y0 = int(np.where(alpha.max(axis=1) > 0)[0].min())
print('foreground starts at row', y0, 'of', H, f'({y0 / H:.4f})')
for suffix, w in (('', W), ('-sm', 1100)):
    save(plate, f'hero-plate{suffix}.jpg', w)
    save(fore[y0:], f'hero-fore{suffix}.webp', w, rgba=True, q=86)
