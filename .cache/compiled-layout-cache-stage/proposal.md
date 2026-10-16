# Compiled layout cache consolidation proposal

The candidate replaces three weak maps (`normalizedLayouts`, `layoutSignatures`, and `layoutSlotsBySite`) with one private `layoutRecords` weak map. Original descriptor objects and their frozen normalized snapshots point to the same private record. That record owns the normalized snapshot, its exact signature, and a lazily populated site-to-slot map. It never stores the mutable original descriptor.

This gives one weak-map lookup for signature and slot access instead of the existing normalize-cache lookup followed by a signature/slot-cache lookup. It also removes the impossible signature-cache miss fallback for layouts returned by normalization. The first normalization adds one record allocation per distinct descriptor; repeated normalization, signature, and slot lookups allocate nothing. The lazy site map remains deferred until slot lookup.

Normalization validation, copied/frozen layout shape, normalized object identity, dense slot ordering, and signature construction are unchanged. The staged parity test covers repeated access by both aliases, exact signature, frozen snapshot behavior, lazy slot results, and invalid descriptors. No tests have been run pending review.
