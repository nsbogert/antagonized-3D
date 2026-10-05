"""Fit a game-oriented insect skeleton to the supplied Meshy queen; preserve UVs.
Requires numpy and Pillow. The input remains untouched.
"""
import json,struct,io,math,hashlib,sys
from pathlib import Path
import numpy as np
from PIL import Image
SRC=Path(sys.argv[1]);OUT=Path(sys.argv[2]);OUT.parent.mkdir(parents=True,exist_ok=True)
b=SRC.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);blob=b[28+n:]
def readacc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];k={'SCALAR':1,'VEC3':3,'VEC2':2}[a['type']];return np.ndarray((a['count'],k),dtype=dt,buffer=blob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*k),np.dtype(dt).itemsize)).copy()
prim=j['meshes'][0]['primitives'][0];p=readacc(prim['attributes']['POSITION']);norm=readacc(prim['attributes']['NORMAL']);uv=readacc(prim['attributes']['TEXCOORD_0']);tri=readacc(prim['indices']).reshape(-1,3)
# Bind positions are in the source GLB coordinate system (forward +Z).
bones=[];lookup={};segments=[]
def bone(name,at,parent=None):
 idx=len(bones);lookup[name]=idx;bones.append({'name':name,'at':np.array(at,dtype=float),'parent':lookup.get(parent)});return idx
def seg(name,a,b,r):segments.append((lookup[name],np.array(a),np.array(b),r))
bone('Root',(0,0,0));bone('Thorax',(-.075,.115,.20),'Root');bone('Abdomen',(-.055,.10,-.04),'Thorax');bone('Head',(-.075,.13,.405),'Thorax')
seg('Thorax',(-.075,.10,.025),(-.075,.13,.34),.17);seg('Abdomen',(-.04,.1,-.1),(-.005,-.035,-.76),.27);seg('Head',(-.075,.13,.43),(-.06,.075,.67),.145)
legs={
 'L_Front':[(-.16,.07,.35),(-.22,-.095,.44),(-.285,-.05,.615),(-.265,-.245,.825),(-.25,-.30,.94)],
 'R_Front':[(.04,.07,.35),(.13,-.08,.43),(.235,-.055,.59),(.24,-.245,.755),(.25,-.30,.835)],
 'L_Middle':[(-.155,.03,.095),(-.20,.00,.065),(-.385,-.08,-.065),(-.525,-.255,-.155),(-.63,-.325,-.23)],
 'R_Middle':[(.045,.03,.095),(.13,.015,.10),(.345,-.075,.10),(.505,-.26,.10),(.625,-.32,.105)],
 'L_Rear':[(-.105,.02,.025),(-.135,-.045,-.02),(-.205,-.14,-.115),(-.265,-.265,-.215),(-.315,-.33,-.275)],
}
legnames=['Hip','Upper','Lower','Foot']
for name,points in legs.items():
 for k,part in enumerate(legnames):
  bn=name+'_'+part;bone(bn,points[k],'Thorax' if k==0 else name+'_'+legnames[k-1]);seg(bn,points[k],points[k+1],[.055,.064,.065,.038][k])
# A small malformed sixth leg is fused into the underside. Identify it separately.
oldidx=bone('Fused_Rear',(0,.01,0),'Thorax');seg('Fused_Rear',(.025,0,-.005),(.075,-.30,-.32),.033)
for side,sign in [('L',-1),('R',1)]:
 pts=[(-.06+sign*.095,.23,.54),(-.06+sign*.16,.335,.70),(-.06+sign*.24,.13,.90)]
 bone(side+'_Antenna',pts[0],'Head');bone(side+'_AntennaTip',pts[1],side+'_Antenna');seg(side+'_Antenna',pts[0],pts[1],.018);seg(side+'_AntennaTip',pts[1],pts[2],.018)
 bone(side+'_Jaw',(-.055+sign*.055,.03,.64),'Head');seg(side+'_Jaw',(-.055+sign*.06,.03,.64),(-.055+sign*.04,-.015,.735),.046)
