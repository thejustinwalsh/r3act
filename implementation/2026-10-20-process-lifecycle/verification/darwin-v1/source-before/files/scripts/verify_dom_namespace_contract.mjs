import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {transformWithOxc} from 'vite';
import {openBrowser} from 'vitexec/cli';
import {nativeModuleCompilerPlugin} from '../compiler/vite_native_module.ts';

const origin=process.env.NATIVE_TEST_ORIGIN??'https://async-transition-stress.localhost:1355';
const directory=path.resolve('.');
const output=path.join(directory,'.cache/dom-namespace-contract.mjs');
const authored=`// @native-ui
/** @jsxRuntime classic */
/** @jsx jsx */
import {createDOMRoot,useState,jsx} from '${origin}/src/native_runtime_api.ts';

function NamespaceContract(){
 const[updated,setUpdated]=useState(false);
 return <g data-probe="svg-root-child">
  <svg data-probe="nested-svg" viewBox="0 0 24 24">
   <path data-probe="path" d="M1 1h22v22H1z" strokeWidth={updated?4:2} xlinkHref="#shape-source" aria-hidden={false} data-active={false} style={{stroke:updated?'blue':'red',opacity:updated?undefined:0.5}}/>
   <filter data-probe="filter"><feTurbulence data-probe="turbulence" numOctaves={3}/></filter>
   <animate data-probe="animation" attributeName="opacity" keyPoints="0;1"/>
  </svg>
  <foreignObject data-probe="foreign-object" width="80" height="40">
   <div data-probe="html-child" style={{color:updated?undefined:'red'}}>
   <span data-probe="html-descendant">{updated?'updated':'initial'}</span>
    <button data-probe="update" onClick={()=>setUpdated(value=>!value)}>{updated?'Updated':'Update'}</button>
    <svg data-probe="inner-svg" viewBox="0 0 4 4"><circle data-probe="inner-circle" cx="2" cy="2" r="1"/></svg>
   </div>
  </foreignObject>
 </g>;
}

export function mount(container:Node){
 const root=createDOMRoot(container,{rootId:'dom-namespace-contract'});
 root.mount(<NamespaceContract/>);
 return()=>root.dispose();
}
`;

const plugin=nativeModuleCompilerPlugin({root:directory});
try{
 const result=await plugin.transform.call({addWatchFile(){},error(message){throw Error(String(message));}},authored,path.join(directory,'.cache/dom-namespace-contract.tsx'));
 assert.ok(result.code.includes('useStateAt'),'Probe must use real Rust state lowering');
 const emitted=await transformWithOxc(result.code,'.cache/dom-namespace-contract.tsx',{lang:'tsx',jsx:{runtime:'classic'}});
 await mkdir(path.dirname(output),{recursive:true});
 await writeFile(output,emitted.code);
}finally{await plugin.closeBundle();}

