import hashlib, json, math, pathlib, re, stat, subprocess, sys, urllib.parse

ROOT = pathlib.Path.cwd()
BASE = pathlib.Path('implementation/2026-10-18-authored-lifecycle')
OUT = BASE / 'verification/final-audit-v1/supplemental-v1'
ORIGINAL_REPORT_SHA256 = 'd0f1ec620fdcb56800f80eab760a449cd0fe5f2cb3c102e5b5af1a435e11306a'
KNOWN_CHECKER_DEFECTS = [
    'Python formatted integral CSS opacity as 1.0 while browser CSS serialization is 1; compare canonical JS-like numeric CSS strings without changing expected numeric opacity.',
    'Main results timing values are a metric-row table, while verification results uses arm rows; match the values semantically in either orientation.'
]
checks = []

def sha(data): return hashlib.sha256(data).hexdigest()
def readj(path): return json.loads(pathlib.Path(path).read_text())
def digest(path): return sha(pathlib.Path(path).read_bytes())
def add(name, passed, detail=None):
    checks.append({'name': name, 'status': 'PASS' if passed else 'FAIL', **({'detail': detail} if detail is not None else {})})
def check(name, fn):
    try: add(name, True, fn())
    except Exception as e: add(name, False, {'error': repr(e)})
def normalized(s):
    s = re.sub(r'[`*_]', '', str(s))
    return re.sub(r'\s+', ' ', s).strip().lower()
def tables(path):
    result, cur = [], []
    for line in pathlib.Path(path).read_text().splitlines():
        if line.lstrip().startswith('|'):
            cells = [x.strip() for x in line.strip().strip('|').split('|')]
            if cells and all(re.fullmatch(r':?-{3,}:?', x.replace(' ', '')) for x in cells): continue
            cur.append(cells)
        elif cur:
            result.append(cur); cur=[]
    if cur: result.append(cur)
    return result
def num(s): return float(re.sub(r'[^0-9.+-]', '', str(s)))
def jsnum(n): return format(n, '.15g')
def expected_rows():
    rows=[]
    for ident in list(range(2, 256))+[256, 0]:
        local=1 if ident == 0 else 0
        opacity=((60+ident)%10+1)/10
        rows.append({'id':ident,'step':'60','local':str(local),
                     'transform':f'translateX({(60+ident)%128}px)',
                     'opacity':jsnum(opacity),'text':f'{ident}:60:{local}'})
    return rows
def verify_lifecycles():
    receipts=[]
    for filename in ('timing-pair-one-shot.json','heap-pair-one-shot.json'):
        r=readj(BASE/'workload/proof-v2'/filename)
        assert len(r['sourceBefore']) == len(r['sourceAfter']) == 760
        assert all(x['matches'] for x in r['sourceBefore']+r['sourceAfter'])
        assert not r['errors'] and not r['cleanupErrors'] and r['stopReason'] is None
        assert not r['blockedRequests'] and not r['requestFailures'] and not r['pageErrors'] and not r['consoleErrors']
        assert [a['arm'] for a in r['arms']] == ['native','react']
        for a in r['arms']:
            s=a['finalScene']; d=s['diagnostics']; post=a['postDispose']; pd=post['diagnostics']
            assert s['rows']==expected_rows() and s['row0Retained'] is True
            assert s['detail']=={'fallback':0,'ready':1,'text':'detail ready'}
            assert s['health']=={'fallback':0,'ready':1,'text':'health ready'}
            assert d['rowSetups']==257 and d['rowCleanups']==1
            for prefix in ('detail','health'):
                assert d[prefix+'FallbackSetups']==d[prefix+'FallbackCleanups']==1
            assert post['rows']==[] and post['remainingChildren']==0
            assert pd['rowSetups']==pd['rowCleanups']==257
            for prefix in ('detail','health'):
                assert pd[prefix+'FallbackSetups']==pd[prefix+'FallbackCleanups']==1
            assert pd['storeListeners']==0 and pd['disposed'] is True
            if a['arm']=='native': assert pd['storeReaders']==pd['ownerCount']==pd['pendingChangeCount']==0
        assert r['arms'][0]['finalScene']['rows']==r['arms'][1]['finalScene']['rows']
        assert r['arms'][0]['finalScene']['detail']==r['arms'][1]['finalScene']['detail']
        assert r['arms'][0]['finalScene']['health']==r['arms'][1]['finalScene']['health']
        receipts.append(r)
    timing, heap=receipts
    timing_rows=[]
    for a in timing['arms']:
        samples=a['updateMs']; assert len(samples)==60
        ordered=sorted(samples)
        expected={'firstMs':samples[0],'medianMs':(ordered[29]+ordered[30])/2,
                  'p95Ms':ordered[56],'sumMs':sum(samples)}
        expected['measuredLifecycleSubtotalMs']=a['mountDurationMs']+sum(samples)+a['editDurationMs']+a['disposeDurationMs']
        for key,value in expected.items(): assert math.isclose(a['stats'][key],value,rel_tol=1e-9,abs_tol=1e-7),(a['arm'],key,a['stats'][key],value)
        assert timing['comparison'][a['arm']]==a['stats']
        timing_rows.append({'arm':a['arm'],'intervals':len(samples),'stats':a['stats'],
                            'mountMs':a['mountDurationMs'],'editMs':a['editDurationMs'],
                            'disposeMs':a['disposeDurationMs'],'timerQuantumMs':a['timerQuantumMs']})
    phases=['baseline','mounted','updatedEditedRevealed','disposedControllerRetained','releasedController']
    heap_details=[]
    for a in heap['arms']:
        obs=a['observations']; assert list(obs)==phases
        assert 'stats' not in a and 'updateMs' not in a and heap['timingMeaning'] is None
        base=obs['baseline']; delta={}
        for phase,data in obs.items():
            hd,dom=data['heap'],data['dom']
            assert set(hd)=={'usedSize','totalSize','embedderHeapUsedSize','backingStorageSize'}
            assert set(dom)=={'documents','nodes','jsEventListeners'}
            delta[phase]={'usedSize':hd['usedSize']-base['heap']['usedSize'],
                          'totalSize':hd['totalSize']-base['heap']['totalSize'],
                          'documents':dom['documents']-base['dom']['documents'],
                          'nodes':dom['nodes']-base['dom']['nodes'],
                          'jsEventListeners':dom['jsEventListeners']-base['dom']['jsEventListeners']}
        assert a['signedDeltasFromBaseline']==delta
        heap_details.append({'arm':a['arm'],'observations':obs,'signedDeltasFromBaseline':delta})
    return {'timingIntervalsPerArm':[x['intervals'] for x in timing_rows], 'timing':timing_rows,
            'heapPhasesPerArm':[len(x['observations']) for x in heap_details], 'heap':heap_details,
            'sourceBeforeAfterMatchesPerReceipt':[760,760], 'lifecycleChecks':'PASS',
            'errorsPerReceipt':[0,0]}

