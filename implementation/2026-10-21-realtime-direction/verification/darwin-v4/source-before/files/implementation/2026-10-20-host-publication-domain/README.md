# Shared host publication domain

One exact host object now serializes publication across roots and queues. See the [contract](design.md), [primary review](source-review.md), [results and limits](results.md) and [verification protocol](protocol.md).

Corrected Darwin-v4 passes 61/61 phases and 1077 runtime tests. Fresh installed proof-v2 passes nineteen build assertions, four publication-domain controls, six resource controls and complete untimed async episodes. Both failed gates and pre-final-recheck proof-v1 remain preserved. The sole timing pair belongs to proof-v1 source; corrected source has no inherited timings or second pair.

The full-plan first pass remains active. Saved Apple defaults stay one CPU, 256 MiB/container and 512 MiB/build on Depot, with no VM started and effective caps unverified.
