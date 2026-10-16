import { structuralCount } from "./structural_count_probe.ts";

export type KeyedRegionEntry<T> = { key: string; value: T };

type Bucket<T> = {
  entries: Entry<T>[];
  previous: Bucket<T> | null;
  next: Bucket<T> | null;
};

type Entry<T> = {
  key: string;
  value: T;
  bucket: Bucket<T>;
  offset: number;
};

export type KeyedRegionBucketStats = {
  bucketSlotReads: number;
  bucketSlotWrites: number;
  splits: number;
  merges: number;
  bucketCount: number;
};

/**
 * Ordered keyed rows with direct key lookup and bounded local edits.
 *
 * Iteration is intentionally linear; it is for initial materialization and
 * snapshots. Replace/remove/insert/move use the key index and touch one or two
 * buckets. When a bucket fills, it splits in half; sparse neighbors merge.
 */
export class KeyedRegionBuckets<T> {
  readonly bucketCapacity: number;
  #head: Bucket<T> | null = null;
  #tail: Bucket<T> | null = null;
  #byKey = new Map<string, Entry<T>>();
  #size = 0;
  #splits = 0;
  #merges = 0;
  #bucketSlotReads = 0;
  #bucketSlotWrites = 0;
  #bucketCount = 0;

  constructor(entries: readonly KeyedRegionEntry<T>[], bucketCapacity = 128) {
    if (!Number.isSafeInteger(bucketCapacity) || bucketCapacity < 4) {
      throw new RangeError("bucketCapacity must be an integer >= 4");
    }
    this.bucketCapacity = bucketCapacity;
    for (const item of entries) {
      if (this.#byKey.has(item.key)) {
        throw new Error(`Duplicate keyed-region key: ${item.key}`);
      }
      this.#append(item.key, item.value);
    }
  }

  get size() {
    return this.#size;
  }

  get bucketCount() {
    return this.#bucketCount;
  }

  has(key: string) {
    structuralCount("bucket.key-probes", "lookup", "keyed_region_buckets.ts:key-probe");
    return this.#byKey.has(key);
  }

  get(key: string): T | undefined {
    structuralCount("bucket.key-probes", "lookup", "keyed_region_buckets.ts:key-probe");
    return this.#byKey.get(key)?.value;
  }

  beforeKey(key: string): string | null {
    const entry = this.#require(key);
    const { bucket, offset } = entry;
    if (offset > 0) return bucket.entries[offset - 1].key;
    return bucket.previous?.entries.at(-1)?.key ?? null;
  }

  afterKey(key: string): string | null {
    const entry = this.#require(key);
    const { bucket, offset } = entry;
    if (offset + 1 < bucket.entries.length) {
      return bucket.entries[offset + 1].key;
    }
    return bucket.next?.entries[0]?.key ?? null;
  }

  replace(oldKey: string, newKey: string, value: T): void {
    const old = this.#require(oldKey);
    if (newKey !== oldKey && this.#byKey.has(newKey)) {
      throw new Error(`Duplicate keyed-region key: ${newKey}`);
    }
    this.#bucketSlotReads++;
    const replacement: Entry<T> = {
      key: newKey,
      value,
      bucket: old.bucket,
      offset: old.offset,
    };
    old.bucket.entries[old.offset] = replacement;
    this.#bucketSlotWrites++;
    this.#byKey.delete(oldKey);
    this.#byKey.set(newKey, replacement);
  }

  insertBefore(anchorKey: string | null, key: string, value: T): void {
    if (this.#byKey.has(key)) {
      throw new Error(`Duplicate keyed-region key: ${key}`);
    }
    if (this.#size === 0) {
      const bucket = this.#newBucket(null, null);
      this.#insertInto(bucket, 0, key, value);
      return;
    }
    if (anchorKey === null) {
      const bucket = this.#tail!;
      if (bucket.entries.length === this.bucketCapacity) {
        this.#split(bucket);
        this.#insertInto(this.#tail!, this.#tail!.entries.length, key, value);
      } else {
        this.#insertInto(bucket, bucket.entries.length, key, value);
      }
      return;
    }
    const anchor = this.#require(anchorKey);
    let bucket = anchor.bucket;
    let offset = anchor.offset;
    if (bucket.entries.length === this.bucketCapacity) {
      const [left, right] = this.#split(bucket);
      const split = left.entries.length;
      if (offset >= split) {
        bucket = right;
        offset -= split;
      }
    }
    this.#insertInto(bucket, offset, key, value);
  }

  remove(key: string): T {
    const entry = this.#require(key);
    const { bucket, offset } = entry;
    const [removed] = bucket.entries.splice(offset, 1);
    this.#bucketSlotReads++;
    this.#bucketSlotWrites += bucket.entries.length - offset;
    structuralCount("bucket.splice-shift-estimate", "estimate", "keyed_region_buckets.ts:splice", bucket.entries.length - offset);
    this.#byKey.delete(key);
    this.#size--;
    this.#reindex(bucket, offset);
    if (bucket.entries.length === 0) {
      this.#unlink(bucket);
    } else {
      this.#rebalance(bucket);
    }
    return removed.value;
  }

  moveBefore(key: string, anchorKey: string | null): void {
    if (key === anchorKey) return;
    const value = this.remove(key);
    this.insertBefore(anchorKey, key, value);
  }

  *entries(): IterableIterator<KeyedRegionEntry<T>> {
    for (let bucket = this.#head; bucket; bucket = bucket.next) {
      structuralCount("bucket.iterated-buckets", "iteration", "keyed_region_buckets.ts:entries");
      for (const entry of bucket.entries) {
        structuralCount("bucket.iterated-entries", "iteration", "keyed_region_buckets.ts:entries");
        yield { key: entry.key, value: entry.value };
      }
    }
  }

