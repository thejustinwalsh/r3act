from pathlib import Path
import json,hashlib,math
root=Path.cwd();base=root/'results/product-mixed-v2-cpu'
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
p=read(base/'preregistration.json');r=read(base/'results.json');inputs=p['frozenInputs']
assert r['status']=='PASS' and len(r['records'])==2 and r['runId']==p['runId']
for item in [inputs['sourceBuildArchive'],inputs['protocol'],inputs['profileScript']]:assert sha(root/item['path'])==item['sha256']
assert sha(root/inputs['latencyPreregistrationPath'])==inputs['latencyPreregistrationSha256']
assert sha(root/inputs['latencyManifestPath'])==inputs['latencyManifestSha256']
for fn,want in inputs['productionFiles'].items():assert sha(root/fn)==want
for entry,scheduled in zip(r['records'],inputs['schedule']['pages']):
 record=read(base/entry['file']);assert record['status']=='PASS' and not record['pageErrors']
 for key in ['sequence','pair','arm','size']:assert record[key]==scheduled[key]
 assert record['runId']==p['runId'];h=record['harness'];assert h['status']=='PASS' and h['sampleCount']==240 and all(h['checks'].values())
 assert h['postTeardown']['writers']==0 and h['postTeardown']['mounts']==h['postTeardown']['cleanups']
 nodes={n['id']:n for n in record['profile']['nodes']};samples=record['profile']['samples'];deltas=record['profile']['timeDeltas'];assert len(samples)==len(deltas)
 totals={};counts={}
 for sample,delta in zip(samples,deltas):
  assert sample in nodes and isinstance(delta,(float,int)) and delta>=0
  f=nodes[sample]['callFrame'];key=(f['url'],f['functionName'] or '(anonymous)',f['lineNumber'],f['columnNumber'])
  totals[key]=totals.get(key,0)+delta;counts[key]=counts.get(key,0)+1
 summary=record['summary'];assert summary['sampleCount']==len(samples) and summary['totalSelfTimeMicros']==sum(deltas)
 assert math.isclose(summary['totalSelfTimeMs'],sum(deltas)/1000)
 for row in summary['topFrames']:
  key=(row['url'],row['functionName'],row['lineNumber'],row['columnNumber']);assert row['selfTimeMicros']==totals[key] and row['sampleCount']==counts[key]
 for excerpt in record['topFrameSourceExcerpts']:
  fn=excerpt['productionFile'];assert excerpt['productionSha256']==inputs['productionFiles'][fn]
  code=(root/fn).read_text();assert code[excerpt['excerptStartOffset']:excerpt['excerptEndOffset']]==excerpt['minifiedCodeExcerpt']
 for asset in record['loadedBuildResources']:
  fn='dist-product-mixed-v2/'+('assets/' if asset['filename']!='product-mixed-v2.html' else '')+asset['filename'];assert asset['status']==200 and asset['sha256']==inputs['productionFiles'][fn]
 print('PASS independently recomputed CPU profile',record['arm'],len(samples),'samples',summary['totalSelfTimeMs'],'ms')
print('PASS frozen CPU inputs, raw samples, weighted top frames, loaded bytes, source offsets and lifecycle contracts')
