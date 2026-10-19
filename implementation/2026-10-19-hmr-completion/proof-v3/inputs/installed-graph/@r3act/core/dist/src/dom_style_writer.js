/**
 * Prepare a DOM style-property writer while binding metadata is activated.
 * The style and property name are captured; mutable CSSStyleDeclaration
 * methods are looked up and invoked with the style object as receiver on each
 * write, matching DOMVDOMHost's current writeStyle behavior.
 */
export function createDOMStylePropWriter(style, name) {
    if (name.startsWith("--")) {
        return (value, _previous) => {
            if (value == null)
                style.removeProperty(name);
            else
                style.setProperty(name, String(value));
        };
    }
    const writableStyle = style;
    return (value, _previous) => {
        writableStyle[name] = value == null ? "" : String(value);
    };
}
//# sourceMappingURL=dom_style_writer.js.map