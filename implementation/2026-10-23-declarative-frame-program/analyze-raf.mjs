import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const [input,output]=process.argv.slice(2);assert.ok(input&&output);
const bytes=await readFile(input),receipt=JSON.parse(bytes);
assert.equal(receipt.status,'PASS');assert.equal(receipt.mode,'timing');
assert.equal(receipt.browserClosed,true);assert.equal(receipt.contexts.length,12);
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),i=sorted.length>>1;
 return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
const quantile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.ceil(q*values.length)-1];
const stats=values=>values.length?{count:values.length,median:median(values),
 p90:quantile(values,.9),p95:quantile(values,.95),max:Math.max(...values)}:null;
const arms=[];
for(const arm of ['native','react','react-frame']){
 const contexts=receipt.contexts.filter(row=>row.arm===arm);assert.equal(contexts.length,4);
 const blocks=contexts.map(row=>{
  assert.equal(row.closed,true);assert.equal(row.status,'PASS');
  const samples=row.result.samples.slice(row.result.warmup);
  assert.equal(samples.length,60);assert.equal(row.cleanup.exactDisposals,512);
  const requests=new Map(samples.map(sample=>[sample.rafTime,sample]));
  const commits=row.result.accepted.filter(event=>requests.has(event.time));
  const latency=commits.map(event=>event.at-requests.get(event.time).requestedAt);
  assert.ok(latency.every(value=>value>=0));
  return {submissionMs:stats(samples.map(sample=>sample.submitEnd-sample.requestedAt)),
   throughDrawMs:stats(samples.map(sample=>sample.drawEnd-sample.requestedAt)),
   drawMs:stats(samples.map(sample=>sample.drawEnd-sample.drawStart)),
   acceptanceLatencyMs:stats(latency),observedAcceptedRequests:new Set(commits.map(event=>event.time)).size,
   freshDraws:samples.filter(sample=>sample.drawnEpoch===sample.epoch).length,
   ageFrames:stats(samples.map(sample=>sample.ageFrames)),
   callbackThroughDrawOver16_667ms:samples.filter(sample=>sample.drawEnd-sample.requestedAt>1000/60).length,
   rafIntervalsOver25ms:samples.filter(sample=>sample.intervalMs>25).length,
   rafIntervalMs:stats(samples.filter(sample=>sample.intervalMs!==null).map(sample=>sample.intervalMs)),
   litPixels:row.result.litPixels};
 });
 const across={};
 for(const metric of ['submissionMs','throughDrawMs','drawMs','acceptanceLatencyMs','ageFrames','rafIntervalMs'])
  across[metric]=Object.fromEntries(['median','p90','p95','max'].map(stat=>
   [stat,median(blocks.map(block=>block[metric]?.[stat]).filter(Number.isFinite))]));
 arms.push({arm,contexts:blocks,medianAcrossContexts:across,
  freshDraws:blocks.reduce((sum,block)=>sum+block.freshDraws,0),totalDraws:240,
  observedAcceptedRequests:blocks.reduce((sum,block)=>sum+block.observedAcceptedRequests,0)});
}
const result={status:'DESCRIPTIVE_BALANCED_RAF_EPISODE',
 inputSha256:createHash('sha256').update(bytes).digest('hex'),arms,
 limits:['Shared application RAF, not autonomous default R3F scheduling',
 'React commits can occur outside submission-through-draw; submission is not its complete update CPU',
 'Acceptance events observe marker commit, not physical presentation',
 '16.667ms service threshold and 25ms RAF gaps are observations, not proof of missed physical refresh',
 'Four fresh contexts per arm on one machine; no universal speed or isolated Store-cost claim',
 'Primary tails use p90; raw p95/max preserved; no favorable repeat']};
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,output,arms:arms.map(({arm,freshDraws,totalDraws,medianAcrossContexts})=>
 ({arm,freshDraws,totalDraws,medianAcrossContexts}))}));
