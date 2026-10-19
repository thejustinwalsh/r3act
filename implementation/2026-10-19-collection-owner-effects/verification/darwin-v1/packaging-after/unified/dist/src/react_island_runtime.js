import { defineComponent, useEffectAt, useStateAt } from "./component_state_runtime.js";
import { jsx } from "./jsx_binding_runtime.js";
let nextIslandSite = 0;
class IslandLifetime {
    renderer;
    #root = null;
    #container = null;
    #active = false;
    #disposed = false;
    constructor(renderer) {
        this.renderer = renderer;
    }
    activate() {
        if (!this.#disposed)
            this.#active = true;
        return () => this.dispose();
    }
    attach(instance, props) {
        if (instance === null) {
            if (!this.#active)
                this.dispose();
            return;
        }
        if (this.#disposed)
            return;
        if (!this.renderer.accepts(instance)) {
            throw new TypeError("React island requires a DOM div host instance");
        }
        if (this.#root && this.#container !== instance) {
            const previous = this.#root;
            this.#root = null;
            this.#container = null;
            try {
                previous.unmount();
            }
            catch (error) {
                this.#disposed = true;
                throw error;
            }
            if (this.#disposed)
                return;
        }
        if (!this.#root) {
            let created;
            try {
                created = this.renderer.create(instance);
            }
            catch (error) {
                this.#disposed = true;
                throw error;
            }
            if (this.#disposed) {
                created.unmount();
                return;
            }
            this.#root = created;
            this.#container = instance;
        }
        const root = this.#root;
        if (!root || this.#disposed)
            return;
        try {
            root.render(props);
        }
        catch (error) {
            try {
                this.dispose();
            }
            catch (cleanupError) {
                throw new AggregateError([error, cleanupError], "React island render and cleanup both failed");
            }
            throw error;
        }
    }
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        const root = this.#root;
        this.#root = null;
        this.#container = null;
        root?.unmount();
    }
}
/** Internal host seam; the public adapter supplies React DOM as its renderer. */
export function createNativeReactIslandComponent(renderer) {
    const site = `react-island:${++nextIslandSite}`;
    const component = defineComponent(site, (props) => {
        const [lifetime] = useStateAt(`${site}:lifetime`, () => new IslandLifetime(renderer));
        useEffectAt(`${site}:activation`, () => lifetime.activate());
        const committedProps = { ...props };
        return jsx("div", {
            ref: (instance) => lifetime.attach(instance, committedProps),
        });
    });
    // This boundary accepts React children; native child typing does not apply.
    return component;
}
//# sourceMappingURL=react_island_runtime.js.map