# Packet C Darwin v3 test fixture repair

The immutable Darwin v3 gate passed 1,248 Deno tests, all 56 compiled fixtures and the other source gates; its sole Deno failure was the new host-time local recovery case. The test's `Health` component assigned an external setter before reading a resource. On the deliberately suspended render, that assignment replaced the accepted mount setter with a candidate setter. `OwnerPreparation.discard()` revokes candidate dispatch controls, so the host callback's action returned false and no local update was queued.

The fixture now captures the accepted setter immediately after the successful mount, before dispatching the pending resource. Its host-write callback invokes that exact setter and asserts the dispatch returns true. The old Health value during host publication, the later ready-cut local value, the ancestor Store action, and all historical test assertions remain unchanged. No runtime source or benchmark workload changed.

Packet C did not run tests, typechecks, builds, benchmarks, browser/server work or Git commands. Luna's next frozen gate should establish that the accepted setter queues the action, the old cut stays visible during the host write, and the ready retry publishes the new local value.
