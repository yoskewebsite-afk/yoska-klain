import sys, glob
from PIL import Image
d, pat, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3
fs = sorted(glob.glob(f'{d}/{pat}'))
im0 = Image.open(fs[0]); W = 480 if im0.width > im0.height else 220; H = int(im0.height * W / im0.width)
S = Image.new('RGB', (cols * (W + 4), ((len(fs) + cols - 1) // cols) * (H + 4)), 'white')
for i, f in enumerate(fs): S.paste(Image.open(f).resize((W, H)), ((i % cols) * (W + 4), (i // cols) * (H + 4)))
S.save(f'{d}/_sheet.jpg', quality=82); print(len(fs), f'{d}/_sheet.jpg')
