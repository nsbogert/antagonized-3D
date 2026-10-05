import {readFile,writeFile,readdir,mkdir,rm,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const contentTypes={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.glb':'model/gltf-binary','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const models=new Set(['marin.glb','queen-rigged.glb','soldier-rigged.glb','worker-rigged.glb','flyer-rigged.glb','backpack.glb','sprayer.glb','ant-egg.glb','refill-station.glb','toilet.glb']);
export function publishable(file){
 if(file.startsWith('fps/vendor/'))return ['fps/vendor/babylon.js','fps/vendor/babylonjs.loaders.min.js','fps/vendor/LICENSE.md'].includes(file);
 if(file.startsWith('fps/assets/models/'))return models.has(path.posix.basename(file))||file.endsWith('/toilet-LICENSE.txt');
 if(file.startsWith('fps/assets/'))return /\.(png|jpg|svg|mp3)$/.test(file)&&!file.endsWith('/mid-spooky.mp3');
 if(path.posix.dirname(file)!=='fps')return false;
 return file==='fps/index.html'||file==='fps/style.css'||(file.endsWith('.mjs')&&!/\.test\.mjs$|-preview\.mjs$/.test(file));
}
export async function buildSite(){
 const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
 if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pkg.version))throw Error('Invalid release version');
 const destination=path.join(root,'.deploy/site');await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
 const files={};let bytes=0;
 async function walk(directory,relative=''){
  for(const item of await readdir(directory,{withFileTypes:true})){
   const key=path.posix.join(relative,item.name),source=path.join(directory,item.name);
   if(item.isDirectory()){if(!['tests','model-references'].includes(item.name))await walk(source,key);continue;}
   if(!item.isFile()||!publishable(key))continue;
   const target=path.join(destination,key);await mkdir(path.dirname(target),{recursive:true});
   if(key==='fps/index.html'){
    let html=await readFile(source,'utf8');html=html.replace(/(<span data-game-version>)v[^<]+/,`$1v${pkg.version}`).replace(/(<meta name="game-version" content=")[^"]+/,`$1${pkg.version}`);await writeFile(target,html);
   }else await copyFile(source,target);
   const data=await readFile(target);files[key]=createHash('sha256').update(data).digest('hex');bytes+=(await stat(target)).size;
  }
 }
 await walk(path.join(root,'public'));
 for(const file of models)if(!files['fps/assets/models/'+file])throw Error('Missing runtime model: '+file);
 const release={version:pkg.version,builtAt:new Date().toISOString(),files,bytes};
 await writeFile(path.join(destination,'release.json'),JSON.stringify(release,null,2)+'\n');
 console.log(`Built Antagonized ${pkg.version}: ${Object.keys(files).length} files, ${(bytes/1048576).toFixed(1)} MiB`);
 return {destination,release};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildSite();
