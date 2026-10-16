# Semantic publication probe gate

**Gate result: type check failed; probe tests were not run.** This records the single authorized check only. Since its exit was nonzero, the conditional `deno test` invocation did not proceed. No source, test, manifest, dependency, or lock file was changed.

## Invocation and result

- Deno: `deno 2.6.3 (stable, release, aarch64-apple-darwin)`
- Command: `/opt/homebrew/bin/deno check --frozen --no-config --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/publication_probe_test.ts`
- Actual tool exit code: **1**. The tool reported **51 type-check errors** and `Type checking failed`.
- Visible diagnostics include missing DOM names (`CSSStyleDeclaration`, `Node`, `HTMLElement`, `document`, `SVGElement`, and related element types), with cascading `never` property errors in imported runtime files. This is a failed type-check gate, not evidence that either semantic assertion passed or failed.
- The exec tool returned a combined output field, capped at 3,000 tokens (reported original token count 3,576). The receipt preserves the available excerpt and explicitly records that truncation; stdout and stderr were not separately exposed. No retry was made.
- The test command was not invoked. There are therefore no case traces or assertion results to report.

The exact attempted command and available tool result are in [`check.tool-result.json`](check.tool-result.json). The tool's no-config type environment did not provide browser DOM globals required by the live runtime import graph. This report does not add flags, declarations, or alter type-check settings to bypass the failure.

## Preservation audit

Before and after, the probe manifest SHA was `35453534c52e98cd6bf4265b00e015c64d12556bc162ec55791d69f596b27620`, the probe source SHA was `0ddbf6b3724443ea7e77d9d7aefdecd3c709a6e529e1e723984cb8079df735f6`, and the eight-file semantic source lock SHA was `eda269b386a5abae58e2299c1453ace36bbd036a9542daaf5ba58123e4556749`. All eight locked files and four direct imports matched.

The independent 413- and 424-entry structural eligibility locks matched every listed file before and after; their shared 258 `src/` entries matched one another and current live bytes. The earlier unrun draft remained `authored-unrun`. The finite audit also rechecked 1034 unique previously protected structural files, 2181 prior evidence references, and 21 accepted N=128 count/off evidence references. See [`before.json`](before.json) and [`after.json`](after.json) for paths and hashes.

This gate establishes no runtime semantic behavior; neither of the two probe cases executed.
