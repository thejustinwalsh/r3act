import type { HostPropertyCapability, RuntimeNode, VDOMHost } from "@r3act/core";

export type BrushOwnership = "owned" | "borrowed";
export type BrushBinding = Readonly<{ brush: Brush; ownership: BrushOwnership }>;
export type CanvasPosition = readonly [number, number];
export type CanvasTag = "paintLayer" | "paintRect" | "paintText" | "#text";

/** This example owns Brush disposal and accepts canonical Brush instances only. */
export class Brush {
  readonly color: string;
  readonly #onDispose: (() => void) | undefined;
  #disposeCalls = 0;
  #closed = false;

  constructor(color: string, onDispose?: () => void) {
    if (onDispose !== undefined && typeof onDispose !== "function") {
      throw new TypeError("Brush cleanup must be a function.");
    }
    this.color = hexColor(color);
    this.#onDispose = onDispose;
    Object.freeze(this);
  }

  get disposeCalls(): number { return this.#disposeCalls; }
  get closed(): boolean { return this.#closed; }

  dispose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#disposeCalls++;
    this.#onDispose?.();
  }
}

export interface CanvasContainer {
  readonly kind: "container";
  readonly children: CanvasNode[];
}

export interface CanvasNode {
  readonly kind: "node";
  readonly tag: CanvasTag;
  readonly children: CanvasNode[];
  parent: CanvasParent | null;
  live: boolean;
  name: string;
  position: [number, number];
  width: number;
  height: number;
  text: string;
  color: string;
  payload: object | null;
  brush: BrushBinding | null;
  onClick: ((event: CanvasClickEvent) => void) | null;
}

export type CanvasParent = CanvasContainer | CanvasNode;
export type CanvasRef =
  | ((node: CanvasNode | null) => unknown)
  | { current: CanvasNode | null };
export type CanvasClickEvent = Readonly<{
  type: "click";
  target: CanvasNode;
}>;

export type CanvasCommand =
  | Readonly<{ kind: "rect"; name: string; x: number; y: number; width: number; height: number; color: string }>
  | Readonly<{ kind: "text"; name: string; x: number; y: number; text: string; color: string }>;

export type CanvasIntrinsicElements = {
  paintLayer: {
    name?: string;
    position?: CanvasPosition;
    payload?: object;
    onClick?: (event: CanvasClickEvent) => void;
    ref?: CanvasRef;
    children?: RuntimeNode;
    key?: string | number;
  };
  paintRect: {
    name?: string;
    position?: CanvasPosition;
    width?: number;
    height?: number;
    brush?: BrushBinding;
    payload?: object;
    onClick?: (event: CanvasClickEvent) => void;
    ref?: CanvasRef;
    children?: never;
    key?: string | number;
  };
  paintText: {
    name?: string;
    position?: CanvasPosition;
    text?: string;
    color?: string;
    brush?: BrushBinding;
    payload?: object;
    onClick?: (event: CanvasClickEvent) => void;
    ref?: CanvasRef;
    children?: never;
    key?: string | number;
  };
};

type BrushLease = { ownership: BrushOwnership; count: number };

const finite = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
};

const nonnegative = (value: unknown, label: string): number => {
  const number = finite(value, label);
  if (number < 0) throw new RangeError(`${label} must be nonnegative.`);
  return number;
};

const position = (value: unknown): [number, number] => {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new TypeError("position must be a two-number tuple.");
  }
  return [finite(value[0], "position[0]"), finite(value[1], "position[1]")];
};