const browser=await openBrowser({gpu:false});
const errors=[];
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/native-task-transitions.html',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
  const module=await import('/.cache/dom-namespace-contract.mjs');
  const container=document.createElementNS('http://www.w3.org/2000/svg','svg');
  container.id='dom-namespace-contract';
  document.body.append(container);
  window.__disposeDOMNamespaceProbe=module.mount(container);
 });

 const root=page.locator('#dom-namespace-contract');
 const group=root.locator('[data-probe="svg-root-child"]');
 const nestedSvg=root.locator('[data-probe="nested-svg"]');
 const pathNode=root.locator('[data-probe="path"]');
 const foreignObject=root.locator('[data-probe="foreign-object"]');
 const htmlChild=root.locator('[data-probe="html-child"]');
 const htmlDescendant=root.locator('[data-probe="html-descendant"]');
 const innerSvg=root.locator('[data-probe="inner-svg"]');

 const initial=await page.evaluate(()=>{
  const root=document.querySelector('#dom-namespace-contract');
  const get=(name)=>root.querySelector(`[data-probe="${name}"]`);
  return {
   rootNamespace:root.namespaceURI,
   groupNamespace:get('svg-root-child')?.namespaceURI,
   nestedSvgNamespace:get('nested-svg')?.namespaceURI,
   pathNamespace:get('path')?.namespaceURI,
   foreignObjectNamespace:get('foreign-object')?.namespaceURI,
   htmlChildNamespace:get('html-child')?.namespaceURI,
   htmlDescendantNamespace:get('html-descendant')?.namespaceURI,
   innerSvgNamespace:get('inner-svg')?.namespaceURI,
   innerCircleNamespace:get('inner-circle')?.namespaceURI,
   viewBox:get('nested-svg')?.getAttribute('viewBox'),
   strokeWidth:get('path')?.getAttribute('stroke-width'),
   xlinkHref:get('path')?.getAttributeNS('http://www.w3.org/1999/xlink','href'),
   xlinkNamespace:get('path')?.getAttributeNodeNS('http://www.w3.org/1999/xlink','href')?.namespaceURI,
   ariaHidden:get('path')?.getAttribute('aria-hidden'),
   dataActive:get('path')?.getAttribute('data-active'),
   numOctaves:get('turbulence')?.getAttribute('numOctaves'),
   keyPoints:get('animation')?.getAttribute('keyPoints'),
   svgStyle:{stroke:get('path')?.style.stroke,opacity:get('path')?.style.opacity},
   htmlColor:get('html-child')?.style.color,
  };
 });
 const svgNS='http://www.w3.org/2000/svg';
 const htmlNS='http://www.w3.org/1999/xhtml';
 assert.deepEqual(initial,{
  rootNamespace:svgNS,groupNamespace:svgNS,nestedSvgNamespace:svgNS,pathNamespace:svgNS,
  foreignObjectNamespace:svgNS,htmlChildNamespace:htmlNS,htmlDescendantNamespace:htmlNS,
  innerSvgNamespace:svgNS,innerCircleNamespace:svgNS,viewBox:'0 0 24 24',strokeWidth:'2',
  xlinkHref:'#shape-source',xlinkNamespace:'http://www.w3.org/1999/xlink',
  ariaHidden:'false',dataActive:'false',numOctaves:'3',keyPoints:'0;1',
  svgStyle:{stroke:'red',opacity:'0.5'},htmlColor:'red',
 });

 await page.evaluate(()=>{
  const names=['svg-root-child','nested-svg','path','foreign-object','html-child','inner-svg'];
  window.__namespaceNodes=Object.fromEntries(names.map(name=>[
   name,document.querySelector(`#dom-namespace-contract [data-probe="${name}"]`),
  ]));
 });
 await root.locator('[data-probe="update"]').click();
 await page.waitForFunction(()=>document.querySelector('#dom-namespace-contract [data-probe="html-descendant"]')?.textContent==='updated');
 assert.equal(await pathNode.getAttribute('stroke-width'),'4');
 assert.equal(await pathNode.evaluate(node=>node.style.stroke),'blue');
 assert.equal(await pathNode.evaluate(node=>node.style.opacity),'');
 assert.equal(await htmlChild.evaluate(node=>node.style.color),'');
 assert.equal(await htmlDescendant.textContent(),'updated');
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(window.__namespaceNodes).map(([name,node])=>[name,node===document.querySelector(`#dom-namespace-contract [data-probe="${name}"]`)]))),{
  'svg-root-child':true,'nested-svg':true,path:true,'foreign-object':true,'html-child':true,'inner-svg':true,
 },'updates should preserve host node identity');

 await page.evaluate(()=>{window.__disposeDOMNamespaceProbe();});
 assert.equal(await root.locator('[data-probe]').count(),0,'dispose should remove the rendered namespace tree');
 assert.deepEqual(errors,[]);
 console.log('PASS DOM namespaces: SVG root context, nested SVG, foreignObject HTML and nested SVG, SVG attributes/xlink, style update and clear, stable host identity, and disposal.');
}finally{await browser.close();}
