# Darwin package verification supplement

The raw Darwin-v2 consolidated run remains **FAIL**: 33 steps passed, two failed, and one was skipped because its temporary pnpm shim incorrectly forwarded `--store-dir` to non-install commands. This supplement preserves that result and covers only the three package-related steps that did not complete. It does not represent a 36/36 single execution.

The bounded supplement completed all three authorized commands successfully on the same frozen inputs:

| Command | Result | Exit | Deadline |
| --- | --- | ---: | ---: |
| `pnpm check:native-tooling` | PASS | 0 | 300 s |
| `pnpm package:r3act` | PASS | 0 | 900 s |
| `pnpm check:r3act-packages` | PASS | 0 | 900 s |

The package consumer report passed all nine checks, including fresh installation of five tarballs outside the checkout, package identity and license checks, compiler artifact identity, declaration/source-map checks, the shared runtime graph, type checking of authored TSX, running the installed Rust/OXC plugin, and runtime provenance/projection/reveal checks.

The pre-run and post-run audits matched all 859 runner input paths, hashes, and sizes against the immutable source-v2 archive (manifest SHA-256 `2b61beb3580890de9c651122e5fa264f5f71f20b5317f32ed738839ff7533b25`). The compiler artifact hash remained `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`. All five fresh tarballs matched their package report hashes:

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `@r3act/core` | 980,509 | `fee508aece1cdd830a4b31ff027f966e6a7410078392360208e9f3736904d81d` |
| `@r3act/host-dom` | 1,252 | `cd9b9ca857b1ea8ba96a6dedd7c7a8a8f379a5dd5e83db19582d3d07b9ab3e34` |
| `@r3act/host-three` | 1,437 | `a25bf2dadeb96f88d51da7a31a396e1cb78e7d330045d3c644d1946cdcd1b7fd` |
| `@r3act/react-bridge` | 1,299 | `c054d534ae247eab64445b92e94fef7ee48c11e484dca9071039b822f33bbd0f` |
| `@r3act/vite` | 1,215,403 | `b3e5abaceec1d070377154a366bb811eed99eec8ea4d7c9a575cb7d006be6a9b` |

The runner setup used pinned Node 24.18.0 and `CI=true`. Its temporary pnpm shim (SHA-256 `7719c0c52c75197463a603a950610c1a2ed11f3f1ad176693d08c5fd12a84948`) adds `--store-dir /Volumes/Depot/.pnpm-store` only to `pnpm install`; other pnpm arguments are forwarded unchanged. No standalone install command was run. Cargo target variables were unset and build jobs remained one.

Tracked `.cache` remained clean at 19,799 files, and the protected legacy native-package-build evidence remained at 176 unchanged files. The initial local launcher failure is also preserved separately; it occurred before any command launch. The successful receipt and complete raw command logs are in this directory.
