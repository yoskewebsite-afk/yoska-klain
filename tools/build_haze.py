"""Soft atmospheric mist bank for scene A (replaces haze-wisp.webp, whose alpha had hard rectangular edges).
Procedural: many blurred ellipses, feathered to zero on every edge. Output prototype/assets/mist.webp (1800x620, RGBA)."""
import random
from PIL import Image, ImageDraw, ImageFilter
random.seed(7)
W, H = 1800, 620
a = Image.new('L', (W, H), 0); d = ImageDraw.Draw(a)
for _ in range(70):
    cx = random.uniform(.05, .95) * W; cy = random.uniform(.45, 1.0) * H
    rx = random.uniform(90, 260); ry = rx * random.uniform(.35, .6)
    v = int(random.uniform(90, 200) * (0.55 + 0.45 * cy / H))
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=v)
a = a.filter(ImageFilter.GaussianBlur(42))
# feather every edge to zero
f = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(f)
fd.rounded_rectangle([W * .08, H * .22, W * .92, H * 1.3], radius=260, fill=255)
f = f.filter(ImageFilter.GaussianBlur(110))
from PIL import ImageChops
a = ImageChops.multiply(a, f)
img = Image.new('RGBA', (W, H), (250, 251, 252, 0)); img.putalpha(a)
img.save('prototype/assets/mist.webp', quality=82, method=6)
print('mist.webp', img.size)
