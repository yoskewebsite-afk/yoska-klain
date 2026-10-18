from PIL import Image
import numpy as np, cv2
SRC='/Users/yanaimizrahi/Documents/yoske-cinematic-handoff/media/2026-10-18-enhanced/mountain-valley-wide.webp'
im=np.array(Image.open(SRC).convert('RGB')); f=im.astype(np.float32)
H,W=im.shape[:2]
r,g,b=f[...,0],f[...,1],f[...,2]
lum=f.mean(2); sat=f.max(2)-f.min(2)
skyish=((b-r)>28)&(b>140) | ((lum>175)&(sat<55)&((b-r)>-5))
skyish=skyish.astype(np.uint8)
# connected to the top edge
n,lab=cv2.connectedComponents(skyish)
top=set(np.unique(lab[0][skyish[0]>0]))-{0}
sky=np.isin(lab,list(top)).astype(np.uint8)
sky=cv2.morphologyEx(sky,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
# grabcut refine
mask=np.where(sky>0,cv2.GC_PR_BGD,cv2.GC_PR_FGD).astype(np.uint8)
mask[cv2.erode(sky,np.ones((15,15),np.uint8))>0]=cv2.GC_BGD
mask[cv2.erode(1-sky,np.ones((21,21),np.uint8))>0]=cv2.GC_FGD
bgm=np.zeros((1,65));fgm=np.zeros((1,65))
cv2.grabCut(cv2.cvtColor(im,cv2.COLOR_RGB2BGR),mask,None,bgm,fgm,5,cv2.GC_INIT_WITH_MASK)
land=np.where((mask==1)|(mask==3),1,0).astype(np.uint8)
# remove floating land specks in the sky and sky holes deep in land
n,lab,st,_=cv2.connectedComponentsWithStats(land)
keep=np.zeros_like(land)
for i in range(1,n):
    if st[i,cv2.CC_STAT_AREA]>2000: keep[lab==i]=1
land=keep
np.save('land.npy',land)
vis=im.copy(); vis[land==0]=(vis[land==0]*0.3+np.array([255,0,255])*0.7).astype(np.uint8)
Image.fromarray(vis).save('land-vis.jpg',quality=85)
print(land.mean())
