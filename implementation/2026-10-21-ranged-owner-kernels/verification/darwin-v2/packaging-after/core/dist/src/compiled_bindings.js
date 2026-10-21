export class CompiledBindings {
    sourceValues;
    hostValues;
    #offsets;
    #targets;
    #dirtySources;
    #dirtyFlags;
    #dirtyCount = 0;
    constructor(sourceCount, targetCount, edges) {
        this.sourceValues = new Float64Array(sourceCount);
        this.hostValues = new Float64Array(targetCount);
        this.#offsets = new Uint32Array(sourceCount + 1);
        this.#targets = new Uint32Array(edges.length);
        this.#dirtySources = new Uint32Array(sourceCount);
        this.#dirtyFlags = new Uint8Array(sourceCount);
        for (const [source] of edges)
            this.#offsets[source + 1]++;
        for (let source = 1; source < this.#offsets.length; source++) {
            this.#offsets[source] += this.#offsets[source - 1];
        }
        const cursor = this.#offsets.slice(0, sourceCount);
        for (const [source, target] of edges)
            this.#targets[cursor[source]++] = target;
    }
    set(source, value) {
        if (Object.is(this.sourceValues[source], value))
            return false;
        this.sourceValues[source] = value;
        if (this.#dirtyFlags[source] === 0) {
            this.#dirtyFlags[source] = 1;
            this.#dirtySources[this.#dirtyCount++] = source;
        }
        return true;
    }
    flush(writeHost, collectStats = false) {
        if (!collectStats) {
            for (let i = 0; i < this.#dirtyCount; i++) {
                const source = this.#dirtySources[i];
                const value = this.sourceValues[source];
                for (let edge = this.#offsets[source]; edge < this.#offsets[source + 1]; edge++) {
                    const target = this.#targets[edge];
                    this.hostValues[target] = value;
                    writeHost?.(target, value);
                }
                this.#dirtyFlags[source] = 0;
            }
            this.#dirtyCount = 0;
            return undefined;
        }
        let bindingVisits = 0;
        for (let i = 0; i < this.#dirtyCount; i++) {
            const source = this.#dirtySources[i];
            const value = this.sourceValues[source];
            for (let edge = this.#offsets[source]; edge < this.#offsets[source + 1]; edge++) {
                const target = this.#targets[edge];
                this.hostValues[target] = value;
                writeHost?.(target, value);
                bindingVisits++;
            }
            this.#dirtyFlags[source] = 0;
        }
        const changedSources = this.#dirtyCount;
        this.#dirtyCount = 0;
        return { changedSources, bindingVisits, hostWrites: bindingVisits };
    }
}
//# sourceMappingURL=compiled_bindings.js.map