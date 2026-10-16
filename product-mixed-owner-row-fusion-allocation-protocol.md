# Owner-row fusion allocation diagnostic

Prepared 13 October 2026. This is a six-page CDP allocation and JavaScript
heap diagnostic for the already-built owner-row-fusion candidate. It is not a
performance comparison, release gate, allocation pass gate, or evidence that
the candidate is superior to React. The current timing result is separately
locked as `implementation/2026-10-13-owner-row-fusion-timing/status.json` and
its evidence archive SHA-256 is
`06a33b0b9d403802877066972cc8ead67e68aba9356f9c715f95005b258cd23c`.
That record has a timing speed failure and an unmeasured allocation gate; this
diagnostic cannot change either result. The older timing label embedded in the
candidate status is historical context only.

## Frozen inputs

Use `implementation/2026-10-13-owner-row-fusion/source-and-evidence.tar.gz`
with SHA-256
`cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382` and the
matching status file. The archive contains 1,093 members: 1,004 source/build,
25 current verification, and 64 historical verification entries. Keep the
historical inventory separate. Independently check each archive member and
current file against its respective status map.

Lock the 695-test/33-Rust-test correctness checkpoint, all five production
assets, the authored owner-row and actual-Three proofs, the compiler proof
quartet, and the reused V5 cell-shape diagnostic with its bundled inputs. Also
lock the separate six-page production pilot under
`implementation/2026-10-13-owner-row-fusion-pilot/`, its archive and
verification, manifest, six raw pages, both pilot verifier scripts, and all
pilot status evidence files. Require all pilot pages and five served asset
hashes to match the same candidate and the pilot engine tuple to match the V5
diagnostic. Do not modify frozen inputs or update the candidate's immutable
status counts.

Before preregistration and again after collection, verify the archive, all
three candidate hash maps, pilot evidence, proof files, tool sources, schedule,
production configuration and served asset bytes. The collector must preserve
all failures and refuse to reuse a nonempty output directory.

## Profile collection

Use the unchanged 30-page product schedule only for its fixed selected pages:
sequences 0/1, 10/11, and 20/21, corresponding to React/native pairs at 128,
512, and 1,024 rows. Collect serially in that exact order, with a fresh headed
browser context per page, GPU disabled, and a 1,200×900 viewport. Use the
already-built `dist-product-mixed-compiled-owner-row-fusion` assets; do not
rebuild. Serve through the configured Portless HTTPS origin and apply COOP
`same-origin` plus COEP `require-corp`. Confirm each page loads the common
assets and selected arm chunk, with exact served bytes, and does not load the
opposite arm chunk.

Start CDP HeapProfiler sampling on `about:blank` before product navigation at
32,768 bytes, with objects collected by both minor and major GC included.
Record Runtime heap usage after forced GC before navigation, after harness
disposal, and after another forced GC. Keep the whole-page profile scope:
module import, initial mount, 60 warmup frames, 240 measured frames, correctness
inspection, and disposal. Require frames 61–300, the eight structural frames,
all five harness checks, production confirm mode, and no harness or browser
errors. Sampling includes work outside update commits and must not be described
as per-update allocation.

Preserve the stopped raw CDP sampling tree and flat samples, the independently
recomputable flattened tree and top-frame summary, emitted-source excerpts,
heap readings, harness result, served-resource records, and failures. Do not
omit anonymous, unresolved, builtin, or inlined frames. Do not force tree and
flat sample totals to agree; they are distinct CDP outputs. Source excerpts
must point to exact locked served asset bytes and valid UTF-16 offsets.

## Interpretation and output

Write only to `results/product-mixed-owner-row-fusion-allocation/`, with
preregistration, six raw pages, progress/final manifest, post-lock report,
final results, and independent `verification.json`. The output does not create
an allocation threshold or pass/fail verdict. Keep allocation evidence
separate from timing evidence.

Sampling is probabilistic. One pair per size is diagnostic only. Post-disposal
heap readings do not measure mounted cache size and cannot prove absence of
leaks. JavaScript heap measurements exclude DOM, GPU, and presentation memory.
The study does not establish CPU speed, causal improvement over a prior
candidate, independent-device performance, release readiness, or a general
framework advantage.