def verify_docs():
    main=BASE/'results.md'; verify=BASE/'verification/results.md'
    timing=readj(BASE/'workload/proof-v2/timing-pair-one-shot.json')
    heap=readj(BASE/'workload/proof-v2/heap-pair-one-shot.json')
    metrics=[('first update','firstMs'),('update nearest-rank median','medianMs'),
             ('update nearest-rank p95','p95Ms'),('60-update sum','sumMs'),
             ('first application mount','mountDurationMs'),('generic array edit','editDurationMs'),
             ('disposal','disposeDurationMs'),('measured subtotal','measuredLifecycleSubtotalMs')]
    # Row-oriented table in results.md: each metric is a row with Native and React columns.
    tbs=tables(main); metric_table=next(t for t in tbs if t and normalized(t[0][:3])==['measured call / summary','native ms','react ms'])
    by_metric={normalized(row[0]):row for row in metric_table[1:] if len(row)>=3}
    for label,key in metrics:
        row=by_metric[normalized(label)]
        for ix,arm in ((1,'native'),(2,'react')):
            a=next(x for x in timing['arms'] if x['arm']==arm)
            expected=a['stats'][key] if key in a['stats'] else a[key]
            assert math.isclose(num(row[ix]),round(expected,1),abs_tol=1e-9),(label,arm,row[ix],expected)
    # Arm-oriented table in verification/results.md.
    arm_headers=['Arm','First update','Median update','p95 update','60-update sum','Mount','Keyed edit','Disposal','Measured subtotal']
    normalized_headers=[normalized(x) for x in arm_headers]
    arm_table=next(t for t in tables(verify) if t and all(x in [normalized(y) for y in t[0]] for x in normalized_headers))
    for row in arm_table[1:3]:
        arm=normalized(row[0]); a=next(x for x in timing['arms'] if x['arm']==arm)
        actual=[num(x) for x in row[1:9]]
        expected=[a['stats']['firstMs'],a['stats']['medianMs'],a['stats']['p95Ms'],a['stats']['sumMs'],a['mountDurationMs'],a['editDurationMs'],a['disposeDurationMs'],a['stats']['measuredLifecycleSubtotalMs']]
        assert all(math.isclose(x,round(y,1),abs_tol=1e-9) for x,y in zip(actual,expected)),(arm,actual,expected)
    # Compare phase and signed heap deltas semantically in each document layout.
    main_heap=next(t for t in tbs if t and [normalized(x) for x in t[0]]==['forced-gc phase','native used-heap delta b','react used-heap delta b'])
    for phase in ('mounted','updatedEditedRevealed','disposedControllerRetained','releasedController'):
        row=next(r for r in main_heap[1:] if normalized(r[0])==normalized(phase))
        for col,arm in ((1,'native'),(2,'react')):
            d=next(a for a in heap['arms'] if a['arm']==arm)['signedDeltasFromBaseline'][phase]['usedSize']
            assert int(re.sub(r'[^0-9+-]','',row[col]))==d
    vtables=tables(verify)
    raw_heap=next(t for t in vtables if t and [normalized(x) for x in t[0]]==['phase','native used / total','native dom nodes / listeners','react used / total','react dom nodes / listeners'])
    delta_heap=next(t for t in vtables if t and [normalized(x) for x in t[0]]==['phase','native delta','react delta'])
    phase_names=[('baseline','baseline'),('mounted','mounted'),('updated, edited, revealed','updatedEditedRevealed'),('disposed controller retained','disposedControllerRetained'),('controller released','releasedController')]
    for label,phase in phase_names:
        row=next(r for r in raw_heap[1:] if normalized(r[0])==label)
        delta_row=next(r for r in delta_heap[1:] if normalized(r[0])==label)
        for ix,arm in ((1,'native'),(3,'react')):
            d=next(a for a in heap['arms'] if a['arm']==arm)['observations'][phase]
            val=f"{d['heap']['usedSize']:,} / {d['heap']['totalSize']:,}"
            assert row[ix]==val,(phase,arm,row[ix],val)
        for ix,arm in ((1,'native'),(2,'react')):
            a=next(a for a in heap['arms'] if a['arm']==arm)
            d=a['signedDeltasFromBaseline'][phase]
            val=f"{d['usedSize']:+,} / {d['totalSize']:+,}; {d['nodes']:+,} / {d['jsEventListeners']:+,}"
            if phase=='baseline': val='0 / 0; 0 / 0'
            assert delta_row[ix]==val,(phase,arm,delta_row[ix],val)
    proof_sha=digest(BASE/'workload/proof-v2/build-proof.json')
    timing_sha=digest(BASE/'workload/proof-v2/timing-pair-one-shot.json')
    heap_sha=digest(BASE/'workload/proof-v2/heap-pair-one-shot.json')
    lock_sha=digest(BASE/'workload/proof-v2/source-lock.json')
    compiler=readj(BASE/'workload/proof-v2/build-proof.json')['compiler']['sha256']
    release=readj('implementation/2026-10-18-authored-lifecycle/verification/darwin-v2/receipt.json')['packageValidation']['compiler']['sha256']
    for path,needed in ((main,[proof_sha,timing_sha,heap_sha,compiler,release]),
                        (verify,[lock_sha,proof_sha,timing_sha,heap_sha,compiler])):
        text=normalized(path.read_text())
        for h in needed: assert h in text,(path.as_posix(),h)
    checked=[main,verify,BASE/'design.md',BASE/'source-review.md',BASE/'workload/README.md',
             pathlib.Path('docs/authored-lifecycle-costs.md'),pathlib.Path('implementation-checkpoint.md'),
             pathlib.Path('final-master-plan.md'),pathlib.Path('implementation/2026-10-18-first-pass/design.md'),pathlib.Path('paper.md')]
    broken=[]
    for source in checked:
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',source.read_text()):
            target=target.strip().split()[0].strip('<>')
            if not target or re.match(r'^(?:https?:|mailto:|data:)',target,re.I): continue
            part=urllib.parse.unquote(target.split('#',1)[0])
            if part and not (source.parent/part).resolve().exists(): broken.append({'source':source.as_posix(),'target':target})
    assert not broken,broken
    return {'rowAndArmTimingTablesMatch':True,'mainAndVerificationHeapTablesMatch':True,
            'proofTimingHeapLockCompilerHashesMatch':True,'localMarkdownFilesChecked':len(checked),'brokenLinks':broken}

