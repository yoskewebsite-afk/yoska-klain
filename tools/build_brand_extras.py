"""One-off assets for the pre-launch checklist (rimov-final-checks):
  - assets/brand/rimov-credit-white.webp : the supplied RIMOV logo (black on white PNG) turned into a white,
    transparent-background version so it reads on the navy footer. Shape untouched, only recoloured.
  - assets/brand/og-share-1200x630.jpg   : 1200x630 share image (WhatsApp / Facebook) cropped from the approved
    photo yoske-guiding-view.jpg. No text added, so nothing is invented.
Usage: python3 tools/build_brand_extras.py "<path to the RIMOV logo PNG>"
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / 'prototype'
logo_src = Path(sys.argv[1])

g = ImageOps.grayscale(Image.open(logo_src).convert('RGB'))
alpha = g.point(lambda v: max(0, min(255, int((255 - v) * 1.15))))   # dark ink -> opaque
bbox = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
pad = 6
box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(g.width, bbox[2] + pad), min(g.height, bbox[3] + pad))
alpha = alpha.crop(box)
w = 640
alpha = alpha.resize((w, round(alpha.height * w / alpha.width)), Image.LANCZOS)
out = Image.new('RGBA', alpha.size, (255, 255, 255, 0))
out.putalpha(alpha)
(ROOT / 'assets/brand').mkdir(parents=True, exist_ok=True)
out.save(ROOT / 'assets/brand/rimov-credit-white.webp', quality=90)
print('logo', out.size)

p = Image.open(ROOT / 'assets/photos/yoske-guiding-view.jpg').convert('RGB')
W, H = 1200, 630
top = int((p.height - H) * 0.90)
p.crop((0, top, W, top + H)).save(ROOT / 'assets/brand/og-share-1200x630.jpg', quality=84, optimize=True, progressive=True)
print('og', (W, H))
