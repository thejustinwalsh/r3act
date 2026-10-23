import { defineComponent, useEffectAt, useStateAt } from "./component_state_runtime.ts";
import { jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";

export type IslandRoot<P> = {
  render(props: P): void;
  unmount(): void;
};

export type IslandRenderer<P, Container> = {
  accepts(instance: unknown): instance is Container;
  create(container: Container): IslandRoot<P>;
};

let nextIslandSite = 0;

class IslandLifetime<P, Container> {
  #root: IslandRoot<P> | null = null;
  #container: Container | null = null;
  #active = false;
  #disposed = false;

  constructor(private readonly renderer: IslandRenderer<P, Container>) {}

  activate(): () => void {
    if (!this.#disposed) this.#active = true;
    return () => this.dispose();
  }

  attach(instance: unknown, props: P): void {
    if (instance === null) {
      if (!this.#active) this.dispose();
      return;
    }
    if (this.#disposed) return;
    if (!this.renderer.accepts(instance)) {
      throw new TypeError("React island requires a DOM div host instance");
    }
    if (this.#root && this.#container !== instance) {
      const previous = this.#root;
      this.#root = null;
      this.#container = null;
      try {
        previous.unmount();
      } catch (error) {
        this.#disposed = true;
        throw error;
      }
      if (this.#disposed) return;
    }
    if (!this.#root) {
      let created: IslandRoot<P>;
      try {
        created = this.renderer.create(instance);
      } catch (error) {
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
    if (!root || this.#disposed) return;
    try {
      root.render(props);
    } catch (error) {
      try {
        this.dispose();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "React island render and cleanup both failed",
        );
      }
      throw error;
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    const root = this.#root;
    this.#root = null;
    this.#container = null;
    root?.unmount();
  }
}

/** Internal host seam; the public adapter supplies React DOM as its renderer. */
export function createNativeReactIslandComponent<P extends object, Container>(
  renderer: IslandRenderer<P, Container>,
): (props: P) => RuntimeNode {
  const site = `react-island:${++nextIslandSite}`;
  const component = defineComponent(site, (props: Record<string, unknown>) => {
    const [lifetime] = useStateAt(`${site}:lifetime`,
      () => new IslandLifetime(renderer));
    useEffectAt(`${site}:activation`, () => lifetime.activate());
    const committedProps = { ...props } as P;
    return jsx("div", {
      ref: (instance: unknown | null) => lifetime.attach(instance, committedProps),
    });
  });
  // This boundary accepts React children; native child typing does not apply.
  return component as unknown as (props: P) => RuntimeNode;
}
