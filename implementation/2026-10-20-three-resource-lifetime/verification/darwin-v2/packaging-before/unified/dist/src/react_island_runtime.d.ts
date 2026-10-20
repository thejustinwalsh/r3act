import { type RuntimeNode } from "./jsx_binding_runtime.ts";
export type IslandRoot<P> = {
    render(props: P): void;
    unmount(): void;
};
export type IslandRenderer<P, Container> = {
    accepts(instance: unknown): instance is Container;
    create(container: Container): IslandRoot<P>;
};
/** Internal host seam; the public adapter supplies React DOM as its renderer. */
export declare function createNativeReactIslandComponent<P extends object, Container>(renderer: IslandRenderer<P, Container>): (props: P) => RuntimeNode;
//# sourceMappingURL=react_island_runtime.d.ts.map