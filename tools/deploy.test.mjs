import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import vm from 'node:vm';
import {buildSite,root,contentTypes} from './build.mjs';

test('production bundle contains the runtime graph, music, models, and matching release version',async()=>{
 const {destination,release}=await buildSite();
 const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
 assert.equal(release.version,pkg.version);
 const html=await readFile(path.join(destination,'fps/index.html'),'utf8');
 assert.ok(html.includes(`<span data-game-version>v${pkg.version}</span>`));
 for(const file of Object.keys(release.files)){
  assert.ok(!/\.test\.|\/tests\/|\/model-references\/|-source\.|-preview\./.test(file),file);
  if(file.endsWith('.mjs')){
   const source=await readFile(path.join(destination,file),'utf8');
   for(const match of source.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g))await access(path.resolve(destination,path.dirname(file),match[1]));
   for(const match of source.matchAll(/['"](assets\/[^'"]+\.(?:mp3|glb|png))['"]/g))await access(path.join(destination,'fps',match[1]));
  }
 }
 assert.equal(contentTypes['.mjs'],'text/javascript; charset=utf-8');
 assert.equal(contentTypes['.mp3'],'audio/mpeg');
 assert.equal(contentTypes['.glb'],'model/gltf-binary');
});

test('CloudFront routes home and chapters without rewriting assets or dropping chapter selection',async()=>{
 const template=JSON.parse(await readFile(path.join(root,'deploy/cloudformation.json'),'utf8'));
 const handler=vm.runInNewContext(template.Resources.Routes.Properties.FunctionCode+'; handler');
 for(const chapter of ['1','2','3','4','5'])for(const uri of ['/','/fps','/fps/']){
  const request={uri,querystring:{chapter:{value:chapter}}};
  const result=handler({request});assert.equal(result.uri,'/fps/index.html');assert.equal(result.querystring.chapter.value,chapter);
 }
 assert.equal(handler({request:{uri:'/fps/game.mjs'}}).uri,'/fps/game.mjs');
 assert.equal(template.Resources.GameCache.Properties.CachePolicyConfig.MinTTL,0,'updates honor no-cache headers');
 assert.equal(template.Resources.GameBucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy,true);
 const statement=template.Resources.BucketPolicy.Properties.PolicyDocument.Statement[0];
 assert.equal(statement.Principal.Service,'cloudfront.amazonaws.com');assert.ok(statement.Condition.StringEquals['AWS:SourceArn']);
});

test('deployment rejects a wrong account before building or writing AWS resources, using the pinned profile',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'antagonized-account-check-'));
 try{
  const stub=path.join(temp,'aws'),calls=path.join(temp,'calls.json');
  await writeFile(stub,`#!${process.execPath}\nconst fs=require('node:fs');fs.writeFileSync(process.env.TEST_AWS_CALLS,JSON.stringify(process.argv.slice(2)));console.log(JSON.stringify({Account:'910445327466'}));\n`);await chmod(stub,0o755);
  await assert.rejects(promisify(execFile)(process.execPath,[path.join(root,'tools/deploy.mjs')],{env:{...process.env,PATH:temp+path.delimiter+process.env.PATH,AWS_PROFILE:'refactorFitness',TEST_AWS_CALLS:calls}}),error=>{
   assert.match(error.stderr,/Refusing deployment.*910445327466.*601253324786/);return true;
  });
  const args=JSON.parse(await readFile(calls,'utf8'));assert.deepEqual(args.slice(0,2),['sts','get-caller-identity']);assert.equal(args[args.indexOf('--profile')+1],'default');
 }finally{await rm(temp,{recursive:true,force:true});}
});
