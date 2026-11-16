"""Hero background for the 16.11.2026 hero (Yoske right, gardens rising from below, CTA anchored over the dome).
Source: prototype/assets/v4/hero-wide-2160.webp (Commons "Baha'i gardens in Haifa 39.jpg", Guillaume Paumier, CC BY 3.0,
sky already removed). Steps: remove the hotel (top left) and the villa (top right) above the tree line, then widen the scene
by mirroring the outer garden strips with a soft cross-fade, so the gardens fill any screen while the Shrine stays centred.
Writes prototype/assets/hero26/garden-{1600,2400,3600}.webp and prints the dome anchor (fractions of the output)."""
from PIL import Image, ImageFilter
import numpy as np, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
src = Image.open(ROOT / 'prototype/assets/v4/hero-wide-2160.webp').convert('RGBA')
a = np.array(src).astype(np.int16)
H, W = a.shape[:2]
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
leaf = (al > 0) & (g >= r + 2) & (g >= b + 2) & ((g - np.minimum(r, b)) > 8)

def clear_above_trees(x0, x1, ymax, run=16, win=21):
    tops = []
    for x in range(x0, x1):
        col = leaf[:ymax, x]; top = ymax; cnt = 0
        for y in range(ymax):
            cnt = cnt + 1 if col[y] else 0
            if cnt >= run: top = y - run + 1; break
        tops.append(top)
    tops = np.array(tops)
    # a skyline has no spikes: a running median removes posts, antennas and leftover building edges
    pad = np.pad(tops, win // 2, mode='edge')
    sm = np.array([np.median(pad[i:i + win]) for i in range(len(tops))]).astype(int)
    for i, x in enumerate(range(x0, x1)):
        a[:sm[i], x, 3] = 0

clear_above_trees(0, 500, 340, run=10, win=5)   # hotel: a first, generous cut above the tree line
# then keep the real tree silhouettes in that band: only leaf pixels survive, specks are removed (open = min then max)
band = (slice(0, 360), slice(0, 520))
keep = (leaf[band] & (a[band][..., 3] > 0)).astype(np.uint8) * 255
km = Image.fromarray(keep).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
km = np.array(km).astype(np.int16)
below = np.zeros_like(km); below[300:, :] = 255     # the lowest rows are all garden (wall, lamps, trees): untouched
a[band][..., 3] = np.minimum(a[band][..., 3], np.maximum(km, below))
# smooth the new skyline a little (alpha only)
alpha = Image.fromarray(a[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
a[..., 3] = np.minimum(a[..., 3], np.array(alpha).astype(np.int16) + 40)
a[:235, :520, 3] = 0                                  # stray leaf specks high above the canopy
clean = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
CUT = 150                                             # the hotel's lowest floors show through the trees at the far left
clean = clean.crop((CUT, 0, W - CUT, H)); W = W - 2 * CUT

EXT = 600                              # px added on each side
out = Image.new('RGBA', (W + 2 * EXT, H), (0, 0, 0, 0))
left = clean.crop((0, 0, EXT, H)).transpose(Image.FLIP_LEFT_RIGHT)
right = clean.crop((W - EXT, 0, W, H)).transpose(Image.FLIP_LEFT_RIGHT)
out.alpha_composite(left, (0, 0)); out.alpha_composite(right, (W + EXT, 0)); out.alpha_composite(clean, (EXT, 0))
# the mirrored strips sit a little lower and darker so the repeat reads as more hillside, not a copy
for x0, strip in ((0, left), (W + EXT, right)):
    s = np.array(out.crop((x0, 0, x0 + EXT, H))).astype(np.float32)
    s[..., :3] *= 0.93
    out.paste(Image.fromarray(s.clip(0, 255).astype(np.uint8)), (x0, 0))
dst = ROOT / 'prototype/assets/hero26'; dst.mkdir(parents=True, exist_ok=True)
OW = out.width
for w in (1600, 2400, 3600):
    out.resize((w, round(H * w / OW)), Image.LANCZOS).save(dst / f'garden-{w}.webp', quality=82, method=6)
# dome: finial tip ~ (1074, 392) and the entrance gate ~ (1074, 1380) in the source
print('size', OW, H, 'anchor x', round((EXT + 1074 - CUT) / OW, 4), 'finial y', round(392 / H, 4), 'gate y', round(1380 / H, 4))
