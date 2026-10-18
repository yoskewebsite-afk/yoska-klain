"""Encodes the captured PNG frames into an H.264 MP4 (yuv420p) with OpenCV / macOS VideoToolbox.
Usage: python3 encode.py <frames_dir> <out.mp4> [fps]"""
import glob
import sys

import cv2

frames_dir, out, fps = sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 30
files = sorted(glob.glob(frames_dir + '/*.png'))
first = cv2.imread(files[0])
h, w = first.shape[:2]
vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'avc1'), fps, (w, h))
if not vw.isOpened():
    sys.exit('H.264 writer is not available in this OpenCV build')
for f in files:
    vw.write(cv2.imread(f))
vw.release()
print(len(files), 'frames ->', out)
