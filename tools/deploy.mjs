import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {buildSite,root,contentTypes} from './build.mjs';

const config=JSON.parse(await readFile(path.join(root,'deploy/aws.json'),'utf8'));
const profile=config.profile; // Pin this project to its configured account, regardless of shell defaults.
function aws(args,{live=false}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn('aws',[...args,'--profile',profile,'--region',config.region,'--no-cli-pager'],{env:{...process.env,AWS_PAGER:''},stdio:live?['ignore','inherit','inherit']:['ignore','pipe','pipe']});
  let out='',err='';if(!live){child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);}
  child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(Error(err||`AWS command failed (${code}): ${args[0]} ${args[1]}`)));
 });
}
try{
 const identity=JSON.parse(await aws(['sts','get-caller-identity','--output','json']));
 if(identity.Account!==config.accountId)throw Error(`Refusing deployment: profile ${profile} uses account ${identity.Account}; expected ${config.accountId}.`);
 console.log(`Verified AWS account ${identity.Account}, profile ${profile}.`);
 const {destination,release}=await buildSite();
 if(process.argv.includes('--setup')){
  console.log('Creating/updating the private S3 bucket and HTTPS CloudFront hosting…');
  await aws(['cloudformation','deploy','--stack-name',config.stackName,'--template-file',path.join(root,'deploy/cloudformation.json'),'--parameter-overrides',`BucketName=${config.bucketName}`,'--no-fail-on-empty-changeset','--tags','Project=antagonized-3d'],{live:true});
 }
 const stack=JSON.parse(await aws(['cloudformation','describe-stacks','--stack-name',config.stackName,'--output','json'])).Stacks[0];
 const output=Object.fromEntries(stack.Outputs.map(o=>[o.OutputKey,o.OutputValue]));
 if(output.BucketName!==config.bucketName)throw Error('Hosting stack points to an unexpected bucket.');
 let previous={files:{}};
 try{
  await aws(['s3api','get-object','--bucket',config.bucketName,'--key','release.json',path.join(root,'.deploy/previous-release.json')]);
  previous=JSON.parse(await readFile(path.join(root,'.deploy/previous-release.json'),'utf8'));
 }catch(error){if(!/NoSuchKey|\(404\)/.test(error.message))throw error;}
 const changed=Object.keys(release.files).filter(key=>release.files[key]!==previous.files?.[key]);
 if(changed.length===0&&previous.version===release.version){console.log(`Antagonized v${release.version} is already current: ${output.GameUrl}`);process.exit(0);}
 const assets=changed.filter(key=>key.startsWith('fps/assets/')||key.startsWith('fps/vendor/'));
 const code=changed.filter(key=>!assets.includes(key));
 async function upload(keys){
  let cursor=0,done=0;
  await Promise.all(Array.from({length:Math.min(4,keys.length)},async()=>{
   while(cursor<keys.length){const key=keys[cursor++],asset=key.startsWith('fps/assets/')||key.startsWith('fps/vendor/');
    await aws(['s3','cp',path.join(destination,key),`s3://${config.bucketName}/${key}`,'--only-show-errors','--content-type',contentTypes[path.extname(key)]||'application/octet-stream','--cache-control',asset?'public, max-age=0, s-maxage=86400, must-revalidate':'public, max-age=0, must-revalidate']);
    console.log(`Uploaded ${++done}/${keys.length}: ${key}`);
   }
  }));
 }
 console.log(`${changed.length} changed files; uploading assets before game code.`);await upload(assets);await upload(code.filter(key=>key!=='fps/index.html'));await upload(code.filter(key=>key==='fps/index.html'));
 await aws(['s3','cp',path.join(destination,'release.json'),`s3://${config.bucketName}/release.json`,'--only-show-errors','--content-type','application/json','--cache-control','no-cache']);
 console.log('Refreshing CloudFront caches…');
 const invalidation=JSON.parse(await aws(['cloudfront','create-invalidation','--distribution-id',output.DistributionId,'--paths','/*','--output','json']));
 await aws(['cloudfront','wait','invalidation-completed','--distribution-id',output.DistributionId,'--id',invalidation.Invalidation.Id]);
 const result={version:release.version,accountId:identity.Account,bucket:config.bucketName,distributionId:output.DistributionId,url:output.GameUrl,invalidationId:invalidation.Invalidation.Id};
 await writeFile(path.join(root,'.deploy/last-deployment.json'),JSON.stringify(result,null,2)+'\n');
 console.log(`Antagonized v${release.version} is live: ${output.GameUrl}`);
}catch(error){console.error(error.message);process.exitCode=1;}
