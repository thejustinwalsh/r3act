# Pending queue direct-ack cost diagnostic

## Purpose

Compare the complete `PendingStateChanges` write/capture/acknowledge/scrub path for the staged direct-key API against the same staged module's existing handle/version API. This is a queue-level diagnostic only. It does not exercise React, Root rendering, VDOM, browsers, or production scheduling and cannot establish an application speedup.

The direct-key path trades one queue-key lookup during each acknowledgement for a third caller-owned buffer and a private key capability. The protocol measures that trade across the whole path, including `setCell`, capture, acknowledgement, and buffer scrubbing. It also reports the cost of a native capture that declines after encountering a generic legacy entry.

## Frozen inputs

- Source: `.cache/pending-direct-ack-stage-v3/src/pending_state_changes.ts`
- Expected source SHA-256: `11afdb7111a2f1d399c5d32e7b429456b8004fc106b20277295eb011cb403e1e`
- Harness: `queue_cost_diagnostic.mjs`; its SHA-256 is recorded by the harness before execution.
- Protocol: this file; its SHA-256 is recorded by the harness before execution.
- Runtime: Node 24 or later with built-in TypeScript stripping. The exact Node version, platform, and architecture are recorded.

The harness stops before collecting if the source hash differs. It writes only beneath this diagnostic directory and refuses to overwrite prior output files.

## Workloads

Run every combination of size `128`, `1024`, and `10000` with:

- Sparse workload: `max(1, floor(size * 0.01))` active cells, selected at evenly spaced indexes. The exact active count and resulting density are recorded because small sizes cannot represent exactly one percent.
- Dense workload: every cell active.

Each workload runs ten matched pairs total: five baseline-then-keyed (`AB`) pairs and five keyed-then-baseline (`BA`) pairs. The arms share the same frozen handle and identity objects within each pair, use the same valid monotonically increasing versions, and begin each arm with a fresh queue. Buffer allocation happens before timing and buffers are reused for the full arm.

### Baseline arm (A)

For each batch, call `setCell` once for every active handle, then `captureNative`, `clearNativeThrough`, and clear the used handle/version buffer prefix. A successful capture must return the active count.

### Keyed arm (B)

For each batch, call `setCell` with the same handles and versions, then `captureNativeWithKeys`, `clearNativeThroughKeys`, and clear the used handle/version/key buffer prefix. A successful capture must return the active count.

The first successful batch is timed and recorded independently as `firstColdNs`; it includes initial queue-key creation and, in arm B, initial capability creation. Then run 64 untimed warmup batches followed by 96 individually timed batches. Each timed duration covers writes through buffer scrubbing. The same capture-count assertion is inside the timer in both arms. Queue-size and buffer-scrub assertions run outside timing. At the end of each arm, call `clear()` outside timing, verify the queue remains empty and all buffers are scrubbed, and record that cleanup; this revokes cached capabilities before the next arm/pair.

Record all 96 raw durations per arm per pair, first-cold durations, order, and matched keyed-minus-baseline deltas. Report medians and p95 values as descriptive summaries only. Do not exclude samples, tune thresholds, or rerun a completed collection.

## Generic legacy-decline case

For every size/density workload, separately compare baseline and keyed capture decline. Each batch writes the active native cells and then appends one legacy `StateChange`, so capture returns `null` after visiting the native prefix. Buffers are sized for the full queue. The timed interval includes writes, declined capture, the same null-count assertion in both arms, and Root-like full-buffer scrubbing. Outside timing, call `capture()` and `clearThrough()` to reset both queues identically while retaining cached key metadata for subsequent batches. After the measured samples, call `clear()`, verify queue/buffer cleanup, and record the result.

Record the first cold decline separately, then 64 warmup declines and 96 timed declines per arm. No native acknowledgement is performed in this case because capture declined; the generic snapshot cleanup is the same for both arms and is outside the timed interval. This measures additional keyed-capture work on fallback and is not merged into successful-cut summaries.

## Correctness and data retention

For every successful sample, verify outside timing that the queue is empty and all used buffers have been scrubbed (`undefined` handles/keys and zero versions). For every decline, verify capture returned `null`, the pending queue remained intact until the same generic cleanup, and all capture buffers are scrubbed. Versions are safe integers and increase on every batch. All assertions are fail-closed; the harness preserves partial raw records and writes an error manifest if collection stops after completed pairs.

`raw.ndjson` contains each completed arm as soon as it finishes and each completed matched pair, including all timings. `results.json` contains frozen input hashes, runtime metadata, workload definitions, raw-file hash, completed-pair counts, and descriptive summaries. Both outputs are created with exclusive mode; an existing output aborts before collection. No timing threshold or pass/fail speed gate is used.

## Invocation after review

From the repository root:

```sh
node --experimental-strip-types .cache/pending-direct-ack-cost-diagnostic/queue_cost_diagnostic.mjs
```

Do not start this diagnostic until the parent explicitly approves the protocol and script.
