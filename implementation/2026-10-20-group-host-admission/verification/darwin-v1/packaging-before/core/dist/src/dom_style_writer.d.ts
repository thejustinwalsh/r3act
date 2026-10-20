/**
 * Prepare a DOM style-property writer while binding metadata is activated.
 * The style and property name are captured; mutable CSSStyleDeclaration
 * methods are looked up and invoked with the style object as receiver on each
 * write, matching DOMVDOMHost's current writeStyle behavior.
 */
export declare function createDOMStylePropWriter(style: CSSStyleDeclaration, name: string): (value: unknown, previous: unknown) => void;
//# sourceMappingURL=dom_style_writer.d.ts.map