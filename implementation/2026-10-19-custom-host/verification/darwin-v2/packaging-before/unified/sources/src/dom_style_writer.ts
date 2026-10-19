/**
 * Prepare a DOM style-property writer while binding metadata is activated.
 * The style and property name are captured; mutable CSSStyleDeclaration
 * methods are looked up and invoked with the style object as receiver on each
 * write, matching DOMVDOMHost's current writeStyle behavior.
 */
export function createDOMStylePropWriter(
  style: CSSStyleDeclaration,
  name: string,
): (value: unknown, previous: unknown) => void {
  if (name.startsWith("--")) {
    return (value: unknown, _previous: unknown) => {
      if (value == null) style.removeProperty(name);
      else style.setProperty(name, String(value));
    };
  }

  const writableStyle = style as CSSStyleDeclaration & Record<string, unknown>;
  return (value: unknown, _previous: unknown) => {
    writableStyle[name] = value == null ? "" : String(value);
  };
}
