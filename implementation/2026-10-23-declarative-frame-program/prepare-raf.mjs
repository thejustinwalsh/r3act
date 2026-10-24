import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,readdir,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const unit=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(unit,'../..');
const proof=path.resolve(process.argv[2]??'');
assert.equal(path.dirname(proof),unit);assert.match(path.basename(proof),/^proof-raf-v[1-9]\d*$/);
assert.equal(process.version,'v24.18.0');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(proof);
const consumer=await mkdtemp(path.join(root,'.cache/declarative-frame-consumer-'));
const record={status:'STARTED',consumer,inputs:[],packages:[],packageSources:[],assets:[],commands:[]};
const output=path.join(proof,'build-proof.json');
const save=()=>writeFile(output,JSON.stringify(record,null,2)+'\n');
async function copy(source,destination){await mkdir(path.dirname(destination),{recursive:true});
 await copyFile(source,destination);const bytes=await readFile(source);
 assert.equal(sha(await readFile(destination)),sha(bytes));
 return {path:source,archivePath:destination,sha256:sha(bytes)};}
async function run(name,command,args){
 const child=spawn(command,args,{cwd:consumer,env:{...process.env,CI:'true'},detached:true,
  stdio:['ignore','pipe','pipe']});const chunks={stdout:[],stderr:[]};
 for(const stream of ['stdout','stderr'])child[stream].on('data',part=>chunks[stream].push(part));
 let stopped=false;const stop=()=>{stopped=true;if(child.pid)try{process.kill(-child.pid,'SIGKILL');}catch{}};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);const timer=setTimeout(stop,180000);
 let error=null;const exit=await new Promise(resolve=>{child.once('error',e=>{error=String(e);resolve(127);});
 child.once('close',code=>resolve(code));});clearTimeout(timer);process.off('SIGINT',stop);process.off('SIGTERM',stop);
 for(const stream of ['stdout','stderr'])await writeFile(path.join(proof,`${name}.${stream}.log`),Buffer.concat(chunks[stream]));
 record.commands.push({name,command,args,exit,stopped,error});await save();
 assert.equal(exit,0,`${name} failed; preserve this attempt`);assert.equal(stopped,false);
}
try{
 const reportPath=path.join(root,'.cache/r3act-package-build/report.json');
 const report=JSON.parse(await readFile(reportPath,'utf8'));
 record.report=await copy(reportPath,path.join(proof,'inputs/package-report.json'));
 for(const [relative,expected]of Object.entries(report.sourceHashes)){
  const source=path.join(root,relative);assert.equal(sha(await readFile(source)),expected);
  record.packageSources.push({path:source,sha256:expected});
 }
 for(const entry of await readdir(path.join(unit,'consumer'))){
  const source=path.join(unit,'consumer',entry),destination=path.join(consumer,entry);
  await copy(source,destination);record.inputs.push(await copy(source,path.join(proof,'inputs/consumer',entry)));
 }
 const urls={};
 for(const name of ['core','host-three','vite']){
  const expected=report.packages[`@r3act/${name}`];assert.ok(expected?.file&&expected.sha256);
  const source=path.join(root,expected.file);
  assert.equal(sha(await readFile(source)),expected.sha256);
  const item=await copy(source,path.join(proof,'inputs/packages',path.basename(source)));
  record.packages.push(item);urls[`@r3act/${name}`]='file:'+item.archivePath;
 }
 const manifest=JSON.parse(await readFile(path.join(consumer,'package.json'),'utf8'));
 for(const [name,url]of Object.entries(urls)){
  if(name==='@r3act/vite')manifest.devDependencies[name]=url;else manifest.dependencies[name]=url;
 }
 await writeFile(path.join(consumer,'package.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(path.join(consumer,'pnpm-workspace.yaml'),`packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(urls['@r3act/core'])}\n`);
 await run('install','pnpm',['install','--ignore-scripts','--store-dir',path.join(root,'.pnpm-store')]);
 for(const name of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml'])
  await copy(path.join(consumer,name),path.join(proof,'inputs/manifests',name));
 await run('typecheck',path.join(consumer,'node_modules/.bin/tsgo'),['-p','tsconfig.json']);
 await run('build',process.execPath,['build.mjs',proof]);
 async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){
  const source=path.join(dir,item.name);if(item.isDirectory())await walk(source);
  else record.assets.push({path:source,urlPath:'/'+path.relative(path.join(proof,'dist'),source).split(path.sep).join('/'),sha256:sha(await readFile(source))});
 }}
 await walk(path.join(proof,'dist'));
 record.capture=JSON.parse(await readFile(path.join(proof,'capture.json'),'utf8'));
 assert.equal(record.capture.status,'PASS');record.status='PASS';
}catch(error){record.status='FAIL';record.error=error.stack??String(error);}
await save();assert.equal(record.status,'PASS');console.log(JSON.stringify({status:record.status,proof,consumer}));
