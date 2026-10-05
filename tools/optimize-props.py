"""Reduce a static textured GLB for browser use; leave the source untouched.
Requires numpy, Pillow and fast-simplification. Usage: source.glb output.glb triangles texture-size
"""
import sys,json,struct,io,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
import fast_simplification as fs
src,out=map(Path,sys.argv[1:3]);target,res=map(int,sys.argv[3:5]);b=src.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);blob=b[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];k={'SCALAR':1,'VEC3':3,'VEC2':2}[a['type']];return np.ndarray((a['count'],k),dtype=dt,buffer=blob,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*k),np.dtype(dt).itemsize)).copy()
pr=j['meshes'][0]['primitives'][0];p=acc(pr['attributes']['POSITION']);norm=acc(pr['attributes']['NORMAL']);uv=acc(pr['attributes']['TEXCOORD_0']);tri=acc(pr['indices']).reshape(-1,3);source_count=len(tri)
part=sys.argv[5] if len(sys.argv)>5 else None
if part:
 c=p[tri].mean(axis=1)
 keep=(c[:,2]>-.43)&(c[:,2]<.16)&~((c[:,1]<-.52)&(c[:,2]>-.12)) if part=='backpack' else (c[:,2]>.22)&(c[:,1]>-.50)
 tri=tri[keep];used=np.unique(tri);remap=np.full(len(p),-1,dtype=np.int32);remap[used]=np.arange(len(used));tri=remap[tri].astype(np.uint32);p=p[used];norm=norm[used];uv=uv[used]

rp,rt,collapse=fs.simplify(p,tri,target_count=target,agg=5,preserve_border=True,return_collapses=True)
_,_,mapping=fs.replay_simplification(p.astype(np.float32),tri.astype(np.int32),collapse);valid=mapping>=0;counts=np.bincount(mapping[valid],minlength=len(rp));ruv=np.zeros((len(rp),2));rn=np.zeros((len(rp),3));np.add.at(ruv,mapping[valid],uv[valid]);np.add.at(rn,mapping[valid],norm[valid]);ruv/=np.maximum(counts[:,None],1);rn/=np.maximum(np.linalg.norm(rn,axis=1,keepdims=True),1e-9)
data=bytearray();j['accessors']=[];j['bufferViews']=[]
def view(raw):
 while len(data)%4:data.append(0)
 i=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':len(raw)});data.extend(raw);return i
def writeacc(array,ctype,kind,bounds=False):
 i=len(j['accessors']);a={'bufferView':view(array.tobytes()),'componentType':ctype,'count':len(array),'type':kind};
 if bounds:a.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
 j['accessors'].append(a);return i
pr['attributes']={'POSITION':writeacc(rp.astype('<f4'),5126,'VEC3',True),'NORMAL':writeacc(rn.astype('<f4'),5126,'VEC3'),'TEXCOORD_0':writeacc(ruv.astype('<f4'),5126,'VEC2')};pr['indices']=writeacc(rt.astype('<u4').flatten(),5125,'SCALAR')
for image in j.get('images',[]):
 old=image['bufferView'];# old views must be read from the original JSON
 original=json.loads(b[20:20+n])['bufferViews'][old];pic=Image.open(io.BytesIO(blob[original.get('byteOffset',0):original.get('byteOffset',0)+original['byteLength']])).convert('RGB');pic.thumbnail((res,res),Image.Resampling.LANCZOS);buf=io.BytesIO();pic.save(buf,format='JPEG',quality=92,optimize=True);image['bufferView']=view(buf.getvalue());image['mimeType']='image/jpeg'
j['buffers']=[{'byteLength':len(data)}];j['asset']['generator']='Antagonized static prop optimizer';text=json.dumps(j,separators=(',',':')).encode();text+=b' '*((-len(text))%4);data+=b'\0'*((-len(data))%4);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(text)+len(data))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(data),0x004e4942)+data)
meta={'source':src.name,'sourceSha256':hashlib.sha256(b).hexdigest(),'sourceTriangles':source_count,'part':part,'triangles':len(rt),'vertices':len(rp),'textureSize':res,'sourceBytes':len(b),'bytes':out.stat().st_size};out.with_suffix('.json').write_text(json.dumps(meta,indent=2));print(out.name,json.dumps(meta))
