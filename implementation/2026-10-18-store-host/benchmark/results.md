# One Store update observation

The sole authorized pair passed output, identity, visible pending fallback, untimed health reveal and disposal. Native dispatch-to-matching-MutationObserver was **1.7 ms**; React was **0.5 ms**, with about **0.1 ms** timer resolution. Native was slower in this observation. Mount was 5.0/4.0 ms, disposal 0.7/0.2 ms. Shared JavaScript was 466,761 bytes; all assets including source map and HTML totalled 2,685,428 bytes.

Native uses its action-log Store and ordinary root scheduling; React Compiler uses two `useSyncExternalStore` consumers of one small external Store. Both change 1→7 and require 7/14 while health stays pending. Native's root has one Store subscription and fans out to two closed data programs; React has two consumer subscriptions. The callback timestamp precedes collector style/layout reads. Scheduling/delivery are included, paint excluded. This establishes no CPU, physical-input, median/p95, frame, network, cold/memory or general UX advantage.

All 721 source/compiler/artifact entries matched before/after; no errors, blocked requests or teardown leaks were reported. The exact [raw receipt](proof-v1/pair-one-shot.json) and source-locked [protocol](README.md) remain unchanged. No retry or project server/network/TLS/trust operation occurred.
