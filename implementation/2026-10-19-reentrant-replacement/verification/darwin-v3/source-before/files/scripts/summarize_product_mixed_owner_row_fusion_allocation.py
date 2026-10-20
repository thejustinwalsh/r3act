import hashlib,json,html
from pathlib import Path
root=Path('results/product-mixed-owner-row-fusion-allocation')
v=json.loads((root/'verification-v2.json').read_text());assert v['status']=='PASS'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
rows=[]
for size,react,native in [(128,0,1),(512,10,11),(1024,20,21)]:
 arms={}
 for arm,seq in [('react',react),('native',native)]:
  p=root/f'{seq:02d}-{arm}-{size}.json';d=json.loads(p.read_text());assert d['status']=='PASS'
  stats=v['pages'][str(seq)]
  arms[arm]={'path':str(p),'sha256':sha(p),'treeSelfSizeBytes':stats['treeSelfSizeBytes'],'flatSampleSizeBytes':stats['flatSampleSizeBytes'],'heapBaseline':d['heapUsageBaseline'],'heapAfterForcedGC':d['heapUsageAfterForcedGC'],'topFrames':d['cdp']['topFrameAttribution'][:12]}
 rows.append({'size':size,'arms':arms,'sampledTreeNativeReactRatio':arms['native']['treeSelfSizeBytes']/arms['react']['treeSelfSizeBytes']})
summary={'schemaVersion':1,'status':'DIAGNOSTIC_VERIFIED','scope':'Whole-page sampled JS allocations; one pair per size. Not update-only, exact totals, release allocation superiority, or speed evidence.','independentVerification':{'path':str(root/'verification-v2.json'),'sha256':sha(root/'verification-v2.json')},'analyzer':{'path':'scripts/summarize_product_mixed_owner_row_fusion_allocation.py','sha256':sha('scripts/summarize_product_mixed_owner_row_fusion_allocation.py')},'sizes':rows}
with (root/'summary.json').open('x') as f:json.dump(summary,f,indent=2);f.write('\n')
parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" role="img"><title>Owner-row fusion sampled allocations</title><rect width="960" height="520" fill="white"/>','<style>text{font-family:system-ui,sans-serif;fill:#182230} .small{font-size:13px;fill:#526074}</style>','<text x="60" y="35" font-size="20" font-weight="600">Whole-page sampled JavaScript allocation</text>','<text x="60" y="60" class="small">CDP tree selfSize · one React/native pair per size · diagnostic only</text>']
maxmb=350
for tick in range(0,351,50):
 y=405-tick/maxmb*300;parts.append(f'<line x1="60" x2="900" y1="{y}" y2="{y}" stroke="#dce2e9"/><text x="50" y="{y+4}" text-anchor="end" class="small">{tick}</text>')
for i,row in enumerate(rows):
 x=160+i*280
 for arm,offset,color in [('react',-42,'#77879a'),('native',42,'#397da9')]:
  mb=row['arms'][arm]['treeSelfSizeBytes']/1e6;h=mb/maxmb*300
  parts.append(f'<rect x="{x+offset-30}" y="{405-h}" width="60" height="{h}" fill="{color}"/><text x="{x+offset}" y="{397-h}" text-anchor="middle" class="small">{mb:.1f}</text>')
 parts.append(f'<text x="{x}" y="432" text-anchor="middle" class="small">{row["size"]} rows</text>')
parts+=['<text x="60" y="90" class="small">Sampled MB (decimal)</text>','<rect x="620" y="44" width="12" height="12" fill="#77879a"/><text x="639" y="55" class="small">React Compiler</text><rect x="780" y="44" width="12" height="12" fill="#397da9"/><text x="799" y="55" class="small">Native</text>','<text x="60" y="472" class="small">Includes import, mount, warmup, updates, inspection and disposal; flat samples are reported separately.</text>','<text x="60" y="496" class="small">Lower sampled allocations did not satisfy the separate speed gate. DOM/GPU memory is excluded.</text>','</svg>']
with (root/'summary.svg').open('x') as f:f.write('\n'.join(parts)+'\n')
print(json.dumps([{'rows':r['size'],'sampledTreeRatio':r['sampledTreeNativeReactRatio']} for r in rows],indent=2))
