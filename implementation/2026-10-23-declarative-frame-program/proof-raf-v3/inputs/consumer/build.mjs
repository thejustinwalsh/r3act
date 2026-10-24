import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {nativeReactPlugins} from '@r3act/vite';
import {build} from 'vite';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(process.argv[2]);
const events=[],captures=[];
for(const mode of ['native','react','react-frame']) {
 let nativeCode='';
 const capture={name:'frame-program-capture',enforce:'post',async transform(code,id){
   const source=id.split('?',1)[0];
   if(!source.startsWith(root+path.sep)||source.includes('/node_modules/'))return null;
   const relative=path.relative(root,source);
   if(relative==='native.tsx')nativeCode=code;
   const destination=path.join(out,'transforms',mode,relative+'.js');
   await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,code);
   captures.push({mode,relative});return null;
 }};
 const plugins=nativeReactPlugins(react,{root,sourceRoots:['native.tsx'],reactOptions:{
   include:/react(?:-frame)?\.tsx$/,jsxImportSource:'react',babel:{plugins:[[
     'babel-plugin-react-compiler',{target:'19',logger:{logEvent(filename,event){
       events.push({filename,kind:event.kind,name:event.fnName??null,
         reason:String(event.reason??event.detail?.reason??'')});
     }}}]]}
 }}).concat(capture);
 await build({configFile:false,root,base:'./',mode:'production',plugins,
   define:{'process.env.NODE_ENV':JSON.stringify('production')},
   ...(mode==='native'?{}:{oxc:{jsx:{runtime:'automatic',importSource:'react'}}}),
   build:{outDir:path.join(out,'dist',mode),emptyOutDir:true,minify:true,
     rolldownOptions:{input:path.join(root,mode+'.html')}}});
 if(mode==='native'){
   assert.match(nativeCode,/useFrameAt/);
   assert.match(nativeCode,/"sourceKind"\s*:\s*"frameClock"/);
   assert.match(nativeCode,/"schemaVersion"\s*:\s*8/);
   assert.match(nativeCode,/"propInputs"\s*:\s*\["speed"\]/);
   assert.match(nativeCode,/"batchKernel"/);
 }
}
await build({configFile:false,root:path.join(out,'dist/native'),base:'./',mode:'production',
 build:{outDir:path.join(out,'dist/native-rebundled'),emptyOutDir:true,minify:true,
  rolldownOptions:{input:path.join(out,'dist/native/native.html')}}});
assert.ok(events.some(event=>event.kind==='CompileSuccess'),'React Compiler produced no successful component');
await writeFile(path.join(out,'capture.json'),JSON.stringify({status:'PASS',captures,events},null,2)+'\n');
