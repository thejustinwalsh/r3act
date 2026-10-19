# Closed const-arrow authoring outcome

Source basis: main `4bc07ceff60cb787109faa84a6f208ca64df4e69` plus the archived changes. Remote main/HEAD still resolve to the initial published `a694d72959970eca750d2fa09c91d0b64ae5494a`; no push or PR is performed. See the [contract](design.md), [source review](source-review.md), [proof protocol](README.md) and [authoring reference](../../docs/native-authoring-reference.md).

## Implementation and correctness

Supported module const arrows now use the existing finite closed Store/resource/forwarding proofs through a borrowed callable view. Numeric arrow certification additionally requires an exact output-only state-declaration body; setter destructuring, render-time callbacks, effects, captures and hidden reads decline. Arrow initializer emission, lexical semantics, name inference, initialization order, existing metadata schemas and runtime authorities remain unchanged. The separate arrow host-leaf hint remains false because its collector does not prove side-effect freedom. A compile-local eligibility set is analysis scratch, not a runtime identity/version registry.

Closed host grammars now ignore empty JSX comment containers and raw ASCII indentation containing a CR/LF, with compatible cooked text. Meaningful single-line spaces/tabs, entities and non-ASCII text are preserved through generic rendering. Existing bounds apply before elision. Named-function proof coverage gains only this deliberate empty-output handling; no storage/traversal redesign occurs.

[Darwin-v2](verification/darwin-v2/receipt.json) passes **46/46 steps**, numeric supervisor exit 0, **1031 runtime tests**, **71 Rust tests**, **30 actual compiled fixtures**, two source proofs, seven Three cases, both retention checks and **13 fresh-package checks**. All **1077 runner inputs** match; **1086 raw source/context files** are archived before commands. Existing runtime/compiler assertions are unchanged; three new Rust tests and one actual compiled fixture exercise the new coverage.

The actual fixture verifies schema-5 Store-A-first/resource-second DOM/Three metadata, expression-arrow forwarding, numeric metadata and mounted identity, CRLF/comments, generic significant text/callback/lexical behavior, independent Store updates during a resource hold, latest-A joint reveal, an unflushed fork's accepted output, changed Store/local controls, unchanged-control admission, exact revision retirement, late stale-result suppression and empty owner/reader/host cleanup. The numeric fixture does not prove an interactive numeric update. Whole-root/VDOM checks, root-specific accepted history, exact acknowledgements, live ownership and quarantine remain unchanged.

[Darwin-v1](verification/darwin-v1/receipt.json) remains FAIL, 45/46 steps. The new harness supplied an absolute path to exact revision invalidation, while the actual compiler registered a repository-relative `source_file`; the call returned false. The repair reads and validates the emitted key and uses it for retirement/cleanup. No product source changed for this repair. Both supervisor receipts preserve raw numeric exits and timestamps.

## Installed production proof and bounded comparison

[Proof-v1](proof-v1/build-proof.json) installs five current private tarballs outside the checkout, typechecks and builds without checkout aliases. Eighteen unit source rows and two external fixture rows, five tarballs, 1621 selected installed files, package report/source hashes, compiler, transforms and assets are bound and checked before/after each phase. The actual React NumericCounter/JointReveal/DialogSlot/App bodies emit `_c(2)`/`_c(12)`/`_c(16)`/`_c(15)` with CompileSuccess and `react/jsx-runtime`. ReactPanel reports CompileError and remains uncompiled in both arms.

The [untimed browser](proof-v1/browser-untimed.json) passes local update, dialog open, changed A, close, partial settlement, final joint reveal and disposal. DOM reaches 11/A=7 and Three [7,2,11], with numeric host identity retained throughout. Both React bodies balance one mount/cleanup; Native DOM/Three owners, pending changes, host handles/resources/events return to zero. Three uses an object scene, without WebGL. Browser/context close with zero errors. These are managed accepted-state/lifetime observations, not cross-renderer paint atomicity.

After primary review, the [hash-bound authorization](proof-v1/run-authorization.json) permits exactly one Native-first local-button-click-to-`data-local` MutationObserver pair while both resources remain held. The [sole pair](proof-v1/browser-one-pair.json) observes **3.5 ms Native / 1.800000000745058 ms React**; Native is slower in this observation. Both arms reach local=1, retain pending output, open the dialog and clean up. Timer quantum is unmeasured. The generic dialog update does not isolate closed-arrow/compiler savings or benchmark a numeric update. There is no favorable retry, CPU/tail/cold/memory/physical-input/presentation/independent-device qualification. Unminified JavaScript is 3308583/1150070 bytes; different host/package graphs prevent an equivalent-feature-size claim.

All browsers are headless/GPU-off, bounded to 90 seconds, with only exact hashed assets served through offline HTTPS interception. No project server or VM starts. Saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build, effective limits unverified behind Depot service-startup permissions. No memory increase occurs.

## Receipt identities and remaining scope

| Receipt | SHA-256 |
| --- | --- |
| Darwin-v2 | `7893559ee7fd6be0c73bb3f7db0f56ab66d0cf945b6ffa95a0297953bd4b08f4` |
| Debug compiler | `c79ca4a95bc5a8007d8ce71d2e4dcfa90dbb9a44c7b0af0963b6c7e163eeb210` |
| Packaged compiler | `ddeb55aabade62c3258358928c658886049329713ac0fcb1518fcc8bcf610510` |
| Installed build | `ebc3e9b3a012b25d162d076fa5805282e99235adbb08768a2e66dd7f32b4430c` |
| Untimed build pair | `0984659f052129f6cb9654ec976b56da9be50c7ec12bf55454f6bd4ea55c5df6` |
| Untimed browser | `136fcd30f4ea0761b3d5de6ab60a78357654726cec8726ded6027ac03f9fac40` |
| Sole runtime pair | `11cf60c668503069aadad071b8bfca9ddbe7803d32be9ec96a245c379985595e` |

The full-plan first-pass goal remains active. Added compiler analysis, emitted metadata, initializer allocation, retained plan and update costs remain unqualified. Current other-platform execution, authored realtime/lifecycle/cold/memory/presentation and independent-device requirements remain open. Human participants remain zero; no maintenance advantage is claimed. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their original scope. Passing this compiler coverage slice does not satisfy the full product finish line.