  /** Allocation-free full scan for snapshots and dense region work. */
  forEach(visitor: (key: string, value: T) => void): void {
    for (let bucket = this.#head; bucket; bucket = bucket.next) {
      structuralCount("bucket.forEach-buckets", "iteration", "keyed_region_buckets.ts:forEach");
      for (const entry of bucket.entries) {
        structuralCount("bucket.forEach-entries", "iteration", "keyed_region_buckets.ts:forEach");
        visitor(entry.key, entry.value);
      }
    }
  }

  stats(): KeyedRegionBucketStats {
    return {
      bucketSlotReads: this.#bucketSlotReads,
      bucketSlotWrites: this.#bucketSlotWrites,
      splits: this.#splits,
      merges: this.#merges,
      bucketCount: this.#bucketCount,
    };
  }

  resetStats(): void {
    this.#bucketSlotReads = 0;
    this.#bucketSlotWrites = 0;
    this.#splits = 0;
    this.#merges = 0;
  }

  /** Full consistency check for experiment integrity, not a hot-path method. */
  assertIntegrity(): void {
    const seen = new Set<string>();
    let count = 0;
    let previous: Bucket<T> | null = null;
    for (let bucket = this.#head; bucket; bucket = bucket.next) {
      if (bucket.previous !== previous) {
        throw new Error("Keyed-region bucket links are inconsistent");
      }
      if (bucket.entries.length === 0 || bucket.entries.length > this.bucketCapacity) {
        throw new Error("Keyed-region bucket occupancy is invalid");
      }
      for (let offset = 0; offset < bucket.entries.length; offset++) {
        const entry: Entry<T> = bucket.entries[offset];
        if (
          seen.has(entry.key) || entry.bucket !== bucket || entry.offset !== offset ||
          this.#byKey.get(entry.key) !== entry
        ) throw new Error(`Keyed-region entry index mismatch: ${entry.key}`);
        seen.add(entry.key);
        count++;
      }
      previous = bucket;
    }
    if (
      previous !== this.#tail || count !== this.#size ||
      seen.size !== this.#byKey.size || this.#bucketCount < 1 && count > 0
    ) throw new Error("Keyed-region aggregate size mismatch");
  }

  #append(key: string, value: T) {
    let bucket = this.#tail;
    if (!bucket || bucket.entries.length === this.bucketCapacity) {
      bucket = this.#newBucket(this.#tail, null);
    }
    this.#insertInto(bucket, bucket.entries.length, key, value);
  }

  #insertInto(bucket: Bucket<T>, offset: number, key: string, value: T) {
    const entry: Entry<T> = { key, value, bucket, offset };
    bucket.entries.splice(offset, 0, entry);
    this.#size++;
    this.#bucketSlotWrites += bucket.entries.length - offset;
    structuralCount("bucket.splice-shift-estimate", "estimate", "keyed_region_buckets.ts:splice", bucket.entries.length - offset);
    this.#reindex(bucket, offset);
    this.#byKey.set(key, entry);
  }

  #reindex(bucket: Bucket<T>, start: number) {
    for (let offset = start; offset < bucket.entries.length; offset++) {
      structuralCount("bucket.reindex-loop-visits", "iteration", "keyed_region_buckets.ts:reindex");
      bucket.entries[offset].bucket = bucket;
      bucket.entries[offset].offset = offset;
      this.#bucketSlotWrites++;
    }
  }

  #split(bucket: Bucket<T>): [Bucket<T>, Bucket<T>] {
    const splitAt = Math.ceil(bucket.entries.length / 2);
    const moved = bucket.entries.splice(splitAt);
    const right = this.#newBucket(bucket, bucket.next);
    right.entries.push(...moved);
    this.#reindex(right, 0);
    this.#reindex(bucket, splitAt);
    this.#splits++;
    structuralCount("bucket.split-events", "event", "keyed_region_buckets.ts:split");
    return [bucket, right];
  }

  #rebalance(bucket: Bucket<T>) {
    const minimum = Math.floor(this.bucketCapacity / 2);
    if (bucket.entries.length >= minimum) return;
    const left = bucket.next ? bucket : bucket.previous;
    const right = bucket.next ?? bucket;
    if (!left || !right || left === right) return;
    if (left.entries.length + right.entries.length <= this.bucketCapacity) {
      left.entries.push(...right.entries);
      this.#reindex(left, 0);
      this.#unlink(right);
      this.#merges++;
      structuralCount("bucket.merge-events", "event", "keyed_region_buckets.ts:rebalance");
      return;
    }
    const combined = [...left.entries, ...right.entries];
    const splitAt = Math.ceil(combined.length / 2);
    left.entries = combined.slice(0, splitAt);
    right.entries = combined.slice(splitAt);
    this.#reindex(left, 0);
    this.#reindex(right, 0);
  }

  #newBucket(previous: Bucket<T> | null, next: Bucket<T> | null): Bucket<T> {
    const bucket: Bucket<T> = { entries: [], previous, next };
    if (previous) previous.next = bucket;
    else this.#head = bucket;
    if (next) next.previous = bucket;
    else this.#tail = bucket;
    this.#bucketCount++;
    return bucket;
  }

  #unlink(bucket: Bucket<T>) {
    if (bucket.previous) bucket.previous.next = bucket.next;
    else this.#head = bucket.next;
    if (bucket.next) bucket.next.previous = bucket.previous;
    else this.#tail = bucket.previous;
    this.#bucketCount--;
  }

  #require(key: string): Entry<T> {
    structuralCount("bucket.key-probes", "lookup", "keyed_region_buckets.ts:key-probe");
    const entry = this.#byKey.get(key);
    if (!entry) throw new Error(`Unknown keyed-region key: ${key}`);
    return entry;
  }
}
