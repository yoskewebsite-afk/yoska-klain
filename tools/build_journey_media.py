"""Reproducible derivatives; preserves source pixels and original portrait proportions."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1] / 'prototype/assets'
im = Image.open(ROOT / 'yoske-cutout.webp')
im.resize((640, round(im.height * 640 / im.width)), Image.Resampling.LANCZOS).save(ROOT / 'yoske-cutout-640.webp', quality=88)
im = Image.open(ROOT / 'approved/haifa-panorama-1920.webp')
im.crop((0, 0, im.width, 500)).save(ROOT / 'journey-sky.webp', quality=84)
