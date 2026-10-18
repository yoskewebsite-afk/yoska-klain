"""Builds the demo's image layers from the ORIGINAL photographs.

Run from the tools/ directory:  python3 build_assets.py

Honest notes on what is real and what is synthetic:
- Yoske: original pixels of assets/yoske-real-haifa.jpg + an alpha mask. Never
  liquified, slimmed, mirrored or resized non-uniformly.
- The scene is the same photograph cut into depth layers (sky+sea / city / near
  foreground). This is a 2.5D separation of one flat photo, not 3D geometry.
- Wherever a nearer layer used to cover a farther one, the farther one is filled by
  inpainting. Those fills are SYNTHETIC. The largest one is the area behind Yoske.
- Layers are upscaled 1.5x (Lanczos) only so a 1080p recording is not interpolated
  by the browser; this adds no real detail.
- The cards are crops of original photographs. Nothing is generated.
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove

SRC = Path('../assets')
OUT = Path('../prototype/assets')
OUT.mkdir(parents=True, exist_ok=True)
UP = 1.5


def up(arr):
    h, w = arr.shape[:2]
    return cv2.resize(arr, (round(w * UP), round(h * UP)), interpolation=cv2.INTER_LANCZOS4)


def save_rgba(arr, name, q=90):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(OUT / name, quality=q, method=6)


def save_jpg(arr, name, q=86):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(OUT / name, quality=q, optimize=True, progressive=True)


# ---------------------------------------------------------------- Yoske cutout
photo = Image.open(SRC / 'yoske-real-haifa.jpg').convert('RGB')
W, H = photo.size
rgb = np.array(photo)
cut = remove(photo, session=new_session('u2net'), alpha_matting=True,
             alpha_matting_foreground_threshold=240,
             alpha_matting_background_threshold=15, alpha_matting_erode_size=6)
alpha = np.array(cut)[:, :, 3].astype(np.float32)
# The matting left the lower shirt semi-transparent: restore it with a polygon traced
# on the real shirt edge (no reshaping of the body).
poly = Image.new('L', (W, H), 0)
ImageDraw.Draw(poly).polygon([(853, 705), (830, 820), (807, 960), (1012, 960), (1012, 705)], fill=255)
alpha = np.maximum(alpha, np.array(poly.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32))
alpha[alpha < 10] = 0
alpha = np.clip(alpha, 0, 255).astype(np.uint8)
ys, xs = np.where(alpha > 0)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
save_rgba(up(np.dstack([rgb, alpha])[y0:y1, x0:x1]), 'yoske-cutout.webp', 92)
print('cutout bbox (1440x960 coords):', x0, y0, x1, y1)


def inpaint(img_rgb, mask, radius=6, soften=9):
    """Telea fill; the deep interior of big holes is softened so it reads as out of focus."""
    m8 = (mask > 0).astype(np.uint8)
    out = cv2.inpaint(np.ascontiguousarray(img_rgb[:, :, ::-1]), m8 * 255, radius, cv2.INPAINT_TELEA)[:, :, ::-1].astype(np.float32)
    deep = cv2.GaussianBlur(cv2.erode(m8, np.ones((31, 31), np.uint8)).astype(np.float32), (0, 0), 8)[:, :, None]
    return out * (1 - deep) + cv2.GaussianBlur(out, (0, 0), soften) * deep


# ---------------------------------------------------------------- scene without Yoske
hole = cv2.dilate((alpha > 8).astype(np.uint8), np.ones((9, 9), np.uint8))
clean = inpaint(rgb, hole)
m = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 1.5)[:, :, None]
clean = rgb * (1 - m) + clean * m

# ---------------------------------------------------------------- depth layers
# near foreground: railing, bushes and dry branches at the lookout (hand-traced)
fore_poly = Image.new('L', (W, H), 0)
ImageDraw.Draw(fore_poly).polygon(
    [(0, 708), (150, 730), (215, 700), (330, 672), (430, 690), (520, 700), (585, 655),
     (690, 628), (790, 640), (845, 700), (860, 960), (0, 960)], fill=255)
fore_a = np.array(fore_poly.filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
save_rgba(up(np.dstack([clean, fore_a])), 'layer-fore.webp', 88)

# city: everything below the breakwater line, with the foreground filled in behind
xx = np.arange(W)[None, :].repeat(H, 0)
yy = np.arange(H)[:, None].repeat(W, 1)
yb = np.where(xx < 800, 500 - 0.045 * xx, 464)
city_a = np.clip((yy - yb) / 16, 0, 1) * 255
# under the foreground the city is continued by mirroring the rows just above it
# (synthetic, only seen for a moment while the foreground slides away), then softened
fm = cv2.dilate((fore_a > 20).astype(np.uint8), np.ones((7, 7), np.uint8))
city_rgb = clean.copy()
for x in range(W):
    col = np.where(fm[:, x])[0]
    if col.size:
        t = col.min()
        n = H - t
        top = int(yb[0, x]) + 40
        L = max(t - top, 8)
        k = np.arange(n) % (2 * L)
        src = np.clip(t - 1 - np.where(k < L, k, 2 * L - 1 - k), 0, H - 1)  # ping-pong inside the city band
        city_rgb[t:, x] = clean[src, x]
fmf = cv2.GaussianBlur(fm.astype(np.float32), (0, 0), 4)[:, :, None]
city_rgb = city_rgb * (1 - fmf) + cv2.GaussianBlur(city_rgb, (0, 0), 11) * fmf
# behind Yoske there is no real picture: keep it as a soft, out-of-focus fill
hm = cv2.GaussianBlur(cv2.erode(hole, np.ones((15, 15), np.uint8)).astype(np.float32), (0, 0), 10)[:, :, None]
city_rgb = city_rgb * (1 - hm) + cv2.GaussianBlur(city_rgb, (0, 0), 22) * hm
save_rgba(up(np.dstack([city_rgb, city_a])), 'layer-city.webp', 88)

# sky + sea: rows are near-uniform, so the hole behind Yoske is bridged row by row,
# and the land area is replaced by a continuation of the sea so nothing doubles
sea = rgb.astype(np.float32).copy()
for y in range(H):
    cols = np.where(hole[y])[0]
    if cols.size:
        a, b = cols.min(), cols.max()
        left = sea[y, max(a - 14, 0):max(a - 2, 1)].mean(axis=0)
        right = sea[y, b + 3:b + 15].mean(axis=0) if b + 15 < W else left
        t = np.linspace(0, 1, b - a + 1)[:, None]
        sea[y, a:b + 1] = left * (1 - t) + right * t
hb = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 3)[:, :, None]
sea = sea * (1 - hb) + cv2.GaussianBlur(sea, (0, 0), 3) * hb
for x in range(W):
    b = int(yb[0, x])
    sea[b - 4:, x] = sea[b - 34:b - 6, x].mean(axis=0)
sea[440:] = cv2.GaussianBlur(sea, (0, 0), 6)[440:]
grain = np.random.default_rng(3).normal(0, 1.4, sea.shape[:2])[:, :, None]
sea += grain * np.maximum(hb, (yy > 440)[:, :, None])
save_jpg(up(sea), 'layer-sky.jpg', 88)

# soft version of the whole scene: the out-of-focus world behind the photo chapter
# (only the real part of the picture: sky, bay, port and the first rows of the city)
soft = cv2.GaussianBlur(clean[0:660, 0:1056], (0, 0), 13)
save_jpg(cv2.resize(soft, (960, 600), interpolation=cv2.INTER_AREA), 'haifa-soft.jpg', 84)

# a single frame of the untouched photograph for the flow layout
save_jpg(rgb, 'lookout-full.jpg', 86)

# ---------------------------------------------------------------- haze wisp (procedural)
def fractal(w, h, seed, octaves=6, base=4):
    r = np.random.default_rng(seed)
    acc, amp, total = np.zeros((h, w), np.float32), 1.0, 0.0
    for o in range(octaves):
        gw, gh = base * 2 ** o + 1, max(2, int(base * 2 ** o * h / w)) + 1
        acc += cv2.resize(r.random((gh, gw)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC) * amp
        total += amp
        amp *= 0.52
    return acc / total

n = fractal(1800, 520, 23)
n = (n - n.min()) / (n.max() - n.min())
band = np.sin(np.clip(np.linspace(0, 1, 520), 0, 1) * np.pi)[:, None] ** 1.6
a = cv2.GaussianBlur(np.clip(n * 1.7 - 0.72, 0, 1) * band, (0, 0), 6)
save_rgba(np.dstack([np.full_like(a, 255), np.full_like(a, 252), np.full_like(a, 246), a * 255]), 'haze-wisp.webp', 80)

# ---------------------------------------------------------------- photographs (crops only)
def crop(src, name, box, width):
    im = Image.open(SRC / src).convert('RGB')
    if box:
        im = im.crop(box)
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / name, quality=85, optimize=True, progressive=True)

crop('travel-group-streetart.jpg', 'group-streetart.jpg', None, 1920)
crop('guiding-group.jpg', 'card-kids.jpg', (0, 430, 1080, 1870), 720)
crop('yoske-real-haifa.jpg', 'card-lookout.jpg', (640, 0, 1360, 960), 720)
crop('yoske-real-haifa.jpg', 'card-bay.jpg', (95, 150, 530, 730), 620)
crop('travel-group-streetart.jpg', 'card-mural.jpg', (540, 22, 905, 508), 620)
print('done')