# Nearest anatomical capsule gives a region; blending is confined to that chain.
def scores(points):
 ds=[];ts=[]
 for bi,a,z,r in segments:
  v=z-a;t=np.clip(((points-a)*v).sum(axis=1)/(v@v),0,1);d=np.linalg.norm(points-(a+t[:,None]*v),axis=1)/r;ds.append(d);ts.append(t)
 return np.array(ds).T,np.array(ts).T
dist,ts=scores(p);nearest=dist.argmin(axis=1);labels=np.array([segments[i][0] for i in nearest])
# Remove the malformed underside appendage, then mirror the sound rear leg.
oldmask=(labels[tri]==oldidx).sum(axis=1)>=2
# The source foot curls farther back than its fused shin. Capsule competition
# assigned this dangling remnant to the abdomen; remove it by its underside contour.
centers=p[tri].mean(axis=1)
belly_limit=np.interp(centers[:,2],[-.42,-.30,-.20,-.08],[-.205,-.18,-.12,-.08])
remnant=(centers[:,0]>-.005)&(centers[:,0]<.105)&(centers[:,2]>-.405)&(centers[:,2]<-.065)&(centers[:,1]<belly_limit)
oldmask|=remnant
rearids=[lookup['L_Rear_'+part] for part in legnames]
rearfaces=np.isin(labels[tri],rearids).sum(axis=1)>=2
clone=tri[rearfaces&~oldmask];used=np.unique(clone);remap={int(v):i+len(p) for i,v in enumerate(used)}
newp=p[used].copy();newp[:,0]=-.08-newp[:,0];newnorm=norm[used].copy();newnorm[:,0]*=-1
newtri=np.array([[remap[int(v)] for v in f[::-1]] for f in clone],dtype=np.uint32)
p=np.concatenate([p,newp]);norm=np.concatenate([norm,newnorm]);uv=np.concatenate([uv,uv[used]]);tri=np.concatenate([tri[~oldmask],newtri])
legs['R_Rear']=[(-.08-x,y,z) for x,y,z in legs['L_Rear']]
for k,part in enumerate(legnames):
 name='R_Rear_'+part;bone(name,legs['R_Rear'][k],'Thorax' if k==0 else 'R_Rear_'+legnames[k-1]);seg(name,legs['R_Rear'][k],legs['R_Rear'][k+1],[.055,.064,.065,.038][k])
# Remove the placeholder region from weights; the repaired leg now has four joints.
segments=[s for s in segments if s[0]!=oldidx]
dist,ts=scores(p);nearest=dist.argmin(axis=1);labels=np.array([segments[i][0] for i in nearest])
# Explicit labels protect the mirrored foot from being absorbed into the abdomen.
for i,source in enumerate(used):
 source_name=bones[int(labels[int(source)])]['name']
 if source_name.startswith('L_Rear_'):labels[remap[int(source)]]=lookup[source_name.replace('L_Rear','R_Rear')]
weights=np.zeros((len(p),4),dtype=np.float32);joints=np.zeros((len(p),4),dtype=np.uint16)
for i,bi in enumerate(labels):
 joints[i,0]=bi;weights[i,0]=1
 name=bones[int(bi)]['name'];parent=bones[int(bi)]['parent']
 if parent is not None and name not in ('Root','Thorax','Abdomen','Head'):
  d=np.linalg.norm(p[i]-bones[int(bi)]['at']);w=max(0,.45*(1-d/.05))
  joints[i,1]=parent;weights[i,1]=w;weights[i,0]-=w
# Smooth across the surface, welding UV seams so each physical point deforms alike.
# Capsule labels alone leave hard skin-weight jumps across long source triangles.
_,weld=np.unique(np.round(p,5),axis=0,return_inverse=True)
count=int(weld.max())+1
full=np.zeros((len(p),len(bones)),dtype=np.float64)
for slot in range(4):np.add.at(full,(np.arange(len(p)),joints[:,slot]),weights[:,slot])
seeds=np.zeros((count,len(bones)));np.add.at(seeds,weld,full)
seeds/=np.bincount(weld)[:,None]
edges=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]])
edges=np.unique(np.sort(weld[edges],axis=1),axis=0)
edge_a,edge_b=edges[:,0],edges[:,1]
degree=np.bincount(np.r_[edge_a,edge_b],minlength=count)
smoothed=seeds.copy()
for _ in range(16):
 neighbors=np.zeros_like(smoothed)
 np.add.at(neighbors,edge_a,smoothed[edge_b]);np.add.at(neighbors,edge_b,smoothed[edge_a])
 average=neighbors/np.maximum(degree,1)[:,None]
 smoothed=.12*seeds+.88*(.35*smoothed+.65*average)
