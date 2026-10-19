# Radix Dialog one-shot pair review

The authorized Native-first headless pair returned outer command exit code 0 and recorded `PASS_DESCRIPTIVE_RADIX_DIALOG_PAIR_ONLY`. It used browser 153.0.8010.12 with headless mode, GPU disabled, a fresh context per arm, and offline production-asset replay at `https://radix-dialog.localhost`. The runner reports no network/TLS connection, project server, or Portless route. The workload completed with no stop reason, blocked request, request failure, page error, console error, or recorded error.

## Behavior and cleanup

Both arm results report `PASS` and returned the same defined output and SHA-256:

```json
{"label":"fresh","point":"7","nativeCount":"1","formValue":"seed","callbackCount":5,"open":true,"mounts":4,"cleanupsBeforeDisposal":3}
```

Shared output digest: `bdea6f638c1309191fbd31673687e2a237fc5a783cc9930c78fa6c083d8c7624`.

Both arms report `baselineRestored: true`, `portalOutsidePrivateRoot: true`, `keyboardEscape: true`, and `diagnostics.disposed: true`. The native diagnostics finish at version 14 with owner count 0, pending change count 0, and source value sync visits 0. The runner’s passing workload covers controlled open/close, real headless Tab/Shift+Tab/Escape, Close, portal/ARIA/focus/scroll restoration, caller portal preservation, form selection and React state across accepted prop updates and keyed moves, discarded/stale/pending candidates, removal/reinsertion, and disposal while open. These are the exercised fixture assertions, not a general React compatibility or accessibility certification.

## Returned timing fields

The pair measures external controlled-open dispatch to the first matching portal MutationObserver. It includes Store/React delivery, React scheduling, and observer delivery, and excludes paint. It does not isolate CPU cost or represent a latency distribution.

| Returned field | Native | React |
|---|---:|---:|
| `setupReturnMs` | 11.5 ms | 10.9 ms |
| `mountToMatchingOutputObservedMs` | 38.4 ms | 11.1 ms |
| `timerResolutionMs` | 0.1 ms | 0.1 ms |
| `openToMutationObserverMs` | 10.1 ms | 13.7 ms |

The single fixed-order pair records Native 3.6 ms earlier for this observer endpoint. This is one descriptive prepaint observation; it does not establish a speed advantage. No disposal-return timing field was emitted. Both arms served the same 579,238-byte JavaScript asset; the shared asset size is not an equivalent-feature per-arm comparison.

## Integrity and cleanup

The pair binds build proof SHA-256 `f9cebe0ce17d76a5f94d50e196a9183a217f8a9a2fa932e939b5be35325f174b` and source lock SHA-256 `db352dcc4b8e03b76d16ca6e908206e39be9e0f30b466680599f9514cdf3caf3`. Each before/after integrity set contains 2,588 rows: current and archived hashes for 1,289 locked inputs, the compiler, and nine captured transforms/assets. All rows match, with no changed rows. The pair receipt also records the exact served HTML and JavaScript hashes for both arms.

The run script closed the browser in its `finally` path. A subsequent read-only process inspection found only its own `ps` and `rg` processes among the requested runner/browser patterns; no pair runner or browser process remained. No retry was run.

## Evidence index

- [One-shot pair receipt](../workload/proof-v2/pair-one-shot.json)
- [Pair runner source](../workload/run-pair.mjs)
- [Exact run authorization](../workload/proof-v2/run-authorization.json)
- [Accepted proof-v2 capture review](workload-proof-v2-review.md)
- [Darwin-v2 correctness review](gate-review-v2.md)
