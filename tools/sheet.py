"""Contact sheet of QA screenshots. usage: python3 -I sheet.py out.jpg cols scale img1 img2 ..."""
import sys
from PIL import Image
out, cols, scale, *files = sys.argv[1:]
cols, scale = int(cols), float(scale)
ims = [Image.open(f) for f in files]
W, H = int(ims[0].width * scale), int(ims[0].height * scale)
M = Image.new('RGB', (W * cols, H * ((len(ims) + cols - 1) // cols)), 'white')
for i, im in enumerate(ims):
    M.paste(im.resize((W, H)), ((i % cols) * W, (i // cols) * H))
M.save(out, quality=82)
