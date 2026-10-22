/**
 * Chunked keyed child order with parallel key/value slots.
 *
 * Keys map to a packed (leaf id, slot) integer, so the hot index has no
 * per-entry location objects. Leaves hold separate key and value arrays; a
 * local edit shifts at most one leaf, while iteration scans leaf runs.
 */
export type ColumnarKeyedEntry<T> = { key: string; value: T };

type Leaf<T> = {
  id: number;
  keys: string[];
  values: T[];
  previous: number;
  next: number;
};

export class ColumnarKeyedRegion<T> {
  readonly bucketCapacity: number;
  #leaves: Array<Leaf<T> | null> = [];
  #head = -1;
  #tail = -1;
  #byKey = new Map<string, number>();
  #size = 0;
  #splits = 0;
  #merges = 0;
  #slotWrites = 0;

  constructor(entries: readonly ColumnarKeyedEntry<T>[], bucketCapacity = 128) {
    if (!Number.isSafeInteger(bucketCapacity) || bucketCapacity < 4) {
      throw new RangeError("bucketCapacity must be an integer >= 4");
    }
    this.bucketCapacity = bucketCapacity;
    for (const { key, value } of entries) {
      if (this.#byKey.has(key)) throw new Error(`Duplicate key: ${key}`);
      this.#append(key, value);
    }
  }

  get size() { return this.#size; }
  get bucketCount() { return this.#leaves.reduce((n, leaf) => n + !!leaf, 0); }
  has(key: string) { return this.#byKey.has(key); }

  get(key: string): T | undefined {
    const location = this.#byKey.get(key);
    if (location === undefined) return undefined;
    const [leaf, slot] = this.#decode(location);
    return leaf.values[slot];
  }

  beforeKey(key: string): string | null {
    const [leaf, slot] = this.#require(key);
    if (slot > 0) return leaf.keys[slot - 1];
    const previous = this.#leaf(leaf.previous);
    return previous?.keys.at(-1) ?? null;
  }

  afterKey(key: string): string | null {
    const [leaf, slot] = this.#require(key);
    if (slot + 1 < leaf.keys.length) return leaf.keys[slot + 1];
    const next = this.#leaf(leaf.next);
    return next?.keys[0] ?? null;
  }

  replace(oldKey: string, newKey: string, value: T): void {
    const [leaf, slot] = this.#require(oldKey);
    if (newKey !== oldKey && this.#byKey.has(newKey)) {
      throw new Error(`Duplicate key: ${newKey}`);
    }
    leaf.keys[slot] = newKey;
    leaf.values[slot] = value;
    this.#byKey.delete(oldKey);
    this.#byKey.set(newKey, this.#encode(leaf.id, slot));
    this.#slotWrites += 2;
  }

  insertBefore(anchorKey: string | null, key: string, value: T): void {
    if (this.#byKey.has(key)) throw new Error(`Duplicate key: ${key}`);
    if (this.#size === 0) {
      const leaf = this.#newLeaf(-1, -1);
      this.#insert(leaf, 0, key, value);
      return;
    }
    if (anchorKey === null) {
      let leaf = this.#leaf(this.#tail)!;
      if (leaf.keys.length === this.bucketCapacity) {
        this.#split(leaf);
        leaf = this.#leaf(this.#tail)!;
      }
      this.#insert(leaf, leaf.keys.length, key, value);
      return;
    }
    const [anchorLeaf, anchorSlot] = this.#require(anchorKey);
    let leaf = anchorLeaf;
    let slot = anchorSlot;
    if (leaf.keys.length === this.bucketCapacity) {
      const right = this.#split(leaf);
      const splitAt = leaf.keys.length;
      if (slot >= splitAt) {
        leaf = right;
        slot -= splitAt;
      }
    }
    this.#insert(leaf, slot, key, value);
  }

  remove(key: string): T {
    const [leaf, slot] = this.#require(key);
    const [value] = leaf.values.splice(slot, 1);
    leaf.keys.splice(slot, 1);
    this.#byKey.delete(key);
    this.#size--;
    this.#slotWrites += 2 + (leaf.keys.length - slot) * 2;
    this.#reindex(leaf, slot);
    if (leaf.keys.length === 0) this.#unlink(leaf);
    else this.#rebalance(leaf);
    return value;
  }

  moveBefore(key: string, anchorKey: string | null): void {
    if (key === anchorKey) return;
    const value = this.remove(key);
    this.insertBefore(anchorKey, key, value);
  }

  *entries(): IterableIterator<ColumnarKeyedEntry<T>> {
    for (let id = this.#head; id !== -1;) {
      const leaf = this.#leaf(id)!;
      for (let slot = 0; slot < leaf.keys.length; slot++) {
        yield { key: leaf.keys[slot], value: leaf.values[slot] };
      }
      id = leaf.next;
    }
  }

  /** Allocation-free scan over contiguous key/value slots. */
  forEach(visitor: (key: string, value: T) => void): void {
    for (let id = this.#head; id !== -1;) {
      const leaf = this.#leaf(id)!;
      for (let slot = 0; slot < leaf.keys.length; slot++) {
        visitor(leaf.keys[slot], leaf.values[slot]);
      }
      id = leaf.next;
    }
  }

  stats() {
    return { bucketCount: this.bucketCount, splits: this.#splits, merges: this.#merges, slotWrites: this.#slotWrites };
  }

  assertIntegrity(): void {
    const seen = new Set<string>();
    let count = 0;
    let previous = -1;
    for (let id = this.#head; id !== -1;) {
      const leaf = this.#leaf(id)!;
      if (leaf.previous !== previous || leaf.keys.length !== leaf.values.length ||
        leaf.keys.length === 0 || leaf.keys.length > this.bucketCapacity) {
        throw new Error("Columnar keyed-region leaf is invalid");
      }
      for (let slot = 0; slot < leaf.keys.length; slot++) {
        const key = leaf.keys[slot];
        if (seen.has(key) || this.#byKey.get(key) !== this.#encode(id, slot)) {
          throw new Error(`Columnar keyed-region key index mismatch: ${key}`);
        }
        seen.add(key);
        count++;
      }
      previous = id;
      id = leaf.next;
    }
    if (previous !== this.#tail || count !== this.#size || seen.size !== this.#byKey.size) {
      throw new Error("Columnar keyed-region aggregate size mismatch");
    }
  }

  #append(key: string, value: T) {
    let leaf = this.#leaf(this.#tail);
    if (!leaf || leaf.keys.length === this.bucketCapacity) {
      leaf = this.#newLeaf(this.#tail, -1);
    }
    this.#insert(leaf, leaf.keys.length, key, value);
  }

  #insert(leaf: Leaf<T>, slot: number, key: string, value: T) {
    leaf.keys.splice(slot, 0, key);
    leaf.values.splice(slot, 0, value);
    this.#size++;
    this.#slotWrites += 2 + (leaf.keys.length - slot) * 2;
    this.#reindex(leaf, slot);
  }

  #reindex(leaf: Leaf<T>, start: number) {
    for (let slot = start; slot < leaf.keys.length; slot++) {
      this.#byKey.set(leaf.keys[slot], this.#encode(leaf.id, slot));
    }
  }

  #split(leaf: Leaf<T>): Leaf<T> {
    const splitAt = Math.ceil(leaf.keys.length / 2);
    const next = this.#newLeaf(leaf.id, leaf.next);
    next.keys = leaf.keys.splice(splitAt);
    next.values = leaf.values.splice(splitAt);
    this.#reindex(leaf, splitAt - 1);
    this.#reindex(next, 0);
    this.#splits++;
    return next;
  }

  #rebalance(leaf: Leaf<T>) {
    const minimum = Math.floor(this.bucketCapacity / 2);
    if (leaf.keys.length >= minimum) return;
    const right = leaf.next === -1 ? null : this.#leaf(leaf.next);
    const left = leaf.previous === -1 ? null : this.#leaf(leaf.previous);
    const first = right ? leaf : left;
    const second = right ?? leaf;
    if (!first || !second || first === second) return;
    if (first.keys.length + second.keys.length <= this.bucketCapacity) {
      first.keys.push(...second.keys);
      first.values.push(...second.values);
      this.#reindex(first, 0);
      this.#unlink(second);
      this.#merges++;
    } else {
      const keys = [...first.keys, ...second.keys];
      const values = [...first.values, ...second.values];
      const splitAt = Math.ceil(keys.length / 2);
      first.keys = keys.slice(0, splitAt);
      second.keys = keys.slice(splitAt);
      first.values = values.slice(0, splitAt);
      second.values = values.slice(splitAt);
      this.#reindex(first, 0);
      this.#reindex(second, 0);
    }
  }

  #newLeaf(previous: number, next: number): Leaf<T> {
    const id = this.#leaves.length;
    const leaf: Leaf<T> = { id, keys: [], values: [], previous, next };
    this.#leaves.push(leaf);
    if (previous !== -1) this.#leaf(previous)!.next = id;
    else this.#head = id;
    if (next !== -1) this.#leaf(next)!.previous = id;
    else this.#tail = id;
    return leaf;
  }

  #unlink(leaf: Leaf<T>) {
    if (leaf.previous !== -1) this.#leaf(leaf.previous)!.next = leaf.next;
    else this.#head = leaf.next;
    if (leaf.next !== -1) this.#leaf(leaf.next)!.previous = leaf.previous;
    else this.#tail = leaf.previous;
    this.#leaves[leaf.id] = null;
  }

  #leaf(id: number): Leaf<T> | null {
    return id === -1 ? null : this.#leaves[id];
  }

  #encode(leafId: number, slot: number) {
    const location = leafId * this.bucketCapacity + slot;
    if (!Number.isSafeInteger(location)) throw new RangeError("Region is too large");
    return location;
  }

  #decode(location: number): [Leaf<T>, number] {
    const leafId = Math.floor(location / this.bucketCapacity);
    const slot = location - leafId * this.bucketCapacity;
    return [this.#leaf(leafId)!, slot];
  }

  #require(key: string): [Leaf<T>, number] {
    const location = this.#byKey.get(key);
    if (location === undefined) throw new Error(`Unknown key: ${key}`);
    return this.#decode(location);
  }
}
