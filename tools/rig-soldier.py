"""Fit a six-leg insect rig to the supplied Meshy soldier; preserve UV seams.
Requires numpy, Pillow and fast-simplification. The input remains untouched.
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
# Quadric simplification keeps UV island boundaries intact; transfer attributes
# through recorded edge collapses instead of projecting across unrelated islands.
import fast_simplification as fs
source_triangles=len(tri)
reduced_p,reduced_tri,collapses=fs.simplify(p,tri,target_count=55000,agg=5,preserve_border=True,return_collapses=True)
rp,rt,mapping=fs.replay_simplification(p.astype(np.float32),tri.astype(np.int32),collapses)
assert len(rp)==len(reduced_p)
count=np.bincount(mapping[mapping>=0],minlength=len(rp));ruv=np.zeros((len(rp),2));rn=np.zeros((len(rp),3));valid=mapping>=0
np.add.at(ruv,mapping[valid],uv[valid]);np.add.at(rn,mapping[valid],norm[valid]);ruv/=np.maximum(count[:,None],1);rn/=np.maximum(np.linalg.norm(rn,axis=1,keepdims=True),1e-9)
p=reduced_p.astype(np.float32);tri=reduced_tri.astype(np.uint32);norm=rn.astype(np.float32);uv=ruv.astype(np.float32)
# Bind coordinates: head +Z, abdomen -Z, with feet at Y=-.413764.
bones=[];lookup={};segments=[]
def bone(name,at,parent=None):
 idx=len(bones);lookup[name]=idx;bones.append({'name':name,'at':np.array(at,dtype=float),'parent':lookup.get(parent)});return idx
def seg(name,a,b,r):segments.append((lookup[name],np.array(a),np.array(b),r))
bone('Root',(0,0,0));bone('Thorax',(0,.15,.02),'Root');bone('Abdomen',(0,.10,-.32),'Thorax');bone('Head',(0,.17,.34),'Thorax')
seg('Thorax',(0,.16,-.25),(0,.17,.27),.16);seg('Abdomen',(0,.10,-.42),(0,.04,-.81),.21);seg('Head',(0,.13,.40),(0,.10,.63),.20)
legs={}
for side,sign in [('L',-1),('R',1)]:
 for name,points in {
  'Front':[(.13,.13,.14),(.25,.075,.19),(.42,-.15,.34),(.56,-.38,.48),(.66,-.395,.54)],
  'Middle':[(.11,.06,-.025),(.24,.05,-.04),(.42,-.10,-.08),(.57,-.36,-.13),(.66,-.40,-.155)],
  'Rear':[(.11,.07,-.20),(.21,.06,-.24),(.34,-.105,-.36),(.46,-.36,-.53),(.57,-.40,-.64)]
 }.items():legs[side+'_'+name]=[(sign*x,y,z) for x,y,z in points]
legnames=['Hip','Upper','Lower','Foot']
for name,points in legs.items():
 for k,part in enumerate(legnames):
  bn=name+'_'+part;bone(bn,points[k],'Thorax' if k==0 else name+'_'+legnames[k-1]);seg(bn,points[k],points[k+1],[.055,.065,.046,.045][k])
for side,sign in [('L',-1),('R',1)]:
 pts=[(sign*.14,.21,.50),(sign*.25,.36,.74),(sign*.42,.02,.95)]
 bone(side+'_Antenna',pts[0],'Head');bone(side+'_AntennaTip',pts[1],side+'_Antenna');seg(side+'_Antenna',pts[0],pts[1],.025);seg(side+'_AntennaTip',pts[1],pts[2],.025)
 bone(side+'_Jaw',(sign*.095,.01,.60),'Head');seg(side+'_Jaw',(sign*.095,.01,.60),(sign*.075,-.23,.71),.06)
# Nearest anatomical capsule gives a region; blending is confined to that chain.
def scores(points):
 ds=[];ts=[]
 for bi,a,z,r in segments:
  v=z-a;t=np.clip(((points-a)*v).sum(axis=1)/(v@v),0,1);d=np.linalg.norm(points-(a+t[:,None]*v),axis=1)/r;ds.append(d);ts.append(t)
 return np.array(ds).T,np.array(ts).T
dist,ts=scores(p);nearest=dist.argmin(axis=1);labels=np.array([segments[i][0] for i in nearest])
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
# Fresh compact GLB. Texture resizing is a game-delivery optimization, not a source edit.
out={'asset':{'version':'2.0','generator':'Antagonized soldier rig builder'},'scene':0,'scenes':[{'nodes':[0,1]}],'nodes':[],'meshes':[],'skins':[],'animations':[],'materials':j['materials'],'textures':j['textures'],'samplers':j.get('samplers',[]),'images':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]};data=bytearray()
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
out['nodes']=[{'name':'SoldierAnt','mesh':0,'skin':0},{'name':'SoldierArmature','children':[2]}]
for i,bo in enumerate(bones):
 parent=bo['parent'];translation=bo['at']-(bones[parent]['at'] if parent is not None else 0)
 no={'name':bo['name'],'translation':translation.tolist()};children=[k+2 for k,o in enumerate(bones) if o['parent']==i]
 if children:no['children']=children
 out['nodes'].append(no)
attrs={'POSITION':accessor(p,'VEC3',target=34962),'NORMAL':accessor(norm,'VEC3',target=34962),'TEXCOORD_0':accessor(uv,'VEC2',target=34962),'JOINTS_0':accessor(joints,'VEC4',5123,34962),'WEIGHTS_0':accessor(weights,'VEC4',target=34962)}
out['meshes'].append({'name':'SoldierBody','primitives':[{'attributes':attrs,'indices':accessor(tri.flatten(),'SCALAR',5125,34963),'material':0}]})
ib=[]
for bo in bones:
 m=np.eye(4);m[:3,3]=-bo['at'];ib.append(m.T.flatten())
out['skins']=[{'name':'SoldierInsectRig','skeleton':2,'joints':list(range(2,2+len(bones))),'inverseBindMatrices':accessor(ib,'MAT4')}]
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
 return -.413764-float(deformed[np.unique(tri),1].min())
def solve(points,target):
 pts=np.array(points,dtype=float);origin=pts[0].copy();lengths=np.linalg.norm(np.diff(pts,axis=0),axis=1);delta=target-origin
 if np.linalg.norm(delta)>sum(lengths)*.995:target=origin+normalize(delta)*sum(lengths)*.995
 for _ in range(14):
  pts[-1]=target
  for k in range(len(pts)-2,-1,-1):pts[k]=pts[k+1]+normalize(pts[k]-pts[k+1])*lengths[k]
  pts[0]=origin
  for k in range(1,len(pts)):pts[k]=pts[k-1]+normalize(pts[k]-pts[k-1])*lengths[k-1]
 return pts
for clip,duration in [('Idle',4),('Walk',1.6),('Bite',1.2),('Threat',2.4),('Subdued',4),('Defeat',3.4)]:
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
   if clip=='Walk':
    # Alternating tripods: a planted backward sweep followed by a lifted return.
    cycle=(t/duration+.5*((idx+(side==1))%2))%1;stance=.65
    if cycle<stance:
     travel=1-2*cycle/stance;lift=0
    else:
     swing=(cycle-stance)/(1-stance);travel=-math.cos(math.pi*swing);lift=math.sin(math.pi*swing)**1.5
    # Center the sweep beneath the hip so extended source legs retain knee bend.
    target[0]-=side*.045;target[2]+=(points[0][2]-points[-1][2])*.35
    target+=np.array([side*.025*lift,.17*lift,.28*travel])
   if clip=='Threat' and idx==0:
    lift=math.sin(min(1,t/duration)*math.pi)**2;target+=np.array([-side*.035,.18,.02])*lift
   if clip=='Defeat':
    progress=min(1,max(0,(t-.4)/1.8));target+=(np.array([side*.28,.02,points[0][2]])-target)*progress*.65
   if clip=='Walk':
    toe=np.array(points[-1])-np.array(points[-2]);ankle_chain=solve(points[:-1],target-toe);posed=np.vstack([ankle_chain,ankle_chain[-1]+toe])
   else:posed=solve(points,target)
   parentq=np.array([0.,0.,0.,1.])
   for k,part in enumerate(legnames):
    worldq=between(np.array(points[k+1])-points[k],posed[k+1]-posed[k]);frame[lookup[name+'_'+part]]=qmul(qinv(parentq),worldq);parentq=worldq
  if clip=='Bite':
   bite=math.sin(t*math.pi/duration)**2
   frame[lookup['Head']]=axisq([1,0,0],-.14*bite)
   for side,sign in [('L',-1),('R',1)]:frame[lookup[side+'_Jaw']]=axisq([0,1,0],sign*(.03+.38*bite))
  rootpos=np.array([0.,0.,0.])
  if clip=='Defeat':
   progress=min(1,max(0,(t-.2)/2));progress=progress*progress*(3-2*progress);angle=progress*2.65;frame[lookup['Root']]=axisq([0,0,1],angle);rootpos=np.array([math.sin(angle)*.16,grounded_offset(frame),0])
  elif clip!='Walk':rootpos[1]=math.sin(t*2*math.pi/duration)*.004
  if clip=='Subdued':rootpos[1]=-.025+math.sin(t*2*math.pi/duration)*.003
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
meta={'source':SRC.name,'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'riggedFile':OUT.name,'bones':len(bones),'sourceTriangles':source_triangles,'bodyTriangles':len(tri),'vertices':len(p),'animations':[a['name'] for a in out['animations']],'textureResolution':2048,'bytes':OUT.stat().st_size,'groundY':-.413764,'rigStatus':'custom six-leg soldier rig; preserved UV islands and reduced game mesh'}
OUT.with_suffix('.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta,indent=2))
