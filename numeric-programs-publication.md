# Compiler-executed numeric source/sink programs

## The implemented path

Rust/OXC now emits a hygienic, module-level descriptor table for expressions
accepted by the existing purity analysis. Each sink has a stable source-file
identity and an ordered state-site list. Ordinary TSX receives a third binding
helper argument; authors do not write bindings, mutation loops or flags.
Numeric **inputs** may produce numbers, CSS strings or vectors. Unsupported
expressions keep their existing fallback; the purity grammar was not expanded.

```tsx
function Row() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  return <div data-sum={x + y} style={{ left: `${x}px`, top: `${y}px` }} />;
}
```

The public descriptor contract is `NumericBindingProgramDescriptor`:
`{ schemaVersion: 1, sinkId, sourceSites }`. Projectors remain compiled JavaScript;
there is no runtime eval or bytecode interpreter. Descriptors and source-site
lists are frozen when activated. Host adapters continue using the public VDOM
property/style capabilities.

At mount/publication, the retained VDOM builds stable source slots and sink
handles. Source fanout uses packed reference arrays. Eligibility is refreshed
when source membership, projectors or host capability changes. Removed sink
slots are released and reused; compound sinks occupy one slot across their
multiple source edges.

An eligible numeric-only root flush takes the program route before allocating
dirty-owner/eligibility collections. It fills parallel source/current/previous
buffers. The VDOM validates the entire active prefix and uses source epochs to
reject duplicates in linear time. Sink epochs select each affected sink once,
then stage **all** projections before the first host writer. Primitive output
equality skips writes; mutable object outputs retain conservative writes.

Scratch arrays retain their high-water capacity. After every exit, reference
slots are overwritten with `undefined`; active counts reset. Root disposal
releases the buffers, and disposal during a writer prevents later writers from
continuing. Captured state versions still control restoration/acknowledgment,
so a reentrant state change survives for the next flush.

## Direct evidence

`compiler/native_numeric_program_execution_test.mjs` compiles and executes
ordinary TSX with 32 component instances and five sinks per instance, including
compound arithmetic and CSS strings. During eligible updates it replaces
`VDOMSnapshotRoot.setSources` with a throwing trap: any generic source
normalization would fail the test.

| Changed rows | Source updates | Projected sinks | Host writes |
| ---: | ---: | ---: | ---: |
| 1 | 2 | 5 | 5 |
| 4 | 8 | 20 | 20 |
| 32 | 64 | 160 | 160 |

Each compound sink projects once although both inputs changed. Keeping one sum
equal produces five projections, four writes and one equality skip. Components
remain at 32 executions through these numeric updates. Removal and reinsertion
produce one additional execution, and the new sink resumes program execution.
Mounted hosts retain identity and static style fields. Effects balance at
teardown. These counters prove dispatch behavior, not elapsed-time savings.

The production product fixture has three actual emitted CSS sink descriptors.
Six production correctness pilot pages cover native/React at 128, 512 and 1,024
rows. Served asset equality is recorded separately from the compiler proof.

## Review and verification

The final source passes **527 runtime tests, 29 Rust tests, 53 recorded check
commands and six production pilots**. Coverage includes the existing async
store/task/Suspense/transition contracts, DOM/Three hosts, HMR, React adapter,
package consumer, source canonicalization and legacy numeric routes.

New focused checks cover sparse/dense compound parity, duplicate prevalidation,
no-op buffers, host/projection failures, nested numeric rejection, source
demotion, conditional membership, dead owners, descriptor mutation and disposal
during a writer. A 700-source test exercises both index maintenance modes and
repeated detach/attach cycles. Controlled Node GC checks release detached
projector payloads while roots, hosts and sources remain reachable.

Primary review corrected an arithmetic-only output restriction, quadratic
duplicate validation, duplicate sink registration, unbounded sink holes, no-op
scratch retention, redundant dead-owner lookups and a change to general
`bindSources` input-array semantics. The final general API still passes fresh
input arrays; only descriptor-backed programs use reusable input buffers.
The earlier qualification and build before packed fanout are preserved in
`.cache/numeric-program-pre-packed-verification/`.

## Claims and remaining work

**Supported:** real compiler output reaches a coherent source/sink execution
path; eligible batches bypass generic source maps/affected sets, pending-write
records, tuple arrays and dirty-owner planning. Cached fanout and scratch are
reused; public duplicate/last-write behavior remains in `setSources`.

**Not established:** faster elapsed time than React Compiler, lower whole-page
allocation, smaller complete library, better comparative maintenance or a
general React compatibility/performance advantage. The new program indices and
peak-sized buffers add retained storage and lifecycle bookkeeping. Optional
profiling is absent from confirmation workloads.

State capture still creates per-field change snapshots, and the World's public
dirty journal still maintains maps/sets. Mixed numeric/keyed edits still use the
generic coherent candidate, rather than a prepared sparse delta. Automatic
column storage is not wired into ordinary authored component state yet. These
are remaining M3–M5 requirements, not success criteria that have been waived.

The next implementation is **M4: prepare keyed deltas and numeric work in one
candidate lifecycle**. It must validate all read versions before host work,
publish topology and numeric values before refs/effects, and acknowledge only
the captured state/collection versions after publication. Product initializer
semantics and its matched insertion follow-up flush remain unchanged.

After the integrated path is ready, use the existing finite confirmation
protocol and unchanged latency/allocation/device gates. Sol's full review
remains held until the comparative Three maintenance prerequisite is proved.
