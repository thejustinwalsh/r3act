# Installed HMR source review

Source basis: main `4e31cfb71707e445e6d24b143c30402c092742c2` plus this unit's captured changes. The earlier installed-HMR offline evidence and the publication-callback Darwin-v4 gate predate this change. Neither certifies its browser behavior.

## Concrete defect and replacement

The existing `nativeModuleCompilerPlugin.handleHotUpdate` sent native retirement and full reload before compiling an edited native module. Its fixture explicitly expected those messages after a failed transform. Installed Vite 8.3.1 invokes the hook before its ordinary update/error delivery; a later diagnostic cannot retract a retirement already delivered to the runtime. The old optional invalid-edit browser contract expected accepted roots to remain live, so source and verifier disagreed.

The hook now snapshots the affected native modules' existing revision/instance tokens before awaiting source reads. A tracked native edit passes Vite OXC parsing and Rust semantic compilation without registering a new transform. It rereads the source and validates every captured affected token before sending the captured invalidations and full reload. A rejected or superseded edit sends neither. Same-token retransformation remains valid; object allocation is not a new revision. The existing compiled-module map remains the authority. The former affected Set becomes a bounded per-event token Map; no persistent registry or runtime history is added.

Focused plugin cases retain direct and dependent invalidation, React self-accept boundaries and classification restart. New cases cover syntax rejection, parser-valid/Rust-invalid async authoring, repair, a source changing during preflight, a same-token transform, a superseding native transform, and a superseding affected importer. They have not been executed at source-review time.

## Integration and limits

The successor consumer retains the actual shared World/Store, native DOM/Three roots, pending grouped reveal, React/Radix island and owned/borrowed resource lifetimes. A native const-arrow Position exercises the current compiler subset. The required browser sequence checks independent React Refresh, rejected native syntax against accepted old UI, successful native remount, old pending cancellation and final cleanup. It must distinguish expected parser diagnostics from unrelated errors and cannot pass after timeout or failed cleanup.

This preflight covers direct tracked native parsing and compiler semantic rejection. It does not validate arbitrary imported dependency syntax, runtime execution, or every later third-party transform. Those failures can still appear during reload. Uncertain native edits remount; no native hook-state preservation, arbitrary rollback or cross-renderer visual atomicity is promised. Temporary preflight parsing/compilation and token snapshots add edit-time work; HMR latency and memory costs are unqualified.

The consolidated gate captures this unit alongside product/compiler sources and builds current packages. Fresh preparation must match the package report, copied consumer/harness, installed sources and compiler. One bounded headless HTTPS browser run follows primary review. Only a passing untimed Native/React build proof and installed HMR receipt can authorize the one Native-first build pair; it measures process spawn-to-exit with potentially warm caches, not runtime speed or cold/memory qualification. Any failure remains in its original namespace.

The historical local server skill is absent. Primary loaded the official upstream Portless skill; its exact bytes, URL and hash and the existing CLI/proxy observations are preserved in `evidence/portless-guidance/`. The run reuses the trusted shared HTTPS proxy and owns only its temporary consumer route/process. No VM is required and saved memory defaults stay unchanged.

Full-plan platform, authored realtime/lifecycle/cold/memory/presentation/independent-device requirements remain. Zero human participants establish no maintenance advantage. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their original scope.
