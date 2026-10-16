# Second-device replication protocol

This protocol adds an independent-device confirmation for two frozen Snake
studies. It does not replace their primary collections, change their
preregistered thresholds, or make frame-cadence measurements equivalent to
display-presentation measurements.

## What the replication can establish

Run the lifecycle study and the callback-cadence study on one separate physical
computer using the exact production bundle already named by each frozen source
lock. Keep each device's records in its own copy of the project. The second
device is a confirmatory replication of these workloads, not a sample of the
population of computers. Page pairs are nested within that one device.

Lifecycle V1 has 30 pages: five shuffled blocks at 512 and 1,024 segments, with
90 warmup and 300 measured callbacks per page. Its primary metric is mount cost
+ measured update CPU + teardown CPU. Cadence V1 has 45 pages: five shuffled
blocks at 1,024, 4,096, and 8,192 segments, with 120 idle calibration, 60
warmup, and 240 measured callbacks per page. Its primary metric estimates late
callbacks and missed callback slots relative to each page's idle RAF baseline.
Use the original preregistrations as the complete definitions of arms,
correctness requirements, exclusions, thresholds, and decision rules.

## Prepare an isolated copy

1. Make a clean copy of the project for the second machine. Preserve the locked
   sources, `dist/`, both preregistrations, both source locks, and package lock
   files, plus `results/post-collection-source-drift.json`. In each study
   results folder in the copy, keep only
   `preregistration.json` and `source-lock.json`; remove copied timestamped
   trial records, `manifest.json`, and `summary.json` from the copy. Leave the
   primary collection untouched. Keep this copy separate so second-device raw
   records cannot be mixed with the original device's records.
2. Install the pinned dependencies from `pnpm-lock.yaml` (`pnpm install
   --frozen-lockfile`). The existing production bundle is the measured artifact;
   do not rebuild, regenerate, or optimize it for the second machine.
3. Verify the frozen inputs before serving the pages:

   ```sh
   deno run --allow-read scripts/verify_snake_device_replication_inputs.ts
   ```

   The check compares both generated schedules with their preregistrations,
   validates all 163 locked source and production entries, and confirms the
   React Compiler marker in each production bundle. It checks the exact
   post-collection source drift recorded in
   `results/post-collection-source-drift.json`; it fails on any unrecorded or
   changed drift.

## Record the device and run

Use a dedicated Chrome profile with extensions disabled. Connect the machine to
power, close CPU-heavy applications, use the same physical display and refresh
setting throughout the run, and keep the browser tab visible and foregrounded.
Do not use remote desktop or change zoom during collection. Record these values
before and after each study:

```text
replication label:
date/time and time zone:
computer model / CPU / memory:
operating system and version:
Chrome version and full user agent:
hardwareConcurrency:
devicePixelRatio:
viewport width × height:
display refresh setting:
power mode and charger status:
browser profile / extensions:
visibility and foreground status:
source-lock verification result:
schedule SHA-256:
```

Before either study, on the same Chrome profile, run this diagnostic in the
DevTools console of a blank tab and save its output with the device metadata.
It records observed positive `performance.now()` steps and sampling cost; it is
diagnostic only and does not change either study's original decision rule.

```js
(() => {
  const percentile = (values, p) =>
    values[Math.min(values.length - 1, Math.floor(values.length * p))];
  const batches = [];
  for (let batch = 0; batch < 5; batch++) {
    const positiveSteps = [];
    let previous = performance.now();
    const started = previous;
    for (let i = 0; i < 50000; i++) {
      const now = performance.now();
      const delta = now - previous;
      if (delta > 0) positiveSteps.push(delta);
      previous = now;
    }
    positiveSteps.sort((a, b) => a - b);
    batches.push({
      elapsedMs: previous - started,
      positiveSamples: positiveSteps.length,
      minPositiveStepMs: positiveSteps[0] ?? null,
      medianPositiveStepMs: percentile(positiveSteps, 0.5) ?? null,
      p95PositiveStepMs: percentile(positiveSteps, 0.95) ?? null,
    });
  }
  return { userAgent: navigator.userAgent, batches };
})()
```

In a terminal from the project root, start only the production preview through
Portless:

```sh
npx --yes portless run --name react-runtime-replica pnpm exec vite preview --config vite.config.ts
```

In a second terminal, print the exact first URLs for that Portless hostname:

```sh
deno run --allow-read=src/browser scripts/print_snake_device_replication_urls.ts \
  --origin=https://react-runtime-replica.localhost:1355
```

Record each printed schedule hash. Open the lifecycle URL in Chrome and let its
`autorun=1` sequence finish. Then open the cadence URL and let its sequence
finish. Do not interact with the page during a run. If a page crashes, loses
visibility, or does not save a passing record, preserve the failure record and
report it; do not replace it with an extra attempt. The auto-advance runs
through all pages in the saved order.

The preview writes to that copy's own `results/snake-frame-lifecycle-v1/` and
`results/snake-frame-cadence-v1/` folders. Keep those as the second-device raw
data archive. Generate manifests and summaries only in that copy using the
existing study scripts. Do not copy second-device raw records into the original
device's accepted-results directory.

## Interpretation

Evaluate each device against the original, unchanged decision rules, then
compare the paired estimates and device metadata across devices. A repeated
direction on a second computer strengthens the workload-specific result. A
different direction narrows the claim and calls for diagnosing browser,
hardware, refresh-rate, and timer differences before proposing a runtime-wide
conclusion. Neither result alone establishes perceived smoothness, GPU
presentation timing, or a general speed advantage across React applications.
