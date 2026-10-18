# Joint transaction pair outcome

The single authorized offline production asset replay completed with `PASS_DESCRIPTIVE_PAIR_ONLY`. It ran headless Chromium 153.0.8010.12 at 1200×900 with GPU disabled, using Node 24.18.0 and the synthetic HTTPS origin `https://r3act-joint-20261018.localhost`. The origin was fulfilled only from the reviewed, source-locked local production assets; the run made no network or TLS connection and started no project server.

Both arms mounted 1,024 keyed rows, updated 64 row state cells, and moved one row in each combined interaction. Each arm ran two warmups and retained all eight measured samples. Native median was 0.85 ms, with a maximum-of-eight p95 of 2.30 ms; React median was 0.50 ms, with a maximum-of-eight p95 of 0.70 ms. The descriptive native/React median ratio is 1.70. Timer resolution was about 0.10 ms, so both medians exceed twice that step. No sample was removed.

Native mount and disposal took 57.5 ms and 6.9 ms; React mount and disposal took 9.1 ms and 1.0 ms. In each arm, all 1,024 row effects mounted once and cleaned up once. The output digest matched between arms (`d89e8c7e87e38a49f22803be3d3f553d3f6678b89297eb6731575caf12ad5ad9`). The native arm accepted all ten candidates, including warmups, with each candidate's published version matching its target. Both pages reported zero page and console errors. After native disposal, owner, reader, and child counts were all zero; React reported zero remaining children.

The pair receipt's before-and-after audits matched all 697 source-lock entries. Its build proof hash is `09029d051c9c90000de72bd0a486fbb4f70e6d7b7cb0f01393a31e476f5023b6`, matching the primary's one-run authorization. The proof records a 450,055-byte JavaScript asset (132.03 kB gzip); this is build context, not part of the timed comparison.

This is one descriptive pair. It does not establish qualification, latency tails, locality, heap or GC behavior, repeated cold-mount behavior, visual or paint performance, transport performance, or second-device results. The native operation log plus explicit root transaction candidate and the React setters plus array order replacement in `flushSync` are different APIs.

Raw result: [`pair-one-shot.json`](proof-v1/pair-one-shot.json). Collector output and exit: [`benchmark-run-v1.log`](../verification/benchmark-run-v1.log), [`benchmark-run-v1.exit`](../verification/benchmark-run-v1.exit). Build proof: [`build-proof.json`](proof-v1/build-proof.json).