const stringValue = (value: unknown, label: string): string => {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string.`);
  return value;
};

const hexColor = (value: unknown): string => {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new TypeError("Canvas color must be a six-digit #RRGGBB value.");
  }
  return value.toLowerCase();
};

const throwCleanup = (errors: unknown[], label: string): void => {
  if (errors.length) throw new AggregateError(errors, label);
};

/** Consumer-owned retained command adapter; capability descriptions are observations, not proofs. */
export class RetainedCanvasHost implements VDOMHost<CanvasNode, CanvasParent> {
  readonly #nodes = new Set<CanvasNode>();
  readonly #containers = new Set<CanvasContainer>();
  readonly #leases = new Map<Brush, BrushLease>();
  #listeners = 0;
  #disposed = false;

  createContainer(): CanvasContainer {
    this.#open();
    const container: CanvasContainer = { kind: "container", children: [] };
    this.#containers.add(container);
    return container;
  }

  createElement(tag: string): CanvasNode {
    if (tag !== "paintLayer" && tag !== "paintRect" && tag !== "paintText") {
      throw new TypeError(`Unknown canvas tag <${tag}>.`);
    }
    return this.#create(tag);
  }

  createText(text: string): CanvasNode {
    const node = this.#create("#text");
    node.text = stringValue(text, "text");
    return node;
  }

  #create(tag: CanvasTag): CanvasNode {
    this.#open();
    const node: CanvasNode = {
      kind: "node", tag, children: [], parent: null, live: true,
      name: "", position: [0, 0], width: 0, height: 0,
      text: "", color: "#000000", payload: null, brush: null, onClick: null,
    };
    this.#nodes.add(node);
    return node;
  }

  setText(node: CanvasNode, text: string): void {
    this.#live(node);
    if (node.tag !== "#text") throw new TypeError("setText requires a text node.");
    node.text = stringValue(text, "text");
  }

  setProp(node: CanvasNode, name: string, value: unknown): void {
    this.#live(node);
    const cleared = value == null;
    switch (name) {
      case "name": node.name = cleared ? "" : stringValue(value, name); return;
      case "text":
        if (node.tag !== "paintText") throw new TypeError("text requires paintText.");
        node.text = cleared ? "" : stringValue(value, name); return;
      case "position": {
        const next = cleared ? [0, 0] as [number, number] : position(value);
        this.#live(node);
        node.position = next;
        return;
      }
      case "width":
      case "height":
        if (node.tag !== "paintRect") throw new TypeError(`${name} requires paintRect.`);
        node[name] = cleared ? 0 : nonnegative(value, name); return;
      case "payload":
        if (!cleared && (typeof value !== "object" || Array.isArray(value))) {
          throw new TypeError("payload must be an object.");
        }
        node.payload = cleared ? null : value as object; return;
      case "color":
        if (node.tag !== "paintText") throw new TypeError("color requires paintText.");
        node.color = cleared ? "#000000" : hexColor(value); return;
      case "brush": this.#setBrush(node, cleared ? null : value); return;
      case "onClick":
        if (!cleared && typeof value !== "function") {
          throw new TypeError("onClick must be a function.");
        }
        if (node.onClick === null && !cleared) this.#listeners++;
        if (node.onClick !== null && cleared) this.#listeners--;
        node.onClick = cleared ? null : value as (event: CanvasClickEvent) => void;
        return;
      case "ref":
      case "key": return;
      default: throw new TypeError(`Unsupported canvas property ${name}.`);
    }
  }

  describePropertyWrite(node: CanvasNode, name: string, next: unknown): HostPropertyCapability {
    this.#live(node);
    let valuePolicy: HostPropertyCapability["valuePolicy"] = "unknown";
    if (name === "position" || name === "brush") valuePolicy = "copy";
    else if (name === "payload" || name === "onClick") valuePolicy = "retain";
    else if (name === "name" || name === "text" || name === "color" || name === "width" || name === "height") valuePolicy = "scalar";
    const binding = name === "brush" && next != null ? this.#binding(next) : null;
    this.#live(node);
    return {
      valuePolicy, targetResource: null,
      valueResource: binding ? {
        object: binding.brush,
        ownership: binding.ownership === "owned" ? "shared-owned" : "borrowed",
      } : null,
      mayThrow: true,
      mayReenter: true,
    };
  }

  #binding(value: unknown): BrushBinding {
    if (typeof value !== "object" || value === null) {
      throw new TypeError("brush must be { brush: Brush, ownership: 'owned' | 'borrowed' }.");
    }
    const record = value as Record<string, unknown>;
    const brush = record.brush;
    const ownership = record.ownership;
    if (!(brush instanceof Brush) || Object.getPrototypeOf(brush) !== Brush.prototype ||
      brush.dispose !== Brush.prototype.dispose || Object.hasOwn(brush, "closed") ||
      (ownership !== "owned" && ownership !== "borrowed")) {
      throw new TypeError("brush must be { brush: Brush, ownership: 'owned' | 'borrowed' }.");
    }
    if (brush.closed) throw new Error("Cannot bind a closed Brush.");
    return Object.freeze({ brush, ownership });
  }

  #setBrush(node: CanvasNode, value: unknown): void {
    if (node.tag !== "paintRect" && node.tag !== "paintText") {
      throw new TypeError("brush requires paintRect or paintText.");
    }
    const next = value === null ? null : this.#binding(value);
    this.#live(node);
    const old = node.brush;
    if (next?.brush === old?.brush && next?.ownership === old?.ownership) {
      node.brush = next;
      return;
    }
    if (next) {
      const lease = this.#leases.get(next.brush);
      if (lease && lease.ownership !== next.ownership) {
        throw new Error("A Brush cannot have mixed owned and borrowed bindings.");
      }
      if (lease) lease.count++;
      else this.#leases.set(next.brush, { ownership: next.ownership, count: 1 });
    }
    node.brush = next;
    if (old) this.#releaseBrush(old);
  }

  #releaseBrush(binding: BrushBinding): void {
    const lease = this.#leases.get(binding.brush);
    if (!lease) return;
    if (--lease.count > 0) return;
    this.#leases.delete(binding.brush);
    if (lease.ownership === "owned") binding.brush.dispose();
  }

  place(parent: CanvasParent, node: CanvasNode, before: CanvasNode | null): void {
    this.#live(node);
    this.#parent(parent);
    if (parent !== node.parent && parent.kind === "node" && parent.tag !== "paintLayer") {
      throw new TypeError("Only paintLayer may contain child nodes.");
    }
    for (let cursor: CanvasParent | null = parent; cursor?.kind === "node"; cursor = cursor.parent) {
      if (cursor === node) throw new Error("Cannot place a node inside itself.");
    }
    if (before !== null && (before === node || before.parent !== parent || !before.live || !this.#nodes.has(before))) {
      throw new Error("before must be another live child of the target parent.");
    }
    if (node.parent) {
      const siblings = node.parent.children;
      const oldIndex = siblings.indexOf(node);
      if (oldIndex >= 0) siblings.splice(oldIndex, 1);
    }
    const index = before === null ? parent.children.length : parent.children.indexOf(before);
    parent.children.splice(index, 0, node);
    node.parent = parent;
  }

  remove(parent: CanvasParent, node: CanvasNode): void {
    this.#parent(parent);
    if (!this.#nodes.has(node)) {
      if (!node.live) return;
      throw new Error("Canvas handle is foreign.");
    }
    if (node.parent !== parent) return;
    const index = parent.children.indexOf(node);
    if (index >= 0) parent.children.splice(index, 1);
    node.parent = null;
  }

  dispose(node?: CanvasNode): void {
    if (!node) {
      if (this.#disposed) return;
      this.#disposed = true;
      const errors: unknown[] = [];
      for (const remaining of [...this.#nodes]) {
        try { this.dispose(remaining); } catch (error) { errors.push(error); }
      }
      this.#containers.clear();
      throwCleanup(errors, "Canvas host cleanup failed.");
      return;
    }
    if (!this.#nodes.has(node)) return;
    if (!node.live) return;
    const errors: unknown[] = [];
    for (const child of [...node.children]) {
      try { this.dispose(child); } catch (error) { errors.push(error); }
    }
    node.live = false;
    if (node.parent) {
      const index = node.parent.children.indexOf(node);
      if (index >= 0) node.parent.children.splice(index, 1);
      node.parent = null;
    }
    node.children.length = 0;
    if (node.onClick) this.#listeners--;
    node.onClick = null;
    const brush = node.brush;
    node.brush = null;
    node.payload = null;
    this.#nodes.delete(node);
    if (brush) {
      try { this.#releaseBrush(brush); } catch (error) { errors.push(error); }
    }
    throwCleanup(errors, "Canvas node cleanup failed.");
  }

  getPublicInstance(node: CanvasNode): CanvasNode {
    this.#live(node);
    return node;
  }

  dispatch(node: CanvasNode, type: "click" = "click"): boolean {
    if (type !== "click" || !this.#nodes.has(node) || !node.live || !node.onClick) return false;
    node.onClick({ type, target: node });
    return true;
  }

  frame(): readonly CanvasCommand[] {
    const commands: CanvasCommand[] = [];
    const visit = (node: CanvasNode, x: number, y: number): void => {
      if (!node.live) return;
      const nextX = x + node.position[0];
      const nextY = y + node.position[1];
      const color = node.brush?.brush.color ?? node.color;
      if (node.tag === "paintRect") {
        commands.push({ kind: "rect", name: node.name, x: nextX, y: nextY,
          width: node.width, height: node.height, color });
      } else if (node.tag === "paintText" || node.tag === "#text") {
        commands.push({ kind: "text", name: node.name, x: nextX, y: nextY,
          text: node.text, color });
      }
      for (const child of node.children) visit(child, nextX, nextY);
    };
    for (const container of this.#containers) {
      for (const child of container.children) visit(child, 0, 0);
    }
    return commands;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const command of this.frame()) {
      ctx.fillStyle = command.color;
      if (command.kind === "rect") {
        ctx.fillRect(command.x, command.y, command.width, command.height);
      } else {
        ctx.fillText(command.text, command.x, command.y);
      }
    }
  }

  diagnostics(): Readonly<{ liveHandles: number; liveResources: number; ownedResources: number; liveBindings: number; eventRegistrations: number }> {
    let liveBindings = 0;
    let ownedResources = 0;
    for (const lease of this.#leases.values()) {
      liveBindings += lease.count;
      if (lease.ownership === "owned") ownedResources++;
    }
    return { liveHandles: this.#nodes.size, liveResources: this.#leases.size,
      ownedResources, liveBindings, eventRegistrations: this.#listeners };
  }

  #live(node: CanvasNode): void {
    if (!this.#nodes.has(node) || !node.live) throw new Error("Canvas handle is disposed or foreign.");
  }

  #parent(parent: CanvasParent): void {
    if (parent.kind === "container") {
      if (!this.#containers.has(parent)) throw new Error("Canvas container is foreign.");
    } else this.#live(parent);
  }

  #open(): void {
    if (this.#disposed) throw new Error("Canvas host is disposed.");
  }
}
