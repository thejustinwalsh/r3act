# Packet A Darwin-v1 type repair

The preserved first consolidated gate failed before runtime startup. Deno reported TS2339 at `native_frame_loop.ts` start-up failure access and delayed replacement resolution access. Control-flow analysis treated `#asyncError` as undefined after `start()` cleared it, and `active.handle` as undefined after delayed reprepare cleared it; calls into the scheduler and queue can mutate both indirectly, but TypeScript did not widen those fields across the calls.

The controller now reads the current tagged asynchronous error and active work resolution through small methods after the relevant callback/queue call. This changes no scheduling, publication, draw, or cleanup branch. A source scan covered the other repeated `#asyncError`, `active.handle`, `active.resolution`, `#active`, and RAF token reads; the existing `#asyncFailure` helper already handles the other asynchronous error checks, and no other read follows an assignment of undefined across an indirect mutation in the same control-flow path.

No test or build was run for this repair. Luna should rerun the full frozen successor gate after primary source review. The prior gate's 75/80 phases plus one skip, 107 Rust and 59 old compiled fixture results remain scoped to its archived source. The new compiled fixture reentry failure is separate and outside Packet A ownership.
