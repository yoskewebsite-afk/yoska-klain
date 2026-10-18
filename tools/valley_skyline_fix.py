from PIL import Image
import numpy as np, cv2
im=np.array(Image.open('/Users/yanaimizrahi/Documents/yoske-cinematic-handoff/media/2026-10-18-enhanced/mountain-valley-wide.webp').convert('RGB'))
land=np.load('land.npy').astype(np.uint8)
H,W=land.shape
sky_line=[(600,300),(650,321),(725,327),(750,337),(765,347),(800,372),(835,387),(865,382),(890,380),(902,370),(920,367),(950,377),(960,382)]
poly=np.array(sky_line+[(960,480),(600,480)],np.int32)
under=np.zeros_like(land); cv2.fillPoly(under,[poly],1)
roi=np.zeros_like(land); roi[290:480,600:962]=1
init=land.copy(); init[roi>0]=under[roi>0]
# grabcut band of +-7px around traced skyline inside ROI
band=cv2.dilate(cv2.Canny(under*255,50,150),np.ones((15,15),np.uint8))>0
gm=np.where(init>0,cv2.GC_FGD,cv2.GC_BGD).astype(np.uint8)
gm[band&(roi>0)&(init>0)]=cv2.GC_PR_FGD
gm[band&(roi>0)&(init==0)]=cv2.GC_PR_BGD
x0,y0,x1,y1=560,260,1000,500
sub=gm[y0:y1,x0:x1].copy()
cv2.grabCut(cv2.cvtColor(np.ascontiguousarray(im[y0:y1,x0:x1]),cv2.COLOR_RGB2BGR),sub,None,np.zeros((1,65)),np.zeros((1,65)),6,cv2.GC_INIT_WITH_MASK)
res=init.copy(); res[y0:y1,x0:x1]=np.where((sub==1)|(sub==3),1,0)
np.save('land2.npy',res)
v=im.copy(); v[res==0]=(v[res==0]*0.35+np.array([255,0,255])*0.65).astype(np.uint8)
Image.fromarray(v[290:470,600:960]).resize((720,360)).save('v-zoom2.png')
