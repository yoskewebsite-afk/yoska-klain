"""21.11.2026 (owner, via the partner): the phone hero photo without the hotel (top left) and the villa (top right).
Source: prototype/assets/v4/hero-tall-1280.webp (sky already transparent). The two buildings stand above the tree line
in the top band; that band is cleared on both sides (the canopy in front of the hotel's base stays, its edge feathered),
so the photo keeps its full height and the Shrine keeps its place under the tree line.
Writes prototype/assets/v4/hero-tall-nh-{640,960,1280}.webp (new names: /assets is cached for a year)."""
from PIL import Image, ImageFilter
import numpy as np, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
src = Image.open(ROOT / 'prototype/assets/v4/hero-tall-1280.webp').convert('RGBA')
a = np.array(src).astype(np.int16)
H, W = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
leaf = (g >= r + 2) & (g >= b + 2) & ((g - np.minimum(r, b)) > 8)
mask = np.full((H, W), 255, np.uint8)
# (x0, x1, clear above, feather band): above `y0` everything goes, in y0..y1 only foliage survives
for x0, x1, y0, y1 in ((0, 330, 140, 182), (1090, W, 228, 262)):
    mask[:y0, x0:x1] = 0
    band = leaf[y0:y1, x0:x1].astype(np.uint8) * 255
    band = np.array(Image.fromarray(band).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)))
    mask[y0:y1, x0:x1] = np.minimum(mask[y0:y1, x0:x1], band)
# the villa's left wing and the speck on the far left
mask[:236, 1066:1096] = np.minimum(mask[:236, 1066:1096], np.linspace(255, 0, 30).astype(np.uint8)[None, :])
mask[:175, :70] = 0
# a soft hand-over between the cleared sides and the untouched middle
m = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(1.6))
a[..., 3] = np.minimum(a[..., 3], np.array(m).astype(np.int16))
out = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
for w in (640, 960, 1280):
    out.resize((w, round(H * w / W)), Image.LANCZOS).save(ROOT / f'prototype/assets/v4/hero-tall-nh-{w}.webp', quality=84, method=6)
print('ok', W, H, 'ratio', round(W / H, 5))