def main():
    original=BASE/'verification/final-audit-v1/report.json'
    raw=original.read_bytes()
    report=json.loads(raw)
    assert sha(raw)==ORIGINAL_REPORT_SHA256
    assert report['status']=='FAIL' and len(report['checks'])==11
    failed=[x['name'] for x in report['checks'] if x['status']=='FAIL']
    assert failed==['timing and heap receipts, all row/output/lifetime assertions, hashes and arithmetic',
                    'results and cost docs semantically match receipts and current local links resolve']
    add('original audit report immutable and bound',True,{'sha256':sha(raw),'status':report['status'],'failedChecks':failed})
    add('documented checker defects scoped',True,KNOWN_CHECKER_DEFECTS)
    check('timing and heap receipts, numeric CSS serialization, rows/lifetimes, arithmetic and raw deltas',verify_lifecycles)
    check('both results table orientations, receipt values/hashes and current local links',verify_docs)
    result={'schemaVersion':'authored-lifecycle-final-audit-supplemental-v1',
            'status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL',
            'boundOriginalReportSha256':sha(raw),'knownCheckerDefects':KNOWN_CHECKER_DEFECTS,
            'checks':checks,'note':'This supplements only the two failed check groups; it does not rewrite or replace the original audit.'}
    (OUT/'report.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    return 0 if result['status']=='PASS' else 1

if __name__=='__main__': sys.exit(main())
