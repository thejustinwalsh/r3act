# React island descriptive pair

The one authorized pair record is `workload/proof-v2/pair-one-shot.json`, with status `PASS_DESCRIPTIVE_REACT_ISLAND_PAIR_ONLY`. The runner emitted its PASS completion JSON. The enclosing zsh command returned exit code `1` after the Node command completed, because the wrapper attempted to assign zsh's read-only special variable `status`. That wrapper error is preserved in `workload/proof-v2/pair-one-shot.wrapper-error.txt`, with outer exit in `pair-one-shot.outer-exit.txt`; the runner's console output is in `pair-one-shot.console.log`. The runner code's successful completion path falls through without setting a nonzero process status, but a separate Node exit code was not captured, so this report does not claim one.

Both arms passed and produced the same defined output and SHA-256 `2a19ddf4425da99fa0a2a9c73a753139bb3d20886b0548270fb93a0c0e0b7493`:

```json
{"islands":[["a","fresh","7","0","1"],["b","fresh","7","0","1"],["c","next","9","0","0"]],"mounts":[["a",2],["b",1],["c",1]],"cleanups":[["a",1],["b",0],["c",0]],"nativeActions":1}
```

This records island `a` mounting twice and cleaning up once, `b` mounting once with no cleanup, and `c` mounting once with no cleanup in the returned trace. Native callback count was 1. Its two root diagnostics showed disposed roots, zero owners, zero pending changes, and zero source-value sync visits (versions 8 and 3). React's two diagnostics also showed disposed state. The result schema reports `setupReturnMs`, `mountToMatchingOutputObservedMs`, `timerResolutionMs`, and `settlementToMutationObserverMs`; it has no `disposeReturnMs` field.

| Arm | Setup return | Mount to matching output observed | Settlement to MutationObserver |
| --- | ---: | ---: | ---: |
| Native | 5.9 ms | 36.1 ms | 2.1 ms |
| React | 3.3 ms | 3.3 ms | 0.5 ms |

Timer resolution was approximately 0.1 ms in both arms. The fixed-order Native-first difference was 1.6 ms for settlement-to-observer. These are one descriptive observation pair including asynchronous scheduling and observer delivery before paint; they do not establish CPU cost or latency qualification.

Each arm served the same HTML and JavaScript bundle exactly once. The pair record has zero blocked requests, request failures, page errors, or console errors. Its 768 pre-run and 768 post-run source/artifact/compiler rows all matched their frozen hashes: 761 source-lock inputs, one compiler, three built assets, and three transforms. The authorization hash matched the proof it reviewed.

Cleanup evidence: the runner completed both contexts, recorded disposed diagnostics, and calls `browser.close()` in its final cleanup path. A read-only process check after completion found no vitexec/Playwright process or separate headless Chromium process. The pre-existing Google Chrome 155 app process (PID 1314) and its helpers remained; they were left untouched. The pair itself recorded browser version 153.0.8010.12 and no stop reason. No rerun was made after the zsh wrapper error.
