# First-pass integrated slice: verification results

## Final gates

The final full frozen Deno gate passed **813 tests with 0 failures** in [`deno-full-v3.log`](deno-full-v3.log). This is the full-source receipt; the earlier [`gate-results-v4.md`](gate-results-v4.md) is a package-consumer receipt, not a Deno v4 run.

Native-tooling passed in [`native-tooling-v2.log`](native-tooling-v2.log). The locked Cargo test passed **42 tests**, and the debug compiler build passed; see [`cargo-test-v1.log`](cargo-test-v1.log) and [`cargo-build-v1.log`](cargo-build-v1.log). Rust inputs remained unchanged through the final boundary, so those results and compiler binary were reused. The five actual compiled runtime fixtures passed in v2: joint transaction, scoped collection, retained transaction, DOM owner row, and Three owner row; their receipts are the five [`compiled_*_v2.log`](.) files.

The fresh package build passed in [`package-build-v2.log`](package-build-v2.log), with complete artifacts archived in [`packaging-v2/`](packaging-v2/). The one released fresh-consumer gate passed in [`package-consumer-v3.log`](package-consumer-v3.log). It installed all five tarballs, checked package identities, licenses, JS and declaration maps, shared runtime exports and authored TSX declarations, then compiled and ran TSX through the packaged Rust/OXC plugin without Cargo. The preceding EACCES failure is retained; it was resolved by the reviewed package-mode repair, and the successful v2 build/v3 consumer receipts supersede it.

The authorized benchmark build passed. Its proof is [`build-proof.json`](../benchmark/proof-v1/build-proof.json), with the raw invocation receipt in [`benchmark-build-v1.log`](benchmark-build-v1.log). The primary reviewed that exact proof and authorized one pair. The sole pair passed as `PASS_DESCRIPTIVE_PAIR_ONLY`; details and limitations are in [`outcome.md`](../benchmark/outcome.md), with the complete raw result in [`pair-one-shot.json`](../benchmark/proof-v1/pair-one-shot.json) and collector output in [`benchmark-run-v1.log`](benchmark-run-v1.log).

That pair measured a native median of 0.85 ms and React median of 0.50 ms, a descriptive native/React ratio of 1.70. The maximum of eight samples was 2.30 ms for native and 0.70 ms for React. Each arm mounted and cleaned up all 1,024 row effects once; the output digests matched. All ten native candidates were accepted, the native root had zero owners/readers/children after disposal, both arms had zero page and console errors, and the 697-entry before-and-after pair audit matched. These are one-page descriptive observations, not qualification, tail, locality, heap/GC, cold-mount, transport, visual/paint, or second-device evidence.

## Source and artifact locks

[`source-lock-v1.json`](source-lock-v1.json) records the initial 39-input gate inventory. Its Deno and tooling checks stopped at TypeScript errors (`preparedProgram.readSources` was `unknown`, and a callback parameter was implicit `any`); the Deno test bodies did not execute. Cargo and the five compiled fixtures passed on their then-captured implementation inputs.

[`source-lock-v2.json`](source-lock-v2.json) records the corrected-source gate inventory (51 inputs). The Deno suite ran 813 tests: 811 passed and two assertions failed. Primary corrected those test expectations; the exact prior tests and v1/v2 logs remain under `attempts/`. Native tooling and all five compiled fixtures passed against v2 inputs. The final full Deno run is the v3 receipt above.

[`source-lock-v3.json`](source-lock-v3.json) records the corrected test inputs for the final full frozen Deno pass. Runtime and Rust inputs were unchanged for the test-only repair. The successful final runtime suite, unchanged Rust results, tooling check and compiled fixtures are reported above with their original raw logs; no additional gate was run for this report.

[`source-lock-v4.json`](source-lock-v4.json) captured the pnpm 11 workspace-override verifier correction before the consumer-only attempt. That attempt still failed with EACCES while launching the packaged compiler. [`source-lock-v5.json`](source-lock-v5.json) captured 37 source/config inputs before the reviewed package-mode repair's fresh build and consumer gates; it has no read errors. The successful package artifacts and consumer receipt are archived separately under `packaging-v2/`; the preceding complete cache and consumer receipt are preserved in `packaging-v1-consumer-v2/`.

The benchmark build proof carries its own 691-entry source/build input audit and the exact compiler and production asset hashes. The pair receipt separately records 697 before-and-after source-lock entries; all matched. Its build-proof SHA-256, `09029d051c9c90000de72bd0a486fbb4f70e6d7b7cb0f01393a31e476f5023b6`, matches both the primary's run authorization and the pair receipt. The pair used the exact proof and did not rebuild or alter source.

## Preserved failures and retries

All failed receipts remain available and were not rewritten:

- v1 Deno/tooling TypeScript errors: [`deno-full-v1.log`](deno-full-v1.log), [`native-tooling-v1.log`](native-tooling-v1.log).
- v2 Deno's two test-assertion failures: [`deno-full-v2.log`](deno-full-v2.log); the archived assertions are under [`attempts/`](attempts/).
- Initial package consumer registry 404: [`package-consumer-v1.log`](package-consumer-v1.log).
- Consumer EACCES before the reviewed package-mode repair: [`package-consumer-v2.log`](package-consumer-v2.log).

The one package rebuild and successful consumer run followed primary review. The one benchmark build and the one browser pair followed separate proof review and authorization. No timing result was selected, discarded, or retried.