full=smoothed[weld]
joints=np.argsort(full,axis=1)[:,-4:].astype(np.uint16)
weights=np.take_along_axis(full,joints,axis=1)
weights=(weights/weights.sum(axis=1,keepdims=True)).astype(np.float32)
# The crown is extracted into a separate mesh, retaining the original gold texture.
centers=p[tri].mean(axis=1)
# Gold and emeralds have a distinct texture palette from the red shell spikes.
# Restrict extraction to the band's footprint, then classify several UV samples.
base_image=j['images'][j['textures'][j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
bv=j['bufferViews'][base_image['bufferView']]
base_pic=Image.open(io.BytesIO(blob[bv['byteOffset']:bv['byteOffset']+bv['byteLength']])).convert('RGB')
tex=np.asarray(base_pic,dtype=np.float32)/255
sample_uv=np.stack([uv[tri].mean(axis=1),uv[tri[:,0]]*.6+uv[tri[:,1]]*.2+uv[tri[:,2]]*.2,uv[tri[:,0]]*.2+uv[tri[:,1]]*.6+uv[tri[:,2]]*.2,uv[tri[:,0]]*.2+uv[tri[:,1]]*.2+uv[tri[:,2]]*.6],axis=1)
pixels=tex[np.clip((sample_uv[:,:,1]*tex.shape[0]).astype(int),0,tex.shape[0]-1),np.clip((sample_uv[:,:,0]*tex.shape[1]).astype(int),0,tex.shape[1]-1)]
r,g,blue=pixels[:,:,0],pixels[:,:,1],pixels[:,:,2]
gold=(g>r*.57)&(blue<r*.75);gem=g>r*1.12
palette=(gold|gem).sum(axis=1)>=2
crown_region=(centers[:,1]>.235)&(((centers[:,0]+.075)/.113)**2+((centers[:,2]-.54)/.110)**2<1)&(centers[:,2]<.66)
crownmask=crown_region&palette
removed_crown_shell=int((crown_region&~palette).sum())
crowntri=tri[crownmask];bodytri=tri[~crownmask]
# Close the crown cut with a small rounded shell cap weighted entirely to Head.
cap_p=[];cap_n=[];cap_tri=[]
for ring in range(9):
 theta=math.pi*ring/8
 for sector in range(24):
  phi=2*math.pi*sector/24
  unit=np.array([math.sin(theta)*math.cos(phi),math.cos(theta),math.sin(theta)*math.sin(phi)])
  cap_p.append(np.array([-.075,.227,.54])+unit*np.array([.102,.032,.092]))
  normal=unit/np.array([.102,.032,.092]);cap_n.append(normal/np.linalg.norm(normal))
for ring in range(8):
 for sector in range(24):
  a=ring*24+sector;b=ring*24+(sector+1)%24;c=a+24;d=b+24
  cap_tri.extend([[a,c,b],[b,c,d]])
cap_p=np.array(cap_p);cap_n=np.array(cap_n);cap_tri=np.array(cap_tri)
crown_at=np.array([-.075,.245,.54]);bone('CrownSocket',crown_at,'Head')
# Fresh compact GLB. Texture resizing is a game-delivery optimization, not a source edit.
out={'asset':{'version':'2.0','generator':'Antagonized queen rig builder'},'scene':0,'scenes':[{'nodes':[0,1]}],'nodes':[],'meshes':[],'skins':[],'animations':[],'materials':j['materials'],'textures':j['textures'],'samplers':j.get('samplers',[]),'images':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]};data=bytearray()
def view(raw,target=None):
 while len(data)%4:data.append(0)
 v={'buffer':0,'byteOffset':len(data),'byteLength':len(raw)}
 if target:v['target']=target
 out['bufferViews'].append(v);data.extend(raw);return len(out['bufferViews'])-1
def accessor(array,kind,component=5126,target=None):
 dt={5126:'<f4',5125:'<u4',5123:'<u2'}[component];a=np.asarray(array,dtype=dt);a=a.reshape(-1,{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[kind]);v=view(a.tobytes(),target);acc={'bufferView':v,'componentType':component,'count':len(a),'type':kind}
 if kind in ('SCALAR','VEC3'):acc.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
 out['accessors'].append(acc);return len(out['accessors'])-1
for im in j['images']:
 bv=j['bufferViews'][im['bufferView']];pic=Image.open(io.BytesIO(blob[bv['byteOffset']:bv['byteOffset']+bv['byteLength']])).convert('RGB');pic.thumbnail((2048,2048),Image.Resampling.LANCZOS);buf=io.BytesIO();pic.save(buf,format='PNG',optimize=True);out['images'].append({'bufferView':view(buf.getvalue()),'mimeType':'image/png','name':im.get('name','texture')})
out['nodes']=[{'name':'QueenAnt','mesh':0,'skin':0},{'name':'QueenArmature','children':[2]}]
for i,bo in enumerate(bones):
 parent=bo['parent'];translation=bo['at']-(bones[parent]['at'] if parent is not None else 0)
 no={'name':bo['name'],'translation':translation.tolist()};children=[k+2 for k,o in enumerate(bones) if o['parent']==i]
 if children:no['children']=children
 out['nodes'].append(no)
out['nodes'][lookup['CrownSocket']+2].setdefault('children',[]).append(len(out['nodes']))
out['nodes'].append({'name':'DetachableCrown','mesh':1})
attrs={'POSITION':accessor(p,'VEC3',target=34962),'NORMAL':accessor(norm,'VEC3',target=34962),'TEXCOORD_0':accessor(uv,'VEC2',target=34962),'JOINTS_0':accessor(joints,'VEC4',5123,34962),'WEIGHTS_0':accessor(weights,'VEC4',target=34962)}
out['materials'].append({'name':'CrownUnderShell','pbrMetallicRoughness':{'baseColorFactor':[.12,.018,.022,1],'metallicFactor':.18,'roughnessFactor':.48},'doubleSided':True})
cap_joints=np.zeros((len(cap_p),4),dtype=np.uint16);cap_joints[:,0]=lookup['Head']
cap_weights=np.zeros((len(cap_p),4));cap_weights[:,0]=1
cap_attrs={'POSITION':accessor(cap_p,'VEC3',target=34962),'NORMAL':accessor(cap_n,'VEC3',target=34962),'JOINTS_0':accessor(cap_joints,'VEC4',5123,34962),'WEIGHTS_0':accessor(cap_weights,'VEC4',target=34962)}
out['meshes'].append({'name':'QueenBody','primitives':[{'attributes':attrs,'indices':accessor(bodytri.flatten(),'SCALAR',5125,34963),'material':0},{'attributes':cap_attrs,'indices':accessor(cap_tri.flatten(),'SCALAR',5125,34963),'material':1}]})
# A dedicated crown texture makes warm gold without recoloring the ant's shell.
crown_pic=base_pic.copy();crown_pic.thumbnail((1024,1024),Image.Resampling.LANCZOS)
ctex=np.asarray(crown_pic,dtype=np.float32)/255
cr,cg,cb=ctex[:,:,0],ctex[:,:,1],ctex[:,:,2]
metal=(cg>cr*.57)&(cb<cr*.75)&(cr>cg*.95)
brightness=np.maximum.reduce([cr,cg,cb])
bright=np.clip(brightness*.72+.27,0,1)
polished=np.stack([bright,bright*.77,bright*.19],axis=-1)
emerald=(cg>cr*1.12)&(cg>cb*1.15)
ctex[~emerald]=ctex[~emerald]*.08+polished[~emerald]*.92
buf=io.BytesIO();Image.fromarray(np.uint8(np.clip(ctex,0,1)*255)).save(buf,format='PNG',optimize=True)
out['images'].append({'bufferView':view(buf.getvalue()),'mimeType':'image/png','name':'Clean warm gold crown'})
out['textures'].append({'source':len(out['images'])-1,'sampler':0})
crown_material=json.loads(json.dumps(j['materials'][0]));crown_material['name']='CleanCrownGoldEmerald'
crown_material['pbrMetallicRoughness']['baseColorTexture']={'index':len(out['textures'])-1}
crown_material['pbrMetallicRoughness'].pop('metallicRoughnessTexture',None)
crown_material['pbrMetallicRoughness'].update(metallicFactor=.4,roughnessFactor=.3)
crown_material['emissiveTexture']={'index':len(out['textures'])-1};crown_material['emissiveFactor']=[.10,.10,.10]
out['materials'].append(crown_material)
# Author a closed, clean coronet instead of retaining the ragged extracted shell.
# The detached node and CrownSocket stay identical for the rolling/pickup sequence.
crown_material.pop('normalTexture',None)
crown_material.pop('occlusionTexture',None)
gold_locations=np.argwhere(metal&(brightness>.65));gold_pixel=gold_locations[len(gold_locations)//2]
gem_locations=np.argwhere(emerald&(brightness>.3));gem_pixel=gem_locations[len(gem_locations)//2]
def atlas_uv(pixel):return [(pixel[1]+.5)/ctex.shape[1],(pixel[0]+.5)/ctex.shape[0]]
gold_uv=atlas_uv(gold_pixel);gem_uv=atlas_uv(gem_pixel)
cp=[];cn=[];cuv=[];ct=[]
def add_surface(vertices,faces,color,smooth=True,normals=None):
 vertices=np.asarray(vertices,dtype=float);faces=np.asarray(faces,dtype=np.uint32)
 if normals is None:
  normals=np.zeros_like(vertices)
  for face in faces:
   a,b,c=vertices[face];normals[face]+=np.cross(b-a,c-a)
  normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
 offset=len(cp);cp.extend(vertices);cn.extend(normals);cuv.extend([color]*len(vertices));ct.extend(faces+offset)
def lathe(profile,sections=96):
 vertices=[];faces=[]
 for radius,height in profile:
  for k in range(sections):
   angle=2*math.pi*k/sections;vertices.append([radius*math.cos(angle),height,radius*math.sin(angle)])
 for row in range(len(profile)):
  for k in range(sections):
   a=row*sections+k;b=row*sections+(k+1)%sections;c=((row+1)%len(profile))*sections+k;d=((row+1)%len(profile))*sections+(k+1)%sections
   faces.extend([[a,c,b],[b,c,d]])
 add_surface(vertices,faces,gold_uv)
def ellipsoid(center,radii,color,segments=24,rings=12):
 vertices=[];normals=[];faces=[]
 for row in range(rings+1):
  phi=math.pi*row/rings
  for k in range(segments):
   theta=2*math.pi*k/segments;unit=np.array([math.sin(phi)*math.cos(theta),math.cos(phi),math.sin(phi)*math.sin(theta)])
   vertices.append(np.array(center)+unit*np.array(radii));normal=unit/np.array(radii);normals.append(normal/np.linalg.norm(normal))
 for row in range(rings):
  for k in range(segments):
   a=row*segments+k;b=row*segments+(k+1)%segments;c=a+segments;d=b+segments
   if row>0:faces.append([a,b,c])
   if row<rings-1:faces.append([b,d,c])
 add_surface(vertices,faces,color,normals=normals)
# Rounded, closed lower band with a subtly flared upper edge.
lathe([(.099,0),(.102,.004),(.102,.021),(.099,.026),(.090,.026),(.088,.022),(.088,.004),(.091,0)])
# Six continuous peaks; both sides and the top lip have real thickness.
sections=144;vertices=[];faces=[]
for layer in range(4):
 for k in range(sections):
  angle=2*math.pi*k/sections;phase=(k/(sections/6))%1
  peak=max(0,1-2*min(phase,1-phase))**1.35
  top=.032+.068*peak;outer=.099+.006*peak
  radius=outer if layer<2 else outer-.009
  height=.020 if layer in (0,3) else top
  vertices.append([radius*math.cos(angle),height,radius*math.sin(angle)])
for layer in range(4):
 for k in range(sections):
  a=layer*sections+k;b=layer*sections+(k+1)%sections;c=((layer+1)%4)*sections+k;d=((layer+1)%4)*sections+(k+1)%sections
  faces.extend([[a,c,b],[b,c,d]])
add_surface(vertices,faces,gold_uv)
for k in range(6):
 angle=2*math.pi*k/6
 ellipsoid([.105*math.cos(angle),.103,.105*math.sin(angle)],[.011,.011,.011],gold_uv)
# Emerald face jewel with a rounded gold bezel, free of source texture fragments.
ellipsoid([0,.025,.103],[.018,.021,.006],gold_uv)
ellipsoid([0,.026,.108],[.013,.016,.005],gem_uv)
cp=np.asarray(cp);cn=np.asarray(cn);cuv=np.asarray(cuv);ct=np.asarray(ct,dtype=np.uint32)
out['meshes'].append({'name':'QueenCrown','primitives':[{'attributes':{'POSITION':accessor(cp,'VEC3',target=34962),'NORMAL':accessor(cn,'VEC3',target=34962),'TEXCOORD_0':accessor(cuv,'VEC2',target=34962)},'indices':accessor(ct.flatten(),'SCALAR',5125,34963),'material':len(out['materials'])-1}]})
ib=[]
for bo in bones:
 m=np.eye(4);m[:3,3]=-bo['at'];ib.append(m.T.flatten())
out['skins']=[{'name':'QueenInsectRig','skeleton':2,'joints':list(range(2,2+len(bones))),'inverseBindMatrices':accessor(ib,'MAT4')}]
# Quaternion and small-chain IK helpers for portable animation clips.
def normalize(v):return v/max(np.linalg.norm(v),1e-9)
def qmul(a,b):
 av=a[:3];bv=b[:3];return np.r_[a[3]*bv+b[3]*av+np.cross(av,bv),a[3]*b[3]-av@bv]
def qinv(q):return np.r_[-q[:3],q[3]]
def between(a,b):
 a=normalize(a);b=normalize(b);q=np.r_[np.cross(a,b),1+a@b];return normalize(q)
def axisq(axis,angle):return np.r_[normalize(np.array(axis))*math.sin(angle/2),math.cos(angle/2)]
def qrotate(q,v):
 return v+2*np.cross(q[:3],np.cross(q[:3],v)+q[3]*v)
def grounded_offset(frame):
 world_q=[];world_p=[]
 for i,bo in enumerate(bones):
  parent=bo['parent']
  if parent is None:world_q.append(frame[i]);world_p.append(bo['at'])
  else:
   world_q.append(qmul(world_q[parent],frame[i]))
   world_p.append(world_p[parent]+qrotate(world_q[parent],bo['at']-bones[parent]['at']))
 deformed=np.zeros_like(p)
 for slot in range(4):
  for bi in np.unique(joints[:,slot]):
   mask=joints[:,slot]==bi
   moved=qrotate(world_q[bi],p[mask]-bones[bi]['at'])+world_p[bi]
   deformed[mask]+=moved*weights[mask,slot,None]
 return -.370818-float(deformed[np.unique(bodytri),1].min())
def solve(points,target):
 pts=np.array(points,dtype=float);origin=pts[0].copy();lengths=np.linalg.norm(np.diff(pts,axis=0),axis=1);delta=target-origin
 if np.linalg.norm(delta)>sum(lengths)*.995:target=origin+normalize(delta)*sum(lengths)*.995
 for _ in range(14):
  pts[-1]=target
  for k in range(len(pts)-2,-1,-1):pts[k]=pts[k+1]+normalize(pts[k]-pts[k+1])*lengths[k]
  pts[0]=origin
  for k in range(1,len(pts)):pts[k]=pts[k-1]+normalize(pts[k]-pts[k-1])*lengths[k-1]
 return pts
for clip,duration in [('Idle',4),('Walk',2),('Threat',2.4),('Defeat',3.4)]:
 times=np.linspace(0,duration,int(duration*30)+1);rot={i:[] for i in range(len(bones))};translations=[]
 for t in times:
  frame=[np.array([0.,0.,0.,1.]) for _ in bones]
  frame[lookup['Abdomen']]=axisq([1,0,0],math.sin(t*2*math.pi/duration)*.025)
  frame[lookup['Head']]=axisq([0,1,0],math.sin(t*2*math.pi/duration)*.025)
  for si,side in enumerate(['L','R']):
   frame[lookup[side+'_Antenna']]=axisq([0,0,1],math.sin(t*4*math.pi/duration+si)*.06)
   frame[lookup[side+'_AntennaTip']]=axisq([1,0,0],math.sin(t*4*math.pi/duration+si+.5)*.07)
   frame[lookup[side+'_Jaw']]=axisq([0,1,0],(1 if si else -1)*(.03+math.sin(t*4*math.pi/duration)*.02))
  for li,(name,points) in enumerate(legs.items()):
   side=-1 if name.startswith('L') else 1;idx=['Front','Middle','Rear'].index(name.split('_')[1]);phase=t*2*math.pi+(idx+(side==1))*math.pi;target=np.array(points[-1],dtype=float)
   if clip=='Walk':target+=np.array([side*.012*math.sin(phase),max(0,math.sin(phase))*.055,math.cos(phase)*.055])
   if clip=='Threat' and idx==0:
    lift=math.sin(min(1,t/duration)*math.pi)**2;target+=np.array([-side*.055,.24,.02])*lift
   if clip=='Defeat':
    progress=min(1,max(0,(t-.4)/1.8));target+=(np.array([side*.20,.04,points[0][2]])-target)*progress*.65
   posed=solve(points,target);parentq=np.array([0.,0.,0.,1.])
   for k,part in enumerate(legnames):
    worldq=between(np.array(points[k+1])-points[k],posed[k+1]-posed[k]);frame[lookup[name+'_'+part]]=qmul(qinv(parentq),worldq);parentq=worldq
  rootpos=np.array([0.,0.,0.])
  if clip=='Defeat':
   progress=min(1,max(0,(t-.2)/2));progress=progress*progress*(3-2*progress);angle=progress*2.65;frame[lookup['Root']]=axisq([0,0,1],angle);rootpos=np.array([math.sin(angle)*.16,grounded_offset(frame),0])
  else:rootpos[1]=math.sin(t*2*math.pi/duration)*.004
  translations.append(rootpos)
  for i,q in enumerate(frame):
   if rot[i] and np.dot(rot[i][-1],q)<0:q=-q
   rot[i].append(q)

 anim={'name':clip,'samplers':[],'channels':[]};ta=accessor(times,'SCALAR')
 for bi,qs in rot.items():
  if np.max(np.abs(np.array(qs)-np.array([0,0,0,1])))<1e-6:continue
  sampler=len(anim['samplers']);anim['samplers'].append({'input':ta,'output':accessor(qs,'VEC4'),'interpolation':'LINEAR'});anim['channels'].append({'sampler':sampler,'target':{'node':bi+2,'path':'rotation'}})
 sampler=len(anim['samplers']);anim['samplers'].append({'input':ta,'output':accessor(translations,'VEC3'),'interpolation':'LINEAR'});anim['channels'].append({'sampler':sampler,'target':{'node':lookup['Root']+2,'path':'translation'}});out['animations'].append(anim)
out['buffers'][0]['byteLength']=len(data);jb=json.dumps(out,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);data+=b'\0'*((-len(data))%4)
OUT.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(jb)+8+len(data))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(data),0x004e4942)+data)
meta={'source':SRC.name,'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'riggedFile':OUT.name,'bones':len(bones),'bodyTriangles':len(bodytri),'crownTriangles':len(ct),'crownGeometry':'closed authored coronet with six smooth pearl tips','removedCrownShellTriangles':removed_crown_shell,'repairedLegTriangles':len(newtri),'removedMalformedTriangles':int(oldmask.sum()),'removedRearRemnantTriangles':int(remnant.sum()),'animations':[a['name'] for a in out['animations']],'textureResolution':2048,'bytes':OUT.stat().st_size,'rigStatus':'custom game rig; six-leg repair and detachable crown'}
OUT.with_suffix('.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta,indent=2))
