// src/jsx_binding_runtime.ts
var keyedOwnerRegionTag = Symbol("keyed-owner-region");
var keyedOwnerVersionTag = Symbol("keyed-owner-version");
var Fragment = Symbol("jsx-runtime-fragment");
var bindingTag = Symbol("jsx-runtime-binding");

// src/dom_style_writer.ts
function createDOMStylePropWriter(style, name) {
  if (name.startsWith("--")) {
    return (value, _previous) => {
      if (value == null) style.removeProperty(name);
      else style.setProperty(name, String(value));
    };
  }
  const writableStyle = style;
  return (value, _previous) => {
    writableStyle[name] = value == null ? "" : String(value);
  };
}

// src/vdom_snapshot_runtime.ts
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
var SVG_ATTRIBUTE_NAMES = {
  accentHeight: "accent-height",
  alignmentBaseline: "alignment-baseline",
  baselineShift: "baseline-shift",
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  dominantBaseline: "dominant-baseline",
  enableBackground: "enable-background",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontSizeAdjust: "font-size-adjust",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontWeight: "font-weight",
  glyphOrientationHorizontal: "glyph-orientation-horizontal",
  glyphOrientationVertical: "glyph-orientation-vertical",
  letterSpacing: "letter-spacing",
  lightingColor: "lighting-color",
  markerEnd: "marker-end",
  markerMid: "marker-mid",
  markerStart: "marker-start",
  paintOrder: "paint-order",
  pointerEvents: "pointer-events",
  shapeRendering: "shape-rendering",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration",
  textRendering: "text-rendering",
  transformOrigin: "transform-origin",
  vectorEffect: "vector-effect",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode"
};
var svgAttributeName = (name) => SVG_ATTRIBUTE_NAMES[name] ?? name;
var writeStyle = (style, name, value) => {
  if (name.startsWith("--")) {
    if (value == null) style.removeProperty(name);
    else style.setProperty(name, String(value));
  } else {
    style[name] = value == null ? "" : String(value);
  }
};
var DOMVDOMHost = class _DOMVDOMHost {
  createElement(tag, parent) {
    if (tag.toLowerCase() === "svg") {
      return document.createElementNS(SVG_NAMESPACE, tag);
    }
    const parentElement = parent instanceof Element ? parent : null;
    const parentIsSvg = parentElement?.namespaceURI === SVG_NAMESPACE;
    const parentIsForeignObject = parentIsSvg && parentElement?.localName === "foreignObject";
    if (parentIsSvg && !parentIsForeignObject) {
      return document.createElementNS(SVG_NAMESPACE, tag);
    }
    return document.createElement(tag);
  }
  createText(text) {
    return document.createTextNode(text);
  }
  setText(node, text) {
    node.textContent = text;
  }
  setProp(node, name, value, previous) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    if (name === "style") {
      const before = previous ?? {};
      const after = value ?? {};
      for (const key of /* @__PURE__ */ new Set([
        ...Object.keys(before),
        ...Object.keys(after)
      ])) {
        if (Object.is(before[key], after[key])) continue;
        writeStyle(node.style, key, after[key]);
      }
      return;
    }
    if (/^on[A-Z]/.test(name)) {
      const eventName = name.slice(2).toLowerCase();
      if (typeof previous === "function") {
        node.removeEventListener(eventName, previous);
      }
      if (typeof value === "function") {
        node.addEventListener(eventName, value);
      }
      return;
    }
    if (name === "className") {
      if (node instanceof HTMLElement) node.className = String(value ?? "");
      else node.setAttribute("class", String(value ?? ""));
      return;
    }
    if (name.startsWith("aria-") || name.startsWith("data-")) {
      if (value == null) node.removeAttribute(name);
      else node.setAttribute(name, String(value));
      return;
    }
    if (node instanceof SVGElement) {
      if (name === "xlinkHref") {
        if (value == null || value === false) {
          node.removeAttributeNS(XLINK_NAMESPACE, "href");
        } else {
          node.setAttributeNS(XLINK_NAMESPACE, "xlink:href", String(value));
        }
        return;
      }
      const attribute = svgAttributeName(name);
      if (value == null || value === false) node.removeAttribute(attribute);
      else node.setAttribute(attribute, value === true ? "" : String(value));
      return;
    }
    if (name === "htmlFor" && node instanceof HTMLLabelElement) {
      node.htmlFor = String(value ?? "");
      return;
    }
    if (name === "value" && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
      const next = value == null ? "" : String(value);
      if (node.value !== next) node.value = next;
      if (value == null) node.removeAttribute(name);
      return;
    }
    if ((value == null || value === false) && name in node && typeof node[name] === "boolean") {
      node[name] = false;
      node.removeAttribute(name);
    } else if (value == null || value === false) {
      node.removeAttribute(name);
    } else if (name in node && !name.startsWith("aria-") && !name.startsWith("data-")) {
      node[name] = value;
    } else {
      node.setAttribute(name, value === true ? "" : String(value));
    }
  }
  setStyleProp(node, name, value) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    writeStyle(node.style, name, value);
  }
  prepareStyleProp(node, name) {
    if (this.setStyleProp !== _DOMVDOMHost.prototype.setStyleProp) return;
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
    return createDOMStylePropWriter(node.style, name);
  }
  place(parent, node, before) {
    if (node.parentNode === parent && node.nextSibling === before) return;
    if (before === null && node.parentNode === parent && parent.lastChild === node) return;
    parent.insertBefore(node, before);
  }
  remove(parent, node) {
    if (node.parentNode === parent) parent.removeChild(node);
  }
};

// .cache/prepared-style-writer-milestone/dom-probe.ts
globalThis.__preparedDOMHost = DOMVDOMHost;
