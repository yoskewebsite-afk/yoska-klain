"""Media for the 10.11.2026 rebuild (reference: viennainhebrew.com).

Run from the project root:  python3 tools/build_v4_media.py
Source: media/commons-originals/Bahai_gardens_in_Haifa_39.jpg (Wikimedia Commons, CC BY 3.0, see media/IMAGE_SOURCES.md).
Output (prototype/assets/v4/):
  hero-wide-{960,1440,2160}.webp   the Shrine and the upper terraces, sky removed (alpha) for the desktop layering
  hero-tall-{640,960,1280}.webp    the full axis of the terraces, sky removed, for phones
The sky is detected by colour and kept only above the per-column horizon, so no building is cut by colour.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'media/commons-originals/Bahai_gardens_in_Haifa_39.jpg'
OUT = ROOT / 'prototype/assets/v4'
OUT.mkdir(parents=True, exist_ok=True)

im = cv2.imread(str(SRC))
H, W = im.shape[:2]
top = im[:1700].astype(np.float32)
b, g, r = top[..., 0], top[..., 1], top[..., 2]
lum = (r + g + b) / 3
sky = (((b >= r - 4) & (b >= g - 10) & (lum > 150)) | ((lum > 215) & (np.abs(r - b) < 30))).astype(np.uint8)
run = cv2.erode(1 - sky, np.ones((8, 1), np.uint8), anchor=(0, 0))
m = np.zeros_like(sky)
for x in range(W):
    ys = np.flatnonzero(run[:, x])
    y0 = ys[0] if len(ys) else top.shape[0]
    m[:y0, x] = sky[:y0, x]
n, lab = cv2.connectedComponents(m)
m = np.isin(lab, list(set(np.unique(lab[0])) - {0})).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
alpha = np.full((H, W), 255, np.uint8)
alpha[:1700] = (1 - m) * 255
alpha = cv2.GaussianBlur(cv2.erode(alpha, np.ones((3, 3), np.uint8)), (5, 5), 0)
rgba = np.dstack([cv2.cvtColor(im, cv2.COLOR_BGR2RGB), alpha])
full = Image.fromarray(rgba, 'RGBA')


def save(img, name, widths, q=80):
    for w in widths:
        h = round(img.height * w / img.width)
        img.resize((w, h), Image.LANCZOS).save(OUT / f'{name}-{w}.webp', quality=q, method=6)
        print(name, w, h)


wide = (0, 0, W, 1880)              # sky, the hotel roof, the Shrine and the first terraces: about 3:2
save(full.crop(wide), 'hero-wide', (960, 1440, 2160))
tall = (0, 0, W, 3900)              # the whole axis, down to the lower gate
save(full.crop(tall), 'hero-tall', (640, 960, 1280))
