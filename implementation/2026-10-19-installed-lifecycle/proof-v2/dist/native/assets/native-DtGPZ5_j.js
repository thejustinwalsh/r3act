//#region \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/closed_numeric_expression.js
var unary = /* @__PURE__ */ new Set([
	"+",
	"-",
	"!",
	"~"
]);
var binary = /* @__PURE__ */ new Set([
	"+",
	"-",
	"*",
	"/",
	"%",
	"**",
	"==",
	"!=",
	"===",
	"!==",
	"<",
	"<=",
	">",
	">=",
	"<<",
	">>",
	">>>",
	"|",
	"^",
	"&"
]);
var logical = /* @__PURE__ */ new Set([
	"&&",
	"||",
	"??"
]);
var MAX_DEPTH = 32;
var MAX_NODES = 256;
var dataRecord = (input) => {
	if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
	const prototype = Object.getPrototypeOf(input);
	if (prototype !== Object.prototype && prototype !== null) return null;
	const descriptors = Object.getOwnPropertyDescriptors(input);
	if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length) return null;
	const result = Object.create(null);
	for (const [key, descriptor] of Object.entries(descriptors)) {
		if (!("value" in descriptor)) return null;
		result[key] = descriptor.value;
	}
	return result;
};
var dataArray = (input) => {
	if (!Array.isArray(input) || input.length > MAX_NODES) return null;
	const descriptors = Object.getOwnPropertyDescriptors(input);
	if (Reflect.ownKeys(input).length !== input.length + 1 || Object.keys(descriptors).length !== input.length + 1) return null;
	const copy = [];
	for (let index = 0; index < input.length; index++) {
		const descriptor = descriptors[index];
		if (!descriptor || !("value" in descriptor)) return null;
		copy.push(descriptor.value);
	}
	return copy;
};
var exact$3 = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
/** Snapshot untrusted descriptor data; evaluation touches only these frozen copies. */
var normalizeClosedNumericExpression = (input, inputCount) => {
	if (!Number.isSafeInteger(inputCount) || inputCount < 0) return null;
	const active = /* @__PURE__ */ new Set();
	let nodes = 0;
	const visit = (value, depth) => {
		if (depth > MAX_DEPTH || ++nodes > MAX_NODES || typeof value !== "object" || value === null || active.has(value)) return null;
		active.add(value);
		try {
			const node = dataRecord(value);
			if (!node) return null;
			switch (node.kind) {
				case "input": return exact$3(node, ["kind", "index"]) && Number.isSafeInteger(node.index) && node.index >= 0 && node.index < inputCount ? Object.freeze({
					kind: "input",
					index: node.index
				}) : null;
				case "literal": {
					if (!exact$3(node, ["kind", "value"])) return null;
					const literal = node.value;
					return literal === null || typeof literal === "string" || typeof literal === "boolean" || typeof literal === "number" && Number.isFinite(literal) ? Object.freeze({
						kind: "literal",
						value: literal
					}) : null;
				}
				case "unary": {
					if (!exact$3(node, [
						"kind",
						"operator",
						"argument"
					]) || typeof node.operator !== "string" || !unary.has(node.operator)) return null;
					const argument = visit(node.argument, depth + 1);
					return argument ? Object.freeze({
						kind: "unary",
						operator: node.operator,
						argument
					}) : null;
				}
				case "binary":
				case "logical": {
					if (!exact$3(node, [
						"kind",
						"operator",
						"left",
						"right"
					]) || typeof node.operator !== "string" || !(node.kind === "binary" ? binary : logical).has(node.operator)) return null;
					const left = visit(node.left, depth + 1);
					const right = visit(node.right, depth + 1);
					if (!left || !right) return null;
					return node.kind === "binary" ? Object.freeze({
						kind: "binary",
						operator: node.operator,
						left,
						right
					}) : Object.freeze({
						kind: "logical",
						operator: node.operator,
						left,
						right
					});
				}
				case "conditional": {
					if (!exact$3(node, [
						"kind",
						"test",
						"consequent",
						"alternate"
					])) return null;
					const test = visit(node.test, depth + 1);
					const consequent = visit(node.consequent, depth + 1);
					const alternate = visit(node.alternate, depth + 1);
					return test && consequent && alternate ? Object.freeze({
						kind: "conditional",
						test,
						consequent,
						alternate
					}) : null;
				}
				case "template": {
					if (!exact$3(node, [
						"kind",
						"parts",
						"expressions"
					])) return null;
					const parts = dataArray(node.parts);
					const expressions = dataArray(node.expressions);
					if (!parts || !expressions || parts.length !== expressions.length + 1 || parts.some((part) => typeof part !== "string")) return null;
					const normalized = [];
					for (const expression of expressions) {
						const child = visit(expression, depth + 1);
						if (!child) return null;
						normalized.push(child);
					}
					return Object.freeze({
						kind: "template",
						parts: Object.freeze(parts),
						expressions: Object.freeze(normalized)
					});
				}
				default: return null;
			}
		} finally {
			active.delete(value);
		}
	};
	try {
		return visit(input, 0);
	} catch {
		return null;
	}
};
/** Evaluate a normalized expression without invoking authored projectors. */
var evaluateClosedNumericExpression = (expression, inputs) => {
	const read = (node) => {
		switch (node.kind) {
			case "input": return inputs[node.index];
			case "literal": return node.value;
			case "unary": {
				const value = read(node.argument);
				switch (node.operator) {
					case "+": return Number(value);
					case "-": return -Number(value);
					case "!": return !value;
					case "~": return ~Number(value);
				}
			}
			case "binary": {
				const left = read(node.left);
				const right = read(node.right);
				switch (node.operator) {
					case "+": return left + right;
					case "-": return Number(left) - Number(right);
					case "*": return Number(left) * Number(right);
					case "/": return Number(left) / Number(right);
					case "%": return Number(left) % Number(right);
					case "**": return Number(left) ** Number(right);
					case "==": return left == right;
					case "!=": return left != right;
					case "===": return left === right;
					case "!==": return left !== right;
					case "<": return left < right;
					case "<=": return left <= right;
					case ">": return left > right;
					case ">=": return left >= right;
					case "<<": return Number(left) << Number(right);
					case ">>": return Number(left) >> Number(right);
					case ">>>": return Number(left) >>> Number(right);
					case "|": return Number(left) | Number(right);
					case "^": return Number(left) ^ Number(right);
					case "&": return Number(left) & Number(right);
				}
			}
			case "logical": {
				const left = read(node.left);
				if (node.operator === "&&") return left ? read(node.right) : left;
				if (node.operator === "||") return left ? left : read(node.right);
				return left === null ? read(node.right) : left;
			}
			case "conditional": return read(node.test) ? read(node.consequent) : read(node.alternate);
			case "template": {
				let output = node.parts[0] ?? "";
				for (let index = 0; index < node.expressions.length; index++) output += String(read(node.expressions[index])) + node.parts[index + 1];
				return output;
			}
		}
	};
	return read(expression);
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/scoped_host_values.js
var isSafeClosedStyleName = (name) => name !== "__proto__" && name !== "prototype" && name !== "constructor" && (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name) || /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(name));
var declined = Object.freeze({ accepted: false });
var isFinitePrimitive = (value) => value === null || value === void 0 || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
/** Capture a supported host prop without retaining caller-owned structured values. */
var snapshotScopedHostProp = (tag, name, value) => {
	if (name === "ref" || /^on[A-Z]/.test(name)) return declined;
	if (name === "style") {
		if (tag !== "div" && tag !== "span" && tag !== "output") return declined;
		if (value === null || typeof value !== "object" || Array.isArray(value)) return declined;
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) return declined;
		const descriptors = Object.getOwnPropertyDescriptors(value);
		const names = Reflect.ownKeys(descriptors);
		if (names.length > 32) return declined;
		const copy = {};
		for (const key of names) {
			if (typeof key !== "string" || !isSafeClosedStyleName(key)) return declined;
			const descriptor = descriptors[key];
			if (!("value" in descriptor)) return declined;
			const item = descriptor.value;
			if (item !== null && typeof item !== "string" && !(typeof item === "number" && Number.isFinite(item))) return declined;
			copy[key] = item;
		}
		return {
			accepted: true,
			value: Object.freeze(copy)
		};
	}
	if (isFinitePrimitive(value)) return {
		accepted: true,
		value
	};
	if (name === "position" || name === "rotation" || name === "scale") {
		if (tag !== "group" && tag !== "mesh") return declined;
		if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return declined;
		const descriptors = Object.getOwnPropertyDescriptors(value);
		const keys = Reflect.ownKeys(descriptors);
		if (keys.length !== 4 || ![
			"0",
			"1",
			"2",
			"length"
		].every((key) => keys.includes(key))) return declined;
		const lengthDescriptor = descriptors["length"];
		if (!lengthDescriptor || !("value" in lengthDescriptor) || lengthDescriptor.value !== 3) return declined;
		const items = [];
		for (const key of [
			"0",
			"1",
			"2"
		]) {
			const descriptor = descriptors[key];
			if (!("value" in descriptor) || typeof descriptor.value !== "number" || !Number.isFinite(descriptor.value)) return declined;
			items.push(descriptor.value);
		}
		return {
			accepted: true,
			value: Object.freeze(items)
		};
	}
	return declined;
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/closed_host_value.js
var closedDataRecord = (input) => {
	if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
	const prototype = Object.getPrototypeOf(input);
	if (prototype !== Object.prototype && prototype !== null) return null;
	const descriptors = Object.getOwnPropertyDescriptors(input);
	if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length) return null;
	const copy = Object.create(null);
	for (const [key, descriptor] of Object.entries(descriptors)) {
		if (!("value" in descriptor)) return null;
		copy[key] = descriptor.value;
	}
	return copy;
};
var exactClosedFields = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
var closedDataArray$1 = (input, limit = 32) => {
	if (!Array.isArray(input) || input.length > limit) return null;
	const descriptors = Object.getOwnPropertyDescriptors(input);
	if (Reflect.ownKeys(input).length !== input.length + 1 || Object.keys(descriptors).length !== input.length + 1) return null;
	const copy = [];
	for (let index = 0; index < input.length; index++) {
		const descriptor = descriptors[index];
		if (!descriptor || !("value" in descriptor)) return null;
		copy.push(descriptor.value);
	}
	return copy;
};
var isClosedHostPrimitive = (value) => value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
var isClosedHostPropertyName = (tag, name) => {
	if (name === "key" || name === "children" || name === "ref" || name === "style" || name === "__proto__" || name === "prototype" || name === "constructor" || name.startsWith("on")) return false;
	if (tag === "div" || tag === "span" || tag === "output") return /^data-[a-z][a-z0-9-]*$/.test(name);
	return name === "name" || name === "visible" || /^(position|rotation|scale)-[xyz]$/.test(name);
};
/** Normalize one compiler-proven primitive or aggregate host prop from descriptor data. */
var normalizeClosedHostValue = (input, tag, name, inputCount, allowAggregates) => {
	try {
		if (allowAggregates && typeof input === "object" && input !== null) {
			const aggregate = closedDataRecord(input);
			if (!aggregate) return null;
			if (aggregate.kind === "tuple") {
				if (tag !== "group" && tag !== "mesh" || name !== "position" && name !== "rotation" && name !== "scale" || !exactClosedFields(aggregate, ["kind", "items"])) return null;
				const items = closedDataArray$1(aggregate.items, 3);
				if (!items || items.length !== 3) return null;
				const first = normalizeClosedNumericExpression(items[0], inputCount);
				const second = normalizeClosedNumericExpression(items[1], inputCount);
				const third = normalizeClosedNumericExpression(items[2], inputCount);
				return first && second && third ? Object.freeze({
					kind: "tuple",
					items: Object.freeze([
						first,
						second,
						third
					])
				}) : null;
			}
			if (aggregate.kind === "style") {
				if (tag !== "div" && tag !== "span" && tag !== "output" || name !== "style" || !exactClosedFields(aggregate, ["kind", "entries"])) return null;
				const rawEntries = closedDataArray$1(aggregate.entries, 32);
				if (!rawEntries) return null;
				const entries = [];
				const seen = /* @__PURE__ */ new Set();
				for (const raw of rawEntries) {
					const pair = closedDataArray$1(raw, 2);
					if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || !isSafeClosedStyleName(pair[0]) || seen.has(pair[0])) return null;
					const expression = normalizeClosedNumericExpression(pair[1], inputCount);
					if (!expression) return null;
					seen.add(pair[0]);
					entries.push(Object.freeze([pair[0], expression]));
				}
				return Object.freeze({
					kind: "style",
					entries: Object.freeze(entries)
				});
			}
		}
		return isClosedHostPropertyName(tag, name) ? normalizeClosedNumericExpression(input, inputCount) : null;
	} catch {
		return null;
	}
};
/** Evaluate into a fresh value owned by this candidate; undefined means unsupported output. */
var evaluateClosedHostValue = (expression, inputs) => {
	if (expression.kind === "tuple") {
		const values = expression.items.map((item) => evaluateClosedNumericExpression(item, inputs));
		if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) return void 0;
		return Object.freeze(values);
	}
	if (expression.kind === "style") {
		const style = Object.create(null);
		for (const [name, item] of expression.entries) {
			const value = evaluateClosedNumericExpression(item, inputs);
			if (value !== null && typeof value !== "string" && !(typeof value === "number" && Number.isFinite(value))) return void 0;
			style[name] = value;
		}
		return Object.freeze(style);
	}
	const value = evaluateClosedNumericExpression(expression, inputs);
	return isClosedHostPrimitive(value) ? value : void 0;
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/closed_component_forward_program.js
var record$2 = closedDataRecord;
var exact$2 = exactClosedFields;
var array$1 = closedDataArray$1;
var safeName = (name) => typeof name === "string" && /^[A-Za-z_$][\w$]*$/.test(name) && name !== "key" && name !== "ref" && name !== "children" && name !== "__proto__" && name !== "constructor" && name !== "prototype";
/** Snapshot untrusted compiler metadata without invoking either component. */
var normalizeClosedComponentForwardProgram = (input) => {
	try {
		const root = record$2(input);
		if (!root || !exact$2(root, [
			"schemaVersion",
			"componentProgramId",
			"moduleRevision",
			"childComponentProgramId",
			"childComponent",
			"key",
			"props"
		]) || root.schemaVersion !== 1 || typeof root.componentProgramId !== "string" || root.componentProgramId.length === 0 || typeof root.moduleRevision !== "string" || root.moduleRevision.length === 0 || typeof root.childComponentProgramId !== "string" || root.childComponentProgramId.length === 0 || typeof root.childComponent !== "function" || root.key !== null && (typeof root.key !== "string" || root.key.length === 0)) return null;
		const rawProps = array$1(root.props, 32);
		if (!rawProps) return null;
		const props = [];
		const seen = /* @__PURE__ */ new Set();
		for (const rawProp of rawProps) {
			const pair = array$1(rawProp, 2);
			if (!pair || pair.length !== 2 || !safeName(pair[0]) || seen.has(pair[0])) return null;
			const rawExpression = record$2(pair[1]);
			if (!rawExpression) return null;
			let expression;
			if (rawExpression.kind === "prop" && exact$2(rawExpression, ["kind", "name"]) && safeName(rawExpression.name)) expression = Object.freeze({
				kind: "prop",
				name: rawExpression.name
			});
			else if (rawExpression.kind === "literal" && exact$2(rawExpression, ["kind", "value"]) && isClosedHostPrimitive(rawExpression.value)) expression = Object.freeze({
				kind: "literal",
				value: rawExpression.value
			});
			else return null;
			seen.add(pair[0]);
			props.push(Object.freeze([pair[0], expression]));
		}
		return Object.freeze({
			schemaVersion: 1,
			componentProgramId: root.componentProgramId,
			moduleRevision: root.moduleRevision,
			childComponentProgramId: root.childComponentProgramId,
			childComponent: root.childComponent,
			key: root.key,
			props: Object.freeze(props)
		});
	} catch {
		return null;
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/jsx_binding_runtime.js
var runtimeOwnedElements = /* @__PURE__ */ new WeakSet();
/** True only for an element and props allocated by the runtime. */
var isRuntimeOwnedElement = (value) => typeof value === "object" && value !== null && runtimeOwnedElements.has(value);
var ownRuntimeElement = (element) => {
	runtimeOwnedElements.add(element);
	return element;
};
/** @internal Copy an element into runtime-owned ordinary objects. */
var copyRuntimeElement = (type, props) => ownRuntimeElement(Object.freeze({
	type,
	props: Object.freeze({ ...props })
}));
var keyedOwnerRegionTag = Symbol("keyed-owner-region");
var keyedOwnerVersionTag = Symbol("keyed-owner-version");
var keyedOwnerVersions = /* @__PURE__ */ new WeakSet();
/** Create a trusted version token. Generated code should retain it across reorder-only updates. */
var createKeyedOwnerVersion = () => {
	const version = Object.freeze({});
	keyedOwnerVersions.add(version);
	return version;
};
var getKeyedOwnerRegionId = (value) => Array.isArray(value) && keyedOwnerRegionTag in value ? value[keyedOwnerRegionTag] : null;
var getKeyedOwnerVersion = (value) => Array.isArray(value) && keyedOwnerVersionTag in value ? value[keyedOwnerVersionTag] : null;
/** Preserve compiler-owned keyed-region metadata when a runtime maps an array. */
var copyKeyedOwnerMetadata = (source, target) => {
	const regionId = getKeyedOwnerRegionId(source);
	if (regionId !== null) {
		Object.defineProperty(target, keyedOwnerRegionTag, { value: regionId });
		const version = getKeyedOwnerVersion(source);
		if (version !== null) Object.defineProperty(target, keyedOwnerVersionTag, { value: version });
	}
	return target;
};
var Fragment = Symbol("jsx-runtime-fragment");
/** Classic JSX factory used by the TSX prototype page. */
function jsx(type, props, ...children) {
	const next = { ...props ?? {} };
	if (children.length === 1) next.children = freezeChild(children[0]);
	else if (children.length > 1) next.children = Object.freeze(children.map(freezeChild));
	else if (Array.isArray(next.children)) next.children = Object.freeze(next.children.map(freezeChild));
	Object.freeze(next);
	return ownRuntimeElement(Object.freeze({
		type,
		props: next
	}));
}
var freezeChild = (node) => {
	if (!Array.isArray(node)) return node;
	const frozen = node.map(freezeChild);
	copyKeyedOwnerMetadata(node, frozen);
	return Object.freeze(frozen);
};
var ScalarSource = class {
	id;
	value;
	constructor(id, value) {
		this.id = id;
		this.value = value;
	}
};
/** Contiguous per-entity values for a compiler-known trait/source slot. */
var NumericColumn = class {
	id;
	sourceSlot;
	values;
	source;
	constructor(id, sourceSlot, values) {
		this.id = id;
		this.sourceSlot = sourceSlot;
		this.values = values;
		this.source = new ScalarSource(id, 0);
	}
	/**
	* Ensure storage for at least `minCapacity` rows. Growth doubles the current
	* capacity (using one slot as the zero-capacity seed), or uses the requested
	* capacity when that is larger. Existing values are copied and the new tail
	* is zero-filled by Float64Array. The column and its source identities stay
	* stable; callers should reserve while activating rows, not during a flush.
	*/
	reserve(minCapacity) {
		if (!Number.isSafeInteger(minCapacity) || minCapacity < 0) throw new RangeError("Numeric column capacity must be a nonnegative safe integer");
		const current = this.values;
		if (current.length >= minCapacity) return;
		const geometricCapacity = Math.max(1, current.length * 2);
		const next = new Float64Array(Math.max(minCapacity, geometricCapacity));
		next.set(current);
		this.values = next;
	}
};
var bindingTag = Symbol("jsx-runtime-binding");
var closedBindings = /* @__PURE__ */ new WeakMap();
/** Resolve only runtime-created data programs whose callbacks remain intact. */
var closedExpressionForBinding = (binding) => {
	const capability = closedBindings.get(binding);
	if (!capability) return null;
	const data = Object.getOwnPropertyDescriptors(binding);
	const matches = (name, expected) => {
		const descriptor = data[name];
		return descriptor ? "value" in descriptor && descriptor.value === expected : expected === void 0;
	};
	return matches("project", capability.project) && matches("read", capability.read) && matches("projectInputs", capability.projectInputs) && matches("sources", capability.sources) ? capability.expression : null;
};
var readBoundValue = (binding) => binding.read ? binding.read() : binding.project(binding.column ? binding.column.values[binding.entityIndex] : binding.source.value);
var isBoundValue = (value) => typeof value === "object" && value !== null && value[bindingTag] === true;
var getBoundValue = (value) => isBoundValue(value) ? value : null;
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/closed_host_tree.js
/** Copy a finite host tree from untrusted descriptor data into frozen compiler metadata. */
var normalizeClosedHostTree = (input, inputCount, allowAggregates, maximumInputs = 8) => {
	if (!Number.isSafeInteger(maximumInputs) || maximumInputs < 1 || maximumInputs > 32 || !Number.isSafeInteger(inputCount) || inputCount < 1 || inputCount > maximumInputs) return null;
	const active = /* @__PURE__ */ new Set();
	const keys = /* @__PURE__ */ new Set();
	let nodes = 0;
	const visit = (raw, depth) => {
		if (depth > 32 || ++nodes > 256 || typeof raw !== "object" || raw === null || active.has(raw)) return null;
		active.add(raw);
		try {
			const host = closedDataRecord(raw);
			if (!host || !exactClosedFields(host, [
				"tag",
				"key",
				"props",
				"children"
			]) || ![
				"div",
				"span",
				"output",
				"group",
				"mesh"
			].includes(host.tag) || typeof host.key !== "string" || host.key.length === 0 || keys.has(host.key)) return null;
			const tag = host.tag;
			keys.add(host.key);
			const rawProps = closedDataArray$1(host.props);
			const rawChildren = closedDataArray$1(host.children, 256);
			if (!rawProps || !rawChildren) return null;
			const props = [];
			const names = /* @__PURE__ */ new Set();
			for (const rawPair of rawProps) {
				const pair = closedDataArray$1(rawPair, 2);
				if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || names.has(pair[0])) return null;
				const expression = normalizeClosedHostValue(pair[1], tag, pair[0], inputCount, allowAggregates);
				if (!expression) return null;
				names.add(pair[0]);
				props.push(Object.freeze([pair[0], expression]));
			}
			const children = [];
			for (const rawChild of rawChildren) {
				const child = closedDataRecord(rawChild);
				if (!child) return null;
				if (child.kind === "host" && exactClosedFields(child, ["kind", "host"])) {
					const nested = visit(child.host, depth + 1);
					if (!nested) return null;
					children.push(Object.freeze({
						kind: "host",
						host: nested
					}));
				} else if (child.kind === "text" && exactClosedFields(child, ["kind", "expression"])) {
					if (++nodes > 256) return null;
					const expression = normalizeClosedNumericExpression(child.expression, inputCount);
					if (!expression) return null;
					children.push(Object.freeze({
						kind: "text",
						expression
					}));
				} else return null;
			}
			return Object.freeze({
				tag,
				key: host.key,
				props: Object.freeze(props),
				children: Object.freeze(children)
			});
		} finally {
			active.delete(raw);
		}
	};
	try {
		return visit(input, 0);
	} catch {
		return null;
	}
};
/** Build candidate-owned JSX values from a frozen host tree. */
var evaluateClosedHostTree = (host, inputs, requireTextNode = false) => {
	const construct = (node) => {
		const props = { key: node.key };
		for (const [name, expression] of node.props) {
			const value = evaluateClosedHostValue(expression, inputs);
			if (value === void 0) return null;
			props[name] = value;
		}
		const children = [];
		for (const child of node.children) if (child.kind === "host") {
			const nested = construct(child.host);
			if (!nested) return null;
			children.push(nested);
		} else {
			const value = evaluateClosedNumericExpression(child.expression, inputs);
			if (!isClosedHostPrimitive(value) || value === true || requireTextNode && typeof value !== "string" && typeof value !== "number") return null;
			children.push(value);
		}
		return jsx(node.tag, props, ...children);
	};
	return construct(host);
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/closed_store_host_program.js
var record$1 = closedDataRecord;
var exact$1 = exactClosedFields;
var array = closedDataArray$1;
var allowedName = (tag, name) => tag === "div" || tag === "span" || tag === "output" ? /^data-[a-z][a-z0-9-]*$/.test(name) : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
var input = (site, prop) => typeof site === "string" && site.length > 0 && typeof prop === "string" && /^[A-Za-z_$][\w$]*$/.test(prop) ? Object.freeze({
	storeUseSiteId: site,
	storeProp: prop
}) : null;
var directPath = Object.freeze([Object.freeze([])]);
var safePathSegment = (segment) => typeof segment === "string" && /^[A-Za-z_$][\w$]*$/.test(segment) && segment !== "__proto__" && segment !== "constructor" && segment !== "prototype";
var inputPaths = (raw) => {
	const rawPaths = array(raw, 32);
	if (!rawPaths || rawPaths.length === 0) return null;
	const paths = [];
	const seen = /* @__PURE__ */ new Set();
	for (const rawPath of rawPaths) {
		const parts = array(rawPath, 8);
		if (!parts || !parts.every(safePathSegment)) return null;
		const key = JSON.stringify(parts);
		if (seen.has(key)) return null;
		seen.add(key);
		paths.push(Object.freeze(parts));
	}
	return Object.freeze(paths);
};
/** Copy untrusted metadata into a frozen, data-only executable plan. */
var normalizeClosedStoreHostProgram = (raw) => {
	try {
		const root = record$1(raw);
		if (!root || typeof root.componentProgramId !== "string" || !root.componentProgramId || typeof root.moduleRevision !== "string" || !root.moduleRevision) return null;
		let inputs;
		if (root.schemaVersion === 1) {
			if (!exact$1(root, [
				"schemaVersion",
				"componentProgramId",
				"moduleRevision",
				"storeUseSiteId",
				"storeProp",
				"host"
			])) return null;
			const one = input(root.storeUseSiteId, root.storeProp);
			if (!one) return null;
			inputs = Object.freeze([one]);
		} else if (root.schemaVersion === 2 || root.schemaVersion === 3 || root.schemaVersion === 4 || root.schemaVersion === 5) {
			if (!exact$1(root, [
				"schemaVersion",
				"componentProgramId",
				"moduleRevision",
				"inputs",
				"host"
			])) return null;
			const rawInputs = array(root.inputs);
			if (!rawInputs || rawInputs.length < (root.schemaVersion === 2 ? 2 : 1) || rawInputs.length > 8) return null;
			const next = [];
			const sites = /* @__PURE__ */ new Set();
			let valueCount = 0;
			let hasProjection = false;
			for (const rawInput of rawInputs) {
				const item = record$1(rawInput);
				if (!item || !exact$1(item, root.schemaVersion === 5 ? [
					"storeUseSiteId",
					"storeProp",
					"paths"
				] : ["storeUseSiteId", "storeProp"])) return null;
				const normalized = input(item.storeUseSiteId, item.storeProp);
				if (!normalized || sites.has(normalized.storeUseSiteId)) return null;
				sites.add(normalized.storeUseSiteId);
				if (root.schemaVersion === 5) {
					const paths = inputPaths(item.paths);
					if (!paths) return null;
					valueCount += paths.length;
					if (valueCount > 32) return null;
					hasProjection ||= paths.some((path) => path.length > 0);
					next.push(Object.freeze({
						...normalized,
						paths
					}));
				} else next.push(normalized);
			}
			if (root.schemaVersion === 5 && !hasProjection) return null;
			inputs = Object.freeze(next);
		} else return null;
		if (root.schemaVersion === 4 || root.schemaVersion === 5) {
			const inputCount = root.schemaVersion === 5 ? inputs.reduce((count, item) => count + item.paths.length, 0) : inputs.length;
			const host = normalizeClosedHostTree(root.host, inputCount, true, root.schemaVersion === 5 ? 32 : 8);
			return host ? Object.freeze({
				schemaVersion: root.schemaVersion,
				componentProgramId: root.componentProgramId,
				moduleRevision: root.moduleRevision,
				inputs,
				host
			}) : null;
		}
		const host = record$1(root.host);
		if (!host || !exact$1(host, [
			"tag",
			"key",
			"props",
			"child"
		]) || ![
			"mesh",
			"group",
			"div",
			"span",
			"output"
		].includes(host.tag) || root.schemaVersion !== 3 && host.tag === "span" || typeof host.key !== "string" || host.key.length === 0 || host.child !== null) return null;
		const tag = host.tag;
		const rawProps = array(host.props);
		if (!rawProps) return null;
		const props = [];
		const names = /* @__PURE__ */ new Set();
		for (const rawProp of rawProps) {
			const pair = array(rawProp);
			if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || root.schemaVersion !== 3 && !allowedName(tag, pair[0]) || names.has(pair[0])) return null;
			const expression = normalizeClosedHostValue(pair[1], tag, pair[0], inputs.length, root.schemaVersion === 3);
			if (!expression) return null;
			names.add(pair[0]);
			props.push(Object.freeze([pair[0], expression]));
		}
		if (props.length === 0) return null;
		const common = {
			componentProgramId: root.componentProgramId,
			moduleRevision: root.moduleRevision,
			host: Object.freeze({
				tag,
				key: host.key,
				props: Object.freeze(props),
				child: null
			})
		};
		return root.schemaVersion === 1 ? Object.freeze({
			...common,
			schemaVersion: 1,
			...inputs[0]
		}) : Object.freeze({
			...common,
			schemaVersion: root.schemaVersion,
			inputs
		});
	} catch {
		return null;
	}
};
/** The ordered direct Store reads covered by the frozen compiler program. */
var closedStoreHostInputs = (program) => program.schemaVersion !== 1 ? program.inputs : Object.freeze([Object.freeze({
	storeUseSiteId: program.storeUseSiteId,
	storeProp: program.storeProp
})]);
/** Numeric paths for one lexical Store input; old schemas read the state directly. */
var closedStoreHostInputPaths = (input) => input.paths ?? directPath;
/** Number of numeric expression inputs after lexical path flattening. */
var closedStoreHostValueCount = (program) => closedStoreHostInputs(program).reduce((count, input) => count + closedStoreHostInputPaths(input).length, 0);
/** Evaluate frozen compiler data into candidate-owned host values; unsupported values decline. */
var evaluateClosedStoreHostProgram = (program, numericValues) => {
	if (program.schemaVersion === 4 || program.schemaVersion === 5) return null;
	const count = program.schemaVersion !== 1 ? program.inputs.length : 1;
	const values = typeof numericValues === "number" ? count === 1 ? [numericValues] : null : array(numericValues);
	if (!values || values.length !== count || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
	const props = [];
	for (const [name, expression] of program.host.props) {
		const value = evaluateClosedHostValue(expression, values);
		if (value === void 0 || program.schemaVersion !== 3 && !isClosedHostPrimitive(value)) return null;
		props.push(Object.freeze([name, value]));
	}
	return Object.freeze(props);
};
/** Evaluate every Store schema as a keyed candidate tree for scoped host publication. */
var evaluateClosedStoreHostTree = (program, numericValues) => {
	if (program.schemaVersion !== 4 && program.schemaVersion !== 5) {
		const output = evaluateClosedStoreHostProgram(program, numericValues);
		if (!output) return null;
		const props = { key: program.host.key };
		for (const [name, value] of output) props[name] = value;
		return jsx(program.host.tag, props);
	}
	const count = closedStoreHostValueCount(program);
	const values = typeof numericValues === "number" ? count === 1 ? [numericValues] : null : array(numericValues);
	if (!values || values.length !== count || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
	return evaluateClosedHostTree(program.host, values, true);
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/closed_resource_host_program.js
var record = closedDataRecord;
var exact = exactClosedFields;
var primitive = isClosedHostPrimitive;
var tupleArray = closedDataArray$1;
/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
var normalizeClosedResourceHostProgram = (input) => {
	try {
		const root = record(input);
		if (!root || !exact(root, [
			"schemaVersion",
			"componentProgramId",
			"moduleRevision",
			"resourceUseSiteId",
			"resourceProp",
			"host"
		]) || root.schemaVersion !== 1 && root.schemaVersion !== 2 && root.schemaVersion !== 3) return null;
		for (const key of [
			"componentProgramId",
			"moduleRevision",
			"resourceUseSiteId",
			"resourceProp"
		]) if (typeof root[key] !== "string" || root[key].length === 0) return null;
		if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp)) return null;
		if (root.schemaVersion === 2 || root.schemaVersion === 3) {
			const host = normalizeClosedHostTree(root.host, 1, root.schemaVersion === 3);
			return host ? Object.freeze({
				schemaVersion: root.schemaVersion,
				componentProgramId: root.componentProgramId,
				moduleRevision: root.moduleRevision,
				resourceUseSiteId: root.resourceUseSiteId,
				resourceProp: root.resourceProp,
				host
			}) : null;
		}
		const host = record(root.host);
		if (!host || !exact(host, [
			"tag",
			"key",
			"props",
			"child"
		]) || host.tag !== "div" || host.child !== "resource-value" || typeof host.key !== "string" || host.key.length === 0) return null;
		const rawProps = tupleArray(host.props);
		if (!rawProps) return null;
		const seen = /* @__PURE__ */ new Set();
		const props = [];
		for (const raw of rawProps) {
			const pair = tupleArray(raw);
			if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || !/^data-[a-z][a-z0-9-]*$/.test(pair[0]) || seen.has(pair[0]) || !primitive(pair[1])) return null;
			seen.add(pair[0]);
			props.push(Object.freeze([pair[0], pair[1]]));
		}
		return Object.freeze({
			schemaVersion: 1,
			componentProgramId: root.componentProgramId,
			moduleRevision: root.moduleRevision,
			resourceUseSiteId: root.resourceUseSiteId,
			resourceProp: root.resourceProp,
			host: Object.freeze({
				tag: "div",
				key: host.key,
				props: Object.freeze(props),
				child: "resource-value"
			})
		});
	} catch {
		return null;
	}
};
/** Construct ready host output without invoking the authored component. */
var evaluateClosedResourceHostProgram = (program, readyValue) => {
	if (!primitive(readyValue)) return null;
	if (program.schemaVersion === 1) {
		if (readyValue === true) return null;
		const props = { key: program.host.key };
		for (const [name, value] of program.host.props) props[name] = value;
		return jsx(program.host.tag, props, readyValue);
	}
	return evaluateClosedHostTree(program.host, [readyValue]);
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/compiled_semantic_plan.js
var currentPlans = /* @__PURE__ */ new Map();
var revisionListeners = /* @__PURE__ */ new Set();
var notifyRevisionListeners = (change) => {
	const errors = [];
	for (const listener of [...revisionListeners]) try {
		listener(change);
	} catch (error) {
		errors.push(error);
	}
	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) throw new AggregateError(errors, "Compiled semantic revision listeners failed");
};
var planIdentity = Symbol("compiled-semantic-plan-identity");
var snapshotPlan = (plan) => Object.freeze({
	schema_version: 1,
	source_file: plan.source_file,
	module_revision: plan.module_revision,
	owners: Object.freeze(plan.owners.map((owner) => Object.freeze({ ...owner }))),
	sources: Object.freeze(plan.sources.map((source) => Object.freeze({ ...source }))),
	sinks: Object.freeze(plan.sinks.map((sink) => Object.freeze({
		...sink,
		source_sites: Object.freeze([...sink.source_sites])
	}))),
	operations: Object.freeze(plan.operations.map((operation) => Object.freeze({
		...operation,
		source_sites: Object.freeze([...operation.source_sites])
	}))),
	graph: Object.freeze({
		coverage: "proven-sinks-only",
		source_to_sinks: Object.freeze(Object.fromEntries(Object.entries(plan.graph.source_to_sinks).map(([source, sinks]) => [source, Object.freeze([...sinks])]))),
		execution_order: Object.freeze([...plan.graph.execution_order])
	})
});
/** Register inspection metadata; callers must never treat this public value as purity proof. */
function registerCompiledSemanticPlan(input) {
	if (!input || input.schema_version !== 1 || !input.source_file || !input.module_revision || !Array.isArray(input.owners) || !Array.isArray(input.sources) || !Array.isArray(input.sinks) || !Array.isArray(input.operations) || !input.graph || !Array.isArray(input.graph.execution_order) || input.graph.coverage !== "proven-sinks-only" || !input.graph.source_to_sinks || typeof input.graph.source_to_sinks !== "object") throw new TypeError("Invalid compiled semantic plan");
	const previous = currentPlans.get(input.source_file);
	if (previous?.module_revision === input.module_revision) return previous;
	const plan = snapshotPlan(input);
	currentPlans.set(plan.source_file, plan);
	if (previous) notifyRevisionListeners(Object.freeze({
		sourceFile: plan.source_file,
		previousRevision: previous.module_revision,
		nextRevision: plan.module_revision
	}));
	return plan;
}
/** Capture the registered plan identity before preparing work from its module. */
function captureCompiledSemanticRevision(sourceFile, expectedRevision) {
	const plan = currentPlans.get(sourceFile);
	if (!plan || expectedRevision !== void 0 && plan.module_revision !== expectedRevision) return;
	return Object.freeze({
		sourceFile,
		moduleRevision: plan.module_revision,
		[planIdentity]: plan
	});
}
/** A retired plan stays stale even if the same revision string registers again. */
function isCompiledSemanticRevisionCurrent(token) {
	return currentPlans.get(token.sourceFile) === token[planIdentity];
}
function subscribeCompiledSemanticRevision(listener) {
	revisionListeners.add(listener);
	return () => revisionListeners.delete(listener);
}
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/owned_store_record.js
var ownedStoreRecords = /* @__PURE__ */ new WeakSet();
var closedPathSegment = (value) => typeof value === "string" && /^[A-Za-z_$][\w$]*$/.test(value) && value !== "__proto__" && value !== "constructor" && value !== "prototype";
var closedDataArray = (value, maximum) => {
	if (!Array.isArray(value)) return null;
	const descriptors = Object.getOwnPropertyDescriptors(value);
	const length = descriptors.length?.value;
	if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > maximum || Reflect.ownKeys(value).length !== length + 1 || Object.keys(descriptors).length !== length + 1) return null;
	const result = [];
	for (let index = 0; index < length; index++) {
		const descriptor = descriptors[index];
		if (!descriptor || !("value" in descriptor)) return null;
		result.push(descriptor.value);
	}
	return result;
};
/** Capture finite numeric paths through records issued by storeRecord. */
function captureClosedProjectionValues(state, paths) {
	try {
		const selectedPaths = closedDataArray(paths, 32);
		if (!selectedPaths || selectedPaths.length < 1) return null;
		const values = [];
		for (const rawPath of selectedPaths) {
			const path = closedDataArray(rawPath, 8);
			if (!path) return null;
			let value = state;
			for (const segment of path) {
				if (!closedPathSegment(segment) || typeof value !== "object" || value === null || !ownedStoreRecords.has(value)) return null;
				const descriptor = Object.getOwnPropertyDescriptor(value, segment);
				if (!descriptor || !("value" in descriptor)) return null;
				value = descriptor.value;
			}
			if (typeof value !== "number" || !Number.isFinite(value)) return null;
			values.push(value);
		}
		return Object.freeze(values);
	} catch {
		return null;
	}
}
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/async_store_runtime.js
/**
* A host-independent store with React-like update ordering.
*
* State is an append-only action log with a chronological head. Readers project
* that log at a root/transition boundary: pending transition actions are
* omitted from the visible state, while later urgent actions are replayed over
* the state that root still shows. This is the property a single mutable
* getState() value cannot provide.
*
* Promise values are ordinary store values. The store never unwraps or adopts
* them; a renderer decides whether/how to suspend on a value returned by read.
*/
var storeMutationClock = 0;
var canonicalMapSet = Map.prototype.set;
var canonicalMapDelete = Map.prototype.delete;
var publicationStores = /* @__PURE__ */ new Set();
var publicationBatchDepth = 0;
var drainingPublicationStores = false;
function scheduleStoreNotifications(store) {
	publicationStores.add(store);
	if (publicationBatchDepth === 0 && !drainingPublicationStores) drainPublicationStores();
}
function drainPublicationStores() {
	if (drainingPublicationStores || publicationBatchDepth > 0) return;
	drainingPublicationStores = true;
	const errors = [];
	try {
		while (publicationStores.size > 0) {
			const store = publicationStores.values().next().value;
			if (!store) continue;
			publicationStores.delete(store);
			try {
				store._drainNotifications();
			} catch (error) {
				errors.push(error);
			}
		}
	} finally {
		drainingPublicationStores = false;
	}
	if (errors.length > 0) throw new AggregateError(errors, "Store notification listeners failed");
}
var capturedReaderCut = Symbol("captured-reader-cut");
/** A read-site context so chained selections get their own previous values. */
var StoreReadSession = class {
	rootId;
	readerId;
	snapshotStates;
	transitions;
	previous;
	next = /* @__PURE__ */ new Map();
	constructor(rootId, readerId, transitions, previous, snapshotStates) {
		this.rootId = rootId;
		this.readerId = readerId;
		this.snapshotStates = snapshotStates;
		this.transitions = new Set(transitions);
		this.previous = previous;
	}
};
/** Advanced adapter protocol: declare every store source read by this source. */
var storeDependencies = Symbol("native.store.dependencies");
/**
* A render transaction for one root. Every read uses the same projected state;
* callers validate immediately before host commit and publish selector history
* only after that commit succeeds.
*/
var StoreRenderSnapshot = class {
	store;
	rootId;
	options;
	state;
	version;
	rootEpoch;
	closedNumeric;
	#pending = /* @__PURE__ */ new Map();
	#committed = false;
	constructor(store, rootId, options, state, version, rootEpoch, closedNumeric = false) {
		this.store = store;
		this.rootId = rootId;
		this.options = options;
		this.state = state;
		this.version = version;
		this.rootEpoch = rootEpoch;
		this.closedNumeric = closedNumeric;
	}
	capturedRootStamp() {
		return Object.freeze({
			version: this.version,
			rootEpoch: this.rootEpoch
		});
	}
	read(source, readerId) {
		if (this.#committed) throw new Error("Cannot read from a committed store render snapshot");
		return this.store._readAtSnapshot(source, this.rootId, readerId, this.options.transitions ?? [], /* @__PURE__ */ new Map([[this.store, this.state]]), this.#pending);
	}
	/** False means discard/rebuild the candidate; never publish a mixed render. */
	validate() {
		return !this.#committed && (!this.closedNumeric || canonicalClosedNumericStore.call(this.store)) && (this.closedNumeric ? canonicalValidateRender.call(this.store, this.rootId, this.version, this.rootEpoch) : this.store._validateRender(this.rootId, this.version, this.rootEpoch));
	}
	validatePublicationInputs() {
		return !this.#committed && (!this.closedNumeric || canonicalClosedNumericStore.call(this.store)) && (this.closedNumeric ? canonicalValidateRenderLineage.call(this.store, this.rootId, this.version, this.rootEpoch) : this.store._validateRenderLineage(this.rootId, this.version, this.rootEpoch));
	}
	validatePublicationInputsCanonical() {
		return !this.#committed && canonicalValidateRenderLineage.call(this.store, this.rootId, this.version, this.rootEpoch);
	}
	/** Call after host commit. Repeated calls are harmless. */
	commit() {
		if (this.#committed) return;
		if (!this.validate()) throw new Error(`Store snapshot for root ${this.rootId} is stale; rebuild before commit`);
		this.commitAfterValidatedRender();
	}
	/** Publish selector history after a renderer's pre-host-commit validation. */
	commitAfterValidatedRender() {
		if (this.#committed) return;
		this.store._commitReaderValues(this.rootId, this.#pending, canonicalSnapshotRootStamp.call(this));
		this.#committed = true;
	}
};
/** A derived store. Its previous value belongs to the read site, not the node. */
var StoreSelection = class {
	sources;
	selector;
	constructor(sources, selector) {
		this.sources = sources;
		this.selector = selector;
		this.sources = Object.freeze([...sources]);
	}
	/** Immutable declared dependencies used to pin a complete root read set. */
	get dependencies() {
		return this.sources;
	}
	read(session) {
		const states = this.sources.map((source) => source.read(session));
		const previous = session.previous.get(this);
		const value = this.selector(states, previous);
		session.next.set(this, value);
		return value;
	}
	select(selector) {
		return createStoreSelector([this], ([value], previous) => selector(value, previous));
	}
};
/** A derived read over one or more stores; previous values remain per reader. */
function createStoreSelector(sources, selector) {
	if (sources.length === 0) throw new Error("A store selection requires at least one source");
	return new StoreSelection(sources, selector);
}
/**
* An action-log store. Roots are explicit so a transition can hold the roots
* that are still showing their previous state while other roots catch up.
*/
var AsyncStore = class AsyncStore {
	reducer;
	#baseState;
	#headState;
	#version = 0;
	#mutationEpoch = 0;
	#rootVersions = /* @__PURE__ */ new Map();
	#rootEpochs = /* @__PURE__ */ new Map();
	#knownRoots = /* @__PURE__ */ new Set();
	#entries = [];
	#transitions = /* @__PURE__ */ new Map();
	#roots = /* @__PURE__ */ new Map();
	#readerValues = /* @__PURE__ */ new Map();
	#notificationQueue = [];
	#notifying = false;
	constructor(initialState, reducer = ((state, action) => typeof action === "function" ? action(state) : action)) {
		this.reducer = reducer;
		this.#baseState = initialState;
		this.#headState = initialState;
	}
	/** Latest chronological value, including transition updates not yet shown. */
	getState() {
		return this.#headState;
	}
	get version() {
		return this.#version;
	}
	/** Internal transaction clock; only participating stores constrain a read cut. */
	get mutationEpoch() {
		return this.#mutationEpoch;
	}
	/** Version of the state this root can currently observe. */
	getRootVersion(rootId) {
		return this.#rootVersions.get(rootId) ?? 0;
	}
	/** Capture one immutable store projection for a root render. */
	beginRender(rootId, options = {}) {
		this.#knownRoots.add(rootId);
		let rootEpoch = this.#rootEpochs.get(rootId);
		if (!rootEpoch) this.#rootEpochs.set(rootId, rootEpoch = {});
		return new StoreRenderSnapshot(this, rootId, options, this.getStateForRoot(rootId, options), this.getRootVersion(rootId), rootEpoch);
	}
	/** Capture canonical Store state and selected values before registering a root. */
	_beginClosedProjectionRender(rootId, paths) {
		try {
			const entries = this.#entries;
			if (!canonicalClosedNumericStore.call(this)) return null;
			const version = this.#rootVersions.get(rootId) ?? 0;
			let rootEpoch = this.#rootEpochs.get(rootId);
			let state = this.#baseState;
			for (const entry of entries) {
				const transitionId = entry.priority.kind === "transition" ? entry.priority.transitionId : null;
				const pending = entry.pendingRoots.has(rootId) && !entry.committedRoots.has(rootId);
				const open = transitionId !== null && this.#transitions.get(transitionId)?.open === true;
				if (transitionId !== null && (pending || open)) return null;
				state = entry.state;
			}
			const values = captureClosedProjectionValues(state, paths);
			if (!values || !canonicalClosedNumericStore.call(this)) return null;
			this.#knownRoots.add(rootId);
			if (!rootEpoch) this.#rootEpochs.set(rootId, rootEpoch = {});
			return {
				snapshot: new StoreRenderSnapshot(this, rootId, {}, state, version, rootEpoch, true),
				values
			};
		} catch (error) {
			if (error instanceof TypeError) return null;
			throw error;
		}
	}
	/** Legacy direct numeric capture uses the same canonical projection path. */
	_beginClosedNumericRender(rootId) {
		return canonicalBeginClosedProjectionRender.call(this, rootId, closedDirectProjectionPaths)?.snapshot ?? null;
	}
	_isClosedNumericCanonical() {
		try {
			this.#entries;
			if (Object.getPrototypeOf(this) !== AsyncStore.prototype) return false;
			const currentKeys = Reflect.ownKeys(AsyncStore.prototype);
			if (currentKeys.length !== closedNumericPrototypeKeys.length) return false;
			for (const key of closedNumericPrototypeKeys) {
				if (!currentKeys.includes(key)) return false;
				const expected = closedNumericPrototypeDescriptors.get(key);
				const actual = Object.getOwnPropertyDescriptor(AsyncStore.prototype, key);
				if (!expected || !actual || expected.value !== actual.value || expected.get !== actual.get || expected.set !== actual.set || expected.writable !== actual.writable || expected.enumerable !== actual.enumerable || expected.configurable !== actual.configurable) return false;
			}
			for (const name of Object.getOwnPropertyNames(AsyncStore.prototype)) if (name !== "constructor" && Object.hasOwn(this, name)) return false;
			return !Object.hasOwn(this, storeDependencies);
		} catch (error) {
			if (error instanceof TypeError) return false;
			throw error;
		}
	}
	select(selector) {
		return createStoreSelector([this], ([state], previous) => selector(state, previous));
	}
	/** Register roots that may hold a transition update while it is pending. */
	beginTransition(transitionId, rootIds) {
		if (transitionId.length === 0) throw new Error("Transition ID must not be empty");
		if (this.#transitions.has(transitionId)) throw new Error(`Transition already exists: ${transitionId}`);
		this.#transitions.set(transitionId, {
			roots: new Set(rootIds),
			completedRoots: /* @__PURE__ */ new Set(),
			open: true
		});
		for (const rootId of rootIds) this.#knownRoots.add(rootId);
	}
	hasTransition(transitionId) {
		return this.#transitions.has(transitionId);
	}
	transitionRoots(transitionId) {
		const transition = this.#transitions.get(transitionId);
		if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
		return [...transition.roots];
	}
	/**
	* Dispatch in chronological order. A transition dispatch joins its explicit
	* transaction; it is not inferred from ambient async context.
	*/
	dispatch(action, priority = { kind: "urgent" }) {
		const pendingRoots = /* @__PURE__ */ new Set();
		if (priority.kind === "transition") {
			const transition = this.#transitions.get(priority.transitionId);
			if (!transition) throw new Error(`Unknown transition: ${priority.transitionId}`);
			if (!transition.open) throw new Error(`Transition is already finished: ${priority.transitionId}`);
			for (const rootId of transition.roots) pendingRoots.add(rootId);
		}
		const next = this.reducer(this.#headState, action);
		if (Object.is(next, this.#headState)) {
			if (this.#entries.length === 0) return false;
			const projectionRoots = new Set(this.#knownRoots);
			const newRootProbe = this.#newProjectionProbeId();
			projectionRoots.add(newRootProbe);
			if (![...projectionRoots].map((rootId) => ({
				rootId,
				options: priority.kind === "urgent" ? {} : { transitions: [priority.transitionId] }
			})).some(({ rootId, options }) => {
				const state = this.getStateForRoot(rootId, options);
				return !Object.is(this.reducer(state, action), state);
			})) return false;
		}
		this.#mutationEpoch = ++storeMutationClock;
		this.#version++;
		this.#headState = next;
		this.#entries.push({
			action,
			state: next,
			version: this.#version,
			priority,
			pendingRoots,
			committedRoots: /* @__PURE__ */ new Set()
		});
		const affectedRoots = priority.kind === "urgent" ? this.#knownRoots : pendingRoots;
		for (const rootId of affectedRoots) this.#bumpRootVersion(rootId);
		if (priority.kind === "urgent") this.#notifyAll(priority);
		else this.#enqueueNotifications([...pendingRoots], priority);
		this.#compact();
		return true;
	}
	/** Mark the async action scope closed; non-participating roots may catch up. */
	finishTransition(transitionId) {
		const transition = this.#transitions.get(transitionId);
		if (!transition) return;
		if (!transition.open) return;
		this.#mutationEpoch = ++storeMutationClock;
		transition.open = false;
		const changedRoots = [];
		for (const rootId of this.#knownRoots) if (!transition.roots.has(rootId)) {
			this.#bumpRootVersion(rootId);
			changedRoots.push(rootId);
		}
		this.#enqueueNotifications(changedRoots, {
			kind: "transition",
			transitionId
		});
		this.#compact();
	}
	/**
	* Publish this transition's actions to one root after that root commits its
	* prepared UI. Call for each root in a coordinated host commit when needed.
	*/
	commitTransition(transitionId, rootId) {
		this.commitTransitionRoots(transitionId, [rootId]);
	}
	/**
	* Publish one transition to a coordinated root set. All projection/version
	* mutations happen before the first subscriber is notified, so observers
	* cannot see a partially committed group through this store.
	*/
	commitTransitionRoots(transitionId, rootIds, options = {}) {
		const transition = this.#transitions.get(transitionId);
		if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
		const uniqueRoots = new Set(rootIds);
		if (uniqueRoots.size !== rootIds.length) throw new Error("A transition commit cannot contain duplicate roots");
		for (const rootId of uniqueRoots) if (!transition.roots.has(rootId)) throw new Error(`Root ${rootId} is not part of transition ${transitionId}`);
		this.#mutationEpoch = ++storeMutationClock;
		if (options.finish) transition.open = false;
		for (const entry of this.#entries) if (entry.priority.kind === "transition" && entry.priority.transitionId === transitionId) for (const rootId of uniqueRoots) entry.committedRoots.add(rootId);
		for (const rootId of uniqueRoots) transition.completedRoots.add(rootId);
		const changedRoots = new Set(uniqueRoots);
		if (options.finish) {
			for (const rootId of this.#knownRoots) if (!transition.roots.has(rootId)) changedRoots.add(rootId);
		}
		for (const rootId of changedRoots) this.#bumpRootVersion(rootId);
		this.#enqueueNotifications([...changedRoots], {
			kind: "transition",
			transitionId
		});
		this.#compact();
	}
	/**
	* Release a root whose candidate was abandoned; its queued actions remain.
	* Releasing a nonparticipant in a known scope is a no-op. Unknown scope IDs
	* still indicate a protocol error.
	*/
	releaseTransition(transitionId, rootId) {
		const transition = this.#transitions.get(transitionId);
		if (!transition) throw new Error(`Unknown transition: ${transitionId}`);
		if (!transition.roots.has(rootId)) return;
		this.#mutationEpoch = ++storeMutationClock;
		transition.roots.delete(rootId);
		transition.completedRoots.add(rootId);
		this.#bumpRootVersion(rootId);
		for (const entry of this.#entries) if (entry.priority.kind === "transition" && entry.priority.transitionId === transitionId) entry.pendingRoots.delete(rootId);
		this.#notify(rootId, {
			kind: "transition",
			transitionId
		});
		this.#compact();
	}
	/**
	* Detach a root and release all store-owned state associated with it.
	* Snapshots captured before detachment become stale, and a later root using
	* the same ID starts from the current store projection. Detaching the last
	* participant releases its root hold but does not finish the async action
	* scope; its owner must still call finishTransition explicitly.
	*/
	detachRoot(rootId) {
		const wasKnown = this.#knownRoots.delete(rootId);
		const hadListeners = this.#roots.delete(rootId);
		const hadReaders = this.#readerValues.delete(rootId);
		for (const [transitionId, transition] of this.#transitions) {
			if (transition.roots.delete(rootId)) transition.completedRoots.add(rootId);
			for (const entry of this.#entries) if (entry.priority.kind === "transition" && entry.priority.transitionId === transitionId) {
				entry.pendingRoots.delete(rootId);
				entry.committedRoots.delete(rootId);
			}
		}
		if (wasKnown || hadListeners || hadReaders) this.#bumpRootVersion(rootId);
		this.#knownRoots.delete(rootId);
		this.#rootVersions.delete(rootId);
		this.#rootEpochs.delete(rootId);
		this.#compact();
	}
	/**
	* Project the log for a root. `options.transitions` is the candidate lane
	* being rendered; without it, unresolved transitions remain hidden from
	* roots that are still waiting on them.
	*/
	getStateForRoot(rootId, options = {}) {
		const included = new Set(options.transitions ?? []);
		let state = this.#baseState;
		let hasSkippedAction = false;
		for (const entry of this.#entries) {
			const transitionId = entry.priority.kind === "transition" ? entry.priority.transitionId : null;
			const isPendingForRoot = entry.pendingRoots.has(rootId) && !entry.committedRoots.has(rootId);
			const scopeOpen = transitionId !== null && this.#transitions.get(transitionId)?.open === true;
			if (!(transitionId === null || included.has(transitionId) || !isPendingForRoot && !scopeOpen)) {
				hasSkippedAction = true;
				continue;
			}
			state = hasSkippedAction ? this.reducer(state, entry.action) : entry.state;
		}
		return state;
	}
	read(sourceOrSession, rootId, readerId, options = {}) {
		if (sourceOrSession instanceof StoreReadSession) {
			if (!sourceOrSession.snapshotStates.has(this)) throw new Error("Store was not included in this root render snapshot read set");
			return sourceOrSession.snapshotStates.get(this);
		}
		const source = sourceOrSession;
		if (rootId === void 0 || readerId === void 0) throw new Error("A root ID and reader ID are required for a store read");
		const snapshot = this.beginRender(rootId, options);
		return {
			value: snapshot.read(source, readerId),
			commit: () => snapshot.commit()
		};
	}
	/** Internal reader used by a pinned render snapshot. */
	_readAtSnapshot(source, rootId, readerId, transitions, snapshotStates, pending) {
		const session = new StoreReadSession(rootId, readerId, transitions, this.#readerValues.get(rootId)?.get(readerId)?.selections ?? /* @__PURE__ */ new Map(), snapshotStates);
		const value = source.read(session);
		pending.set(readerId, session.next);
		return value;
	}
	/** Read-only committed selection history, never mutated during preparation. */
	_readerValuesFor(rootId, readerId) {
		return this.#readerValues.get(rootId)?.get(readerId)?.selections ?? /* @__PURE__ */ new Map();
	}
	_captureCanonicalReaderReceipt(rootId, readerId) {
		if (!canonicalClosedNumericStore.call(this) || !this.#knownRoots.has(rootId)) return null;
		const history = this.#readerValues.get(rootId)?.get(readerId);
		const stamp = history?.stamp;
		if (!history || !stamp || this.#rootEpochs.get(rootId) !== stamp.rootEpoch || (this.#rootVersions.get(rootId) ?? 0) < stamp.version) return null;
		return Object.freeze({
			history,
			version: stamp.version,
			rootEpoch: stamp.rootEpoch
		});
	}
	_inspectCanonicalReaderReceipt(rootId, readerId, receipt) {
		const history = this.#readerValues.get(rootId)?.get(readerId);
		if (!canonicalClosedNumericStore.call(this) || !this.#knownRoots.has(rootId) || history !== receipt.history || history?.stamp?.version !== receipt.version || history?.stamp?.rootEpoch !== receipt.rootEpoch || this.#rootEpochs.get(rootId) !== receipt.rootEpoch) return null;
		const version = this.#rootVersions.get(rootId) ?? 0;
		if (version < receipt.version) return null;
		return version === receipt.version ? "current" : "retained";
	}
	diagnostics() {
		return Object.freeze({
			roots: this.#knownRoots.size,
			listeners: [...this.#roots.values()].reduce((count, values) => count + values.size, 0),
			readers: [...this.#readerValues.values()].reduce((count, values) => count + [...values.values()].filter((history) => history.selections !== null).length, 0),
			retainedActions: this.#entries.length,
			transitions: this.#transitions.size
		});
	}
	_commitReaderValues(rootId, pending, stamp) {
		if (this._prepareReaderValues !== canonicalPrepareReaderValues) this._prepareReaderValues(rootId, pending);
		this._publishPreparedReaderValues(rootId, canonicalPrepareReaderValues.call(this, rootId, pending, stamp));
	}
	_prepareReaderValues(rootId, pending, stamp) {
		if (!this.#knownRoots.has(rootId)) throw new Error(`Store reader root is no longer live: ${rootId}`);
		const prepared = /* @__PURE__ */ new Map();
		const existing = this.#readerValues.get(rootId);
		for (const [readerId, values] of pending) if (values === null) prepared.set(readerId, null);
		else if (values === capturedReaderCut) {
			const accepted = existing?.get(readerId);
			prepared.set(readerId, accepted?.selections ? accepted : Object.freeze({
				selections: null,
				stamp: stamp ?? null
			}));
		} else prepared.set(readerId, Object.freeze({
			selections: new Map(values),
			stamp: stamp ?? null
		}));
		return {
			rootReaders: existing ?? /* @__PURE__ */ new Map(),
			isNewRoot: existing === void 0,
			entries: prepared
		};
	}
	_publishPreparedReaderValues(rootId, prepared) {
		if (prepared.isNewRoot) this.#readerValues.set(rootId, prepared.rootReaders);
		for (const [readerId, values] of prepared.entries) if (values === null) canonicalMapDelete.call(prepared.rootReaders, readerId);
		else canonicalMapSet.call(prepared.rootReaders, readerId, values);
	}
	_validateRender(rootId, version, rootEpoch) {
		return this.#knownRoots.has(rootId) && this.#rootEpochs.get(rootId) === rootEpoch && this.getRootVersion(rootId) === version;
	}
	_validateRenderLineage(rootId, version, rootEpoch) {
		return this.#knownRoots.has(rootId) && this.#rootEpochs.get(rootId) === rootEpoch && (this.#rootVersions.get(rootId) ?? 0) >= version;
	}
	#bumpRootVersion(rootId) {
		this.#mutationEpoch = ++storeMutationClock;
		this.#knownRoots.add(rootId);
		this.#rootVersions.set(rootId, this.getRootVersion(rootId) + 1);
	}
	#newProjectionProbeId() {
		let rootId = "\0async-store-projection-probe";
		while (this.#knownRoots.has(rootId) || this.#entries.some((entry) => entry.pendingRoots.has(rootId))) rootId += "\0";
		return rootId;
	}
	/** Drop read-site selector history when its owning component is removed. */
	forgetReader(rootId, readerId) {
		const readers = this.#readerValues.get(rootId);
		readers?.delete(readerId);
		if (readers?.size === 0) this.#readerValues.delete(rootId);
	}
	subscribe(rootId, listener) {
		this.#knownRoots.add(rootId);
		let listeners = this.#roots.get(rootId);
		if (!listeners) this.#roots.set(rootId, listeners = /* @__PURE__ */ new Set());
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) this.#roots.delete(rootId);
			this.#compact();
		};
	}
	#notifyAll(priority) {
		this.#enqueueNotifications([...this.#roots.keys()], priority);
	}
	#notify(rootId, priority) {
		this.#enqueueNotifications([rootId], priority);
	}
	/** Queue reentrant dispatch notifications until the current listener batch finishes. */
	#enqueueNotifications(rootIds, priority) {
		if (rootIds.length === 0) return;
		if (this.#notifying) {
			const deferred = this.#notificationQueue.at(-1) ?? /* @__PURE__ */ new Map();
			if (this.#notificationQueue.length === 0) this.#notificationQueue.push(deferred);
			for (const rootId of rootIds) deferred.set(rootId, priority);
			scheduleStoreNotifications(this);
			return;
		}
		const batch = /* @__PURE__ */ new Map();
		for (const rootId of rootIds) batch.set(rootId, priority);
		this.#notificationQueue.push(batch);
		scheduleStoreNotifications(this);
	}
	/** Internal notification drain used by the cross-store publication queue. */
	_drainNotifications() {
		if (this.#notifying) return;
		this.#notifying = true;
		const errors = [];
		try {
			while (this.#notificationQueue.length > 0) {
				const deliveries = [...this.#notificationQueue.shift()].map(([rootId, priority]) => ({
					listeners: [...this.#roots.get(rootId) ?? []],
					change: {
						rootId,
						storeVersion: this.#version,
						state: this.getStateForRoot(rootId),
						priority
					}
				}));
				for (const { listeners, change } of deliveries) for (const listener of listeners) try {
					listener(change);
				} catch (error) {
					errors.push(error);
				}
			}
		} finally {
			this.#notifying = false;
		}
		if (errors.length > 0) throw new AggregateError(errors, "Store notification listeners failed");
	}
	#compact() {
		let count = 0;
		while (count < this.#entries.length) {
			const entry = this.#entries[count];
			const transitionId = entry.priority.kind === "transition" ? entry.priority.transitionId : null;
			if (transitionId === null) {
				this.#baseState = entry.state;
				count++;
				continue;
			}
			const transition = this.#transitions.get(transitionId);
			if (!transition || transition.open) break;
			let committedEverywhere = true;
			for (const rootId of entry.pendingRoots) if (!entry.committedRoots.has(rootId)) {
				committedEverywhere = false;
				break;
			}
			if (!committedEverywhere) break;
			this.#baseState = entry.state;
			count++;
		}
		if (count > 0) this.#entries.splice(0, count);
		for (const [id, transition] of this.#transitions) {
			if (transition.open) continue;
			const retained = this.#entries.some((entry) => entry.priority.kind === "transition" && entry.priority.transitionId === id);
			const allRootsCompleted = [...transition.roots].every((rootId) => transition.completedRoots.has(rootId));
			if (!retained && allRootsCompleted) this.#transitions.delete(id);
		}
	}
};
var closedNumericPrototypeKeys = Reflect.ownKeys(AsyncStore.prototype);
var closedNumericPrototypeDescriptors = new Map(closedNumericPrototypeKeys.map((key) => [key, Object.getOwnPropertyDescriptor(AsyncStore.prototype, key)]));
var canonicalClosedNumericStore = AsyncStore.prototype._isClosedNumericCanonical;
var canonicalBeginClosedProjectionRender = AsyncStore.prototype._beginClosedProjectionRender;
var canonicalValidateRender = AsyncStore.prototype._validateRender;
var canonicalValidateRenderLineage = AsyncStore.prototype._validateRenderLineage;
var canonicalPrepareReaderValues = AsyncStore.prototype._prepareReaderValues;
var canonicalPublishReaderValues = AsyncStore.prototype._publishPreparedReaderValues;
var canonicalCaptureReaderReceipt = AsyncStore.prototype._captureCanonicalReaderReceipt;
var canonicalInspectReaderReceipt = AsyncStore.prototype._inspectCanonicalReaderReceipt;
var canonicalSnapshotRootStamp = StoreRenderSnapshot.prototype.capturedRootStamp;
function captureCanonicalStoreReaderReceipt(store, rootId, readerId) {
	try {
		return canonicalCaptureReaderReceipt.call(store, rootId, readerId);
	} catch (error) {
		if (error instanceof TypeError) return null;
		throw error;
	}
}
function inspectCanonicalStoreReaderReceipt(store, rootId, readerId, receipt) {
	try {
		return canonicalInspectReaderReceipt.call(store, rootId, readerId, receipt);
	} catch (error) {
		if (error instanceof TypeError) return null;
		throw error;
	}
}
function createAsyncStore(initialState, reducer) {
	return new AsyncStore(initialState, reducer);
}
var closedDirectProjectionPaths = Object.freeze([Object.freeze([])]);
/** Discover the full dependency set before evaluating any selector callback. */
function storesForSource(source) {
	const stores = /* @__PURE__ */ new Set();
	const visiting = /* @__PURE__ */ new Set();
	const complete = /* @__PURE__ */ new Set();
	const visit = (current) => {
		if (current instanceof AsyncStore) {
			stores.add(current);
			return;
		}
		const dependencies = current instanceof StoreSelection ? current.dependencies : current[storeDependencies];
		if (!Array.isArray(dependencies)) throw new Error("Native store reads require an AsyncStore, declared StoreSelection or storeDependencies graph");
		if (visiting.has(current)) throw new Error("Store selection dependency cycle");
		if (complete.has(current)) return;
		visiting.add(current);
		for (const dependency of dependencies) visit(dependency);
		visiting.delete(current);
		complete.add(current);
	};
	visit(source);
	return Object.freeze([...stores]);
}
/**
* Root-wide candidate transaction. Dependencies discovered later in traversal
* join the read set before their selectors run; every earlier projection is
* validated again before any host mutation. Preparation never publishes history.
*/
var StoreRenderTransaction = class {
	rootId;
	options;
	#snapshots = /* @__PURE__ */ new Map();
	#states = /* @__PURE__ */ new Map();
	#readers = /* @__PURE__ */ new Map();
	#pending = /* @__PURE__ */ new Map();
	#values = /* @__PURE__ */ new Map();
	#closed = false;
	#preparedPublication;
	#journal = [];
	#branchChanges = [];
	#checkpointState = /* @__PURE__ */ new WeakMap();
	#checkpointHead;
	#checkpointTail;
	#checkpointSequence = 0;
	#startedEpoch = storeMutationClock;
	#discoveredAfterMutation = false;
	constructor(rootId, options = {}) {
		this.rootId = rootId;
		this.options = options;
		if (!rootId) throw new Error("A store transaction requires a root ID");
		this.options = { transitions: Object.freeze([...options.transitions ?? []]) };
	}
	get stores() {
		return new Set(this.#snapshots.keys());
	}
	get readers() {
		return new Map(this.#readers);
	}
	/** Current branch's successfully completed reader observations. */
	get observations() {
		return new Map(this.#values);
	}
	/** Detect a newer action or revoked closed Store capture after publication. */
	closedInputsChanged() {
		if (!this.#closed) return true;
		for (const snapshot of this.#snapshots.values()) if (!snapshot.closedNumeric || !snapshot.validate()) return true;
		return false;
	}
	/** Create an O(1) savepoint for branch-local reader state. */
	checkpoint() {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot checkpoint a closed store transaction");
		const token = Object.freeze({});
		const state = {
			cursor: this.#journal.length,
			changeCursor: this.#branchChanges.length,
			sequence: ++this.#checkpointSequence,
			active: true,
			previous: this.#checkpointTail
		};
		if (this.#checkpointTail) this.#checkpointTail.next = state;
		else this.#checkpointHead = state;
		this.#checkpointTail = state;
		this.#checkpointState.set(token, state);
		return token;
	}
	/** Undo reader staging and observations after a live savepoint. */
	rollbackTo(checkpoint) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot roll back a closed store transaction");
		const state = checkpoint && typeof checkpoint === "object" ? this.#checkpointState.get(checkpoint) : void 0;
		if (!state?.active) throw new Error("Invalid store render checkpoint");
		for (let i = this.#journal.length - 1; i >= state.cursor; i--) this.#journal[i]();
		this.#journal.length = state.cursor;
		this.#branchChanges.length = state.changeCursor;
		while (this.#checkpointTail && this.#checkpointTail.sequence > state.sequence) this.#removeCheckpoint(this.#checkpointTail);
	}
	/** Release a consumed savepoint without affecting its ancestors. */
	releaseCheckpoint(checkpoint) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot release a checkpoint from a closed store transaction");
		const state = checkpoint && typeof checkpoint === "object" ? this.#checkpointState.get(checkpoint) : void 0;
		if (!state?.active) throw new Error("Invalid store render checkpoint");
		this.#removeCheckpoint(state);
		this.#checkpointState.delete(checkpoint);
		if (!this.#checkpointHead) {
			this.#journal.length = 0;
			this.#branchChanges.length = 0;
		}
	}
	/** Return only observations produced or replaced in this live branch. */
	observationsSince(checkpoint) {
		const state = this.#activeCheckpoint(checkpoint);
		const result = /* @__PURE__ */ new Map();
		for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
			const readerId = this.#branchChanges[i];
			const observation = this.#values.get(readerId);
			if (observation) result.set(readerId, observation);
		}
		return result;
	}
	/** Return only reader footprints produced or replaced in this live branch. */
	readersSince(checkpoint) {
		const state = this.#activeCheckpoint(checkpoint);
		const result = /* @__PURE__ */ new Map();
		for (let i = state.changeCursor; i < this.#branchChanges.length; i++) {
			const readerId = this.#branchChanges[i];
			const readers = this.#readers.get(readerId);
			if (readers) result.set(readerId, new Set(readers));
		}
		return result;
	}
	/** O(1) lookup for a single boundary reader. */
	getObservation(readerId) {
		return this.#values.get(readerId);
	}
	#activeCheckpoint(checkpoint) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot inspect a closed store transaction");
		const state = checkpoint && typeof checkpoint === "object" ? this.#checkpointState.get(checkpoint) : void 0;
		if (!state?.active) throw new Error("Invalid store render checkpoint");
		return state;
	}
	#recordBranchChange(readerId) {
		if (this.#checkpointHead) this.#branchChanges.push(readerId);
	}
	#removeCheckpoint(state) {
		state.active = false;
		if (state.previous) state.previous.next = state.next;
		else this.#checkpointHead = state.next;
		if (state.next) state.next.previous = state.previous;
		else this.#checkpointTail = state.previous;
		state.previous = void 0;
		state.next = void 0;
	}
	/**
	* Keep committed-boundary reader dependencies in this candidate without
	* staging selector history from a speculative branch. Stores are pinned
	* before validation so their root projection participates in the read cut.
	*/
	preserveReaders(readers) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot preserve readers in a closed store transaction");
		for (const [readerId, readerStores] of readers) {
			if (!readerId) throw new Error("A store reader requires a site ID");
			for (const store of readerStores) this.#pinStore(store);
			this.#setJournaled(this.#readers, readerId, new Set(readerStores));
			this.#deleteJournaled(this.#values, readerId);
			for (const [store, pending] of this.#pending) {
				this.#deleteJournaled(pending, readerId);
				if (pending.size === 0) this.#deleteJournaled(this.#pending, store);
			}
			this.#recordBranchChange(readerId);
		}
	}
	/** Carry the captured cut of a suspended draft without rerunning its readers. */
	preserveCapturedReaders(readers) {
		this.preserveReaders(readers);
		for (const [readerId, stores] of readers) for (const store of stores) {
			if (!canonicalClosedNumericStore.call(store)) continue;
			let pending = this.#pending.get(store);
			if (!pending) {
				pending = /* @__PURE__ */ new Map();
				this.#setJournaled(this.#pending, store, pending);
			}
			this.#setJournaled(pending, readerId, capturedReaderCut);
		}
	}
	/**
	* Remove superseded reader observations from this candidate. Store snapshots
	* stay pinned: even a reader that leaves the candidate participated in its
	* validation cut, and its stores may still be shared by other readers.
	*/
	dropReaders(readerIds) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot drop readers from a closed store transaction");
		for (const readerId of readerIds) {
			this.#deleteJournaled(this.#readers, readerId);
			this.#deleteJournaled(this.#values, readerId);
			for (const [store, pending] of this.#pending) {
				this.#deleteJournaled(pending, readerId);
				if (pending.size === 0) this.#deleteJournaled(this.#pending, store);
			}
			this.#recordBranchChange(readerId);
		}
	}
	/** Stage exact accepted reader retirement with this transaction's observations. */
	retireClosedReaders(readers) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot retire readers in a closed store transaction");
		for (const [readerId, stores] of readers) {
			if (!readerId) return false;
			for (const store of stores) {
				const snapshot = this.#snapshots.get(store);
				if (!snapshot?.closedNumeric || !canonicalClosedNumericStore.call(store) || !snapshot.validatePublicationInputs()) return false;
			}
		}
		for (const [readerId, stores] of readers) for (const store of stores) {
			let pending = this.#pending.get(store);
			if (!pending) {
				pending = /* @__PURE__ */ new Map();
				this.#setJournaled(this.#pending, store, pending);
			}
			if (!pending.has(readerId)) this.#setJournaled(pending, readerId, null);
		}
		return true;
	}
	#pinStore(store) {
		if (this.#snapshots.has(store)) return;
		if (store.mutationEpoch > this.#startedEpoch) this.#discoveredAfterMutation = true;
		const snapshot = store.beginRender(this.rootId, this.options);
		this.#snapshots.set(store, snapshot);
		this.#states.set(store, snapshot.state);
	}
	#setJournaled(map, key, value) {
		if (this.#checkpointHead) {
			const existed = map.has(key);
			const previous = map.get(key);
			this.#journal.push(() => {
				if (existed) map.set(key, previous);
				else map.delete(key);
			});
		}
		map.set(key, value);
	}
	#deleteJournaled(map, key) {
		if (!map.has(key)) return;
		if (this.#checkpointHead) {
			const previous = map.get(key);
			this.#journal.push(() => map.set(key, previous));
		}
		map.delete(key);
	}
	/** Stage selected numeric paths while recording the actual whole-state observation. */
	readClosedProjections(store, readerId, paths) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot read a closed or prepared store transaction");
		if (!readerId) throw new Error("A store reader requires a site ID");
		const cached = this.#values.get(readerId);
		if (cached && cached.source !== store) return null;
		let snapshot = this.#snapshots.get(store);
		let values;
		if (!snapshot) {
			const captured = canonicalBeginClosedProjectionRender.call(store, this.rootId, paths);
			if (!captured) return null;
			snapshot = captured.snapshot;
			values = captured.values;
		} else values = captureClosedProjectionValues(snapshot.state, paths);
		if (!snapshot.closedNumeric || !canonicalClosedNumericStore.call(store)) return null;
		if (!values) return null;
		if (!this.#snapshots.has(store)) {
			if (store.mutationEpoch > this.#startedEpoch) this.#discoveredAfterMutation = true;
			this.#snapshots.set(store, snapshot);
			this.#states.set(store, snapshot.state);
		}
		if (!cached) {
			this.#setJournaled(this.#readers, readerId, /* @__PURE__ */ new Set([store]));
			let pending = this.#pending.get(store);
			if (!pending) {
				pending = /* @__PURE__ */ new Map();
				this.#setJournaled(this.#pending, store, pending);
			}
			this.#setJournaled(pending, readerId, /* @__PURE__ */ new Map());
			this.#setJournaled(this.#values, readerId, {
				source: store,
				value: snapshot.state
			});
			this.#recordBranchChange(readerId);
		}
		return values;
	}
	/** Compatibility wrapper for one direct numeric Store state. */
	readClosedNumeric(store, readerId) {
		return this.readClosedProjections(store, readerId, closedDirectProjectionPaths)?.[0] ?? null;
	}
	read(source, readerId) {
		if (this.#closed || this.#preparedPublication) throw new Error("Cannot read a closed or prepared store transaction");
		if (!readerId) throw new Error("A store reader requires a site ID");
		const cached = this.#values.get(readerId);
		if (cached) {
			if (cached.source !== source) throw new Error("Store reader changed its source within one candidate");
			return cached.value;
		}
		const stores = storesForSource(source);
		const previous = /* @__PURE__ */ new Map();
		for (const store of stores) {
			this.#pinStore(store);
			for (const [selection, value] of store._readerValuesFor(this.rootId, readerId)) previous.set(selection, value);
		}
		const session = new StoreReadSession(this.rootId, readerId, this.options.transitions ?? [], previous, this.#states);
		const value = source.read(session);
		this.#setJournaled(this.#readers, readerId, new Set(stores));
		for (const store of stores) {
			let pending = this.#pending.get(store);
			if (!pending) {
				pending = /* @__PURE__ */ new Map();
				this.#setJournaled(this.#pending, store, pending);
			}
			this.#setJournaled(pending, readerId, session.next);
		}
		this.#setJournaled(this.#values, readerId, {
			source,
			value
		});
		this.#recordBranchChange(readerId);
		return value;
	}
	validate() {
		return !this.#closed && !this.#discoveredAfterMutation && [...this.#snapshots.values()].every((snapshot) => snapshot.validate());
	}
	validatePublicationInputs() {
		return !this.#closed && !this.#discoveredAfterMutation && [...this.#snapshots.values()].every((snapshot) => snapshot.validatePublicationInputs());
	}
	validatePublicationInputsCanonical() {
		return !this.#closed && !this.#discoveredAfterMutation && [...this.#snapshots.values()].every((snapshot) => snapshot.validatePublicationInputsCanonical());
	}
	/** Complete fallible reader validation and staging before accepted publication. */
	preparePublication() {
		if (this.#closed) throw new Error("Store render transaction is closed");
		if (this.#preparedPublication) return;
		if (!this.validate()) throw new Error(`Store render transaction for ${this.rootId} is stale`);
		this.#stagePublication(false);
	}
	/** Stage an older accepted read cut after newer actions reached the store log. */
	preparePublicationAfterHost() {
		if (this.#closed) throw new Error("Store render transaction is closed");
		if (this.#preparedPublication) return;
		if (!this.validatePublicationInputs()) throw new Error(`Store publication inputs for ${this.rootId} are stale`);
		this.#stagePublication(true);
	}
	#stagePublication(afterHost) {
		const prepared = /* @__PURE__ */ new Map();
		for (const [store, pending] of this.#pending) {
			const snapshot = this.#snapshots.get(store);
			if (!snapshot.closedNumeric) {
				const prepare = store._prepareReaderValues;
				if (prepare !== canonicalPrepareReaderValues) prepare.call(store, this.rootId, pending);
			}
			prepared.set(store, canonicalPrepareReaderValues.call(store, this.rootId, pending, canonicalSnapshotRootStamp.call(snapshot)));
		}
		const valid = afterHost ? this.validatePublicationInputs() : this.validate();
		const closedValid = [...this.#snapshots.values()].every((snapshot) => !snapshot.closedNumeric || snapshot.validatePublicationInputs());
		if (!valid || !closedValid) throw new Error(`Store publication inputs for ${this.rootId} changed during preparation`);
		this.#preparedPublication = prepared;
	}
	/** Install prepared per-reader histories after every group member is ready. */
	publishAccepted() {
		const prepared = this.#preparedPublication;
		if (!prepared || this.#closed) throw new Error("Store publication was not prepared");
		for (const [store, readers] of prepared) canonicalPublishReaderValues.call(store, this.rootId, readers);
		this.#closed = true;
		this.#preparedPublication = void 0;
		this.#releaseSavepoints();
	}
	notifyPublished() {}
	/** Compatibility path for a single validated renderer commit. */
	commitAfterValidatedRender() {
		if (this.#closed) return;
		this.preparePublication();
		this.publishAccepted();
		this.notifyPublished();
	}
	discard() {
		this.#closed = true;
		this.#preparedPublication = void 0;
		this.#pending.clear();
		this.#values.clear();
		this.#releaseSavepoints();
	}
	#releaseSavepoints() {
		this.#journal.length = 0;
		this.#branchChanges.length = 0;
		let state = this.#checkpointHead;
		while (state) {
			const next = state.next;
			state.active = false;
			state.previous = void 0;
			state.next = void 0;
			state = next;
		}
		this.#checkpointHead = void 0;
		this.#checkpointTail = void 0;
		this.#checkpointState = /* @__PURE__ */ new WeakMap();
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/async_resource_runtime.js
/**
* A small host-independent wrapper around promise-like values.
*
* Resources observe an already-created thenable; they do not start fetches,
* cancel providers, or retain work after the resource itself is unreachable.
*/
var pendingTokenBrand = Symbol("native.resource.pending");
var rejectionBrand = Symbol("native.resource.rejection");
var ResourceRejection = class extends Error {
	resource;
	reason;
	[rejectionBrand] = true;
	kind = "resource-rejection";
	constructor(resource, reason) {
		super("An async resource was rejected");
		this.resource = resource;
		this.reason = reason;
		this.name = "ResourceRejection";
	}
};
function reportResourceListenerError(error) {
	console.error("AsyncResource subscriber failed", error);
}
/**
* A stable record for one PromiseLike. `read()` returns its value, or throws a
* recognizable pending token/rejection. Settlement is one-shot even for
* synchronous or hostile thenables.
*/
var AsyncResource = class {
	reportListenerError;
	#status = Object.freeze({
		status: "pending",
		version: 0
	});
	#pendingToken;
	#listeners = /* @__PURE__ */ new Set();
	constructor(thenable, reportListenerError = reportResourceListenerError, beforeObserve) {
		this.reportListenerError = reportListenerError;
		this.#pendingToken = Object.freeze({
			[pendingTokenBrand]: true,
			kind: "pending-resource",
			resource: this,
			version: 0
		});
		beforeObserve?.(this);
		this.#observe(thenable);
	}
	get status() {
		return this.#status;
	}
	get version() {
		return this.#status.version;
	}
	read() {
		const status = this.#status;
		if (status.status === "fulfilled") return status.value;
		if (status.status === "rejected") throw status.rejection;
		throw this.#pendingToken;
	}
	/** Subscribe to the single pending-to-settled transition. */
	subscribe(listener) {
		if (this.#status.status !== "pending") return () => {};
		this.#listeners.add(listener);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			this.#listeners.delete(listener);
		};
	}
	#observe(thenable) {
		this.#adopt(thenable, /* @__PURE__ */ new Set(), true);
	}
	#adopt(value, seen, requireThenable = false) {
		for (;;) {
			if ((typeof value !== "object" || value === null) && typeof value !== "function") {
				if (requireThenable) this.#reject(/* @__PURE__ */ new TypeError("AsyncResource requires a thenable"));
				else this.#fulfill(value);
				return;
			}
			const objectValue = value;
			if (seen.has(objectValue)) {
				this.#reject(/* @__PURE__ */ new TypeError("Thenable resolution cycle"));
				return;
			}
			let then;
			try {
				then = value.then;
			} catch (error) {
				this.#reject(error);
				return;
			}
			if (typeof then !== "function") {
				if (requireThenable) this.#reject(/* @__PURE__ */ new TypeError("AsyncResource requires a thenable"));
				else this.#fulfill(value);
				return;
			}
			seen.add(objectValue);
			let called = false;
			let invoking = true;
			let nextValue;
			let resolvedSynchronously = false;
			let rejectedSynchronously = false;
			let rejectionReason;
			const resolve = (next) => {
				if (called) return;
				called = true;
				if (invoking) {
					nextValue = next;
					resolvedSynchronously = true;
				} else this.#adopt(next, seen);
			};
			const reject = (reason) => {
				if (called) return;
				called = true;
				if (invoking) {
					rejectionReason = reason;
					rejectedSynchronously = true;
				} else this.#reject(reason);
			};
			try {
				then.call(objectValue, resolve, reject);
			} catch (error) {
				if (!called) {
					called = true;
					rejectionReason = error;
					rejectedSynchronously = true;
				}
			}
			invoking = false;
			if (rejectedSynchronously) {
				this.#reject(rejectionReason);
				return;
			}
			if (!resolvedSynchronously) return;
			value = nextValue;
			requireThenable = false;
		}
	}
	#fulfill(value) {
		if (this.#status.status !== "pending") return;
		this.#status = Object.freeze({
			status: "fulfilled",
			version: 1,
			value
		});
		this.#notify();
	}
	#reject(reason) {
		if (this.#status.status !== "pending") return;
		const rejection = new ResourceRejection(this, reason);
		this.#status = Object.freeze({
			status: "rejected",
			version: 1,
			reason,
			rejection
		});
		this.#notify();
	}
	#notify() {
		const status = this.#status;
		const listeners = [...this.#listeners];
		this.#listeners.clear();
		for (const listener of listeners) try {
			listener(this, status);
		} catch (error) {
			try {
				this.reportListenerError(error);
			} catch {}
		}
	}
};
/** True for the structured token thrown by a pending resource's read(). */
function isPendingResourceToken(value) {
	return typeof value === "object" && value !== null && value[pendingTokenBrand] === true;
}
/**
* A caller-owned identity table. The WeakMap deduplicates object/function
* thenables without keeping keys alive; each table has independent identity.
*/
var AsyncResourceTable = class {
	reportListenerError;
	#resources = /* @__PURE__ */ new WeakMap();
	constructor(reportListenerError = reportResourceListenerError) {
		this.reportListenerError = reportListenerError;
	}
	from(thenable) {
		if ((typeof thenable !== "object" || thenable === null) && typeof thenable !== "function") throw new TypeError("AsyncResourceTable requires an object thenable");
		const key = thenable;
		let resource = this.#resources.get(key);
		if (!resource) resource = new AsyncResource(thenable, this.reportListenerError, (created) => this.#resources.set(key, created));
		return resource;
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/resource_read_set.js
var resourcePrototype = AsyncResource.prototype;
var canonicalRead = resourcePrototype.read;
var canonicalStatus = Object.getOwnPropertyDescriptor(resourcePrototype, "status").get;
var canonicalVersion = Object.getOwnPropertyDescriptor(resourcePrototype, "version").get;
/** @internal Read the provider's private version without an authored getter. */
var canonicalResourceVersion = (resource) => {
	if (typeof resource !== "object" || resource === null) return null;
	try {
		return canonicalVersion.call(resource);
	} catch {
		return null;
	}
};
/** Inspect only the canonical resource implementation, without authored getters. */
var closedResourceStatus = (resource) => {
	if (typeof resource !== "object" || resource === null) return null;
	try {
		const status = canonicalStatus.call(resource);
		if (Object.getPrototypeOf(resource) !== resourcePrototype || Object.hasOwn(resource, "read") || Object.hasOwn(resource, "status") || Object.hasOwn(resource, "version") || Object.getOwnPropertyDescriptor(resourcePrototype, "read")?.value !== canonicalRead || Object.getOwnPropertyDescriptor(resourcePrototype, "status")?.get !== canonicalStatus || Object.getOwnPropertyDescriptor(resourcePrototype, "version")?.get !== canonicalVersion) return null;
		return status;
	} catch {
		return null;
	}
};
/** Candidate-local async reads; no subscriptions or provider cancellation. */
var ResourceReadSet = class {
	table;
	#versions = /* @__PURE__ */ new Map();
	#closed = false;
	constructor(table) {
		this.table = table;
	}
	read(source) {
		if (this.#closed) throw new Error("Resource read set is closed");
		const resource = source instanceof AsyncResource ? source : this.table.from(source);
		if (!this.#versions.has(resource)) {
			const observedVersion = resource.version;
			let capturedCanonical = null;
			try {
				capturedCanonical = canonicalVersion.call(resource);
			} catch {}
			this.#versions.set(resource, {
				observedVersion,
				canonicalVersion: capturedCanonical,
				closed: false
			});
		}
		return resource.read();
	}
	/** Capture a fulfilled canonical resource without calling its public methods. */
	readClosed(resource) {
		if (this.#closed) throw new Error("Resource read set is closed");
		const status = closedResourceStatus(resource);
		if (status?.status !== "fulfilled") return null;
		const previous = this.#versions.get(resource);
		if (previous !== void 0 && previous.observedVersion !== status.version) return null;
		if (previous === void 0) this.#versions.set(resource, {
			observedVersion: status.version,
			canonicalVersion: status.version,
			closed: true
		});
		return status;
	}
	get pending() {
		return [...this.#versions].filter(([resource, captured]) => !captured.closed && resource.status.status === "pending").map(([resource]) => resource);
	}
	validate() {
		return !this.#closed && [...this.#versions].every(([resource, captured]) => !captured.closed ? resource.version === captured.observedVersion : closedResourceStatus(resource)?.version === captured.observedVersion);
	}
	validateCanonical() {
		if (this.#closed) return false;
		for (const [resource, captured] of this.#versions) {
			if (captured.canonicalVersion === null) continue;
			try {
				if (canonicalVersion.call(resource) !== captured.canonicalVersion) return false;
			} catch {
				return false;
			}
		}
		return true;
	}
	discard() {
		this.#closed = true;
		this.#versions.clear();
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/pending_state_changes.js
/**
* Ordered, owner/site-coalesced dirty state journal.
*
* Keys live in the owner/site cache and are linked only while pending. That
* keeps the per-frame hot path to field updates and pointer changes, while
* allowing an acknowledged key to re-enter at the end of the queue.
*/
var PendingStateChanges = class {
	#keysByOwner = /* @__PURE__ */ new Map();
	#keysByIdentity = /* @__PURE__ */ new WeakMap();
	#head;
	#tail;
	#size = 0;
	get size() {
		return this.#size;
	}
	/** Keep the public journal's historical latest-arrival/reference semantics. */
	set(change) {
		let key = change.cellIdentity ? this.#keysByIdentity.get(change.cellIdentity) : void 0;
		if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
			key = this.#keyForOwnerSite(change.owner, change.site, true);
			if (change.cellIdentity) this.#keysByIdentity.set(change.cellIdentity, key);
		}
		if (change.cellIdentity) key.cellIdentity = change.cellIdentity;
		key.legacy = change;
		key.cellVersion = void 0;
		key.cellHandle = void 0;
		this.#enqueue(key);
	}
	/** Store native dirty-cell notifications without allocating StateChange records. */
	setCell(handle, version) {
		let key = this.#keysByIdentity.get(handle.cellIdentity);
		if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) {
			key = this.#keyForOwnerSite(handle.owner, handle.site, true);
			this.#keysByIdentity.set(handle.cellIdentity, key);
		}
		if (key.cellIdentity !== handle.cellIdentity) key.cellVersion = void 0;
		key.cellIdentity = handle.cellIdentity;
		key.cellHandle = handle;
		key.legacy = void 0;
		if (key.cellVersion === void 0 || version > key.cellVersion) key.cellVersion = version;
		this.#enqueue(key);
	}
	/** Capture an independent array; native records are fresh snapshots. */
	capture() {
		const captured = [];
		for (let key = this.#head; key; key = key.next) if (key.legacy) captured.push(key.legacy);
		else if (key.cellVersion !== void 0 && key.cellIdentity) captured.push({
			owner: key.owner,
			site: key.site,
			version: key.cellVersion,
			cellIdentity: key.cellIdentity
		});
		return captured;
	}
	/**
	* Capture a snapshot-free native cut into caller-owned, pre-sized reusable
	* buffers. Capacity must cover the current queue; legacy entries or
	* insufficient capacity return null and scrub the partially written prefix.
	*/
	captureNative(handles, versions) {
		let count = 0;
		for (let key = this.#head; key; key = key.next) {
			if (key.legacy || !key.cellHandle || key.cellVersion === void 0) {
				this.#scrubNativePrefix(handles, versions, count);
				return null;
			}
			if (count >= handles.length || count >= versions.length) {
				this.#scrubNativePrefix(handles, versions, count);
				return null;
			}
			handles[count] = key.cellHandle;
			versions[count] = key.cellVersion;
			count++;
		}
		return count;
	}
	values() {
		return this.capture().values();
	}
	clear() {
		for (let key = this.#head; key;) {
			const next = key.next;
			this.#removePending(key);
			key.cellIdentity = void 0;
			key = next;
		}
		this.#keysByOwner.clear();
		this.#keysByIdentity = /* @__PURE__ */ new WeakMap();
	}
	/** Remove captured entries that have not advanced past their captured version. */
	clearThrough(captured) {
		for (const change of captured) {
			let key = change.cellIdentity ? this.#keysByIdentity.get(change.cellIdentity) : void 0;
			if (!key?.alive || key.owner !== change.owner || key.site !== change.site) {
				key = this.#keyForOwnerSite(change.owner, change.site, false);
				if (key && change.cellIdentity) this.#keysByIdentity.set(change.cellIdentity, key);
			}
			if (!key?.queued) continue;
			const version = key.cellVersion ?? key.legacy?.version;
			if (version !== void 0 && version <= change.version) this.#removePending(key);
		}
	}
	/** Acknowledge only the exact native handles and versions in a captured cut. */
	clearNativeThrough(handles, versions, count) {
		if (!Number.isSafeInteger(count) || count < 0 || count > handles.length || count > versions.length) throw new RangeError("Invalid native state change count");
		for (let index = 0; index < count; index++) {
			const handle = handles[index];
			if (!handle || !Number.isSafeInteger(versions[index])) continue;
			let key = this.#keysByIdentity.get(handle.cellIdentity);
			if (!key?.alive || key.owner !== handle.owner || key.site !== handle.site) key = this.#keyForOwnerSite(handle.owner, handle.site, false);
			if (!key?.alive || !key.queued || key.owner !== handle.owner || key.site !== handle.site || key.cellIdentity !== handle.cellIdentity || key.cellHandle?.cellIdentity !== handle.cellIdentity) continue;
			if (key.cellVersion !== void 0 && key.cellVersion <= versions[index]) this.#removePending(key);
		}
	}
	/** Remove an owner's pending entries and cached identities. */
	dropOwner(owner) {
		const keysBySite = this.#keysByOwner.get(owner);
		if (!keysBySite) return;
		for (const key of keysBySite.values()) {
			key.alive = false;
			this.#removePending(key);
			key.cellIdentity = void 0;
		}
		this.#keysByOwner.delete(owner);
	}
	#enqueue(key) {
		if (key.queued) return;
		key.queued = true;
		key.prev = this.#tail;
		key.next = void 0;
		if (this.#tail) this.#tail.next = key;
		else this.#head = key;
		this.#tail = key;
		this.#size++;
	}
	#unlink(key) {
		if (!key.queued) return;
		if (key.prev) key.prev.next = key.next;
		else this.#head = key.next;
		if (key.next) key.next.prev = key.prev;
		else this.#tail = key.prev;
		key.prev = void 0;
		key.next = void 0;
		key.queued = false;
		this.#size--;
	}
	#removePending(key) {
		this.#unlink(key);
		key.legacy = void 0;
		key.cellVersion = void 0;
		key.cellHandle = void 0;
	}
	#scrubNativePrefix(handles, versions, count) {
		for (let index = 0; index < count; index++) {
			handles[index] = void 0;
			versions[index] = 0;
		}
	}
	#keyForOwnerSite(owner, site, create) {
		let keysBySite = this.#keysByOwner.get(owner);
		if (!keysBySite) {
			if (!create) return void 0;
			keysBySite = /* @__PURE__ */ new Map();
			this.#keysByOwner.set(owner, keysBySite);
		}
		let key = keysBySite.get(site);
		if (!key && create) {
			key = {
				alive: true,
				owner,
				site,
				queued: false
			};
			keysBySite.set(site, key);
		}
		return key;
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/compiled_state_layout.js
var layoutRecords = /* @__PURE__ */ new WeakMap();
var makeLayoutSignature = (programId, moduleRevision, slots) => JSON.stringify([
	programId ?? null,
	moduleRevision ?? null,
	slots.map(({ siteId, slot }) => [siteId, slot])
]);
function recordForLayout(input) {
	if (typeof input !== "object" || input === null) throw new TypeError("Compiled state layout must be an object");
	const cached = layoutRecords.get(input);
	if (cached) return cached;
	if (input.schemaVersion !== 1 || !Array.isArray(input.slots)) throw new TypeError("Unsupported compiled state layout");
	if (input.programId !== void 0 && (typeof input.programId !== "string" || input.programId.length === 0)) throw new TypeError("Invalid compiled state layout program ID");
	if (input.moduleRevision !== void 0 && (typeof input.moduleRevision !== "string" || !input.moduleRevision)) throw new TypeError("Invalid compiled state layout module revision");
	const sites = /* @__PURE__ */ new Set();
	const slots = input.slots.map((entry, index) => {
		if (!entry || typeof entry.siteId !== "string" || entry.siteId.length === 0 || !Number.isSafeInteger(entry.slot) || entry.slot !== index || sites.has(entry.siteId)) throw new TypeError("Invalid compiled state layout slot");
		sites.add(entry.siteId);
		return Object.freeze({
			siteId: entry.siteId,
			slot: entry.slot
		});
	});
	const normalized = Object.freeze({
		schemaVersion: 1,
		...input.programId !== void 0 ? { programId: input.programId } : {},
		...input.moduleRevision !== void 0 ? { moduleRevision: input.moduleRevision } : {},
		slots: Object.freeze(slots)
	});
	const record = {
		layout: normalized,
		signature: makeLayoutSignature(input.programId, input.moduleRevision, slots)
	};
	layoutRecords.set(input, record);
	layoutRecords.set(normalized, record);
	return record;
}
/** Validate and defensively snapshot metadata once per compiler-owned object. */
function normalizeCompiledStateLayout(input) {
	return recordForLayout(input).layout;
}
function compiledStateLayoutSignature(layout) {
	return recordForLayout(layout).signature;
}
/** Resolve a hook slot once per immutable layout descriptor. */
function compiledStateLayoutSlot(layout, siteId) {
	const record = recordForLayout(layout);
	let bySite = record.slotsBySite;
	if (!bySite) {
		bySite = /* @__PURE__ */ new Map();
		for (const slot of record.layout.slots) bySite.set(slot.siteId, slot.slot);
		record.slotsBySite = bySite;
	}
	return bySite.get(siteId);
}
/** Validate and associate one immutable owner update program with a layout. */
function associateCompiledOwnerUpdateProgram(layout, input) {
	const record = recordForLayout(layout);
	if (typeof input !== "object" || input === null) throw new TypeError("Compiled owner update program must be an object");
	const schemaVersion = input.schemaVersion;
	const programId = input.programId;
	const slotCount = input.slotCount;
	const inputSinkIds = input.sinkIds;
	const executeCut = input.executeCut;
	if (schemaVersion !== 2 || typeof programId !== "string" || !programId || record.layout.programId !== programId || !Number.isSafeInteger(slotCount) || slotCount !== record.layout.slots.length || slotCount < 1 || slotCount > 30 || !Array.isArray(inputSinkIds) || inputSinkIds.length < 1 || inputSinkIds.length > 30 || typeof executeCut !== "function") throw new TypeError("Invalid compiled owner update program");
	const seen = /* @__PURE__ */ new Set();
	const sinkIds = [];
	for (let index = 0; index < inputSinkIds.length; index++) {
		const sinkId = inputSinkIds[index];
		if (typeof sinkId !== "string" || !sinkId || seen.has(sinkId)) throw new TypeError("Invalid compiled owner update sink ID");
		seen.add(sinkId);
		sinkIds.push(sinkId);
	}
	const current = record.ownerUpdateProgram;
	if (current) {
		if (current.schemaVersion !== schemaVersion || current.programId !== programId || current.slotCount !== slotCount || current.executeCut !== executeCut || current.sinkIds.length !== sinkIds.length || current.sinkIds.some((sinkId, index) => sinkId !== sinkIds[index])) throw new TypeError("Conflicting compiled owner update program");
		return current;
	}
	const snapshot = Object.freeze({
		schemaVersion: 2,
		programId,
		slotCount,
		sinkIds: Object.freeze(sinkIds),
		executeCut
	});
	record.ownerUpdateProgram = snapshot;
	return snapshot;
}
/** Resolve a program during VDOM row preparation, not during cut execution. */
function compiledOwnerUpdateProgramFor(layout) {
	return recordForLayout(layout).ownerUpdateProgram;
}
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/world_dirty_journal.js
var preparedMembershipAuthority = {};
/** Runtime-opaque token; private data retains one bucket/node, never the journal. */
var PreparedDirtyMembershipToken = class {
	#journalIdentity;
	#entry;
	constructor(authority, journalIdentity, entry) {
		if (authority !== preparedMembershipAuthority) throw new TypeError("Prepared dirty membership is not constructible");
		this.#journalIdentity = journalIdentity;
		this.#entry = entry;
		Object.freeze(this);
	}
	static resolve(value, journalIdentity) {
		if (typeof value !== "object" && typeof value !== "function" || value === null || !(#entry in value)) return null;
		const token = value;
		const entry = token.#entry;
		return token.#journalIdentity === journalIdentity && entry && !entry.bucket.retired ? entry : null;
	}
	static retire(value, journalIdentity) {
		if (typeof value !== "object" && typeof value !== "function" || value === null || !(#entry in value)) return;
		const token = value;
		if (token.#journalIdentity !== journalIdentity) return;
		token.#journalIdentity = void 0;
		token.#entry = void 0;
	}
};
/**
* Owner-major ordered dirty membership for OwnerStateWorld.
*
* Buckets and site nodes are reused after acknowledgement or clear, then
* released by removeOwner. This class stores no cell values, handles, sources,
* closures, or payloads.
*/
var WorldDirtyJournal = class {
	#identity = {};
	#owners = /* @__PURE__ */ new Map();
	#firstOwner;
	#lastOwner;
	#activeOwnerCount = 0;
	/** Number of owners with at least one active dirty site. */
	get size() {
		return this.#activeOwnerCount;
	}
	/** Test active membership without traversing the pending journal. */
	has(owner, site) {
		return this.#owners.get(owner)?.sites.get(site)?.active === true;
	}
	/** Mark an owner/site dirty, coalescing repeated writes without reordering. */
	mark(owner, site) {
		const entry = this.#entryFor(owner, site);
		this.#markEntry(entry.bucket, entry);
	}
	/** Prepare one reusable node; subsequent marks/deletes avoid owner/site Maps. */
	prepareMembership(owner, site) {
		const entry = this.#entryFor(owner, site);
		if (!entry.prepared) entry.prepared = new PreparedDirtyMembershipToken(preparedMembershipAuthority, this.#identity, entry);
		return entry.prepared;
	}
	/** Mark a previously prepared node in O(1); foreign or retired nodes decline. */
	markPrepared(token) {
		const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
		if (!data) return false;
		this.#markEntry(data.bucket, data);
		return true;
	}
	/** Delete a previously prepared node in O(1); foreign or retired nodes decline. */
	deletePrepared(token) {
		const data = PreparedDirtyMembershipToken.resolve(token, this.#identity);
		if (!data) return false;
		this.#deleteEntry(data.bucket, data);
		return true;
	}
	#entryFor(owner, site) {
		let bucket = this.#owners.get(owner);
		if (!bucket) {
			bucket = {
				owner,
				sites: /* @__PURE__ */ new Map(),
				retired: false,
				active: false
			};
			this.#owners.set(owner, bucket);
		}
		let entry = bucket.sites.get(site);
		if (!entry) {
			entry = {
				site,
				bucket,
				active: false
			};
			bucket.sites.set(site, entry);
		}
		return entry;
	}
	#markEntry(bucket, entry) {
		if (entry.active) return;
		entry.active = true;
		entry.previous = bucket.lastSite;
		entry.next = void 0;
		if (bucket.lastSite) bucket.lastSite.next = entry;
		else bucket.firstSite = entry;
		bucket.lastSite = entry;
		if (!bucket.active) this.#activateOwner(bucket);
	}
	/** Remove one dirty site; a later mark re-enters at the tail. */
	delete(owner, site) {
		const bucket = this.#owners.get(owner);
		const entry = bucket?.sites.get(site);
		if (!bucket || !entry?.active) return;
		this.#deleteEntry(bucket, entry);
	}
	#deleteEntry(bucket, entry) {
		if (!entry.active) return;
		this.#unlinkSite(bucket, entry);
		if (!bucket.firstSite) this.#deactivateOwner(bucket);
	}
	/** Remove all dirty and reusable journal metadata for a destroyed owner. */
	removeOwner(owner) {
		const bucket = this.#owners.get(owner);
		if (!bucket) return;
		if (bucket.active) this.#deactivateOwner(bucket);
		bucket.retired = true;
		for (const entry of bucket.sites.values()) {
			entry.active = false;
			entry.previous = void 0;
			entry.next = void 0;
			PreparedDirtyMembershipToken.retire(entry.prepared, this.#identity);
			entry.prepared = void 0;
		}
		bucket.firstSite = void 0;
		bucket.lastSite = void 0;
		bucket.sites.clear();
		this.#owners.delete(owner);
	}
	/** Clear active work while retaining buckets and site nodes for reuse. */
	clear() {
		for (let bucket = this.#firstOwner; bucket;) {
			const nextBucket = bucket.next;
			for (let entry = bucket.firstSite; entry;) {
				const nextEntry = entry.next;
				entry.active = false;
				entry.previous = void 0;
				entry.next = void 0;
				entry = nextEntry;
			}
			bucket.active = false;
			bucket.firstSite = void 0;
			bucket.lastSite = void 0;
			bucket.previous = void 0;
			bucket.next = void 0;
			bucket = nextBucket;
		}
		this.#firstOwner = void 0;
		this.#lastOwner = void 0;
		this.#activeOwnerCount = 0;
	}
	/** Enumerate active pairs in owner insertion order, then site insertion order. */
	*entries() {
		for (let bucket = this.#firstOwner; bucket; bucket = bucket.next) for (let entry = bucket.firstSite; entry; entry = entry.next) yield [bucket.owner, entry.site];
	}
	#activateOwner(bucket) {
		bucket.active = true;
		bucket.previous = this.#lastOwner;
		bucket.next = void 0;
		if (this.#lastOwner) this.#lastOwner.next = bucket;
		else this.#firstOwner = bucket;
		this.#lastOwner = bucket;
		this.#activeOwnerCount++;
	}
	#deactivateOwner(bucket) {
		if (bucket.previous) bucket.previous.next = bucket.next;
		else this.#firstOwner = bucket.next;
		if (bucket.next) bucket.next.previous = bucket.previous;
		else this.#lastOwner = bucket.previous;
		bucket.previous = void 0;
		bucket.next = void 0;
		bucket.active = false;
		this.#activeOwnerCount--;
	}
	#unlinkSite(bucket, entry) {
		if (entry.previous) entry.previous.next = entry.next;
		else bucket.firstSite = entry.next;
		if (entry.next) entry.next.previous = entry.previous;
		else bucket.lastSite = entry.previous;
		entry.previous = void 0;
		entry.next = void 0;
		entry.active = false;
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/owner_state_world.js
var _a;
function getLaneBackedValue() {
	const lane = this.lane;
	return lane ? lane.column.values[lane.row] : this.boxedValue;
}
function setLaneBackedValue(next) {
	const lane = this.lane;
	if (!lane) {
		this.boxedValue = next;
		return;
	}
	if (typeof next !== "number") throw new TypeError("Promote a numeric state cell before boxing it");
	lane.column.values[lane.row] = next;
}
var laneBackedValueDescriptor = {
	configurable: true,
	enumerable: true,
	get: getLaneBackedValue,
	set: setLaneBackedValue
};
/** Shared-from-birth accessor shape for cells born with a certified numeric slot. */
var compiledNumericStateCellPrototype = Object.create(Object.prototype, { value: laneBackedValueDescriptor });
function isCompiledNumericStateCell(cell) {
	return Object.getPrototypeOf(cell) === compiledNumericStateCellPrototype;
}
function makeCompiledNumericStateCell(args) {
	const cell = Object.create(compiledNumericStateCellPrototype);
	cell.boxedValue = args.value;
	cell.version = args.version;
	cell.stateLayout = args.layout;
	cell.numericLaneSlot = args.slot;
	cell.laneSlotResolved = args.laneSlotResolved;
	cell.source = args.source;
	cell.dispatch = args.dispatch;
	cell.lane = void 0;
	cell.cellIdentity = void 0;
	cell.cellHandle = void 0;
	cell.dirtyMembership = void 0;
	cell.rowLease = void 0;
	cell.rowView = void 0;
	cell.promoted = args.promoted;
	return cell;
}
/** Revocable, opaque authority for one committed cell. */
var CommittedCellCapability = class {
	#worldSecret;
	#owner;
	#site;
	#cell;
	constructor(worldSecret, owner, site, cell) {
		this.#worldSecret = worldSecret;
		this.#owner = owner;
		this.#site = site;
		this.#cell = cell;
		Object.setPrototypeOf(this, null);
		Object.freeze(this);
	}
	static resolve(candidate, worldSecret, owner, site) {
		if (typeof candidate !== "object" && typeof candidate !== "function" || candidate === null || !(#cell in candidate)) return null;
		const capability = candidate;
		return capability.#worldSecret === worldSecret && capability.#owner === owner && capability.#site === site ? capability.#cell : null;
	}
	static resolveLegacyChange(candidate, worldSecret, change) {
		if (typeof candidate !== "object" && typeof candidate !== "function" || candidate === null || !(#cell in candidate)) return null;
		const capability = candidate;
		if (capability.#worldSecret !== worldSecret) return null;
		const cell = capability.#cell;
		return capability.#owner === change.owner && capability.#site === change.site ? cell : null;
	}
	static revoke(candidate, worldSecret) {
		if (!(#cell in candidate)) return;
		const capability = candidate;
		if (capability.#worldSecret !== worldSecret) return;
		capability.#cell = null;
		capability.#worldSecret = null;
	}
};
/** A row-scoped lease, deliberately free of cell and World references. */
var NumericRowLease = class {
	#active = true;
	#owner;
	#layout;
	#row;
	#generation;
	#columns;
	#sources;
	#lanes;
	constructor(owner, layout, row, generation, columns) {
		this.#owner = owner;
		this.#layout = layout;
		this.#row = row;
		this.#generation = generation;
		this.#columns = [...columns];
		this.#sources = Array(columns.length);
		this.#lanes = Array(columns.length);
		Object.setPrototypeOf(this, null);
		Object.freeze(this);
	}
	static columns(candidate) {
		return candidate.#columns;
	}
	static sources(candidate) {
		return candidate.#sources;
	}
	static isCurrent(candidate, owner, site, layout, lane, slot, source) {
		if (typeof candidate !== "object" && typeof candidate !== "function" || candidate === null || !(#active in candidate)) return false;
		return candidate.#active && candidate.#owner === owner && candidate.#row === lane.row && candidate.#generation === lane.generation && candidate.#layout === layout && layout.slots[slot]?.siteId === site && candidate.#columns[slot] === lane.column && candidate.#sources[slot] === source && candidate.#lanes[slot] === lane && lane.owner === owner && lane.site === site;
	}
	static setSlot(candidate, slot, lane, source) {
		if (!candidate.#active) return;
		candidate.#sources[slot] = source;
		candidate.#lanes[slot] = lane;
	}
	static setSource(candidate, slot, source) {
		if (candidate.#active) candidate.#sources[slot] = source;
	}
	static clearSlot(candidate, slot) {
		candidate.#sources[slot] = void 0;
		candidate.#lanes[slot] = void 0;
	}
	static retire(candidate) {
		if (!candidate.#active) return;
		candidate.#sources.fill(void 0);
		candidate.#lanes.fill(void 0);
		candidate.#active = false;
	}
};
function makeNumericCellRowView(owner, site, layout, lease, lane, slot, source, sources, columns) {
	return Object.freeze({
		owner,
		site,
		layout,
		rowIdentity: lease,
		row: lane.row,
		generation: lane.generation,
		slot,
		lane,
		source,
		sources,
		columns
	});
}
function refreshNumericCellRowView(cell, owner, site) {
	const lane = cell.lane;
	const source = cell.source;
	const lease = cell.rowLease;
	const layout = cell.stateLayout;
	const slot = cell.numericLaneSlot;
	cell.rowView = lane && source && lease && layout && slot !== void 0 ? makeNumericCellRowView(owner, site, layout, lease, lane, slot, source, NumericRowLease.sources(lease), NumericRowLease.columns(lease)) : void 0;
}
/** Install the column as the only logical-value storage for a committed cell. */
function attachNumericLane(cell, lane, lease, layout, slot) {
	const current = cell.value;
	if (typeof current !== "number") throw new TypeError("Only numeric state cells can use numeric lanes");
	lane.column.values[lane.row] = current;
	cell.lane = lane;
	cell.rowLease = lease;
	NumericRowLease.setSlot(lease, slot, lane, cell.source);
	refreshNumericCellRowView(cell, lane.owner, lane.site);
	if (isCompiledNumericStateCell(cell)) cell.boxedValue = void 0;
	else Object.defineProperty(cell, "value", laneBackedValueDescriptor);
}
/** Restore an ordinary writable value before the row is cleared or reused. */
function detachNumericLane(cell) {
	const lane = cell.lane;
	if (!lane) return null;
	const value = lane.column.values[lane.row];
	if (cell.rowLease && cell.numericLaneSlot !== void 0) NumericRowLease.clearSlot(cell.rowLease, cell.numericLaneSlot);
	cell.rowLease = void 0;
	cell.rowView = void 0;
	if (isCompiledNumericStateCell(cell)) {
		cell.boxedValue = value;
		cell.lane = void 0;
	} else {
		Object.defineProperty(cell, "value", {
			configurable: true,
			enumerable: true,
			writable: true,
			value
		});
		cell.lane = void 0;
	}
	return lane;
}
/**
* Experimental owner-addressed hook storage.
*
* State is indexed by (owner entity, compiler site ID), never by call position.
* `resolveOwner` interns a component instance by its parent, lexical component
* site, and optional keyed-item identity. The compiler is expected to emit
* stable site IDs; the string is explicit here so the runtime can be evaluated
* before JSX lowering produces them.
*/
var OwnerStateWorld = class {
	static #nextSourceId = 1;
	#nextOwner = 1;
	#owners = /* @__PURE__ */ new Map();
	#childrenBySlot = /* @__PURE__ */ new Map();
	#rootChildrenVersion = 0;
	#stateByOwner = /* @__PURE__ */ new Map();
	#numericLayouts = /* @__PURE__ */ new WeakMap();
	#identitySecret = Object.freeze({});
	#dirtyJournal = new WorldDirtyJournal();
	#changeListeners = /* @__PURE__ */ new Set();
	#dirtyCellListeners = [];
	#claimedRootIds = /* @__PURE__ */ new Map();
	#stagedOwners = /* @__PURE__ */ new Set();
	#layoutRecord(owner, layout) {
		if (!this.#owners.has(owner)) throw new Error(`Owner ${owner} is not alive`);
		const normalized = normalizeCompiledStateLayout(layout);
		const signature = compiledStateLayoutSignature(normalized);
		let storage = this.#numericLayouts.get(normalized);
		if (storage) {
			if (storage.signature !== signature) throw new Error("Compiled state layout descriptor changed");
			return storage;
		}
		const slotsBySite = /* @__PURE__ */ new Map();
		storage = {
			layout: normalized,
			signature,
			slotsBySite,
			columns: normalized.slots.map(({ siteId, slot }) => {
				slotsBySite.set(siteId, slot);
				return new NumericColumn(_a.#nextSourceId++, slot, /* @__PURE__ */ new Float64Array(0));
			}),
			generations: [],
			freeRows: [],
			nextRow: 0,
			rowsByOwner: /* @__PURE__ */ new Map()
		};
		this.#numericLayouts.set(normalized, storage);
		return storage;
	}
	#ensureCellLayout(owner, site, cell, layout) {
		if (!layout) return;
		const normalized = normalizeCompiledStateLayout(layout);
		if (cell.stateLayout && cell.laneSlotResolved) {
			if (compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) throw new Error("State cell received a different compiled layout");
			return;
		}
		let canonical = normalized;
		if (cell.stateLayout) {
			if (compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) throw new Error("State cell received a different compiled layout");
			canonical = cell.stateLayout;
		}
		this.#layoutRecord(owner, canonical);
		cell.stateLayout = canonical;
		cell.numericLaneSlot = compiledStateLayoutSlot(canonical, site);
		cell.laneSlotResolved = true;
		if (cell.numericLaneSlot !== void 0 && typeof cell.value !== "number") cell.promoted = true;
	}
	#laneIsCurrent(owner, site, cell, lane) {
		return this.#owners.has(owner) && this.#stateByOwner.get(owner)?.get(site) === cell && this.#laneAddressIsCurrent(owner, site, cell, lane);
	}
	#laneAddressIsCurrent(owner, site, cell, lane) {
		const layout = cell.stateLayout;
		const slot = cell.numericLaneSlot;
		const lease = cell.rowLease;
		const source = cell.source;
		return !!layout && slot !== void 0 && !!lease && !!source && NumericRowLease.isCurrent(lease, owner, site, layout, lane, slot, source) && cell.lane === lane && cell.rowView?.rowIdentity === lease && !cell.promoted && typeof cell.value === "number";
	}
	#ensureNumericLane(owner, site, cell) {
		const layout = cell.stateLayout;
		if (!layout || cell.promoted) return null;
		const slot = cell.numericLaneSlot;
		if (slot === void 0) return null;
		if (typeof cell.value !== "number") {
			cell.promoted = true;
			this.#releaseNumericLane(owner, site, cell);
			return null;
		}
		const existing = cell.lane;
		if (existing && this.#laneAddressIsCurrent(owner, site, cell, existing)) return existing;
		const storage = this.#layoutRecord(owner, layout);
		if (existing) this.#releaseNumericLane(owner, site, cell);
		let row = storage.rowsByOwner.get(owner);
		if (!row) {
			const recycled = storage.freeRows.pop();
			const rowIndex = recycled ?? storage.nextRow;
			const generation = storage.generations[rowIndex] ?? 1;
			try {
				for (const column of storage.columns) column.reserve(rowIndex + 1);
				row = {
					row: rowIndex,
					generation,
					cells: 0,
					lease: new NumericRowLease(owner, layout, rowIndex, generation, storage.columns)
				};
			} catch (error) {
				if (recycled !== void 0) storage.freeRows.push(recycled);
				throw error;
			}
			storage.generations[rowIndex] = generation;
			if (recycled === void 0) storage.nextRow++;
			storage.rowsByOwner.set(owner, row);
		}
		let counted = false;
		try {
			const column = storage.columns[slot];
			column.reserve(row.row + 1);
			const lane = Object.freeze({
				column,
				row: row.row,
				generation: row.generation,
				owner,
				site
			});
			row.cells++;
			counted = true;
			attachNumericLane(cell, lane, row.lease, layout, slot);
			return lane;
		} catch (error) {
			if (cell.lane) this.#releaseNumericLane(owner, site, cell);
			else if (counted) row.cells--;
			if (row.cells === 0 && storage.rowsByOwner.get(owner) === row) {
				NumericRowLease.retire(row.lease);
				storage.rowsByOwner.delete(owner);
				storage.generations[row.row] = row.generation + 1;
				storage.freeRows.push(row.row);
			}
			throw error;
		}
	}
	#attachOptionalNumericLane(owner, site, cell) {
		if (!cell.stateLayout || cell.promoted || typeof cell.value !== "number") return;
		try {
			this.#ensureNumericLane(owner, site, cell);
		} catch {
			this.#releaseNumericLane(owner, site, cell);
			cell.promoted = true;
		}
	}
	#releaseNumericLane(owner, site, cell) {
		const lane = cell.lane;
		if (!lane) return;
		if (!detachNumericLane(cell)) return;
		const storage = cell.stateLayout ? this.#numericLayouts.get(cell.stateLayout) : void 0;
		const row = storage?.rowsByOwner.get(owner);
		const slot = storage?.slotsBySite.get(site);
		if (!storage || !row || slot === void 0 || row.row !== lane.row) return;
		lane.column.values[lane.row] = 0;
		row.cells--;
		if (row.cells !== 0) return;
		NumericRowLease.retire(row.lease);
		for (const column of storage.columns) column.values[row.row] = 0;
		const nextGeneration = row.generation + 1;
		storage.generations[row.row] = nextGeneration;
		storage.freeRows.push(row.row);
		storage.rowsByOwner.delete(owner);
	}
	#readStateValue(owner, site, cell) {
		return cell.value;
	}
	/** Begin an isolated owner/state view for one candidate preparation attempt. */
	beginPreparation() {
		let state = "open";
		let publicationPrepared = false;
		let hostApplication = false;
		let preserveNewerCells = false;
		let publicationRecords = [];
		const publicationSiteMaps = /* @__PURE__ */ new Map();
		const publicationParentMaps = /* @__PURE__ */ new Map();
		const publicationSlotMaps = /* @__PURE__ */ new Map();
		const publicationLayoutSlots = /* @__PURE__ */ new Map();
		const publicationSources = /* @__PURE__ */ new Map();
		const publicationDispatches = /* @__PURE__ */ new Map();
		let hasStateWrites = false;
		const privateOwners = /* @__PURE__ */ new Map();
		const privateSlots = /* @__PURE__ */ new Map();
		const expectedSlots = /* @__PURE__ */ new Map();
		const expectedCells = /* @__PURE__ */ new Map();
		const candidateCells = /* @__PURE__ */ new Map();
		const candidateInitialValues = /* @__PURE__ */ new Map();
		const candidateDispatches = /* @__PURE__ */ new Map();
		const undoJournal = [];
		const preparationIdentity = {};
		let checkpointMetadata = /* @__PURE__ */ new WeakMap();
		let checkpointTop = null;
		let activeCheckpointCount = 0;
		const recordUndo = (undo) => undoJournal.push(undo);
		const setMap = (map, key, value) => {
			if (activeCheckpointCount !== 0) {
				const existed = map.has(key);
				const previous = map.get(key);
				recordUndo(() => {
					if (existed) map.set(key, previous);
					else map.delete(key);
				});
			}
			map.set(key, value);
		};
		const deleteMap = (map, key) => {
			if (!map.has(key)) return;
			if (activeCheckpointCount !== 0) {
				const previous = map.get(key);
				recordUndo(() => map.set(key, previous));
			}
			map.delete(key);
		};
		const pruneCheckpointTop = () => {
			while (checkpointTop && !checkpointTop.active) checkpointTop = checkpointTop.previous;
		};
		const checkpointFor = (checkpoint) => {
			const metadata = checkpointMetadata.get(checkpoint);
			if (!metadata || metadata.preparation !== preparationIdentity || !metadata.node.valid || !metadata.node.active) throw new Error("Owner preparation checkpoint is invalid");
			return metadata;
		};
		const assertOpen = (allowPrepared = false) => {
			if (state !== "open") throw new Error(`Owner preparation is ${state}`);
			if (publicationPrepared && !allowPrepared) throw new Error("Owner publication has already been prepared");
		};
		const getPrivateSlot = (parent, site, key) => privateSlots.get(parent)?.get(site)?.get(key);
		const putPrivateSlot = (parent, site, key, owner) => {
			let bySite = privateSlots.get(parent);
			if (!bySite) {
				bySite = /* @__PURE__ */ new Map();
				setMap(privateSlots, parent, bySite);
			}
			let byKey = bySite.get(site);
			if (!byKey) {
				byKey = /* @__PURE__ */ new Map();
				setMap(bySite, site, byKey);
			}
			setMap(byKey, key, owner);
		};
		const captureSlot = (parent, site, key) => {
			const existing = expectedSlots.get(parent)?.get(site)?.get(key);
			if (existing) return existing;
			const captured = {
				parent,
				site,
				key,
				owner: this.#childrenBySlot.get(parent)?.get(site)?.get(key),
				parentVersion: this.#parentChildrenVersion(parent),
				retained: false
			};
			let bySite = expectedSlots.get(parent);
			if (!bySite) {
				bySite = /* @__PURE__ */ new Map();
				setMap(expectedSlots, parent, bySite);
			}
			let byKey = bySite.get(site);
			if (!byKey) {
				byKey = /* @__PURE__ */ new Map();
				setMap(bySite, site, byKey);
			}
			setMap(byKey, key, captured);
			return captured;
		};
		const retainSlot = (captured) => {
			if (captured.retained) return;
			if (activeCheckpointCount !== 0) recordUndo(() => captured.retained = false);
			captured.retained = true;
		};
		const ownerRecord = (owner) => {
			const record = privateOwners.get(owner) ?? this.#owners.get(owner);
			if (!record) throw new Error(`Owner ${owner} is not alive in this preparation`);
			if (!privateOwners.has(owner)) {
				const slot = captureSlot(record.parent, record.componentSiteId, record.key);
				retainSlot(slot);
				if (slot.owner !== owner) throw new Error(`Owner ${owner} no longer occupies its committed slot`);
			}
			return record;
		};
		const captureCell = (owner, site) => {
			let sites = expectedCells.get(owner);
			if (!sites) {
				sites = /* @__PURE__ */ new Map();
				setMap(expectedCells, owner, sites);
			}
			let captured = sites.get(site);
			if (!captured) {
				const cell = this.#stateByOwner.get(owner)?.get(site);
				captured = {
					cell,
					version: cell?.version ?? 0
				};
				setMap(sites, site, captured);
			}
			return captured;
		};
		const installSlot = (record) => {
			let bySite = this.#childrenBySlot.get(record.parent);
			if (!bySite) {
				bySite = publicationParentMaps.get(record.parent);
				this.#childrenBySlot.set(record.parent, bySite);
			}
			let byKey = bySite.get(record.componentSiteId);
			if (!byKey) {
				byKey = publicationSlotMaps.get(record.parent)?.get(record.componentSiteId);
				bySite.set(record.componentSiteId, byKey);
			}
			byKey.set(record.key, record.id);
			if (record.parent !== null) this.#owners.get(record.parent).children.add(record.id);
			this.#bumpParentChildrenVersion(record.parent);
		};
		const makeCandidateCell = (owner, site, initial, layout) => {
			let sites = candidateCells.get(owner);
			if (!sites) {
				sites = /* @__PURE__ */ new Map();
				setMap(candidateCells, owner, sites);
			}
			let cell = sites.get(site);
			if (cell) {
				if (layout) {
					const normalized = normalizeCompiledStateLayout(layout);
					if (cell.stateLayout && compiledStateLayoutSignature(cell.stateLayout) !== compiledStateLayoutSignature(normalized)) throw new Error("State cell received a different compiled layout");
					const oldLayout = cell.stateLayout;
					const oldPromoted = cell.promoted;
					const oldNumericLaneSlot = cell.numericLaneSlot;
					const oldLaneSlotResolved = cell.laneSlotResolved;
					if (activeCheckpointCount !== 0) recordUndo(() => {
						cell.stateLayout = oldLayout;
						cell.promoted = oldPromoted;
						cell.numericLaneSlot = oldNumericLaneSlot;
						cell.laneSlotResolved = oldLaneSlotResolved;
					});
					if (!cell.stateLayout) cell.stateLayout = normalized;
					const slot = compiledStateLayoutSlot(normalized, site);
					cell.numericLaneSlot = slot;
					cell.laneSlotResolved = true;
					if (slot !== void 0 && typeof cell.value !== "number") cell.promoted = true;
				}
				return cell;
			}
			const committed = privateOwners.has(owner) ? void 0 : captureCell(owner, site).cell;
			const normalizedLayout = layout ? normalizeCompiledStateLayout(layout) : committed?.stateLayout;
			if (layout && committed?.stateLayout && compiledStateLayoutSignature(committed.stateLayout) !== compiledStateLayoutSignature(normalizedLayout)) throw new Error("State cell received a different compiled layout");
			const value = committed ? committed.value : typeof initial === "function" ? initial() : initial;
			const stateLayout = committed?.stateLayout ?? normalizedLayout;
			const numericLaneSlot = stateLayout ? compiledStateLayoutSlot(stateLayout, site) : void 0;
			const source = committed?.source ? new ScalarSource(committed.source.id, committed.source.value) : typeof value === "number" ? new ScalarSource(_a.#nextSourceId++, value) : void 0;
			const promoted = committed?.promoted || numericLaneSlot !== void 0 && typeof value !== "number" ? true : void 0;
			if (stateLayout && numericLaneSlot !== void 0 && typeof value === "number" && !promoted) cell = makeCompiledNumericStateCell({
				value,
				version: committed?.version ?? 0,
				layout: stateLayout,
				slot: numericLaneSlot,
				source,
				dispatch: () => false,
				laneSlotResolved: true
			});
			else cell = {
				value,
				version: committed?.version ?? 0,
				...stateLayout ? { stateLayout } : {},
				...stateLayout ? {
					numericLaneSlot,
					laneSlotResolved: true
				} : {},
				...promoted ? { promoted: true } : {},
				...source ? { source } : {},
				dirtyMembership: void 0,
				cellIdentity: void 0,
				cellHandle: void 0,
				rowLease: void 0,
				rowView: void 0,
				dispatch: () => false
			};
			setMap(sites, site, cell);
			let initialBySite = candidateInitialValues.get(owner);
			if (!initialBySite) {
				initialBySite = /* @__PURE__ */ new Map();
				setMap(candidateInitialValues, owner, initialBySite);
			}
			setMap(initialBySite, site, committed?.value);
			return cell;
		};
		const prepareAcceptedData = () => {
			publicationRecords = [...privateOwners.values()];
			for (const record of publicationRecords) {
				const currentParent = this.#childrenBySlot.get(record.parent);
				let preparedParent = publicationParentMaps.get(record.parent);
				if (!currentParent && !preparedParent) {
					preparedParent = /* @__PURE__ */ new Map();
					publicationParentMaps.set(record.parent, preparedParent);
				}
				if (!(currentParent ?? preparedParent).has(record.componentSiteId)) {
					let slots = publicationSlotMaps.get(record.parent);
					if (!slots) {
						slots = /* @__PURE__ */ new Map();
						publicationSlotMaps.set(record.parent, slots);
					}
					if (!slots.has(record.componentSiteId)) slots.set(record.componentSiteId, /* @__PURE__ */ new Map());
				}
			}
			for (const [owner, sites] of candidateCells) {
				if (!this.#stateByOwner.has(owner)) publicationSiteMaps.set(owner, /* @__PURE__ */ new Map());
				for (const [site, candidate] of sites) {
					const existing = this.#stateByOwner.get(owner)?.get(site);
					const layout = candidate.stateLayout;
					if (layout) {
						const normalized = normalizeCompiledStateLayout(layout);
						const signature = compiledStateLayoutSignature(normalized);
						if (existing?.stateLayout && compiledStateLayoutSignature(existing.stateLayout) !== signature) throw new Error("State cell received a different compiled layout");
						const storage = this.#numericLayouts.get(normalized);
						if (storage && storage.signature !== signature) throw new Error("Compiled state layout descriptor changed");
						publicationLayoutSlots.set(candidate, compiledStateLayoutSlot(normalized, site));
					}
					if (!existing) publicationDispatches.set(candidate, (action) => this.#dispatchState(owner, site, candidate, action));
					else if (candidate.version !== existing.version && typeof candidate.value === "number" && !existing.source) publicationSources.set(candidate, candidate.source ?? new ScalarSource(_a.#nextSourceId++, candidate.value));
				}
			}
			publicationPrepared = true;
		};
		const preparation = {
			resolveOwner: (parent, componentSiteId, key = null) => {
				assertOpen();
				if (!componentSiteId) throw new Error("Component site ID must not be empty");
				if (parent !== null) ownerRecord(parent);
				const overlay = getPrivateSlot(parent, componentSiteId, key);
				if (overlay !== void 0) return overlay;
				if (privateOwners.has(parent)) {
					const id = this.#nextOwner++;
					setMap(privateOwners, id, {
						id,
						parent,
						componentSiteId,
						key,
						children: /* @__PURE__ */ new Set(),
						childrenVersion: 0
					});
					putPrivateSlot(parent, componentSiteId, key, id);
					return id;
				}
				const expected = captureSlot(parent, componentSiteId, key);
				if (expected.owner !== void 0) retainSlot(expected);
				if (expected.owner !== void 0) return expected.owner;
				const id = this.#nextOwner++;
				setMap(privateOwners, id, {
					id,
					parent,
					componentSiteId,
					key,
					children: /* @__PURE__ */ new Set(),
					childrenVersion: 0
				});
				putPrivateSlot(parent, componentSiteId, key, id);
				return id;
			},
			findOwner: (parent, componentSiteId, key = null) => {
				assertOpen();
				if (!componentSiteId) throw new Error("Component site ID must not be empty");
				if (parent !== null) ownerRecord(parent);
				const privateOwner = getPrivateSlot(parent, componentSiteId, key);
				if (privateOwner !== void 0) return privateOwner;
				if (parent !== null && privateOwners.has(parent)) return void 0;
				const expected = captureSlot(parent, componentSiteId, key);
				retainSlot(expected);
				return expected.owner;
			},
			replaceOwner: (parent, componentSiteId, key = null) => {
				assertOpen();
				if (!componentSiteId) throw new Error("Component site ID must not be empty");
				if (parent !== null) ownerRecord(parent);
				if (parent === null || !privateOwners.has(parent)) captureSlot(parent, componentSiteId, key);
				const id = this.#nextOwner++;
				setMap(privateOwners, id, {
					id,
					parent,
					componentSiteId,
					key,
					children: /* @__PURE__ */ new Set(),
					childrenVersion: 0
				});
				putPrivateSlot(parent, componentSiteId, key, id);
				return id;
			},
			useState: (owner, site, initial, layout) => {
				assertOpen();
				ownerRecord(owner);
				if (!site) throw new Error("State site ID must not be empty");
				const cell = makeCandidateCell(owner, site, initial, layout);
				let dispatches = candidateDispatches.get(owner);
				if (!dispatches) {
					dispatches = /* @__PURE__ */ new Map();
					setMap(candidateDispatches, owner, dispatches);
				}
				let control = dispatches.get(site);
				if (!control) {
					control = {
						candidateCell: cell,
						discarded: false,
						dispatch: (action) => false
					};
					control.dispatch = (action) => {
						if (control.discarded) return false;
						if (control.forward) return control.forward(action);
						if (hostApplication) return false;
						const candidate = control.candidateCell;
						if (!candidate) return false;
						const typedAction = action;
						const previous = candidate.value;
						const next = typeof typedAction === "function" ? typedAction(previous) : typedAction;
						if (Object.is(previous, next)) return false;
						const previousVersion = candidate.version;
						const previousSource = candidate.source;
						const previousSourceValue = previousSource?.value;
						const previousPromoted = candidate.promoted;
						const previousHasStateWrites = hasStateWrites;
						if (activeCheckpointCount !== 0) recordUndo(() => {
							candidate.value = previous;
							candidate.version = previousVersion;
							candidate.source = previousSource;
							candidate.promoted = previousPromoted;
							if (previousSource && previousSourceValue !== void 0) previousSource.value = previousSourceValue;
							hasStateWrites = previousHasStateWrites;
						});
						candidate.value = next;
						candidate.version++;
						if (candidate.numericLaneSlot !== void 0 && typeof next !== "number") candidate.promoted = true;
						hasStateWrites = true;
						if (typeof next === "number") {
							candidate.source ??= new ScalarSource(_a.#nextSourceId++, next);
							candidate.source.value = next;
						}
						return true;
					};
					setMap(dispatches, site, control);
					if (activeCheckpointCount !== 0) {
						const newControl = control;
						recordUndo(() => {
							newControl.candidateCell = null;
							newControl.forward = void 0;
							newControl.discarded = true;
						});
					}
				}
				return [cell.value, control.dispatch];
			},
			scalarSource: (owner, site) => {
				assertOpen();
				ownerRecord(owner);
				const candidate = candidateCells.get(owner)?.get(site);
				if (candidate) return typeof candidate.value === "number" ? candidate.source ?? null : null;
				if (privateOwners.has(owner)) return null;
				const committed = captureCell(owner, site).cell;
				if (typeof committed?.value !== "number") return null;
				return makeCandidateCell(owner, site, committed.value).source ?? null;
			},
			hasStateWrites: () => hasStateWrites,
			checkpoint: () => {
				assertOpen();
				pruneCheckpointTop();
				const token = Object.freeze({});
				const node = {
					previous: checkpointTop,
					active: true,
					valid: true
				};
				checkpointTop = node;
				activeCheckpointCount++;
				checkpointMetadata.set(token, {
					preparation: preparationIdentity,
					cursor: undoJournal.length,
					node
				});
				return token;
			},
			rollbackTo: (checkpoint) => {
				assertOpen();
				const metadata = checkpointFor(checkpoint);
				if (metadata.cursor > undoJournal.length) throw new Error("Owner preparation checkpoint is invalid");
				for (let index = undoJournal.length - 1; index >= metadata.cursor; index--) undoJournal[index]();
				undoJournal.length = metadata.cursor;
				while (checkpointTop !== metadata.node) {
					if (!checkpointTop) throw new Error("Owner preparation checkpoint is invalid");
					const discarded = checkpointTop;
					checkpointTop = discarded.previous;
					discarded.valid = false;
					if (discarded.active) {
						discarded.active = false;
						activeCheckpointCount--;
					}
				}
			},
			releaseCheckpoint: (checkpoint) => {
				assertOpen();
				const metadata = checkpointFor(checkpoint);
				metadata.node.active = false;
				metadata.node.valid = false;
				activeCheckpointCount--;
				checkpointMetadata.delete(checkpoint);
				pruneCheckpointTop();
				if (activeCheckpointCount === 0) {
					checkpointTop = null;
					undoJournal.length = 0;
				}
			},
			discardPrivateOwner: (owner) => {
				assertOpen();
				if (!privateOwners.has(owner)) return false;
				const previousHasStateWrites = hasStateWrites;
				if (activeCheckpointCount !== 0) recordUndo(() => hasStateWrites = previousHasStateWrites);
				const privateChildren = /* @__PURE__ */ new Map();
				const fallbackSlots = /* @__PURE__ */ new Map();
				for (const [candidate, record] of privateOwners) if (record.parent !== null) {
					let children = privateChildren.get(record.parent);
					if (!children) privateChildren.set(record.parent, children = []);
					children.push(candidate);
				}
				const subtree = [];
				const subtreeSet = /* @__PURE__ */ new Set();
				const collect = (current) => {
					subtreeSet.add(current);
					for (const child of privateChildren.get(current) ?? []) collect(child);
					subtree.push(current);
				};
				collect(owner);
				for (const [candidate, record] of privateOwners) {
					if (subtreeSet.has(candidate)) continue;
					let bySite = fallbackSlots.get(record.parent);
					if (!bySite) fallbackSlots.set(record.parent, bySite = /* @__PURE__ */ new Map());
					let byKey = bySite.get(record.componentSiteId);
					if (!byKey) bySite.set(record.componentSiteId, byKey = /* @__PURE__ */ new Map());
					byKey.set(record.key, candidate);
				}
				for (const current of subtree) {
					const record = privateOwners.get(current);
					for (const [site, control] of candidateDispatches.get(current) ?? []) {
						const cell = control.candidateCell;
						const oldDiscarded = control.discarded;
						const oldForward = control.forward;
						if (activeCheckpointCount !== 0) recordUndo(() => {
							control.candidateCell = cell;
							control.discarded = oldDiscarded;
							control.forward = oldForward;
						});
						control.candidateCell = null;
						control.forward = void 0;
						control.discarded = true;
					}
					for (const cell of candidateCells.get(current)?.values() ?? []) {
						const oldValue = cell.value;
						const oldSource = cell.source;
						const oldSourceValue = oldSource?.value;
						if (activeCheckpointCount !== 0) recordUndo(() => {
							cell.value = oldValue;
							cell.source = oldSource;
							if (oldSource && oldSourceValue !== void 0) oldSource.value = oldSourceValue;
						});
						cell.value = void 0;
						if (oldSource) oldSource.value = 0;
						cell.source = void 0;
					}
					deleteMap(candidateDispatches, current);
					deleteMap(candidateCells, current);
					deleteMap(candidateInitialValues, current);
					deleteMap(expectedCells, current);
					deleteMap(privateOwners, current);
					if (getPrivateSlot(record.parent, record.componentSiteId, record.key) === current) {
						const previousPrivate = fallbackSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
						const bySite = privateSlots.get(record.parent)?.get(record.componentSiteId);
						if (previousPrivate !== void 0) setMap(bySite, record.key, previousPrivate);
						else if (bySite) {
							deleteMap(bySite, record.key);
							if (bySite.size === 0) {
								const parentSlots = privateSlots.get(record.parent);
								deleteMap(parentSlots, record.componentSiteId);
								if (parentSlots.size === 0) deleteMap(privateSlots, record.parent);
							}
							const expectedByKey = expectedSlots.get(record.parent)?.get(record.componentSiteId);
							const expected = expectedByKey?.get(record.key);
							if (expectedByKey && expected && !expected.retained) {
								deleteMap(expectedByKey, record.key);
								if (expectedByKey.size === 0) {
									const expectedBySite = expectedSlots.get(record.parent);
									deleteMap(expectedBySite, record.componentSiteId);
									if (expectedBySite.size === 0) deleteMap(expectedSlots, record.parent);
								}
							}
						}
					}
				}
				hasStateWrites = false;
				for (const [candidateOwner, sites] of candidateCells) for (const [site, candidate] of sites) {
					const baseVersion = privateOwners.has(candidateOwner) ? 0 : expectedCells.get(candidateOwner)?.get(site)?.version ?? 0;
					if (candidate.version !== baseVersion) hasStateWrites = true;
				}
				return true;
			},
			validate: () => {
				if (state !== "open") return false;
				for (const [owner, record] of privateOwners) {
					if (record.parent !== null && !privateOwners.has(record.parent) && this.#owners.get(record.parent) === void 0) return false;
					const slot = expectedSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
					if (!privateOwners.has(record.parent) && !slot) return false;
				}
				for (const bySite of expectedSlots.values()) for (const byKey of bySite.values()) for (const expected of byKey.values()) {
					if (this.#childrenBySlot.get(expected.parent)?.get(expected.site)?.get(expected.key) !== expected.owner) return false;
					if (this.#parentChildrenVersion(expected.parent) !== expected.parentVersion) return false;
				}
				for (const [owner, sites] of expectedCells) {
					if (!this.#owners.has(owner)) return false;
					for (const [site, expected] of sites) {
						const current = this.#stateByOwner.get(owner)?.get(site);
						if (current !== expected.cell || (current?.version ?? 0) !== expected.version) return false;
					}
				}
				return true;
			},
			validatePublicationInputs: () => {
				if (state !== "open") return false;
				for (const record of privateOwners.values()) {
					if (record.parent !== null && !privateOwners.has(record.parent) && this.#owners.get(record.parent) === void 0) return false;
					const slot = expectedSlots.get(record.parent)?.get(record.componentSiteId)?.get(record.key);
					if (!privateOwners.has(record.parent) && !slot) return false;
				}
				for (const bySite of expectedSlots.values()) for (const byKey of bySite.values()) for (const expected of byKey.values()) if (this.#childrenBySlot.get(expected.parent)?.get(expected.site)?.get(expected.key) !== expected.owner || this.#parentChildrenVersion(expected.parent) !== expected.parentVersion) return false;
				for (const [owner, sites] of expectedCells) {
					if (!this.#owners.has(owner)) return false;
					for (const [site, expected] of sites) {
						const current = this.#stateByOwner.get(owner)?.get(site);
						if (current !== expected.cell || (current?.version ?? 0) < expected.version) return false;
						const candidate = candidateCells.get(owner)?.get(site);
						if (current && current.version > expected.version && candidate && candidate.version > expected.version) return false;
					}
				}
				return true;
			},
			preparePublication: () => {
				if (publicationPrepared && state === "open") return;
				assertOpen();
				if (!preparation.validate()) throw new Error("Owner preparation is stale");
				preserveNewerCells = false;
				prepareAcceptedData();
			},
			beginHostApplication: () => {
				assertOpen();
				if (hostApplication) return;
				if (!preparation.validate() || hasStateWrites) throw new Error("Owner preparation is stale before host application");
				for (const [owner, dispatches] of candidateDispatches) for (const [site, control] of dispatches) {
					const captured = expectedCells.get(owner)?.get(site)?.cell;
					if (captured && this.#stateByOwner.get(owner)?.get(site) === captured) control.forward = captured.dispatch;
				}
				hostApplication = true;
			},
			preparePublicationAfterHost: () => {
				if (publicationPrepared && state === "open") return;
				assertOpen();
				if (!preparation.validatePublicationInputs()) throw new Error("Owner publication inputs are stale");
				preserveNewerCells = true;
				prepareAcceptedData();
			},
			publishAccepted: () => {
				assertOpen(true);
				if (!publicationPrepared) throw new Error("Owner publication was not prepared");
				for (const record of publicationRecords) {
					this.#owners.set(record.id, record);
					installSlot(record);
				}
				for (const [owner, sites] of candidateCells) {
					let committedSites = this.#stateByOwner.get(owner);
					if (!committedSites) this.#stateByOwner.set(owner, committedSites = publicationSiteMaps.get(owner));
					for (const [site, candidate] of sites) {
						const candidateLayout = candidate.stateLayout;
						const existing = committedSites.get(site);
						if (existing) {
							if (candidateLayout && !existing.laneSlotResolved) {
								existing.stateLayout = candidateLayout;
								existing.numericLaneSlot = publicationLayoutSlots.get(candidate);
								existing.laneSlotResolved = true;
								if (existing.numericLaneSlot !== void 0 && typeof existing.value !== "number") existing.promoted = true;
							}
							if (preserveNewerCells && existing.version > (expectedCells.get(owner)?.get(site)?.version ?? 0)) continue;
							if (candidate.promoted) {
								this.#releaseNumericLane(owner, site, existing);
								existing.promoted = true;
							}
							if (candidate.version !== existing.version) {
								existing.value = candidate.value;
								existing.version = candidate.version;
								if (typeof candidate.value === "number") {
									existing.source ??= publicationSources.get(candidate);
									existing.source.value = candidate.value;
									if (existing.rowLease && existing.numericLaneSlot !== void 0) NumericRowLease.setSource(existing.rowLease, existing.numericLaneSlot, existing.source);
								}
								this.#markCellDirty(owner, site, existing);
							}
							continue;
						}
						candidate.dispatch = publicationDispatches.get(candidate);
						committedSites.set(site, candidate);
						if (candidate.version > 0) this.#markCellDirty(owner, site, candidate);
					}
				}
				for (const [owner, sites] of candidateCells) for (const site of sites.keys()) {
					const cell = this.#stateByOwner.get(owner)?.get(site);
					if (cell) this.#attachOptionalNumericLane(owner, site, cell);
				}
				state = "published";
				for (const [owner, dispatches] of candidateDispatches) for (const [site, control] of dispatches) {
					const live = this.#stateByOwner.get(owner)?.get(site);
					control.candidateCell = null;
					control.forward = live?.dispatch;
				}
				undoJournal.length = 0;
				checkpointMetadata = /* @__PURE__ */ new WeakMap();
				checkpointTop = null;
				activeCheckpointCount = 0;
				privateOwners.clear();
				privateSlots.clear();
				expectedSlots.clear();
				expectedCells.clear();
				candidateInitialValues.clear();
				candidateDispatches.clear();
				publicationRecords = [];
				publicationSiteMaps.clear();
				publicationParentMaps.clear();
				publicationSlotMaps.clear();
				publicationLayoutSlots.clear();
				publicationSources.clear();
				publicationDispatches.clear();
				candidateCells.clear();
			},
			notifyPublished: () => {},
			publish: () => {
				preparation.preparePublication();
				preparation.publishAccepted();
				preparation.notifyPublished();
			},
			discard: () => {
				if (state !== "open") return;
				state = "discarded";
				for (const dispatches of candidateDispatches.values()) for (const control of dispatches.values()) {
					control.candidateCell = null;
					control.forward = void 0;
					control.discarded = true;
				}
				for (const sites of candidateCells.values()) for (const cell of sites.values()) {
					cell.value = void 0;
					if (cell.source) cell.source.value = 0;
					cell.source = void 0;
				}
				undoJournal.length = 0;
				checkpointMetadata = /* @__PURE__ */ new WeakMap();
				checkpointTop = null;
				activeCheckpointCount = 0;
				privateOwners.clear();
				privateSlots.clear();
				expectedSlots.clear();
				expectedCells.clear();
				candidateCells.clear();
				candidateInitialValues.clear();
				candidateDispatches.clear();
				publicationRecords = [];
				publicationSiteMaps.clear();
				publicationParentMaps.clear();
				publicationSlotMaps.clear();
				publicationLayoutSlots.clear();
				publicationSources.clear();
				publicationDispatches.clear();
			}
		};
		return preparation;
	}
	claimRootId(rootId) {
		if (!rootId) throw new Error("Component root ID must not be empty");
		if (this.#claimedRootIds.has(rootId)) throw new Error(`Component root ID ${rootId} is already active in this world`);
		const owner = this.resolveOwner(null, `@component-root:${rootId}`);
		this.#claimedRootIds.set(rootId, owner);
		return owner;
	}
	releaseRootId(rootId, owner) {
		if (this.#claimedRootIds.get(rootId) !== owner) return;
		this.#claimedRootIds.delete(rootId);
	}
	resolveOwner(parent, componentSiteId, key = null) {
		if (componentSiteId.length === 0) throw new Error("Component site ID must not be empty");
		if (parent !== null) this.#assertOwner(parent);
		let bySite = this.#childrenBySlot.get(parent);
		if (!bySite) this.#childrenBySlot.set(parent, bySite = /* @__PURE__ */ new Map());
		let byKey = bySite.get(componentSiteId);
		if (!byKey) bySite.set(componentSiteId, byKey = /* @__PURE__ */ new Map());
		const existing = byKey.get(key);
		if (existing !== void 0) return existing;
		const id = this.#nextOwner++;
		this.#owners.set(id, {
			id,
			parent,
			componentSiteId,
			key,
			children: /* @__PURE__ */ new Set(),
			childrenVersion: 0
		});
		if (parent !== null) this.#owners.get(parent).children.add(id);
		byKey.set(key, id);
		this.#bumpParentChildrenVersion(parent);
		return id;
	}
	/** Allocate a private incarnation without replacing a committed keyed slot. */
	createStagedOwner(parent, componentSiteId, key) {
		this.#assertOwner(parent);
		if (!componentSiteId) throw new Error("Component site ID must not be empty");
		const id = this.#nextOwner++;
		this.#owners.set(id, {
			id,
			parent,
			componentSiteId,
			key,
			children: /* @__PURE__ */ new Set(),
			childrenVersion: 0
		});
		this.#owners.get(parent).children.add(id);
		this.#stagedOwners.add(id);
		return id;
	}
	/** Validate a staged slot and allocate its missing maps before acceptance. */
	prepareStagedOwnerActivation(owner, previousOwner) {
		this.#assertOwner(owner);
		if (!this.#stagedOwners.has(owner)) throw new Error("Owner is not staged");
		const record = this.#owners.get(owner);
		const bySite = this.#childrenBySlot.get(record.parent);
		const byKey = bySite?.get(record.componentSiteId);
		if (byKey?.get(record.key) !== previousOwner) throw new Error("Staged owner slot changed before publication");
		const preparedSite = bySite ?? /* @__PURE__ */ new Map();
		const preparedKey = byKey ?? /* @__PURE__ */ new Map();
		let installed = false;
		return () => {
			if (installed) return;
			installed = true;
			const installedSite = this.#childrenBySlot.get(record.parent) ?? preparedSite;
			if (!this.#childrenBySlot.has(record.parent)) this.#childrenBySlot.set(record.parent, installedSite);
			const installedKey = installedSite.get(record.componentSiteId) ?? preparedKey;
			if (!installedSite.has(record.componentSiteId)) installedSite.set(record.componentSiteId, installedKey);
			installedKey.set(record.key, owner);
			this.#stagedOwners.delete(owner);
			this.#bumpParentChildrenVersion(record.parent);
		};
	}
	/** Publish a prepared incarnation only over its expected previous slot. */
	activateStagedOwner(owner, previousOwner) {
		this.prepareStagedOwnerActivation(owner, previousOwner)();
	}
	findOwner(parent, componentSiteId, key = null) {
		if (parent !== null) this.#assertOwner(parent);
		return this.#childrenBySlot.get(parent)?.get(componentSiteId)?.get(key);
	}
	/** React-like state API with an explicit, compiler-addressable site ID. */
	useState(owner, site, initial, layout) {
		this.#assertOwner(owner);
		if (site.length === 0) throw new Error("State site ID must not be empty");
		let sites = this.#stateByOwner.get(owner);
		if (!sites) this.#stateByOwner.set(owner, sites = /* @__PURE__ */ new Map());
		let cell = sites.get(site);
		if (!cell) {
			const value = typeof initial === "function" ? initial() : initial;
			const normalizedLayout = layout ? normalizeCompiledStateLayout(layout) : void 0;
			const numericLaneSlot = normalizedLayout ? compiledStateLayoutSlot(normalizedLayout, site) : void 0;
			const source = typeof value === "number" ? new ScalarSource(_a.#nextSourceId++, value) : void 0;
			if (normalizedLayout && numericLaneSlot !== void 0 && typeof value === "number") cell = makeCompiledNumericStateCell({
				value,
				version: 0,
				layout: normalizedLayout,
				slot: numericLaneSlot,
				source,
				dispatch: () => false,
				laneSlotResolved: false
			});
			else {
				cell = {
					value,
					version: 0,
					...normalizedLayout ? { stateLayout: normalizedLayout } : {},
					cellIdentity: void 0,
					cellHandle: void 0,
					dirtyMembership: void 0,
					rowLease: void 0,
					rowView: void 0,
					dispatch: () => false
				};
				if (source) cell.source = source;
			}
			cell.dispatch = (action) => this.#dispatchState(owner, site, cell, action);
			sites.set(site, cell);
		}
		if (layout) this.#ensureCellLayout(owner, site, cell, layout);
		if (cell.stateLayout && !cell.promoted && typeof cell.value === "number") this.#attachOptionalNumericLane(owner, site, cell);
		return [this.#readStateValue(owner, site, cell), cell.dispatch];
	}
	/** Return the stable committed lane address, if this cell is lane-backed. */
	numericLane(owner, site) {
		if (!this.#owners.has(owner)) return null;
		const cell = this.#stateByOwner.get(owner)?.get(site);
		const lane = cell?.lane;
		return cell && lane && this.#laneIsCurrent(owner, site, cell, lane) ? lane : null;
	}
	/** Resolve a captured handle/version to its exact live numeric lane address. */
	numericLaneForCell(handle, version) {
		const capturedVersion = version;
		if (!Number.isSafeInteger(capturedVersion)) return null;
		let owner;
		let site;
		let identity;
		try {
			owner = handle.owner;
			site = handle.site;
			identity = handle.cellIdentity;
		} catch {
			return null;
		}
		const cell = this.#resolveCellIdentity(identity, owner, site);
		if (!cell || cell.version !== capturedVersion) return null;
		const lane = cell.lane;
		return lane && this.#laneAddressIsCurrent(owner, site, cell, lane) ? lane : null;
	}
	/** Resolve a committed numeric cell to its cached row projection. */
	numericRowForCell(handle, version) {
		const capturedVersion = version;
		if (!Number.isSafeInteger(capturedVersion)) return null;
		let owner;
		let site;
		let identity;
		try {
			owner = handle.owner;
			site = handle.site;
			identity = handle.cellIdentity;
		} catch {
			return null;
		}
		const cell = this.#resolveCellIdentity(identity, owner, site);
		if (!cell || cell.version !== capturedVersion) return null;
		const lane = cell.lane;
		const view = cell.rowView;
		const lease = cell.rowLease;
		const layout = cell.stateLayout;
		const slot = cell.numericLaneSlot;
		if (!lane || !cell.source || !view || !lease || !layout || slot === void 0 || view.rowIdentity !== lease || view.owner !== owner || view.site !== site || view.layout !== layout || view.row !== lane.row || view.generation !== lane.generation || view.slot !== slot || view.lane !== lane || view.source !== cell.source || !this.#laneAddressIsCurrent(owner, site, cell, lane)) return null;
		return view;
	}
	#resolveCellIdentity(identity, owner, site) {
		if (!Number.isSafeInteger(owner) || typeof site !== "string" || site.length === 0) return null;
		return CommittedCellCapability.resolve(identity, this.#identitySecret, owner, site);
	}
	#resolveCellHandle(handle) {
		let owner;
		let site;
		let identity;
		try {
			owner = handle.owner;
			site = handle.site;
			identity = handle.cellIdentity;
		} catch {
			return null;
		}
		return this.#resolveCellIdentity(identity, owner, site);
	}
	version(owner, site) {
		this.#assertOwner(owner);
		return this.#stateByOwner.get(owner)?.get(site)?.version ?? 0;
	}
	/** Return one live committed cell's stable capability without dispatching it. */
	cellHandle(owner, site) {
		if (!this.#owners.has(owner) || this.#stagedOwners.has(owner)) return null;
		const cell = this.#stateByOwner.get(owner)?.get(site);
		return cell ? this.#handleForCell(owner, site, cell) : null;
	}
	#handleForCell(owner, site, cell) {
		let handle = cell.cellHandle;
		if (handle) return handle;
		const cellIdentity = new CommittedCellCapability(this.#identitySecret, owner, site, cell);
		cell.cellIdentity = cellIdentity;
		handle = Object.freeze({
			owner,
			site,
			cellIdentity
		});
		cell.cellHandle = handle;
		return handle;
	}
	/** Stable scalar handle for a numeric state cell; nonnumeric sites have none. */
	scalarSource(owner, site) {
		this.#assertOwner(owner);
		const cell = this.#stateByOwner.get(owner)?.get(site);
		return cell && typeof this.#readStateValue(owner, site, cell) === "number" ? cell.source ?? null : null;
	}
	/** Resolve the canonical source for an identity-bearing committed change. */
	scalarSourceForChange(change) {
		const cell = change.cellIdentity ? CommittedCellCapability.resolveLegacyChange(change.cellIdentity, this.#identitySecret, change) : null;
		if (cell) {
			this.#assertOwner(change.owner);
			return typeof cell.value === "number" ? cell.source ?? null : null;
		}
		return this.scalarSource(change.owner, change.site);
	}
	/** Resolve the canonical numeric source for an exact committed cell handle. */
	scalarSourceForCell(handle) {
		const cell = this.#resolveCellHandle(handle);
		return cell && typeof cell.value === "number" ? cell.source ?? null : null;
	}
	/** Resolve the current version for an identity-bearing committed change. */
	versionForChange(change) {
		const cell = change.cellIdentity ? CommittedCellCapability.resolveLegacyChange(change.cellIdentity, this.#identitySecret, change) : null;
		if (cell) {
			this.#assertOwner(change.owner);
			return cell.version;
		}
		return this.version(change.owner, change.site);
	}
	/** Resolve the current version for an exact committed cell handle. */
	versionForCell(handle) {
		return this.#resolveCellHandle(handle)?.version ?? null;
	}
	/** Clear dirty cells only when each exact cell has not advanced past its cut. */
	clearCellChangesThrough(handles, versions, count) {
		if (!Number.isSafeInteger(count) || count < 0 || count > handles.length || count > versions.length) throw new RangeError("Invalid native state change count");
		for (let index = 0; index < count; index++) {
			let handle;
			let version;
			try {
				handle = handles[index];
				version = versions[index];
			} catch {
				continue;
			}
			if (!handle || !Number.isSafeInteger(version)) continue;
			const cell = this.#resolveCellHandle(handle);
			if (!cell || cell.version > version) continue;
			const membership = cell.dirtyMembership;
			if (membership) this.#dirtyJournal.deletePrepared(membership);
		}
	}
	/** Clear only changes at or below the captured versions. Reentrant writes survive. */
	clearChangesThrough(captured) {
		for (const change of captured) {
			if (!this.#dirtyJournal.has(change.owner, change.site)) continue;
			if (!this.#owners.has(change.owner) || this.versionForChange(change) <= change.version) this.#dirtyJournal.delete(change.owner, change.site);
		}
	}
	/** Coalesce repeated writes to the same owner/site until a scheduler consumes them. */
	pendingChanges() {
		const changes = [];
		for (const [owner, site] of this.#dirtyJournal.entries()) changes.push({
			owner,
			site,
			version: this.version(owner, site)
		});
		return changes;
	}
	drainChanges() {
		const changes = this.pendingChanges();
		this.#dirtyJournal.clear();
		return changes;
	}
	/** Return the changed owner and its component ancestors up to the root entity. */
	ownerLineage(owner) {
		this.#assertOwner(owner);
		const lineage = [];
		let current = owner;
		while (current !== null) {
			lineage.push(current);
			current = this.#owners.get(current).parent;
		}
		return lineage;
	}
	isAlive(owner) {
		return this.#owners.has(owner);
	}
	/** Check canonical committed state without creating or dispatching a cell. */
	ownerStateValuesArePrimitive(owner) {
		if (!this.#owners.has(owner) || this.#stagedOwners.has(owner)) return false;
		for (const cell of this.#stateByOwner.get(owner)?.values() ?? []) {
			const value = cell.value;
			if (value !== null && value !== void 0 && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return false;
		}
		return true;
	}
	isWithin(owner, ancestor) {
		if (!this.#owners.has(owner) || !this.#owners.has(ancestor)) return false;
		let current = owner;
		while (current !== null) {
			if (current === ancestor) return true;
			current = this.#owners.get(current).parent;
		}
		return false;
	}
	hasPendingChanges() {
		return this.#dirtyJournal.size !== 0;
	}
	subscribeChanges(listener) {
		this.#changeListeners.add(listener);
		return () => this.#changeListeners.delete(listener);
	}
	/** Subscribe to committed state writes without allocating public change records. */
	subscribeDirtyCells(listener) {
		this.#dirtyCellListeners = [...this.#dirtyCellListeners, listener];
		let subscribed = true;
		return () => {
			if (!subscribed) return;
			subscribed = false;
			const index = this.#dirtyCellListeners.indexOf(listener);
			if (index < 0) return;
			this.#dirtyCellListeners = [...this.#dirtyCellListeners.slice(0, index), ...this.#dirtyCellListeners.slice(index + 1)];
		};
	}
	/** Destroy an owner and all nested keyed/component owners, including state traits. */
	destroyOwner(owner) {
		const record = this.#owners.get(owner);
		if (!record) return false;
		for (const child of [...record.children]) this.destroyOwner(child);
		const bySite = this.#childrenBySlot.get(record.parent);
		const byKey = bySite?.get(record.componentSiteId);
		if (byKey?.get(record.key) === owner) {
			byKey.delete(record.key);
			this.#bumpParentChildrenVersion(record.parent);
		}
		if (byKey?.size === 0) bySite?.delete(record.componentSiteId);
		if (bySite?.size === 0) this.#childrenBySlot.delete(record.parent);
		if (record.parent !== null) this.#owners.get(record.parent)?.children.delete(owner);
		this.#stagedOwners.delete(owner);
		const ownerCells = this.#stateByOwner.get(owner);
		for (const cell of ownerCells?.values() ?? []) {
			const identity = cell.cellIdentity;
			if (identity) CommittedCellCapability.revoke(identity, this.#identitySecret);
			cell.cellIdentity = void 0;
			cell.cellHandle = void 0;
		}
		this.#owners.delete(owner);
		for (const [site, cell] of ownerCells ?? []) {
			this.#releaseNumericLane(owner, site, cell);
			cell.dirtyMembership = void 0;
			cell.rowView = void 0;
			cell.value = void 0;
			cell.source = void 0;
		}
		this.#stateByOwner.delete(owner);
		this.#dirtyJournal.removeOwner(owner);
		return true;
	}
	#assertOwner(owner) {
		if (!this.#owners.has(owner)) throw new Error(`Owner ${owner} is not alive`);
	}
	#markCellDirty(owner, site, cell) {
		let membership = cell.dirtyMembership;
		if (!membership) {
			membership = this.#dirtyJournal.prepareMembership(owner, site);
			cell.dirtyMembership = membership;
		}
		if (!this.#dirtyJournal.markPrepared(membership)) throw new Error("Committed cell has stale dirty membership");
	}
	#parentChildrenVersion(parent) {
		return parent === null ? this.#rootChildrenVersion : this.#owners.get(parent)?.childrenVersion ?? -1;
	}
	#bumpParentChildrenVersion(parent) {
		if (parent === null) {
			this.#rootChildrenVersion++;
			return;
		}
		const record = this.#owners.get(parent);
		if (record) record.childrenVersion++;
	}
	#dispatchState(owner, site, cell, action) {
		this.#assertOwner(owner);
		const previous = cell.value;
		const isUpdater = typeof action === "function";
		const next = isUpdater ? action(previous) : action;
		if (isUpdater && (!this.#owners.has(owner) || this.#stateByOwner.get(owner)?.get(site) !== cell)) return false;
		if (Object.is(previous, next)) return false;
		if (cell.lane && typeof next !== "number") {
			this.#releaseNumericLane(owner, site, cell);
			cell.promoted = true;
		} else if (cell.numericLaneSlot !== void 0 && typeof next !== "number") cell.promoted = true;
		cell.value = next;
		cell.version++;
		if (typeof next === "number") {
			cell.source ??= new ScalarSource(_a.#nextSourceId++, next);
			cell.source.value = next;
			if (cell.rowLease && cell.numericLaneSlot !== void 0) {
				NumericRowLease.setSource(cell.rowLease, cell.numericLaneSlot, cell.source);
				if (!cell.rowView) refreshNumericCellRowView(cell, owner, site);
			}
		}
		this.#markCellDirty(owner, site, cell);
		if (typeof next === "number" && !cell.lane && cell.numericLaneSlot !== void 0 && !cell.promoted) this.#attachOptionalNumericLane(owner, site, cell);
		const handle = this.#handleForCell(owner, site, cell);
		const cellIdentity = handle.cellIdentity;
		const version = cell.version;
		const dirtyCellListeners = this.#dirtyCellListeners;
		const changeListeners = this.#changeListeners.size > 0 ? [...this.#changeListeners] : null;
		for (const listener of dirtyCellListeners) listener(handle, version);
		if (changeListeners) {
			const change = {
				owner,
				site,
				version,
				cellIdentity
			};
			for (const listener of changeListeners) listener(change);
		}
		return true;
	}
};
_a = OwnerStateWorld;
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/keyed_region_buckets.js
/**
* Ordered keyed rows with direct key lookup and bounded local edits.
*
* Iteration is intentionally linear; it is for initial materialization and
* snapshots. Replace/remove/insert/move use the key index and touch one or two
* buckets. When a bucket fills, it splits in half; sparse neighbors merge.
*/
var KeyedRegionBuckets = class {
	bucketCapacity;
	#head = null;
	#tail = null;
	#byKey = /* @__PURE__ */ new Map();
	#size = 0;
	#splits = 0;
	#merges = 0;
	#bucketSlotReads = 0;
	#bucketSlotWrites = 0;
	#bucketCount = 0;
	#structuralRevision = 0;
	constructor(entries, bucketCapacity = 128) {
		if (!Number.isSafeInteger(bucketCapacity) || bucketCapacity < 4) throw new RangeError("bucketCapacity must be an integer >= 4");
		this.bucketCapacity = bucketCapacity;
		for (const item of entries) {
			if (this.#byKey.has(item.key)) throw new Error(`Duplicate keyed-region key: ${item.key}`);
			this.#append(item.key, item.value);
		}
	}
	get size() {
		return this.#size;
	}
	get bucketCount() {
		return this.#bucketCount;
	}
	get structuralRevision() {
		return this.#structuralRevision;
	}
	has(key) {
		return this.#byKey.has(key);
	}
	get(key) {
		return this.#byKey.get(key)?.value;
	}
	beforeKey(key) {
		const { bucket, offset } = this.#require(key);
		if (offset > 0) return bucket.entries[offset - 1].key;
		return bucket.previous?.entries.at(-1)?.key ?? null;
	}
	afterKey(key) {
		const { bucket, offset } = this.#require(key);
		if (offset + 1 < bucket.entries.length) return bucket.entries[offset + 1].key;
		return bucket.next?.entries[0]?.key ?? null;
	}
	replace(oldKey, newKey, value) {
		const old = this.#require(oldKey);
		if (newKey !== oldKey && this.#byKey.has(newKey)) throw new Error(`Duplicate keyed-region key: ${newKey}`);
		this.#requireRevisionRoom(1);
		this.#bucketSlotReads++;
		const replacement = {
			key: newKey,
			value,
			bucket: old.bucket,
			offset: old.offset
		};
		old.bucket.entries[old.offset] = replacement;
		this.#bucketSlotWrites++;
		this.#byKey.delete(oldKey);
		this.#byKey.set(newKey, replacement);
		this.#structuralRevision++;
	}
	insertBefore(anchorKey, key, value) {
		if (this.#byKey.has(key)) throw new Error(`Duplicate keyed-region key: ${key}`);
		if (anchorKey !== null) this.#require(anchorKey);
		this.#requireRevisionRoom(1);
		if (this.#size === 0) {
			const bucket = this.#newBucket(null, null);
			this.#insertInto(bucket, 0, key, value);
			this.#structuralRevision++;
			return;
		}
		if (anchorKey === null) {
			const bucket = this.#tail;
			if (bucket.entries.length === this.bucketCapacity) {
				this.#split(bucket);
				this.#insertInto(this.#tail, this.#tail.entries.length, key, value);
			} else this.#insertInto(bucket, bucket.entries.length, key, value);
			this.#structuralRevision++;
			return;
		}
		const anchor = this.#require(anchorKey);
		let bucket = anchor.bucket;
		let offset = anchor.offset;
		if (bucket.entries.length === this.bucketCapacity) {
			const [left, right] = this.#split(bucket);
			const split = left.entries.length;
			if (offset >= split) {
				bucket = right;
				offset -= split;
			}
		}
		this.#insertInto(bucket, offset, key, value);
		this.#structuralRevision++;
	}
	remove(key) {
		const entry = this.#require(key);
		this.#requireRevisionRoom(1);
		const { bucket, offset } = entry;
		const [removed] = bucket.entries.splice(offset, 1);
		this.#bucketSlotReads++;
		this.#bucketSlotWrites += bucket.entries.length - offset;
		this.#byKey.delete(key);
		this.#size--;
		this.#reindex(bucket, offset);
		if (bucket.entries.length === 0) this.#unlink(bucket);
		else this.#rebalance(bucket);
		this.#structuralRevision++;
		return removed.value;
	}
	moveBefore(key, anchorKey) {
		if (key === anchorKey) return;
		if (this.afterKey(key) === anchorKey) return;
		if (anchorKey !== null) this.#require(anchorKey);
		this.#requireRevisionRoom(2);
		const value = this.remove(key);
		this.insertBefore(anchorKey, key, value);
	}
	#requireRevisionRoom(steps) {
		if (this.#structuralRevision > Number.MAX_SAFE_INTEGER - steps) throw new RangeError("Keyed-region structural revision exhausted");
	}
	*entries() {
		for (let bucket = this.#head; bucket; bucket = bucket.next) for (const entry of bucket.entries) yield {
			key: entry.key,
			value: entry.value
		};
	}
	/** Allocation-free full scan for snapshots and dense region work. */
	forEach(visitor) {
		for (let bucket = this.#head; bucket; bucket = bucket.next) for (const entry of bucket.entries) visitor(entry.key, entry.value);
	}
	stats() {
		return {
			bucketSlotReads: this.#bucketSlotReads,
			bucketSlotWrites: this.#bucketSlotWrites,
			splits: this.#splits,
			merges: this.#merges,
			bucketCount: this.#bucketCount
		};
	}
	resetStats() {
		this.#bucketSlotReads = 0;
		this.#bucketSlotWrites = 0;
		this.#splits = 0;
		this.#merges = 0;
	}
	/** Full consistency check for experiment integrity, not a hot-path method. */
	assertIntegrity() {
		const seen = /* @__PURE__ */ new Set();
		let count = 0;
		let previous = null;
		for (let bucket = this.#head; bucket; bucket = bucket.next) {
			if (bucket.previous !== previous) throw new Error("Keyed-region bucket links are inconsistent");
			if (bucket.entries.length === 0 || bucket.entries.length > this.bucketCapacity) throw new Error("Keyed-region bucket occupancy is invalid");
			for (let offset = 0; offset < bucket.entries.length; offset++) {
				const entry = bucket.entries[offset];
				if (seen.has(entry.key) || entry.bucket !== bucket || entry.offset !== offset || this.#byKey.get(entry.key) !== entry) throw new Error(`Keyed-region entry index mismatch: ${entry.key}`);
				seen.add(entry.key);
				count++;
			}
			previous = bucket;
		}
		if (previous !== this.#tail || count !== this.#size || seen.size !== this.#byKey.size || this.#bucketCount < 1 && count > 0) throw new Error("Keyed-region aggregate size mismatch");
	}
	#append(key, value) {
		let bucket = this.#tail;
		if (!bucket || bucket.entries.length === this.bucketCapacity) bucket = this.#newBucket(this.#tail, null);
		this.#insertInto(bucket, bucket.entries.length, key, value);
	}
	#insertInto(bucket, offset, key, value) {
		const entry = {
			key,
			value,
			bucket,
			offset
		};
		bucket.entries.splice(offset, 0, entry);
		this.#size++;
		this.#bucketSlotWrites += bucket.entries.length - offset;
		this.#reindex(bucket, offset);
		this.#byKey.set(key, entry);
	}
	#reindex(bucket, start) {
		for (let offset = start; offset < bucket.entries.length; offset++) {
			bucket.entries[offset].bucket = bucket;
			bucket.entries[offset].offset = offset;
			this.#bucketSlotWrites++;
		}
	}
	#split(bucket) {
		const splitAt = Math.ceil(bucket.entries.length / 2);
		const moved = bucket.entries.splice(splitAt);
		const right = this.#newBucket(bucket, bucket.next);
		right.entries.push(...moved);
		this.#reindex(right, 0);
		this.#reindex(bucket, splitAt);
		this.#splits++;
		return [bucket, right];
	}
	#rebalance(bucket) {
		const minimum = Math.floor(this.bucketCapacity / 2);
		if (bucket.entries.length >= minimum) return;
		const left = bucket.next ? bucket : bucket.previous;
		const right = bucket.next ?? bucket;
		if (!left || !right || left === right) return;
		if (left.entries.length + right.entries.length <= this.bucketCapacity) {
			left.entries.push(...right.entries);
			this.#reindex(left, 0);
			this.#unlink(right);
			this.#merges++;
			return;
		}
		const combined = [...left.entries, ...right.entries];
		const splitAt = Math.ceil(combined.length / 2);
		left.entries = combined.slice(0, splitAt);
		right.entries = combined.slice(splitAt);
		this.#reindex(left, 0);
		this.#reindex(right, 0);
	}
	#newBucket(previous, next) {
		const bucket = {
			entries: [],
			previous,
			next
		};
		if (previous) previous.next = bucket;
		else this.#head = bucket;
		if (next) next.previous = bucket;
		else this.#tail = bucket;
		this.#bucketCount++;
		return bucket;
	}
	#unlink(bucket) {
		if (bucket.previous) bucket.previous.next = bucket.next;
		else this.#head = bucket.next;
		if (bucket.next) bucket.next.previous = bucket.previous;
		else this.#tail = bucket.previous;
		this.#bucketCount--;
	}
	#require(key) {
		const entry = this.#byKey.get(key);
		if (!entry) throw new Error(`Unknown keyed-region key: ${key}`);
		return entry;
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/dom_style_writer.js
/**
* Prepare a DOM style-property writer while binding metadata is activated.
* The style and property name are captured; mutable CSSStyleDeclaration
* methods are looked up and invoked with the style object as receiver on each
* write, matching DOMVDOMHost's current writeStyle behavior.
*/
function createDOMStylePropWriter(style, name) {
	if (name.startsWith("--")) return (value, _previous) => {
		if (value == null) style.removeProperty(name);
		else style.setProperty(name, String(value));
	};
	const writableStyle = style;
	return (value, _previous) => {
		writableStyle[name] = value == null ? "" : String(value);
	};
}
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/vdom_snapshot_runtime.js
var captureCopyValue = (capture, sourceValue) => {
	if (capture === null) return null;
	const fields = Object.getOwnPropertyDescriptors(capture);
	const comparisonSource = fields.comparison?.value;
	const writeValue = fields.writeValue?.value;
	if (fields.kind?.value !== "copy" || !Array.isArray(comparisonSource) || !fields.writeValue || !("value" in fields.writeValue)) throw new TypeError("Invalid host copy capture");
	if (sourceValue !== null && (typeof sourceValue === "object" || typeof sourceValue === "function") && Object.is(writeValue, sourceValue)) throw new TypeError("Host copy capture must own its write value");
	const comparison = [];
	for (const value of comparisonSource) {
		if (value !== null && value !== void 0 && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" && typeof value !== "bigint") throw new TypeError("Invalid host copy comparison value");
		comparison.push(value);
	}
	return Object.freeze({
		sourceValue,
		writeValue,
		comparison: Object.freeze(comparison)
	});
};
var sameCopyValue = (a, b) => a.comparison.length === b.comparison.length && a.comparison.every((value, index) => Object.is(value, b.comparison[index]));
var isCompiledOwnerUpdatePrimitive = (value) => value === null || value === void 0 || typeof value === "string" || typeof value === "boolean" || typeof value === "number";
var safeLayoutSignature = (layout) => {
	try {
		return compiledStateLayoutSignature(layout);
	} catch {
		return null;
	}
};
var hostPropWriter = (host) => {
	let target = host;
	while (target) {
		const descriptor = Object.getOwnPropertyDescriptor(target, "setProp");
		if (descriptor) return typeof descriptor.value === "function" ? descriptor.value : null;
		target = Object.getPrototypeOf(target);
	}
	return null;
};
var hostCopyCapture = (host) => {
	let target = host;
	while (target) {
		const descriptor = Object.getOwnPropertyDescriptor(target, "capturePropertyValue");
		if (descriptor) return typeof descriptor.value === "function" ? descriptor.value : null;
		target = Object.getPrototypeOf(target);
	}
	return null;
};
var hostTextWriter = (host) => {
	let target = host;
	while (target) {
		const descriptor = Object.getOwnPropertyDescriptor(target, "setText");
		if (descriptor) return typeof descriptor.value === "function" ? descriptor.value : null;
		target = Object.getPrototypeOf(target);
	}
	return null;
};
var sameBoundValueCanSkipWrite = (lastValue, nextValue, forceWrite = false, lastIsCopy = false, nextIsCopy = false) => {
	if (lastIsCopy || nextIsCopy) {
		if (!lastIsCopy || !nextIsCopy || forceWrite) return false;
		const last = lastValue;
		const next = nextValue;
		return Object.is(last.sourceValue, next.sourceValue) && sameCopyValue(last, next);
	}
	if (!Object.is(lastValue, nextValue)) return false;
	return !forceWrite || nextValue === null || typeof nextValue !== "object" && typeof nextValue !== "function";
};
var elementKey = (element) => {
	const key = element.props.key;
	return key == null ? null : String(key);
};
var hostProps = (props) => {
	const result = {};
	for (const [name, value] of Object.entries(props)) {
		if (name === "children" || name === "key") continue;
		result[name] = value;
	}
	return result;
};
var normalizedElementCache = /* @__PURE__ */ new WeakMap();
var normalizeMany = (input) => {
	if (input == null || input === false) return [];
	if (Array.isArray(input)) return input.flatMap((child) => normalizeMany(child));
	if (typeof input === "string" || typeof input === "number") return [{
		kind: "text",
		text: String(input),
		key: null
	}];
	if (typeof input.type === "function") return normalizeMany(input.type(input.props));
	if (input.type === Fragment) return normalizeMany(input.props.children);
	const keyedRegionId = getKeyedOwnerRegionId(input.props.children);
	const cached = keyedRegionId === null ? normalizedElementCache.get(input) : void 0;
	if (cached) return [cached];
	const normalized = {
		kind: "element",
		tag: input.type,
		key: elementKey(input),
		props: hostProps(input.props),
		children: normalizeMany(input.props.children),
		keyedRegionId
	};
	if (keyedRegionId === null) normalizedElementCache.set(input, normalized);
	return [normalized];
};
var isPrimitiveOnlyScopedHostProp = (name, value) => name !== "ref" && name !== "style" && !/^on[A-Z]/.test(name) && (value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean");
var snapshotScopedHostTree = (node, mounted) => {
	if (node.kind === "text") {
		const copy = {
			kind: "text",
			text: node.text,
			key: node.key
		};
		return Object.freeze(copy);
	}
	const props = {};
	const descriptors = Object.getOwnPropertyDescriptors(node.props);
	for (const name of Reflect.ownKeys(descriptors)) {
		if (typeof name !== "string") return null;
		const descriptor = descriptors[name];
		if (!("value" in descriptor)) return null;
		if (mounted && (name === "position" || name === "rotation" || name === "scale") && Array.isArray(descriptor.value) && !Object.isFrozen(descriptor.value)) return null;
		if (node.scopedSourceProps) {
			const source = Object.getOwnPropertyDescriptor(node.scopedSourceProps, name);
			if (!source || !("value" in source) || !snapshotScopedHostProp(node.tag, name, source.value).accepted) return null;
		}
		const snapshot = snapshotScopedHostProp(node.tag, name, descriptor.value);
		if (!snapshot.accepted) return null;
		Object.defineProperty(props, name, {
			value: snapshot.value,
			enumerable: true,
			writable: false,
			configurable: false
		});
	}
	const children = [];
	const copies = mounted ? mountedChildren(mounted).map((child) => snapshotScopedHostTree(child.vnode, child)) : node.children.map((child) => snapshotScopedHostTree(child));
	for (const copy of copies) {
		if (!copy) return null;
		children.push(copy);
	}
	const copy = {
		kind: "element",
		tag: node.tag,
		key: node.key,
		props: Object.freeze(props),
		children: Object.freeze(children),
		keyedRegionId: node.keyedRegionId
	};
	return Object.freeze(copy);
};
var cloneMountedElementVNode = (vnode, changes) => {
	const copy = {
		...vnode,
		...changes
	};
	if (vnode.scopedSourceProps) Object.defineProperty(copy, "scopedSourceProps", { value: vnode.scopedSourceProps });
	return copy;
};
var sameMountedElementHeader = (left, right) => left.kind === "element" && right.kind === "element" && left.tag === right.tag && left.key === right.key && left.props === right.props && left.keyedRegionId === right.keyedRegionId && left.scopedSourceProps === right.scopedSourceProps && left.acceptedCopyProps === right.acceptedCopyProps;
var matchesAcceptedCopyCandidate = (mounted, candidate) => mounted === candidate || mounted.kind === "element" && candidate.kind === "element" && mounted.acceptedCopyProps !== void 0 && candidate.acceptedCopyProps === void 0 && mounted.tag === candidate.tag && mounted.key === candidate.key && mounted.props === candidate.props && mounted.children === candidate.children && mounted.keyedRegionId === candidate.keyedRegionId && mounted.scopedSourceProps === candidate.scopedSourceProps;
var mountedChildren = (node) => node.keyedChildren ? [...node.keyedChildren.entries()].map((entry) => entry.value) : node.children;
var forEachMountedChild = (node, visitor) => {
	if (node.keyedChildren) node.keyedChildren.forEach((_key, child) => visitor(child));
	else for (const child of node.children) visitor(child);
};
var storeMountedChildren = (node, regionId, children) => {
	const keyed = keyedChildrenFor(regionId, children);
	node.keyedChildren = keyed;
	node.children = keyed ? [] : children;
};
/** Materialize a keyed run only when falling back to ordinary full reconciliation. */
var materializeMountedChildren = (node) => {
	const children = mountedChildren(node);
	for (let index = 0; index < children.length; index++) {
		children[index].parent = node;
		children[index].parentIndex = index;
	}
	return children;
};
var keyedChildrenFor = (regionId, children) => {
	if (regionId === null || children.some((child) => child.vnode.key === null)) return;
	return new KeyedRegionBuckets(children.map((child) => ({
		key: child.vnode.key,
		value: child
	})));
};
var publicElementSnapshot = (vnode, children) => {
	const snapshot = {
		...vnode,
		children
	};
	delete snapshot.acceptedCopyProps;
	return snapshot;
};
var serializeMounted = (node) => {
	if (node.vnode.kind === "text") return node.vnode;
	return publicElementSnapshot(node.vnode, mountedChildren(node).map(serializeMounted));
};
var AcceptedMountedJournal = class {
	roots;
	#before = /* @__PURE__ */ new WeakMap();
	#bucketUndo = /* @__PURE__ */ new Map();
	constructor(roots) {
		this.roots = roots;
	}
	capture(node, acceptedVNode = node.vnode) {
		if (this.#before.has(node)) return;
		const vnode = acceptedVNode.kind === "element" ? {
			...acceptedVNode,
			children: acceptedVNode.children
		} : acceptedVNode;
		this.#before.set(node, {
			vnode,
			children: node.children,
			keyedChildren: node.keyedChildren
		});
	}
	record(bucket, undo) {
		let entries = this.#bucketUndo.get(bucket);
		if (!entries) this.#bucketUndo.set(bucket, entries = []);
		entries.push(undo);
	}
	serialize() {
		return this.roots.map((root) => this.#serializeNode(root));
	}
	#children(bucket) {
		const entries = [...bucket.entries()];
		const undo = this.#bucketUndo.get(bucket);
		if (undo) {
			const position = (key) => entries.findIndex((item) => item.key === key);
			const insertBefore = (key, item) => {
				const index = key === null ? entries.length : position(key);
				entries.splice(index < 0 ? entries.length : index, 0, item);
			};
			for (let index = undo.length - 1; index >= 0; index--) {
				const operation = undo[index];
				if (operation.kind === "insert") {
					const current = position(operation.key);
					if (current >= 0) entries.splice(current, 1);
				} else if (operation.kind === "remove") insertBefore(operation.before, {
					key: operation.key,
					value: operation.child
				});
				else if (operation.kind === "move") {
					const current = position(operation.key);
					if (current < 0) continue;
					const [item] = entries.splice(current, 1);
					if (item) insertBefore(operation.before, item);
				} else {
					const current = position(operation.newKey);
					if (current >= 0) entries[current] = {
						key: operation.oldKey,
						value: operation.child
					};
				}
			}
		}
		return entries.map((entry) => entry.value);
	}
	#serializeNode(node) {
		const before = this.#before.get(node);
		const vnode = before?.vnode ?? node.vnode;
		if (vnode.kind === "text") return vnode;
		const keyed = before?.keyedChildren ?? node.keyedChildren;
		return publicElementSnapshot(vnode, (keyed ? this.#children(keyed) : before?.children ?? node.children).map((child) => this.#serializeNode(child)));
	}
};
var acceptedJournalByHost = /* @__PURE__ */ new WeakMap();
var acceptedJournalForHost = (host) => acceptedJournalByHost.get(host);
var compatible = (left, right) => left.kind === right.kind && left.key === right.key && (left.kind === "text" || right.kind === "element" && left.tag === right.tag);
var validateUniqueKeys = (siblings) => {
	const keys = /* @__PURE__ */ new Set();
	for (const node of siblings) {
		if (node.kind === "element") {
			const ref = node.props.ref;
			if (ref != null && typeof ref !== "function" && !(typeof ref === "object" && "current" in ref)) throw new TypeError("VDOM ref must be a callback or an object with current");
		}
		if (node.key !== null) {
			if (keys.has(node.key)) throw new Error(`Duplicate key in next VDOM children: ${node.key}`);
			keys.add(node.key);
		}
		if (node.kind === "element") validateUniqueKeys(node.children);
	}
};
var applyProps = (host, handle, previous, next, previousWriters, afterProp, acceptedBefore, previousCopies) => {
	let writtenStyle = noStructuredWrite;
	const acceptedCopies = Object.create(null);
	const names = /* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(next)]);
	for (const name of names) {
		const previousWriter = previousWriters?.get(name);
		let boundWholeProp;
		let before;
		if (previousWriter?.length) {
			const wholeProp = previousWriter.find((group) => group.styleProperty === void 0);
			if (wholeProp) {
				boundWholeProp = wholeProp;
				before = wholeProp.lastValueIsCopy ? wholeProp.lastValue.writeValue : wholeProp.lastValue;
			} else if (name === "style") {
				const oldStyle = previous[name];
				const style = oldStyle && typeof oldStyle === "object" && !Array.isArray(oldStyle) ? { ...oldStyle } : {};
				for (const group of previousWriter) if (group.styleProperty !== void 0) style[group.styleProperty] = group.lastValueIsCopy ? group.lastValue.writeValue : group.lastValue;
				before = style;
			} else before = materializeProp(name, previous[name]);
		} else before = materializeProp(name, previous[name]);
		if (name === "style" && acceptedBefore && !previousWriter?.length) before = materializeProp(name, acceptedBefore[name]);
		let styleHasBinding = false;
		const value = materializeProp(name, next[name], name === "style" ? () => {
			styleHasBinding = true;
		} : void 0);
		const capture = value !== null && typeof value === "object" ? host.capturePropertyValue : void 0;
		const captured = capture ? captureCopyValue(capture.call(host, handle, name, value), value) : null;
		if (capture && capture !== host.capturePropertyValue) throw new Error("Host copy capture changed during property write");
		const priorCopy = boundWholeProp ? boundWholeProp.lastValueIsCopy ? boundWholeProp.lastValue : void 0 : previousCopies?.[name];
		if (priorCopy) before = priorCopy.writeValue;
		const changed = captured ? !priorCopy || !Object.is(priorCopy.sourceValue, value) || !sameCopyValue(priorCopy, captured) : !!priorCopy || !Object.is(before, value);
		if (captured) acceptedCopies[name] = changed ? captured : priorCopy;
		if (changed) {
			const written = captured ? captured.writeValue : value;
			host.setProp(handle, name, written, before);
			if (name === "style" && !styleHasBinding) writtenStyle = written;
		}
		afterProp?.(name, next[name], acceptedCopies[name] ?? null);
	}
	return {
		writtenStyle,
		acceptedCopies: Object.freeze(acceptedCopies)
	};
};
var noStructuredWrite = Symbol("no structured host write");
var acceptedStructuredVNode = (vnode, writtenStyle, acceptedCopies) => {
	const copyVNode = Object.keys(acceptedCopies).length ? {
		...vnode,
		acceptedCopyProps: acceptedCopies
	} : vnode;
	if (writtenStyle === noStructuredWrite || Object.isFrozen(vnode.props)) return copyVNode;
	let snapshot;
	try {
		snapshot = snapshotScopedHostProp(vnode.tag, "style", writtenStyle);
	} catch {
		return copyVNode;
	}
	if (!snapshot.accepted) return copyVNode;
	const props = {
		...vnode.props,
		style: snapshot.value
	};
	const accepted = {
		...copyVNode,
		props
	};
	Object.defineProperty(accepted, "scopedSourceProps", { value: vnode.props });
	return accepted;
};
var materializeCreationProps = (props) => {
	const result = {};
	for (const [name, value] of Object.entries(props)) {
		if (name === "ref") continue;
		result[name] = materializeProp(name, value);
	}
	return result;
};
/** Release listeners in tree order, then host resources in postorder. */
var releaseMountedSubtree = (host, node, errors) => {
	if (node.vnode.kind === "element") {
		if (node.vnode.props.ref != null) try {
			host.setProp(node.handle, "ref", void 0, node.vnode.props.ref);
		} catch (error) {
			errors.push(error);
		}
		for (const [name, value] of Object.entries(node.vnode.props)) if (/^on[A-Z]/.test(name) && typeof value === "function") try {
			host.setProp(node.handle, name, void 0, value);
		} catch (error) {
			errors.push(error);
		}
	}
	forEachMountedChild(node, (child) => {
		try {
			releaseMountedSubtree(host, child, errors);
		} catch (error) {
			errors.push(error);
		}
	});
	if (!node.hostDisposed) {
		node.hostDisposed = true;
		try {
			host.dispose?.(node.handle);
		} catch (error) {
			errors.push(error);
		}
	}
};
var removeMountedSubtree = (host, parent, node, collectedErrors) => {
	const errors = collectedErrors ?? [];
	releaseMountedSubtree(host, node, errors);
	try {
		host.remove(parent, node.handle);
	} catch (error) {
		errors.push(error);
	}
	if (!collectedErrors && errors.length > 0) throw new AggregateError(errors, "VDOM subtree removal encountered host errors");
};
var materializeValue = (value, bindingSeen) => {
	const binding = getBoundValue(value);
	if (binding) bindingSeen?.();
	return binding ? readBoundValue(binding) : value;
};
var materializeProp = (name, value, bindingSeen) => {
	if (name === "style" && typeof value === "object" && value !== null && !Array.isArray(value)) {
		const style = value;
		const output = {};
		for (const [key, styleValue] of Object.entries(style)) output[key] = materializeValue(styleValue, bindingSeen);
		return output;
	}
	return materializeValue(value, bindingSeen);
};
var boundSourcesIn = (name, value) => {
	const values = name === "style" && typeof value === "object" && value !== null && !Array.isArray(value) ? Object.values(value) : [value];
	const sources = [];
	for (const item of values) {
		const binding = getBoundValue(item);
		if (binding) {
			for (const source of binding.sources ?? [binding.source]) if (!sources.includes(source)) sources.push(source);
		}
	}
	return sources;
};
var hasStableDerivedBinding = (value) => {
	const direct = getBoundValue(value);
	if (direct) return !!direct.read;
	return typeof value === "object" && value !== null && Object.values(value).some((item) => !!getBoundValue(item)?.read);
};
var compiledBindingsIn = (name, value) => {
	const values = name === "style" && typeof value === "object" && value !== null && !Array.isArray(value) ? Object.entries(value) : [[void 0, value]];
	const bindings = [];
	for (const [styleProperty, item] of values) {
		const binding = getBoundValue(item);
		const hasCompiledIdentity = binding && Number.isInteger(binding.bindingId) && Number.isInteger(binding.sourceSlot);
		if (hasCompiledIdentity && binding.sources && binding.sources.length !== 1) throw new Error("Compiled VDOM bindings currently require one source per prop");
		if (hasCompiledIdentity) bindings.push({
			source: binding.source,
			bindingId: binding.bindingId,
			sourceSlot: binding.sourceSlot,
			styleProperty,
			binding
		});
	}
	return bindings;
};
/** CSR/column bindings require their own registration and lifetime protocol. */
var hasNonScalarBindingMetadata = (name, value) => {
	return (name === "style" && typeof value === "object" && value !== null && !Array.isArray(value) ? Object.values(value) : [value]).some((item) => {
		const binding = getBoundValue(item);
		return !!binding && (binding.bindingId !== void 0 || binding.sourceSlot !== void 0 || binding.column !== void 0);
	});
};
var createMounted = (host, vnode, parent, keyIndex) => {
	if (vnode.kind === "text") {
		const mounted = {
			vnode,
			handle: host.createText(vnode.text),
			children: [],
			parent: null,
			parentIndex: -1
		};
		keyIndex?.attach?.(mounted);
		return mounted;
	}
	const handle = host.createElement(vnode.tag, parent, materializeCreationProps(vnode.props));
	const { writtenStyle, acceptedCopies } = applyProps(host, handle, {}, vnode.props);
	const children = reconcileChildren(host, handle, [], vnode.children, keyIndex);
	const mounted = {
		vnode: acceptedStructuredVNode(vnode, writtenStyle, acceptedCopies),
		handle,
		children,
		parent: null,
		parentIndex: -1
	};
	storeMountedChildren(mounted, vnode.keyedRegionId, children);
	for (let index = 0; index < children.length; index++) {
		children[index].parent = mounted;
		children[index].parentIndex = index;
	}
	keyIndex?.attach?.(mounted);
	return mounted;
};
var updateMounted = (host, parent, old, next, keyIndex) => {
	if (old && old.vnode === next) return old;
	if (old) acceptedJournalForHost(host)?.capture(old);
	if (!old || !compatible(old.vnode, next)) {
		if (old) {
			visitMountedSubtree(old, keyIndex?.detach);
			removeMountedSubtree(host, parent, old);
		}
		const mounted = createMounted(host, next, parent, keyIndex);
		if (old) {
			mounted.parent = old.parent;
			mounted.parentIndex = old.parentIndex;
			const siblings = old.parent?.keyedChildren;
			const oldKey = old.vnode.key;
			const anchorKey = siblings && oldKey !== null ? siblings.afterKey(oldKey) : null;
			const anchor = anchorKey === null ? null : siblings.get(anchorKey)?.handle ?? null;
			host.place(parent, mounted.handle, anchor);
			if (siblings && oldKey !== null && mounted.vnode.key !== null) {
				acceptedJournalForHost(host)?.record(siblings, {
					kind: "replace",
					oldKey,
					newKey: mounted.vnode.key,
					child: old
				});
				siblings.replace(oldKey, mounted.vnode.key, mounted);
			}
		} else host.place(parent, mounted.handle, null);
		return mounted;
	}
	if (next.kind === "text" && old.vnode.kind === "text") {
		if (old.vnode.text !== next.text) host.setText(old.handle, next.text);
		old.vnode = next;
		return old;
	}
	if (next.kind === "element" && old.vnode.kind === "element") {
		const { writtenStyle, acceptedCopies } = applyProps(host, old.handle, old.vnode.scopedSourceProps ?? old.vnode.props, next.props, old.scalarBindingGroups, keyIndex?.refreshProp ? (name, value, acceptedCopy) => keyIndex.refreshProp(old, name, value, acceptedCopy) : void 0, old.vnode.scopedSourceProps ? old.vnode.props : void 0, old.vnode.acceptedCopyProps);
		const children = reconcileChildren(host, old.handle, materializeMountedChildren(old), next.children, keyIndex);
		for (let index = 0; index < children.length; index++) {
			children[index].parent = old;
			children[index].parentIndex = index;
		}
		storeMountedChildren(old, next.keyedRegionId, children);
		if (old.vnode.keyedRegionId !== next.keyedRegionId) {
			if (keyIndex?.detachKey) keyIndex.detachKey(old);
			else keyIndex?.detach?.(old);
			old.vnode = acceptedStructuredVNode(next, writtenStyle, acceptedCopies);
			if (keyIndex?.attachKey) keyIndex.attachKey(old);
			else keyIndex?.attach?.(old);
			return old;
		}
		old.vnode = acceptedStructuredVNode(next, writtenStyle, acceptedCopies);
		return old;
	}
	throw new Error("Incompatible VDOM node kinds reached update path");
};
var reconcileChildren = (host, parent, previous, next, keyIndex) => {
	if (next.length === previous.length && next.every((vnode, index) => previous[index].vnode.key === vnode.key && compatible(previous[index].vnode, vnode))) return next.map((vnode, index) => updateMounted(host, parent, previous[index], vnode, keyIndex));
	const keyed = /* @__PURE__ */ new Map();
	const unkeyed = [];
	for (let index = 0; index < previous.length; index++) {
		const child = previous[index];
		const key = child.vnode.key;
		if (key == null) unkeyed.push(child);
		else {
			if (keyed.has(key)) throw new Error(`Duplicate key in previous VDOM children: ${key}`);
			keyed.set(key, child);
		}
	}
	const nextKeys = /* @__PURE__ */ new Set();
	for (const child of next) if (child.key != null) {
		if (nextKeys.has(child.key)) throw new Error(`Duplicate key in next VDOM children: ${child.key}`);
		nextKeys.add(child.key);
	}
	const used = /* @__PURE__ */ new Set();
	const needsPlacement = new Uint8Array(next.length);
	let unkeyedIndex = 0;
	let lastPlacedIndex = -1;
	const selected = next.map((vnode, index) => {
		let candidate;
		if (vnode.key != null) candidate = keyed.get(vnode.key);
		else candidate = unkeyed[unkeyedIndex++];
		if (!candidate || !compatible(candidate.vnode, vnode)) {
			needsPlacement[index] = 1;
			return null;
		}
		used.add(candidate);
		if (candidate.parentIndex < lastPlacedIndex) needsPlacement[index] = 1;
		else lastPlacedIndex = candidate.parentIndex;
		return candidate;
	});
	const mounted = new Array(next.length);
	let anchor = null;
	for (let index = next.length - 1; index >= 0; index--) {
		const old = selected[index];
		const child = old ? updateMounted(host, parent, old, next[index], keyIndex) : createMounted(host, next[index], parent, keyIndex);
		if (needsPlacement[index] !== 0) host.place(parent, child.handle, anchor);
		mounted[index] = child;
		anchor = child.handle;
	}
	for (const child of previous) if (!used.has(child)) {
		visitMountedSubtree(child, keyIndex?.detach);
		removeMountedSubtree(host, parent, child);
	}
	return mounted;
};
var visitMountedSubtree = (node, visit) => {
	if (!visit) return;
	visit(node);
	forEachMountedChild(node, (child) => visitMountedSubtree(child, visit));
};
/** A retained VDOM root whose host changes only when commit() is called. */
var VDOMSnapshotRoot = class {
	host;
	container;
	profile;
	#mounted = [];
	#snapshot = [];
	#numericWriteInProgress = false;
	#snapshotDirty = false;
	#publicationToken = null;
	#pendingHistoryGroups = [];
	#pendingHistoryValues = [];
	#pendingHistorySources = [];
	#pendingHistoryFlags = [];
	#acceptedJournal = null;
	#publicationFailed = false;
	#acceptedVersion = 0;
	#acceptedSnapshot = null;
	#keyedVNodeRetentionParents = /* @__PURE__ */ new Set();
	#nodesByKey = /* @__PURE__ */ new Map();
	#nodesByKeyedRegion = /* @__PURE__ */ new Map();
	#groupsBySource = /* @__PURE__ */ new Map();
	#retainedSourceDeltas = /* @__PURE__ */ new WeakMap();
	#storePropDeltas = /* @__PURE__ */ new WeakMap();
	#programSourceSlots = /* @__PURE__ */ new Map();
	#preparedNumericRowPrograms = /* @__PURE__ */ new WeakMap();
	#activePreparedNumericRowRecords = /* @__PURE__ */ new Set();
	#numericRowProgramsBySource = /* @__PURE__ */ new Map();
	#preparedNumericRowByIdentity = /* @__PURE__ */ new WeakMap();
	#ownerRowCutEpoch = 0;
	#ownerRowRecordScratch = [];
	#ownerRowInputRecordScratch = [];
	#ownerRowRecordCount = 0;
	#ownerRowGroupScratch = [];
	#ownerRowGroupRecordScratch = [];
	#ownerRowValueScratch = [];
	#ownerRowStagedInputIndices = /* @__PURE__ */ new Uint32Array(0);
	#ownerRowStagedSinkIds = /* @__PURE__ */ new Uint16Array(0);
	#ownerRowStagedValues = [];
	#ownerRowGroupCount = 0;
	#ownerRowExecutionActive = false;
	#ownerRowExecutionCancelled = false;
	#ownerRowWorkVisits = 0;
	#ownerUpdateKernelBatches = 0;
	#ownerUpdateKernelRows = 0;
	#ownerUpdateKernelInputs = 0;
	#ownerUpdateKernelSelectedSinks = 0;
	#ownerUpdateKernelStagedSinks = 0;
	#ownerUpdateGenericFallbackCuts = 0;
	#ownerUpdateGenericProjectors = 0;
	#preparedCellProgramRecords = /* @__PURE__ */ new WeakMap();
	#preparedCellDirtySlots = [];
	#preparedCellDirtyValues = [];
	#preparedCellDirtyCount = 0;
	#preparedCellCutEpoch = 0;
	#programSinkSlots = [];
	#programSinkSlotByGroup = /* @__PURE__ */ new Map();
	#programDirtySources = [];
	#programDirtySourceCount = 0;
	#programChangedSources = [];
	#programChangedSourceCount = 0;
	#programAffectedSinks = [];
	#programAffectedSinkCount = 0;
	#programOutputValues = [];
	#programOutputCount = 0;
	#programSourceEpoch = 0;
	#programSinkEpoch = 0;
	#programFreeSinkSlots = [];
	#columnRowsStageEpoch = 0;
	#columnRowsScratchGroups = [];
	#columnRowsScratchSources = [];
	#columnRowsScratchValues = [];
	#columnRowsScratchCount = 0;
	#columnRowsScratchActive = false;
	#columnRowsScratchCancelled = false;
	#groupsByCompiledBinding = /* @__PURE__ */ new Map();
	#groupsByCompiledSource = /* @__PURE__ */ new Map();
	#groupsByCompiledColumnBinding = /* @__PURE__ */ new Map();
	#groupsByCompiledColumn = /* @__PURE__ */ new Map();
	#groupsByCompiledColumnRows = /* @__PURE__ */ new Map();
	#sourceColumnCells = /* @__PURE__ */ new Map();
	#pendingSourceColumnPrunes = /* @__PURE__ */ new Set();
	#groupsByColumnCell = /* @__PURE__ */ new Map();
	#compiledSlotBySource = /* @__PURE__ */ new Map();
	#compiledGraph = null;
	#directBindingWrites = false;
	#version = 0;
	#partialCommitCount = 0;
	#partialCommitBatchCount = 0;
	#bindingIndexAttachOperations = 0;
	#bindingIndexDetachOperations = 0;
	#bindingIndexIndexOperations = 0;
	#sourceColumnPruneVisits = 0;
	#incompatibleScalarBindingGroups = 0;
	#profileCounter;
	#renderHost;
	#pendingRefs = /* @__PURE__ */ new Map();
	#committedRefs = /* @__PURE__ */ new Map();
	#refPublicationEpoch = 0;
	keyIndexMaintenance;
	bindingIndexMaintenance;
	constructor(host, container, profile, profileCounter, keyIndexMaintenance = "delta", bindingIndexMaintenance = "delta") {
		this.host = host;
		this.container = container;
		this.profile = profile;
		this.#profileCounter = profileCounter;
		this.keyIndexMaintenance = keyIndexMaintenance;
		this.bindingIndexMaintenance = bindingIndexMaintenance;
		const copyCapture = hostCopyCapture(host);
		this.#renderHost = {
			createElement: (tag, parent, props) => host.createElement(tag, parent, props),
			createText: (text) => host.createText(text),
			setText: (node, text) => host.setText(node, text),
			setProp: (node, name, value, previous) => {
				if (name === "ref") this.#pendingRefs.set(node, value == null ? null : value);
				else host.setProp(node, name, value, previous);
			},
			capturePropertyValue: copyCapture ? (node, name, value) => {
				if (hostCopyCapture(host) !== copyCapture) throw new Error("Host copy capture changed before property write");
				const writer = hostPropWriter(host);
				if (!writer) return null;
				const result = captureCopyValue(copyCapture.call(host, node, name, value), value);
				if (hostCopyCapture(host) !== copyCapture) throw new Error("Host copy capture changed during property write");
				if (hostPropWriter(host) !== writer) throw new Error("Host property writer changed during copy capture");
				return result && {
					kind: "copy",
					writeValue: result.writeValue,
					comparison: result.comparison
				};
			} : void 0,
			setStyleProp: host.setStyleProp ? (node, name, value, previous) => host.setStyleProp(node, name, value, previous) : void 0,
			prepareStyleProp: host.prepareStyleProp ? (node, name) => host.prepareStyleProp(node, name) : void 0,
			place: (parent, node, before) => host.place(parent, node, before),
			remove: (parent, node) => host.remove(parent, node),
			dispose: host.dispose ? (node) => host.dispose(node) : void 0,
			getPublicInstance: host.getPublicInstance ? (node) => host.getPublicInstance(node) : void 0
		};
	}
	get version() {
		return this.#publicationToken || this.#publicationFailed ? this.#acceptedVersion : this.#version;
	}
	get appliedVersion() {
		return this.#version;
	}
	beginPublication() {
		if (this.#publicationToken) throw new Error("VDOM publication is active");
		if (this.#publicationFailed) throw new Error("VDOM publication is terminal after partial failure");
		this.#acceptedVersion = this.#version;
		this.#acceptedSnapshot = this.#snapshotDirty ? null : this.#snapshot;
		this.#acceptedJournal = new AcceptedMountedJournal(this.#mounted);
		acceptedJournalByHost.set(this.#renderHost, this.#acceptedJournal);
		this.#publicationToken = {};
	}
	#releaseKeyedVNodeAncestorChildren(parent) {
		for (let ancestor = parent.parent; ancestor; ancestor = ancestor.parent) if (ancestor.vnode.kind === "element" && ancestor.vnode.children.length) ancestor.vnode = cloneMountedElementVNode(ancestor.vnode, { children: [] });
	}
	publishAccepted() {
		if (!this.#publicationToken) throw new Error("No VDOM publication is active");
		for (let index = 0; index < this.#pendingHistoryGroups.length; index++) {
			const group = this.#pendingHistoryGroups[index];
			const flags = this.#pendingHistoryFlags[index];
			if (flags & 1) group.lastSourceValue = this.#pendingHistorySources[index];
			if (flags & 2) {
				group.lastValue = this.#pendingHistoryValues[index];
				group.lastValueIsCopy = !!(flags & 4);
			}
			group.acceptedWriteGeneration = (group.acceptedWriteGeneration ?? 0) + 1;
		}
		this.#clearPendingHistory();
		this.#publicationToken = null;
		acceptedJournalByHost.delete(this.#renderHost);
		this.#acceptedJournal = null;
		this.#publicationFailed = false;
		this.#acceptedVersion = this.#version;
		this.#acceptedSnapshot = null;
		for (const parent of this.#keyedVNodeRetentionParents) this.#releaseKeyedVNodeAncestorChildren(parent);
		this.#keyedVNodeRetentionParents.clear();
	}
	failPublication() {
		if (this.#publicationToken) {
			this.#clearPendingHistory();
			this.#publicationToken = null;
			acceptedJournalByHost.delete(this.#renderHost);
			this.#publicationFailed = true;
			this.#keyedVNodeRetentionParents.clear();
		}
	}
	cancelPublication() {
		this.#clearPendingHistory();
		this.#publicationToken = null;
		acceptedJournalByHost.delete(this.#renderHost);
		this.#acceptedJournal = null;
		this.#acceptedSnapshot = null;
		this.#keyedVNodeRetentionParents.clear();
	}
	#effectiveLastValue(group) {
		const index = this.#pendingHistoryIndex(group);
		return index !== null && this.#pendingHistoryFlags[index] & 2 ? this.#pendingHistoryValues[index] : group.lastValue;
	}
	#effectiveLastValueIsCopy(group) {
		const index = this.#pendingHistoryIndex(group);
		return index !== null && this.#pendingHistoryFlags[index] & 2 ? !!(this.#pendingHistoryFlags[index] & 4) : !!group.lastValueIsCopy;
	}
	#effectiveLastSourceValue(group) {
		const index = this.#pendingHistoryIndex(group);
		return index !== null && this.#pendingHistoryFlags[index] & 1 ? this.#pendingHistorySources[index] : group.lastSourceValue;
	}
	#stageLastValue(group, value, isCopy = false) {
		if (!this.#publicationToken) {
			group.lastValue = value;
			group.lastValueIsCopy = isCopy;
			group.acceptedWriteGeneration = (group.acceptedWriteGeneration ?? 0) + 1;
			return;
		}
		const index = this.#stageHistoryIndex(group);
		this.#pendingHistoryValues[index] = value;
		this.#pendingHistoryFlags[index] = this.#pendingHistoryFlags[index] & -5 | 2 | (isCopy ? 4 : 0);
	}
	#prepareBoundCopy(group, next) {
		if (group.styleProperty !== void 0) return null;
		const capture = next !== null && typeof next === "object" ? this.#renderHost.capturePropertyValue : void 0;
		if (!capture) return null;
		const result = captureCopyValue(capture.call(this.#renderHost, group.handle, group.name, next), next);
		if (capture !== this.#renderHost.capturePropertyValue) throw new Error("Host copy capture changed during binding write");
		if (group.sources.some((source) => this.#compiledGraph ? !this.#groupsByCompiledSource.get(source)?.includes(group) : !this.#groupsBySource.get(source)?.has(group))) throw new Error("Bound host copy writer changed during capture");
		return result;
	}
	#stageLastSourceValue(group, value) {
		if (!this.#publicationToken) {
			group.lastSourceValue = value;
			return;
		}
		const index = this.#stageHistoryIndex(group);
		this.#pendingHistorySources[index] = value;
		this.#pendingHistoryFlags[index] |= 1;
	}
	#pendingHistoryIndex(group) {
		return this.#publicationToken && group.pendingPublicationToken === this.#publicationToken ? group.pendingPublicationIndex : null;
	}
	#stageHistoryIndex(group) {
		const existing = this.#pendingHistoryIndex(group);
		if (existing !== null) return existing;
		const index = this.#pendingHistoryGroups.length;
		group.pendingPublicationToken = this.#publicationToken;
		group.pendingPublicationIndex = index;
		this.#pendingHistoryGroups.push(group);
		this.#pendingHistoryValues.push(void 0);
		this.#pendingHistorySources.push(void 0);
		this.#pendingHistoryFlags.push(0);
		return index;
	}
	#clearPendingHistory() {
		for (const group of this.#pendingHistoryGroups) {
			delete group.pendingPublicationToken;
			delete group.pendingPublicationIndex;
		}
		this.#pendingHistoryGroups.length = 0;
		this.#pendingHistoryValues.length = 0;
		this.#pendingHistorySources.length = 0;
		this.#pendingHistoryFlags.length = 0;
	}
	get partialCommitCount() {
		return this.#partialCommitCount;
	}
	get partialCommitBatchCount() {
		return this.#partialCommitBatchCount;
	}
	/** A read-only, host-neutral description of the latest committed tree. */
	get snapshot() {
		if (this.#publicationToken || this.#publicationFailed) return this.#acceptedSnapshot ??= this.#acceptedJournal?.serialize() ?? [];
		if (this.#snapshotDirty) {
			this.#snapshot = this.#mounted.map(serializeMounted);
			this.#snapshotDirty = false;
		}
		return this.#snapshot;
	}
	commit(tree, compiledGraph = null, directBindingWrites = false) {
		this.prepareCommit(tree, compiledGraph, directBindingWrites).commit();
		this.flushRefs();
	}
	/** Stop pending attaches without tearing down the active host batch. */
	cancelPendingRefAttachments() {
		this.#refPublicationEpoch++;
		this.#pendingRefs.clear();
	}
	/** Publish ref changes staged by a completed host commit. */
	flushRefs() {
		const publicationEpoch = this.#refPublicationEpoch;
		const pending = [...this.#pendingRefs];
		this.#pendingRefs.clear();
		const errors = [];
		for (const [node, nextRef] of pending) {
			if (publicationEpoch !== this.#refPublicationEpoch) break;
			const previous = this.#committedRefs.get(node);
			if (previous?.ref === nextRef) continue;
			if (!previous) continue;
			this.#committedRefs.delete(node);
			try {
				if (previous.cleanup) previous.cleanup();
				else if (typeof previous.ref === "function") previous.ref(null);
				else previous.ref.current = null;
			} catch (error) {
				errors.push(error);
			}
		}
		for (const [node, nextRef] of pending) {
			if (publicationEpoch !== this.#refPublicationEpoch) break;
			if (nextRef == null) continue;
			if (this.#committedRefs.get(node)?.ref === nextRef) continue;
			let instance;
			try {
				instance = this.host.getPublicInstance ? this.host.getPublicInstance(node) : node;
			} catch (error) {
				errors.push(error);
				continue;
			}
			const committed = {
				ref: nextRef,
				instance
			};
			this.#committedRefs.set(node, committed);
			try {
				if (typeof nextRef === "function") {
					const cleanup = nextRef(instance);
					if (typeof cleanup === "function") {
						const release = cleanup;
						if (publicationEpoch !== this.#refPublicationEpoch || this.#committedRefs.get(node) !== committed) try {
							release();
						} catch (error) {
							errors.push(error);
						}
						else committed.cleanup = release;
					}
				} else nextRef.current = instance;
			} catch (error) {
				errors.push(error);
			}
		}
		if (errors.length > 0) throw new AggregateError(errors, "VDOM ref publication encountered errors");
	}
	/**
	* Normalize and validate a candidate before touching its host. A caller can
	* prepare every root in a transition first, then apply these synchronous
	* commits together in one task.
	*/
	prepareCommit(tree, compiledGraph = this.#compiledGraph, directBindingWrites = this.#directBindingWrites) {
		const next = normalizeMany(tree);
		validateUniqueKeys(next);
		if (compiledGraph) {
			this.#validateCompiledGraph(compiledGraph);
			const validateBindings = (nodes) => {
				for (const node of nodes) {
					if (node.kind !== "element") continue;
					for (const [name, value] of Object.entries(node.props)) for (const binding of compiledBindingsIn(name, value)) {
						const slot = binding.sourceSlot;
						if (slot < 0 || slot >= compiledGraph.sourceCount) throw new Error(`Compiled binding uses invalid source slot ${slot}`);
						const start = compiledGraph.sourceBindingOffsets[slot];
						const end = compiledGraph.sourceBindingOffsets[slot + 1];
						let found = false;
						for (let edge = start; edge < end; edge++) if (compiledGraph.bindingIds[edge] === binding.bindingId) found = true;
						if (!found) throw new Error(`Compiled binding ${binding.bindingId} is absent from source slot ${slot}`);
					}
					validateBindings(node.children);
				}
			};
			validateBindings(next);
		}
		let committed = false;
		return { commit: () => {
			if (committed) throw new Error("Prepared VDOM commit can only be applied once");
			committed = true;
			let oldIndexVisits = 0;
			let newIndexVisits = 0;
			const deltaPlainBindings = this.bindingIndexMaintenance === "delta" && compiledGraph === null && this.#compiledGraph === null && directBindingWrites === this.#directBindingWrites;
			const bindingAttachStart = this.#bindingIndexAttachOperations;
			const bindingDetachStart = this.#bindingIndexDetachOperations;
			const countIndexVisits = this.#profileCounter !== void 0;
			const deltaKeys = this.keyIndexMaintenance === "delta";
			const keyIndex = deltaKeys || deltaPlainBindings ? {
				detachKey: (node) => {
					if (!deltaKeys) return;
					if (countIndexVisits) oldIndexVisits++;
					this.#removeFromKeyIndex(node);
				},
				attachKey: (node) => {
					if (!deltaKeys) return;
					if (countIndexVisits) newIndexVisits++;
					this.#addToKeyIndex(node);
				},
				detach: (node) => {
					if (deltaKeys) {
						if (countIndexVisits) oldIndexVisits++;
						this.#removeFromKeyIndex(node);
					}
					if (deltaPlainBindings) this.#detachScalarBindingNode(node);
				},
				attach: (node) => {
					if (deltaKeys) {
						if (countIndexVisits) newIndexVisits++;
						this.#addToKeyIndex(node);
					}
					if (deltaPlainBindings) this.#attachScalarBindingNode(node);
				},
				...deltaPlainBindings ? { refreshProp: (node, name, value, acceptedCopy) => this.#refreshScalarBindingProp(node, name, value, acceptedCopy) } : {}
			} : void 0;
			try {
				this.#mounted = reconcileChildren(this.#renderHost, this.container, this.#mounted, next, keyIndex);
			} catch (error) {
				const repairErrors = [];
				try {
					this.#rebuildKeyIndex();
				} catch (repairError) {
					repairErrors.push(repairError);
				}
				try {
					this.#rebuildBindingIndex();
				} catch (repairError) {
					this.#clearBindingIndex();
					repairErrors.push(repairError);
				}
				if (repairErrors.length > 0) throw new AggregateError([error, ...repairErrors], "VDOM host commit and index repair failed");
				throw error;
			}
			for (let index = 0; index < this.#mounted.length; index++) {
				this.#mounted[index].parent = null;
				this.#mounted[index].parentIndex = index;
			}
			this.#snapshot = next;
			this.#snapshotDirty = false;
			this.#compiledGraph = compiledGraph;
			this.#directBindingWrites = directBindingWrites;
			if (deltaPlainBindings && countIndexVisits) this.#profileCounter?.({
				"vdom.binding-index.incremental-group-detaches": this.#bindingIndexDetachOperations - bindingDetachStart,
				"vdom.binding-index.incremental-group-attaches": this.#bindingIndexAttachOperations - bindingAttachStart
			});
			else if (!deltaPlainBindings) this.#rebuildBindingIndex();
			this.#pruneSourceColumnCells();
			if (this.keyIndexMaintenance === "rebuild") this.#rebuildKeyIndex();
			else if (countIndexVisits) this.#profileCounter?.({
				"vdom.key-index.incremental-old-visits": oldIndexVisits,
				"vdom.key-index.incremental-new-visits": newIndexVisits
			});
			this.#version++;
		} };
	}
	/**
	* Update one globally unique keyed host region without normalizing or
	* reconciling its siblings. Returns false when that fast path is unsafe.
	*/
	commitKeyedRegion(key, tree) {
		if (this.#directBindingWrites) {
			const prepared = this.prepareKeyedRegions([{
				key,
				tree
			}]);
			if (!prepared) return false;
			prepared.commit();
			return true;
		}
		if (this.#compiledGraph || this.#directBindingWrites || this.#groupsBySource.size > 0) return false;
		const matches = this.#nodesByKey.get(key);
		if (!matches || matches.size !== 1) return false;
		let started = this.profile ? performance.now() : 0;
		const [next] = normalizeMany(tree);
		this.profile?.("vdom.normalize", performance.now() - started);
		started = this.profile ? performance.now() : 0;
		const target = matches.values().next().value;
		if (!target || !next || next.key !== key || !compatible(target.vnode, next)) return false;
		let oldIndexVisits = 0;
		let newIndexVisits = 0;
		const countIndexVisits = this.#profileCounter !== void 0;
		const previousSubtree = [];
		if (this.keyIndexMaintenance === "rebuild") {
			const collect = (node) => {
				previousSubtree.push({
					node,
					key: node.vnode.key
				});
				if (countIndexVisits) oldIndexVisits++;
				forEachMountedChild(node, collect);
			};
			collect(target);
			for (const { node, key: oldKey } of previousSubtree) if (oldKey !== null) this.#removeKeyFromIndex(oldKey, node);
		}
		const keyIndex = this.keyIndexMaintenance === "delta" ? {
			detach: (node) => {
				if (countIndexVisits) oldIndexVisits++;
				this.#removeFromKeyIndex(node);
			},
			attach: (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
			}
		} : void 0;
		const parent = target.parent ? target.parent.handle : this.container;
		updateMounted(this.#renderHost, parent, target, next, keyIndex);
		if (this.keyIndexMaintenance === "rebuild") {
			const indexSubtree = (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
				forEachMountedChild(node, indexSubtree);
			};
			indexSubtree(target);
		}
		this.profile?.("vdom.reconcile-host", performance.now() - started);
		started = this.profile ? performance.now() : 0;
		this.#snapshotDirty = true;
		this.#version++;
		this.#partialCommitCount++;
		this.#partialCommitBatchCount++;
		if (countIndexVisits) this.#profileCounter?.(this.keyIndexMaintenance === "delta" ? {
			"vdom.key-index.incremental-old-visits": oldIndexVisits,
			"vdom.key-index.incremental-new-visits": newIndexVisits
		} : {
			"vdom.key-index.subtree-rescan-old-visits": oldIndexVisits,
			"vdom.key-index.subtree-rescan-new-visits": newIndexVisits
		});
		this.profile?.("vdom.index-snapshot", performance.now() - started);
		return true;
	}
	/**
	* Apply a small structural edit directly to a compiler-marked keyed child
	* region. Ordinary ScalarSource/BoundValue writers are updated only within
	* changed subtrees, including ordinary direct property/style groups.
	* Compiled CSR and column roots retain their generic fallback.
	* The operation list is validated before host writes; order storage remains
	* bucketed and is never expanded to a sibling array on this path.
	*/
	commitKeyedRegionDelta(parentKey, regionId, operations) {
		const committed = this.#commitKeyedRegionDelta(parentKey, regionId, operations);
		if (committed) this.#pruneSourceColumnCells();
		return committed;
	}
	#commitKeyedRegionDelta(parentKey, regionId, operations, incrementVersion = true, preparedNodes) {
		if (!parentKey || !regionId || this.#compiledGraph || this.#incompatibleScalarBindingGroups > 0) {
			this.#profileCounter?.({ "vdom.keyed-region-delta.bail.root-guard": 1 });
			return false;
		}
		const roots = this.#nodesByKey.get(parentKey);
		if (!roots || roots.size !== 1) {
			this.#profileCounter?.({ "vdom.keyed-region-delta.bail.root-lookup": 1 });
			return false;
		}
		const root = roots.values().next().value;
		if (!root) return false;
		const candidates = this.#nodesByKeyedRegion.get(regionId);
		let parent;
		let matches = 0;
		for (const candidate of candidates ?? []) {
			let ancestor = candidate;
			while (ancestor !== root && ancestor.parent) ancestor = ancestor.parent;
			if (ancestor !== root) continue;
			if (candidate.vnode.kind === "element" && candidate.keyedChildren) {
				parent = candidate;
				matches++;
			}
		}
		if (matches !== 1) {
			this.#profileCounter?.({ [`vdom.keyed-region-delta.bail.region-matches-${matches}`]: 1 });
			return false;
		}
		const region = parent?.keyedChildren;
		if (!parent || parent.vnode.kind !== "element" || !region || parent.vnode.keyedRegionId !== regionId) {
			this.#profileCounter?.({ "vdom.keyed-region-delta.bail.parent-guard": 1 });
			return false;
		}
		if (operations.length === 0) return true;
		const normalized = /* @__PURE__ */ new Map();
		const state = /* @__PURE__ */ new Map();
		const present = (key) => {
			if (!state.has(key)) state.set(key, region.has(key));
			return state.get(key);
		};
		const validateScalarBindings = (node) => {
			if (node.kind === "text") return true;
			for (const [name, value] of Object.entries(node.props)) try {
				if (hasNonScalarBindingMetadata(name, value)) return false;
				if (compiledBindingsIn(name, value).length > 0) return false;
				if (boundSourcesIn(name, value).length > 0) materializeProp(name, value);
			} catch {
				return false;
			}
			return node.children.every(validateScalarBindings);
		};
		for (let index = 0; index < operations.length; index++) {
			const operation = operations[index];
			if (!operation.key) return false;
			if (operation.type === "insert" || operation.type === "replace") {
				const key = operation.key;
				if (operation.type === "insert") {
					if (present(key)) return false;
					if (operation.beforeKey !== null && !present(operation.beforeKey)) return false;
					const roots = preparedNodes?.has(operation) ? [preparedNodes.get(operation)] : normalizeMany(operation.tree);
					if (roots.length !== 1 || roots[0].key !== key) return false;
					try {
						validateUniqueKeys(roots);
					} catch {
						return false;
					}
					if (!validateScalarBindings(roots[0])) return false;
					normalized.set(index, roots[0]);
					state.set(key, true);
				} else {
					if (!present(key)) return false;
					const roots = preparedNodes?.has(operation) ? [preparedNodes.get(operation)] : normalizeMany(operation.tree);
					if (roots.length !== 1 || roots[0].key !== key) return false;
					try {
						validateUniqueKeys(roots);
					} catch {
						return false;
					}
					if (!validateScalarBindings(roots[0])) return false;
					normalized.set(index, roots[0]);
				}
			} else if (operation.type === "remove") {
				if (!present(operation.key)) return false;
				state.set(operation.key, false);
			} else {
				if (!present(operation.key)) return false;
				if (operation.beforeKey !== null && !present(operation.beforeKey)) return false;
			}
		}
		const keyIndex = {
			detach: (node) => this.#removeFromKeyIndex(node),
			attach: (node) => this.#addToKeyIndex(node)
		};
		const bindingAttachStart = this.#bindingIndexAttachOperations;
		const bindingDetachStart = this.#bindingIndexDetachOperations;
		const bindingIndexStart = this.#bindingIndexIndexOperations;
		const hostParent = parent.handle;
		const acceptedJournal = acceptedJournalForHost(this.#renderHost);
		for (let index = 0; index < operations.length; index++) {
			const operation = operations[index];
			if (operation.type === "remove") {
				const child = region.get(operation.key);
				acceptedJournal?.record(region, {
					kind: "remove",
					key: operation.key,
					child,
					before: region.afterKey(operation.key)
				});
				region.remove(operation.key);
				visitMountedSubtree(child, keyIndex.detach);
				this.#detachScalarBindingSubtree(child);
				removeMountedSubtree(this.#renderHost, hostParent, child);
			} else if (operation.type === "move") {
				if (operation.key === operation.beforeKey) continue;
				const child = region.get(operation.key);
				acceptedJournal?.record(region, {
					kind: "move",
					key: operation.key,
					before: region.afterKey(operation.key)
				});
				const anchor = operation.beforeKey === null ? null : region.get(operation.beforeKey).handle;
				region.moveBefore(operation.key, operation.beforeKey);
				this.#renderHost.place(hostParent, child.handle, anchor);
			} else if (operation.type === "insert") {
				const vnode = normalized.get(index);
				const child = createMounted(this.#renderHost, vnode, hostParent, keyIndex);
				child.parent = parent;
				child.parentIndex = -1;
				const anchor = operation.beforeKey === null ? null : region.get(operation.beforeKey).handle;
				acceptedJournal?.record(region, {
					kind: "insert",
					key: operation.key
				});
				region.insertBefore(operation.beforeKey, operation.key, child);
				this.#renderHost.place(hostParent, child.handle, anchor);
				this.#attachScalarBindingSubtree(child);
			} else {
				const old = region.get(operation.key);
				this.#detachScalarBindingSubtree(old);
				updateMounted(this.#renderHost, hostParent, old, normalized.get(index), keyIndex);
				this.#attachScalarBindingSubtree(region.get(operation.key));
			}
		}
		acceptedJournal?.capture(parent);
		const releasedChildVNodeCount = parent.vnode.children.length;
		parent.vnode = cloneMountedElementVNode(parent.vnode, { children: [] });
		if (this.#publicationToken) this.#keyedVNodeRetentionParents.add(parent);
		else this.#releaseKeyedVNodeAncestorChildren(parent);
		this.#snapshot = [];
		this.#snapshotDirty = true;
		if (incrementVersion) this.#version++;
		this.#partialCommitCount++;
		this.#partialCommitBatchCount++;
		this.#profileCounter?.({
			"vdom.keyed-region-delta.operations": operations.length,
			"vdom.keyed-region-delta.bucket-count": region.bucketCount,
			"vdom.keyed-region-delta.binding-attaches": this.#bindingIndexAttachOperations - bindingAttachStart,
			"vdom.keyed-region-delta.binding-detaches": this.#bindingIndexDetachOperations - bindingDetachStart,
			"vdom.keyed-region-delta.binding-index-operations": this.#bindingIndexIndexOperations - bindingIndexStart,
			"vdom.keyed-region-delta.released-child-vnodes": releasedChildVNodeCount
		});
		return true;
	}
	prepareKeyedRegionDelta(parentKey, regionId, operations) {
		return this.prepareKeyedRegionDeltas([{
			parentKey,
			regionId,
			operations
		}]);
	}
	/** Prepare keyed sparse edits and keyed leaf replacements as one host phase. */
	prepareKeyedRegionDeltas(deltas, regions = [], options = {}) {
		return this.#prepareKeyedRegionDeltas(deltas, regions, options, false);
	}
	#prepareKeyedRegionDeltas(deltas, regions, options, deferVersion, postHostStore = null) {
		const baseVersion = this.#version;
		const scoped = options.scoped === true;
		deferVersion &&= scoped;
		const methodNames = [
			"createElement",
			"createText",
			"setText",
			"setProp",
			"place",
			"remove",
			"dispose",
			"setStyleProp",
			"prepareStyleProp"
		];
		const hostMethod = (name) => {
			let object = this.host;
			while (object) {
				const descriptor = Object.getOwnPropertyDescriptor(object, name);
				if (descriptor) return typeof descriptor.value === "function" ? descriptor.value : null;
				object = Object.getPrototypeOf(object);
			}
			return null;
		};
		let methods = [];
		if (scoped) {
			try {
				methods = methodNames.map(hostMethod);
			} catch {
				return null;
			}
			if (methods.slice(0, 6).some((method) => !method)) return null;
		}
		const hostMethodsCurrent = () => !scoped || methodNames.every((name, index) => hostMethod(name) === methods[index]);
		if (this.#compiledGraph || this.#incompatibleScalarBindingGroups > 0 || deltas.length === 0 && regions.length === 0 || scoped && (deltas.length === 0 || regions.length > 0 || !deltas.some((delta) => delta.operations.length > 0))) return null;
		const hasLeafRegions = regions.length > 0;
		const preparedDeltas = [];
		const deltaParents = /* @__PURE__ */ new Set();
		const regionIds = /* @__PURE__ */ new Set();
		const touchedKeys = /* @__PURE__ */ new Map();
		const replacedNodes = /* @__PURE__ */ new Set();
		const replacedVNodeFootprint = /* @__PURE__ */ new Map();
		let scopedTreeEdit = false;
		const candidateKeys = /* @__PURE__ */ new Set();
		const candidateRoots = [];
		const isAncestor = (ancestor, node) => {
			for (let current = node; current; current = current.parent) if (current === ancestor) return true;
			return false;
		};
		const collectMounted = (node) => {
			if (replacedNodes.has(node)) return false;
			replacedNodes.add(node);
			if (scoped) replacedVNodeFootprint.set(node, node.vnode);
			forEachMountedChild(node, collectMounted);
			return true;
		};
		const isStaticMountedSubtree = (node) => {
			if (node.scalarBindingGroups?.size || node.scalarIncompatibleBindingProps?.size) return false;
			if (node.vnode.kind === "element") {
				for (const [name, value] of Object.entries(node.vnode.props)) if (!isPrimitiveOnlyScopedHostProp(name, value)) return false;
			}
			let valid = true;
			forEachMountedChild(node, (child) => {
				if (!isStaticMountedSubtree(child)) valid = false;
			});
			return valid;
		};
		const validateBindings = (node) => {
			if (node.kind === "text") return true;
			for (const [name, value] of Object.entries(node.props)) {
				if (hasNonScalarBindingMetadata(name, value)) return false;
				if (compiledBindingsIn(name, value).length > 0) return false;
				const sources = boundSourcesIn(name, value);
				if (scoped && sources.length > 0) return false;
				if (sources.length > 0) materializeProp(name, value);
			}
			return node.children.every(validateBindings);
		};
		const candidateKeyOwners = /* @__PURE__ */ new Map();
		const collectCandidateKeys = (node, owner) => {
			if (node.kind === "text") return true;
			if (node.key !== null) {
				const previousOwner = candidateKeyOwners.get(node.key);
				if (previousOwner !== void 0 && previousOwner !== owner) return false;
				candidateKeyOwners.set(node.key, owner);
				candidateKeys.add(node.key);
			}
			return node.children.every((child) => collectCandidateKeys(child, owner));
		};
		try {
			for (const delta of deltas) {
				if (!delta.parentKey || !delta.regionId || regionIds.has(delta.regionId)) return null;
				regionIds.add(delta.regionId);
				const matches = this.#nodesByKey.get(delta.parentKey);
				if (!matches || matches.size !== 1) return null;
				const root = matches.values().next().value;
				if (!root || root.hostDisposed) return null;
				let parent;
				let matchesRegion = 0;
				for (const candidate of this.#nodesByKeyedRegion.get(delta.regionId) ?? []) {
					if (!isAncestor(root, candidate)) continue;
					if (candidate.vnode.kind === "element" && candidate.keyedChildren) {
						parent = candidate;
						matchesRegion++;
					}
				}
				if (matchesRegion !== 1 || !parent || parent.vnode.kind !== "element" || parent.vnode.keyedRegionId !== delta.regionId || deltaParents.has(parent)) return null;
				for (const previous of deltaParents) if (isAncestor(previous, parent) || isAncestor(parent, previous)) return null;
				deltaParents.add(parent);
				if (scoped && this.#version !== baseVersion) return null;
				const bucket = parent.keyedChildren;
				const bucketRevision = bucket.structuralRevision;
				const parentVNode = parent.vnode;
				const keyedFootprint = /* @__PURE__ */ new Map();
				const captureKey = (key) => {
					if (key === null || keyedFootprint.has(key)) return;
					keyedFootprint.set(key, bucket.get(key) ?? null);
				};
				const operations = delta.operations.map((operation) => ({ ...operation }));
				const virtual = /* @__PURE__ */ new Map();
				const present = (key) => {
					if (!virtual.has(key)) virtual.set(key, bucket.has(key));
					return virtual.get(key);
				};
				const nodes = /* @__PURE__ */ new Map();
				for (const op of operations) {
					if (scoped) {
						captureKey(op.key);
						if (op.type === "move" || op.type === "insert") captureKey(op.beforeKey);
					}
					if (!op.key) return null;
					const previousRegion = touchedKeys.get(op.key);
					if (previousRegion !== void 0 && previousRegion !== delta.regionId) return null;
					touchedKeys.set(op.key, delta.regionId);
					if (op.type === "insert" || op.type === "replace") {
						if (scoped) scopedTreeEdit = true;
						if (op.type === "insert") {
							if (present(op.key) || op.beforeKey !== null && !present(op.beforeKey)) return null;
						} else if (!present(op.key)) return null;
						if (scoped && op.type === "replace") {
							const old = bucket.get(op.key);
							if (!old || !isStaticMountedSubtree(old)) return null;
							collectMounted(old);
						}
						const candidates = normalizeMany(op.tree);
						if (candidates.length !== 1 || candidates[0].key !== op.key) return null;
						const candidate = scoped ? snapshotScopedHostTree(candidates[0]) : candidates[0];
						if (!candidate) return null;
						validateUniqueKeys([candidate]);
						if (!validateBindings(candidate)) return null;
						nodes.set(op, candidate);
						candidateRoots.push({
							node: candidate,
							owner: `${delta.regionId}\0${op.key}`
						});
						if (op.type === "replace") {
							if (!scoped) {
								const old = bucket.get(op.key);
								if (old) collectMounted(old);
							}
						} else virtual.set(op.key, true);
					} else if (op.type === "remove") {
						if (!present(op.key)) return null;
						const old = bucket.get(op.key);
						if (old) collectMounted(old);
						virtual.set(op.key, false);
					} else {
						if (!present(op.key) || op.beforeKey !== null && !present(op.beforeKey)) return null;
						if (op.key === op.beforeKey) continue;
					}
				}
				preparedDeltas.push({
					...delta,
					root,
					parent,
					operations,
					nodes,
					bucket,
					bucketRevision,
					parentVNode,
					keyedFootprint
				});
			}
			for (const parent of deltaParents) if (replacedNodes.has(parent)) return null;
			const leafPrepared = /* @__PURE__ */ new Set();
			for (const region of regions) {
				if (!region.key) return null;
				const matches = this.#nodesByKey.get(region.key);
				if (!matches || matches.size !== 1) return null;
				const target = matches.values().next().value;
				const candidates = normalizeMany(region.tree);
				if (!target || target.hostDisposed || candidates.length !== 1 || candidates[0].key !== region.key || !compatible(target.vnode, candidates[0])) return null;
				for (const prior of leafPrepared) if (isAncestor(prior, target) || isAncestor(target, prior)) return null;
				for (const deltaParent of deltaParents) if (isAncestor(deltaParent, target) || isAncestor(target, deltaParent)) return null;
				if (!validateBindings(candidates[0])) return null;
				validateUniqueKeys(candidates);
				if (!collectMounted(target)) return null;
				leafPrepared.add(target);
				candidateRoots.push({
					node: candidates[0],
					owner: `leaf\0${region.key}`
				});
			}
			for (const candidate of candidateRoots) if (!collectCandidateKeys(candidate.node, candidate.owner)) return null;
			for (const key of candidateKeys) {
				const existing = this.#nodesByKey.get(key);
				if (existing && [...existing].some((node) => !replacedNodes.has(node))) return null;
			}
		} catch {
			return null;
		}
		if ((!scoped || scopedTreeEdit) && this.#version !== baseVersion) return null;
		const leafPlan = /* @__PURE__ */ new Map();
		for (const candidate of candidateRoots) if (candidate.owner.startsWith("leaf\0")) {
			const key = candidate.owner.slice(5);
			leafPlan.set(key, candidate.node);
		}
		const preparedLeaves = hasLeafRegions ? this.#prepareKeyedRegions(regions, false, leafPlan) : null;
		if (regions.length > 0 && !preparedLeaves) return null;
		let state = "prepared";
		let released = false;
		let committedVersion = null;
		let committedPublicationToken = null;
		let committedTargets = null;
		const validateTargets = () => preparedDeltas.every(({ root, parent, parentKey, regionId, bucket, bucketRevision, parentVNode, keyedFootprint }) => {
			const entries = this.#nodesByKey.get(parentKey);
			if (root.hostDisposed || parent.hostDisposed || entries?.size !== 1 || !entries.has(root)) return false;
			let found = 0;
			for (const candidate of this.#nodesByKeyedRegion.get(regionId) ?? []) if (isAncestor(root, candidate) && candidate === parent && candidate.keyedChildren && candidate.vnode.kind === "element" && candidate.vnode.keyedRegionId === regionId) found++;
			if (found !== 1) return false;
			if (!scoped) return true;
			if (parent.keyedChildren !== bucket || bucket.structuralRevision !== bucketRevision || parent.vnode !== parentVNode && (parent.vnode.kind !== "element" || parent.vnode.children.length !== 0 || !sameMountedElementHeader(parent.vnode, parentVNode))) return false;
			for (const [key, node] of keyedFootprint) if (bucket.get(key) !== (node ?? void 0) || node !== null && (node.hostDisposed || node.parent !== parent)) return false;
			return true;
		});
		const validateScoped = () => {
			if (!validateTargets()) return false;
			for (const [node, vnode] of replacedVNodeFootprint) if (node.hostDisposed || node.vnode !== vnode) return false;
			for (const key of candidateKeys) {
				const existing = this.#nodesByKey.get(key);
				if (existing && [...existing].some((node) => !replacedNodes.has(node))) return false;
			}
			return true;
		};
		if (scoped && !validateScoped()) return null;
		const hostKeys = Object.freeze([...candidateKeys]);
		const changed = preparedDeltas.some(({ operations }) => operations.length > 0) || hasLeafRegions;
		const program = {
			scoped,
			structuralVersionDelta: changed ? 1 : 0,
			hostKeys,
			overlapsHostReplacementTargets: (keys) => keys.some((key) => {
				const matches = this.#nodesByKey.get(key);
				if (matches?.size !== 1) return true;
				const target = matches.values().next().value;
				return [...deltaParents].some((parent) => isAncestor(parent, target) || isAncestor(target, parent));
			}),
			overlapsRetainedTargets: (delta) => {
				const record = this.#retainedSourceDeltas.get(delta);
				if (!record || record.root !== this) return true;
				const removedHandles = new Set([...replacedNodes].map((node) => node.handle));
				return record.groups.some((group) => removedHandles.has(group.handle));
			},
			overlapsStoreTargets: (delta) => {
				const record = this.#storePropDeltas.get(delta);
				return !record || record.targets.some((target) => replacedNodes.has(target.node));
			},
			validate: () => state === "prepared" && !this.#publicationFailed && hostMethodsCurrent() && (scoped ? validateScoped() : this.#version === baseVersion && validateTargets()) && (!hasLeafRegions || preparedLeaves.validate?.() !== false),
			validatePostHost: () => hostMethodsCurrent() && (!postHostStore || this.#isStorePropDeltaCurrent(postHostStore, true, false)) && program.validatePostHostPrivate(),
			validatePostHostPrivate: () => state === "committed" && committedPublicationToken !== null && this.#publicationToken === committedPublicationToken && !this.#publicationFailed && committedVersion !== null && this.#version === committedVersion + Number(deferVersion && changed) && (!postHostStore || this.#isStorePropDeltaCurrent(postHostStore, true, false, true)) && committedTargets !== null && committedTargets.every((target) => !target.parent.hostDisposed && target.parent.vnode === target.vnode && target.parent.handle === target.handle && target.parent.keyedChildren === target.bucket && target.keys.every(({ key, node, vnode, handle, afterKey }) => target.bucket.get(key) === node && (node === void 0 || !node.hostDisposed && node.parent === target.parent && node.vnode === (postHostStore ? this.#storePropDeltas.get(postHostStore)?.targets.find((candidate) => candidate.node === node)?.next ?? vnode : vnode) && node.handle === handle && target.bucket.afterKey(key) === afterKey && this.#nodesByKey.get(key)?.size === 1 && this.#nodesByKey.get(key)?.has(node) === true))),
			commit: () => {
				if (state !== "prepared") throw new Error("Prepared keyed VDOM program is no longer available");
				if (!program.validate()) {
					program.discard();
					throw new Error("Prepared keyed VDOM program is stale");
				}
				state = "committed";
				const pendingRefsBefore = new Map(this.#pendingRefs);
				const batchCountBefore = this.#partialCommitBatchCount;
				const versionAtApply = this.#version;
				try {
					for (const delta of preparedDeltas) if (delta.operations.length > 0 && !this.#commitKeyedRegionDelta(delta.parentKey, delta.regionId, delta.operations, false, delta.nodes)) throw new Error("Prepared keyed-region delta could not be applied");
					preparedLeaves?.commit();
					this.#pruneSourceColumnCells();
					if (this.#version !== versionAtApply) throw new Error("Prepared keyed VDOM changed during host application");
					if (!hostMethodsCurrent()) throw new Error("Prepared keyed VDOM host methods changed during application");
					committedTargets = preparedDeltas.map(({ parent, bucket, keyedFootprint }) => ({
						parent,
						vnode: parent.vnode,
						handle: parent.handle,
						bucket,
						keys: [...keyedFootprint.keys()].map((key) => {
							const node = bucket.get(key);
							return {
								key,
								node,
								vnode: node?.vnode,
								handle: node?.handle,
								afterKey: node ? bucket.afterKey(key) : null
							};
						})
					}));
					if (changed && !deferVersion) this.#version++;
					committedVersion = this.#version;
					committedPublicationToken = this.#publicationToken;
					this.#partialCommitBatchCount = batchCountBefore + Number(changed && !deferVersion);
				} catch (error) {
					committedTargets = null;
					this.#pendingRefs.clear();
					for (const [node, ref] of pendingRefsBefore) this.#pendingRefs.set(node, ref);
					this.#snapshotDirty = true;
					this.#version++;
					this.#partialCommitBatchCount = batchCountBefore + 1;
					const repairErrors = [];
					try {
						this.#rebuildKeyIndex();
					} catch (repairError) {
						repairErrors.push(repairError);
					}
					try {
						this.#rebuildBindingIndex();
					} catch (repairError) {
						this.#clearBindingIndex();
						repairErrors.push(repairError);
					}
					if (repairErrors.length) throw new AggregateError([error, ...repairErrors], "Prepared keyed VDOM host commit and index repair failed");
					throw error;
				} finally {
					releasePrepared();
				}
			},
			discard: () => {
				if (state === "committed") committedTargets = null;
				releasePrepared();
			}
		};
		function releasePrepared() {
			if (released) return;
			released = true;
			if (state === "prepared") state = "discarded";
			preparedLeaves?.discard?.();
			leafPlan.clear();
			preparedDeltas.length = 0;
			candidateRoots.length = 0;
			candidateKeys.clear();
			candidateKeyOwners.clear();
			replacedNodes.clear();
			replacedVNodeFootprint.clear();
			deltaParents.clear();
			regionIds.clear();
			touchedKeys.clear();
		}
		return program;
	}
	/** Prepare one scoped structural and retained-writer host publication. */
	prepareScopedKeyedAndRetainedDeltas(deltas, updates) {
		if (deltas.length === 0 || updates.length === 0) return null;
		return this.prepareScopedKeyedRetainedAndStoreDeltas(deltas, updates, []);
	}
	/** Prepare static host-subtree replacements against exact mounted footprints. */
	prepareScopedHostSubtreeReplacements(regions) {
		if (!regions.length || this.#publicationToken || this.#publicationFailed || this.#compiledGraph || this.#numericWriteInProgress || this.keyIndexMaintenance !== "delta" || this.bindingIndexMaintenance !== "delta") return null;
		const writer = hostPropWriter(this.host);
		if (!writer) return null;
		const hostMethod = (name) => {
			let object = this.host;
			while (object) {
				const descriptor = Object.getOwnPropertyDescriptor(object, name);
				if (descriptor) return typeof descriptor.value === "function" ? descriptor.value : null;
				object = Object.getPrototypeOf(object);
			}
			return null;
		};
		const methodNames = [
			"createElement",
			"createText",
			"setText",
			"place",
			"remove",
			"dispose",
			"setStyleProp",
			"prepareStyleProp"
		];
		const methods = methodNames.map(hostMethod);
		if (methods.slice(0, 5).some((method) => !method)) return null;
		const targets = [];
		const oldNodes = [];
		const newNodes = [];
		const removedNodes = /* @__PURE__ */ new Set();
		const candidateKeys = /* @__PURE__ */ new Set();
		const collectOld = (node, acceptedVNode) => {
			if (node.hostDisposed || removedNodes.has(node) || node.keyedChildren || node.scalarBindingGroups?.size || node.scalarIncompatibleBindingProps?.size || node.vnode.kind === "element" && node.vnode.keyedRegionId !== null || node.vnode.kind !== acceptedVNode.kind || acceptedVNode.kind === "element" && (node.children.length !== acceptedVNode.children.length || acceptedVNode.keyedRegionId !== null)) return false;
			removedNodes.add(node);
			oldNodes.push({
				node,
				vnode: node.vnode,
				acceptedVNode,
				handle: node.handle,
				parent: node.parent,
				index: node.parentIndex
			});
			return node.vnode.kind === "text" || node.children.every((child, index) => collectOld(child, acceptedVNode.children[index]));
		};
		const collectNext = (node) => {
			if (node.kind === "element" && node.keyedRegionId !== null) return false;
			if (node.key !== null) {
				if (candidateKeys.has(node.key)) return false;
				candidateKeys.add(node.key);
			}
			return node.kind === "text" || node.children.every(collectNext);
		};
		try {
			for (const region of regions) {
				if (!region.key) return null;
				const matches = this.#nodesByKey.get(region.key);
				if (matches?.size !== 1) return null;
				const old = matches.values().next().value;
				const acceptedOld = snapshotScopedHostTree(old.vnode, old);
				if (old.vnode.kind !== "element" || !acceptedOld || !collectOld(old, acceptedOld)) return null;
				const normalized = normalizeMany(region.tree);
				if (normalized.length !== 1 || normalized[0].key !== region.key) return null;
				const next = snapshotScopedHostTree(normalized[0]);
				if (!next || next.kind !== "element" || !collectNext(next)) return null;
				const parent = old.parent;
				const bucket = parent?.keyedChildren;
				targets.push({
					key: region.key,
					old,
					parent,
					index: old.parentIndex,
					bucket,
					afterKey: bucket?.afterKey(region.key) ?? null,
					next,
					applied: null
				});
			}
		} catch {
			return null;
		}
		const current = () => {
			if (this.#publicationFailed || this.#compiledGraph || this.#numericWriteInProgress || hostPropWriter(this.host) !== writer || methodNames.some((name, index) => hostMethod(name) !== methods[index])) return false;
			for (const { node, vnode, handle, parent, index } of oldNodes) {
				if (node.hostDisposed || node.vnode !== vnode || node.handle !== handle || node.parent !== parent || node.parentIndex !== index) return false;
				if (parent) {
					if (parent.hostDisposed || (parent.keyedChildren ? parent.keyedChildren.get(vnode.key) !== node : parent.children[index] !== node)) return false;
				} else if (this.#mounted[index] !== node) return false;
			}
			for (const { key, old, parent, index, bucket, afterKey } of targets) {
				const matches = this.#nodesByKey.get(key);
				if (matches?.size !== 1 || !matches.has(old) || (parent?.keyedChildren ?? void 0) !== bucket || (bucket ? bucket.get(key) !== old || bucket.afterKey(key) !== afterKey : parent ? parent.children[index] !== old : this.#mounted[index] !== old)) return false;
			}
			for (const key of candidateKeys) {
				const matches = this.#nodesByKey.get(key);
				if (matches && [...matches].some((node) => !removedNodes.has(node))) return false;
			}
			return true;
		};
		if (!current()) return null;
		let state = "prepared";
		let appliedVersion = null;
		let appliedToken = null;
		const newCurrent = () => newNodes.every(({ node, vnode, handle, parent, index }) => {
			if (node.hostDisposed || node.vnode !== vnode || node.handle !== handle || node.parent !== parent || node.parentIndex !== index) return false;
			if (parent) {
				if (parent.hostDisposed || (parent.keyedChildren ? parent.keyedChildren.get(vnode.key) !== node : parent.children[index] !== node)) return false;
			} else if (this.#mounted[index] !== node) return false;
			if (vnode.key !== null) {
				const matches = this.#nodesByKey.get(vnode.key);
				if (matches?.size !== 1 || !matches.has(node)) return false;
			}
			return true;
		});
		const captureNew = (node, vnode) => {
			if (!matchesAcceptedCopyCandidate(node.vnode, vnode) || node.hostDisposed || vnode.kind === "element" && (node.children.length !== vnode.children.length || !node.children.every((child, index) => captureNew(child, vnode.children[index])))) return false;
			newNodes.push({
				node,
				vnode: node.vnode,
				handle: node.handle,
				parent: node.parent,
				index: node.parentIndex
			});
			return true;
		};
		const program = {
			scoped: true,
			structuralVersionDelta: 1,
			hostKeys: Object.freeze([...candidateKeys]),
			overlapsRetainedTargets: (delta) => {
				const record = this.#retainedSourceDeltas.get(delta);
				return !record || record.groups.some((group) => [...removedNodes].some((node) => node.handle === group.handle));
			},
			overlapsStoreTargets: (delta) => {
				const record = this.#storePropDeltas.get(delta);
				return !record || record.targets.some((target) => removedNodes.has(target.node));
			},
			validate: () => state === "prepared" && !this.#publicationToken && current(),
			validatePostHost: () => hostPropWriter(this.host) === writer && methodNames.every((name, index) => hostMethod(name) === methods[index]) && program.validatePostHostPrivate(),
			validatePostHostPrivate: () => state === "committed" && appliedToken !== null && this.#publicationToken === appliedToken && !this.#publicationFailed && this.#version === appliedVersion && newCurrent() && targets.every(({ key, parent, index, bucket, afterKey, applied, next }) => {
				if (!applied || applied.hostDisposed || applied.parent !== parent || !matchesAcceptedCopyCandidate(applied.vnode, next) || parent?.hostDisposed || this.#nodesByKey.get(key)?.size !== 1 || !this.#nodesByKey.get(key)?.has(applied)) return false;
				return bucket ? parent?.keyedChildren === bucket && bucket.get(key) === applied && bucket.afterKey(key) === afterKey : parent ? parent.children[index] === applied : this.#mounted[index] === applied;
			}),
			commit: () => {
				if (state !== "prepared" || !this.#publicationToken || !current()) throw new Error("Prepared scoped host subtree replacement is stale");
				state = "committed";
				const pendingRefs = new Map(this.#pendingRefs);
				const baseVersion = this.#version;
				for (const { node, acceptedVNode } of oldNodes) {
					this.#acceptedJournal?.capture(node, acceptedVNode);
					node.vnode = acceptedVNode;
				}
				this.#acceptedSnapshot = null;
				const keyIndex = {
					detach: (node) => this.#removeFromKeyIndex(node),
					attach: (node) => this.#addToKeyIndex(node)
				};
				const created = [];
				const createdByHandle = /* @__PURE__ */ new Map();
				const track = (handle) => {
					const entry = {
						handle,
						placedParent: void 0,
						disposed: false
					};
					created.push(entry);
					createdByHandle.set(handle, entry);
					return handle;
				};
				const host = {
					createElement: (tag, parent, props) => track(this.#renderHost.createElement(tag, parent, props)),
					createText: (text) => track(this.#renderHost.createText(text)),
					setText: (node, text) => this.#renderHost.setText(node, text),
					setProp: (node, name, value, previous) => this.#renderHost.setProp(node, name, value, previous),
					capturePropertyValue: this.#renderHost.capturePropertyValue ? (node, name, value) => this.#renderHost.capturePropertyValue(node, name, value) : void 0,
					setStyleProp: this.#renderHost.setStyleProp ? (node, name, value, previous) => this.#renderHost.setStyleProp(node, name, value, previous) : void 0,
					prepareStyleProp: this.#renderHost.prepareStyleProp ? (node, name) => this.#renderHost.prepareStyleProp(node, name) : void 0,
					place: (parent, node, before) => {
						const entry = createdByHandle.get(node);
						if (entry) entry.placedParent = parent;
						this.#renderHost.place(parent, node, before);
					},
					remove: (parent, node) => {
						this.#renderHost.remove(parent, node);
						const entry = createdByHandle.get(node);
						if (entry) entry.placedParent = void 0;
					},
					dispose: this.#renderHost.dispose ? (node) => {
						const entry = createdByHandle.get(node);
						if (entry) entry.disposed = true;
						this.#renderHost.dispose(node);
					} : void 0
				};
				if (this.#acceptedJournal) acceptedJournalByHost.set(host, this.#acceptedJournal);
				try {
					for (const target of targets) {
						const { old, parent, index, bucket, key, next } = target;
						const hostParent = parent ? parent.handle : this.container;
						let applied;
						if (compatible(old.vnode, next)) applied = updateMounted(host, hostParent, old, next, keyIndex);
						else {
							this.#acceptedJournal?.capture(old);
							if (parent) this.#acceptedJournal?.capture(parent);
							visitMountedSubtree(old, keyIndex.detach);
							removeMountedSubtree(host, hostParent, old);
							applied = createMounted(host, next, hostParent, keyIndex);
							target.applied = applied;
							applied.parent = parent;
							applied.parentIndex = index;
							const anchor = bucket ? target.afterKey === null ? null : bucket.get(target.afterKey).handle : parent ? parent.children[index + 1]?.handle ?? null : this.#mounted[index + 1]?.handle ?? null;
							host.place(hostParent, applied.handle, anchor);
							if (bucket) {
								this.#acceptedJournal?.record(bucket, {
									kind: "replace",
									oldKey: key,
									newKey: key,
									child: old
								});
								bucket.replace(key, key, applied);
							} else if (parent) {
								const children = parent.children.slice();
								children[index] = applied;
								parent.children = children;
								if (parent.vnode.kind === "element") parent.vnode = cloneMountedElementVNode(parent.vnode, { children: children.map((child) => child.vnode) });
							} else {
								const roots = this.#mounted.slice();
								roots[index] = applied;
								this.#mounted = roots;
							}
						}
						target.applied = applied;
					}
					newNodes.length = 0;
					if (!targets.every((target) => target.applied && captureNew(target.applied, target.next)) || !newCurrent() || this.#version !== baseVersion || hostPropWriter(this.host) !== writer || methodNames.some((name, index) => hostMethod(name) !== methods[index])) throw new Error("Scoped host subtree changed during application");
					this.#snapshotDirty = true;
					this.#version++;
					this.#partialCommitCount++;
					this.#partialCommitBatchCount++;
					appliedVersion = this.#version;
					appliedToken = this.#publicationToken;
				} catch (error) {
					const errors = [];
					for (let index = created.length - 1; index >= 0; index--) {
						const entry = created[index];
						if (entry.placedParent !== void 0) try {
							this.#renderHost.remove(entry.placedParent, entry.handle);
						} catch (failure) {
							errors.push(failure);
						}
						if (!entry.disposed && this.#renderHost.dispose) {
							entry.disposed = true;
							try {
								this.#renderHost.dispose(entry.handle);
							} catch (failure) {
								errors.push(failure);
							}
						}
					}
					for (const target of targets) if (target.applied) visitMountedSubtree(target.applied, (node) => {
						if (createdByHandle.has(node.handle)) node.hostDisposed = true;
					});
					this.#pendingRefs.clear();
					for (const [node, ref] of pendingRefs) this.#pendingRefs.set(node, ref);
					this.#snapshotDirty = true;
					this.#version++;
					try {
						this.#rebuildKeyIndex();
					} catch (failure) {
						errors.push(failure);
					}
					try {
						this.#rebuildBindingIndex();
					} catch (failure) {
						this.#clearBindingIndex();
						errors.push(failure);
					}
					if (errors.length) throw new AggregateError([error, ...errors], "Scoped host subtree replacement and repair failed", { cause: error });
					throw error;
				} finally {
					acceptedJournalByHost.delete(host);
				}
			},
			discard: () => {
				state = "discarded";
				targets.length = 0;
				oldNodes.length = 0;
				newNodes.length = 0;
				removedNodes.clear();
				candidateKeys.clear();
			}
		};
		return program;
	}
	/** Prepare one scoped keyed, retained-source and Store-prop publication. */
	prepareScopedKeyedRetainedAndStoreDeltas(deltas, updates, storeRegions, replacements = []) {
		if (!deltas.length && !updates.length && !storeRegions.length && !replacements.length) return null;
		const retained = updates.length ? this.prepareRetainedSourceDelta(updates) : null;
		if (updates.length && !retained) return null;
		const store = storeRegions.length ? this.prepareStorePropDelta(storeRegions) : null;
		if (storeRegions.length && !store) return null;
		const keyed = deltas.length ? this.#prepareKeyedRegionDeltas(deltas, [], { scoped: true }, replacements.length > 0, store) : null;
		const replacement = replacements.length ? this.prepareScopedHostSubtreeReplacements(replacements) : null;
		const structural = [keyed, replacement].filter((plan) => plan !== null);
		const overlap = keyed && replacement && (keyed.overlapsHostReplacementTargets?.(replacements.map(({ key }) => key)) || (keyed.hostKeys ?? []).some((key) => replacement.hostKeys?.includes(key)));
		if ((deltas.length || replacements.length) && (deltas.length && !keyed || replacements.length && !replacement) || overlap || structural.some((plan) => plan.structuralVersionDelta !== 1 || !plan.validate()) || retained && structural.some((plan) => plan.overlapsRetainedTargets(retained)) || store && structural.some((plan) => plan.overlapsStoreTargets(store)) || retained && !this.#isRetainedSourceDeltaCurrent(retained, void 0, true) || store && !this.isStorePropDeltaCurrent(store)) {
			keyed?.discard();
			replacement?.discard();
			return null;
		}
		let state = "prepared";
		return {
			scoped: true,
			structuralVersionDelta: structural.length ? 1 : 0,
			readSources: retained?.readSources ?? [],
			overlapsRetainedTargets: (delta) => structural.some((plan) => plan.overlapsRetainedTargets(delta)),
			overlapsStoreTargets: (delta) => structural.some((plan) => plan.overlapsStoreTargets(delta)),
			validate: () => state === "prepared" && structural.every((plan) => plan.validate()) && (!retained || structural.every((plan) => !plan.overlapsRetainedTargets(retained))) && (!store || structural.every((plan) => !plan.overlapsStoreTargets(store))) && (!retained || this.#isRetainedSourceDeltaCurrent(retained, void 0, true)) && (!store || this.isStorePropDeltaCurrent(store)),
			validatePostHost: () => state === "committed" && structural.every((plan) => plan.validatePostHost()) && (!retained || this.#isRetainedSourceDeltaCurrent(retained, { afterHost: true }, true)) && (!store || this.isStorePropDeltaCurrent(store, { afterHost: true })),
			validatePostHostPrivate: () => state === "committed" && structural.every((plan) => plan.validatePostHostPrivate()) && (!retained || this.#isRetainedSourceDeltaCurrent(retained, { afterHost: true }, true)) && (!store || this.#isStorePropDeltaCurrent(store, true, false, true)),
			commit: () => {
				if (state !== "prepared" || !this.#publicationToken || keyed && !keyed.validate() || retained && structural.some((plan) => plan.overlapsRetainedTargets(retained)) || store && structural.some((plan) => plan.overlapsStoreTargets(store)) || store && !this.#isStorePropDeltaCurrent(store, false, true)) throw new Error("Prepared scoped VDOM transaction is stale");
				state = "committed";
				if (retained) this.#applyRetainedSourceDelta(retained, true);
				keyed?.commit();
				replacement?.commit();
				if (store) this.applyStorePropDelta(store);
			},
			discard: () => {
				if (state === "discarded") return;
				if (state === "prepared") state = "discarded";
				keyed?.discard();
				replacement?.discard();
			}
		};
	}
	/**
	* Prepare a coherent host candidate for disjoint, globally keyed regions.
	* Returns null when the current root or candidate cannot use the incremental
	* ordinary-binding path. The returned handle is one-shot and checks the root
	* version again before it mutates any host nodes.
	*/
	prepareKeyedRegions(regions) {
		return this.#prepareKeyedRegions(regions, true);
	}
	#prepareKeyedRegions(regions, incrementVersion, normalizedOverrides) {
		if (regions.length === 0 || this.#compiledGraph !== null || this.bindingIndexMaintenance !== "delta" || this.keyIndexMaintenance !== "delta") return null;
		const preparedVersion = this.#version;
		const prepared = [];
		const replacedNodes = /* @__PURE__ */ new Set();
		const candidateKeys = /* @__PURE__ */ new Set();
		const seenTargets = /* @__PURE__ */ new Set();
		const countVisits = this.#profileCounter !== void 0;
		let validationNodeVisits = 0;
		let oldSubtreeVisits = 0;
		let newCandidateKeyVisits = 0;
		const validateCandidate = (node) => {
			if (countVisits) validationNodeVisits++;
			if (node.kind === "text") return true;
			for (const [name, value] of Object.entries(node.props)) {
				if (hasNonScalarBindingMetadata(name, value)) return false;
				if (compiledBindingsIn(name, value).length > 0) return false;
				boundSourcesIn(name, value);
			}
			return node.children.every(validateCandidate);
		};
		for (const region of regions) {
			if (!region.key || seenTargets.has(region.key)) return null;
			seenTargets.add(region.key);
			const matches = this.#nodesByKey.get(region.key);
			if (!matches || matches.size !== 1) return null;
			const target = matches.values().next().value;
			const normalized = normalizedOverrides?.has(region.key) ? [normalizedOverrides.get(region.key)] : normalizeMany(region.tree);
			if (normalized.length !== 1) return null;
			const next = normalized[0];
			try {
				validateUniqueKeys([next]);
			} catch {
				return null;
			}
			if (!target || target.hostDisposed || next.key !== region.key || !compatible(target.vnode, next)) return null;
			try {
				if (!validateCandidate(next)) return null;
			} catch {
				return null;
			}
			const collectOld = (node) => {
				if (countVisits) oldSubtreeVisits++;
				if (replacedNodes.has(node)) return false;
				replacedNodes.add(node);
				forEachMountedChild(node, (child) => {
					if (!collectOld(child)) overlappingSubtree = true;
				});
				return !overlappingSubtree;
			};
			let overlappingSubtree = false;
			if (!collectOld(target) || overlappingSubtree) return null;
			prepared.push({
				target,
				next
			});
		}
		const collectCandidateKeys = (node) => {
			if (countVisits) newCandidateKeyVisits++;
			if (node.kind === "text") return true;
			if (node.key !== null) {
				if (candidateKeys.has(node.key)) return false;
				candidateKeys.add(node.key);
			}
			return node.children.every(collectCandidateKeys);
		};
		for (const { next } of prepared) if (!collectCandidateKeys(next)) return null;
		for (const key of candidateKeys) {
			const existing = this.#nodesByKey.get(key);
			if (existing && [...existing].some((node) => !replacedNodes.has(node))) return null;
		}
		if (this.#version !== preparedVersion) return null;
		let committed = false;
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			committed = true;
			prepared.length = 0;
			replacedNodes.clear();
			candidateKeys.clear();
			seenTargets.clear();
		};
		return {
			validate: () => !committed && this.#version === preparedVersion && prepared.every(({ target }) => {
				const entries = target.vnode.key === null ? void 0 : this.#nodesByKey.get(target.vnode.key);
				return !target.hostDisposed && entries?.size === 1 && entries.has(target);
			}),
			discard: release,
			commit: () => {
				if (committed) throw new Error("Prepared VDOM commit can only be applied once");
				committed = true;
				if (this.#version !== preparedVersion || prepared.some(({ target }) => {
					const entries = target.vnode.key === null ? void 0 : this.#nodesByKey.get(target.vnode.key);
					return target.hostDisposed || entries?.size !== 1 || !entries.has(target);
				})) {
					release();
					throw new Error("Prepared VDOM keyed-region candidate is stale");
				}
				let oldIndexVisits = 0;
				let newIndexVisits = 0;
				const keyIndex = {
					detach: (node) => {
						if (countVisits) oldIndexVisits++;
						this.#removeFromKeyIndex(node);
						this.#detachScalarBindingNode(node);
					},
					attach: (node) => {
						if (countVisits) newIndexVisits++;
						this.#addToKeyIndex(node);
						this.#attachScalarBindingNode(node);
					},
					detachKey: (node) => {
						if (countVisits) oldIndexVisits++;
						this.#removeFromKeyIndex(node);
					},
					attachKey: (node) => {
						if (countVisits) newIndexVisits++;
						this.#addToKeyIndex(node);
					},
					refreshProp: (node, name, value, acceptedCopy) => this.#refreshScalarBindingProp(node, name, value, acceptedCopy)
				};
				const bindingAttachStart = this.#bindingIndexAttachOperations;
				const bindingDetachStart = this.#bindingIndexDetachOperations;
				const bindingIndexStart = this.#bindingIndexIndexOperations;
				const pendingRefsBeforeCommit = new Map(this.#pendingRefs);
				const preparedCount = prepared.length;
				try {
					for (const { target, next } of prepared) {
						const parent = target.parent ? target.parent.handle : this.container;
						updateMounted(this.#renderHost, parent, target, next, keyIndex);
					}
				} catch (error) {
					this.#pendingRefs.clear();
					for (const [node, ref] of pendingRefsBeforeCommit) this.#pendingRefs.set(node, ref);
					this.#snapshotDirty = true;
					if (incrementVersion) this.#version++;
					const repairErrors = [];
					try {
						this.#rebuildKeyIndex();
					} catch (repairError) {
						repairErrors.push(repairError);
					}
					try {
						this.#rebuildBindingIndex();
					} catch (repairError) {
						this.#clearBindingIndex();
						repairErrors.push(repairError);
					}
					if (repairErrors.length > 0) throw new AggregateError([error, ...repairErrors], "VDOM keyed-region host commit and index repair failed");
					throw error;
				} finally {
					release();
				}
				this.#pruneSourceColumnCells();
				this.#snapshotDirty = true;
				if (incrementVersion) this.#version++;
				this.#partialCommitCount += preparedCount;
				this.#partialCommitBatchCount++;
				if (countVisits) this.#profileCounter?.({
					"vdom.prepared-keyed-regions.validation-node-visits": validationNodeVisits,
					"vdom.prepared-keyed-regions.old-subtree-visits": oldSubtreeVisits,
					"vdom.prepared-keyed-regions.new-candidate-key-visits": newCandidateKeyVisits,
					"vdom.key-index.incremental-old-visits": oldIndexVisits,
					"vdom.key-index.incremental-new-visits": newIndexVisits,
					"vdom.binding-index.incremental-group-detaches": this.#bindingIndexDetachOperations - bindingDetachStart,
					"vdom.binding-index.incremental-group-attaches": this.#bindingIndexAttachOperations - bindingAttachStart,
					"vdom.binding-index.incremental-index-operations": this.#bindingIndexIndexOperations - bindingIndexStart
				});
			}
		};
	}
	/**
	* Atomically prepare and patch several disjoint, globally keyed host regions.
	* Returns false without changing the host if any target is missing,
	* incompatible, bound, duplicated, or would collide with a surviving key.
	*/
	commitKeyedRegions(regions) {
		if (this.#directBindingWrites) {
			const prepared = this.prepareKeyedRegions(regions);
			if (!prepared) return false;
			prepared.commit();
			return true;
		}
		if (regions.length === 0 || this.#compiledGraph || this.#directBindingWrites || this.#groupsBySource.size > 0) return false;
		const seenTargetKeys = /* @__PURE__ */ new Set();
		const replacedNodes = /* @__PURE__ */ new Set();
		const prepared = [];
		for (const region of regions) {
			if (!region.key || seenTargetKeys.has(region.key)) return false;
			seenTargetKeys.add(region.key);
			const matches = this.#nodesByKey.get(region.key);
			if (!matches || matches.size !== 1) return false;
			const target = matches.values().next().value;
			const normalized = normalizeMany(region.tree);
			if (normalized.length !== 1) return false;
			const next = normalized[0];
			try {
				validateUniqueKeys([next]);
			} catch {
				return false;
			}
			if (!target || next.key !== region.key || !compatible(target.vnode, next)) return false;
			if (replacedNodes.has(target)) return false;
			const collect = (node) => {
				replacedNodes.add(node);
				forEachMountedChild(node, collect);
			};
			collect(target);
			prepared.push({
				key: region.key,
				target,
				next
			});
		}
		const candidateKeys = /* @__PURE__ */ new Set();
		const collectCandidateKeys = (node) => {
			if (node.kind !== "element") return true;
			if (node.key !== null) {
				if (candidateKeys.has(node.key)) return false;
				candidateKeys.add(node.key);
			}
			return node.children.every(collectCandidateKeys);
		};
		for (const item of prepared) if (!collectCandidateKeys(item.next)) return false;
		for (const key of candidateKeys) {
			const existing = this.#nodesByKey.get(key);
			if (existing && [...existing].some((node) => !replacedNodes.has(node))) return false;
		}
		let oldIndexVisits = 0;
		let newIndexVisits = 0;
		const countIndexVisits = this.#profileCounter !== void 0;
		const previousSubtrees = [];
		if (this.keyIndexMaintenance === "rebuild") {
			for (const item of prepared) {
				const previousSubtree = [];
				const collect = (node) => {
					previousSubtree.push({
						node,
						key: node.vnode.key
					});
					if (countIndexVisits) oldIndexVisits++;
					forEachMountedChild(node, collect);
				};
				collect(item.target);
				previousSubtrees.push(previousSubtree);
			}
			for (const subtree of previousSubtrees) for (const { node, key: oldKey } of subtree) if (oldKey !== null) this.#removeKeyFromIndex(oldKey, node);
		}
		const keyIndex = this.keyIndexMaintenance === "delta" ? {
			detach: (node) => {
				if (countIndexVisits) oldIndexVisits++;
				this.#removeFromKeyIndex(node);
			},
			attach: (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
			}
		} : void 0;
		for (const item of prepared) {
			const parent = item.target.parent ? item.target.parent.handle : this.container;
			updateMounted(this.#renderHost, parent, item.target, item.next, keyIndex);
		}
		if (this.keyIndexMaintenance === "rebuild") {
			const indexSubtree = (node) => {
				if (countIndexVisits) newIndexVisits++;
				this.#addToKeyIndex(node);
				forEachMountedChild(node, indexSubtree);
			};
			for (const item of prepared) indexSubtree(item.target);
		}
		this.#snapshotDirty = true;
		this.#version++;
		this.#partialCommitCount += prepared.length;
		this.#partialCommitBatchCount++;
		if (countIndexVisits) this.#profileCounter?.(this.keyIndexMaintenance === "delta" ? {
			"vdom.key-index.incremental-old-visits": oldIndexVisits,
			"vdom.key-index.incremental-new-visits": newIndexVisits
		} : {
			"vdom.key-index.subtree-rescan-old-visits": oldIndexVisits,
			"vdom.key-index.subtree-rescan-new-visits": newIndexVisits
		});
		return true;
	}
	/**
	* Update every retained VDOM prop that depends on this source. The VDOM tree
	* is not re-walked; work follows the source-to-prop index built at commit.
	*/
	setSource(source, value) {
		return this.setSources([[source, value]]);
	}
	/** Whether this committed VDOM currently retains props bound to a source. */
	hasBoundSource(source) {
		const groups = this.#compiledGraph ? this.#groupsByCompiledSource.get(source) : this.#groupsBySource.get(source);
		return !!groups && (groups instanceof Set ? groups.size : groups.length) > 0;
	}
	/** Prepare closed prop writes on exact mounted, globally keyed host leaves. */
	prepareStorePropDelta(regions) {
		if (this.#publicationToken || this.#publicationFailed || this.#compiledGraph !== null || this.#numericWriteInProgress || regions.length === 0) return null;
		const writer = hostPropWriter(this.host);
		if (!writer) return null;
		const seen = /* @__PURE__ */ new Set();
		const targets = [];
		const texts = [];
		for (const region of regions) {
			if (!region.key || !region.tag || seen.has(region.key) || region.children === void 0 && region.props.length === 0) return null;
			seen.add(region.key);
			const matches = this.#nodesByKey.get(region.key);
			if (matches?.size !== 1) return null;
			const node = matches.values().next().value;
			const vnode = node.vnode;
			if (node.hostDisposed || vnode.kind !== "element" || vnode.key !== region.key || vnode.tag !== region.tag || vnode.keyedRegionId !== null || region.children === void 0 && node.children.length !== 0 || node.keyedChildren || node.scalarBindingGroups?.size || node.scalarIncompatibleBindingProps?.size) return null;
			if (region.children !== void 0) {
				if (node.children.length !== region.children.length || vnode.children.length !== region.children.length) return null;
				for (let index = 0; index < region.children.length; index++) {
					const description = region.children[index];
					const child = node.children[index];
					const childVNode = vnode.children[index];
					if (!child || child.hostDisposed || child.parent !== node || child.parentIndex !== index || child.vnode.kind !== childVNode.kind) return null;
					if (description.kind === "host") {
						if (child.vnode.kind !== "element" || childVNode.kind !== "element" || child.vnode.key !== description.key || child.vnode.tag !== description.tag || childVNode.key !== description.key || childVNode.tag !== description.tag) return null;
					} else {
						if (typeof description.text !== "string" || child.vnode.kind !== "text" || childVNode.kind !== "text") return null;
						texts.push({
							node: child,
							vnode: child.vnode,
							next: {
								...child.vnode,
								text: description.text
							},
							handle: child.handle,
							parent: node,
							index
						});
					}
				}
			}
			let descriptors;
			try {
				descriptors = Object.getOwnPropertyDescriptors(vnode.props);
			} catch {
				return null;
			}
			const capture = (name, value, previous) => {
				try {
					if (name === "ref" || /^on[A-Z]/.test(name)) return null;
					if ((name === "style" || name === "position" || name === "rotation" || name === "scale") && previous && !Object.isFrozen(value)) return null;
					if ((name === "position" || name === "rotation" || name === "scale") && !previous && !Object.isFrozen(value)) return null;
					return snapshotScopedHostProp(vnode.tag, name, value);
				} catch {
					return null;
				}
			};
			const nextProps = {};
			for (const [name, descriptor] of Object.entries(descriptors)) {
				if (!("value" in descriptor)) return null;
				const captured = capture(name, descriptor.value, true);
				if (!captured?.accepted || captured.value === void 0) return null;
				if (vnode.scopedSourceProps) {
					let authored;
					try {
						authored = Object.getOwnPropertyDescriptor(vnode.scopedSourceProps, name);
					} catch {
						return null;
					}
					if (!authored || !("value" in authored) || !capture(name, authored.value, false)?.accepted) return null;
				}
				nextProps[name] = captured.value;
			}
			const names = /* @__PURE__ */ new Set();
			const writes = [];
			for (const [name, proposed] of region.props) {
				const prior = descriptors[name];
				if (names.has(name) || !prior || !("value" in prior)) return null;
				names.add(name);
				const captured = capture(name, proposed, false);
				if (!captured?.accepted || captured.value === void 0) return null;
				const next = captured.value;
				const previous = nextProps[name];
				nextProps[name] = next;
				writes.push([
					name,
					next,
					previous
				]);
			}
			const parent = node.parent;
			const next = {
				...vnode,
				props: Object.freeze(nextProps)
			};
			targets.push({
				node,
				vnode,
				handle: node.handle,
				parent,
				parentIndex: node.parentIndex,
				bucket: parent?.keyedChildren,
				writes,
				next,
				...region.children === void 0 ? {} : {
					children: [...node.children],
					childVNodes: node.children.map((child) => child.vnode)
				}
			});
		}
		const byNode = new Map(targets.map((target) => [target.node, target]));
		const textByNode = new Map(texts.map((target) => [target.node, target]));
		for (const target of targets) {
			if (!target.children) continue;
			for (const child of target.children) if (child.vnode.kind === "element" && !byNode.has(child)) return null;
		}
		const completed = /* @__PURE__ */ new Map();
		const nextVNode = (target) => {
			const existing = completed.get(target.node);
			if (existing) return existing;
			const next = !target.children ? target.next : cloneMountedElementVNode(target.next, { children: target.children.map((child) => child.vnode.kind === "text" ? textByNode.get(child).next : nextVNode(byNode.get(child))) });
			completed.set(target.node, next);
			return next;
		};
		for (const target of targets) nextVNode(target);
		for (const target of targets) target.next = completed.get(target.node);
		for (const target of targets) if (target.children) target.nextChildVNodes = target.next.children;
		const textWriter = texts.length ? hostTextWriter(this.host) : null;
		if (texts.length && !textWriter) return null;
		const token = Object.freeze({});
		this.#storePropDeltas.set(token, {
			targets,
			texts,
			writer,
			textWriter,
			applied: false,
			publicationToken: null,
			appliedVersion: null
		});
		if (!this.isStorePropDeltaCurrent(token)) return null;
		return token;
	}
	/** Validate exact mounted writers without requiring an unrelated root version. */
	isStorePropDeltaCurrent(token, options = {}) {
		return this.#isStorePropDeltaCurrent(token, options.afterHost === true, false);
	}
	#isStorePropDeltaCurrent(token, afterHost, allowActivePublication, privateOnly = false) {
		const record = this.#storePropDeltas.get(token);
		if (!record || this.#publicationFailed || this.#compiledGraph !== null || !privateOnly && hostPropWriter(this.host) !== record.writer || !privateOnly && record.texts.length > 0 && hostTextWriter(this.host) !== record.textWriter || this.#numericWriteInProgress) return false;
		if (afterHost) {
			if (!record.applied || !record.publicationToken || this.#publicationToken !== record.publicationToken || this.#version !== record.appliedVersion) return false;
		} else if (record.applied || (allowActivePublication ? !this.#publicationToken : !!this.#publicationToken)) return false;
		for (const target of record.targets) {
			const { node, vnode, parent, bucket } = target;
			if (node.hostDisposed || node.handle !== target.handle || node.parent !== parent || node.vnode !== (afterHost ? target.next : vnode) || this.#nodesByKey.get(vnode.key)?.size !== 1 || !this.#nodesByKey.get(vnode.key)?.has(node) || node.scalarBindingGroups?.size || node.scalarIncompatibleBindingProps?.size) return false;
			if (parent) {
				if (parent.hostDisposed || parent.keyedChildren !== bucket || (bucket ? bucket.get(vnode.key) !== node : parent.children[target.parentIndex] !== node)) return false;
			} else if (this.#mounted[target.parentIndex] !== node) return false;
			if (target.children) {
				if (node.keyedChildren || node.children.length !== target.children.length) return false;
				for (let index = 0; index < target.children.length; index++) {
					const child = target.children[index];
					if (node.children[index] !== child || child.hostDisposed || child.parent !== node || child.parentIndex !== index || child.vnode !== (afterHost ? target.nextChildVNodes?.[index] : target.childVNodes?.[index])) return false;
				}
			}
		}
		for (const target of record.texts) if (target.node.hostDisposed || target.node.handle !== target.handle || target.parent.hostDisposed || target.node.parent !== target.parent || target.parent.children[target.index] !== target.node || target.node.parentIndex !== target.index || target.node.vnode !== (afterHost ? target.next : target.vnode)) return false;
		return true;
	}
	/** Apply a prepared primitive cut inside the shared active publication. */
	applyStorePropDelta(token) {
		const record = this.#storePropDeltas.get(token);
		if (!record || !this.#isStorePropDeltaCurrent(token, false, true)) throw new Error("Prepared Store prop delta is stale");
		record.applied = true;
		const versionAtApply = this.#version;
		for (const target of record.targets) {
			this.#acceptedJournal?.capture(target.node);
			for (const [name, next, previous] of target.writes) if (!Object.is(previous, next)) record.writer.call(this.host, target.handle, name, next, previous);
		}
		for (const target of record.texts) {
			this.#acceptedJournal?.capture(target.node);
			if (target.vnode.text !== target.next.text) record.textWriter.call(this.host, target.handle, target.next.text);
		}
		if (this.#version !== versionAtApply || record.targets.some((target) => target.node.vnode !== target.vnode) || record.texts.some((target) => target.node.vnode !== target.vnode)) throw new Error("Prepared Store prop delta changed during host application");
		for (const target of record.targets) target.node.vnode = target.next;
		for (const target of record.texts) target.node.vnode = target.next;
		this.#snapshotDirty = true;
		record.publicationToken = this.#publicationToken;
		record.appliedVersion = this.#version;
	}
	/** Prepare only the compiler-proven retained writers reached by this cut. */
	prepareRetainedSourceDelta(updates) {
		if (this.#publicationToken || this.#publicationFailed || this.#numericWriteInProgress || updates.length === 0) return null;
		const structuralVersion = this.#version;
		const seen = /* @__PURE__ */ new Set();
		const selected = /* @__PURE__ */ new Set();
		for (const [source, value] of updates) {
			if (seen.has(source) || typeof value !== "number" || !Object.is(source.value, value)) return null;
			seen.add(source);
			const slot = this.#programSourceSlots.get(source);
			const groups = this.#groupsBySource.get(source);
			if (!slot?.eligible || !groups?.size) return null;
			for (const group of groups) selected.add(group);
		}
		const readSources = [];
		const readValues = [];
		const readIndices = /* @__PURE__ */ new Map();
		const groups = [];
		const generations = [];
		const sourceValues = [];
		const outputs = [];
		for (const group of selected) {
			const binding = getBoundValue(group.rawValue);
			const descriptor = binding?.numericProgram;
			if (!binding || !descriptor || group.column !== void 0 || group.sources.length === 0 || group.sources.some((source) => !this.#groupsBySource.get(source)?.has(group) || !this.#programSourceSlots.get(source)?.eligible)) return null;
			const expression = closedExpressionForBinding(binding);
			if (!expression) return null;
			for (const source of group.sources) {
				if (readIndices.has(source)) continue;
				const value = source.value;
				if (typeof value !== "number") return null;
				readIndices.set(source, readSources.length);
				readSources.push(source);
				readValues.push(value);
			}
			const generation = group.acceptedWriteGeneration ?? 0;
			const output = evaluateClosedNumericExpression(expression, group.sources.map((source) => readValues[readIndices.get(source)]));
			if (!isCompiledOwnerUpdatePrimitive(output)) return null;
			groups.push(group);
			generations.push(generation);
			sourceValues.push(readValues[readIndices.get(group.sources[0])]);
			outputs.push(output);
		}
		if (groups.length === 0 || readSources.some((source, index) => !Object.is(source.value, readValues[index])) || this.#publicationToken || this.#publicationFailed || this.#numericWriteInProgress) return null;
		const token = Object.freeze({ readSources: Object.freeze(readSources) });
		this.#retainedSourceDeltas.set(token, {
			root: this,
			structuralVersion,
			readSources,
			readValues,
			groups,
			generations,
			sourceValues,
			outputs,
			applied: false
		});
		if (!this.isRetainedSourceDeltaCurrent(token)) {
			this.#retainedSourceDeltas.delete(token);
			return null;
		}
		return token;
	}
	/** Validate writer lifetime and accepted overlap after unrelated prop cuts. */
	isRetainedSourceDeltaCurrent(delta, options) {
		return this.#isRetainedSourceDeltaCurrent(delta, options, false);
	}
	#isRetainedSourceDeltaCurrent(delta, options, scoped) {
		const record = this.#retainedSourceDeltas.get(delta);
		if (!record || record.root !== this || this.#publicationFailed || !scoped && this.#version !== record.structuralVersion || !options?.afterHost && (this.#publicationToken !== null || record.applied) || options?.afterHost && (!this.#publicationToken || !record.applied)) return false;
		for (let index = 0; index < record.readSources.length; index++) if (!options?.afterHost && !Object.is(record.readSources[index].value, record.readValues[index])) return false;
		for (let index = 0; index < record.groups.length; index++) {
			const group = record.groups[index];
			if ((group.acceptedWriteGeneration ?? 0) !== record.generations[index] || !this.#programSinkSlotByGroup.has(group) || !closedExpressionForBinding(group.rawValue) || group.sources.some((source) => !this.#groupsBySource.get(source)?.has(group) || !this.#programSourceSlots.get(source)?.eligible)) return false;
		}
		return true;
	}
	/** Apply a projected cut inside the Root's active host publication. */
	applyRetainedSourceDelta(delta) {
		return this.#applyRetainedSourceDelta(delta, false);
	}
	#applyRetainedSourceDelta(delta, scoped) {
		const record = this.#retainedSourceDeltas.get(delta);
		if (!record || !this.#publicationToken || record.applied || this.#publicationFailed || !scoped && this.#version !== record.structuralVersion || record.readSources.some((source, index) => !Object.is(source.value, record.readValues[index])) || record.groups.some((group, index) => (group.acceptedWriteGeneration ?? 0) !== record.generations[index] || !this.#programSinkSlotByGroup.has(group) || !closedExpressionForBinding(group.rawValue) || group.sources.some((source) => !this.#groupsBySource.get(source)?.has(group) || !this.#programSourceSlots.get(source)?.eligible))) throw new Error("Retained source delta is stale");
		return this.#withNumericWriteGuard(() => {
			let wrote = false;
			for (let index = 0; index < record.groups.length; index++) {
				const group = record.groups[index];
				const next = record.outputs[index];
				const preparedCopy = this.#prepareBoundCopy(group, next);
				const prepared = preparedCopy ?? next;
				const shouldWrite = !sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy);
				if (shouldWrite) {
					this.#writeBoundGroup(group, prepared, !!preparedCopy);
					wrote = true;
				}
				this.#stageLastValue(group, shouldWrite ? prepared : this.#effectiveLastValue(group), shouldWrite ? !!preparedCopy : this.#effectiveLastValueIsCopy(group));
				if (group.sources.length === 1) this.#stageLastSourceValue(group, record.sourceValues[index]);
			}
			record.applied = true;
			return wrote;
		});
	}
	/** Whether every retained writer for this source is a supported direct numeric program. */
	hasSourceProgram(source) {
		return !!this.#programSourceSlots.get(source)?.eligible;
	}
	/**
	* Associate existing unary compiler-proven writers with one published
	* numeric column cell. This records an index only; it does not write hosts
	* or alter the source's binding metadata.
	*/
	bindSourceColumn(source, column, row) {
		if (this.#numericWriteInProgress || this.#compiledGraph || !this.#directBindingWrites || !Number.isSafeInteger(row) || row < 0 || row >= column.values.length) return false;
		const groups = this.#groupsBySource.get(source);
		const slot = this.#programSourceSlots.get(source);
		if (!groups?.size || !slot?.eligible || !slot.unaryEligible) return false;
		const prior = this.#sourceColumnCells.get(source);
		if (prior) return prior.column === column && prior.row === row;
		this.#sourceColumnCells.set(source, {
			column,
			row
		});
		for (const group of groups) this.#indexSourceColumnGroup(source, group);
		return true;
	}
	/**
	* Prepare one source's unary cell-writer fanout. The returned token is tied
	* to this VDOM root, source slot, cell address, and the current binding
	* generation; it becomes stale when that source's bindings change.
	*/
	prepareNumericCellProgram(source, column, row) {
		if (this.#numericWriteInProgress || this.#compiledGraph || !this.#directBindingWrites || !Number.isSafeInteger(row) || row < 0 || row >= column.values.length) return null;
		const slot = this.#programSourceSlots.get(source);
		if (!slot?.eligible || !slot.unaryEligible || slot.groups.length === 0) return null;
		if (!this.bindSourceColumn(source, column, row)) return null;
		const cell = this.#sourceColumnCells.get(source);
		if (!cell || cell.column !== column || cell.row !== row) return null;
		const current = slot.cellProgram;
		if (current?.active && current.generation === slot.cellProgramGeneration && current.column === column && current.row === row && current.groups === slot.groups) return current.token;
		if (current) this.#invalidatePreparedNumericCellProgram(slot);
		const token = Object.freeze({});
		const record = {
			token,
			root: this,
			slot,
			source,
			column,
			row,
			generation: slot.cellProgramGeneration,
			groups: slot.groups,
			active: true
		};
		slot.cellProgram = record;
		this.#preparedCellProgramRecords.set(token, record);
		return token;
	}
	/** Prepare a compiler-v2 owner-row fanout once for a committed World row. */
	prepareNumericRowProgram(spec) {
		if (this.#numericWriteInProgress || this.#compiledGraph || !this.#directBindingWrites || !Number.isSafeInteger(spec.owner) || !Number.isSafeInteger(spec.row) || spec.row < 0 || !Number.isSafeInteger(spec.generation) || spec.generation < 0 || typeof spec.rowIdentity !== "object" || spec.rowIdentity === null) return null;
		let layout;
		try {
			layout = normalizeCompiledStateLayout(spec.layout);
		} catch {
			return null;
		}
		if (!layout.programId || layout.slots.length === 0) return null;
		const slotCount = layout.slots.length;
		if (spec.sources.length !== slotCount || spec.columns.length !== slotCount) return null;
		const layoutSignature = compiledStateLayoutSignature(layout);
		const priorIdentityRecord = this.#preparedNumericRowByIdentity.get(spec.rowIdentity);
		if (priorIdentityRecord) {
			if (!priorIdentityRecord.active || priorIdentityRecord.owner !== spec.owner || priorIdentityRecord.row !== spec.row || priorIdentityRecord.generation !== spec.generation || priorIdentityRecord.layoutSignature !== layoutSignature) return null;
			for (let index = 0; index < slotCount; index++) if (priorIdentityRecord.sources[index] !== spec.sources[index] || priorIdentityRecord.columns[index] !== spec.columns[index]) return null;
			return priorIdentityRecord.token;
		}
		const sources = new Array(slotCount);
		const columns = new Array(slotCount);
		const groupsBySlot = new Array(slotCount);
		const usedSlots = new Uint8Array(slotCount);
		const sourceSet = /* @__PURE__ */ new Set();
		for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
			const source = spec.sources[slotIndex];
			const column = spec.columns[slotIndex];
			const slot = layout.slots[slotIndex];
			if (!column || column.sourceSlot !== slotIndex || compiledStateLayoutSlot(layout, slot.siteId) !== slotIndex) return null;
			if (source) {
				if (sourceSet.has(source) || this.#numericRowProgramsBySource.has(source)) return null;
				sourceSet.add(source);
			}
			sources[slotIndex] = source;
			columns[slotIndex] = column;
			groupsBySlot[slotIndex] = [];
		}
		for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
			const source = sources[slotIndex];
			if (!source) continue;
			const groups = this.#groupsBySource.get(source);
			for (const group of groups ?? []) {
				const binding = getBoundValue(group.rawValue);
				const ownerBinding = binding?.numericOwner;
				const descriptor = binding?.numericProgram;
				if (!binding || !ownerBinding || !descriptor || descriptor.schemaVersion !== 2 || descriptor.ownerProgramId !== layout.programId || typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 || !Array.isArray(descriptor.sourceSites) || !Array.isArray(ownerBinding.sourceSlots) || !binding.project || ownerBinding.owner !== spec.owner || ownerBinding.programId !== layout.programId || safeLayoutSignature(ownerBinding.layout) !== layoutSignature || ownerBinding.sourceSlots.length !== group.sources.length || group.sources.length > 1 && typeof binding.projectInputs !== "function") return null;
				const sites = descriptor.sourceSites;
				if (sites.length !== group.sources.length) return null;
				for (let input = 0; input < group.sources.length; input++) {
					const sourceSlot = ownerBinding.sourceSlots[input];
					if (!Number.isSafeInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= slotCount || group.sources[input] !== sources[sourceSlot] || sites[input] !== layout.slots[sourceSlot].siteId) return null;
					usedSlots[sourceSlot] = 1;
					if (sourceSlot === slotIndex && !groupsBySlot[slotIndex].includes(group)) groupsBySlot[slotIndex].push(group);
				}
			}
		}
		for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
			if (!usedSlots[slotIndex]) continue;
			if (!sources[slotIndex]) return null;
			for (const group of groupsBySlot[slotIndex]) if (group.ownerRowInputSlots !== void 0) return null;
		}
		let ownerUpdateProgram;
		let ownerUpdateSinks;
		const candidateProgram = compiledOwnerUpdateProgramFor(layout);
		if (candidateProgram?.schemaVersion === 2 && candidateProgram.programId === layout.programId && candidateProgram.slotCount === slotCount && candidateProgram.sinkIds.length > 0 && candidateProgram.sinkIds.length <= 30) {
			const groupsBySinkId = /* @__PURE__ */ new Map();
			const visitedGroups = /* @__PURE__ */ new Set();
			let complete = true;
			for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
				for (const group of groupsBySlot[slotIndex]) {
					if (visitedGroups.has(group)) continue;
					visitedGroups.add(group);
					const binding = getBoundValue(group.rawValue);
					const sinkId = binding.numericProgram?.schemaVersion === 2 ? binding.numericProgram.sinkId : void 0;
					if (!sinkId || groupsBySinkId.has(sinkId)) {
						complete = false;
						break;
					}
					groupsBySinkId.set(sinkId, group);
				}
				if (!complete) break;
			}
			const sinks = [];
			if (complete && groupsBySinkId.size === candidateProgram.sinkIds.length) for (const sinkId of candidateProgram.sinkIds) {
				const group = groupsBySinkId.get(sinkId);
				if (!group) {
					complete = false;
					break;
				}
				sinks.push(group);
			}
			else complete = false;
			if (complete) for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
				const actual = groupsBySlot[slotIndex];
				let actualIndex = 0;
				for (let sinkIndex = 0; sinkIndex < candidateProgram.sinkIds.length; sinkIndex++) {
					const group = sinks[sinkIndex];
					if (getBoundValue(group.rawValue).numericOwner.sourceSlots.includes(slotIndex)) {
						if (actual[actualIndex++] !== group) {
							complete = false;
							break;
						}
					}
				}
				if (!complete || actualIndex !== actual.length) {
					complete = false;
					break;
				}
			}
			if (complete) {
				ownerUpdateProgram = candidateProgram;
				ownerUpdateSinks = sinks;
			}
		}
		const token = Object.freeze({});
		const inputValues = new Array(slotCount);
		const changedEpochs = new Array(slotCount).fill(0);
		const changedValues = new Array(slotCount).fill(0);
		const record = {
			token,
			root: this,
			owner: spec.owner,
			layout,
			layoutSignature,
			rowIdentity: spec.rowIdentity,
			row: spec.row,
			generation: spec.generation,
			sourceLease: spec.sources,
			columnLease: spec.columns,
			sources,
			columns,
			usedSlots,
			groupsBySlot,
			ownerUpdateProgram,
			sinks: ownerUpdateSinks,
			inputValues,
			changedEpochs,
			changedValues,
			cutEpoch: 0,
			seenMask: 0,
			active: true
		};
		for (const groups of groupsBySlot) for (const group of groups) {
			const binding = getBoundValue(group.rawValue);
			group.ownerRowInputSlots = binding.numericOwner.sourceSlots;
			group.ownerRowProjectInputs = binding.projectInputs;
			if (!ownerUpdateProgram) group.ownerRowInputs ??= new Array(group.sources.length);
		}
		this.#preparedNumericRowPrograms.set(token, record);
		this.#activePreparedNumericRowRecords.add(record);
		this.#preparedNumericRowByIdentity.set(spec.rowIdentity, record);
		for (let slotIndex = 0; slotIndex < sources.length; slotIndex++) {
			const source = sources[slotIndex];
			if (source) this.#numericRowProgramsBySource.set(source, {
				record,
				slot: slotIndex
			});
		}
		return token;
	}
	#invalidatePreparedNumericRowsForSource(source) {
		const membership = this.#numericRowProgramsBySource.get(source);
		if (!membership) return;
		const record = membership.record;
		if (!record.active) return;
		record.active = false;
		this.#activePreparedNumericRowRecords.delete(record);
		this.#preparedNumericRowPrograms.delete(record.token);
		this.#preparedNumericRowByIdentity.delete(record.rowIdentity);
		for (const recordSource of record.sources) if (recordSource && this.#numericRowProgramsBySource.get(recordSource)?.record === record) this.#numericRowProgramsBySource.delete(recordSource);
		for (const groups of record.groupsBySlot) for (const group of groups) {
			group.ownerRowInputs = void 0;
			group.ownerRowInputSlots = void 0;
			group.ownerRowProjectInputs = void 0;
			group.ownerRowCutEpoch = void 0;
		}
	}
	/** Execute an explicit multi-row, multi-source cut through prepared sinks. */
	executePreparedNumericRows(tokens, changedRowIndices, changedSlots, values, count) {
		if (this.#numericWriteInProgress) throw new Error("Nested numeric VDOM writes are not supported");
		this.#numericWriteInProgress = true;
		try {
			return this.#executePreparedNumericRows(tokens, changedRowIndices, changedSlots, values, count);
		} finally {
			this.#numericWriteInProgress = false;
		}
	}
	/** Check whether a cached opaque cell program still names its live fanout. */
	isPreparedNumericCellProgramCurrent(token) {
		const record = this.#preparedCellProgramRecords.get(token);
		return !!record && record.root === this && record.active && record.slot.cellProgram === record && record.slot.eligible && record.generation === record.slot.cellProgramGeneration && record.groups === record.slot.groups;
	}
	/**
	* Apply an explicit dirty-source cut using prepared unary fanouts. Returns
	* null when any token is stale or unsupported, false when accepted without
	* host writes, and true when at least one host prop was written.
	*/
	executePreparedNumericCells(tokens, values, count) {
		return this.#withNumericWriteGuard(() => this.#executePreparedNumericCells(tokens, values, count));
	}
	/** Whether a numeric cell currently has at least one indexed host writer. */
	hasColumnCell(column, row) {
		return Number.isSafeInteger(row) && row >= 0 && (this.#groupsByColumnCell.get(column)?.get(row)?.length ?? 0) > 0;
	}
	/**
	* Apply an explicit dirty-address cut through existing unary writers.
	* Returns null when preflight declines the cut, false for a supported cut
	* with no host writes, and true when at least one host prop was written.
	*/
	setColumnCells(columns, rows, values, count) {
		return this.#withNumericWriteGuard(() => this.#setColumnCells(columns, rows, values, count));
	}
	/** Execute a validated sparse/dense cut through compiler-proven numeric writers. */
	executeSourceProgram(sources, values, count) {
		return this.#withNumericWriteGuard(() => {
			this.#programDirtySourceCount = 0;
			this.#programChangedSourceCount = 0;
			this.#programAffectedSinkCount = 0;
			this.#programOutputCount = 0;
			try {
				if (this.#programSourceEpoch >= Number.MAX_SAFE_INTEGER) {
					for (const slot of this.#programSourceSlots.values()) slot.epoch = 0;
					this.#programSourceEpoch = 1;
				} else this.#programSourceEpoch++;
				const sourceEpoch = this.#programSourceEpoch;
				if (!Number.isInteger(count) || count < 0 || count > sources.length || count > values.length) throw new RangeError("Invalid numeric source program count");
				for (let index = 0; index < count; index++) {
					const source = sources[index];
					if (source == null || typeof source !== "object" || typeof values[index] !== "number") throw new TypeError("Invalid numeric source program input");
					const slot = this.#programSourceSlots.get(source);
					if (!slot?.eligible || !this.#groupsBySource.has(source)) throw new Error("Scalar source has no supported numeric program in this VDOM root");
					if (slot.epoch === sourceEpoch) throw new TypeError("Duplicate numeric source program slot");
					slot.epoch = sourceEpoch;
					this.#programDirtySources[this.#programDirtySourceCount++] = slot;
				}
				let changed = false;
				for (let index = 0; index < count; index++) {
					const slot = this.#programDirtySources[index];
					if (!Object.is(slot.source.value, values[index])) {
						changed = true;
						this.#programChangedSources[this.#programChangedSourceCount++] = slot;
					}
				}
				if (!changed) return false;
				for (let index = 0; index < count; index++) this.#programDirtySources[index].source.value = values[index];
				if (this.#programSinkEpoch >= Number.MAX_SAFE_INTEGER) {
					for (const group of this.#programSinkSlots) if (group) group.programEpoch = 0;
					this.#programSinkEpoch = 1;
				} else this.#programSinkEpoch++;
				const sinkEpoch = this.#programSinkEpoch;
				let projectionCount = 0;
				let writeCount = 0;
				let skipCount = 0;
				for (let changedIndex = 0; changedIndex < this.#programChangedSourceCount; changedIndex++) {
					const slot = this.#programChangedSources[changedIndex];
					for (let groupIndex = 0; groupIndex < slot.groups.length; groupIndex++) {
						const group = slot.groups[groupIndex];
						if (this.#programSinkSlotByGroup.get(group) === void 0 || group.column !== void 0) continue;
						if (group.programEpoch === sinkEpoch) continue;
						group.programEpoch = sinkEpoch;
						this.#programAffectedSinks[this.#programAffectedSinkCount++] = group;
					}
				}
				try {
					for (let sinkIndex = 0; sinkIndex < this.#programAffectedSinkCount; sinkIndex++) {
						const group = this.#programAffectedSinks[sinkIndex];
						const binding = getBoundValue(group.rawValue);
						if (!binding || !binding.numericProgram || typeof binding.project !== "function") throw new Error("Numeric program sink is no longer supported");
						this.#programOutputValues[this.#programOutputCount++] = binding.read ? binding.read() : binding.project(group.sources.length === 1 ? group.sources[0].value : 0);
						projectionCount++;
					}
					for (let index = 0; index < this.#programAffectedSinkCount; index++) {
						const group = this.#programAffectedSinks[index];
						const next = this.#programOutputValues[index];
						const preparedCopy = this.#prepareBoundCopy(group, next);
						const prepared = preparedCopy ?? next;
						if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) {
							skipCount++;
							continue;
						}
						this.#writeBoundGroup(group, prepared, !!preparedCopy);
						this.#stageLastValue(group, prepared, !!preparedCopy);
						writeCount++;
					}
				} finally {
					const sourceUpdates = this.#programChangedSourceCount;
					const sinkCount = this.#programAffectedSinkCount;
					this.#profileCounter?.({
						"numeric.program-batches": 1,
						"numeric.program-source-updates": sourceUpdates,
						"numeric.program-source-slots": count,
						"numeric.program-sinks": sinkCount,
						"numeric.program-projections": projectionCount,
						"numeric.program-writes": writeCount,
						"numeric.program-skips": skipCount
					});
				}
				return true;
			} finally {
				for (let index = 0; index < this.#programDirtySourceCount; index++) this.#programDirtySources[index] = void 0;
				for (let index = 0; index < this.#programChangedSourceCount; index++) this.#programChangedSources[index] = void 0;
				for (let index = 0; index < this.#programAffectedSinkCount; index++) this.#programAffectedSinks[index] = void 0;
				for (let index = 0; index < this.#programOutputCount; index++) this.#programOutputValues[index] = void 0;
				this.#programDirtySourceCount = 0;
				this.#programChangedSourceCount = 0;
				this.#programAffectedSinkCount = 0;
				this.#programOutputCount = 0;
			}
		});
	}
	/** Apply source changes as one coherent host-write batch. */
	setSources(updates) {
		return this.#withNumericWriteGuard(() => this.#setSources(updates));
	}
	#setSources(updates) {
		const nextValues = /* @__PURE__ */ new Map();
		for (const [source, value] of updates) nextValues.set(source, value);
		const changed = [];
		for (const [source, value] of nextValues) {
			const groups = this.#compiledGraph ? this.#groupsByCompiledSource.get(source) : this.#groupsBySource.get(source);
			if (!groups || (groups instanceof Set ? groups.size : groups.length) === 0) throw new Error("Scalar source is not bound in this VDOM root");
			if (!Object.is(source.value, value)) changed.push(source);
		}
		if (changed.length === 0) return false;
		for (const source of changed) source.value = nextValues.get(source);
		const affected = /* @__PURE__ */ new Set();
		for (const source of changed) {
			const groups = this.#compiledGraph ? this.#groupsByCompiledSource.get(source) : this.#groupsBySource.get(source);
			for (const group of groups ?? []) affected.add(group);
		}
		const projectedValues = [];
		for (const group of affected) {
			const directBinding = group.styleProperty === void 0 ? null : getBoundValue(group.rawValue);
			projectedValues.push(directBinding ? readBoundValue(directBinding) : materializeProp(group.name, group.rawValue));
		}
		let projectedIndex = 0;
		for (const group of affected) {
			const next = projectedValues[projectedIndex++];
			const preparedCopy = this.#prepareBoundCopy(group, next);
			const prepared = preparedCopy ?? next;
			if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) continue;
			this.#writeBoundGroup(group, prepared, !!preparedCopy);
			this.#stageLastValue(group, prepared, !!preparedCopy);
		}
		return true;
	}
	/**
	* Commit changed rows from compiled numeric columns through the binding
	* writers resolved at mount. The caller updates column buffers in place;
	* call-local staging keeps every writer on the same captured buffer cut.
	*/
	setColumns(columns) {
		return this.#withNumericWriteGuard(() => this.#setColumns(columns));
	}
	#setColumns(columns) {
		for (const column of columns) {
			const groups = this.#groupsByCompiledColumn.get(column);
			if (!groups || groups.length === 0) throw new Error("Numeric column is not bound in this VDOM root");
			for (const group of groups) if (group.columnIndex >= column.values.length) throw new Error("Numeric column is shorter than its bound entity rows");
		}
		for (const column of columns) column.source.value++;
		const stagedGroups = [];
		const stagedSources = [];
		const stageToken = Symbol();
		for (const column of columns) {
			const groups = this.#groupsByCompiledColumn.get(column);
			for (const group of groups) {
				if (group.columnStageToken === stageToken) continue;
				group.columnStageToken = stageToken;
				const sourceValue = column.values[group.columnIndex];
				if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) continue;
				stagedGroups.push(group);
				stagedSources.push(sourceValue);
			}
		}
		const stagedValues = [];
		for (let index = 0; index < stagedGroups.length; index++) stagedValues.push(stagedGroups[index].project(stagedSources[index]));
		return this.#writeStagedColumnValues(stagedGroups, stagedSources, stagedValues);
	}
	/** Read-only lifecycle counters for benchmarks and host adapters. */
	diagnostics() {
		const groupCount = (value) => {
			if (value instanceof Map) {
				let count = 0;
				for (const entry of value.values()) count += groupCount(entry);
				return count;
			}
			if (value instanceof Set) return value.size;
			return Array.isArray(value) ? value.length : 0;
		};
		return {
			mountedNodes: this.#mounted.length,
			scalarBindingGroups: groupCount(this.#groupsBySource),
			numericProgramSourceSlots: this.#programSourceSlots.size,
			numericProgramSinkSlots: this.#programSinkSlotByGroup.size,
			numericProgramSinkSlotCapacity: this.#programSinkSlots.length,
			numericProgramFreeSinkSlots: this.#programFreeSinkSlots.length,
			numericProgramScratchRetained: this.#programDirtySourceCount + this.#programChangedSourceCount + this.#programAffectedSinkCount + this.#programOutputCount,
			numericProgramScratchCapacity: this.#programDirtySources.length + this.#programChangedSources.length + this.#programAffectedSinks.length + this.#programOutputValues.length,
			columnRowsScratchRetained: this.#columnRowsScratchCount,
			columnRowsScratchCapacity: this.#columnRowsScratchGroups.length + this.#columnRowsScratchSources.length + this.#columnRowsScratchValues.length,
			compiledBindingGroups: groupCount(this.#groupsByCompiledBinding),
			compiledSourceGroups: groupCount(this.#groupsByCompiledSource),
			compiledColumnGroups: groupCount(this.#groupsByCompiledColumn),
			compiledColumnBindingGroups: groupCount(this.#groupsByCompiledColumnBinding),
			preparedNumericRowWorkVisits: this.#ownerRowWorkVisits,
			preparedOwnerUpdateKernelBatches: this.#ownerUpdateKernelBatches,
			preparedOwnerUpdateKernelRows: this.#ownerUpdateKernelRows,
			preparedOwnerUpdateKernelInputs: this.#ownerUpdateKernelInputs,
			preparedOwnerUpdateKernelSelectedSinks: this.#ownerUpdateKernelSelectedSinks,
			preparedOwnerUpdateKernelStagedSinks: this.#ownerUpdateKernelStagedSinks,
			preparedOwnerUpdateGenericFallbackCuts: this.#ownerUpdateGenericFallbackCuts,
			preparedOwnerUpdateGenericProjectors: this.#ownerUpdateGenericProjectors,
			bindingIndexAttachOperations: this.#bindingIndexAttachOperations,
			bindingIndexDetachOperations: this.#bindingIndexDetachOperations,
			bindingIndexIndexOperations: this.#bindingIndexIndexOperations,
			sourceColumnPruneVisits: this.#sourceColumnPruneVisits
		};
	}
	/** Commit only rows in a reusable dirty-row buffer. */
	setColumnRows(columns, rows, rowCount = rows.length) {
		return this.#withNumericWriteGuard(() => this.#setColumnRows(columns, rows, rowCount));
	}
	#setColumnRows(columns, rows, rowCount) {
		if (!Number.isInteger(rowCount) || rowCount < 0 || rowCount > rows.length) throw new Error("Dirty row count is outside the supplied buffer");
		for (const column of columns) {
			const rowGroups = this.#groupsByCompiledColumnRows.get(column);
			if (!rowGroups) throw new Error("Numeric column is not bound in this VDOM root");
			for (let index = 0; index < rowCount; index++) {
				const row = rows[index];
				if (row >= column.values.length || rowGroups[row] === void 0) throw new Error("Dirty row is outside the bound column rows");
			}
		}
		if (rowCount === 0) return false;
		for (const column of columns) column.source.value++;
		this.#columnRowsScratchActive = true;
		this.#columnRowsScratchCancelled = false;
		try {
			if (this.#columnRowsStageEpoch >= Number.MAX_SAFE_INTEGER) {
				for (const rowsByColumn of this.#groupsByCompiledColumnRows.values()) for (const groups of rowsByColumn) {
					if (!groups) continue;
					for (const group of groups) group.columnRowsStageEpoch = 0;
				}
				this.#columnRowsStageEpoch = 1;
			} else this.#columnRowsStageEpoch++;
			const stageEpoch = this.#columnRowsStageEpoch;
			for (const column of columns) {
				const rowGroups = this.#groupsByCompiledColumnRows.get(column);
				for (let index = 0; index < rowCount; index++) {
					const row = rows[index];
					const sourceValue = column.values[row];
					const groups = rowGroups[row];
					for (const group of groups) {
						if (group.columnRowsStageEpoch === stageEpoch) continue;
						group.columnRowsStageEpoch = stageEpoch;
						if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) continue;
						const scratchIndex = this.#columnRowsScratchCount++;
						this.#columnRowsScratchGroups[scratchIndex] = group;
						this.#columnRowsScratchSources[scratchIndex] = sourceValue;
					}
				}
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) return false;
				const group = this.#columnRowsScratchGroups[index];
				this.#columnRowsScratchValues[index] = group.project(this.#columnRowsScratchSources[index]);
			}
			let wrote = false;
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) break;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				const next = this.#columnRowsScratchValues[index];
				const preparedCopy = this.#prepareBoundCopy(group, next);
				const prepared = preparedCopy ?? next;
				if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) {
					this.#stageLastSourceValue(group, sourceValue);
					continue;
				}
				this.#writeBoundGroup(group, prepared, !!preparedCopy);
				if (this.#columnRowsScratchCancelled) break;
				this.#stageLastSourceValue(group, sourceValue);
				this.#stageLastValue(group, prepared, !!preparedCopy);
				wrote = true;
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				this.#columnRowsScratchGroups[index] = void 0;
				this.#columnRowsScratchSources[index] = void 0;
				this.#columnRowsScratchValues[index] = void 0;
			}
			this.#columnRowsScratchCount = 0;
			this.#columnRowsScratchActive = false;
			if (this.#columnRowsScratchCancelled) {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
			}
			this.#columnRowsScratchCancelled = false;
		}
	}
	#setColumnCells(columns, rows, values, count) {
		if (!Number.isInteger(count) || count < 0 || count > columns.length || count > rows.length || count > values.length) throw new RangeError("Dirty cell count is outside the supplied buffers");
		this.#columnRowsScratchActive = true;
		this.#columnRowsScratchCancelled = false;
		try {
			if (this.#columnRowsStageEpoch >= Number.MAX_SAFE_INTEGER) {
				for (const rowsByColumn of this.#groupsByCompiledColumnRows.values()) for (const groups of rowsByColumn) {
					if (!groups) continue;
					for (const group of groups) group.columnRowsStageEpoch = 0;
				}
				for (const rowsByColumn of this.#groupsByColumnCell.values()) for (const groups of rowsByColumn.values()) for (const group of groups) group.columnRowsStageEpoch = 0;
				this.#columnRowsStageEpoch = 1;
			} else this.#columnRowsStageEpoch++;
			const stageEpoch = this.#columnRowsStageEpoch;
			for (let inputIndex = 0; inputIndex < count; inputIndex++) {
				const column = columns[inputIndex];
				const row = rows[inputIndex];
				const value = values[inputIndex];
				if (!column || !Number.isSafeInteger(row) || row < 0 || row >= column.values.length || typeof value !== "number") return null;
				const groups = this.#groupsByColumnCell.get(column)?.get(row);
				if (!groups?.length) return null;
				for (const group of groups) {
					const source = group.sources.length === 1 ? group.sources[0] : void 0;
					const association = source ? this.#sourceColumnCells.get(source) : void 0;
					if (!source || !association || association.column !== column || association.row !== row || !this.#isUnaryColumnGroup(source, group) || !this.#programSourceSlots.get(source)?.eligible) return null;
					if (group.columnRowsStageEpoch === stageEpoch) {
						const stagedIndex = group.columnRowsScratchIndex;
						if (stagedIndex === void 0 || this.#columnRowsScratchGroups[stagedIndex] !== group || !Object.is(this.#columnRowsScratchSources[stagedIndex], value)) return null;
						continue;
					}
					group.columnRowsStageEpoch = stageEpoch;
					const scratchIndex = this.#columnRowsScratchCount++;
					group.columnRowsScratchIndex = scratchIndex;
					this.#columnRowsScratchGroups[scratchIndex] = group;
					this.#columnRowsScratchSources[scratchIndex] = value;
				}
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				const group = this.#columnRowsScratchGroups[index];
				group.sources[0].value = this.#columnRowsScratchSources[index];
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) return false;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) this.#columnRowsScratchValues[index] = void 0;
				else this.#columnRowsScratchValues[index] = group.project(sourceValue);
			}
			let wrote = false;
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) break;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) continue;
				const next = this.#columnRowsScratchValues[index];
				const preparedCopy = this.#prepareBoundCopy(group, next);
				const prepared = preparedCopy ?? next;
				if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) {
					this.#stageLastSourceValue(group, sourceValue);
					continue;
				}
				this.#writeBoundGroup(group, prepared, !!preparedCopy);
				if (this.#columnRowsScratchCancelled) break;
				this.#stageLastSourceValue(group, sourceValue);
				this.#stageLastValue(group, prepared, !!preparedCopy);
				wrote = true;
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				this.#columnRowsScratchGroups[index].columnRowsScratchIndex = void 0;
				this.#columnRowsScratchGroups[index] = void 0;
				this.#columnRowsScratchSources[index] = void 0;
				this.#columnRowsScratchValues[index] = void 0;
			}
			this.#columnRowsScratchCount = 0;
			this.#columnRowsScratchActive = false;
			if (this.#columnRowsScratchCancelled) {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
			}
			this.#columnRowsScratchCancelled = false;
		}
	}
	#executePreparedNumericRows(tokens, changedRowIndices, changedSlots, values, count) {
		if (!Number.isSafeInteger(count) || count < 0 || count > changedRowIndices.length || count > changedSlots.length || count > values.length) throw new RangeError("Prepared owner-row cut exceeds supplied buffers");
		const countVisits = this.#profileCounter !== void 0;
		if (countVisits) this.#ownerRowWorkVisits = 0;
		this.#ownerRowRecordCount = 0;
		this.#ownerRowGroupCount = 0;
		this.#ownerRowExecutionActive = true;
		this.#ownerRowExecutionCancelled = false;
		let inputRecordCount = 0;
		let stagedCount = 0;
		let stagedCleanupBound = 0;
		let ownerUpdateProgram;
		try {
			if (this.#ownerRowCutEpoch >= Number.MAX_SAFE_INTEGER) {
				this.#ownerRowCutEpoch = 1;
				for (const record of this.#activePreparedNumericRowRecords) {
					record.cutEpoch = 0;
					record.seenMask = 0;
					record.changedEpochs.fill(0);
					for (const groups of record.groupsBySlot) for (const group of groups) group.ownerRowCutEpoch = 0;
				}
			} else this.#ownerRowCutEpoch++;
			const epoch = this.#ownerRowCutEpoch;
			let previousToken;
			let previousRecord;
			for (let index = 0; index < count; index++) {
				if (countVisits) this.#ownerRowWorkVisits++;
				const tokenIndex = changedRowIndices[index];
				const slotIndex = changedSlots[index];
				const token = tokens[tokenIndex];
				const value = values[index];
				if (!Number.isSafeInteger(tokenIndex) || tokenIndex >= tokens.length || !token || !Number.isSafeInteger(slotIndex) || typeof value !== "number") return null;
				const record = token === previousToken ? previousRecord : this.#preparedNumericRowPrograms.get(token);
				previousToken = token;
				previousRecord = record;
				if (!record || record.root !== this || !record.active || record.token !== token || !record.layout.programId || slotIndex >= record.sources.length) return null;
				const source = record.sources[slotIndex];
				const column = record.columns[slotIndex];
				if (!source || record.sourceLease[slotIndex] !== source || record.columnLease[slotIndex] !== column || !column || column.values.length <= record.row) return null;
				if (record.cutEpoch !== epoch) {
					record.cutEpoch = epoch;
					this.#ownerRowRecordScratch[this.#ownerRowRecordCount++] = record;
				}
				if (record.changedEpochs[slotIndex] === epoch) {
					if (!Object.is(record.changedValues[slotIndex], value)) return null;
				} else {
					record.changedEpochs[slotIndex] = epoch;
					record.changedValues[slotIndex] = value;
				}
				this.#ownerRowInputRecordScratch[index] = record;
				inputRecordCount++;
			}
			if (count === 0) return false;
			ownerUpdateProgram = this.#ownerRowRecordScratch[0].ownerUpdateProgram;
			for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
				const record = this.#ownerRowRecordScratch[rowIndex];
				if (!record) continue;
				if (ownerUpdateProgram && (record.ownerUpdateProgram !== ownerUpdateProgram || !record.sinks || record.sinks.length !== ownerUpdateProgram.sinkIds.length)) ownerUpdateProgram = void 0;
				for (let slotIndex = 0; slotIndex < record.sources.length; slotIndex++) {
					if (countVisits) this.#ownerRowWorkVisits++;
					if (record.usedSlots[slotIndex]) {
						const source = record.sources[slotIndex];
						const column = record.columns[slotIndex];
						if (!source || record.sourceLease[slotIndex] !== source || record.columnLease[slotIndex] !== column || !column || column.values.length <= record.row) return null;
						record.inputValues[slotIndex] = record.columns[slotIndex].values[record.row];
					}
					if (record.changedEpochs[slotIndex] === epoch) record.inputValues[slotIndex] = record.changedValues[slotIndex];
				}
			}
			if (ownerUpdateProgram) {
				const outputCapacity = this.#ownerRowRecordCount * ownerUpdateProgram.sinkIds.length;
				if (!Number.isSafeInteger(outputCapacity) || outputCapacity > 4294967295) ownerUpdateProgram = void 0;
				else {
					stagedCleanupBound = outputCapacity;
					if (this.#ownerRowStagedInputIndices.length < outputCapacity) {
						this.#ownerRowStagedInputIndices = new Uint32Array(outputCapacity);
						this.#ownerRowStagedSinkIds = new Uint16Array(outputCapacity);
						this.#ownerRowStagedValues.length = outputCapacity;
					} else if (this.#ownerRowStagedValues.length < outputCapacity) this.#ownerRowStagedValues.length = outputCapacity;
					for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
						const record = this.#ownerRowRecordScratch[rowIndex];
						if (record) record.seenMask = 0;
					}
					if (countVisits) {
						this.#ownerUpdateKernelBatches++;
						this.#ownerUpdateKernelRows += this.#ownerRowRecordCount;
						this.#ownerUpdateKernelInputs += count;
					}
				}
			}
			if (!ownerUpdateProgram) {
				for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
					const record = this.#ownerRowRecordScratch[rowIndex];
					if (!record) continue;
					const sinks = record.sinks;
					if (record.ownerUpdateProgram && sinks && sinks[0].ownerRowInputs === void 0) {
						for (const groups of record.groupsBySlot) for (const group of groups) if (group !== sinks[0]) group.ownerRowInputs ??= new Array(group.sources.length);
						sinks[0].ownerRowInputs ??= new Array(sinks[0].sources.length);
					}
				}
				if (countVisits) this.#ownerUpdateGenericFallbackCuts++;
			}
			for (let rowIndex = 0; rowIndex < this.#ownerRowRecordCount; rowIndex++) {
				const record = this.#ownerRowRecordScratch[rowIndex];
				if (!record) continue;
				for (let slotIndex = 0; slotIndex < record.sources.length; slotIndex++) {
					if (countVisits) this.#ownerRowWorkVisits++;
					const source = record.sources[slotIndex];
					if (source && (record.usedSlots[slotIndex] || record.changedEpochs[slotIndex] === epoch)) source.value = record.inputValues[slotIndex];
				}
			}
			let wrote = false;
			if (ownerUpdateProgram) {
				if (this.#ownerRowExecutionCancelled) return false;
				stagedCount = ownerUpdateProgram.executeCut(changedSlots, count, this.#ownerRowInputRecordScratch, this.#ownerRowStagedInputIndices, this.#ownerRowStagedSinkIds, this.#ownerRowStagedValues);
				if (this.#ownerRowExecutionCancelled) return false;
				if (!Number.isSafeInteger(stagedCount) || stagedCount < 0 || stagedCount > stagedCleanupBound) throw new Error("Compiled owner update kernel returned an invalid output count");
				for (let index = 0; index < this.#ownerRowRecordCount; index++) {
					const record = this.#ownerRowRecordScratch[index];
					if (!record) continue;
					const validMask = (1 << record.sinks.length) - 1;
					if ((record.seenMask & ~validMask) !== 0) throw new Error("Compiled owner update kernel selected an unknown sink");
				}
				for (let index = 0; index < stagedCount; index++) {
					const inputIndex = this.#ownerRowStagedInputIndices[index];
					const sinkIndex = this.#ownerRowStagedSinkIds[index];
					const record = this.#ownerRowInputRecordScratch[inputIndex];
					const next = this.#ownerRowStagedValues[index];
					if (!Number.isSafeInteger(inputIndex) || inputIndex >= count || !record || !record.sinks || sinkIndex >= record.sinks.length || (record.seenMask & 1 << sinkIndex) === 0 || !isCompiledOwnerUpdatePrimitive(next)) throw new Error("Compiled owner update kernel returned an invalid sink output");
				}
				if (this.#ownerRowExecutionCancelled) return false;
				stagedCleanupBound = stagedCount;
				let selectedSinkCount = 0;
				for (let index = 0; index < this.#ownerRowRecordCount; index++) {
					const record = this.#ownerRowRecordScratch[index];
					if (!record) continue;
					for (let sinkIndex = 0; sinkIndex < record.sinks.length; sinkIndex++) if ((record.seenMask & 1 << sinkIndex) !== 0) {
						const group = record.sinks[sinkIndex];
						selectedSinkCount++;
						this.#stageLastSourceValue(group, record.inputValues[group.ownerRowInputSlots[0]]);
					}
				}
				if (countVisits) {
					this.#ownerUpdateKernelSelectedSinks += selectedSinkCount;
					this.#ownerUpdateKernelStagedSinks += stagedCount;
				}
				if (this.#ownerRowExecutionCancelled) return false;
				for (let index = 0; index < stagedCount; index++) {
					if (this.#ownerRowExecutionCancelled) break;
					const inputIndex = this.#ownerRowStagedInputIndices[index];
					const sinkIndex = this.#ownerRowStagedSinkIds[index];
					const record = this.#ownerRowInputRecordScratch[inputIndex];
					const next = this.#ownerRowStagedValues[index];
					const group = record.sinks[sinkIndex];
					const preparedCopy = this.#prepareBoundCopy(group, next);
					const prepared = preparedCopy ?? next;
					this.#writeBoundGroup(group, prepared, !!preparedCopy);
					wrote = true;
					if (this.#ownerRowExecutionCancelled) break;
					this.#stageLastValue(group, prepared, !!preparedCopy);
				}
			} else {
				for (let index = 0; index < count; index++) {
					const record = this.#ownerRowInputRecordScratch[index];
					const slotIndex = changedSlots[index];
					if (countVisits) this.#ownerRowWorkVisits++;
					for (const group of record.groupsBySlot[slotIndex]) {
						if (countVisits) this.#ownerRowWorkVisits++;
						if (group.ownerRowCutEpoch === epoch) continue;
						group.ownerRowCutEpoch = epoch;
						const scratchIndex = this.#ownerRowGroupCount++;
						this.#ownerRowGroupScratch[scratchIndex] = group;
						this.#ownerRowGroupRecordScratch[scratchIndex] = record;
					}
				}
				for (let index = 0; index < this.#ownerRowGroupCount; index++) {
					if (this.#ownerRowExecutionCancelled) return false;
					if (countVisits) this.#ownerRowWorkVisits++;
					const group = this.#ownerRowGroupScratch[index];
					const record = this.#ownerRowGroupRecordScratch[index];
					const slots = group.ownerRowInputSlots;
					const inputs = group.ownerRowInputs;
					for (let inputIndex = 0; inputIndex < slots.length; inputIndex++) inputs[inputIndex] = record.inputValues[slots[inputIndex]];
					this.#ownerRowValueScratch[index] = group.ownerRowProjectInputs ? group.ownerRowProjectInputs(inputs) : group.project(inputs[0]);
					if (this.#ownerRowExecutionCancelled) return false;
				}
				if (countVisits) this.#ownerUpdateGenericProjectors += this.#ownerRowGroupCount;
				if (this.#ownerRowExecutionCancelled) return false;
				for (let index = 0; index < this.#ownerRowGroupCount; index++) {
					const group = this.#ownerRowGroupScratch[index];
					const record = this.#ownerRowGroupRecordScratch[index];
					this.#stageLastSourceValue(group, record.inputValues[group.ownerRowInputSlots[0]]);
				}
				for (let index = 0; index < this.#ownerRowGroupCount; index++) {
					if (this.#ownerRowExecutionCancelled) break;
					const group = this.#ownerRowGroupScratch[index];
					const next = this.#ownerRowValueScratch[index];
					const preparedCopy = this.#prepareBoundCopy(group, next);
					const prepared = preparedCopy ?? next;
					if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) continue;
					this.#writeBoundGroup(group, prepared, !!preparedCopy);
					wrote = true;
					if (this.#ownerRowExecutionCancelled) break;
					this.#stageLastValue(group, prepared, !!preparedCopy);
				}
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#ownerRowRecordCount; index++) this.#ownerRowRecordScratch[index] = void 0;
			for (let index = 0; index < inputRecordCount; index++) this.#ownerRowInputRecordScratch[index] = void 0;
			for (let index = 0; index < this.#ownerRowGroupCount; index++) {
				this.#ownerRowGroupScratch[index] = void 0;
				this.#ownerRowGroupRecordScratch[index] = void 0;
				this.#ownerRowValueScratch[index] = void 0;
			}
			const stagedCleanupCount = Math.min(stagedCleanupBound, this.#ownerRowStagedValues.length);
			for (let index = 0; index < stagedCleanupCount; index++) {
				this.#ownerRowStagedInputIndices[index] = 0;
				this.#ownerRowStagedSinkIds[index] = 0;
				this.#ownerRowStagedValues[index] = 0;
			}
			this.#ownerRowRecordCount = 0;
			this.#ownerRowGroupCount = 0;
			this.#ownerRowExecutionActive = false;
			if (this.#ownerRowExecutionCancelled) {
				this.#ownerRowRecordScratch.length = 0;
				this.#ownerRowInputRecordScratch.length = 0;
				this.#ownerRowGroupScratch.length = 0;
				this.#ownerRowGroupRecordScratch.length = 0;
				this.#ownerRowValueScratch.length = 0;
				this.#ownerRowStagedInputIndices = /* @__PURE__ */ new Uint32Array(0);
				this.#ownerRowStagedSinkIds = /* @__PURE__ */ new Uint16Array(0);
				this.#ownerRowStagedValues.length = 0;
			}
			this.#ownerRowExecutionCancelled = false;
		}
	}
	#executePreparedNumericCells(tokens, values, count) {
		if (!Number.isInteger(count) || count < 0 || count > tokens.length || count > values.length) throw new RangeError("Prepared numeric cell count is outside the supplied buffers");
		this.#preparedCellDirtyCount = 0;
		this.#columnRowsScratchCount = 0;
		this.#columnRowsScratchActive = true;
		this.#columnRowsScratchCancelled = false;
		try {
			if (this.#preparedCellCutEpoch >= Number.MAX_SAFE_INTEGER) {
				for (const slot of this.#programSourceSlots.values()) slot.preparedCutEpoch = 0;
				this.#preparedCellCutEpoch = 1;
			} else this.#preparedCellCutEpoch++;
			const cutEpoch = this.#preparedCellCutEpoch;
			for (let index = 0; index < count; index++) {
				const token = tokens[index];
				const value = values[index];
				if (!token || typeof value !== "number") return null;
				const record = this.#preparedCellProgramRecords.get(token);
				if (!record || record.root !== this || !record.active || record.slot.cellProgram !== record || !record.slot.eligible || record.generation !== record.slot.cellProgramGeneration || record.groups !== record.slot.groups) return null;
				const slot = record.slot;
				if (slot.preparedCutEpoch === cutEpoch) {
					if (!Object.is(slot.preparedCutValue, value)) return null;
					continue;
				}
				slot.preparedCutEpoch = cutEpoch;
				slot.preparedCutValue = value;
				const dirtyIndex = this.#preparedCellDirtyCount++;
				this.#preparedCellDirtySlots[dirtyIndex] = slot;
				this.#preparedCellDirtyValues[dirtyIndex] = value;
			}
			for (let index = 0; index < this.#preparedCellDirtyCount; index++) this.#preparedCellDirtySlots[index].source.value = this.#preparedCellDirtyValues[index];
			for (let dirtyIndex = 0; dirtyIndex < this.#preparedCellDirtyCount; dirtyIndex++) {
				const slot = this.#preparedCellDirtySlots[dirtyIndex];
				const sourceValue = this.#preparedCellDirtyValues[dirtyIndex];
				for (const group of slot.groups) {
					const scratchIndex = this.#columnRowsScratchCount++;
					this.#columnRowsScratchGroups[scratchIndex] = group;
					this.#columnRowsScratchSources[scratchIndex] = sourceValue;
					this.#columnRowsScratchValues[scratchIndex] = void 0;
				}
			}
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) return false;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				this.#columnRowsScratchValues[index] = Object.is(this.#effectiveLastSourceValue(group), sourceValue) ? void 0 : group.project(sourceValue);
			}
			let wrote = false;
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				if (this.#columnRowsScratchCancelled) break;
				const group = this.#columnRowsScratchGroups[index];
				const sourceValue = this.#columnRowsScratchSources[index];
				if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) continue;
				const next = this.#columnRowsScratchValues[index];
				const preparedCopy = this.#prepareBoundCopy(group, next);
				const prepared = preparedCopy ?? next;
				if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) {
					this.#stageLastSourceValue(group, sourceValue);
					continue;
				}
				this.#writeBoundGroup(group, prepared, !!preparedCopy);
				if (this.#columnRowsScratchCancelled) break;
				this.#stageLastSourceValue(group, sourceValue);
				this.#stageLastValue(group, prepared, !!preparedCopy);
				wrote = true;
			}
			return wrote;
		} finally {
			for (let index = 0; index < this.#columnRowsScratchCount; index++) {
				this.#columnRowsScratchGroups[index] = void 0;
				this.#columnRowsScratchSources[index] = void 0;
				this.#columnRowsScratchValues[index] = void 0;
			}
			for (let index = 0; index < this.#preparedCellDirtyCount; index++) {
				this.#preparedCellDirtySlots[index] = void 0;
				this.#preparedCellDirtyValues[index] = void 0;
			}
			this.#columnRowsScratchCount = 0;
			this.#preparedCellDirtyCount = 0;
			this.#columnRowsScratchActive = false;
			if (this.#columnRowsScratchCancelled) {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
				this.#preparedCellDirtySlots.length = 0;
				this.#preparedCellDirtyValues.length = 0;
			}
			this.#columnRowsScratchCancelled = false;
		}
	}
	/** Scan caller-selected contiguous row buckets, skipping unchanged rows. */
	setColumnBuckets(columns, buckets, bucketCount = buckets.length, bucketSize = 64) {
		return this.#withNumericWriteGuard(() => this.#setColumnBuckets(columns, buckets, bucketCount, bucketSize));
	}
	#setColumnBuckets(columns, buckets, bucketCount, bucketSize) {
		if (!Number.isInteger(bucketCount) || bucketCount < 0 || bucketCount > buckets.length || !Number.isInteger(bucketSize) || bucketSize <= 0) throw new Error("Invalid dirty bucket descriptor");
		for (const column of columns) {
			if (!this.#groupsByCompiledColumnRows.has(column)) throw new Error("Numeric column is not bound in this VDOM root");
			for (let index = 0; index < bucketCount; index++) {
				const start = buckets[index] * bucketSize;
				if (!Number.isSafeInteger(start) || start >= column.values.length) throw new Error("Dirty bucket is outside the bound column rows");
			}
		}
		if (bucketCount === 0) return false;
		for (const column of columns) column.source.value++;
		const stagedGroups = [];
		const stagedSources = [];
		const stageToken = Symbol();
		for (const column of columns) {
			const rowGroups = this.#groupsByCompiledColumnRows.get(column);
			for (let index = 0; index < bucketCount; index++) {
				const start = buckets[index] * bucketSize;
				const end = Math.min(start + bucketSize, column.values.length);
				for (let row = start; row < end; row++) {
					const groups = rowGroups[row];
					if (!groups) continue;
					const sourceValue = column.values[row];
					for (const group of groups) {
						if (group.columnStageToken === stageToken) continue;
						group.columnStageToken = stageToken;
						if (Object.is(this.#effectiveLastSourceValue(group), sourceValue)) continue;
						stagedGroups.push(group);
						stagedSources.push(sourceValue);
					}
				}
			}
		}
		const stagedValues = [];
		for (let index = 0; index < stagedGroups.length; index++) stagedValues.push(stagedGroups[index].project(stagedSources[index]));
		return this.#writeStagedColumnValues(stagedGroups, stagedSources, stagedValues);
	}
	dispose() {
		const errors = [];
		this.#invalidateAllPreparedNumericCellPrograms();
		for (const source of this.#numericRowProgramsBySource.keys()) this.#invalidatePreparedNumericRowsForSource(source);
		this.#refPublicationEpoch++;
		if (this.#ownerRowExecutionActive) this.#ownerRowExecutionCancelled = true;
		this.#pendingRefs.clear();
		for (const node of this.#committedRefs.keys()) this.#pendingRefs.set(node, null);
		try {
			for (const child of this.#mounted) try {
				removeMountedSubtree(this.#renderHost, this.container, child, errors);
			} catch (error) {
				errors.push(error);
			}
			try {
				this.flushRefs();
			} catch (error) {
				errors.push(error);
			}
		} finally {
			this.#clearPendingHistory();
			this.#publicationToken = null;
			this.#publicationFailed = false;
			acceptedJournalByHost.delete(this.#renderHost);
			this.#acceptedJournal = null;
			this.#acceptedSnapshot = null;
			this.#keyedVNodeRetentionParents.clear();
			this.#mounted = [];
			this.#snapshot = [];
			this.#snapshotDirty = false;
			this.#nodesByKey.clear();
			this.#nodesByKeyedRegion.clear();
			this.#groupsBySource.clear();
			this.#programSourceSlots.clear();
			this.#numericRowProgramsBySource.clear();
			this.#programSinkSlots.length = 0;
			this.#programFreeSinkSlots.length = 0;
			this.#programSinkSlotByGroup.clear();
			this.#programDirtySources.length = 0;
			this.#programChangedSources.length = 0;
			this.#programAffectedSinks.length = 0;
			this.#programOutputValues.length = 0;
			this.#programDirtySourceCount = 0;
			this.#programChangedSourceCount = 0;
			this.#programAffectedSinkCount = 0;
			this.#programOutputCount = 0;
			if (this.#columnRowsScratchActive) this.#columnRowsScratchCancelled = true;
			else {
				this.#columnRowsScratchGroups.length = 0;
				this.#columnRowsScratchSources.length = 0;
				this.#columnRowsScratchValues.length = 0;
				this.#columnRowsScratchCount = 0;
				this.#preparedCellDirtySlots.length = 0;
				this.#preparedCellDirtyValues.length = 0;
				this.#preparedCellDirtyCount = 0;
			}
			if (!this.#ownerRowExecutionActive) {
				this.#ownerRowRecordScratch.length = 0;
				this.#ownerRowInputRecordScratch.length = 0;
				this.#ownerRowGroupScratch.length = 0;
				this.#ownerRowGroupRecordScratch.length = 0;
				this.#ownerRowValueScratch.length = 0;
				this.#ownerRowStagedInputIndices = /* @__PURE__ */ new Uint32Array(0);
				this.#ownerRowStagedSinkIds = /* @__PURE__ */ new Uint16Array(0);
				this.#ownerRowStagedValues.length = 0;
				this.#ownerRowRecordCount = 0;
				this.#ownerRowGroupCount = 0;
			}
			this.#incompatibleScalarBindingGroups = 0;
			this.#groupsByCompiledBinding.clear();
			this.#groupsByCompiledSource.clear();
			this.#groupsByCompiledColumnBinding.clear();
			this.#groupsByCompiledColumn.clear();
			this.#groupsByCompiledColumnRows.clear();
			this.#sourceColumnCells.clear();
			this.#pendingSourceColumnPrunes.clear();
			this.#groupsByColumnCell.clear();
			this.#compiledSlotBySource.clear();
			this.#compiledGraph = null;
			this.#directBindingWrites = false;
			this.#pendingRefs.clear();
			this.#committedRefs.clear();
		}
		if (errors.length > 0) throw new AggregateError(errors, "VDOM root disposal encountered host errors");
	}
	#withNumericWriteGuard(operation) {
		if (this.#numericWriteInProgress) throw new Error("Nested numeric VDOM writes are not supported");
		this.#numericWriteInProgress = true;
		try {
			return operation();
		} finally {
			this.#numericWriteInProgress = false;
		}
	}
	#writeStagedColumnValues(groups, sourceValues, nextValues) {
		let wrote = false;
		for (let index = 0; index < groups.length; index++) {
			const group = groups[index];
			const sourceValue = sourceValues[index];
			const next = nextValues[index];
			const preparedCopy = this.#prepareBoundCopy(group, next);
			const prepared = preparedCopy ?? next;
			if (sameBoundValueCanSkipWrite(this.#effectiveLastValue(group), prepared, group.forceWrite, this.#effectiveLastValueIsCopy(group), !!preparedCopy)) {
				this.#stageLastSourceValue(group, sourceValue);
				continue;
			}
			this.#writeBoundGroup(group, prepared, !!preparedCopy);
			this.#stageLastSourceValue(group, sourceValue);
			this.#stageLastValue(group, prepared, !!preparedCopy);
			wrote = true;
		}
		return wrote;
	}
	#writeBoundGroup(group, next, nextIsCopy = false) {
		const written = nextIsCopy ? next.writeValue : next;
		const previous = this.#effectiveLastValue(group);
		const before = this.#effectiveLastValueIsCopy(group) ? previous.writeValue : previous;
		if (group.styleProperty !== void 0) {
			if (group.styleWriter) group.styleWriter(written, before);
			else if (this.#renderHost.setStyleProp) this.#renderHost.setStyleProp(group.handle, group.styleProperty, written, before);
			else this.#renderHost.setProp(group.handle, "style", { [group.styleProperty]: written }, { [group.styleProperty]: before });
		} else this.#renderHost.setProp(group.handle, group.name, written, before);
	}
	#activateBoundPropGroup(group) {
		if (group.styleProperty === void 0 || !this.#renderHost.setStyleProp) return;
		const writer = this.#renderHost.prepareStyleProp?.(group.handle, group.styleProperty);
		if (typeof writer === "function") group.styleWriter = writer;
	}
	#makeScalarBindingGroups(node, name, rawValue, acceptedCopy) {
		const incompatible = hasNonScalarBindingMetadata(name, rawValue);
		if (this.#directBindingWrites && (name !== "style" || this.#renderHost.setStyleProp)) {
			const entries = name === "style" && typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue) ? Object.entries(rawValue) : [[void 0, rawValue]];
			const groups = [];
			for (const [styleProperty, item] of entries) {
				const binding = getBoundValue(item);
				if (!binding) continue;
				groups.push({
					handle: node.handle,
					name,
					styleProperty,
					project: binding.project,
					sources: binding.sources ?? [binding.source],
					rawValue: binding,
					lastValue: styleProperty === void 0 ? (acceptedCopy === void 0 && node.vnode.kind === "element" ? node.vnode.acceptedCopyProps?.[name] : acceptedCopy) ?? readBoundValue(binding) : readBoundValue(binding),
					lastValueIsCopy: styleProperty === void 0 && !!(acceptedCopy === void 0 && node.vnode.kind === "element" ? node.vnode.acceptedCopyProps?.[name] : acceptedCopy),
					forceWrite: !!binding.read
				});
			}
			if (groups.length > 0) return {
				groups,
				incompatible
			};
		}
		const sources = boundSourcesIn(name, rawValue);
		if (sources.length === 0) return {
			groups: [],
			incompatible: false
		};
		return {
			groups: [{
				handle: node.handle,
				name,
				sources,
				rawValue,
				lastValue: (acceptedCopy === void 0 && node.vnode.kind === "element" ? node.vnode.acceptedCopyProps?.[name] : acceptedCopy) ?? materializeProp(name, rawValue),
				lastValueIsCopy: !!(acceptedCopy === void 0 && node.vnode.kind === "element" ? node.vnode.acceptedCopyProps?.[name] : acceptedCopy),
				forceWrite: hasStableDerivedBinding(rawValue)
			}],
			incompatible
		};
	}
	#registerScalarBindingProp(node, name, rawValue, planned) {
		const plan = planned ?? this.#makeScalarBindingGroups(node, name, rawValue);
		const groups = plan.groups;
		if (groups.length === 0) return;
		for (const group of groups) this.#activateBoundPropGroup(group);
		(node.scalarBindingGroups ??= /* @__PURE__ */ new Map()).set(name, groups);
		this.#bindingIndexAttachOperations += groups.length;
		if (plan.incompatible) {
			(node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
			this.#incompatibleScalarBindingGroups++;
		}
		for (const group of groups) {
			if (!this.#programSinkSlotByGroup.has(group)) {
				const free = this.#programFreeSinkSlots.pop();
				const sinkSlot = free === void 0 ? this.#programSinkSlots.length : free;
				this.#programSinkSlots[sinkSlot] = group;
				this.#programSinkSlotByGroup.set(group, sinkSlot);
			}
			for (const source of group.sources) {
				this.#invalidatePreparedNumericRowsForSource(source);
				this.#pendingSourceColumnPrunes.delete(source);
				let list = this.#groupsBySource.get(source);
				if (!list) this.#groupsBySource.set(source, list = /* @__PURE__ */ new Set());
				const alreadyIndexed = list.has(group);
				list.add(group);
				let slot = this.#programSourceSlots.get(source);
				if (!slot) this.#programSourceSlots.set(source, slot = {
					source,
					groups: [],
					eligible: false,
					unaryEligible: false,
					epoch: 0,
					cellProgramGeneration: 0,
					preparedCutEpoch: 0,
					preparedCutValue: 0
				});
				if (!slot.groups.includes(group)) {
					this.#invalidatePreparedNumericCellProgram(slot);
					slot.groups.push(group);
				}
				this.#refreshProgramEligibility(slot);
				this.#indexSourceColumnGroup(source, group);
				if (!alreadyIndexed) this.#bindingIndexIndexOperations++;
			}
		}
	}
	#unregisterScalarBindingProp(node, name) {
		const groups = node.scalarBindingGroups?.get(name);
		if (groups) {
			let detached = false;
			for (const group of groups) {
				this.#unindexSourceColumnGroup(group);
				for (const source of group.sources) {
					this.#invalidatePreparedNumericRowsForSource(source);
					const list = this.#groupsBySource.get(source);
					if (!list || !list.delete(group)) continue;
					const programSlot = this.#programSourceSlots.get(source);
					if (programSlot) {
						this.#invalidatePreparedNumericCellProgram(programSlot);
						const index = programSlot.groups.indexOf(group);
						if (index !== -1) programSlot.groups.splice(index, 1);
					}
					if (programSlot && programSlot.groups.length === 0) this.#programSourceSlots.delete(source);
					else if (programSlot) this.#refreshProgramEligibility(programSlot);
					detached = true;
					this.#bindingIndexIndexOperations++;
					if (list.size === 0) {
						this.#groupsBySource.delete(source);
						if (this.#sourceColumnCells.has(source)) this.#pendingSourceColumnPrunes.add(source);
					}
				}
			}
			if (detached) this.#bindingIndexDetachOperations += groups.length;
			node.scalarBindingGroups?.delete(name);
			for (const group of groups) {
				this.#removeProgramSink(group);
				group.styleWriter = void 0;
			}
			if (node.scalarBindingGroups?.size === 0) node.scalarBindingGroups = void 0;
		}
		if (node.scalarIncompatibleBindingProps?.delete(name)) {
			this.#incompatibleScalarBindingGroups--;
			if (node.scalarIncompatibleBindingProps.size === 0) node.scalarIncompatibleBindingProps = void 0;
		}
	}
	#refreshProgramEligibility(slot) {
		const wasEligible = slot.eligible;
		let eligible = this.#directBindingWrites && slot.groups.length > 0;
		let unaryEligible = eligible;
		if (!eligible) {
			slot.eligible = false;
			slot.unaryEligible = false;
			if (wasEligible) this.#invalidatePreparedNumericCellProgram(slot);
			return;
		}
		for (const group of slot.groups) {
			const binding = getBoundValue(group.rawValue);
			const descriptor = binding?.numericProgram;
			if (!descriptor || descriptor.schemaVersion !== 1 && descriptor.schemaVersion !== 2 || typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 || descriptor.schemaVersion === 2 && (typeof descriptor.ownerProgramId !== "string" || descriptor.ownerProgramId.length === 0) || !Array.isArray(descriptor.sourceSites) || descriptor.sourceSites.length !== group.sources.length || descriptor.sourceSites.some((site) => typeof site !== "string") || !group.sources.includes(slot.source) || !binding.project || group.column !== void 0 || group.styleProperty !== void 0 && !group.styleWriter && !this.#renderHost.setStyleProp) {
				eligible = false;
				break;
			}
			if (group.sources.length !== 1 || group.sources[0] !== slot.source || typeof group.project !== "function" || group.column !== void 0 || descriptor.sourceSites.length !== 1) unaryEligible = false;
		}
		slot.eligible = eligible;
		slot.unaryEligible = eligible && unaryEligible;
		if (wasEligible !== eligible) this.#invalidatePreparedNumericCellProgram(slot);
	}
	#invalidatePreparedNumericCellProgram(slot) {
		slot.cellProgramGeneration++;
		const record = slot.cellProgram;
		if (record) {
			record.active = false;
			record.groups = void 0;
			this.#preparedCellProgramRecords.delete(record.token);
			slot.cellProgram = void 0;
		}
	}
	#invalidateAllPreparedNumericCellPrograms() {
		for (const slot of this.#programSourceSlots.values()) this.#invalidatePreparedNumericCellProgram(slot);
	}
	#isUnaryColumnGroup(source, group) {
		const descriptor = getBoundValue(group.rawValue)?.numericProgram;
		const supportedDescriptor = !!descriptor && (descriptor.schemaVersion === 1 || descriptor.schemaVersion === 2 && typeof descriptor.ownerProgramId === "string" && descriptor.ownerProgramId.length > 0);
		return group.sources.length === 1 && group.sources[0] === source && typeof group.project === "function" && group.column === void 0 && supportedDescriptor && descriptor.sourceSites.length === 1 && typeof descriptor.sourceSites[0] === "string";
	}
	#indexSourceColumnGroup(source, group) {
		const cell = this.#sourceColumnCells.get(source);
		if (!cell || !this.#isUnaryColumnGroup(source, group)) return;
		let rows = this.#groupsByColumnCell.get(cell.column);
		if (!rows) this.#groupsByColumnCell.set(cell.column, rows = /* @__PURE__ */ new Map());
		let groups = rows.get(cell.row);
		if (!groups) rows.set(cell.row, groups = []);
		if (!groups.includes(group)) groups.push(group);
		group.sourceColumn = cell.column;
		group.sourceColumnRow = cell.row;
	}
	#unindexSourceColumnGroup(group) {
		const column = group.sourceColumn;
		const row = group.sourceColumnRow;
		if (!column || row === void 0) return;
		const rows = this.#groupsByColumnCell.get(column);
		const groups = rows?.get(row);
		if (groups) {
			const index = groups.indexOf(group);
			if (index !== -1) groups.splice(index, 1);
			if (groups.length === 0) rows.delete(row);
			if (rows.size === 0) this.#groupsByColumnCell.delete(column);
		}
		group.sourceColumn = void 0;
		group.sourceColumnRow = void 0;
	}
	#pruneSourceColumnCells() {
		for (const source of this.#pendingSourceColumnPrunes) {
			this.#sourceColumnPruneVisits++;
			if (!this.#groupsBySource.get(source)?.size) this.#sourceColumnCells.delete(source);
		}
		this.#pendingSourceColumnPrunes.clear();
	}
	#removeProgramSink(group) {
		const index = this.#programSinkSlotByGroup.get(group);
		if (index === void 0) return;
		this.#programSinkSlotByGroup.delete(group);
		this.#programSinkSlots[index] = void 0;
		this.#programFreeSinkSlots.push(index);
	}
	#refreshScalarBindingProp(node, name, rawValue, acceptedCopy) {
		const oldGroups = node.scalarBindingGroups?.get(name) ?? [];
		const oldIncompatible = node.scalarIncompatibleBindingProps?.has(name) ?? false;
		const plan = this.#makeScalarBindingGroups(node, name, rawValue, acceptedCopy);
		const nextGroups = plan.groups;
		const nextIncompatible = plan.incompatible;
		if (oldGroups.length === nextGroups.length && oldGroups.every((old, index) => old.rawValue === nextGroups[index].rawValue) && oldIncompatible === nextIncompatible) {
			for (let index = 0; index < oldGroups.length; index++) {
				const group = oldGroups[index];
				if (group.styleProperty === void 0 && (acceptedCopy || this.#effectiveLastValueIsCopy(group))) this.#stageLastValue(group, nextGroups[index].lastValue, !!nextGroups[index].lastValueIsCopy);
			}
			return;
		}
		if (oldGroups.length === nextGroups.length && oldGroups.every((old, index) => {
			const next = nextGroups[index];
			return old.styleProperty === next.styleProperty && old.sources.length === next.sources.length && old.sources.every((source, sourceIndex) => source === next.sources[sourceIndex]);
		})) {
			for (const old of oldGroups) this.#unindexSourceColumnGroup(old);
			for (let index = 0; index < oldGroups.length; index++) {
				const old = oldGroups[index];
				const next = nextGroups[index];
				for (const source of old.sources) this.#invalidatePreparedNumericRowsForSource(source);
				old.rawValue = next.rawValue;
				old.project = next.project;
				this.#stageLastValue(old, next.lastValue, !!next.lastValueIsCopy);
				old.forceWrite = next.forceWrite;
				for (const source of old.sources) {
					const slot = this.#programSourceSlots.get(source);
					if (slot) {
						this.#invalidatePreparedNumericCellProgram(slot);
						this.#refreshProgramEligibility(slot);
					}
				}
			}
			for (const old of oldGroups) for (const source of old.sources) if (this.#programSourceSlots.get(source)?.eligible && this.#sourceColumnCells.has(source)) this.#indexSourceColumnGroup(source, old);
			if (oldIncompatible !== nextIncompatible) this.#incompatibleScalarBindingGroups += nextIncompatible ? 1 : -1;
			if (nextIncompatible) (node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
			else {
				node.scalarIncompatibleBindingProps?.delete(name);
				if (node.scalarIncompatibleBindingProps?.size === 0) node.scalarIncompatibleBindingProps = void 0;
			}
			return;
		}
		this.#unregisterScalarBindingProp(node, name);
		if (!nextIncompatible) node.scalarIncompatibleBindingProps?.delete(name);
		this.#registerScalarBindingProp(node, name, rawValue, plan);
	}
	#attachScalarBindingNode(node) {
		if (node.vnode.kind !== "element") return;
		const authored = node.vnode.scopedSourceProps ?? node.vnode.props;
		for (const [name, rawValue] of Object.entries(authored)) this.#registerScalarBindingProp(node, name, rawValue);
	}
	#detachScalarBindingNode(node) {
		if (node.vnode.kind !== "element") return;
		const names = /* @__PURE__ */ new Set([...node.scalarBindingGroups?.keys() ?? [], ...node.scalarIncompatibleBindingProps ?? []]);
		for (const name of names) this.#unregisterScalarBindingProp(node, name);
	}
	/** Attach ordinary scalar prop writers for only the newly mounted subtree. */
	#attachScalarBindingSubtree(node) {
		const visit = (mounted) => {
			this.#attachScalarBindingNode(mounted);
			forEachMountedChild(mounted, visit);
		};
		visit(node);
	}
	/** Detach writer groups before their hosts leave or change their props. */
	#detachScalarBindingSubtree(node) {
		const visit = (mounted) => {
			this.#detachScalarBindingNode(mounted);
			forEachMountedChild(mounted, visit);
		};
		visit(node);
	}
	#rebuildBindingIndex() {
		let visits = 0;
		const countVisits = this.#profileCounter !== void 0;
		this.#invalidateAllPreparedNumericCellPrograms();
		for (const source of this.#numericRowProgramsBySource.keys()) this.#invalidatePreparedNumericRowsForSource(source);
		this.#groupsBySource.clear();
		this.#programSourceSlots.clear();
		this.#programSinkSlots.length = 0;
		this.#programFreeSinkSlots.length = 0;
		this.#programSinkSlotByGroup.clear();
		this.#incompatibleScalarBindingGroups = 0;
		this.#groupsByCompiledBinding.clear();
		this.#groupsByCompiledSource.clear();
		this.#groupsByCompiledColumnBinding.clear();
		this.#groupsByCompiledColumn.clear();
		this.#groupsByCompiledColumnRows.clear();
		this.#groupsByColumnCell.clear();
		this.#pendingSourceColumnPrunes.clear();
		this.#compiledSlotBySource.clear();
		if (this.#compiledGraph) this.#validateCompiledGraph(this.#compiledGraph);
		const visit = (node) => {
			if (node.hostDisposed) {
				node.scalarBindingGroups = void 0;
				node.scalarIncompatibleBindingProps = void 0;
				return;
			}
			if (countVisits) visits++;
			if (node.scalarBindingGroups) for (const groups of node.scalarBindingGroups.values()) for (const group of groups) group.styleWriter = void 0;
			node.scalarBindingGroups = void 0;
			node.scalarIncompatibleBindingProps = void 0;
			if (node.vnode.kind === "element") {
				const authored = node.vnode.scopedSourceProps ?? node.vnode.props;
				for (const [name, rawValue] of Object.entries(authored)) if (this.#compiledGraph) for (const binding of compiledBindingsIn(name, rawValue)) {
					const existingSlot = this.#compiledSlotBySource.get(binding.source);
					if (existingSlot !== void 0 && existingSlot !== binding.sourceSlot) throw new Error("One scalar source cannot occupy multiple slots in a compiled VDOM root");
					this.#compiledSlotBySource.set(binding.source, binding.sourceSlot);
					const rowStart = this.#compiledGraph.sourceBindingOffsets[binding.sourceSlot];
					const rowEnd = this.#compiledGraph.sourceBindingOffsets[binding.sourceSlot + 1];
					let found = false;
					for (let edge = rowStart; edge < rowEnd; edge++) if (this.#compiledGraph.bindingIds[edge] === binding.bindingId) found = true;
					if (!found) throw new Error(`Compiled binding ${binding.bindingId} is absent from source slot ${binding.sourceSlot}`);
					let byBinding = this.#groupsByCompiledBinding.get(binding.source);
					if (!byBinding) this.#groupsByCompiledBinding.set(binding.source, byBinding = /* @__PURE__ */ new Map());
					const column = binding.binding.column;
					const columnIndex = binding.binding.entityIndex;
					if (column && (!Number.isInteger(columnIndex) || columnIndex < 0)) throw new Error("Compiled column binding has an invalid entity index");
					const group = {
						handle: node.handle,
						name,
						styleProperty: binding.styleProperty,
						project: binding.binding.project,
						...column ? {
							column,
							columnIndex,
							lastSourceValue: column.values[columnIndex]
						} : {},
						sources: [binding.source],
						rawValue: binding.binding,
						lastValue: node.vnode.acceptedCopyProps?.[name] ?? (column ? binding.binding.project(column.values[columnIndex]) : binding.binding.project(binding.source.value)),
						lastValueIsCopy: !!node.vnode.acceptedCopyProps?.[name]
					};
					this.#activateBoundPropGroup(group);
					const bindingGroups = byBinding.get(binding.bindingId);
					if (bindingGroups) bindingGroups.push(group);
					else byBinding.set(binding.bindingId, [group]);
					if (column) {
						let columnBindings = this.#groupsByCompiledColumnBinding.get(column);
						if (!columnBindings) this.#groupsByCompiledColumnBinding.set(column, columnBindings = /* @__PURE__ */ new Map());
						const columnGroups = columnBindings.get(binding.bindingId);
						if (columnGroups) columnGroups.push(group);
						else columnBindings.set(binding.bindingId, [group]);
					}
				}
				else {
					if (this.#directBindingWrites && (name !== "style" || this.#renderHost.setStyleProp)) {
						const values = name === "style" && typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue) ? Object.entries(rawValue) : [[void 0, rawValue]];
						let foundBinding = false;
						for (const [styleProperty, item] of values) {
							const binding = getBoundValue(item);
							if (!binding) continue;
							foundBinding = true;
							const group = {
								handle: node.handle,
								name,
								styleProperty,
								project: binding.project,
								rawValue: binding,
								sources: binding.sources ?? [binding.source],
								lastValue: styleProperty === void 0 ? node.vnode.acceptedCopyProps?.[name] ?? readBoundValue(binding) : readBoundValue(binding),
								lastValueIsCopy: styleProperty === void 0 && !!node.vnode.acceptedCopyProps?.[name],
								forceWrite: !!binding.read
							};
							this.#activateBoundPropGroup(group);
							const groups = node.scalarBindingGroups?.get(name) ?? [];
							groups.push(group);
							(node.scalarBindingGroups ??= /* @__PURE__ */ new Map()).set(name, groups);
							for (const source of binding.sources ?? [binding.source]) {
								const list = this.#groupsBySource.get(source);
								if (list) list.add(group);
								else this.#groupsBySource.set(source, /* @__PURE__ */ new Set([group]));
							}
						}
						if (foundBinding) {
							if (hasNonScalarBindingMetadata(name, rawValue)) {
								this.#incompatibleScalarBindingGroups++;
								(node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
							}
							continue;
						}
					}
					const sources = boundSourcesIn(name, rawValue);
					if (sources.length === 0) continue;
					if ((name === "style" && typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue) ? Object.values(rawValue) : [rawValue]).some((item) => {
						const binding = getBoundValue(item);
						return !!binding && (binding.bindingId !== void 0 || binding.sourceSlot !== void 0 || binding.column !== void 0);
					})) {
						this.#incompatibleScalarBindingGroups++;
						(node.scalarIncompatibleBindingProps ??= /* @__PURE__ */ new Set()).add(name);
					}
					const group = {
						handle: node.handle,
						name,
						sources,
						rawValue,
						lastValue: node.vnode.acceptedCopyProps?.[name] ?? materializeProp(name, rawValue),
						lastValueIsCopy: !!node.vnode.acceptedCopyProps?.[name],
						forceWrite: hasStableDerivedBinding(rawValue)
					};
					(node.scalarBindingGroups ??= /* @__PURE__ */ new Map()).set(name, [group]);
					for (const source of sources) {
						const list = this.#groupsBySource.get(source);
						if (list) list.add(group);
						else this.#groupsBySource.set(source, /* @__PURE__ */ new Set([group]));
					}
				}
			}
			forEachMountedChild(node, visit);
		};
		for (const node of this.#mounted) visit(node);
		for (const source of this.#sourceColumnCells.keys()) {
			this.#sourceColumnPruneVisits++;
			const groups = this.#groupsBySource.get(source);
			if (!groups?.size) {
				this.#sourceColumnCells.delete(source);
				continue;
			}
			for (const group of groups) this.#indexSourceColumnGroup(source, group);
		}
		if (countVisits) this.#profileCounter?.({ "vdom.binding-index.full-rebuild-visits": visits });
		if (this.#compiledGraph) {
			for (const [source, byBinding] of this.#groupsByCompiledBinding) {
				const slot = this.#compiledSlotBySource.get(source);
				const groups = [];
				const start = this.#compiledGraph.sourceBindingOffsets[slot];
				const end = this.#compiledGraph.sourceBindingOffsets[slot + 1];
				for (let edge = start; edge < end; edge++) {
					const bindingGroups = byBinding.get(this.#compiledGraph.bindingIds[edge]);
					if (bindingGroups) groups.push(...bindingGroups);
				}
				if (groups.length > 0) this.#groupsByCompiledSource.set(source, groups);
			}
			for (const [column, byBinding] of this.#groupsByCompiledColumnBinding) {
				const groups = [];
				const rowGroups = [];
				const start = this.#compiledGraph.sourceBindingOffsets[column.sourceSlot];
				const end = this.#compiledGraph.sourceBindingOffsets[column.sourceSlot + 1];
				for (let edge = start; edge < end; edge++) {
					const bindingGroups = byBinding.get(this.#compiledGraph.bindingIds[edge]);
					if (bindingGroups) for (const group of bindingGroups) {
						groups.push(group);
						const row = group.columnIndex;
						const indexed = rowGroups[row];
						if (indexed) indexed.push(group);
						else rowGroups[row] = [group];
					}
				}
				if (groups.length > 0) {
					this.#groupsByCompiledColumn.set(column, groups);
					this.#groupsByCompiledColumnRows.set(column, rowGroups);
				}
			}
		}
		for (const [source, groups] of this.#groupsBySource) {
			const slot = {
				source,
				groups: Array.from(groups),
				eligible: false,
				unaryEligible: false,
				epoch: 0,
				cellProgramGeneration: 0,
				preparedCutEpoch: 0,
				preparedCutValue: 0
			};
			this.#programSourceSlots.set(source, slot);
			for (const group of groups) if (!this.#programSinkSlotByGroup.has(group)) {
				this.#programSinkSlotByGroup.set(group, this.#programSinkSlots.length);
				this.#programSinkSlots.push(group);
			}
			this.#refreshProgramEligibility(slot);
		}
	}
	#clearBindingIndex() {
		this.#invalidateAllPreparedNumericCellPrograms();
		this.#groupsBySource.clear();
		this.#programSourceSlots.clear();
		this.#programSinkSlots.length = 0;
		this.#programFreeSinkSlots.length = 0;
		this.#programSinkSlotByGroup.clear();
		this.#incompatibleScalarBindingGroups = 0;
		this.#groupsByCompiledBinding.clear();
		this.#groupsByCompiledSource.clear();
		this.#groupsByCompiledColumnBinding.clear();
		this.#groupsByCompiledColumn.clear();
		this.#groupsByCompiledColumnRows.clear();
		this.#sourceColumnCells.clear();
		this.#pendingSourceColumnPrunes.clear();
		this.#groupsByColumnCell.clear();
		this.#compiledSlotBySource.clear();
		const clear = (node) => {
			if (node.scalarBindingGroups) for (const groups of node.scalarBindingGroups.values()) for (const group of groups) group.styleWriter = void 0;
			node.scalarBindingGroups = void 0;
			node.scalarIncompatibleBindingProps = void 0;
			forEachMountedChild(node, clear);
		};
		for (const node of this.#mounted) clear(node);
	}
	#rebuildKeyIndex() {
		this.#nodesByKey.clear();
		this.#nodesByKeyedRegion.clear();
		let visits = 0;
		const countVisits = this.#profileCounter !== void 0;
		const visit = (node) => {
			if (node.hostDisposed) return;
			if (countVisits) visits++;
			this.#addToKeyIndex(node);
			forEachMountedChild(node, visit);
		};
		for (const node of this.#mounted) visit(node);
		if (countVisits) this.#profileCounter?.({ "vdom.key-index.full-rebuild-visits": visits });
	}
	#addToKeyIndex(node) {
		const key = node.vnode.key;
		if (key !== null) {
			let set = this.#nodesByKey.get(key);
			if (!set) this.#nodesByKey.set(key, set = /* @__PURE__ */ new Set());
			set.add(node);
		}
		if (node.vnode.kind === "element" && node.vnode.keyedRegionId !== null) {
			let set = this.#nodesByKeyedRegion.get(node.vnode.keyedRegionId);
			if (!set) this.#nodesByKeyedRegion.set(node.vnode.keyedRegionId, set = /* @__PURE__ */ new Set());
			set.add(node);
		}
	}
	#removeFromKeyIndex(node) {
		this.#removeKeyFromIndex(node.vnode.key, node);
		if (node.vnode.kind === "element" && node.vnode.keyedRegionId !== null) {
			const set = this.#nodesByKeyedRegion.get(node.vnode.keyedRegionId);
			set?.delete(node);
			if (set?.size === 0) this.#nodesByKeyedRegion.delete(node.vnode.keyedRegionId);
		}
	}
	#removeKeyFromIndex(key, node) {
		if (key === null) return;
		const set = this.#nodesByKey.get(key);
		set?.delete(node);
		if (set?.size === 0) this.#nodesByKey.delete(key);
	}
	#validateCompiledGraph(graph) {
		if (!Number.isInteger(graph.sourceCount) || graph.sourceCount < 0 || graph.sourcePaths.length !== graph.sourceCount || graph.sourceBindingOffsets.length !== graph.sourceCount + 1 || graph.sourceBindingOffsets[0] !== 0 || graph.sourceBindingOffsets[graph.sourceCount] !== graph.bindingIds.length) throw new Error("Malformed compiled VDOM dependency graph");
		for (let slot = 0; slot < graph.sourceCount; slot++) if (!Number.isInteger(graph.sourceBindingOffsets[slot]) || graph.sourceBindingOffsets[slot] > graph.sourceBindingOffsets[slot + 1]) throw new Error(`Malformed compiled VDOM source range at slot ${slot}`);
	}
};
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
	} else style[name] = value == null ? "" : String(value);
};
var DOMVDOMHost = class DOMVDOMHost {
	createElement(tag, parent) {
		if (tag.toLowerCase() === "svg") return document.createElementNS(SVG_NAMESPACE, tag);
		const parentElement = parent instanceof Element ? parent : null;
		const parentIsSvg = parentElement?.namespaceURI === SVG_NAMESPACE;
		const parentIsForeignObject = parentIsSvg && parentElement?.localName === "foreignObject";
		if (parentIsSvg && !parentIsForeignObject) return document.createElementNS(SVG_NAMESPACE, tag);
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
			for (const key of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) {
				if (Object.is(before[key], after[key])) continue;
				writeStyle(node.style, key, after[key]);
			}
			return;
		}
		if (/^on[A-Z]/.test(name)) {
			const eventName = name.slice(2).toLowerCase();
			if (typeof previous === "function") node.removeEventListener(eventName, previous);
			if (typeof value === "function") node.addEventListener(eventName, value);
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
				if (value == null || value === false) node.removeAttributeNS(XLINK_NAMESPACE, "href");
				else node.setAttributeNS(XLINK_NAMESPACE, "xlink:href", String(value));
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
		} else if (value == null || value === false) node.removeAttribute(name);
		else if (name in node && !name.startsWith("aria-") && !name.startsWith("data-")) node[name] = value;
		else node.setAttribute(name, value === true ? "" : String(value));
	}
	describePropertyWrite(node, name, next) {
		let valuePolicy = "unknown";
		if (Object.getPrototypeOf(this) === DOMVDOMHost.prototype && Object.getOwnPropertyDescriptor(this, "setProp") === void 0 && Object.getOwnPropertyDescriptor(DOMVDOMHost.prototype, "setProp")?.value === domBaseSetProp && (node instanceof HTMLElement || node instanceof SVGElement)) {
			if (name === "style") valuePolicy = "copy";
			else if (/^on[A-Z]/.test(name)) {
				if (typeof next === "function") valuePolicy = "retain";
			} else if (name === "className" || name.startsWith("aria-") || name.startsWith("data-") || node instanceof SVGElement || name === "htmlFor" && node instanceof HTMLLabelElement || name === "value" && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) valuePolicy = "copy";
		}
		return Object.freeze({
			valuePolicy,
			targetResource: null,
			valueResource: null,
			mayThrow: true
		});
	}
	setStyleProp(node, name, value) {
		if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
		writeStyle(node.style, name, value);
	}
	prepareStyleProp(node, name) {
		if (this.setStyleProp !== DOMVDOMHost.prototype.setStyleProp) return;
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
var domBaseSetProp = DOMVDOMHost.prototype.setProp;
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/derived_region_runtime.js
var DerivedRegionDispatcher = class {
	graph;
	#pending;
	#pendingRegions = [];
	#processingRegions = [];
	constructor(graph) {
		this.graph = graph;
		const { source_count, source_paths, source_region_offsets, region_ids } = graph;
		if (!Number.isInteger(source_count) || source_count < 0 || source_paths.length !== source_count || source_region_offsets.length !== source_count + 1 || source_region_offsets[0] !== 0 || source_region_offsets[source_count] !== region_ids.length) throw new Error("Malformed derived-region CSR graph");
		let regionCount = 0;
		for (let source = 0; source < source_count; source++) {
			const start = source_region_offsets[source];
			const end = source_region_offsets[source + 1];
			if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > region_ids.length) throw new Error(`Malformed derived-region source range at slot ${source}`);
		}
		for (const region of region_ids) {
			if (!Number.isInteger(region) || region < 0) throw new Error("Derived-region graph contains an invalid region ID");
			regionCount = Math.max(regionCount, region + 1);
		}
		this.#pending = new Uint8Array(regionCount);
	}
	invalidateSourceSlot(sourceSlot) {
		const { source_count, source_region_offsets, region_ids } = this.graph;
		if (!Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= source_count) throw new RangeError(`Derived-region source slot out of range: ${sourceSlot}`);
		for (let edge = source_region_offsets[sourceSlot]; edge < source_region_offsets[sourceSlot + 1]; edge++) {
			const region = region_ids[edge];
			if (this.#pending[region] === 0) {
				this.#pending[region] = 1;
				this.#pendingRegions.push(region);
			}
		}
	}
	/** Run each invalidated region once, in first-invalidation order. */
	flush(runRegion) {
		const processing = this.#pendingRegions;
		this.#pendingRegions = this.#processingRegions;
		this.#processingRegions = processing;
		this.#pendingRegions.length = 0;
		let index = 0;
		try {
			for (; index < processing.length; index++) {
				const region = processing[index];
				this.#pending[region] = 0;
				runRegion(region);
			}
			return processing.length;
		} finally {
			for (; index < processing.length; index++) this.#pending[processing[index]] = 0;
			processing.length = 0;
		}
	}
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/keyed_collection.js
var readerAcknowledgements = /* @__PURE__ */ new WeakMap();
var collectionVersions = /* @__PURE__ */ new WeakMap();
/** @internal Read the creator-owned collection version without public getters. */
var canonicalCollectionVersion = (collection) => typeof collection === "object" && collection !== null ? collectionVersions.get(collection)?.getVersion() ?? null : null;
/** @internal Opaque creator-owned entry identity for a live key. */
var canonicalCollectionEntry = (collection, key) => typeof collection === "object" && collection !== null ? collectionVersions.get(collection)?.entryForKey(key) : void 0;
/** @internal Verify public methods without executing caller-replaceable getters. */
var canonicalCollectionApiIntact = (collection) => {
	if (typeof collection !== "object" || collection === null) return false;
	const record = collectionVersions.get(collection);
	if (!record) return false;
	const keys = Reflect.ownKeys(collection);
	if (keys.length !== record.descriptors.size) return false;
	return keys.every((key) => {
		const initial = record.descriptors.get(key);
		const now = Object.getOwnPropertyDescriptor(collection, key);
		if (!initial || !now || initial.configurable !== now.configurable || initial.enumerable !== now.enumerable) return false;
		if ("value" in initial) return "value" in now && initial.writable === now.writable && Object.is(initial.value, now.value);
		return !("value" in now) && initial.get === now.get && initial.set === now.set;
	});
};
/** @internal Stage exact acceptance; the callback reports whether the reader caught up. */
function prepareCollectionReaderAcknowledgement(reader, version) {
	return readerAcknowledgements.get(reader)?.(version) ?? null;
}
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/component_state_runtime.js
var collectCleanupErrors = (actions) => {
	const errors = [];
	for (const action of actions) try {
		action();
	} catch (error) {
		errors.push(error);
	}
	return errors;
};
var throwWithCleanup = (error, errors) => {
	if (errors.length) throw new AggregateError([error, ...errors], "Publication and cleanup failed");
	throw error;
};
var sameClosedHostOutput = (tag, name, previous, next) => {
	if (Object.is(previous, next)) return true;
	try {
		const oldValue = snapshotScopedHostProp(tag, name, previous);
		const newValue = snapshotScopedHostProp(tag, name, next);
		if (!oldValue.accepted || !newValue.accepted) return false;
		const old = oldValue.value, proposed = newValue.value;
		if (Object.is(old, proposed)) return true;
		if (Array.isArray(old) && Array.isArray(proposed)) return old.length === proposed.length && old.every((value, index) => Object.is(value, proposed[index]));
		if (old && proposed && typeof old === "object" && typeof proposed === "object") {
			const keys = Object.keys(old);
			return keys.length === Object.keys(proposed).length && keys.every((key) => Object.hasOwn(proposed, key) && Object.is(old[key], proposed[key]));
		}
		return false;
	} catch {
		return false;
	}
};
var componentRegistration = Symbol("compiled-component-registration");
var definedComponents = /* @__PURE__ */ new WeakMap();
var SparseCandidateIneligible = class extends Error {};
var HeldPublicationWait = class extends Error {
	resource;
	constructor(resource) {
		super("Publication is held");
		this.resource = resource;
	}
};
var groupPublicationReceipts = /* @__PURE__ */ new WeakMap();
var sameClosedBoundaryNode = (left, right, depth = 0) => {
	if (Object.is(left, right)) return true;
	if (depth > 32 || !isRuntimeOwnedElement(left) || !isRuntimeOwnedElement(right)) return false;
	const leftType = Object.getOwnPropertyDescriptor(left, "type")?.value;
	const rightType = Object.getOwnPropertyDescriptor(right, "type")?.value;
	const leftProps = Object.getOwnPropertyDescriptor(left, "props")?.value;
	const rightProps = Object.getOwnPropertyDescriptor(right, "props")?.value;
	if (leftType !== rightType || !leftProps || !rightProps || Object.getPrototypeOf(leftProps) !== Object.prototype || Object.getPrototypeOf(rightProps) !== Object.prototype || !Object.isFrozen(leftProps) || !Object.isFrozen(rightProps)) return false;
	const leftKeys = Reflect.ownKeys(leftProps);
	const rightKeys = Reflect.ownKeys(rightProps);
	if (leftKeys.length !== rightKeys.length || leftKeys.length > 64) return false;
	return leftKeys.every((key, index) => {
		if (key !== rightKeys[index]) return false;
		const a = Object.getOwnPropertyDescriptor(leftProps, key);
		const b = Object.getOwnPropertyDescriptor(rightProps, key);
		return !!a && !!b && "value" in a && "value" in b && sameClosedBoundaryNode(a.value, b.value, depth + 1);
	});
};
var sameClosedBoundaryProps = (element, accepted) => {
	if (!isRuntimeOwnedElement(element)) return false;
	const props = Object.getOwnPropertyDescriptor(element, "props")?.value;
	if (!props || Object.getPrototypeOf(props) !== Object.prototype || Object.getPrototypeOf(accepted) !== Object.prototype || !Object.isFrozen(props)) return false;
	const keys = Reflect.ownKeys(props);
	const acceptedKeys = Reflect.ownKeys(accepted);
	if (keys.length !== acceptedKeys.length || keys.length > 64) return false;
	return keys.every((key, index) => {
		if (key !== acceptedKeys[index]) return false;
		const current = Object.getOwnPropertyDescriptor(props, key);
		const previous = Object.getOwnPropertyDescriptor(accepted, key);
		return !!current && !!previous && "value" in current && "value" in previous && sameClosedBoundaryNode(current.value, previous.value);
	});
};
var collectionRegionDescriptors = /* @__PURE__ */ new WeakMap();
var activeOwners = [];
var StaleCollectionCandidate = class extends Error {};
/** Native local resource boundary. The runtime recognizes this marker before invoking it. */
var Suspense = (props) => props.children ?? null;
var isPendingResource = (error) => isPendingResourceToken(error);
var worldResourceTables = /* @__PURE__ */ new WeakMap();
var ExpansionJournal = class {
	#undo = [];
	checkpoint() {
		return this.#undo.length;
	}
	clear() {
		this.#undo.length = 0;
	}
	rollback(cursor) {
		for (let i = this.#undo.length - 1; i >= cursor; i--) this.#undo[i]();
		this.#undo.length = cursor;
	}
	set(map, key, value) {
		const had = map.has(key), previous = map.get(key);
		this.#undo.push(() => had ? map.set(key, previous) : map.delete(key));
		map.set(key, value);
	}
	add(set, value) {
		const had = set.has(value);
		this.#undo.push(() => {
			if (!had) set.delete(value);
		});
		set.add(value);
	}
	push(array, value) {
		this.#undo.push(() => {
			array.pop();
		});
		array.push(value);
	}
	undo(callback) {
		this.#undo.push(callback);
	}
};
var effectKey = (owner, siteId) => `${owner}\u0000${siteId}`;
var closedCandidateValidate = () => false;
var closedCandidateAction = () => {
	throw new Error("Native root candidate is closed");
};
var closedCandidateNoop = () => {};
var closedCandidateLease = () => closedCandidateNoop;
/** Attach the stable component-site ID that a compiler would emit for a function component. */
var defineComponent = (siteId, render, metadata) => {
	if (siteId.length === 0) throw new Error("Component site ID must not be empty");
	const priorDefinition = definedComponents.get(render);
	if (priorDefinition && priorDefinition.siteId === siteId && !metadata && !priorDefinition.metadata && siteId.lastIndexOf("#component:") < 0) return render;
	if (priorDefinition) throw new TypeError("Component function is already registered");
	const moduleEnd = siteId.lastIndexOf("#component:");
	let normalizedMetadata;
	if (metadata || moduleEnd >= 0) {
		const propOnlySites = [...metadata?.propOnlySites ?? []];
		if (propOnlySites.some((site) => typeof site !== "string" || !site)) throw new Error("Component prop-only metadata contains an invalid state site ID");
		if (metadata?.numericPrimitiveProps !== void 0 && !Array.isArray(metadata.numericPrimitiveProps)) throw new Error("Component numeric primitive prop metadata is invalid");
		const numericPrimitiveProps = metadata?.numericPrimitiveProps === void 0 ? void 0 : [...metadata.numericPrimitiveProps];
		if (numericPrimitiveProps?.some((name) => typeof name !== "string" || !name || name === "key" || name === "ref")) throw new Error("Component numeric primitive prop metadata is invalid");
		if (metadata?.closedCollectionSites !== void 0 && !Array.isArray(metadata.closedCollectionSites)) throw new Error("Component collection site metadata is invalid");
		const closedCollectionSites = metadata?.closedCollectionSites === void 0 ? void 0 : [...metadata.closedCollectionSites];
		if (closedCollectionSites?.some((site) => typeof site !== "string" || !site)) throw new Error("Component collection site metadata is invalid");
		let stateLayout;
		if (metadata?.stateLayout !== void 0) {
			const layout = metadata.stateLayout;
			if (layout.programId !== void 0 && layout.programId !== siteId) throw new Error("Compiled state layout program ID must match its component site");
			const normalized = normalizeCompiledStateLayout(layout);
			if (normalized.slots.some((entry) => !propOnlySites.includes(entry.siteId))) throw new Error("Invalid compiled state layout slot");
			stateLayout = normalized;
		}
		if (metadata?.ownerUpdateProgram !== void 0) {
			const program = metadata.ownerUpdateProgram;
			if (!stateLayout || program.programId !== siteId || stateLayout.programId !== siteId) throw new Error("Compiled owner update program must match its component and state layout IDs");
			associateCompiledOwnerUpdateProgram(stateLayout, program);
		}
		const closedResourceHostProgram = metadata?.closedResourceHostProgram === void 0 ? void 0 : normalizeClosedResourceHostProgram(metadata.closedResourceHostProgram);
		if (metadata?.closedResourceHostProgram !== void 0 && (!closedResourceHostProgram || closedResourceHostProgram.componentProgramId !== siteId)) throw new Error("Closed resource host program must match its component revision");
		const closedStoreHostProgram = metadata?.closedStoreHostProgram === void 0 ? void 0 : normalizeClosedStoreHostProgram(metadata.closedStoreHostProgram);
		if (metadata?.closedStoreHostProgram !== void 0 && (!closedStoreHostProgram || closedStoreHostProgram.componentProgramId !== siteId)) throw new Error("Closed Store host program must match its component revision");
		const closedComponentForwardProgram = metadata?.closedComponentForwardProgram === void 0 ? void 0 : normalizeClosedComponentForwardProgram(metadata.closedComponentForwardProgram);
		if (metadata?.closedComponentForwardProgram !== void 0 && (!closedComponentForwardProgram || closedComponentForwardProgram.componentProgramId !== siteId)) throw new Error("Closed component forward program must match its component revision");
		const revisions = [
			stateLayout?.moduleRevision,
			closedResourceHostProgram?.moduleRevision,
			closedStoreHostProgram?.moduleRevision,
			closedComponentForwardProgram?.moduleRevision
		].filter((value) => value !== void 0);
		const expectedRevision = revisions[0];
		if (revisions.some((revision) => revision !== expectedRevision)) throw new Error("Compiled component programs disagree on module revision");
		const revision = moduleEnd < 0 ? void 0 : captureCompiledSemanticRevision(siteId.slice(0, moduleEnd), expectedRevision);
		if (expectedRevision && !revision) throw new Error("Compiled component program has no matching module revision");
		normalizedMetadata = Object.freeze({
			propOnlySites: Object.freeze(propOnlySites),
			...numericPrimitiveProps ? { numericPrimitiveProps: Object.freeze(numericPrimitiveProps) } : {},
			...closedCollectionSites ? { closedCollectionSites: Object.freeze(closedCollectionSites) } : {},
			hostLeafOutput: metadata?.hostLeafOutput === true,
			...revision ? { revision } : {},
			...stateLayout ? { stateLayout } : {},
			...closedResourceHostProgram ? { closedResourceHostProgram } : {},
			...closedStoreHostProgram ? { closedStoreHostProgram } : {},
			...closedComponentForwardProgram ? { closedComponentForwardProgram } : {}
		});
	}
	const registration = Object.freeze({
		siteId,
		metadata: normalizedMetadata
	});
	Object.defineProperty(render, componentRegistration, { value: registration });
	definedComponents.set(render, registration);
	return render;
};
var emptyCompiledPropSites = /* @__PURE__ */ new Set();
var componentRevision = (component) => typeof component === "function" ? (definedComponents.get(component) ?? component[componentRegistration])?.metadata?.revision : void 0;
var componentCodeCurrent = (component) => {
	const revision = componentRevision(component);
	return !revision || isCompiledSemanticRevisionCurrent(revision);
};
var componentCodeCurrentPrivate = (component) => {
	const revision = typeof component === "function" ? definedComponents.get(component)?.metadata?.revision : void 0;
	return !revision || isCompiledSemanticRevisionCurrent(revision);
};
var treeReferencesCompiledSource = (node, sourceFile, seen = /* @__PURE__ */ new WeakSet()) => {
	if (node == null || typeof node !== "object") return false;
	if (seen.has(node)) return true;
	seen.add(node);
	try {
		if (Array.isArray(node)) {
			const length = Object.getOwnPropertyDescriptor(node, "length")?.value;
			if (typeof length !== "number") return true;
			for (let index = 0; index < length; index++) {
				const child = Object.getOwnPropertyDescriptor(node, String(index));
				if (!child || !("value" in child) || treeReferencesCompiledSource(child.value, sourceFile, seen)) return true;
			}
			return false;
		}
		const type = Object.getOwnPropertyDescriptor(node, "type");
		const props = Object.getOwnPropertyDescriptor(node, "props");
		if (!type || !("value" in type) || !props || !("value" in props) || props.value === null || typeof props.value !== "object") return true;
		if (componentRevision(type.value)?.sourceFile === sourceFile) return true;
		const children = Object.getOwnPropertyDescriptor(props.value, "children");
		return !!children && (!("value" in children) || treeReferencesCompiledSource(children.value, sourceFile, seen));
	} catch {
		return true;
	} finally {
		seen.delete(node);
	}
};
var cacheReferencesCompiledSource = (cache, sourceFile) => {
	if (componentRevision(cache.type)?.sourceFile === sourceFile || treeReferencesCompiledSource(cache.result, sourceFile)) return true;
	const children = Object.getOwnPropertyDescriptor(cache.props, "children");
	return !!children && (!("value" in children) || treeReferencesCompiledSource(children.value, sourceFile));
};
var cacheCodeCurrent = (caches) => {
	for (const cache of caches) if (!componentCodeCurrent(cache.type)) return false;
	return true;
};
var cacheCodeCurrentPrivate = (caches) => {
	for (const cache of caches) if (!componentCodeCurrentPrivate(cache.type)) return false;
	return true;
};
var captureCodeRevisions = (caches) => {
	const revisions = [];
	try {
		for (const cache of caches) {
			const revision = componentRevision(cache.type);
			if (revision) revisions.push(revision);
		}
	} catch (error) {
		return { error };
	}
	return { revisions };
};
var codeRevisionsCurrent = (captured) => {
	if ("error" in captured) throw captured.error;
	return captured.revisions.every(isCompiledSemanticRevisionCurrent);
};
var compiledStateLayoutFor = (component) => typeof component === "function" ? definedComponents.get(component)?.metadata?.stateLayout : void 0;
var numericOwnerPropsAdmitted = (component, props, owned) => {
	const names = typeof component === "function" ? definedComponents.get(component)?.metadata?.numericPrimitiveProps : void 0;
	if (!names?.length) return true;
	if (!owned || !Object.isFrozen(props)) return false;
	for (const name of names) {
		const descriptor = Object.getOwnPropertyDescriptor(props, name);
		if (!descriptor || !("value" in descriptor) || descriptor.value !== null && descriptor.value !== void 0 && typeof descriptor.value !== "string" && typeof descriptor.value !== "number" && typeof descriptor.value !== "boolean") return false;
	}
	return true;
};
var ownNumericOwnerProps = (component, source, props) => {
	if ((typeof component === "function" ? definedComponents.get(component)?.metadata?.numericPrimitiveProps : void 0)?.length && isRuntimeOwnedElement(source) && Object.isFrozen(source.props)) Object.freeze(props);
	return props;
};
var closedCollectionSitesFor = (component) => typeof component === "function" ? definedComponents.get(component)?.metadata?.closedCollectionSites : void 0;
var ownCollectionOwnerProps = (component, source, props) => {
	if (!closedCollectionSitesFor(component)?.length || !isRuntimeOwnedElement(source) || !Object.isFrozen(source.props)) return false;
	Object.freeze(props);
	return true;
};
var collectionOwnerApiAdmitted = (region, cache) => closedCollectionSitesFor(cache.type) === void 0 || canonicalCollectionApiIntact(region.collection);
var collectionOwnerNeedsGenericRows = (cache, batches) => closedCollectionSitesFor(cache.type) !== void 0 && batches.some((batch) => batch.operations.some((operation) => operation.type === "insert" || operation.type === "replace"));
var numericOwnerCacheAdmitted = (cache) => cache.numericPropsAdmitted === true && cache.numericStateAdmitted === true;
var closedResourceHostProgramFor = (component) => typeof component === "function" && componentCodeCurrent(component) ? definedComponents.get(component)?.metadata?.closedResourceHostProgram : void 0;
var closedStoreHostProgramFor = (component) => typeof component === "function" && componentCodeCurrent(component) ? definedComponents.get(component)?.metadata?.closedStoreHostProgram : void 0;
var closedComponentForwardProgramFor = (component) => typeof component === "function" && componentCodeCurrent(component) ? definedComponents.get(component)?.metadata?.closedComponentForwardProgram : void 0;
/** Explicit-site hook primitive; the compiler can lower familiar useState calls to this form. */
var useStateAt = (siteId, initial) => {
	const active = activeOwners[activeOwners.length - 1];
	if (!active) throw new Error("useStateAt must run while an owner-aware component is rendering");
	const result = active.stateLayout ? active.world.useState(active.owner, siteId, initial, active.stateLayout) : active.world.useState(active.owner, siteId, initial);
	const value = result[0];
	if (value !== null && value !== void 0 && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") active.numericStateReadsPrimitive = false;
	return result;
};
/** Register an effect by compiler site ID; setup runs after commit, cleanup on deactivation or owner removal. */
var useEffectAt = (siteId, setup) => {
	const active = activeOwners[activeOwners.length - 1];
	if (!active) throw new Error("useEffectAt must run while an owner-aware component is rendering");
	active.registerEffect(siteId, setup);
};
/** Read a shared store or selector at a stable compiler-owned component site. */
var useStoreAt = (siteId, source) => {
	const active = activeOwners[activeOwners.length - 1];
	if (!active) throw new Error("useStoreAt must run while an owner-aware component is rendering");
	if (!siteId || !source || typeof source.read !== "function") throw new Error("useStoreAt requires a site ID and store source");
	return active.readStore(siteId, source);
};
/** Generic authored read: stores keep their value semantics; resources unwrap and suspend. */
var useAt = (siteId, source) => {
	if (source instanceof AsyncResource) {
		const active = activeOwners[activeOwners.length - 1];
		if (!active?.readResource) throw new Error("useAt resource reads require an owner-aware render");
		return active.readResource(source);
	}
	if (source && (typeof source === "object" || typeof source === "function") && typeof source.read === "function") return useStoreAt(siteId, source);
	if (source && (typeof source === "object" || typeof source === "function")) {
		const active = activeOwners[activeOwners.length - 1];
		if (!active?.readResource) throw new Error("useAt resource reads require an owner-aware render");
		return active.readResource(source);
	}
	throw new TypeError("useAt requires a store source, resource, or thenable");
};
var getComponentSiteId = (type) => {
	if (typeof type !== "function") throw new Error("Expected a function component");
	const siteId = (definedComponents.get(type) ?? type[componentRegistration])?.siteId;
	if (!siteId) throw new Error("Owner-aware components must be registered with defineComponent(siteId, render)");
	return siteId;
};
var keyedIdentity = (element, siteId, ordinal) => {
	const key = element.props.key;
	return key == null ? `@slot:${siteId}:${ordinal}` : String(key);
};
var collectionOwnerSite = (collectionSiteId, componentSiteId) => `${componentSiteId}\u0000collection:${collectionSiteId}`;
var carryHostKeys = (node, componentKey, path = "0", onVisit, scopeExplicitHostKeys = false) => {
	onVisit?.();
	if (node == null || node === false || typeof node === "string" || typeof node === "number") return node;
	if (Array.isArray(node)) return copyKeyedOwnerMetadata(node, node.map((child, index) => carryHostKeys(child, componentKey, `${path}.${index}`, onVisit, scopeExplicitHostKeys)));
	if (node.type === Fragment) return copyRuntimeElement(node.type, {
		...node.props,
		children: carryHostKeys(node.props.children, componentKey, path, onVisit, scopeExplicitHostKeys)
	});
	const existingKey = node.props.key;
	const key = existingKey == null ? `${String(componentKey)}:${path}` : scopeExplicitHostKeys ? `${String(componentKey)}\u0000${String(existingKey)}` : String(existingKey);
	return copyRuntimeElement(node.type, {
		...node.props,
		key
	});
};
var singleHostRootKey = (node, onVisit) => {
	const roots = [];
	const flatten = (value) => {
		onVisit?.();
		if (value == null || value === false) return true;
		if (Array.isArray(value)) return value.every(flatten);
		if (typeof value === "string" || typeof value === "number") return false;
		if (value.type === Fragment) return flatten(value.props.children);
		if (typeof value.type !== "string") return false;
		roots.push(value);
		return true;
	};
	if (!flatten(node) || roots.length !== 1 || roots[0].props.key == null) return null;
	return String(roots[0].props.key);
};
var hasNestedComponent = (node, onVisit) => {
	onVisit?.();
	if (node == null || node === false || typeof node === "string" || typeof node === "number") return false;
	if (Array.isArray(node)) return node.some((child) => hasNestedComponent(child, onVisit));
	if (typeof node.type === "function") return true;
	return hasNestedComponent(node.props.children, onVisit);
};
/**
* Component execution bridge between owner/site state and retained VDOM.
* The native module compiler supplies stable component, hook, and collection
* site IDs; explicit helpers remain available to host adapters and extensions.
*/
var ComponentStateRoot = class ComponentStateRoot {
	world;
	#rootOwner;
	#rootId;
	#vdom;
	#tree = null;
	#pendingDirectIntent = null;
	#liveOwners = /* @__PURE__ */ new Set();
	#liveEffects = /* @__PURE__ */ new Map();
	#liveEffectKeysByOwner = /* @__PURE__ */ new Map();
	#componentCache = /* @__PURE__ */ new Map();
	#compiledPropSitesByCache = /* @__PURE__ */ new WeakMap();
	#liveCollectionRegions = /* @__PURE__ */ new Map();
	#pendingCollectionRegionKeys = /* @__PURE__ */ new Set();
	#collectionSnapshotFallbackKeys = /* @__PURE__ */ new Set();
	#preparedRenders = /* @__PURE__ */ new Map();
	#disposed = false;
	#disposing = false;
	#disposeRequested = false;
	#hostApplicationDepth = 0;
	#directPublicationPending = false;
	#publicationVersion = 0;
	#preparedCandidates = /* @__PURE__ */ new Map();
	#candidateHostCommit = false;
	#publicationBarrier = null;
	#deferredFlush = false;
	#disposeListeners = /* @__PURE__ */ new Set();
	#retireListeners = /* @__PURE__ */ new Set();
	#candidateStoreHolds = /* @__PURE__ */ new Map();
	#storeDependencyLeases = /* @__PURE__ */ new Map();
	#terminalHostFailure;
	#terminalHostFailed = false;
	#terminalFailureKind = "host";
	#scheduled = false;
	#pendingChanges = new PendingStateChanges();
	#lastSourceValues = /* @__PURE__ */ new Map();
	#numericProgramSources = [];
	#numericProgramCurrentValues = [];
	#numericProgramPreviousValues = [];
	#numericProgramUsedCount = 0;
	#nativeCellHandles = [];
	#nativeCellVersions = [];
	#nativeLaneTokens = [];
	#nativeLanePrograms = /* @__PURE__ */ new WeakMap();
	#nativeRowPrograms = /* @__PURE__ */ new WeakMap();
	#nativeRowEpoch = 0;
	#nativeRowTokens = [];
	#nativeRowViews = [];
	#nativeChangedRows = /* @__PURE__ */ new Uint32Array(0);
	#nativeChangedSlots = /* @__PURE__ */ new Uint32Array(0);
	#nativeRowUsedCount = 0;
	#nativeCellCutActive = false;
	#liveStoreSubscriptions = /* @__PURE__ */ new Map();
	#liveStoreReaders = /* @__PURE__ */ new Map();
	#resourceTable;
	#liveResourceSubscriptions = /* @__PURE__ */ new Map();
	#everReadResource = false;
	#everHadNativeBoundary = false;
	#pendingResourceRetry = false;
	#pendingBoundaryRetries = /* @__PURE__ */ new Set();
	#publicationIntents = /* @__PURE__ */ new Map();
	#scopedFlushActive = false;
	#boundaryPrimaries = /* @__PURE__ */ new Map();
	#storeNotificationGeneration = 0;
	#committedStoreNotificationGeneration = 0;
	#partialStoreAttemptGeneration = -1;
	#sourceValueSyncVisits = 0;
	#scheduleCommit;
	#unsubscribe;
	#unsubscribeRevision;
	#codeInvalidated = false;
	#revisionRetirementPending = false;
	#profile;
	#profileCounter;
	#keyedOwnerReuse;
	#keyedOwnerReuseMode;
	#collectedKeyedRegions = null;
	#collectedCollectionRegions = null;
	#activeCounters;
	#invalidation;
	static #nextRootId = 1;
	constructor(host, container, options = {}) {
		this.world = options.world ?? new OwnerStateWorld();
		let resourceTable = worldResourceTables.get(this.world);
		if (!resourceTable) {
			resourceTable = new AsyncResourceTable();
			worldResourceTables.set(this.world, resourceTable);
		}
		this.#resourceTable = resourceTable;
		this.#profile = options.profile;
		this.#profileCounter = options.profileCounter;
		this.#keyedOwnerReuse = options.keyedOwnerReuse ?? options.keyedOwnerReuseMode !== void 0;
		this.#keyedOwnerReuseMode = options.keyedOwnerReuseMode ?? "checked";
		this.#vdom = new VDOMSnapshotRoot(host, container, options.profile, options.profileCounter ? (counters) => {
			for (const [name, count] of Object.entries(counters)) this.#count(name, count);
		} : void 0, options.keyIndexMaintenance);
		const rootId = options.rootId ?? `root-${ComponentStateRoot.#nextRootId++}`;
		if (!rootId) throw new Error("Component root ID must not be empty");
		this.#rootId = rootId;
		this.#scheduleCommit = options.scheduleCommit ?? ((commit) => queueMicrotask(commit));
		if (options.invalidationPlan) {
			const plan = options.invalidationPlan;
			if (plan.region_component_site_ids.some((siteId) => typeof siteId !== "string" || siteId.length === 0)) throw new Error("Component invalidation plan has an invalid component site ID");
			for (const region of plan.region_ids) if (region >= plan.region_component_site_ids.length) throw new Error("Component invalidation region has no component site ID");
			this.#invalidation = {
				dispatcher: new DerivedRegionDispatcher(plan),
				sourceSlots: new Map(plan.source_paths.map((siteId, index) => [siteId, index])),
				componentSites: plan.region_component_site_ids
			};
		}
		this.#unsubscribeRevision = subscribeCompiledSemanticRevision((change) => {
			if (this.#disposed || this.#codeInvalidated) return;
			let affected = treeReferencesCompiledSource(this.#tree, change.sourceFile) || treeReferencesCompiledSource(this.#pendingDirectIntent?.tree ?? null, change.sourceFile);
			for (const cache of this.#componentCache.values()) if (cacheReferencesCompiledSource(cache, change.sourceFile)) {
				affected = true;
				break;
			}
			if (!affected) {
				for (const referencesSource of this.#preparedCandidates.values()) if (referencesSource(change.sourceFile)) {
					affected = true;
					break;
				}
			}
			if (!affected) return;
			this.#codeInvalidated = true;
			this.#revisionRetirementPending = true;
			this.#retireCompiledInterests();
		});
		this.#rootOwner = this.world.claimRootId(rootId);
		this.#unsubscribe = this.world.subscribeDirtyCells((handle, version) => {
			if (!this.world.isWithin(handle.owner, this.#rootOwner)) return;
			this.#pendingChanges.setCell(handle, version);
			if (this.#pendingDirectIntent) this.#pendingResourceRetry = true;
			this.#schedule();
		});
	}
	#retireCompiledInterests() {
		if (!this.#revisionRetirementPending || this.#disposed || this.#publicationBarrier || this.#hostApplicationDepth > 0 || this.#nativeCellCutActive || this.#directPublicationPending) return;
		this.#revisionRetirementPending = false;
		const listeners = [...this.#retireListeners];
		this.#retireListeners.clear();
		const errors = collectCleanupErrors([
			...listeners,
			() => {
				const cleanup = collectCleanupErrors([...this.#preparedCandidates.keys()].map((candidate) => () => candidate.discard()));
				if (cleanup.length) throw new AggregateError(cleanup, "Revision candidate cleanup failed");
			},
			() => this.#dropPendingDirectIntent(),
			() => this.#cancelTerminalResourceWaits(),
			() => {
				const subscriptions = [...this.#liveStoreSubscriptions];
				const readers = [...this.#liveStoreReaders];
				for (const stores of this.#storeDependencyLeases.values()) stores.clear();
				this.#storeDependencyLeases.clear();
				this.#liveStoreSubscriptions.clear();
				this.#liveStoreReaders.clear();
				const cleanup = collectCleanupErrors([
					...subscriptions.map(([, unsubscribe]) => unsubscribe),
					...readers.flatMap(([readerId, stores]) => [...stores].map((store) => () => store.forgetReader(this.#rootId, readerId))),
					...subscriptions.filter(([store]) => (this.#candidateStoreHolds.get(store) ?? 0) === 0).map(([store]) => () => store.detachRoot(this.#rootId))
				]);
				if (cleanup.length) throw new AggregateError(cleanup, "Revision Store cleanup failed");
			},
			() => {
				const regions = [...this.#liveCollectionRegions.values()];
				this.#liveCollectionRegions.clear();
				const cleanup = collectCleanupErrors(regions.flatMap((region) => [...region.unsubscribe ? [region.unsubscribe] : [], ...region.reader ? [() => region.reader.detach()] : []]));
				if (cleanup.length) throw new AggregateError(cleanup, "Revision collection cleanup failed");
			},
			() => this.#unsubscribe(),
			() => {
				const cleanup = this.#cleanupEffects(this.#liveEffects.values());
				this.#liveEffects.clear();
				this.#liveEffectKeysByOwner.clear();
				if (cleanup.length) throw new AggregateError(cleanup, "Revision effect cleanup failed");
			}
		]);
		if (errors.length === 1) throw errors[0];
		if (errors.length) throw new AggregateError(errors, "Revision cleanup failed");
	}
	get version() {
		return this.#vdom.version;
	}
	/** Logical native publication revision, including non-DOM source commits. */
	get publicationVersion() {
		return this.#publicationVersion;
	}
	/** Hold declared task/input store dependencies until this owner releases them. */
	holdStoreDependencies(stores) {
		this.#assertActive();
		const leasedStores = new Set(stores);
		if ([...leasedStores].some((store) => !(store instanceof AsyncStore))) throw new TypeError("Store dependency holds require native stores");
		const leaseId = Symbol("root-store-dependencies");
		this.#storeDependencyLeases.set(leaseId, leasedStores);
		try {
			this.#reconcileStoreSubscriptions();
		} catch (error) {
			leasedStores.clear();
			this.#storeDependencyLeases.delete(leaseId);
			return throwWithCleanup(error, collectCleanupErrors([() => this.#reconcileStoreSubscriptions()]));
		}
		let released = false;
		return () => {
			if (released) return;
			released = true;
			leasedStores.clear();
			this.#storeDependencyLeases.delete(leaseId);
			this.#reconcileStoreSubscriptions();
		};
	}
	/** Prepare an isolated full-tree candidate without touching host or live caches. */
	prepare(tree, options = {}) {
		const held = this.#publicationIntents.values().next().value;
		if (held) return this.#prepareBlockedPublication([held.wait]);
		return this.#prepareCandidate(tree, options, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set());
	}
	/** Prepare tracked root work without requiring callers to provide a full tree. */
	preparePending(options = {}) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare");
		if (this.#terminalHostFailed) throw new Error("Component root is terminal after a host commit failure");
		const held = this.#publicationIntents.values().next().value;
		if (held) return this.#prepareBlockedPublication([held.wait]);
		if (this.#pendingDirectIntent) return this.#prepareCandidate(this.#pendingDirectIntent.tree, { transitions: options.transitions ?? [] }, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set());
		const changes = this.#pendingChanges.capture();
		if (changes.length === 0 && this.#pendingCollectionRegionKeys.size === 0 && this.#storeNotificationGeneration === this.#committedStoreNotificationGeneration && (options.transitions?.length ?? 0) === 0) return null;
		return this.#prepareMixedCollectionCandidate(changes, {
			storeGeneration: this.#storeNotificationGeneration,
			transitions: options.transitions ?? []
		}) ?? this.#prepareCandidate(this.#tree, { transitions: options.transitions ?? [] }, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set());
	}
	/** Prepare explicit move/remove collection work without broadening its tree cut. */
	prepareCollections(collections, publicationLease) {
		return this.prepareTransaction({
			cells: [],
			collections
		}, publicationLease);
	}
	/** Prepare one declared closed local, Store and keyed collection cut. */
	prepareTransaction(work, resourceLease) {
		const { cells, collections } = work;
		const selectedStores = work.stores ?? [];
		if (!this.#leaseCoversSelection(resourceLease, new Set(work.resources ?? []), {
			cells,
			stores: selectedStores,
			collections
		})) return null;
		if (work.resources?.length) return this.prepareResources(work.resources, resourceLease, {
			cells,
			stores: selectedStores,
			collections
		});
		const holdWait = this.#resourceHoldWait(/* @__PURE__ */ new Set(), resourceLease, {
			cells,
			stores: selectedStores,
			collections
		});
		if (holdWait) return this.#prepareBlockedPublication([holdWait]);
		if (collections.length === 0) return this.#prepareClosedInputCandidate(cells, selectedStores, false, () => true, resourceLease);
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare transaction");
		if (this.#pendingDirectIntent && !(resourceLease && this.#publicationIntents.has(resourceLease)) || this.#terminalHostFailed || this.#codeInvalidated || new Set(collections).size !== collections.length) return null;
		const selected = /* @__PURE__ */ new Set();
		const acceptedCollections = [];
		for (const collection of collections) {
			let found = false;
			for (const [key, region] of this.#liveCollectionRegions) {
				if (region.collection !== collection) continue;
				found = true;
				if (this.#pendingCollectionRegionKeys.has(key)) selected.add(key);
				else {
					const reader = region.reader;
					const read = reader?.read();
					if (!reader || read?.status !== "available" || read.batches.length !== 0 || collection.version !== read.toVersion) return null;
					acceptedCollections.push(() => {
						if (this.#liveCollectionRegions.get(key) !== region || region.reader !== reader || this.#pendingCollectionRegionKeys.has(key) || collection.version !== read.toVersion) return false;
						const current = reader.read();
						return current.status === "available" && current.batches.length === 0 && current.toVersion === read.toVersion;
					});
				}
			}
			if (!found) return null;
		}
		if (!selected.size) {
			if (cells.length || selectedStores.length) return this.#prepareClosedInputCandidate(cells, selectedStores, false, () => true, resourceLease, acceptedCollections, /* @__PURE__ */ new Set(), collections);
			return this.#prepareAcceptedResourceNoop(/* @__PURE__ */ new Map(), resourceLease, acceptedCollections, /* @__PURE__ */ new Set(), collections);
		}
		return this.#prepareMixedCollectionCandidate([], {
			storeGeneration: this.#storeNotificationGeneration,
			transitions: [],
			selectedRegionKeys: selected,
			scopedStructural: true,
			scopedCells: cells,
			scopedStores: selectedStores,
			resourceLease,
			acceptedCollections
		});
	}
	/** Prepare all closed host consumers of the selected direct Stores. */
	prepareStores(selected, publicationLease) {
		return this.#prepareClosedStoreCandidate(selected, false, publicationLease);
	}
	/** Prepare the selected closed resource consumers as one root publication. */
	prepareResources(resources, resourceLease, inputs = {}) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare resources");
		if (!this.#leaseCoversSelection(resourceLease, new Set(resources), inputs)) return null;
		if (!resources.length || new Set(resources).size !== resources.length || this.#pendingDirectIntent && !(resourceLease && this.#publicationIntents.has(resourceLease)) || this.#terminalHostFailed || this.#codeInvalidated) return null;
		const selected = new Set(resources);
		if (resources.some((resource) => closedResourceStatus(resource) === null || closedResourceStatus(resource)?.status === "rejected")) return null;
		const boundaries = [];
		const covered = /* @__PURE__ */ new Set();
		const dependencies = new Set(selected);
		const jointStores = /* @__PURE__ */ new Set();
		for (const [owner, cache] of this.#componentCache) {
			if (!cache.nativeBoundary || !cache.pendingResource) continue;
			const child = Object.getOwnPropertyDescriptor(cache.props, "children")?.value;
			const boundaryStores = /* @__PURE__ */ new Set();
			const footprint = this.#boundaryResourceDependencies(child, boundaryStores);
			if (!footprint) continue;
			footprint.add(cache.pendingResource);
			if (![...selected].some((resource) => footprint.has(resource))) continue;
			boundaries.push(owner);
			for (const store of boundaryStores) jointStores.add(store);
			for (const resource of footprint) {
				dependencies.add(resource);
				if (selected.has(resource)) covered.add(resource);
			}
		}
		const accepted = /* @__PURE__ */ new Map();
		for (const [key, primary] of this.#boundaryPrimaries) {
			const owner = Number(key);
			const footprint = this.#boundaryResourceDependencies(primary.tree);
			if (!footprint) continue;
			for (const resource of footprint) if (selected.has(resource)) {
				covered.add(resource);
				accepted.set(owner, primary.tree);
			}
		}
		if (covered.size !== selected.size) return null;
		const wait = this.#resourceHoldWait(dependencies, resourceLease, {
			...inputs,
			stores: [...inputs.stores ?? [], ...jointStores]
		});
		const pending = [...dependencies].filter((resource) => closedResourceStatus(resource)?.status === "pending");
		if ([...dependencies].some((resource) => closedResourceStatus(resource) === null || closedResourceStatus(resource)?.status === "rejected")) return null;
		if (wait || pending.length) return this.#prepareBlockedPublication([...pending, ...wait ? [wait] : []]);
		const acceptedCurrent = () => [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree && this.#liveOwners.has(owner) && this.world.isAlive(owner));
		if (inputs.collections?.length) {
			const selectedKeys = /* @__PURE__ */ new Set();
			const acceptedCollections = [];
			if (new Set(inputs.collections).size !== inputs.collections.length) return null;
			for (const collection of inputs.collections) {
				let found = false;
				for (const [key, region] of this.#liveCollectionRegions) {
					if (region.collection !== collection) continue;
					found = true;
					if (this.#pendingCollectionRegionKeys.has(key)) selectedKeys.add(key);
					else {
						const reader = region.reader;
						const read = reader?.read();
						if (!reader || read?.status !== "available" || read.batches.length !== 0 || collection.version !== read.toVersion) return null;
						acceptedCollections.push(() => {
							if (this.#liveCollectionRegions.get(key) !== region || region.reader !== reader || this.#pendingCollectionRegionKeys.has(key) || collection.version !== read.toVersion) return false;
							const current = reader.read();
							return current.status === "available" && current.batches.length === 0 && current.toVersion === read.toVersion;
						});
					}
				}
				if (!found) return null;
			}
			if (!selectedKeys.size) {
				if (!boundaries.length) {
					if (!inputs.cells?.length && !inputs.stores?.length) return this.#prepareAcceptedResourceNoop(accepted, resourceLease, acceptedCollections, selected, inputs.collections);
					return this.#prepareClosedInputCandidate(inputs.cells ?? [], inputs.stores ?? [], false, acceptedCurrent, resourceLease, acceptedCollections, selected, inputs.collections);
				}
				return this.#prepareResourceReveals(boundaries, resourceLease, inputs.cells ?? [], inputs.stores ?? [], [acceptedCurrent, ...acceptedCollections], selected, inputs.collections);
			}
			return this.#prepareMixedCollectionCandidate([], {
				storeGeneration: this.#storeNotificationGeneration,
				transitions: [],
				selectedRegionKeys: selectedKeys,
				scopedStructural: true,
				scopedCells: inputs.cells ?? [],
				scopedStores: inputs.stores ?? [],
				scopedResourceOwners: boundaries,
				resourceLease,
				acceptedCollections: [acceptedCurrent, ...acceptedCollections],
				acceptedResources: selected,
				acceptedCollectionFootprint: inputs.collections
			});
		}
		if (!boundaries.length) {
			if (inputs.cells?.length || inputs.stores?.length) return this.#prepareClosedInputCandidate(inputs.cells ?? [], inputs.stores ?? [], false, acceptedCurrent, resourceLease, [], selected);
			return this.#prepareAcceptedResourceNoop(accepted, resourceLease, [], selected);
		}
		return this.#prepareResourceReveals(boundaries, resourceLease, inputs.cells ?? [], inputs.stores ?? [], [acceptedCurrent], selected);
	}
	#prepareBlockedPublication(pendingResources) {
		const stores = new StoreRenderTransaction(this.#rootId);
		return this.#createCandidateLifecycle({
			baseVersion: this.#publicationVersion,
			baseVDOMVersion: this.#vdom.version,
			scope: { kind: "retained" },
			stores,
			transitions: [],
			pendingResources,
			blocked: true,
			codeCurrent: () => false,
			validatePrepared: () => false,
			validatePostHost: () => false,
			finalGroupCurrent: () => false,
			commitHost: () => {
				throw new Error("Resource candidate is blocked");
			},
			preparePublication: () => {},
			publish: () => {},
			installSubscriptions: () => [],
			runEffects: () => [],
			discard: () => stores.discard(),
			releaseArtifacts: () => {},
			effectFailureMessage: "Blocked resource candidate callbacks failed"
		});
	}
	#prepareAcceptedResourceNoop(accepted, resourceLease, validators = [], resources = /* @__PURE__ */ new Set(), collections = []) {
		if (!accepted.size && !validators.length) return null;
		const stores = new StoreRenderTransaction(this.#rootId);
		const collectionVersions = collections.map((collection) => [collection, canonicalCollectionVersion(collection)]);
		const resourceVersions = [...resources].map((resource) => [resource, canonicalResourceVersion(resource)]);
		const current = () => validators.every((validate) => validate()) && [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree && this.#liveOwners.has(owner) && this.world.isAlive(owner));
		return this.#createCandidateLifecycle({
			baseVersion: this.#publicationVersion,
			baseVDOMVersion: this.#vdom.version,
			scope: { kind: "retained" },
			stores,
			transitions: [],
			pendingResources: [],
			blocked: false,
			permitPendingDirectIntent: () => resourceLease !== void 0 && this.#publicationIntents.has(resourceLease),
			admissionCurrent: () => (!resourceLease || this.#publicationIntents.has(resourceLease)) && !this.#resourceHoldWait(resources, resourceLease, { collections }) && (!resourceLease || this.#publicationIntents.has(resourceLease)),
			codeCurrent: current,
			validatePrepared: () => current() && stores.validate(),
			validatePostHost: () => current() && stores.validatePublicationInputs(),
			finalGroupCurrent: () => [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree && this.#liveOwners.has(owner) && this.world.isAlive(owner)) && collectionVersions.every(([collection, version]) => {
				const current = canonicalCollectionVersion(collection);
				return version === null || current === null || current >= version;
			}) && resourceVersions.every(([resource, version]) => version === null || canonicalResourceVersion(resource) === version) && stores.validatePublicationInputsCanonical(),
			commitHost: () => {},
			preparePublication: () => stores.preparePublicationAfterHost(),
			publish: () => {
				stores.publishAccepted();
				this.#publicationVersion++;
			},
			installSubscriptions: () => [],
			runEffects: () => {
				stores.notifyPublished();
				return [];
			},
			discard: () => stores.discard(),
			releaseArtifacts: () => {},
			effectFailureMessage: "Accepted resource candidate callbacks failed"
		});
	}
	/** Keep a declared pending cut out of automatic publication until released. */
	holdTransactionPublications(work) {
		this.#assertActive();
		const unique = new Set(work.resources);
		const cells = Object.freeze((work.cells ?? []).map((cell) => Object.freeze({
			owner: cell.owner,
			site: cell.site,
			cellIdentity: cell.cellIdentity
		})));
		let wake;
		const wait = new AsyncResource(new Promise((resolve) => {
			wake = resolve;
		}));
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			this.#publicationIntents.delete(release);
			wake();
			this.#partialStoreAttemptGeneration = -1;
			if (this.#pendingDirectIntent && this.#publicationIntents.size === 0) this.#pendingResourceRetry = true;
			if (!this.#disposed && !this.#terminalHostFailed && (this.#pendingDirectIntent || this.#hasPendingWork())) this.#schedule();
		};
		this.#publicationIntents.set(release, {
			resources: unique,
			cells,
			stores: new Set(work.stores ?? []),
			collections: new Set(work.collections ?? []),
			wait
		});
		return release;
	}
	#heldCell(handle) {
		return [...this.#publicationIntents.values()].some(({ cells }) => cells.some((selected) => selected.owner === handle.owner && selected.site === handle.site && selected.cellIdentity === handle.cellIdentity));
	}
	#readerBelongsToOwner(readerId, owner) {
		return readerId.startsWith(`${owner}\u0000`) || readerId.startsWith(`\u0000suspense-pending:${owner}:`) || readerId.startsWith("\0suspense-pending:") && readerId.includes(`:${owner}\u0000`);
	}
	#heldStore(store) {
		return [...this.#publicationIntents.values()].some(({ stores }) => stores.has(store));
	}
	#heldCollection(collection) {
		return [...this.#publicationIntents.values()].some(({ collections }) => collections.has(collection));
	}
	#captureHeldGenericState() {
		if (this.#publicationIntents.size === 0 || this.#pendingCollectionRegionKeys.size > 0) return null;
		const pendingChanges = this.#pendingChanges.capture();
		if (pendingChanges.some((change) => !change.cellIdentity || this.#heldCell({
			owner: change.owner,
			site: change.site,
			cellIdentity: change.cellIdentity
		}))) return null;
		const holds = /* @__PURE__ */ new Map();
		const boundaries = /* @__PURE__ */ new Map();
		for (const [release, hold] of this.#publicationIntents) {
			if (hold.cells.length || hold.stores.size || hold.collections.size || hold.resources.size === 0) return null;
			holds.set(release, hold);
			for (const resource of hold.resources) {
				if (closedResourceStatus(resource) === null) return null;
				const entries = [...this.#componentCache].filter(([owner, cache]) => this.#liveOwners.has(owner) && cache.nativeBoundary && cache.pendingResource === resource);
				if (entries.length !== 1) return null;
				const [owner, cache] = entries[0];
				boundaries.set(owner, {
					cache,
					resource
				});
			}
		}
		const heldOwners = new Set([...boundaries.values()].flatMap(({ cache }) => [...cache.subtreeOwners]));
		if (pendingChanges.some((change) => heldOwners.has(change.owner))) return null;
		const readers = /* @__PURE__ */ new Map();
		for (const [readerId, membership] of this.#liveStoreReaders) {
			if (![...heldOwners].some((owner) => this.#readerBelongsToOwner(readerId, owner))) continue;
			const receipts = /* @__PURE__ */ new Map();
			for (const store of membership) {
				const receipt = captureCanonicalStoreReaderReceipt(store, this.#rootId, readerId);
				if (!receipt) return null;
				receipts.set(store, receipt);
			}
			readers.set(readerId, {
				membership,
				receipts
			});
		}
		return boundaries.size ? {
			holds,
			boundaries,
			readers
		} : null;
	}
	#heldGenericReadersState(state) {
		let result = "current";
		for (const [readerId, { membership, receipts }] of state.readers) {
			if (this.#liveStoreReaders.get(readerId) !== membership || membership.size !== receipts.size) return null;
			for (const store of membership) {
				const receipt = receipts.get(store);
				if (!receipt) return null;
				const status = inspectCanonicalStoreReaderReceipt(store, this.#rootId, readerId, receipt);
				if (status === null) return null;
				if (status === "retained") result = "retained";
			}
		}
		return result;
	}
	#captureBoundaryAncestorControlsCurrent(boundaryOwner) {
		const ancestors = new Set(this.world.ownerLineage(boundaryOwner).slice(1));
		const localControlsCurrent = () => !this.#pendingChanges.capture().some((change) => ancestors.has(change.owner));
		if (!localControlsCurrent()) return null;
		const readers = [];
		for (const [readerId, membership] of this.#liveStoreReaders) {
			if (![...ancestors].some((owner) => this.#readerBelongsToOwner(readerId, owner))) continue;
			const receipts = /* @__PURE__ */ new Map();
			for (const store of membership) {
				const receipt = captureCanonicalStoreReaderReceipt(store, this.#rootId, readerId);
				if (!receipt || inspectCanonicalStoreReaderReceipt(store, this.#rootId, readerId, receipt) !== "current") return null;
				receipts.set(store, receipt);
			}
			readers.push({
				readerId,
				membership,
				receipts
			});
		}
		return () => localControlsCurrent() && readers.every(({ readerId, membership, receipts }) => this.#liveStoreReaders.get(readerId) === membership && membership.size === receipts.size && [...membership].every((store) => {
			const receipt = receipts.get(store);
			return receipt !== void 0 && inspectCanonicalStoreReaderReceipt(store, this.#rootId, readerId, receipt) === "current";
		}));
	}
	#heldGenericStateCurrent(state) {
		if (this.#heldGenericReadersState(state) === null) return false;
		if (this.#publicationIntents.size !== state.holds.size) return false;
		for (const [release, hold] of state.holds) if (this.#publicationIntents.get(release) !== hold) return false;
		for (const [owner, { cache, resource }] of state.boundaries) {
			if (!this.#liveOwners.has(owner) || !this.world.isAlive(owner) || this.#componentCache.get(owner) !== cache || !cacheCodeCurrentPrivate([cache]) || cache.pendingResource !== resource) return false;
			for (const heldOwner of cache.subtreeOwners) if (!this.#liveOwners.has(heldOwner) || !this.world.isAlive(heldOwner) || !this.world.isWithin(heldOwner, owner) || !this.#componentCache.has(heldOwner)) return false;
		}
		return true;
	}
	#unheldCellChanges() {
		if (this.#publicationIntents.size === 0) return this.#pendingChanges.size > 0;
		return this.#pendingChanges.capture().some((change) => !change.cellIdentity || !this.#heldCell({
			owner: change.owner,
			site: change.site,
			cellIdentity: change.cellIdentity
		}));
	}
	#unheldCollectionChanges() {
		return [...this.#pendingCollectionRegionKeys].some((key) => {
			const region = this.#liveCollectionRegions.get(key);
			return !region || !this.#heldCollection(region.collection);
		});
	}
	#resourceHoldWait(resources, lease, footprint = {}) {
		for (const [owner, hold] of this.#publicationIntents) {
			if (owner === lease) break;
			if (![...resources].some((resource) => hold.resources.has(resource)) && !(footprint.cells ?? []).some((cell) => hold.cells.some((held) => held.owner === cell.owner && held.site === cell.site && held.cellIdentity === cell.cellIdentity)) && !(footprint.stores ?? []).some((store) => hold.stores.has(store)) && !(footprint.collections ?? []).some((collection) => hold.collections.has(collection))) continue;
			return hold.wait;
		}
		return null;
	}
	#leaseCoversSelection(lease, resources, footprint) {
		if (!lease) return true;
		const held = this.#publicationIntents.get(lease);
		return !!held && [...resources].every((resource) => held.resources.has(resource)) && (footprint.cells ?? []).every((cell) => held.cells.some((selected) => selected.owner === cell.owner && selected.site === cell.site && selected.cellIdentity === cell.cellIdentity)) && (footprint.stores ?? []).every((store) => held.stores.has(store)) && (footprint.collections ?? []).every((collection) => held.collections.has(collection)) && this.#publicationIntents.get(lease) === held;
	}
	#boundaryResourceDependencies(tree, stores) {
		const dependencies = /* @__PURE__ */ new Set();
		let node = tree;
		const visited = /* @__PURE__ */ new Set();
		for (let depth = 0; depth < 9; depth++) {
			if (!node || Array.isArray(node) || typeof node !== "object" || !Object.isFrozen(node)) return null;
			const type = Object.getOwnPropertyDescriptor(node, "type")?.value;
			const props = Object.getOwnPropertyDescriptor(node, "props")?.value;
			if (typeof type !== "function" || visited.has(type) || !props || typeof props !== "object" || !Object.isFrozen(props)) return null;
			visited.add(type);
			const descriptors = Object.getOwnPropertyDescriptors(props);
			if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") || Object.values(descriptors).some((descriptor) => !("value" in descriptor))) return null;
			for (const descriptor of Object.values(descriptors)) {
				if (descriptor.value instanceof AsyncResource) dependencies.add(descriptor.value);
				if (descriptor.value instanceof AsyncStore) stores?.add(descriptor.value);
			}
			const forward = closedComponentForwardProgramFor(type);
			if (!forward) return dependencies;
			const nextProps = {};
			for (const [name, expression] of forward.props) if (expression.kind === "prop") {
				const source = descriptors[expression.name];
				if (!source || !("value" in source)) return null;
				nextProps[name] = source.value;
			} else nextProps[name] = expression.value;
			node = Object.freeze({
				type: forward.childComponent,
				props: Object.freeze(nextProps)
			});
		}
		return null;
	}
	#stageClosedStoreOutputs(selected, stores, requireOutputChange = false, newlyStaged = /* @__PURE__ */ new Set(), retiredPendingReaders = /* @__PURE__ */ new Set(), resourceLease) {
		if (new Set(selected).size !== selected.length) throw new SparseCandidateIneligible();
		const selectedStores = new Set(selected);
		const inputStores = new Set(selected);
		const inputResources = /* @__PURE__ */ new Set();
		const owners = /* @__PURE__ */ new Map();
		const covered = /* @__PURE__ */ new Set();
		const seen = /* @__PURE__ */ new Set();
		const regions = [];
		const resources = new ResourceReadSet(this.#resourceTable);
		let outputChanged = false;
		const ownValue = (object, name) => {
			const descriptor = Object.getOwnPropertyDescriptor(object, name);
			return descriptor && "value" in descriptor ? descriptor.value : void 0;
		};
		const treeRegions = (host, previous, next) => {
			const staged = [];
			let changed = false;
			const visit = (shape, old, proposed) => {
				if (!old || !proposed || Array.isArray(old) || Array.isArray(proposed) || typeof old !== "object" || typeof proposed !== "object") return false;
				const priorElement = Object.getOwnPropertyDescriptors(old);
				const nextElement = Object.getOwnPropertyDescriptors(proposed);
				const oldType = priorElement.type, newType = nextElement.type;
				const oldProps = priorElement.props, newProps = nextElement.props;
				if (!oldType || !newType || !oldProps || !newProps || !("value" in oldType) || !("value" in newType) || !("value" in oldProps) || !("value" in newProps)) return false;
				const priorType = oldType.value;
				const nextType = newType.value;
				const priorProps = oldProps.value;
				const nextProps = newProps.value;
				if (priorType !== shape.tag || nextType !== shape.tag || !priorProps || !nextProps || typeof priorProps !== "object" || typeof nextProps !== "object" || Array.isArray(priorProps) || Array.isArray(nextProps)) return false;
				const priorDescriptors = Object.getOwnPropertyDescriptors(priorProps);
				const nextDescriptors = Object.getOwnPropertyDescriptors(nextProps);
				const oldKey = priorDescriptors.key, newKey = nextDescriptors.key;
				if (!oldKey || !newKey || !("value" in oldKey) || !("value" in newKey) || oldKey.value !== shape.key || newKey.value !== shape.key) return false;
				const expected = /* @__PURE__ */ new Set([
					"key",
					"children",
					...shape.props.map(([name]) => name)
				]);
				if (Object.keys(priorDescriptors).some((name) => !expected.has(name)) || Object.keys(nextDescriptors).some((name) => !expected.has(name))) return false;
				const props = [];
				for (const [name] of shape.props) {
					const prior = priorDescriptors[name];
					const proposedValue = nextDescriptors[name];
					if (!prior || !proposedValue || !("value" in prior) || !("value" in proposedValue)) return false;
					props.push([name, proposedValue.value]);
					changed ||= !sameClosedHostOutput(shape.tag, name, prior.value, proposedValue.value);
				}
				const childrenFor = (descriptors) => {
					const descriptor = descriptors.children;
					if (descriptor && !("value" in descriptor)) return null;
					if (shape.children.length === 0) return descriptor?.value === void 0 ? [] : null;
					const value = descriptor?.value;
					if (shape.children.length === 1) return Array.isArray(value) ? null : [value];
					if (!Array.isArray(value)) return null;
					const elements = Object.getOwnPropertyDescriptors(value);
					const length = elements.length;
					if (!length || !("value" in length) || length.value !== shape.children.length || Reflect.ownKeys(value).length !== shape.children.length + 1) return null;
					const copy = [];
					for (let index = 0; index < shape.children.length; index++) {
						const item = elements[index];
						if (!item || !("value" in item)) return null;
						copy.push(item.value);
					}
					return copy;
				};
				const oldChildren = childrenFor(priorDescriptors);
				const nextChildren = childrenFor(nextDescriptors);
				if (!oldChildren || !nextChildren || oldChildren.length !== shape.children.length || nextChildren.length !== shape.children.length) return false;
				const childDescriptions = [];
				staged.push({
					key: shape.key,
					tag: shape.tag,
					props,
					children: childDescriptions
				});
				for (let index = 0; index < shape.children.length; index++) {
					const child = shape.children[index];
					const oldChild = oldChildren[index];
					const nextChild = nextChildren[index];
					if (child.kind === "host") {
						childDescriptions.push({
							kind: "host",
							key: child.host.key,
							tag: child.host.tag
						});
						if (!visit(child.host, oldChild, nextChild)) return false;
					} else {
						if (typeof oldChild !== "string" && typeof oldChild !== "number" || typeof nextChild !== "string" && typeof nextChild !== "number") return false;
						const oldText = String(oldChild);
						const nextText = String(nextChild);
						childDescriptions.push({
							kind: "text",
							text: nextText
						});
						changed ||= oldText !== nextText;
					}
				}
				return true;
			};
			return visit(host, previous, next) ? {
				regions: staged,
				changed
			} : null;
		};
		const current = (privateOnly = false) => [...owners].every(([owner, { cache, inputs }]) => this.#liveOwners.has(owner) && this.world.isAlive(owner) && this.#componentCache.get(owner) === cache && (privateOnly ? componentCodeCurrentPrivate(cache.type) : componentCodeCurrent(cache.type)) && inputs.every(({ id, prop, source, membership }) => ownValue(cache.props, prop) === source && (membership === void 0 || this.#liveStoreReaders.get(id) === membership && membership.size === 1 && membership.has(source))) && [...this.#liveStoreReaders.keys()].every((id) => !id.startsWith(`${owner}\u0000`) || covered.has(id))) && [...this.#liveStoreReaders].every(([id, membership]) => ![...membership].some((store) => selectedStores.has(store)) || covered.has(id) || retiredPendingReaders.has(id)) && (privateOnly ? resources.validateCanonical() : resources.validate());
		try {
			for (const [id, membership] of this.#liveStoreReaders) {
				if (![...membership].some((store) => selectedStores.has(store))) continue;
				const split = id.indexOf("\0");
				const owner = Number(id.slice(0, split));
				if (split <= 0 || !Number.isSafeInteger(owner)) throw new SparseCandidateIneligible();
				if (owners.has(owner)) continue;
				const cache = this.#componentCache.get(owner);
				const program = typeof cache?.type === "function" ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram : void 0;
				if (!cache || !program || cache.subtreeOwners.size !== 1 || cache.ownEffects.size !== 0 || cache.propBoundSites.size !== 0 || cache.keyedRegion || cache.nativeBoundary || !componentCodeCurrent(cache.type)) throw new SparseCandidateIneligible();
				const inputs = [];
				const values = [];
				for (const input of closedStoreHostInputs(program)) {
					const inputId = `${owner}\u0000${input.storeUseSiteId}`;
					const store = ownValue(cache.props, input.storeProp);
					const inputMembership = this.#liveStoreReaders.get(inputId);
					const paths = closedStoreHostInputPaths(input);
					let projections;
					if (store instanceof AsyncStore) {
						inputStores.add(store);
						const wait = this.#resourceHoldWait(/* @__PURE__ */ new Set(), resourceLease, { stores: [store] });
						if (wait) throw new HeldPublicationWait(wait);
						if (!inputMembership || inputMembership.size !== 1 || !inputMembership.has(store)) throw new SparseCandidateIneligible();
						projections = stores.readClosedProjections(store, inputId, paths);
						if (selectedStores.has(store)) seen.add(store);
					} else {
						if (inputMembership || !(store instanceof AsyncResource)) throw new SparseCandidateIneligible();
						inputResources.add(store);
						const wait = this.#resourceHoldWait(/* @__PURE__ */ new Set([store]), resourceLease);
						if (wait) throw new HeldPublicationWait(wait);
						const status = resources.readClosed(store);
						projections = status ? captureClosedProjectionValues(status.value, paths) : null;
					}
					if (!projections) throw new SparseCandidateIneligible();
					inputs.push({
						id: inputId,
						prop: input.storeProp,
						source: store,
						...inputMembership ? { membership: inputMembership } : {}
					});
					values.push(...projections);
					if (inputMembership) covered.add(inputId);
				}
				const output = program.schemaVersion === 4 || program.schemaVersion === 5 ? null : evaluateClosedStoreHostProgram(program, values);
				if (program.schemaVersion === 4 || program.schemaVersion === 5) {
					const next = evaluateClosedStoreHostTree(program, values);
					if (!next) throw new SparseCandidateIneligible();
					const previous = cache.expandedResult;
					const staged = treeRegions(program.host, previous, next);
					if (!staged) throw new SparseCandidateIneligible();
					outputChanged ||= staged.changed;
					owners.set(owner, {
						cache,
						inputs,
						next
					});
					regions.push(...staged.regions);
					continue;
				}
				const previous = cache.expandedResult;
				if (!output || !previous || Array.isArray(previous) || typeof previous !== "object" || previous.type !== program.host.tag || previous.props.key !== program.host.key || previous.props.children !== void 0 && previous.props.children !== null && previous.props.children !== false) throw new SparseCandidateIneligible();
				outputChanged ||= output.some(([name, value]) => !sameClosedHostOutput(program.host.tag, name, previous.props[name], value));
				const next = Object.freeze({
					type: program.host.tag,
					props: Object.freeze(Object.fromEntries([["key", program.host.key], ...output]))
				});
				owners.set(owner, {
					cache,
					inputs,
					next
				});
				regions.push({
					key: program.host.key,
					tag: program.host.tag,
					props: output
				});
			}
			if ([...selectedStores].some((store) => !seen.has(store) && !newlyStaged.has(store)) || requireOutputChange && !outputChanged || !current() || !stores.validate()) throw new SparseCandidateIneligible();
			const ownerIds = new Set(owners.keys());
			return {
				owners: ownerIds,
				regions,
				current: () => current(),
				privateCurrent: () => current(true),
				inputStores,
				inputResources,
				publish: () => {
					for (const [owner, { next }] of owners) {
						const cache = this.#componentCache.get(owner);
						this.#componentCache.set(owner, {
							...cache,
							result: next,
							expandedResult: next
						});
						this.#refreshDirectKeyedRegionOutput(owner);
						for (const ancestor of this.world.ownerLineage(owner).slice(1)) {
							const live = this.#componentCache.get(ancestor);
							if (live) this.#componentCache.set(ancestor, {
								...live,
								expandedResult: null,
								invalidatedBySparseStore: true
							});
						}
					}
				},
				release: () => {
					resources.discard();
					owners.clear();
					ownerIds.clear();
					covered.clear();
					regions.length = 0;
				}
			};
		} catch (error) {
			resources.discard();
			throw error;
		}
	}
	#prepareClosedStoreCandidate(selected, requireOutputChange, publicationLease) {
		return this.#prepareClosedInputCandidate([], selected, requireOutputChange, () => true, publicationLease);
	}
	/** Prepare a closed retained-prop cut; include every joint input cell. */
	prepareRetained(cells, publicationLease) {
		return this.#prepareClosedInputCandidate(cells, [], false, () => true, publicationLease);
	}
	#prepareClosedInputCandidate(cells, selected, requireOutputChange = false, acceptedCurrent = () => true, resourceLease, acceptedCollections = [], acceptedResources = /* @__PURE__ */ new Set(), acceptedCollectionFootprint = []) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare closed inputs");
		if (!this.#leaseCoversSelection(resourceLease, /* @__PURE__ */ new Set(), {
			cells,
			stores: selected
		})) return null;
		const holdWait = this.#resourceHoldWait(/* @__PURE__ */ new Set(), resourceLease, {
			cells,
			stores: selected
		});
		if (holdWait) return this.#prepareBlockedPublication([holdWait]);
		if (this.#pendingDirectIntent && !(resourceLease && this.#publicationIntents.has(resourceLease)) || !cells.length && !selected.length) return null;
		const captured = this.#captureRetainedCells(cells);
		if (!captured) return null;
		const { writes, sources } = captured;
		const stores = new StoreRenderTransaction(this.#rootId);
		let closed = null;
		let program = null;
		try {
			if (selected.length) closed = this.#stageClosedStoreOutputs(selected, stores, requireOutputChange, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), resourceLease);
			program = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas([], writes.map(({ source, value }) => [source, value]), closed?.regions ?? []);
			if (!program || program.readSources.some((source) => !sources.has(source))) throw new SparseCandidateIneligible();
		} catch (error) {
			const errors = collectCleanupErrors([
				() => program?.discard(),
				() => closed?.release(),
				() => stores.discard(),
				() => this.#discardUncommittedStoreRoots(stores)
			]);
			if (error instanceof HeldPublicationWait && !errors.length) return this.#prepareBlockedPublication([error.resource]);
			if (error instanceof SparseCandidateIneligible && !errors.length) return null;
			return throwWithCleanup(error, errors);
		}
		const codeCurrent = () => acceptedCurrent() && acceptedCollections.every((validate) => validate()) && (closed?.current() ?? true) && writes.every(({ handle }) => {
			const cache = this.#componentCache.get(handle.owner);
			return cache !== void 0 && componentCodeCurrent(cache.type);
		});
		const handles = writes.map(({ handle }) => handle);
		const versions = writes.map(({ version }) => version);
		const acceptedCollectionVersions = acceptedCollectionFootprint.map((collection) => [collection, canonicalCollectionVersion(collection)]);
		const acceptedResourceVersions = [...acceptedResources].map((resource) => [resource, canonicalResourceVersion(resource)]);
		return this.#createCandidateLifecycle({
			baseVersion: this.#publicationVersion,
			baseVDOMVersion: this.#vdom.version,
			scope: { kind: "retained" },
			stores,
			transitions: [],
			pendingResources: [],
			blocked: false,
			permitPendingDirectIntent: () => resourceLease !== void 0 && this.#publicationIntents.has(resourceLease),
			admissionCurrent: () => (!resourceLease || this.#publicationIntents.has(resourceLease)) && !this.#resourceHoldWait(acceptedResources, resourceLease, {
				cells: handles,
				stores: [...selected, ...closed?.inputStores ?? []],
				collections: acceptedCollectionFootprint
			}) && !this.#resourceHoldWait(new Set(closed?.inputResources ?? []), resourceLease) && (!resourceLease || this.#publicationIntents.has(resourceLease)),
			codeCurrent,
			validatePrepared: () => program.validate() && this.#validateRetainedCells(writes, false) && (closed?.current() ?? true) && stores.validate(),
			validatePostHost: () => program.validatePostHost() && this.#validateRetainedCells(writes, true) && (closed?.current() ?? true) && stores.validatePublicationInputs(),
			finalGroupCurrent: () => program.validatePostHostPrivate() && this.#validateRetainedCells(writes, true) && (closed?.privateCurrent() ?? true) && stores.validatePublicationInputsCanonical() && acceptedCurrent() && acceptedCollectionVersions.every(([collection, version]) => version === null || canonicalCollectionVersion(collection) === version) && acceptedResourceVersions.every(([resource, version]) => version === null || canonicalResourceVersion(resource) === version) && writes.every(({ handle }) => {
				const cache = this.#componentCache.get(handle.owner);
				return cache !== void 0 && componentCodeCurrentPrivate(cache.type);
			}),
			commitHost: () => program.commit(),
			preparePublication: () => stores.preparePublicationAfterHost(),
			publish: () => {
				stores.publishAccepted();
				closed?.publish();
				for (const write of writes) this.#lastSourceValues.set(write.source, write.value);
				this.world.clearCellChangesThrough(handles, versions, handles.length);
				this.#pendingChanges.clearNativeThrough(handles, versions, handles.length);
				this.#publicationVersion++;
			},
			installSubscriptions: () => [],
			runEffects: () => {
				stores.notifyPublished();
				return [];
			},
			discard: () => stores.discard(),
			releaseArtifacts: () => {
				program?.discard();
				program = null;
				closed?.release();
				closed = null;
				writes.length = 0;
				handles.length = 0;
				versions.length = 0;
			},
			effectFailureMessage: "Closed input publication callbacks failed"
		});
	}
	#captureRetainedCells(cells) {
		const writes = [];
		const sources = /* @__PURE__ */ new Set();
		for (const input of cells) {
			const handle = Object.freeze({
				owner: input.owner,
				site: input.site,
				cellIdentity: input.cellIdentity
			});
			const source = this.world.scalarSourceForCell(handle);
			const version = this.world.versionForCell(handle);
			const cache = this.#componentCache.get(handle.owner);
			if (!source || version === null || !cache || !this.#liveOwners.has(handle.owner) || !this.#compiledPropSitesForCache(handle.owner, cache).has(handle.site)) return null;
			if (sources.has(source)) continue;
			sources.add(source);
			const value = Object.getOwnPropertyDescriptor(source, "value")?.value;
			if (typeof value !== "number") return null;
			writes.push({
				handle,
				source,
				version,
				value
			});
		}
		return {
			writes,
			sources
		};
	}
	#validateRetainedCells(writes, afterHost) {
		return writes.every((write) => {
			const version = this.world.versionForCell(write.handle);
			return this.#liveOwners.has(write.handle.owner) && this.world.scalarSourceForCell(write.handle) === write.source && version !== null && (afterHost ? version >= write.version : version === write.version) && (afterHost && version > write.version || Object.is(Object.getOwnPropertyDescriptor(write.source, "value")?.value, write.value));
		});
	}
	#createCandidateLifecycle(spec) {
		const scopedDelta = spec.scope !== void 0;
		const appliedVDOMDelta = !spec.scope ? 1 : spec.scope.kind === "retained" ? 0 : spec.scope.versionDelta;
		let admittedVersion = spec.baseVersion;
		let admittedVDOMVersion = spec.baseVDOMVersion;
		const candidateStores = new Set(spec.stores.stores);
		for (const store of candidateStores) this.#candidateStoreHolds.set(store, (this.#candidateStoreHolds.get(store) ?? 0) + 1);
		let storesReleased = false;
		const releaseStores = () => {
			if (storesReleased) return;
			storesReleased = true;
			this.#releaseCandidateStoreHolds(candidateStores);
		};
		let phase = "prepared";
		let released = false;
		let subscriptionsInstalled = false;
		let candidateHandle = null;
		const pendingResources = [...spec.pendingResources];
		const release = (published) => {
			if (released) return;
			released = true;
			try {
				spec.releaseArtifacts(published);
			} finally {
				pendingResources.length = 0;
				candidateStores.clear();
				if (candidateHandle) {
					groupPublicationReceipts.delete(candidateHandle);
					Object.defineProperties(candidateHandle, {
						baseVersion: {
							value: admittedVersion,
							enumerable: true,
							configurable: true
						},
						targetVersion: {
							value: admittedVersion + 1,
							enumerable: true,
							configurable: true
						}
					});
					Object.defineProperty(candidateHandle, "pendingResources", {
						value: Object.freeze([]),
						enumerable: true,
						configurable: true
					});
					candidateHandle.validate = closedCandidateValidate;
					candidateHandle.commitHost = closedCandidateAction;
					candidateHandle.validatePostHost = closedCandidateValidate;
					candidateHandle.preparePublication = closedCandidateAction;
					candidateHandle.publish = closedCandidateAction;
					candidateHandle.installSubscriptions = () => [];
					candidateHandle.runEffects = closedCandidateAction;
					candidateHandle.discard = closedCandidateNoop;
					candidateHandle.failGroup = closedCandidateNoop;
					candidateHandle.retainStoreDependencies = closedCandidateLease;
				}
			}
		};
		const finishUnpublished = (next) => {
			phase = next;
			const errors = collectCleanupErrors([
				() => spec.discard(),
				releaseStores,
				() => {
					this.#preparedCandidates.delete(candidate);
				},
				() => release(false),
				() => this.#releasePublicationBarrier(candidate)
			]);
			if (errors.length === 1) throw errors[0];
			if (errors.length) throw new AggregateError(errors, "Candidate cleanup failed");
		};
		const failUnpublished = (error) => {
			phase = "failed";
			this.#terminalHostFailure ??= error;
			this.#terminalHostFailed = true;
			return throwWithCleanup(error, collectCleanupErrors([
				() => this.#vdom.failPublication(),
				() => this.#dropPendingDirectIntent(),
				() => this.#cancelTerminalResourceWaits(),
				() => spec.discard(),
				releaseStores,
				() => {
					this.#preparedCandidates.delete(candidate);
				},
				() => release(false),
				() => this.#releasePublicationBarrier(candidate)
			]));
		};
		const rootVersion = () => this.#publicationVersion;
		const acceptPrepared = () => {
			if (phase !== "publication-ready") throw new Error(`Candidate is ${phase}`);
			try {
				spec.publish();
				this.#vdom.publishAccepted();
				phase = "published";
				spec.accepted?.();
			} catch (error) {
				this.#terminalFailureKind = "publication";
				failUnpublished(error);
			}
		};
		const finalPrivateCurrent = () => phase === "publication-ready" && !released && !this.#disposed && !this.#disposeRequested && !this.#terminalHostFailed && !this.#codeInvalidated && (!scopedDelta || spec.permitPendingDirectIntent?.() || this.#pendingDirectIntent === null) && this.#publicationVersion === admittedVersion && this.#vdom.appliedVersion === admittedVDOMVersion + appliedVDOMDelta && spec.finalGroupCurrent();
		const candidate = {
			rootId: this.#rootId,
			get baseVersion() {
				return scopedDelta && phase === "prepared" ? rootVersion() : admittedVersion;
			},
			get targetVersion() {
				return candidate.baseVersion + 1;
			},
			stores: candidateStores,
			transitions: Object.freeze([...spec.transitions]),
			pendingResources: Object.freeze([...pendingResources]),
			blocked: spec.blocked,
			retainStoreDependencies: () => {
				if (this.#disposed || released) return () => {};
				return this.holdStoreDependencies(candidateStores);
			},
			validate: () => phase === "prepared" && !released && !this.#disposed && !this.#terminalHostFailed && !this.#codeInvalidated && (scopedDelta || this.#publicationIntents.size === 0 || (spec.permitHeldFullCandidate?.() ?? false)) && (!scopedDelta || spec.permitPendingDirectIntent?.() || this.#pendingDirectIntent === null) && (spec.admissionCurrent?.() ?? true) && spec.codeCurrent() && (scopedDelta || this.#publicationVersion === spec.baseVersion && this.#vdom.version === spec.baseVDOMVersion) && spec.validatePrepared() && !this.#codeInvalidated && (!scopedDelta || spec.permitPendingDirectIntent?.() || this.#pendingDirectIntent === null) && (spec.admissionCurrent?.() ?? true) && spec.codeCurrent(),
			commitHost: () => {
				if (phase !== "prepared") throw new Error(`Candidate is ${phase}`);
				this.#assertNoPublicationBarrier("commit another candidate");
				if (!candidate.validate()) {
					finishUnpublished("discarded");
					throw new Error("Native root candidate is stale");
				}
				admittedVersion = this.#publicationVersion;
				admittedVDOMVersion = this.#vdom.version;
				this.#publicationBarrier = candidate;
				try {
					this.#vdom.beginPublication();
					this.#candidateHostCommit = true;
					spec.commitHost();
					if (phase !== "prepared" || this.#disposed || this.#disposeRequested) throw new Error("Native root candidate was cancelled during host commit");
					phase = "host-committed";
				} catch (error) {
					failUnpublished(error);
				} finally {
					this.#candidateHostCommit = false;
				}
			},
			validatePostHost: () => (phase === "host-committed" || phase === "publication-ready") && !this.#disposed && !this.#disposeRequested && !this.#terminalHostFailed && !this.#codeInvalidated && (!scopedDelta || spec.permitPendingDirectIntent?.() || this.#pendingDirectIntent === null) && spec.codeCurrent() && this.#publicationVersion === admittedVersion && this.#vdom.appliedVersion === admittedVDOMVersion + appliedVDOMDelta && spec.validatePostHost() && !this.#codeInvalidated && (!scopedDelta || spec.permitPendingDirectIntent?.() || this.#pendingDirectIntent === null) && spec.codeCurrent(),
			preparePublication: () => {
				if (phase !== "host-committed") throw new Error(`Candidate is ${phase}`);
				if (!candidate.validatePostHost()) failUnpublished(/* @__PURE__ */ new Error("Native root candidate became stale after host commit"));
				try {
					spec.preparePublication();
					phase = "publication-ready";
				} catch (error) {
					failUnpublished(error);
				}
			},
			publish: () => {
				if (phase === "host-committed") candidate.preparePublication();
				if (phase !== "publication-ready") throw new Error(`Candidate is ${phase}`);
				try {
					if (this.#codeInvalidated || scopedDelta && !spec.permitPendingDirectIntent?.() && this.#pendingDirectIntent !== null || !spec.codeCurrent() || !finalPrivateCurrent()) throw new Error("Compiled module changed before publication");
				} catch (error) {
					this.#terminalFailureKind = "publication";
					failUnpublished(error);
				}
				acceptPrepared();
			},
			installSubscriptions: () => {
				if (phase !== "published") throw new Error(`Candidate is ${phase}`);
				if (subscriptionsInstalled) return [];
				subscriptionsInstalled = true;
				try {
					return [...spec.installSubscriptions()];
				} catch (error) {
					return [error];
				}
			},
			runEffects: () => {
				if (phase !== "published") throw new Error(`Candidate is ${phase}`);
				const errors = candidate.installSubscriptions();
				try {
					errors.push(...spec.runEffects());
				} catch (error) {
					errors.push(error);
				} finally {
					if (phase === "published") phase = "finished";
					errors.push(...collectCleanupErrors([
						() => {
							this.#preparedCandidates.delete(candidate);
						},
						releaseStores,
						() => release(true),
						() => this.#releasePublicationBarrier(candidate)
					]));
				}
				if (errors.length) throw new AggregateError(errors, spec.effectFailureMessage);
			},
			discard: () => {
				if (phase === "published" || phase === "finished" || phase === "discarded" || phase === "failed") return;
				if (phase === "host-committed" || phase === "publication-ready") throw new Error("Cannot discard a candidate after host commit");
				finishUnpublished("discarded");
			},
			failGroup: (error) => {
				if (phase === "failed" || phase === "discarded") return;
				const wasPublished = phase === "published" || phase === "finished";
				phase = "failed";
				this.#terminalHostFailure ??= error;
				this.#terminalHostFailed = true;
				if (wasPublished) this.#terminalFailureKind = "publication";
				const errors = collectCleanupErrors([
					() => this.#vdom.failPublication(),
					() => this.#dropPendingDirectIntent(),
					() => this.#cancelTerminalResourceWaits(),
					() => {
						if (!wasPublished) spec.discard();
					},
					releaseStores,
					() => {
						this.#preparedCandidates.delete(candidate);
					},
					() => release(wasPublished),
					() => this.#releasePublicationBarrier(candidate)
				]);
				if (errors.length) throwWithCleanup(error, errors);
			}
		};
		candidateHandle = candidate;
		groupPublicationReceipts.set(candidate, {
			current: finalPrivateCurrent,
			accept: acceptPrepared
		});
		this.#preparedCandidates.set(candidate, spec.referencesCompiledSource ?? (() => false));
		if (this.#codeInvalidated) candidate.discard();
		return candidate;
	}
	#prepareSparseStoreCandidate(readerOwners, capturedChanges, directOnlyOwners, storeGenerationAtPrepare) {
		if (readerOwners.size === 0 || this.#everReadResource || this.#everHadNativeBoundary || this.#pendingCollectionRegionKeys.size > 0) return null;
		for (const change of capturedChanges) if (!readerOwners.has(change.owner) && !directOnlyOwners.has(change.owner)) return null;
		const readerCaches = /* @__PURE__ */ new Map();
		const readerKeys = /* @__PURE__ */ new Map();
		for (const owner of readerOwners) {
			this.#count("store.sparse.eligibility-owner-visits");
			if (!this.world.isAlive(owner) || !this.#liveOwners.has(owner)) return null;
			this.#count("store.sparse.reader-cache-lookups");
			const cache = this.#componentCache.get(owner);
			if (!cache || cache.nativeBoundary || cache.subtreeOwners.size !== 1) return null;
			if ((typeof cache.type === "function" ? definedComponents.get(cache.type)?.metadata : void 0)?.hostLeafOutput !== true) return null;
			if (hasNestedComponent(cache.result, () => this.#count("store.sparse.eligibility-tree-node-visits"))) return null;
			const hostKey = singleHostRootKey(cache.expandedResult, () => this.#count("store.sparse.eligibility-tree-node-visits"));
			if (hostKey === null) return null;
			readerCaches.set(owner, cache);
			readerKeys.set(owner, hostKey);
		}
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const candidateChanges = [...capturedChanges];
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId);
		let resourceReads = new ResourceReadSet(this.#resourceTable);
		const cachePatches = /* @__PURE__ */ new Map();
		const ancestorPatches = /* @__PURE__ */ new Map();
		const capturedBindings = [];
		const numericWrites = [];
		const numericSources = /* @__PURE__ */ new Set();
		for (const change of candidateChanges) {
			if (!directOnlyOwners.has(change.owner)) continue;
			if (!this.world.isAlive(change.owner)) continue;
			const source = this.world.scalarSource(change.owner, change.site);
			const previous = source ? this.#lastSourceValues.get(source) : void 0;
			if (!source || previous === void 0 || numericSources.has(source)) continue;
			numericSources.add(source);
			numericWrites.push({
				owner: change.owner,
				site: change.site,
				source,
				version: this.world.version(change.owner, change.site),
				previous,
				current: source.value
			});
		}
		const validateNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && Object.is(write.source.value, write.current));
		const validatePostHostNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) && this.world.scalarSource(write.owner, write.site) === write.source && this.world.version(write.owner, write.site) >= write.version && (this.world.version(write.owner, write.site) > write.version || Object.is(write.source.value, write.current)));
		let resourceWasRead = false;
		let preparedHost = null;
		let preparationFailed = false;
		try {
			const regions = [];
			for (const owner of readerOwners) {
				const cached = readerCaches.get(owner);
				this.#count("owner.component-visits");
				const prepared = this.#prepareOwnerRender(owner, {
					preparation,
					stores,
					resourceReads,
					onResourceRead: () => resourceWasRead = true,
					captureBinding: (binding, sources, bindingOwner, sites) => {
						capturedBindings.push({
							binding,
							sources,
							owner: bindingOwner,
							sites
						});
					},
					onOutputNode: () => this.#count("store.sparse.output-tree-node-visits")
				});
				if (!prepared || resourceWasRead) {
					preparationFailed = true;
					break;
				}
				const result = prepared.result;
				if (hasNestedComponent(result, () => this.#count("store.sparse.output-tree-node-visits")) || singleHostRootKey(result, () => this.#count("store.sparse.output-tree-node-visits")) !== readerKeys.get(owner)) {
					preparationFailed = true;
					break;
				}
				cachePatches.set(owner, {
					...cached,
					result,
					expandedResult: result,
					ownEffects: prepared.ownEffects,
					propBoundSites: prepared.propBoundSites,
					numericStateAdmitted: prepared.numericStateAdmitted
				});
				regions.push({
					key: readerKeys.get(owner),
					tree: result
				});
				this.#count("store.sparse.reader-owner-renders");
				for (const ancestor of this.world.ownerLineage(owner).slice(1)) {
					this.#count("store.sparse.ancestor-owner-visits");
					if (ancestorPatches.has(ancestor)) continue;
					const ancestorCache = this.#componentCache.get(ancestor);
					if (!ancestorCache || ancestorCache.invalidatedBySparseStore) continue;
					ancestorPatches.set(ancestor, {
						...ancestorCache,
						expandedResult: null,
						invalidatedBySparseStore: true
					});
				}
			}
			if (preparationFailed || resourceWasRead) throw new SparseCandidateIneligible();
			preparedHost = this.#vdom.prepareKeyedRegions(regions);
			if (!preparedHost) throw new SparseCandidateIneligible();
		} catch (error) {
			preparation.discard();
			stores.discard();
			resourceReads?.discard();
			resourceReads = null;
			this.#discardUncommittedStoreRoots(stores);
			preparedHost = null;
			cachePatches.clear();
			ancestorPatches.clear();
			capturedBindings.length = 0;
			numericWrites.length = 0;
			readerCaches.clear();
			readerKeys.clear();
			candidateChanges.length = 0;
			if (resourceWasRead || preparationFailed || error instanceof SparseCandidateIneligible) return null;
			throw error;
		}
		const capturedSparseValues = /* @__PURE__ */ new Map();
		for (const [owner, cache] of cachePatches) for (const site of cache.propBoundSites) {
			const source = preparation.scalarSource(owner, site);
			if (!source) continue;
			let sites = capturedSparseValues.get(owner);
			if (!sites) capturedSparseValues.set(owner, sites = /* @__PURE__ */ new Map());
			sites.set(site, source.value);
		}
		const capturedCodeRevisions = captureCodeRevisions(cachePatches.values());
		return this.#createCandidateLifecycle({
			baseVersion,
			baseVDOMVersion,
			stores,
			transitions: [],
			pendingResources: [],
			blocked: false,
			codeCurrent: () => cacheCodeCurrent(cachePatches.values()),
			validatePrepared: () => this.#storeNotificationGeneration === storeGenerationAtPrepare && preparation.validate() && !preparation.hasStateWrites() && stores.validate() && validateNumericWrites() && (resourceReads?.validate() ?? false),
			validatePostHost: () => preparation.validatePublicationInputs() && !preparation.hasStateWrites() && stores.validatePublicationInputs() && validatePostHostNumericWrites() && (resourceReads?.validate() ?? false),
			finalGroupCurrent: () => preparation.validatePublicationInputs() && !preparation.hasStateWrites() && stores.validatePublicationInputsCanonical() && validatePostHostNumericWrites() && (resourceReads?.validateCanonical() ?? false) && cacheCodeCurrentPrivate(cachePatches.values()) && codeRevisionsCurrent(capturedCodeRevisions),
			preparePublication: () => {
				preparation.preparePublicationAfterHost();
				stores.preparePublicationAfterHost();
			},
			commitHost: () => {
				preparation.beginHostApplication();
				for (const item of capturedBindings) {
					const canonical = item.sites.map((site, index) => this.world.isAlive(item.owner) ? this.world.scalarSource(item.owner, site) ?? item.sources[index] : item.sources[index]);
					const mutable = item.binding.sources;
					if (mutable) for (let index = 0; index < canonical.length; index++) mutable[index] = canonical[index];
					item.binding.source = canonical[0];
				}
				preparedHost.commit();
				preparedHost = null;
				this.#applyCandidateNumericWrites(numericWrites);
			},
			publish: () => {
				preparation.publishAccepted();
				stores.publishAccepted();
				for (const [owner, cache] of cachePatches) {
					this.#count("store.sparse.cache-patch-writes");
					this.#componentCache.set(owner, cache);
				}
				for (const owner of cachePatches.keys()) this.#refreshDirectKeyedRegionOutput(owner, true);
				for (const [owner, cache] of ancestorPatches) {
					this.#count("store.sparse.ancestor-marker-writes");
					this.#componentCache.set(owner, cache);
				}
				for (const [owner, cache] of cachePatches) {
					this.#count("store.sparse.source-history-owner-visits");
					const previous = readerCaches.get(owner);
					this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites, capturedSparseValues.get(owner));
				}
				for (const write of numericWrites) if (this.world.isAlive(write.owner) && this.world.scalarSource(write.owner, write.site) === write.source) {
					if (this.#vdom.hasBoundSource(write.source)) this.#lastSourceValues.set(write.source, write.current);
					else this.#lastSourceValues.delete(write.source);
				}
				resourceReads?.discard();
				resourceReads = null;
				this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
				this.world.clearChangesThrough(candidateChanges);
				this.#pendingChanges.clearThrough(candidateChanges);
				this.#publicationVersion++;
			},
			installSubscriptions: () => {
				try {
					this.#syncStoreReaders(stores, true);
					return [];
				} catch (error) {
					return [error];
				}
			},
			runEffects: () => {
				const errors = [];
				try {
					preparation.notifyPublished();
				} catch (error) {
					errors.push(error);
				}
				try {
					stores.notifyPublished();
				} catch (error) {
					errors.push(error);
				}
				for (const [owner, cache] of cachePatches) {
					this.#count("store.sparse.effect-owner-visits");
					errors.push(...this.#reconcileOwnerEffects(owner, cache.ownEffects));
				}
				return errors;
			},
			discard: () => {
				preparation.discard();
				stores.discard();
				resourceReads?.discard();
				resourceReads = null;
			},
			releaseArtifacts: () => {
				resourceReads?.discard();
				resourceReads = null;
				cachePatches.clear();
				ancestorPatches.clear();
				readerCaches.clear();
				readerKeys.clear();
				candidateChanges.length = 0;
				capturedBindings.length = 0;
				numericWrites.length = 0;
				preparedHost = null;
			},
			effectFailureMessage: "Component effects failed after sparse store candidate publication"
		});
	}
	#prepareCandidate(tree, options, forceRender, dirtyOwners, relevantOwners, numericChanges = [], heldGenericState) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare");
		if (this.#terminalHostFailed) throw new Error("Component root is terminal after a host commit failure");
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const directIntentAtPrepare = this.#pendingDirectIntent;
		let acceptedIntentLease = null;
		let retryResourceAfterPublication = false;
		const storeGenerationAtPrepare = this.#storeNotificationGeneration;
		const capturedChanges = this.#pendingChanges.capture();
		const numericWrites = [];
		const numericSources = /* @__PURE__ */ new Set();
		for (const change of numericChanges) {
			if (!this.world.isAlive(change.owner)) continue;
			const source = this.world.scalarSource(change.owner, change.site);
			const previous = source ? this.#lastSourceValues.get(source) : void 0;
			if (!source || previous === void 0 || numericSources.has(source)) continue;
			numericSources.add(source);
			numericWrites.push({
				owner: change.owner,
				site: change.site,
				source,
				version: this.world.version(change.owner, change.site),
				previous,
				current: source.value
			});
		}
		const validateNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && Object.is(write.source.value, write.current));
		const validatePostHostNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) && this.world.scalarSource(write.owner, write.site) === write.source && this.world.version(write.owner, write.site) >= write.version && (this.world.version(write.owner, write.site) > write.version || Object.is(write.source.value, write.current)));
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId, { transitions: options.transitions });
		let resourceReads = new ResourceReadSet(this.#resourceTable);
		const expansionJournal = void 0;
		const nextBoundaryPrimaries = new Map(this.#boundaryPrimaries);
		const boundaryState = {
			blocked: false,
			visited: /* @__PURE__ */ new Set(),
			held: heldGenericState,
			retained: heldGenericState ? /* @__PURE__ */ new Set() : void 0
		};
		const nextOwners = /* @__PURE__ */ new Set();
		const nextEffects = /* @__PURE__ */ new Map();
		const nextCache = /* @__PURE__ */ new Map();
		const createdOwners = [];
		const keyedRegions = /* @__PURE__ */ new Map();
		const collectionRegions = /* @__PURE__ */ new Map();
		const capturedBindings = [];
		let expanded;
		let preparedHost = null;
		const priorKeyed = this.#collectedKeyedRegions;
		const priorCollections = this.#collectedCollectionRegions;
		this.#collectedKeyedRegions = keyedRegions;
		this.#collectedCollectionRegions = collectionRegions;
		try {
			expanded = this.#expand(tree, this.#rootOwner, nextOwners, nextEffects, nextCache, createdOwners, "root", forceRender, dirtyOwners, relevantOwners, [], /* @__PURE__ */ new Map(), stores, void 0, void 0, preparation, (binding, sources, owner, sites) => capturedBindings.push({
				binding,
				sources,
				owner,
				sites
			}), resourceReads, expansionJournal, nextBoundaryPrimaries, boundaryState);
			if (heldGenericState && (boundaryState.retained?.size !== heldGenericState.boundaries.size || !this.#heldGenericStateCurrent(heldGenericState))) boundaryState.blocked = true;
			for (const key of nextBoundaryPrimaries.keys()) if (!boundaryState.visited.has(key)) nextBoundaryPrimaries.delete(key);
			preparedHost = this.#vdom.prepareCommit(expanded, null, true);
			expanded = null;
		} catch (error) {
			preparation.discard();
			stores.discard();
			resourceReads?.discard();
			resourceReads = null;
			this.#discardUncommittedStoreRoots(stores);
			throw error;
		} finally {
			this.#collectedKeyedRegions = priorKeyed;
			this.#collectedCollectionRegions = priorCollections;
		}
		const capturedBoundValues = /* @__PURE__ */ new Map();
		for (const [owner, cache] of nextCache) for (const site of cache.propBoundSites) {
			const source = preparation.scalarSource(owner, site);
			if (!source) continue;
			let sites = capturedBoundValues.get(owner);
			if (!sites) capturedBoundValues.set(owner, sites = /* @__PURE__ */ new Map());
			sites.set(site, source.value);
		}
		const candidatePendingResources = [.../* @__PURE__ */ new Set([...resourceReads.pending, ...[...heldGenericState?.boundaries.values() ?? []].map(({ resource }) => resource)])];
		const ownerIds = new Set(nextOwners);
		const previousOwners = new Set(this.#liveOwners);
		const artifacts = {
			preparation,
			stores,
			preparedHost,
			tree: { value: tree },
			nextCache,
			nextEffects,
			nextOwners,
			ownerIds,
			previousOwners,
			keyedRegions,
			collectionRegions,
			capturedBindings,
			capturedChanges,
			numericWrites
		};
		let artifactsReleased = false;
		const releaseCandidateArtifacts = (published) => {
			if (artifactsReleased) return;
			artifactsReleased = true;
			resourceReads?.discard();
			resourceReads = null;
			candidatePendingResources.length = 0;
			artifacts.preparation = null;
			artifacts.stores = null;
			artifacts.preparedHost = null;
			artifacts.tree = null;
			if (!published) artifacts.nextCache?.clear();
			artifacts.nextCache = null;
			artifacts.nextEffects?.clear();
			artifacts.nextEffects = null;
			artifacts.nextOwners?.clear();
			artifacts.nextOwners = null;
			artifacts.ownerIds?.clear();
			artifacts.ownerIds = null;
			artifacts.previousOwners?.clear();
			artifacts.previousOwners = null;
			artifacts.keyedRegions?.clear();
			artifacts.keyedRegions = null;
			artifacts.collectionRegions?.clear();
			artifacts.collectionRegions = null;
			artifacts.capturedBindings?.splice(0);
			artifacts.capturedBindings = null;
			artifacts.capturedChanges?.splice(0);
			artifacts.capturedChanges = null;
			artifacts.numericWrites?.splice(0);
			artifacts.numericWrites = null;
			if (!published) nextBoundaryPrimaries.clear();
			tree = null;
			expanded = null;
			preparedHost = null;
		};
		const validatesCollections = () => [...artifacts.keyedRegions?.values() ?? []].every((region) => !region.collection || region.collection.collection.version === region.collection.snapshotVersion) && [...artifacts.collectionRegions?.values() ?? []].every((region) => region.collection.version === region.snapshotVersion);
		const validatesPostHostCollections = () => [...artifacts.keyedRegions?.values() ?? []].every((region) => !region.collection || region.collection.collection.version >= region.collection.snapshotVersion) && [...artifacts.collectionRegions?.values() ?? []].every((region) => region.collection.version >= region.snapshotVersion);
		const validatesPostHostCollectionsCanonical = () => [...artifacts.keyedRegions?.values() ?? []].every((region) => {
			if (!region.collection) return true;
			const version = canonicalCollectionVersion(region.collection.collection);
			return version === null || version >= region.collection.snapshotVersion;
		}) && [...artifacts.collectionRegions?.values() ?? []].every((region) => {
			const version = canonicalCollectionVersion(region.collection);
			return version === null || version >= region.snapshotVersion;
		});
		const capturedCodeRevisions = captureCodeRevisions(artifacts.nextCache?.values() ?? []);
		return this.#createCandidateLifecycle({
			baseVersion,
			baseVDOMVersion,
			stores,
			transitions: options.transitions ?? [],
			pendingResources: candidatePendingResources,
			blocked: boundaryState.blocked,
			permitHeldFullCandidate: heldGenericState ? () => this.#heldGenericStateCurrent(heldGenericState) : void 0,
			referencesCompiledSource: (sourceFile) => treeReferencesCompiledSource(tree, sourceFile) || [...artifacts.nextCache?.values() ?? []].some((cache) => cacheReferencesCompiledSource(cache, sourceFile)),
			codeCurrent: () => this.#pendingDirectIntent === directIntentAtPrepare && (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState)) && cacheCodeCurrent(artifacts.nextCache?.values() ?? []),
			validatePrepared: () => artifacts.preparation !== null && artifacts.preparation.validate() && !artifacts.preparation.hasStateWrites() && artifacts.stores !== null && artifacts.stores.validate() && validateNumericWrites() && (resourceReads?.validate() ?? false) && !boundaryState.blocked && validatesCollections(),
			validatePostHost: () => artifacts.preparation !== null && artifacts.preparation.validatePublicationInputs() && !artifacts.preparation.hasStateWrites() && artifacts.stores !== null && artifacts.stores.validatePublicationInputs() && validatePostHostNumericWrites() && !boundaryState.blocked && validatesPostHostCollections(),
			finalGroupCurrent: () => artifacts.preparation !== null && artifacts.preparation.validatePublicationInputs() && !artifacts.preparation.hasStateWrites() && artifacts.stores !== null && artifacts.stores.validatePublicationInputsCanonical() && validatePostHostNumericWrites() && !boundaryState.blocked && validatesPostHostCollectionsCanonical() && cacheCodeCurrentPrivate(artifacts.nextCache?.values() ?? []) && codeRevisionsCurrent(capturedCodeRevisions) && this.#pendingDirectIntent === directIntentAtPrepare && (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState)) && ((resourceReads?.validateCanonical() ?? true) || (retryResourceAfterPublication = true)),
			preparePublication: () => {
				retryResourceAfterPublication = resourceReads !== null && !resourceReads.validate();
				artifacts.preparation.preparePublicationAfterHost();
				artifacts.stores.preparePublicationAfterHost();
				if (!validatesPostHostCollections() || !validatePostHostNumericWrites() || !artifacts.stores.validatePublicationInputs() || !artifacts.preparation.validatePublicationInputs()) throw new Error("Full candidate inputs changed before publication");
			},
			commitHost: () => {
				artifacts.preparation.beginHostApplication();
				for (const item of artifacts.capturedBindings ?? []) {
					const canonical = item.sites.map((site, index) => this.world.isAlive(item.owner) ? this.world.scalarSource(item.owner, site) ?? item.sources[index] : item.sources[index]);
					const mutable = item.binding.sources;
					if (mutable) for (let index = 0; index < canonical.length; index++) mutable[index] = canonical[index];
					item.binding.source = canonical[0];
				}
				artifacts.preparedHost.commit();
				artifacts.preparedHost = null;
				this.#applyCandidateNumericWrites(artifacts.numericWrites ?? []);
			},
			publish: () => {
				artifacts.preparation.publishAccepted();
				artifacts.stores.publishAccepted();
				this.#tree = artifacts.tree.value;
				this.#liveOwners = new Set(artifacts.ownerIds);
				this.#componentCache = artifacts.nextCache;
				this.#boundaryPrimaries = nextBoundaryPrimaries;
				if (retryResourceAfterPublication) this.#pendingResourceRetry = true;
				resourceReads?.discard();
				resourceReads = null;
				this.#syncLastSourceValues(artifacts.nextCache, capturedBoundValues);
				if (this.#storeNotificationGeneration === storeGenerationAtPrepare && (!heldGenericState || this.#heldGenericReadersState(heldGenericState) === "current")) this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
				this.world.clearChangesThrough(capturedChanges);
				this.#pendingChanges.clearThrough(capturedChanges);
				this.#publicationVersion++;
			},
			accepted: () => {
				if (directIntentAtPrepare && this.#pendingDirectIntent === directIntentAtPrepare) {
					this.#pendingDirectIntent = null;
					acceptedIntentLease = directIntentAtPrepare.releaseStoreLease;
					directIntentAtPrepare.releaseStoreLease = null;
					directIntentAtPrepare.tree = null;
				}
			},
			installSubscriptions: () => {
				if (this.#disposed) return [];
				const errors = [];
				try {
					this.#syncStoreReaders(artifacts.stores);
				} catch (error) {
					errors.push(error);
				} finally {
					const releaseLease = acceptedIntentLease;
					acceptedIntentLease = null;
					if (releaseLease) errors.push(...collectCleanupErrors([releaseLease]));
				}
				if (options.autoRetryResources !== false) try {
					this.#syncResourceSubscriptions(candidatePendingResources);
				} catch (error) {
					errors.push(error);
				}
				try {
					this.#syncCollectionRegions(artifacts.nextCache, artifacts.collectionRegions);
				} catch (error) {
					errors.push(error);
				}
				return errors;
			},
			runEffects: () => {
				if (this.#disposed) return [];
				const errors = [];
				try {
					artifacts.preparation.notifyPublished();
				} catch (error) {
					errors.push(error);
				}
				try {
					artifacts.stores.notifyPublished();
				} catch (error) {
					errors.push(error);
				}
				errors.push(...this.#reconcileEffects(artifacts.nextEffects));
				for (const previous of artifacts.previousOwners ?? []) {
					if (artifacts.ownerIds?.has(previous)) continue;
					this.world.destroyOwner(previous);
					this.#dropPendingForOwner(previous);
				}
				return errors;
			},
			discard: () => {
				artifacts.preparation?.discard();
				artifacts.stores?.discard();
				resourceReads?.discard();
				resourceReads = null;
			},
			releaseArtifacts: releaseCandidateArtifacts,
			effectFailureMessage: "Component effects failed after candidate publication"
		});
	}
	/** Stable identifier used when coordinating transitions across native roots. */
	get rootId() {
		return this.#rootId;
	}
	/** A retired root rejects new work; its accepted host tree stays until caller disposal. */
	get retired() {
		return this.#disposed || this.#codeInvalidated;
	}
	onDispose(listener) {
		if (typeof listener !== "function") throw new Error("Dispose listener must be a function");
		if (this.#disposed) {
			listener();
			return () => {};
		}
		this.#disposeListeners.add(listener);
		return () => this.#disposeListeners.delete(listener);
	}
	/** Observe terminal work retirement; callers still dispose the accepted host tree. */
	onRetire(listener) {
		if (typeof listener !== "function") throw new Error("Retire listener must be a function");
		if (this.#disposed || this.#codeInvalidated && !this.#revisionRetirementPending) {
			listener();
			return () => {};
		}
		this.#retireListeners.add(listener);
		return () => this.#retireListeners.delete(listener);
	}
	get snapshot() {
		return this.#vdom.snapshot;
	}
	get partialCommitCount() {
		return this.#vdom.partialCommitCount;
	}
	get partialCommitBatchCount() {
		return this.#vdom.partialCommitBatchCount;
	}
	diagnostics() {
		return {
			version: this.version,
			ownerCount: this.#liveOwners.size,
			pendingChangeCount: this.#pendingChanges.size,
			sourceValueSyncVisits: this.#sourceValueSyncVisits,
			disposed: this.#disposed
		};
	}
	mount(tree) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("mount");
		if (this.version !== 0) throw new Error("ComponentStateRoot is already mounted");
		this.#renderAndCommit(tree, true);
	}
	/** Commit one batched owner/site update; return false when there is no work. */
	flush() {
		this.#assertActive();
		if (this.#nativeCellCutActive || this.#scopedFlushActive) {
			this.#scheduled = false;
			this.#deferredFlush = true;
			return false;
		}
		if (this.#publicationBarrier || this.#hostApplicationDepth > 0 || this.#directPublicationPending) {
			this.#deferredFlush = true;
			this.#scheduled = false;
			return false;
		}
		const flushStarted = this.#profile ? performance.now() : 0;
		const reportFlush = () => {
			if (this.#activeCounters) {
				this.#profileCounter?.(Object.fromEntries(this.#activeCounters));
				this.#activeCounters = void 0;
			}
			if (this.#profile) this.#profile("root.flush", performance.now() - flushStarted);
		};
		this.#scheduled = false;
		if (this.#pendingDirectIntent && this.#publicationIntents.size === 0) {
			const intent = this.#pendingDirectIntent;
			const acceptedTree = this.#tree;
			const retryResource = this.#pendingResourceRetry;
			const retryBoundaries = [...this.#pendingBoundaryRetries];
			this.#pendingResourceRetry = false;
			this.#pendingBoundaryRetries.clear();
			this.#scopedFlushActive = true;
			let scheduleRestoredWork = false;
			try {
				return this.#renderAndCommit(intent.tree, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), 0, [], intent);
			} catch (error) {
				if (!this.#disposed && !this.#codeInvalidated && !this.#terminalHostFailed && this.#tree === acceptedTree) {
					this.#pendingResourceRetry ||= retryResource;
					for (const owner of retryBoundaries) {
						const cache = this.#componentCache.get(owner);
						if (cache?.nativeBoundary && cache.pendingResource) this.#pendingBoundaryRetries.add(owner);
					}
					scheduleRestoredWork = !this.#pendingDirectIntent;
				}
				throw error;
			} finally {
				this.#scopedFlushActive = false;
				const shouldSchedule = scheduleRestoredWork || this.#deferredFlush && this.#hasPendingWork();
				this.#deferredFlush = false;
				if (shouldSchedule) this.#schedule();
				reportFlush();
			}
		}
		const storeGenerationAtStart = this.#storeNotificationGeneration;
		const asyncWorkPending = this.#liveResourceSubscriptions.size > 0 || this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0;
		const canTryClosedStores = this.#liveResourceSubscriptions.size > 0 && (this.#publicationIntents.size > 0 || !this.#pendingResourceRetry && this.#pendingBoundaryRetries.size === 0) && !this.#unheldCellChanges() && !this.#unheldCollectionChanges() && storeGenerationAtStart !== this.#committedStoreNotificationGeneration && (this.#publicationIntents.size === 0 || this.#partialStoreAttemptGeneration !== storeGenerationAtStart);
		if (canTryClosedStores && this.#publicationIntents.size > 0) this.#partialStoreAttemptGeneration = storeGenerationAtStart;
		if (canTryClosedStores && this.#tryFlushClosedStores()) {
			const fresh = this.#storeNotificationGeneration !== storeGenerationAtStart || this.#publicationIntents.size === 0 && (this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0);
			this.#deferredFlush = false;
			if (fresh || this.#hasPendingWork()) this.#schedule();
			reportFlush();
			return true;
		}
		const urgentPublished = (asyncWorkPending || this.#publicationIntents.size > 0) && this.#pendingChanges.size > 0 && !this.#unheldCollectionChanges() && this.#tryFlushUrgentRetainedCut();
		if (this.#disposed || this.#terminalHostFailed || this.#codeInvalidated) {
			reportFlush();
			return urgentPublished;
		}
		const resourceRetry = this.#pendingResourceRetry;
		this.#pendingResourceRetry = false;
		if (resourceRetry && this.#publicationIntents.size > 0) this.#pendingResourceRetry = true;
		const boundaryRetries = [...this.#pendingBoundaryRetries];
		const capturedBoundaryOwners = new Set(boundaryRetries);
		this.#pendingBoundaryRetries.clear();
		const canDrainBoundaries = !this.#unheldCellChanges() && !this.#unheldCollectionChanges();
		const acceptedTree = this.#tree;
		let boundaryPublished = false;
		let boundaryFallback = false;
		let boundaryAborted = false;
		if (canDrainBoundaries && boundaryRetries.length > 0) {
			const drained = this.#drainBoundaryRetries(boundaryRetries, acceptedTree);
			boundaryPublished = drained.published;
			boundaryFallback = drained.fallback;
			boundaryAborted = drained.aborted;
		} else if (boundaryRetries.length > 0) {
			boundaryFallback = true;
			for (const owner of boundaryRetries) this.#pendingBoundaryRetries.add(owner);
		}
		if (boundaryAborted) {
			this.#deferredFlush = false;
			reportFlush();
			return boundaryPublished || urgentPublished;
		}
		const retryWholeTree = resourceRetry && this.#publicationIntents.size === 0 || boundaryFallback;
		if ((boundaryPublished || urgentPublished) && !retryWholeTree) {
			this.#deferredFlush = false;
			if (urgentPublished) {
				if (this.#hasPendingWork()) this.#schedule();
			} else if (this.#hasPendingWork()) this.#schedule();
			reportFlush();
			return true;
		}
		if (boundaryPublished || urgentPublished) this.#deferredFlush = false;
		if (this.#publicationIntents.size > 0 && (this.#pendingDirectIntent || this.#pendingChanges.size > 0 || this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration) && (this.#pendingChanges.size > 0 || canTryClosedStores || this.#partialStoreAttemptGeneration !== this.#storeNotificationGeneration)) {
			const intent = this.#pendingDirectIntent;
			this.#partialStoreAttemptGeneration = this.#storeNotificationGeneration;
			this.#scopedFlushActive = true;
			let published = false;
			try {
				published = this.#renderAndCommit(intent?.tree ?? this.#tree, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), 0, [], intent);
			} finally {
				this.#scopedFlushActive = false;
			}
			const deferred = this.#deferredFlush;
			this.#deferredFlush = false;
			if (deferred && this.#hasPendingWork()) this.#schedule();
			if (published) {
				reportFlush();
				return true;
			}
		}
		if (this.#publicationIntents.size > 0 && (this.#pendingDirectIntent || this.#pendingChanges.size > 0 || this.#pendingCollectionRegionKeys.size > 0 || this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration)) {
			reportFlush();
			return boundaryPublished || urgentPublished;
		}
		const runGenericRetry = () => {
			const unprocessed = [...this.#pendingBoundaryRetries].filter((owner) => capturedBoundaryOwners.has(owner));
			for (const owner of unprocessed) this.#pendingBoundaryRetries.delete(owner);
			let published = false;
			this.#deferredFlush = false;
			this.#scopedFlushActive = true;
			try {
				published = this.#renderAndCommit(this.#tree, true);
			} catch (error) {
				if (!this.#disposed) {
					for (const owner of unprocessed) {
						const cache = this.#componentCache.get(owner);
						if (cache?.nativeBoundary && cache.pendingResource) this.#pendingBoundaryRetries.add(owner);
					}
					if (!this.#terminalHostFailed) this.#pendingResourceRetry = true;
				}
				throw error;
			} finally {
				this.#scopedFlushActive = false;
			}
			if (!published && !this.#disposed) for (const owner of unprocessed) {
				const cache = this.#componentCache.get(owner);
				if (cache?.nativeBoundary && cache.pendingResource) this.#pendingBoundaryRetries.add(owner);
			}
			const deferred = this.#deferredFlush;
			this.#deferredFlush = false;
			if (published && deferred || this.#pendingChanges.size === 0 && this.#pendingCollectionRegionKeys.size === 0 && [...this.#pendingBoundaryRetries].some((owner) => !capturedBoundaryOwners.has(owner))) this.#schedule();
			return published;
		};
		const storeGeneration = this.#storeNotificationGeneration;
		const storeChangePending = storeGeneration !== this.#committedStoreNotificationGeneration;
		if (this.#pendingChanges.size === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0 && !retryWholeTree) return false;
		if (retryWholeTree && this.#pendingChanges.size === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0) {
			runGenericRetry();
			reportFlush();
			return true;
		}
		this.#activeCounters = this.#profileCounter ? /* @__PURE__ */ new Map() : void 0;
		if (!retryWholeTree && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0 && this.#pendingChanges.size > 0 && this.#tryFlushNativeCellCut()) {
			reportFlush();
			return true;
		}
		const capturedChanges = this.#pendingChanges.capture();
		if (retryWholeTree) {
			runGenericRetry();
			reportFlush();
			return true;
		}
		if (this.#pendingCollectionRegionKeys.size > 0 && (capturedChanges.length > 0 || storeChangePending)) {
			const mixed = this.#prepareMixedCollectionCandidate(capturedChanges, {
				storeGeneration,
				transitions: []
			});
			if (mixed) {
				if (mixed.validate()) {
					mixed.commitHost();
					mixed.publish();
					mixed.runEffects();
					reportFlush();
					return true;
				}
				mixed.discard();
				this.#count("collection.mixed.stale-fallbacks");
			}
		}
		if (capturedChanges.length === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size > 0) {
			if (this.#flushCollectionDelta()) {
				reportFlush();
				return true;
			}
			this.#profile?.("collection.delta.fallback-candidate", 0);
		}
		if (capturedChanges.length === 0 && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0) return false;
		const dirtyOwners = new Set(capturedChanges.map((change) => change.owner));
		if (this.#invalidation) {
			const graphMappedOwners = [];
			for (const change of capturedChanges) {
				const sourceSlot = this.#invalidation.sourceSlots.get(change.site);
				if (sourceSlot === void 0) continue;
				this.#invalidation.dispatcher.invalidateSourceSlot(sourceSlot);
				graphMappedOwners.push(change.owner);
			}
			const affectedComponentSites = /* @__PURE__ */ new Set();
			this.#invalidation.dispatcher.flush((region) => affectedComponentSites.add(this.#invalidation.componentSites[region]));
			for (const owner of graphMappedOwners) {
				const cache = this.#componentCache.get(owner);
				if (cache && !affectedComponentSites.has(getComponentSiteId(cache.type))) dirtyOwners.delete(owner);
			}
		}
		const directOnlyOwners = /* @__PURE__ */ new Set();
		const ownerEligibility = /* @__PURE__ */ new Map();
		for (const change of capturedChanges) {
			const cache = this.#componentCache.get(change.owner);
			const approvedSites = cache ? this.#compiledPropSitesForCache(change.owner, cache) : void 0;
			const source = this.world.scalarSourceForChange(change);
			const approved = !!cache && !!approvedSites?.has(change.site) && !!source && this.#lastSourceValues.has(source);
			ownerEligibility.set(change.owner, (ownerEligibility.get(change.owner) ?? true) && approved);
		}
		for (const [owner, eligible] of ownerEligibility) if (eligible) {
			directOnlyOwners.add(owner);
			dirtyOwners.add(owner);
		}
		const initialDirtyOwnerIds = [...dirtyOwners];
		this.#profile?.(`dispatch.diagnostic.dirty-owner-count.${initialDirtyOwnerIds.length}`, 0);
		this.#profile?.(`dispatch.diagnostic.change-count.${capturedChanges.length}`, 0);
		if (initialDirtyOwnerIds.length !== 1) this.#profile?.("dispatch.structural-gate.owner-count-not-one", 0);
		else if (capturedChanges.length !== 1) this.#profile?.("dispatch.structural-gate.change-count-not-one", 0);
		const numericOnly = capturedChanges.length > 0 && directOnlyOwners.size === dirtyOwners.size;
		let succeeded = false;
		if (numericOnly && !storeChangePending && this.#pendingCollectionRegionKeys.size === 0) succeeded = this.#flushNumericSources(capturedChanges);
		if (succeeded) {
			reportFlush();
			return true;
		}
		const storeReaderOwners = /* @__PURE__ */ new Set();
		let hasSuspendedStoreReader = false;
		let missingStoreReaderOwner = false;
		for (const readerId of this.#liveStoreReaders.keys()) {
			this.#count("store.sparse.live-reader-selection-visits");
			if (readerId.startsWith("\0suspense-pending:")) {
				hasSuspendedStoreReader = true;
				continue;
			}
			const separator = readerId.indexOf("\0");
			if (separator <= 0) {
				hasSuspendedStoreReader = true;
				continue;
			}
			const owner = Number(readerId.slice(0, separator));
			if (!Number.isSafeInteger(owner)) {
				hasSuspendedStoreReader = true;
				continue;
			}
			storeReaderOwners.add(owner);
			if (!this.#componentCache.has(owner)) missingStoreReaderOwner = true;
		}
		const collectionParentOwners = /* @__PURE__ */ new Set();
		let missingCollectionParent = false;
		for (const regionKey of this.#pendingCollectionRegionKeys) {
			const region = this.#liveCollectionRegions.get(regionKey);
			if (!region || !this.#componentCache.has(region.parentOwner)) {
				missingCollectionParent = true;
				continue;
			}
			collectionParentOwners.add(region.parentOwner);
			dirtyOwners.add(region.parentOwner);
		}
		for (const owner of storeReaderOwners) dirtyOwners.add(owner);
		this.#count("store.reader-owners-selected", storeReaderOwners.size);
		this.#count("collection.parent-owners-selected", collectionParentOwners.size);
		if (this.#everReadResource || this.#everHadNativeBoundary || hasSuspendedStoreReader || missingCollectionParent || missingStoreReaderOwner) {
			this.#renderAndCommit(this.#tree, true);
			reportFlush();
			return true;
		}
		const sparseChangesAreSafe = capturedChanges.every((change) => storeReaderOwners.has(change.owner) || directOnlyOwners.has(change.owner));
		const sparseReaderStateChange = capturedChanges.some((change) => storeReaderOwners.has(change.owner) && !directOnlyOwners.has(change.owner));
		if ((storeChangePending || sparseReaderStateChange) && sparseChangesAreSafe && this.#pendingCollectionRegionKeys.size === 0) {
			const sparseCandidate = this.#prepareSparseStoreCandidate(storeReaderOwners, capturedChanges, directOnlyOwners, storeGeneration);
			if (sparseCandidate) {
				if (sparseCandidate.validate()) {
					sparseCandidate.commitHost();
					sparseCandidate.publish();
					sparseCandidate.runEffects();
					this.#finishChanges(capturedChanges);
					reportFlush();
					return true;
				}
				sparseCandidate.discard();
				this.#count("store.sparse.stale-fallbacks");
			}
			this.#count("store.sparse.generic-fallbacks");
			if (this.#everReadResource || this.#everHadNativeBoundary) {
				this.#renderAndCommit(this.#tree, true);
				reportFlush();
				return true;
			}
		}
		const relevantOwners = /* @__PURE__ */ new Set();
		const addRelevantLineage = (owners) => {
			for (const owner of owners) for (const ancestor of this.world.ownerLineage(owner)) relevantOwners.add(ancestor);
		};
		addRelevantLineage(dirtyOwners);
		if (directOnlyOwners.size > 0) {
			for (const owner of directOnlyOwners) if (!storeReaderOwners.has(owner) && !collectionParentOwners.has(owner)) dirtyOwners.delete(owner);
			relevantOwners.clear();
			addRelevantLineage(dirtyOwners);
		}
		const dirtyOwnerIds = [...dirtyOwners];
		const hasSelectiveOwnerCandidate = collectionParentOwners.size > 0 || this.#liveStoreSubscriptions.size > 0 || storeChangePending;
		if (!hasSelectiveOwnerCandidate && dirtyOwnerIds.length === 1 && capturedChanges.length === 1 ? this.#tryPartialOwnerCommit(dirtyOwnerIds[0]) : !hasSelectiveOwnerCandidate && dirtyOwnerIds.length > 0 && directOnlyOwners.size === 0 ? this.#tryPartialOwnerCommits(dirtyOwnerIds) : false) {
			this.#profile?.("dispatch.path.partial-owner", 0);
			this.#finishChanges(capturedChanges);
			reportFlush();
			return true;
		}
		if (!hasSelectiveOwnerCandidate && dirtyOwnerIds.length === 1 && capturedChanges.length === 1 && directOnlyOwners.size === 0 ? this.#tryStructuralOwnerCommit(dirtyOwnerIds[0]) : false) {
			this.#profile?.("dispatch.path.structural-owner", 0);
			this.#finishChanges(capturedChanges);
			reportFlush();
			return true;
		}
		this.#profile?.("dispatch.path.full-reconcile", 0);
		try {
			this.#renderAndCommit(this.#tree, false, dirtyOwners, relevantOwners, 0, directOnlyOwners.size > 0 ? capturedChanges.filter((change) => directOnlyOwners.has(change.owner)) : []);
		} finally {
			this.#preparedRenders.clear();
		}
		reportFlush();
		return true;
	}
	/** Replace the declarative tree while preserving component owners by site/key. */
	update(tree) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("update");
		const previous = this.#pendingDirectIntent;
		const intent = {
			tree,
			releaseStoreLease: previous?.releaseStoreLease ?? null,
			attemptedStoreGeneration: null
		};
		if (previous) {
			previous.releaseStoreLease = null;
			previous.tree = null;
		}
		this.#pendingDirectIntent = intent;
		this.#renderAndCommit(tree, true, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), 0, [], intent);
	}
	render(tree) {
		this.update(tree);
	}
	dispose() {
		if (this.#disposed) return;
		if (this.#publicationBarrier || this.#nativeCellCutActive || this.#directPublicationPending || this.#hostApplicationDepth > 0) {
			this.#disposeRequested = true;
			this.#vdom.cancelPendingRefAttachments();
			return;
		}
		this.#disposing = true;
		const disposeErrors = [];
		for (const candidate of [...this.#preparedCandidates.keys()]) try {
			candidate.failGroup(/* @__PURE__ */ new Error("Component root disposed during candidate preparation"));
		} catch (error) {
			disposeErrors.push(error);
		}
		this.#disposed = true;
		this.#disposing = false;
		this.#deferredFlush = false;
		disposeErrors.push(...collectCleanupErrors([...this.#retireListeners]));
		this.#retireListeners.clear();
		disposeErrors.push(...collectCleanupErrors([...this.#publicationIntents.keys()]));
		try {
			this.#dropPendingDirectIntent();
		} catch (error) {
			disposeErrors.push(error);
		}
		for (const listener of this.#disposeListeners) try {
			listener();
		} catch (error) {
			disposeErrors.push(error);
		}
		this.#disposeListeners.clear();
		this.#unsubscribe();
		this.#unsubscribeRevision();
		this.#scheduled = false;
		this.#pendingChanges.clear();
		this.#lastSourceValues.clear();
		this.#nativeLanePrograms = /* @__PURE__ */ new WeakMap();
		this.#nativeRowPrograms = /* @__PURE__ */ new WeakMap();
		if (!this.#nativeCellCutActive) {
			this.#clearNumericProgramBuffers();
			this.#numericProgramSources.length = 0;
			this.#numericProgramCurrentValues.length = 0;
			this.#numericProgramPreviousValues.length = 0;
		}
		if (!this.#nativeCellCutActive) {
			this.#clearNativeRowBuffers();
			this.#clearNativeCellCutBuffers();
			this.#nativeCellHandles.length = 0;
			this.#nativeCellVersions.length = 0;
			this.#nativeLaneTokens.length = 0;
		}
		try {
			this.#vdom.dispose();
		} catch (error) {
			disposeErrors.push(error);
		}
		const subscribedStores = [...this.#liveStoreSubscriptions.keys()];
		for (const unsubscribe of this.#liveStoreSubscriptions.values()) unsubscribe();
		this.#liveStoreSubscriptions.clear();
		for (const stores of this.#storeDependencyLeases.values()) stores.clear();
		this.#storeDependencyLeases.clear();
		for (const subscription of this.#liveResourceSubscriptions.values()) subscription.unsubscribe();
		this.#liveResourceSubscriptions.clear();
		this.#pendingBoundaryRetries.clear();
		this.#boundaryPrimaries.clear();
		for (const [readerId, stores] of this.#liveStoreReaders) for (const store of stores) store.forgetReader(this.#rootId, readerId);
		this.#liveStoreReaders.clear();
		for (const store of subscribedStores) store.detachRoot(this.#rootId);
		const effectErrors = [...disposeErrors, ...this.#cleanupEffects(this.#liveEffects.values())];
		this.#liveEffects.clear();
		this.#liveEffectKeysByOwner.clear();
		for (const owner of this.#liveOwners) this.world.destroyOwner(owner);
		this.#liveOwners.clear();
		this.#componentCache.clear();
		for (const region of this.#liveCollectionRegions.values()) {
			region.unsubscribe?.();
			region.reader?.detach();
		}
		this.#liveCollectionRegions.clear();
		this.#pendingCollectionRegionKeys.clear();
		this.#collectionSnapshotFallbackKeys.clear();
		this.world.destroyOwner(this.#rootOwner);
		this.world.releaseRootId(this.#rootId, this.#rootOwner);
		if (effectErrors.length) throw new AggregateError(effectErrors, "Component effect cleanup failed during dispose");
	}
	#drainBoundaryRetries(targets, acceptedTree) {
		let published = false;
		let fallback = false;
		let aborted = false;
		let next = 0;
		this.#scopedFlushActive = true;
		try {
			while (next < targets.length) {
				if (this.#disposed || this.#disposeRequested || this.#codeInvalidated || this.#terminalHostFailed || this.#tree !== acceptedTree) {
					aborted = true;
					break;
				}
				if (this.#unheldCellChanges() || this.#unheldCollectionChanges()) {
					fallback = true;
					break;
				}
				const heldResource = this.#componentCache.get(targets[next])?.pendingResource;
				const heldCache = this.#componentCache.get(targets[next]);
				const heldChild = heldCache && Object.getOwnPropertyDescriptor(heldCache.props, "children")?.value;
				const heldStores = /* @__PURE__ */ new Set();
				const heldDependencies = this.#boundaryResourceDependencies(heldChild, heldStores);
				if (heldResource && this.#resourceHoldWait(/* @__PURE__ */ new Set([heldResource])) || heldDependencies && this.#resourceHoldWait(heldDependencies, void 0, { stores: [...heldStores] })) {
					this.#pendingBoundaryRetries.add(targets[next]);
					next++;
					continue;
				}
				const reveal = this.#prepareBoundaryReveal(targets[next]);
				if (!reveal) {
					fallback = true;
					this.#pendingBoundaryRetries.add(targets[next]);
					next++;
					continue;
				}
				try {
					if (!reveal.validate()) {
						reveal.discard();
						fallback = true;
						this.#pendingBoundaryRetries.add(targets[next]);
						next++;
						continue;
					}
					reveal.commitHost();
					reveal.publish();
					published = true;
					next++;
					reveal.runEffects();
				} catch (error) {
					return throwWithCleanup(error, collectCleanupErrors([() => reveal.discard()]));
				}
			}
		} catch (error) {
			if (!this.#disposed && !this.#terminalHostFailed) this.#pendingResourceRetry = true;
			throw error;
		} finally {
			for (; next < targets.length; next++) {
				const owner = targets[next];
				const cache = this.#componentCache.get(owner);
				if (cache?.nativeBoundary && cache.pendingResource) this.#pendingBoundaryRetries.add(owner);
			}
			this.#scopedFlushActive = false;
		}
		if (this.#disposed || this.#disposeRequested || this.#codeInvalidated || this.#terminalHostFailed || this.#tree !== acceptedTree) aborted = true;
		return {
			published,
			fallback,
			aborted
		};
	}
	#tryFlushUrgentRetainedCut() {
		const count = this.#pendingChanges.size;
		if (count === 0 || this.#unheldCollectionChanges()) return false;
		const handles = Array(count);
		const versions = Array(count);
		if (this.#pendingChanges.captureNative(handles, versions) !== count) return false;
		const complete = [];
		for (let index = 0; index < count; index++) {
			const handle = handles[index];
			if (!handle || this.world.versionForCell(handle) !== versions[index]) return false;
			const source = this.world.scalarSourceForCell(handle);
			if (!source || !this.#lastSourceValues.has(source)) return false;
			if (!this.#heldCell(handle)) complete.push(handle);
		}
		if (!complete.length) return false;
		const candidate = this.prepareRetained(complete);
		if (!candidate) return false;
		this.#scopedFlushActive = true;
		try {
			if (!candidate.validate()) {
				candidate.discard();
				return false;
			}
			candidate.commitHost();
			candidate.publish();
			candidate.runEffects();
			return true;
		} catch (error) {
			return throwWithCleanup(error, collectCleanupErrors([() => candidate.discard()]));
		} finally {
			this.#scopedFlushActive = false;
		}
	}
	#tryFlushClosedStores() {
		const acceptedTree = this.#tree;
		let published = false;
		this.#scopedFlushActive = true;
		try {
			const selected = [...this.#liveStoreSubscriptions.keys()].filter((store) => !this.#heldStore(store));
			const capturedGeneration = this.#storeNotificationGeneration;
			const complete = selected.length ? this.#prepareClosedStoreCandidate(selected, false) : null;
			if (complete) try {
				if (complete.validate()) {
					complete.commitHost();
					complete.publish();
					if (this.#liveStoreSubscriptions.size === selected.length && selected.every((store) => this.#liveStoreSubscriptions.has(store))) this.#committedStoreNotificationGeneration = capturedGeneration;
					complete.runEffects();
					return true;
				}
				complete.discard();
			} catch (error) {
				return throwWithCleanup(error, collectCleanupErrors([() => complete.discard()]));
			}
			for (const store of [...this.#liveStoreSubscriptions.keys()]) {
				if (this.#heldStore(store)) continue;
				if (this.#disposed || this.#disposeRequested || this.#terminalHostFailed || this.#codeInvalidated || this.#tree !== acceptedTree) break;
				const candidate = this.#prepareClosedStoreCandidate([store], true);
				if (!candidate) continue;
				try {
					if (!candidate.validate()) {
						candidate.discard();
						continue;
					}
					candidate.commitHost();
					candidate.publish();
					published = true;
					candidate.runEffects();
				} catch (error) {
					return throwWithCleanup(error, collectCleanupErrors([() => candidate.discard()]));
				}
			}
		} finally {
			this.#scopedFlushActive = false;
		}
		return published;
	}
	#prepareBoundaryReveal(boundaryOwner, resourceLease) {
		return this.#prepareResourceReveals([boundaryOwner], resourceLease);
	}
	#prepareResourceReveals(boundaryOwners, resourceLease, cells = [], selectedStores = [], acceptedCollections = [], acceptedResources = /* @__PURE__ */ new Set(), acceptedCollectionFootprint = []) {
		this.#assertActive();
		this.#assertNoPublicationBarrier("prepare resource reveals");
		if (!boundaryOwners.length || new Set(boundaryOwners).size !== boundaryOwners.length || this.#terminalHostFailed || this.#codeInvalidated) return null;
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId);
		let reads = new ResourceReadSet(this.#resourceTable);
		let program = null;
		let closed = null;
		const stages = [];
		let writes = [];
		let sources = /* @__PURE__ */ new Set();
		try {
			const captured = this.#captureRetainedCells(cells);
			if (!captured) throw new SparseCandidateIneligible();
			writes = captured.writes;
			sources = captured.sources;
			for (const owner of boundaryOwners) {
				const stage = this.#stageBoundaryReveal(owner, preparation, stores, reads, resourceLease);
				if (!stage) throw new SparseCandidateIneligible();
				stages.push(stage);
			}
			if (selectedStores.length) {
				const newlyStaged = new Set(stages.flatMap((stage) => [...stage.storeInputs]));
				const pendingReaderIds = new Set(stages.flatMap((stage) => [...stage.pendingReaderIds]));
				closed = this.#stageClosedStoreOutputs(selectedStores, stores, false, newlyStaged, pendingReaderIds, resourceLease);
			}
			program = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas([], writes.map(({ source, value }) => [source, value]), closed?.regions ?? [], stages.map(({ region }) => region));
			if (!program || program.readSources.some((source) => !sources.has(source))) throw new SparseCandidateIneligible();
			if (!preparation.validate() || !stores.validate() || !reads.validate() || !stages.every((stage) => stage.current())) throw new SparseCandidateIneligible();
		} catch (error) {
			const cleanup = collectCleanupErrors([
				() => program?.discard(),
				() => preparation.discard(),
				() => stores.discard(),
				() => reads?.discard(),
				() => closed?.release(),
				...stages.map((stage) => () => stage.release())
			]);
			if (error instanceof HeldPublicationWait && !cleanup.length) return this.#prepareBlockedPublication([error.resource]);
			if (error instanceof SparseCandidateIneligible && !cleanup.length) return null;
			return throwWithCleanup(error, cleanup);
		}
		const handles = writes.map(({ handle }) => handle);
		const versions = writes.map(({ version }) => version);
		const stageCurrent = () => stages.every((stage) => stage.current()) && acceptedCollections.every((validate) => validate()) && (closed?.current() ?? true) && writes.every(({ handle }) => {
			const cache = this.#componentCache.get(handle.owner);
			return cache !== void 0 && componentCodeCurrent(cache.type);
		});
		return this.#createCandidateLifecycle({
			baseVersion,
			baseVDOMVersion,
			scope: {
				kind: "keyed",
				versionDelta: 1
			},
			stores,
			transitions: [],
			pendingResources: [],
			blocked: false,
			permitPendingDirectIntent: () => resourceLease !== void 0 && this.#publicationIntents.has(resourceLease),
			admissionCurrent: () => (!resourceLease || this.#publicationIntents.has(resourceLease)) && !this.#resourceHoldWait(/* @__PURE__ */ new Set([...acceptedResources, ...stages.flatMap((stage) => [...stage.dependencies])]), resourceLease, {
				cells: handles,
				stores: [
					...selectedStores,
					...stages.flatMap((stage) => [...stage.storeInputs]),
					...closed?.inputStores ?? []
				],
				collections: acceptedCollectionFootprint
			}) && !this.#resourceHoldWait(new Set(closed?.inputResources ?? []), resourceLease) && (!resourceLease || this.#publicationIntents.has(resourceLease)),
			codeCurrent: stageCurrent,
			validatePrepared: () => preparation.validate() && !preparation.hasStateWrites() && stores.validate() && (reads?.validate() ?? false) && (program?.validate() ?? false) && this.#validateRetainedCells(writes, false) && stageCurrent(),
			validatePostHost: () => preparation.validatePublicationInputs() && !preparation.hasStateWrites() && stores.validatePublicationInputs() && (reads?.validate() ?? false) && (program?.validatePostHost() ?? false) && this.#validateRetainedCells(writes, true) && stageCurrent(),
			finalGroupCurrent: () => preparation.validatePublicationInputs() && !preparation.hasStateWrites() && stores.validatePublicationInputsCanonical() && (reads?.validateCanonical() ?? false) && (program?.validatePostHostPrivate() ?? false) && this.#validateRetainedCells(writes, true) && stages.every((stage) => stage.privateCurrent()) && writes.every(({ handle }) => {
				const cache = this.#componentCache.get(handle.owner);
				return cache !== void 0 && componentCodeCurrentPrivate(cache.type);
			}),
			commitHost: () => {
				preparation.beginHostApplication();
				program.commit();
			},
			preparePublication: () => {
				preparation.preparePublicationAfterHost();
				stores.preparePublicationAfterHost();
			},
			publish: () => {
				preparation.publishAccepted();
				stores.publishAccepted();
				for (const stage of stages) stage.publish();
				closed?.publish();
				for (const write of writes) this.#lastSourceValues.set(write.source, write.value);
				this.world.clearCellChangesThrough(handles, versions, handles.length);
				this.#pendingChanges.clearNativeThrough(handles, versions, handles.length);
				reads?.discard();
				reads = null;
				this.#publicationVersion++;
			},
			installSubscriptions: () => {
				for (const stage of stages) stage.installSubscriptions();
				if (stores.closedInputsChanged()) {
					this.#storeNotificationGeneration++;
					this.#schedule();
				}
				return [];
			},
			runEffects: () => {
				const errors = [];
				try {
					preparation.notifyPublished();
				} catch (error) {
					errors.push(error);
				}
				try {
					stores.notifyPublished();
				} catch (error) {
					errors.push(error);
				}
				try {
					this.#vdom.flushRefs();
				} catch (error) {
					errors.push(error);
				}
				for (const stage of stages) errors.push(...stage.runEffects());
				return errors;
			},
			discard: () => {
				program?.discard();
				preparation.discard();
				stores.discard();
				reads?.discard();
				reads = null;
			},
			releaseArtifacts: () => {
				program?.discard();
				program = null;
				closed?.release();
				closed = null;
				for (const stage of stages) stage.release();
				stages.length = 0;
				writes.length = 0;
				sources.clear();
				handles.length = 0;
				versions.length = 0;
				reads?.discard();
				reads = null;
			},
			effectFailureMessage: "Resource reveal effects failed"
		});
	}
	#stageBoundaryReveal(boundaryOwner, preparation, stores, reads, resourceLease) {
		const boundaryCache = this.#componentCache.get(boundaryOwner);
		if (!boundaryCache?.nativeBoundary || !boundaryCache.pendingResource || !this.#liveOwners.has(boundaryOwner) || !this.world.isAlive(boundaryOwner) || this.#boundaryPrimaries.has(String(boundaryOwner))) return null;
		const ancestorControlsCurrent = this.#captureBoundaryAncestorControlsCurrent(boundaryOwner);
		if (!ancestorControlsCurrent) return null;
		const resource = boundaryCache.pendingResource;
		if (this.#resourceHoldWait(/* @__PURE__ */ new Set([resource]), resourceLease)) return null;
		if (closedResourceStatus(resource)?.status !== "fulfilled") return null;
		const child = Object.getOwnPropertyDescriptor(boundaryCache.props, "children")?.value;
		if (!isRuntimeOwnedElement(child)) return null;
		const dependencyStores = /* @__PURE__ */ new Set();
		const dependencies = this.#boundaryResourceDependencies(child, dependencyStores);
		if (!dependencies || this.#resourceHoldWait(dependencies, resourceLease, { stores: [...dependencyStores] })) return null;
		const steps = [];
		const visited = /* @__PURE__ */ new Set();
		let projected = child;
		for (;;) {
			const type = Object.getOwnPropertyDescriptor(projected, "type")?.value;
			const props = Object.getOwnPropertyDescriptor(projected, "props")?.value;
			if (typeof type !== "function" || !definedComponents.has(type) || visited.has(type) || !props || typeof props !== "object" || !Object.isFrozen(props)) return null;
			visited.add(type);
			const siteId = definedComponents.get(type)?.siteId;
			const revision = componentRevision(type);
			if (!siteId || !revision || !isCompiledSemanticRevisionCurrent(revision)) return null;
			if (steps.length && (revision.sourceFile !== steps[0].revision.sourceFile || revision.moduleRevision !== steps[0].revision.moduleRevision)) return null;
			const descriptors = Object.getOwnPropertyDescriptors(props);
			if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") || Object.values(descriptors).some((descriptor) => !("value" in descriptor)) || descriptors.ref?.value != null) return null;
			const authoredKey = descriptors.key?.value;
			if (authoredKey != null && typeof authoredKey !== "string") return null;
			const ownerKey = authoredKey ?? `@slot:${siteId}:0`;
			const hostKeyScope = steps.length ? ownerKey : `${boundaryOwner}\u0000${ownerKey}`;
			const forward = closedComponentForwardProgramFor(type);
			steps.push({
				node: projected,
				type,
				props,
				descriptors,
				siteId,
				ownerKey,
				hostKeyScope,
				revision,
				...forward ? { forward } : {}
			});
			if (!forward) break;
			if (steps.length > 8 || forward.childComponent === type || definedComponents.get(forward.childComponent)?.siteId !== forward.childComponentProgramId || !componentCodeCurrent(forward.childComponent)) return null;
			const nextRevision = componentRevision(forward.childComponent);
			if (!nextRevision || nextRevision.sourceFile !== revision.sourceFile || nextRevision.moduleRevision !== revision.moduleRevision) return null;
			const nextProps = {};
			for (const [name, expression] of forward.props) if (expression.kind === "prop") {
				const source = descriptors[expression.name];
				if (!source || !("value" in source)) return null;
				nextProps[name] = source.value;
			} else nextProps[name] = expression.value;
			nextProps.key = forward.key ?? `${hostKeyScope}:0`;
			projected = Object.freeze({
				type: forward.childComponent,
				props: Object.freeze(nextProps)
			});
		}
		const leaf = steps.at(-1);
		const childType = leaf.type;
		const childProps = leaf.props;
		const descriptors = leaf.descriptors;
		const legacyResourceProgram = closedResourceHostProgramFor(childType);
		const resourceProgram = (legacyResourceProgram ? descriptors[legacyResourceProgram.resourceProp]?.value : void 0) === resource ? legacyResourceProgram : void 0;
		const storeProgram = closedStoreHostProgramFor(childType);
		if (!resourceProgram && !storeProgram) return null;
		const hostKey = (resourceProgram ?? storeProgram).host.key;
		const source = resourceProgram ? descriptors[resourceProgram.resourceProp]?.value : void 0;
		if (resourceProgram && source !== resource) return null;
		const first = steps[0];
		if (this.world.findOwner(boundaryOwner, first.siteId, first.ownerKey) !== void 0) return null;
		const oldOutput = boundaryCache.expandedResult;
		if (!isRuntimeOwnedElement(oldOutput) || typeof Object.getOwnPropertyDescriptor(oldOutput, "type")?.value !== "string") return null;
		const oldOutputProps = Object.getOwnPropertyDescriptor(oldOutput, "props")?.value;
		if (!oldOutputProps || typeof oldOutputProps !== "object" || Object.getOwnPropertyDescriptor(oldOutputProps, "key")?.value !== hostKey) return null;
		if (!boundaryCache.subtreeOwners.has(boundaryOwner) || boundaryCache.ownEffects.size !== 0 || boundaryCache.propBoundSites.size !== 0) return null;
		const fallbackCaches = /* @__PURE__ */ new Map();
		for (const owner of boundaryCache.subtreeOwners) {
			if (owner === boundaryOwner) continue;
			const cache = this.#componentCache.get(owner);
			if (!cache || !this.#liveOwners.has(owner) || !this.world.isAlive(owner) || !this.world.isWithin(owner, boundaryOwner) || cache.nativeBoundary || cache.keyedRegion || cache.pendingResource || cache.propBoundSites.size || this.#ownerHasStoreReaders(owner)) return null;
			const revision = componentRevision(cache.type);
			if (revision && !isCompiledSemanticRevisionCurrent(revision)) return null;
			fallbackCaches.set(owner, {
				cache,
				revision
			});
		}
		const oldTag = Object.getOwnPropertyDescriptor(oldOutput, "type")?.value;
		const retired = [...fallbackCaches.keys()].sort((left, right) => this.world.ownerLineage(right).length - this.world.ownerLineage(left).length);
		const retiredEffects = [...this.#liveEffects].filter(([, effect]) => fallbackCaches.has(effect.owner));
		const pendingPrefix = `\u0000suspense-pending:${boundaryOwner}:`;
		const pendingReaders = /* @__PURE__ */ new Map();
		for (const [readerId, membership] of this.#liveStoreReaders) if (readerId.startsWith(pendingPrefix)) pendingReaders.set(readerId, membership);
		if (pendingReaders.size && resourceProgram) return null;
		if (pendingReaders.size && !storeProgram) return null;
		const acceptedReaders = /* @__PURE__ */ new Map();
		const storeInputs = /* @__PURE__ */ new Set();
		try {
			const preparedOwners = [];
			let parentOwner = boundaryOwner;
			for (const step of steps) {
				if (preparation.findOwner(parentOwner, step.siteId, step.ownerKey) !== void 0) throw new SparseCandidateIneligible();
				const owner = preparation.resolveOwner(parentOwner, step.siteId, step.ownerKey);
				preparedOwners.push(owner);
				parentOwner = owner;
			}
			const childOwner = preparedOwners.at(-1);
			let generated = null;
			if (!resourceProgram && storeProgram) {
				const values = [];
				const consumedPending = /* @__PURE__ */ new Set();
				for (const input of closedStoreHostInputs(storeProgram)) {
					const value = descriptors[input.storeProp]?.value;
					const paths = closedStoreHostInputPaths(input);
					const readerId = `${childOwner}\u0000${input.storeUseSiteId}`;
					if (value instanceof AsyncStore) {
						storeInputs.add(value);
						const captured = stores.readClosedProjections(value, readerId, paths);
						if (!captured) throw new SparseCandidateIneligible();
						values.push(...captured);
						acceptedReaders.set(readerId, /* @__PURE__ */ new Set([value]));
						for (const [pendingId, membership] of pendingReaders) {
							if (!pendingId.slice(pendingPrefix.length).endsWith(`\u0000${input.storeUseSiteId}`)) continue;
							if (membership.size !== 1 || !membership.has(value) || consumedPending.has(pendingId)) throw new SparseCandidateIneligible();
							consumedPending.add(pendingId);
						}
					} else if (value instanceof AsyncResource) {
						if (pendingReaders.size && [...pendingReaders.keys()].some((id) => id.endsWith(`\u0000${input.storeUseSiteId}`))) throw new SparseCandidateIneligible();
						const status = reads.readClosed(value);
						const captured = status ? captureClosedProjectionValues(status.value, paths) : null;
						if (!captured) throw new SparseCandidateIneligible();
						values.push(...captured);
					} else throw new SparseCandidateIneligible();
				}
				if (consumedPending.size !== pendingReaders.size || !stores.retireClosedReaders(pendingReaders)) throw new SparseCandidateIneligible();
				generated = evaluateClosedStoreHostTree(storeProgram, values);
			} else if (resourceProgram) {
				const status = reads.readClosed(resource);
				generated = status && evaluateClosedResourceHostProgram(resourceProgram, status.value);
			}
			if (!generated) throw new SparseCandidateIneligible();
			const preparedCaches = /* @__PURE__ */ new Map();
			for (let index = 0; index < steps.length; index++) {
				const step = steps[index];
				const componentProps = {};
				for (const [name, descriptor] of Object.entries(step.descriptors)) if (name !== "key" && name !== "ref") componentProps[name] = descriptor.value;
				ownNumericOwnerProps(step.type, step.node, componentProps);
				preparedCaches.set(preparedOwners[index], {
					type: step.type,
					hostKeyScope: step.hostKeyScope,
					props: componentProps,
					numericPropsAdmitted: numericOwnerPropsAdmitted(step.type, componentProps, isRuntimeOwnedElement(step.node)),
					numericStateAdmitted: true,
					result: steps[index + 1]?.node ?? generated,
					expandedResult: generated,
					subtreeOwners: new Set(preparedOwners.slice(index)),
					ownEffects: /* @__PURE__ */ new Map(),
					propBoundSites: /* @__PURE__ */ new Set()
				});
			}
			const forwardingCodeCurrent = () => steps.every((step, index) => isCompiledSemanticRevisionCurrent(step.revision) && (step.forward === void 0 || closedComponentForwardProgramFor(step.type) === step.forward && definedComponents.get(step.forward.childComponent)?.siteId === step.forward.childComponentProgramId && step.forward.childComponent === steps[index + 1]?.type));
			const forwardingCurrent = () => steps.every((step) => {
				if (Object.getOwnPropertyDescriptor(step.node, "type")?.value !== step.type || Object.getOwnPropertyDescriptor(step.node, "props")?.value !== step.props) return false;
				const now = Object.getOwnPropertyDescriptors(step.props);
				const names = Reflect.ownKeys(now);
				return names.length === Reflect.ownKeys(step.descriptors).length && names.every((name) => {
					const original = step.descriptors[name];
					const actual = now[name];
					return original && actual && "value" in original && "value" in actual && Object.is(actual.value, original.value);
				});
			});
			const privateCurrent = () => ancestorControlsCurrent() && forwardingCodeCurrent() && closedResourceStatus(resource)?.status === "fulfilled" && !this.#codeInvalidated && this.#componentCache.get(boundaryOwner) === boundaryCache && this.#liveOwners.has(boundaryOwner) && this.world.isAlive(boundaryOwner) && [...fallbackCaches].every(([owner, { cache, revision }]) => this.#componentCache.get(owner) === cache && this.#liveOwners.has(owner) && this.world.isAlive(owner) && !this.#ownerHasStoreReaders(owner) && (!revision || isCompiledSemanticRevisionCurrent(revision))) && retiredEffects.every(([key, effect]) => this.#liveEffects.get(key) === effect) && !this.#boundaryPrimaries.has(String(boundaryOwner)) && boundaryCache.pendingResource === resource && this.world.findOwner(boundaryOwner, first.siteId, first.ownerKey) === void 0 && [...pendingReaders].every(([id, membership]) => this.#liveStoreReaders.get(id) === membership) && preparation.validatePublicationInputs();
			const current = () => Object.getOwnPropertyDescriptor(child, "type")?.value === steps[0].type && Object.getOwnPropertyDescriptor(child, "props")?.value === steps[0].props && forwardingCurrent() && Object.getOwnPropertyDescriptor(oldOutput, "type")?.value === oldTag && Object.getOwnPropertyDescriptor(oldOutput, "props")?.value === oldOutputProps && privateCurrent();
			const sourceCurrent = () => (resourceProgram ? Object.getOwnPropertyDescriptor(childProps, resourceProgram.resourceProp)?.value === source : true) && (!resourceProgram && storeProgram ? closedStoreHostInputs(storeProgram).every((input) => Object.getOwnPropertyDescriptor(childProps, input.storeProp)?.value === descriptors[input.storeProp]?.value) : true);
			return {
				region: {
					key: hostKey,
					tree: generated
				},
				resource,
				dependencies: /* @__PURE__ */ new Set([resource, ...dependencies]),
				storeInputs,
				pendingReaderIds: new Set(pendingReaders.keys()),
				stores,
				current: () => sourceCurrent() && current(),
				privateCurrent: () => sourceCurrent() && current(),
				publish: () => {
					for (const owner of retired) this.#retireOwnerAccepted(owner);
					for (const [key] of retiredEffects) this.#liveEffects.delete(key);
					for (const owner of retired) this.#liveEffectKeysByOwner.delete(owner);
					for (const [owner, cache] of preparedCaches) this.#componentCache.set(owner, cache);
					this.#componentCache.set(boundaryOwner, {
						...boundaryCache,
						expandedResult: generated,
						subtreeOwners: /* @__PURE__ */ new Set([boundaryOwner, ...preparedOwners]),
						pendingResource: void 0
					});
					for (const owner of preparedOwners) this.#liveOwners.add(owner);
					for (const readerId of pendingReaders.keys()) this.#liveStoreReaders.delete(readerId);
					for (const [readerId, membership] of acceptedReaders) this.#liveStoreReaders.set(readerId, membership);
					this.#boundaryPrimaries.set(String(boundaryOwner), { tree: child });
					this.#refreshDirectKeyedRegionOutput(boundaryOwner);
					for (const ancestor of this.world.ownerLineage(boundaryOwner).slice(1)) {
						const cache = this.#componentCache.get(ancestor);
						if (!cache) continue;
						const subtreeOwners = cache.subtreeOwners;
						for (const owner of preparedOwners) subtreeOwners.add(owner);
						this.#componentCache.set(ancestor, {
							...cache,
							result: null,
							expandedResult: null,
							subtreeOwners,
							invalidatedByCollection: true
						});
					}
				},
				installSubscriptions: () => {
					if (acceptedReaders.size) this.#reconcileStoreSubscriptions();
				},
				runEffects: () => this.#cleanupEffects(retiredEffects.map(([, effect]) => effect)),
				release: () => {
					preparedCaches.clear();
					preparedOwners.length = 0;
					steps.length = 0;
					fallbackCaches.clear();
					pendingReaders.clear();
					acceptedReaders.clear();
					retired.length = 0;
					retiredEffects.length = 0;
				}
			};
		} catch (error) {
			if (error instanceof SparseCandidateIneligible) return null;
			throw error;
		}
	}
	#renderAndCommit(tree, forceRender, dirtyOwners = /* @__PURE__ */ new Set(), relevantOwners = /* @__PURE__ */ new Set(), collectionRetry = 0, numericChanges = [], directIntent = null) {
		let candidate = null;
		const heldGenericState = this.#publicationIntents.size > 0 ? this.#captureHeldGenericState() : void 0;
		if (this.#publicationIntents.size > 0 && !heldGenericState) return false;
		const storeGenerationAtAttempt = this.#storeNotificationGeneration;
		const holdDirectFrontier = (current, intent) => {
			const nextLease = current.retainStoreDependencies();
			try {
				if (this.#pendingDirectIntent !== intent) {
					nextLease();
					return;
				}
				this.#syncResourceSubscriptions([...current.pendingResources]);
				if (this.#pendingDirectIntent !== intent) {
					nextLease();
					this.#pendingResourceRetry = true;
					this.#schedule();
					return;
				}
				const previousLease = intent.releaseStoreLease;
				intent.releaseStoreLease = nextLease;
				intent.attemptedStoreGeneration = storeGenerationAtAttempt;
				previousLease?.();
			} catch (error) {
				return throwWithCleanup(error, collectCleanupErrors([nextLease]));
			}
		};
		try {
			candidate = this.#prepareCandidate(tree, {}, forceRender, dirtyOwners, relevantOwners, numericChanges, heldGenericState ?? void 0);
			if (directIntent && this.#pendingDirectIntent !== directIntent) {
				candidate.discard();
				return false;
			}
			if (candidate.blocked) {
				if (directIntent) holdDirectFrontier(candidate, directIntent);
				else this.#syncResourceSubscriptions([...candidate.pendingResources]);
				candidate.discard();
				return false;
			}
			if (!candidate.validate()) {
				if (directIntent && this.#pendingDirectIntent !== directIntent) {
					candidate.discard();
					return false;
				}
				if (collectionRetry >= 2 && directIntent) {
					if (candidate.pendingResources.length === 0) throw new Error("Direct update stayed stale without a dependency wake");
					holdDirectFrontier(candidate, directIntent);
					if (this.#pendingDirectIntent === directIntent && this.#liveResourceSubscriptions.size === 0) throw new Error("Direct update stayed stale without a dependency wake");
				}
				candidate.discard();
				if (collectionRetry < 2) return this.#renderAndCommit(tree, forceRender, dirtyOwners, relevantOwners, collectionRetry + 1, numericChanges, directIntent);
				if (!directIntent) this.#schedule();
				return false;
			}
			candidate.commitHost();
			candidate.publish();
			candidate.runEffects();
			return true;
		} catch (error) {
			if (error instanceof StaleCollectionCandidate && collectionRetry < 2) return this.#renderAndCommit(tree, forceRender, dirtyOwners, relevantOwners, collectionRetry + 1, numericChanges, directIntent);
			if (candidate) {
				const failedCandidate = candidate;
				return throwWithCleanup(error, collectCleanupErrors([() => failedCandidate.discard(), () => {
					if (directIntent && this.#pendingDirectIntent === directIntent) this.#dropPendingDirectIntent();
				}]));
			}
			if (directIntent && this.#pendingDirectIntent === directIntent) return throwWithCleanup(error, collectCleanupErrors([() => this.#dropPendingDirectIntent()]));
			throw error;
		}
	}
	#preparePartialOwnerRender(owner) {
		return this.#prepareOwnerRender(owner);
	}
	#prepareOwnerRender(owner, options = {}) {
		const cached = this.#componentCache.get(owner);
		if (!cached) return null;
		const ownEffects = /* @__PURE__ */ new Map();
		const propBoundSites = /* @__PURE__ */ new Set();
		const ownsStoreTransaction = options.stores === void 0;
		const storeTransaction = options.stores ?? new StoreRenderTransaction(this.#rootId);
		let result;
		const activeOwner = {
			world: options.preparation ?? this.world,
			owner,
			numericStateReadsPrimitive: true,
			collectionPropsOwned: cached.collectionPropsOwned,
			collectionProps: cached.props,
			collectionSites: closedCollectionSitesFor(cached.type),
			stateLayout: numericOwnerCacheAdmitted(cached) ? compiledStateLayoutFor(cached.type) : void 0,
			propBoundSites,
			readStore: (siteId, source) => storeTransaction.read(source, `${owner}\u0000${siteId}`),
			...options.resourceReads ? { readResource: (source) => {
				options.onResourceRead?.();
				this.#everReadResource = true;
				return options.resourceReads.read(source);
			} } : {},
			...options.captureBinding ? { captureBinding: options.captureBinding } : {},
			registerEffect: (siteId, setup) => {
				if (!siteId || typeof setup !== "function") throw new Error("Invalid effect registration");
				const key = effectKey(owner, siteId);
				if (ownEffects.has(key)) throw new Error(`Effect site ${siteId} was registered more than once for owner ${owner}`);
				ownEffects.set(key, {
					owner,
					siteId,
					setup
				});
			}
		};
		activeOwners.push(activeOwner);
		const renderStarted = this.#profile ? performance.now() : 0;
		if (this.#activeCounters) this.#count("owner.component-renders");
		try {
			result = cached.type(cached.props);
		} catch (error) {
			if (ownsStoreTransaction) {
				storeTransaction.discard();
				this.#discardUncommittedStoreRoots(storeTransaction);
			}
			throw error;
		} finally {
			activeOwners.pop();
		}
		if (ownsStoreTransaction && storeTransaction.stores.size > 0) {
			storeTransaction.discard();
			this.#discardUncommittedStoreRoots(storeTransaction);
			return null;
		}
		if (ownsStoreTransaction) storeTransaction.discard();
		result = carryHostKeys(result, cached.hostKeyScope, "0", options.onOutputNode, cached.scopeExplicitHostKeys === true);
		if (this.#profile) this.#profile("owner.render-and-key", performance.now() - renderStarted);
		return {
			owner,
			result,
			ownEffects,
			propBoundSites,
			numericStateAdmitted: activeOwner.numericStateReadsPrimitive
		};
	}
	#commitPartialOwnerRender(prepared, captured) {
		const cached = this.#componentCache.get(prepared.owner);
		this.#componentCache.set(prepared.owner, {
			...cached,
			result: prepared.result,
			expandedResult: prepared.result,
			subtreeOwners: /* @__PURE__ */ new Set([prepared.owner]),
			ownEffects: prepared.ownEffects,
			propBoundSites: prepared.propBoundSites,
			numericStateAdmitted: prepared.numericStateAdmitted
		});
		this.#syncOwnerSourceValues(prepared.owner, cached, prepared.propBoundSites, captured);
		this.#refreshDirectKeyedRegionOutput(prepared.owner);
	}
	#tryPartialOwnerCommit(owner) {
		const cached = this.#componentCache.get(owner);
		if (!cached || cached.subtreeOwners.size !== 1) return false;
		const oldKey = singleHostRootKey(cached.expandedResult);
		if (oldKey === null) return false;
		const prepared = this.#preparePartialOwnerRender(owner);
		if (!prepared) return false;
		const nextKey = singleHostRootKey(prepared.result);
		if (!hasNestedComponent(prepared.result) && nextKey === oldKey) {
			const captured = this.#captureOwnerSourceValues(owner, prepared.propBoundSites);
			if (this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, prepared.result), true)) {
				try {
					this.#commitPartialOwnerRender(prepared, captured);
					this.#publishDirectHostMutation();
				} catch (error) {
					if (this.#directPublicationPending) this.#failDirectHostMutation(error);
					throw error;
				}
				const effectErrors = this.#reconcileOwnerEffects(prepared.owner, prepared.ownEffects);
				if (effectErrors.length) throw new AggregateError(effectErrors, "Component effect setup or cleanup failed after partial commit");
				return true;
			}
			this.#abandonDirectHostMutation();
		}
		this.#preparedRenders.set(owner, prepared);
		return false;
	}
	/**
	* Re-expand one stateful owner subtree when its keyed host root is stable.
	* Unaffected owners and effects are carried forward; keyed children inside
	* the region are reconciled by the VDOM without rerunning unchanged rows.
	*/
	#tryStructuralOwnerCommit(owner) {
		const cached = this.#componentCache.get(owner);
		if (!cached) {
			this.#profile?.("dispatch.structural-bail.cache-missing", 0);
			return false;
		}
		if (cached.subtreeOwners.size <= 1) {
			this.#profile?.("dispatch.structural-bail.no-nested-owners", 0);
			return false;
		}
		const oldKey = singleHostRootKey(cached.expandedResult);
		if (oldKey === null) {
			this.#profile?.("dispatch.structural-bail.old-root-unkeyed", 0);
			return false;
		}
		const prepared = this.#preparePartialOwnerRender(owner);
		if (!prepared) {
			this.#profile?.("dispatch.structural-bail.render-unavailable", 0);
			return false;
		}
		if (singleHostRootKey(prepared.result) !== oldKey) {
			this.#profile?.("dispatch.structural-bail.root-key-changed", 0);
			this.#preparedRenders.set(owner, prepared);
			return false;
		}
		if (this.#keyedOwnerReuse) {
			const expandStarted = this.#profile ? performance.now() : 0;
			const expandedResult = this.#expandStableKeyedOwnerResult(prepared.result, owner, cached);
			if (this.#profile) this.#profile("owner.expand-and-cache", performance.now() - expandStarted);
			if (expandedResult !== null) {
				const captured = this.#captureOwnerSourceValues(owner, prepared.propBoundSites);
				if (this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, expandedResult), true)) {
					try {
						this.#componentCache.set(owner, {
							...cached,
							result: prepared.result,
							expandedResult,
							ownEffects: prepared.ownEffects,
							propBoundSites: prepared.propBoundSites,
							numericStateAdmitted: prepared.numericStateAdmitted
						});
						this.#syncOwnerSourceValues(owner, cached, prepared.propBoundSites, captured);
						this.#publishDirectHostMutation();
					} catch (error) {
						if (this.#directPublicationPending) this.#failDirectHostMutation(error);
						throw error;
					}
					const effectErrors = this.#reconcileOwnerEffects(owner, prepared.ownEffects);
					if (effectErrors.length) throw new AggregateError(effectErrors, "Component effects failed after keyed-owner reuse commit");
					this.#profile?.("dispatch.path.keyed-owner-reuse", 0);
					return true;
				}
				this.#abandonDirectHostMutation();
			}
		}
		const affectedOwners = new Set(cached.subtreeOwners);
		const nextOwners = /* @__PURE__ */ new Set([owner]);
		const nextComponentCache = /* @__PURE__ */ new Map();
		const nextEffects = /* @__PURE__ */ new Map();
		const createdOwners = [];
		const subtreeOwnersByOwner = /* @__PURE__ */ new Map([[owner, /* @__PURE__ */ new Set([owner])]]);
		const expandStarted = this.#profile ? performance.now() : 0;
		this.#collectedKeyedRegions = /* @__PURE__ */ new Map();
		this.#collectedCollectionRegions = /* @__PURE__ */ new Map();
		let structuralStoreRead = false;
		const structuralStoreTransaction = new StoreRenderTransaction(this.#rootId);
		const expandedResult = (() => {
			try {
				for (const [key, effect] of prepared.ownEffects) nextEffects.set(key, effect);
				const expanded = this.#expand(prepared.result, owner, nextOwners, nextEffects, nextComponentCache, createdOwners, `structural/${getComponentSiteId(cached.type)}`, false, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), [owner], subtreeOwnersByOwner, structuralStoreTransaction);
				if (structuralStoreTransaction.stores.size > 0) {
					structuralStoreRead = true;
					structuralStoreTransaction.discard();
					this.#discardUncommittedStoreRoots(structuralStoreTransaction);
					return null;
				}
				return expanded;
			} catch (error) {
				structuralStoreTransaction.discard();
				this.#discardUncommittedStoreRoots(structuralStoreTransaction);
				this.#collectedKeyedRegions = null;
				this.#collectedCollectionRegions = null;
				for (let index = createdOwners.length - 1; index >= 0; index--) {
					const owner = createdOwners[index];
					this.world.destroyOwner(owner);
					this.#dropPendingForOwner(owner);
				}
				throw error;
			}
		})();
		const structuralKeyedRegions = this.#collectedKeyedRegions;
		const structuralCollectionRegions = this.#collectedCollectionRegions;
		this.#collectedKeyedRegions = null;
		this.#collectedCollectionRegions = null;
		if (this.#profile) this.#profile("owner.expand-and-cache", performance.now() - expandStarted);
		if (structuralStoreRead) {
			for (let index = createdOwners.length - 1; index >= 0; index--) {
				const candidateOwner = createdOwners[index];
				this.world.destroyOwner(candidateOwner);
				this.#dropPendingForOwner(candidateOwner);
			}
			return false;
		}
		const ownSubtreeOwners = subtreeOwnersByOwner.get(owner) ?? /* @__PURE__ */ new Set([owner]);
		nextComponentCache.set(owner, {
			...cached,
			result: prepared.result,
			expandedResult,
			subtreeOwners: ownSubtreeOwners,
			ownEffects: prepared.ownEffects,
			propBoundSites: prepared.propBoundSites,
			numericStateAdmitted: prepared.numericStateAdmitted,
			...structuralKeyedRegions?.get(owner) ? { keyedRegion: structuralKeyedRegions.get(owner) } : {}
		});
		const capturedStructuralValues = /* @__PURE__ */ new Map();
		for (const [nextOwner, component] of nextComponentCache) capturedStructuralValues.set(nextOwner, this.#captureOwnerSourceValues(nextOwner, component.propBoundSites));
		let structurallyCommitted;
		try {
			structurallyCommitted = this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, expandedResult), true);
		} catch (error) {
			for (let index = createdOwners.length - 1; index >= 0; index--) {
				const candidateOwner = createdOwners[index];
				this.world.destroyOwner(candidateOwner);
				this.#dropPendingForOwner(candidateOwner);
			}
			throw error;
		}
		if (!structurallyCommitted) {
			this.#abandonDirectHostMutation();
			this.#profile?.("dispatch.structural-bail.keyed-region-rejected", 0);
			for (const candidateOwner of ownSubtreeOwners) {
				const candidate = nextComponentCache.get(candidateOwner);
				if (candidate) this.#preparedRenders.set(candidateOwner, {
					owner: candidateOwner,
					result: candidate.result,
					ownEffects: candidate.ownEffects,
					propBoundSites: candidate.propBoundSites,
					numericStateAdmitted: candidate.numericStateAdmitted === true
				});
			}
			return false;
		}
		const retiredOwners = [];
		try {
			for (const previousOwner of affectedOwners) {
				if (nextOwners.has(previousOwner)) continue;
				if (this.#activeCounters) this.#count("owner.retired");
				this.#componentCache.delete(previousOwner);
				this.#liveOwners.delete(previousOwner);
				retiredOwners.push(previousOwner);
			}
			for (const [nextOwner, component] of nextComponentCache) {
				this.#componentCache.set(nextOwner, component);
				this.#liveOwners.add(nextOwner);
			}
			this.#syncLastSourceValues(this.#componentCache, capturedStructuralValues);
			this.#publishDirectHostMutation();
		} catch (error) {
			if (this.#directPublicationPending) this.#failDirectHostMutation(error);
			throw error;
		}
		const effectErrors = [];
		for (const previousOwner of retiredOwners) {
			effectErrors.push(...this.#reconcileOwnerEffects(previousOwner, /* @__PURE__ */ new Map()));
			this.world.destroyOwner(previousOwner);
			this.#dropPendingForOwner(previousOwner);
		}
		for (const [nextOwner, component] of nextComponentCache) effectErrors.push(...this.#reconcileOwnerEffects(nextOwner, component.ownEffects));
		try {
			this.#syncCollectionRegions(this.#componentCache, structuralCollectionRegions ?? /* @__PURE__ */ new Map());
		} catch (error) {
			effectErrors.push(error);
		}
		if (effectErrors.length) throw new AggregateError(effectErrors, "Component effect setup or cleanup failed after structural commit");
		return true;
	}
	#expandStableKeyedOwnerResult(node, parentOwner, previousOwnerCache) {
		let regionCount = 0;
		let reusedRows = 0;
		const visit = (value) => {
			if (value == null || value === false || typeof value === "string" || typeof value === "number") return value;
			if (Array.isArray(value)) {
				const regionId = getKeyedOwnerRegionId(value);
				if (regionId !== null) {
					regionCount++;
					if (this.#keyedOwnerReuseMode === "token") {
						const version = getKeyedOwnerVersion(value);
						const keyedRegion = previousOwnerCache.keyedRegion;
						if (regionCount !== 1 || version === null || !keyedRegion || keyedRegion.regionId !== regionId || keyedRegion.version !== version || keyedRegion.outputsByKey.size !== value.length || previousOwnerCache.subtreeOwners.size !== value.length + 1) {
							if (this.#activeCounters) this.#count("owner.keyed-region.token-mismatches");
							return null;
						}
						const output = [];
						for (const child of value) {
							const key = String(child.props.key);
							const cachedOutput = keyedRegion.outputsByKey.get(key);
							if (cachedOutput === void 0) return null;
							output.push(cachedOutput);
						}
						if (this.#activeCounters) {
							this.#count("owner.keyed-region.token-hits", value.length);
							this.#count("owner.keyed-region.token-output-reuses", output.length);
						}
						reusedRows += output.length;
						return copyKeyedOwnerMetadata(value, output);
					}
					if (regionCount !== 1 || value.length === 0 || previousOwnerCache.subtreeOwners.size !== value.length + 1) return null;
					const output = [];
					const seenKeys = /* @__PURE__ */ new Set();
					let componentSiteId = null;
					for (const child of value) {
						if (child == null || child === false || Array.isArray(child) || typeof child !== "object" || typeof child.type !== "function") return null;
						const siteId = getComponentSiteId(child.type);
						if (siteId !== regionId || componentSiteId && siteId !== componentSiteId) return null;
						componentSiteId = siteId;
						const rawKey = child.props.key;
						if (rawKey == null) return null;
						const key = String(rawKey);
						if (seenKeys.has(key)) return null;
						seenKeys.add(key);
						const childOwner = this.world.findOwner(parentOwner, siteId, key);
						if (childOwner === void 0 || !this.#liveOwners.has(childOwner)) return null;
						const childCache = this.#componentCache.get(childOwner);
						if (!childCache || childCache.type !== child.type || childCache.subtreeOwners.size !== 1) return null;
						const { key: _key, ref: _ref, ...props } = child.props;
						if (!shallowEqual(childCache.props, props)) return null;
						output.push(childCache.expandedResult);
						reusedRows++;
					}
					if (this.#activeCounters) {
						this.#count("owner.keyed-region.visits", value.length);
						this.#count("owner.keyed-region.eligibility-visits", value.length);
						this.#count("owner.keyed-region.cache-hits", reusedRows);
					}
					return output;
				}
				const output = [];
				let changed = false;
				for (const child of value) {
					const expanded = visit(child);
					if (expanded === null) return null;
					output.push(expanded);
					if (expanded !== child) changed = true;
				}
				return changed ? output : value;
			}
			if (typeof value.type === "function") return null;
			const child = visit(value.props.children);
			if (child === null) return null;
			return child === value.props.children ? value : copyRuntimeElement(value.type, {
				...value.props,
				children: child
			});
		};
		const result = visit(node);
		if (result === null || regionCount !== 1 || reusedRows === 0) {
			this.#count("owner.keyed-region.fallback");
			return null;
		}
		return result;
	}
	#tryPartialOwnerCommits(owners) {
		const keys = /* @__PURE__ */ new Map();
		const seenKeys = /* @__PURE__ */ new Set();
		for (const owner of owners) {
			const cached = this.#componentCache.get(owner);
			if (!cached) {
				this.#profile?.("dispatch.partial-bail.cache-missing", 0);
				return false;
			}
			if (cached.subtreeOwners.size !== 1) {
				this.#profile?.("dispatch.partial-bail.owner-has-nested-subtree", 0);
				return false;
			}
			const key = singleHostRootKey(cached.expandedResult);
			if (key === null) {
				this.#profile?.("dispatch.partial-bail.old-root-unkeyed", 0);
				return false;
			}
			if (seenKeys.has(key)) {
				this.#profile?.("dispatch.partial-bail.duplicate-region-key", 0);
				return false;
			}
			seenKeys.add(key);
			keys.set(owner, key);
		}
		const prepared = owners.map((owner) => this.#preparePartialOwnerRender(owner));
		if (prepared.some((item) => item === null)) {
			this.#profile?.("dispatch.partial-bail.render-unavailable", 0);
			return false;
		}
		const ready = prepared;
		for (const item of ready) if (hasNestedComponent(item.result) || singleHostRootKey(item.result) !== keys.get(item.owner)) {
			for (const candidate of ready) this.#preparedRenders.set(candidate.owner, candidate);
			this.#profile?.("dispatch.partial-bail.changed-root-or-nested-owner", 0);
			return false;
		}
		const regions = ready.map((item) => ({
			key: keys.get(item.owner),
			tree: item.result
		}));
		const capturedPartialValues = new Map(ready.map((item) => [item.owner, this.#captureOwnerSourceValues(item.owner, item.propBoundSites)]));
		if (!this.#commitHostMutation(() => this.#vdom.commitKeyedRegions(regions), true)) {
			this.#abandonDirectHostMutation();
			this.#profile?.("dispatch.partial-bail.keyed-regions-rejected", 0);
			for (const item of ready) this.#preparedRenders.set(item.owner, item);
			return false;
		}
		try {
			for (const item of ready) {
				const cached = this.#componentCache.get(item.owner);
				this.#componentCache.set(item.owner, {
					...cached,
					result: item.result,
					expandedResult: item.result,
					subtreeOwners: /* @__PURE__ */ new Set([item.owner]),
					ownEffects: item.ownEffects,
					propBoundSites: item.propBoundSites,
					numericStateAdmitted: item.numericStateAdmitted
				});
				this.#syncOwnerSourceValues(item.owner, cached, item.propBoundSites, capturedPartialValues.get(item.owner));
				this.#refreshDirectKeyedRegionOutput(item.owner);
				this.#preparedRenders.delete(item.owner);
			}
			this.#publishDirectHostMutation();
		} catch (error) {
			if (this.#directPublicationPending) this.#failDirectHostMutation(error);
			throw error;
		}
		const effectErrors = [];
		for (const item of ready) effectErrors.push(...this.#reconcileOwnerEffects(item.owner, item.ownEffects));
		if (effectErrors.length) throw new AggregateError(effectErrors, "Component effects failed after multi-region partial commit");
		return true;
	}
	#cleanupEffects(effects) {
		const errors = [];
		for (const effect of effects) {
			if (!effect.cleanup) continue;
			try {
				effect.cleanup();
			} catch (error) {
				errors.push(error);
			}
		}
		return errors;
	}
	#reconcileEffects(nextEffects) {
		const errors = [];
		try {
			this.#vdom.flushRefs();
		} catch (error) {
			errors.push(error);
		}
		if (this.#disposed || this.#disposeRequested) return errors;
		const previousEffects = this.#liveEffects;
		const nextLiveEffects = /* @__PURE__ */ new Map();
		const registrationsToStart = [];
		for (const [key, registration] of nextEffects) {
			const previous = previousEffects.get(key);
			if (previous) nextLiveEffects.set(key, previous);
			else registrationsToStart.push([key, registration]);
		}
		const removedEffects = [...previousEffects].filter(([key]) => !nextEffects.has(key)).map(([, effect]) => effect);
		this.#liveEffects = nextLiveEffects;
		this.#rebuildLiveEffectKeysByOwner();
		for (const effect of removedEffects) {
			if (!effect.cleanup) continue;
			try {
				effect.cleanup();
			} catch (error) {
				errors.push(error);
			}
			if (this.#disposed || this.#disposeRequested) return errors;
		}
		for (const [key, registration] of registrationsToStart) {
			if (this.#disposed || this.#disposeRequested) break;
			let cleanup;
			try {
				cleanup = registration.setup();
			} catch (error) {
				errors.push(error);
				if (this.#disposed || this.#disposeRequested) break;
				cleanup = void 0;
			}
			if (this.#disposed || this.#disposeRequested) {
				if (typeof cleanup === "function") try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
				break;
			}
			const effect = {
				owner: registration.owner,
				siteId: registration.siteId,
				cleanup: typeof cleanup === "function" ? cleanup : void 0
			};
			nextLiveEffects.set(key, effect);
			this.#addLiveEffectKey(key, effect);
		}
		return errors;
	}
	#reconcileOwnerEffects(owner, nextEffects) {
		const errors = [];
		try {
			this.#vdom.flushRefs();
		} catch (error) {
			errors.push(error);
		}
		if (this.#disposed || this.#disposeRequested) return errors;
		const currentKeys = this.#liveEffectKeysByOwner.get(owner);
		if (currentKeys) {
			const removedEffects = [];
			for (const key of [...currentKeys]) {
				if (nextEffects.has(key)) continue;
				const previous = this.#liveEffects.get(key);
				if (previous) removedEffects.push(previous);
				this.#liveEffects.delete(key);
				currentKeys.delete(key);
			}
			for (const effect of removedEffects) {
				if (effect.cleanup) try {
					effect.cleanup();
				} catch (error) {
					errors.push(error);
				}
				if (this.#disposed || this.#disposeRequested) return errors;
			}
		}
		for (const [key, registration] of nextEffects) {
			if (this.#disposed || this.#disposeRequested) break;
			if (this.#liveEffects.has(key)) continue;
			let cleanup;
			try {
				cleanup = registration.setup();
			} catch (error) {
				errors.push(error);
				if (this.#disposed || this.#disposeRequested) break;
				cleanup = void 0;
			}
			if (this.#disposed || this.#disposeRequested) {
				if (typeof cleanup === "function") try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
				break;
			}
			const effect = {
				owner,
				siteId: registration.siteId,
				cleanup: typeof cleanup === "function" ? cleanup : void 0
			};
			this.#liveEffects.set(key, effect);
			this.#addLiveEffectKey(key, effect);
		}
		if (this.#liveEffectKeysByOwner.get(owner)?.size === 0) this.#liveEffectKeysByOwner.delete(owner);
		return errors;
	}
	#rebuildLiveEffectKeysByOwner() {
		this.#liveEffectKeysByOwner.clear();
		for (const [key, effect] of this.#liveEffects) this.#addLiveEffectKey(key, effect);
	}
	#addLiveEffectKey(key, effect) {
		let keys = this.#liveEffectKeysByOwner.get(effect.owner);
		if (!keys) this.#liveEffectKeysByOwner.set(effect.owner, keys = /* @__PURE__ */ new Set());
		keys.add(key);
	}
	#count(name, count = 1) {
		if (!this.#activeCounters || count === 0) return;
		this.#activeCounters.set(name, (this.#activeCounters.get(name) ?? 0) + count);
	}
	#compiledPropSitesForCache(owner, cache) {
		if (cache.propBoundSites.size === 0) return emptyCompiledPropSites;
		if (!numericOwnerCacheAdmitted(cache) || !this.world.ownerStateValuesArePrimitive(owner)) return emptyCompiledPropSites;
		const cached = this.#compiledPropSitesByCache.get(cache);
		if (cached) return cached;
		const metadata = typeof cache.type === "function" ? definedComponents.get(cache.type)?.metadata : void 0;
		if (!metadata?.propOnlySites.length) return emptyCompiledPropSites;
		this.#count("numeric.compiled-site-cache-constructions");
		const eligible = /* @__PURE__ */ new Set();
		for (const site of metadata?.propOnlySites ?? []) {
			this.#count("numeric.compiled-site-metadata-inspections");
			if (cache.propBoundSites.has(site)) eligible.add(site);
		}
		this.#compiledPropSitesByCache.set(cache, eligible);
		return eligible;
	}
	#compiledOwnerSiteCertified(owner, cache, site) {
		if (!numericOwnerCacheAdmitted(cache) || !this.world.ownerStateValuesArePrimitive(owner)) return false;
		return (typeof cache.type === "function" ? definedComponents.get(cache.type)?.metadata : void 0)?.propOnlySites.includes(site) === true;
	}
	#refreshDirectKeyedRegionOutput(owner, sparseStore = false) {
		if (sparseStore) this.#count("store.sparse.keyed-output-edge-visits");
		const parentOwner = this.world.ownerLineage(owner)[1];
		if (parentOwner === void 0) return;
		const keyedRegion = this.#componentCache.get(parentOwner)?.keyedRegion;
		const key = keyedRegion?.keysByOwner.get(owner);
		if (key === void 0 || !keyedRegion) return;
		const childCache = this.#componentCache.get(owner);
		if (childCache) keyedRegion.outputsByKey.set(key, childCache.expandedResult);
	}
	#syncCollectionRegions(caches, collected = /* @__PURE__ */ new Map()) {
		if (this.#disposed) return;
		const next = /* @__PURE__ */ new Map();
		for (const [owner, component] of caches) {
			const region = component.keyedRegion?.collection;
			if (!region) continue;
			const key = `${owner}\u0000${region.siteId}`;
			next.set(key, region);
		}
		for (const [key, region] of collected) next.set(key, region);
		for (const [key, previous] of this.#liveCollectionRegions) {
			const current = next.get(key);
			if (current?.collection === previous.collection) {
				current.reader = previous.reader;
				current.unsubscribe = previous.unsubscribe;
				if (current.reader && current.snapshotVersion === previous.collection.version) {
					current.reader.resetTo(current.snapshotVersion);
					this.#collectionSnapshotFallbackKeys.delete(key);
				}
				if (current.snapshotVersion !== previous.collection.version) this.#pendingCollectionRegionKeys.add(key);
				else this.#pendingCollectionRegionKeys.delete(key);
				continue;
			}
			previous.unsubscribe?.();
			previous.reader?.detach();
			this.#count("collection.reader-detaches");
			this.#pendingCollectionRegionKeys.delete(key);
			this.#collectionSnapshotFallbackKeys.delete(key);
		}
		for (const [key, region] of next) {
			if (region.reader) continue;
			region.reader = region.collection.createReader();
			region.unsubscribe = region.collection.subscribe(() => {
				if (this.#disposed) return;
				this.#pendingCollectionRegionKeys.add(key);
				this.#schedule();
			});
			this.#count("collection.reader-attaches");
			if (region.snapshotVersion !== region.collection.version) this.#pendingCollectionRegionKeys.add(key);
		}
		this.#liveCollectionRegions = next;
	}
	#prepareMixedCollectionCandidate(capturedChanges, options) {
		if (this.#pendingCollectionRegionKeys.size === 0 || !options.scopedStructural && (this.#everReadResource || this.#everHadNativeBoundary)) return null;
		const storeGenerationAtPrepare = options.storeGeneration;
		const baseVersion = this.#publicationVersion;
		const baseVDOMVersion = this.#vdom.version;
		const preparation = this.world.beginPreparation();
		const stores = new StoreRenderTransaction(this.#rootId, { transitions: options.transitions });
		let resourceReads = new ResourceReadSet(this.#resourceTable);
		const stages = /* @__PURE__ */ new Map();
		const rowsByOwner = /* @__PURE__ */ new Map();
		const droppedReaderIds = /* @__PURE__ */ new Set();
		const renderedOwners = /* @__PURE__ */ new Set();
		const retiredOwners = /* @__PURE__ */ new Set();
		const privateOwners = /* @__PURE__ */ new Set();
		let closedStoreOutputs = null;
		const capturedBindings = [];
		const leafCaches = /* @__PURE__ */ new Map();
		const leafPreviousCaches = /* @__PURE__ */ new Map();
		const leafRegions = [];
		const numericWrites = [];
		const numericSources = /* @__PURE__ */ new Set();
		const scopedCellWrites = [];
		const resourceStages = [];
		const scopedSources = /* @__PURE__ */ new Set();
		const scopedHandles = [];
		const scopedVersions = [];
		const validateScopedCells = (afterHost) => this.#validateRetainedCells(scopedCellWrites, afterHost);
		const hasScopedStoreReaderConflict = () => {
			if (!options.scopedStructural) return false;
			for (const owner of retiredOwners) if (this.#ownerHasStoreReaders(owner)) return true;
			return false;
		};
		const discardArtifacts = () => {
			try {
				preparation.discard();
			} finally {
				stores.discard();
				resourceReads?.discard();
				resourceReads = null;
				this.#discardUncommittedStoreRoots(stores);
				closedStoreOutputs?.release();
				closedStoreOutputs = null;
				for (const stage of resourceStages) stage.release();
				resourceStages.length = 0;
			}
		};
		let preparedProgram = null;
		let committedProgram = null;
		let preparationFailed = false;
		let resourceWasRead = false;
		try {
			if (!options.scopedStructural && this.#storeNotificationGeneration !== storeGenerationAtPrepare) throw new SparseCandidateIneligible();
			if (options.scopedStructural) {
				const captured = this.#captureRetainedCells(options.scopedCells ?? []);
				if (!captured) throw new SparseCandidateIneligible();
				scopedCellWrites.push(...captured.writes);
				for (const source of captured.sources) scopedSources.add(source);
				for (const write of scopedCellWrites) {
					scopedHandles.push(write.handle);
					scopedVersions.push(write.version);
				}
			}
			const storeChangePending = this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration;
			if (options.scopedStructural && (options.transitions.length > 0 || capturedChanges.length > 0 || !options.selectedRegionKeys?.size)) throw new SparseCandidateIneligible();
			const regionKeys = options.selectedRegionKeys ?? (storeChangePending ? new Set(this.#liveCollectionRegions.keys()) : new Set(this.#pendingCollectionRegionKeys));
			for (const regionKey of regionKeys) {
				this.#count("collection.mixed-region-visits");
				if (this.#collectionSnapshotFallbackKeys.has(regionKey)) {
					preparationFailed = true;
					break;
				}
				const region = this.#liveCollectionRegions.get(regionKey);
				const parentCache = region && this.#componentCache.get(region.parentOwner);
				const ownerRegion = parentCache?.keyedRegion;
				if (!region || !region.reader || !parentCache || !ownerRegion || ownerRegion.collection !== region || !region.parentHostKey || region.requiresOwnerRender || !region.ownerInputsAdmitted || closedCollectionSitesFor(parentCache.type) !== void 0 && parentCache.collectionPropsOwned !== true || !collectionOwnerApiAdmitted(region, parentCache) || !componentCodeCurrent(parentCache.type) || options.scopedStructural && !this.#pendingCollectionRegionKeys.has(regionKey)) {
					preparationFailed = true;
					break;
				}
				const read = region.reader.read();
				if (read.status !== "available") {
					preparationFailed = true;
					break;
				}
				if (collectionOwnerNeedsGenericRows(parentCache, read.batches)) {
					preparationFailed = true;
					break;
				}
				const stage = {
					key: regionKey,
					region,
					reader: region.reader,
					parentCache,
					ownerRegion,
					read,
					rows: /* @__PURE__ */ new Map(),
					previousRows: /* @__PURE__ */ new Map(),
					operations: []
				};
				stages.set(regionKey, stage);
			}
			if (preparationFailed || stages.size === 0) throw new SparseCandidateIneligible();
			if (options.scopedStructural) {
				for (const stage of stages.values()) for (const batch of stage.read.batches) if (batch.operations.some((operation) => operation.type !== "move" && operation.type !== "remove")) throw new SparseCandidateIneligible();
			}
			const rowFor = (stage, key) => {
				if (stage.rows.has(key)) return stage.rows.get(key) ?? null;
				const node = stage.region.rows.get(key)?.node;
				const componentSiteId = stage.region.componentSiteId ?? (node && typeof node === "object" && !Array.isArray(node) && typeof node.type === "function" ? getComponentSiteId(node.type) : void 0);
				if (!node || !componentSiteId) return null;
				const owner = preparation.findOwner(stage.region.parentOwner, collectionOwnerSite(stage.region.siteId, componentSiteId), key);
				const cache = owner === void 0 ? void 0 : this.#componentCache.get(owner);
				const hostKey = stage.region.hostKeysByCollectionKey.get(key);
				if (owner === void 0 || !cache || !hostKey) return null;
				const row = {
					owner,
					hostKey,
					node,
					cache,
					privateOwner: false
				};
				stage.previousRows.set(key, row);
				rowsByOwner.set(owner, {
					stage,
					key
				});
				return row;
			};
			const prepareRenderedRow = (stage, key, rendered, owner, previous, privateOwner) => {
				if (typeof rendered.type !== "function" || stage.region.componentSiteId !== void 0 && getComponentSiteId(rendered.type) !== stage.region.componentSiteId) return null;
				const authoredKey = rendered.props.key;
				if (authoredKey != null && String(authoredKey) !== key) return null;
				const { key: _key, ref: _ref, ...props } = rendered.props;
				ownNumericOwnerProps(rendered.type, rendered, props);
				const collectionPropsOwned = ownCollectionOwnerProps(rendered.type, rendered, props);
				const priorCache = previous?.owner === owner ? previous.cache : void 0;
				const hostKeyScope = priorCache?.hostKeyScope ?? key;
				const scopeExplicitHostKeys = priorCache?.scopeExplicitHostKeys === true;
				if (previous?.privateOwner && previous.owner === owner) {
					stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${owner}\u0000`)));
					for (let index = capturedBindings.length - 1; index >= 0; index--) if (capturedBindings[index].owner === owner) capturedBindings.splice(index, 1);
				}
				const ownEffects = /* @__PURE__ */ new Map();
				const propBoundSites = /* @__PURE__ */ new Set();
				const activeOwner = {
					world: preparation,
					owner,
					numericStateReadsPrimitive: true,
					collectionPropsOwned,
					collectionProps: props,
					collectionSites: closedCollectionSitesFor(rendered.type),
					stateLayout: numericOwnerPropsAdmitted(rendered.type, props, isRuntimeOwnedElement(rendered)) ? compiledStateLayoutFor(rendered.type) : void 0,
					propBoundSites,
					readStore: (siteId, source) => stores.read(source, `${owner}\u0000${siteId}`),
					readResource: (source) => {
						resourceWasRead = true;
						this.#everReadResource = true;
						return resourceReads.read(source);
					},
					captureBinding: (binding, sources, bindingOwner, sites) => {
						capturedBindings.push({
							binding,
							sources,
							owner: bindingOwner,
							sites
						});
					},
					registerEffect: (siteId, setup) => {
						if (!siteId || typeof setup !== "function") throw new Error("Invalid effect registration");
						const effectId = effectKey(owner, siteId);
						if (ownEffects.has(effectId)) throw new Error(`Effect site ${siteId} was registered twice for owner ${owner}`);
						ownEffects.set(effectId, {
							owner,
							siteId,
							setup
						});
					}
				};
				activeOwners.push(activeOwner);
				let result;
				try {
					if (this.#activeCounters) {
						this.#count("owner.component-visits");
						this.#count("owner.component-renders");
					}
					result = rendered.type(props);
				} finally {
					activeOwners.pop();
				}
				if (resourceWasRead) return null;
				result = carryHostKeys(result, hostKeyScope, "0", void 0, scopeExplicitHostKeys);
				const hostKey = singleHostRootKey(result);
				if (hostKey === null || hasNestedComponent(result)) return null;
				const cache = {
					type: rendered.type,
					hostKeyScope,
					scopeExplicitHostKeys,
					collectionPropsOwned,
					props,
					numericPropsAdmitted: numericOwnerPropsAdmitted(rendered.type, props, isRuntimeOwnedElement(rendered)),
					numericStateAdmitted: activeOwner.numericStateReadsPrimitive,
					collectionEntry: canonicalCollectionEntry(stage.region.collection, key),
					result,
					expandedResult: result,
					subtreeOwners: /* @__PURE__ */ new Set([owner]),
					ownEffects,
					propBoundSites
				};
				const row = {
					owner,
					hostKey,
					node: {
						...rendered,
						props: {
							...rendered.props,
							key
						}
					},
					cache,
					privateOwner
				};
				renderedOwners.add(owner);
				if (privateOwner) privateOwners.add(owner);
				if (previous && previous.owner !== owner) retiredOwners.add(previous.owner);
				rowsByOwner.set(owner, {
					stage,
					key
				});
				return row;
			};
			const appendOperation = (stage, operation) => {
				stage.operations.push(operation);
				return "ok";
			};
			for (const stage of stages.values()) for (const batch of stage.read.batches) {
				if (batch.fromVersion + 1 !== batch.version) throw new SparseCandidateIneligible();
				for (const operation of batch.operations) {
					this.#count("collection.delta-operations");
					if (operation.type === "remove") {
						const previous = rowFor(stage, operation.key);
						if (!previous) throw new SparseCandidateIneligible();
						if (options.scopedStructural && previous.cache.subtreeOwners.size !== 1) throw new SparseCandidateIneligible();
						if (appendOperation(stage, {
							type: "remove",
							key: previous.hostKey
						}) === false) throw new SparseCandidateIneligible();
						stage.rows.set(operation.key, null);
						if (privateOwners.has(previous.owner)) {
							preparation.discardPrivateOwner(previous.owner);
							privateOwners.delete(previous.owner);
							renderedOwners.delete(previous.owner);
							rowsByOwner.delete(previous.owner);
							for (let index = capturedBindings.length - 1; index >= 0; index--) if (capturedBindings[index].owner === previous.owner) capturedBindings.splice(index, 1);
							stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${previous.owner}\u0000`)));
						} else retiredOwners.add(previous.owner);
					} else if (operation.type === "move") {
						const row = rowFor(stage, operation.key);
						const anchor = operation.beforeKey === null ? null : rowFor(stage, operation.beforeKey);
						if (!row || operation.beforeKey !== null && !anchor || appendOperation(stage, {
							type: "move",
							key: row.hostKey,
							beforeKey: anchor?.hostKey ?? null
						}) === false) throw new SparseCandidateIneligible();
					} else {
						const previous = rowFor(stage, operation.key);
						const inserting = operation.type === "insert";
						if (inserting && previous || !inserting && !previous) throw new SparseCandidateIneligible();
						const anchor = inserting && operation.beforeKey !== null ? rowFor(stage, operation.beforeKey) : null;
						if (inserting && operation.beforeKey !== null && !anchor) throw new SparseCandidateIneligible();
						const rendered = stage.region.renderRow(operation.value);
						if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" || typeof rendered.type !== "function") throw new SparseCandidateIneligible();
						const componentSiteId = getComponentSiteId(rendered.type);
						const ownerSite = collectionOwnerSite(stage.region.siteId, componentSiteId);
						const existing = preparation.findOwner(stage.region.parentOwner, ownerSite, operation.key);
						const preserveReplacementOwner = operation.type === "replace" && existing !== void 0;
						const owner = existing === void 0 ? preparation.resolveOwner(stage.region.parentOwner, ownerSite, operation.key) : preserveReplacementOwner ? existing : preparation.replaceOwner(stage.region.parentOwner, ownerSite, operation.key);
						const candidate = prepareRenderedRow(stage, operation.key, rendered, owner, previous, owner !== existing);
						if (!candidate || previous && candidate.hostKey !== previous.hostKey) throw new SparseCandidateIneligible();
						if (appendOperation(stage, previous === null ? {
							type: "insert",
							key: candidate.hostKey,
							beforeKey: anchor?.hostKey ?? null,
							tree: candidate.cache.expandedResult
						} : {
							type: "replace",
							key: candidate.hostKey,
							tree: candidate.cache.expandedResult
						}) === false) throw new SparseCandidateIneligible();
						stage.rows.set(operation.key, candidate);
						if (previous) {
							if (previous.owner !== candidate.owner && privateOwners.has(previous.owner)) {
								preparation.discardPrivateOwner(previous.owner);
								privateOwners.delete(previous.owner);
								renderedOwners.delete(previous.owner);
								rowsByOwner.delete(previous.owner);
								for (let index = capturedBindings.length - 1; index >= 0; index--) if (capturedBindings[index].owner === previous.owner) capturedBindings.splice(index, 1);
								stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${previous.owner}\u0000`)));
							}
						}
					}
				}
			}
			const affectedReaderIds = new Set(droppedReaderIds);
			const readerOwners = /* @__PURE__ */ new Map();
			if (!options.scopedStructural) for (const readerId of this.#liveStoreReaders.keys()) {
				const split = readerId.indexOf("\0");
				if (split <= 0) throw new SparseCandidateIneligible();
				const owner = Number(readerId.slice(0, split));
				if (!Number.isSafeInteger(owner)) throw new SparseCandidateIneligible();
				const ids = readerOwners.get(owner) ?? [];
				ids.push(readerId);
				readerOwners.set(owner, ids);
			}
			if (!options.scopedStructural) {
				for (const owner of readerOwners.keys()) {
					this.#count("collection.mixed-store-reader-visits");
					for (const stage of stages.values()) {
						const collectionKey = stage.ownerRegion.keysByOwner.get(owner);
						if (collectionKey !== void 0 && stage.region.rows.has(collectionKey)) {
							rowsByOwner.set(owner, {
								stage,
								key: collectionKey
							});
							break;
						}
					}
				}
				for (const [owner, ids] of readerOwners) if (retiredOwners.has(owner)) for (const id of ids) {
					droppedReaderIds.add(id);
					affectedReaderIds.add(id);
				}
				else if (renderedOwners.has(owner)) for (const id of ids) affectedReaderIds.add(id);
				if (storeChangePending) for (const [owner, ids] of readerOwners) {
					if (retiredOwners.has(owner)) continue;
					const rowLocation = rowsByOwner.get(owner);
					if (rowLocation) {
						const stage = rowLocation.stage;
						const row = rowFor(stage, rowLocation.key);
						if (!row) {
							for (const id of ids) droppedReaderIds.add(id);
							continue;
						}
						if (row.owner !== owner) {
							for (const id of ids) {
								droppedReaderIds.add(id);
								affectedReaderIds.add(id);
							}
							continue;
						}
						if (renderedOwners.has(owner)) {
							for (const id of ids) affectedReaderIds.add(id);
							continue;
						}
						const rendered = row.node;
						const prepared = prepareRenderedRow(stage, rowLocation.key, rendered, owner, row, false);
						if (!prepared || !appendOperation(stage, {
							type: "replace",
							key: row.hostKey,
							tree: prepared.cache.expandedResult
						})) throw new SparseCandidateIneligible();
						stage.rows.set(rowLocation.key, prepared);
						for (const id of ids) affectedReaderIds.add(id);
					} else {
						if (!storeChangePending) continue;
						const cache = this.#componentCache.get(owner);
						const metadata = cache && typeof cache.type === "function" ? definedComponents.get(cache.type)?.metadata : void 0;
						if (!cache || cache.nativeBoundary || metadata?.hostLeafOutput !== true || cache.subtreeOwners.size !== 1 || hasNestedComponent(cache.result)) throw new SparseCandidateIneligible();
						const key = singleHostRootKey(cache.expandedResult);
						if (!key) throw new SparseCandidateIneligible();
						this.#count("owner.component-visits");
						const prepared = this.#prepareOwnerRender(owner, {
							preparation,
							stores,
							resourceReads,
							captureBinding: (binding, sources, bindingOwner, sites) => capturedBindings.push({
								binding,
								sources,
								owner: bindingOwner,
								sites
							}),
							onResourceRead: () => resourceWasRead = true
						});
						if (!prepared || resourceWasRead || singleHostRootKey(prepared.result) !== key || hasNestedComponent(prepared.result)) throw new SparseCandidateIneligible();
						leafCaches.set(owner, {
							...cache,
							result: prepared.result,
							expandedResult: prepared.result,
							ownEffects: prepared.ownEffects,
							propBoundSites: prepared.propBoundSites,
							numericStateAdmitted: prepared.numericStateAdmitted
						});
						leafPreviousCaches.set(owner, cache);
						leafRegions.push({
							key,
							tree: prepared.result
						});
						for (const id of ids) affectedReaderIds.add(id);
					}
				}
				if (droppedReaderIds.size) stores.dropReaders(droppedReaderIds);
				const preserved = /* @__PURE__ */ new Map();
				for (const [readerId, readerStores] of this.#liveStoreReaders) {
					if (affectedReaderIds.has(readerId)) continue;
					preserved.set(readerId, readerStores);
				}
				if (preserved.size) stores.preserveReaders(preserved);
			}
			const touchedOldOwners = /* @__PURE__ */ new Set([...retiredOwners, ...renderedOwners]);
			for (const change of capturedChanges) {
				if (touchedOldOwners.has(change.owner)) continue;
				const cache = this.#componentCache.get(change.owner);
				const source = this.world.scalarSourceForChange(change);
				const approvedSites = cache ? this.#compiledPropSitesForCache(change.owner, cache) : void 0;
				const previous = source ? this.#lastSourceValues.get(source) : void 0;
				if (!cache || !approvedSites?.has(change.site) || !source || previous === void 0 || !this.#vdom.hasBoundSource(source) || numericSources.has(source)) throw new SparseCandidateIneligible();
				numericSources.add(source);
				numericWrites.push({
					owner: change.owner,
					site: change.site,
					source,
					version: change.version,
					previous,
					current: source.value,
					change
				});
			}
			const validateNumericWrites = () => numericWrites.every((write) => this.world.versionForChange(write.change) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && Object.is(write.source.value, write.current));
			const validatePostHostNumericWrites = () => numericWrites.every((write) => this.world.scalarSource(write.owner, write.site) === write.source && this.world.version(write.owner, write.site) >= write.version && (this.world.version(write.owner, write.site) > write.version || Object.is(write.source.value, write.current)));
			if (resourceWasRead || preparation.hasStateWrites()) throw new SparseCandidateIneligible();
			if (hasScopedStoreReaderConflict()) throw new SparseCandidateIneligible();
			if (options.scopedStructural && (leafRegions.length > 0 || leafCaches.size > 0 || numericWrites.length > 0 || renderedOwners.size > 0 || privateOwners.size > 0)) throw new SparseCandidateIneligible();
			if (options.scopedStructural && scopedCellWrites.some(({ handle }) => retiredOwners.has(handle.owner))) throw new SparseCandidateIneligible();
			if (options.scopedResourceOwners?.length) for (const owner of options.scopedResourceOwners) {
				const stage = this.#stageBoundaryReveal(owner, preparation, stores, resourceReads, options.resourceLease);
				if (!stage) throw new SparseCandidateIneligible();
				resourceStages.push(stage);
			}
			if (options.scopedStructural && options.scopedStores?.length) {
				const newlyStaged = new Set(resourceStages.flatMap((stage) => [...stage.storeInputs]));
				const pendingReaderIds = new Set(resourceStages.flatMap((stage) => [...stage.pendingReaderIds]));
				closedStoreOutputs = this.#stageClosedStoreOutputs(options.scopedStores, stores, false, newlyStaged, pendingReaderIds, options.resourceLease);
			}
			if (options.scopedStructural && closedStoreOutputs && [...closedStoreOutputs.owners].some((owner) => retiredOwners.has(owner))) throw new SparseCandidateIneligible();
			const deltas = [...stages.values()].filter((stage) => stage.operations.length > 0).map((stage) => ({
				parentKey: stage.region.parentHostKey,
				regionId: stage.region.siteId,
				operations: stage.operations
			}));
			if (options.scopedStructural && (scopedCellWrites.length > 0 || (closedStoreOutputs?.regions.length ?? 0) > 0 || resourceStages.length > 0)) {
				const joint = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas(deltas, scopedCellWrites.map(({ source, value }) => [source, value]), closedStoreOutputs?.regions ?? [], resourceStages.map(({ region }) => region));
				if (!joint || joint.readSources.some((source) => !scopedSources.has(source))) throw new SparseCandidateIneligible();
				preparedProgram = joint;
			} else preparedProgram = this.#vdom.prepareKeyedRegionDeltas(deltas, leafRegions, options.scopedStructural ? { scoped: true } : void 0);
			if (!preparedProgram) throw new SparseCandidateIneligible();
			if (options.scopedStructural && !preparedProgram.scoped) throw new SparseCandidateIneligible();
			const capturedMixedValues = /* @__PURE__ */ new Map();
			const captureMixedValues = (owner, cache) => {
				for (const site of cache.propBoundSites) {
					const source = preparation.scalarSource(owner, site);
					if (!source) continue;
					let sites = capturedMixedValues.get(owner);
					if (!sites) capturedMixedValues.set(owner, sites = /* @__PURE__ */ new Map());
					sites.set(site, source.value);
				}
			};
			for (const [owner, cache] of leafCaches) captureMixedValues(owner, cache);
			if (!options.scopedStructural) {
				for (const stage of stages.values()) for (const row of stage.rows.values()) if (row) captureMixedValues(row.owner, row.cache);
			}
			const touchedCollections = [...stages.values()];
			let collectionAcknowledgements = [];
			const validateCollections = () => touchedCollections.every((stage) => collectionOwnerApiAdmitted(stage.region, stage.parentCache) && stage.region.collection.version === stage.read.toVersion);
			const validatePostHostCollections = () => touchedCollections.every((stage) => collectionOwnerApiAdmitted(stage.region, stage.parentCache) && stage.region.collection.version >= stage.read.toVersion);
			const validatePostHostCollectionsCanonical = () => touchedCollections.every((stage) => {
				const version = canonicalCollectionVersion(stage.region.collection);
				return collectionOwnerApiAdmitted(stage.region, stage.parentCache) && (version === null || version >= stage.read.toVersion);
			});
			const validateScopedCachePrivate = () => !options.scopedStructural || !hasScopedStoreReaderConflict() && touchedCollections.every((stage) => this.#liveCollectionRegions.get(stage.key) === stage.region && stage.region.reader === stage.reader && this.#componentCache.get(stage.region.parentOwner) === stage.parentCache && componentCodeCurrentPrivate(stage.parentCache.type) && stage.parentCache.keyedRegion === stage.ownerRegion);
			const validateScopedCache = () => validateScopedCachePrivate() && (options.acceptedCollections?.every((validate) => validate()) ?? true) && touchedCollections.every((stage) => componentCodeCurrent(stage.parentCache.type));
			const artifactsReleased = { value: false };
			const releaseArtifacts = () => {
				if (artifactsReleased.value) return;
				artifactsReleased.value = true;
				preparedProgram?.discard();
				preparedProgram = null;
				committedProgram = null;
				resourceReads?.discard();
				resourceReads = null;
				for (const stage of stages.values()) {
					stage.rows.clear();
					stage.previousRows.clear();
					stage.operations.length = 0;
				}
				stages.clear();
				collectionAcknowledgements = [];
				rowsByOwner.clear();
				capturedBindings.length = 0;
				leafCaches.clear();
				leafPreviousCaches.clear();
				leafRegions.length = 0;
				numericWrites.length = 0;
				numericSources.clear();
				scopedCellWrites.length = 0;
				scopedSources.clear();
				scopedHandles.length = 0;
				scopedVersions.length = 0;
				closedStoreOutputs?.release();
				closedStoreOutputs = null;
				for (const stage of resourceStages) stage.release();
				resourceStages.length = 0;
				privateOwners.clear();
				retiredOwners.clear();
				renderedOwners.clear();
			};
			const capturedCodeRevisions = captureCodeRevisions([...leafCaches.values(), ...[...stages.values()].flatMap((stage) => [...stage.rows.values(), ...stage.previousRows.values()].flatMap((row) => row ? [row.cache] : []))]);
			return this.#createCandidateLifecycle({
				baseVersion,
				baseVDOMVersion,
				scope: options.scopedStructural ? {
					kind: "keyed",
					versionDelta: preparedProgram.structuralVersionDelta
				} : void 0,
				stores,
				transitions: options.transitions,
				pendingResources: [],
				blocked: false,
				permitPendingDirectIntent: () => !!options.resourceLease && this.#publicationIntents.has(options.resourceLease),
				admissionCurrent: () => (!options.resourceLease || this.#publicationIntents.has(options.resourceLease)) && !this.#resourceHoldWait(/* @__PURE__ */ new Set([...options.acceptedResources ?? [], ...resourceStages.flatMap((stage) => [...stage.dependencies])]), options.resourceLease, {
					cells: scopedHandles,
					stores: [
						...options.scopedStores ?? [],
						...resourceStages.flatMap((stage) => [...stage.storeInputs]),
						...closedStoreOutputs?.inputStores ?? []
					],
					collections: [...touchedCollections.map((stage) => stage.region.collection), ...options.acceptedCollectionFootprint ?? []]
				}) && !this.#resourceHoldWait(new Set(closedStoreOutputs?.inputResources ?? []), options.resourceLease) && (!options.resourceLease || this.#publicationIntents.has(options.resourceLease)),
				codeCurrent: () => cacheCodeCurrent(leafCaches.values()) && validateScopedCache() && (closedStoreOutputs?.current() ?? true) && resourceStages.every((stage) => stage.current()) && scopedCellWrites.every(({ handle }) => {
					const cache = this.#componentCache.get(handle.owner);
					return cache !== void 0 && componentCodeCurrent(cache.type);
				}) && touchedCollections.every((stage) => [...stage.rows.values(), ...stage.previousRows.values()].every((row) => !row || componentCodeCurrent(row.cache.type))),
				validatePrepared: () => (options.scopedStructural || this.#storeNotificationGeneration === storeGenerationAtPrepare) && preparation.validate() && !preparation.hasStateWrites() && stores.validate() && validateNumericWrites() && validateCollections() && validateScopedCache() && (resourceReads?.validate() ?? false) && resourceStages.every((stage) => stage.current()) && (preparedProgram?.validate() ?? false) && preparation.validate() && validateScopedCells(false) && (closedStoreOutputs?.current() ?? true) && stores.validate(),
				validatePostHost: () => preparation.validatePublicationInputs() && !preparation.hasStateWrites() && stores.validatePublicationInputs() && validatePostHostNumericWrites() && validatePostHostCollections() && validateScopedCache() && (!options.scopedStructural || committedProgram?.validatePostHost() === true) && (resourceReads?.validate() ?? false) && resourceStages.every((stage) => stage.current()) && preparation.validatePublicationInputs() && validateScopedCells(true) && (closedStoreOutputs?.current() ?? true) && stores.validatePublicationInputs(),
				finalGroupCurrent: () => preparation.validatePublicationInputs() && !preparation.hasStateWrites() && stores.validatePublicationInputsCanonical() && validatePostHostNumericWrites() && validatePostHostCollectionsCanonical() && validateScopedCachePrivate() && (!options.scopedStructural || committedProgram?.validatePostHostPrivate() === true) && (resourceReads?.validateCanonical() ?? false) && resourceStages.every((stage) => stage.privateCurrent()) && validateScopedCells(true) && (closedStoreOutputs?.privateCurrent() ?? true) && cacheCodeCurrentPrivate(leafCaches.values()) && codeRevisionsCurrent(capturedCodeRevisions),
				preparePublication: () => {
					preparation.preparePublicationAfterHost();
					stores.preparePublicationAfterHost();
					collectionAcknowledgements = touchedCollections.map((stage) => {
						const acknowledge = stage.region.reader && prepareCollectionReaderAcknowledgement(stage.region.reader, stage.read.toVersion);
						if (!acknowledge) throw new Error("Collection reader cannot accept captured publication");
						return acknowledge;
					});
				},
				commitHost: () => {
					preparation.beginHostApplication();
					for (const item of capturedBindings) {
						const canonical = item.sites.map((site, index) => privateOwners.has(item.owner) ? preparation.scalarSource(item.owner, site) ?? item.sources[index] : this.world.scalarSource(item.owner, site) ?? item.sources[index]);
						const mutable = item.binding.sources;
						if (mutable) for (let index = 0; index < canonical.length; index++) mutable[index] = canonical[index];
						item.binding.source = canonical[0];
					}
					committedProgram = preparedProgram;
					preparedProgram.commit();
					preparedProgram = null;
					this.#applyCandidateNumericWrites(numericWrites);
					if (numericWrites.length > 0) {
						this.#count("numeric.candidate-batches");
						this.#count("numeric.candidate-source-updates", numericWrites.length);
					}
				},
				publish: () => {
					preparation.publishAccepted();
					stores.publishAccepted();
					for (let index = 0; index < collectionAcknowledgements.length; index++) if (collectionAcknowledgements[index]()) this.#pendingCollectionRegionKeys.delete(touchedCollections[index].key);
					collectionAcknowledgements = [];
					for (const [owner, cache] of leafCaches) this.#componentCache.set(owner, cache);
					for (const stage of stages.values()) {
						for (const [key, candidate] of stage.rows) {
							if (!candidate) {
								const previous = stage.previousRows.get(key);
								if (options.scopedStructural && previous) this.#retireOwnerAccepted(previous.owner);
								stage.region.rows.delete(key);
								stage.region.hostKeysByCollectionKey.delete(key);
								stage.ownerRegion.outputsByKey.delete(key);
								if (previous) stage.ownerRegion.keysByOwner.delete(previous.owner);
								continue;
							}
							stage.region.rows.set(key, {
								node: candidate.node,
								entry: candidate.cache.collectionEntry
							});
							stage.region.hostKeysByCollectionKey.set(key, candidate.hostKey);
							const previous = stage.previousRows.get(key);
							this.#componentCache.set(candidate.owner, candidate.cache);
							if (!this.#liveOwners.has(candidate.owner)) this.#count("owner.created");
							this.#liveOwners.add(candidate.owner);
							for (const ancestor of this.world.ownerLineage(candidate.owner).slice(1)) {
								const ancestorCache = this.#componentCache.get(ancestor);
								if (ancestorCache?.subtreeOwners instanceof Set && !ancestorCache.subtreeOwners.has(candidate.owner)) {
									ancestorCache.subtreeOwners.add(candidate.owner);
									this.#count("collection.owner-membership-writes");
								}
							}
							stage.ownerRegion.outputsByKey.set(key, candidate.cache.expandedResult);
							stage.ownerRegion.keysByOwner.set(candidate.owner, key);
							if (previous && previous.owner !== candidate.owner) stage.ownerRegion.keysByOwner.delete(previous.owner);
							if (previous && previous.owner === candidate.owner && !options.scopedStructural) this.#syncOwnerSourceValues(candidate.owner, previous.cache, candidate.cache.propBoundSites, capturedMixedValues.get(candidate.owner));
							else if (!previous || previous.owner !== candidate.owner) for (const site of candidate.cache.propBoundSites) {
								const source = this.world.scalarSource(candidate.owner, site);
								if (source) this.#lastSourceValues.set(source, capturedMixedValues.get(candidate.owner)?.get(site) ?? source.value);
							}
						}
						for (const ancestor of this.world.ownerLineage(stage.region.parentOwner)) {
							const cache = this.#componentCache.get(ancestor);
							if (!cache) continue;
							const keyedRegion = cache.keyedRegion ? {
								...cache.keyedRegion,
								version: createKeyedOwnerVersion()
							} : void 0;
							if (!options.scopedStructural && keyedRegion?.collection !== stage.region && keyedRegion) {
								keyedRegion.outputsByKey.clear();
								keyedRegion.keysByOwner.clear();
							}
							this.#componentCache.set(ancestor, {
								...cache,
								result: null,
								expandedResult: null,
								invalidatedByCollection: true,
								...keyedRegion ? { keyedRegion } : {}
							});
						}
					}
					for (const stage of resourceStages) stage.publish();
					closedStoreOutputs?.publish();
					for (const [owner, cache] of leafCaches) {
						const previous = leafPreviousCaches.get(owner);
						if (previous) this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites, capturedMixedValues.get(owner));
						this.#refreshDirectKeyedRegionOutput(owner, true);
					}
					for (const write of numericWrites) this.#lastSourceValues.set(write.source, write.current);
					for (const write of scopedCellWrites) this.#lastSourceValues.set(write.source, write.value);
					resourceReads?.discard();
					resourceReads = null;
					this.world.clearChangesThrough(capturedChanges);
					this.#pendingChanges.clearThrough(capturedChanges);
					if (scopedCellWrites.length > 0) {
						this.world.clearCellChangesThrough(scopedHandles, scopedVersions, scopedHandles.length);
						this.#pendingChanges.clearNativeThrough(scopedHandles, scopedVersions, scopedHandles.length);
					}
					if (!options.scopedStructural) this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
					this.#publicationVersion++;
				},
				installSubscriptions: () => {
					if (options.scopedStructural) {
						for (const stage of resourceStages) stage.installSubscriptions();
						if (stores.closedInputsChanged()) {
							this.#storeNotificationGeneration++;
							this.#schedule();
						}
						return [];
					}
					try {
						this.#syncStoreReaders(stores);
						return [];
					} catch (error) {
						return [error];
					}
				},
				runEffects: () => {
					const errors = [];
					try {
						preparation.notifyPublished();
					} catch (error) {
						errors.push(error);
					}
					if (!options.scopedStructural || closedStoreOutputs || resourceStages.length > 0) try {
						stores.notifyPublished();
					} catch (error) {
						errors.push(error);
					}
					try {
						this.#vdom.flushRefs();
					} catch (error) {
						errors.push(error);
					}
					for (const owner of retiredOwners) if (options.scopedStructural) errors.push(...this.#reconcileOwnerEffects(owner, /* @__PURE__ */ new Map()));
					else this.#retireCollectionRow(owner, errors);
					for (const [owner, cache] of leafCaches) errors.push(...this.#reconcileOwnerEffects(owner, cache.ownEffects));
					for (const stage of stages.values()) for (const [key, row] of stage.rows) {
						if (!row) continue;
						errors.push(...this.#reconcileOwnerEffects(row.owner, row.cache.ownEffects));
					}
					for (const stage of resourceStages) errors.push(...stage.runEffects());
					return errors;
				},
				discard: discardArtifacts,
				releaseArtifacts,
				effectFailureMessage: "Mixed collection candidate effects failed after publication"
			});
		} catch (error) {
			preparedProgram?.discard();
			preparedProgram = null;
			discardArtifacts();
			stages.clear();
			rowsByOwner.clear();
			capturedBindings.length = 0;
			leafCaches.clear();
			leafPreviousCaches.clear();
			leafRegions.length = 0;
			numericWrites.length = 0;
			numericSources.clear();
			privateOwners.clear();
			retiredOwners.clear();
			renderedOwners.clear();
			if (error instanceof HeldPublicationWait) return this.#prepareBlockedPublication([error.resource]);
			if (error instanceof SparseCandidateIneligible || preparationFailed || resourceWasRead) return null;
			throw error;
		}
	}
	#flushCollectionDelta() {
		if (this.#pendingCollectionRegionKeys.size !== 1) return false;
		const regionKey = this.#pendingCollectionRegionKeys.values().next().value;
		if (!regionKey) return false;
		if (this.#collectionSnapshotFallbackKeys.has(regionKey)) return false;
		const region = this.#liveCollectionRegions.get(regionKey);
		const parentCache = region && this.#componentCache.get(region.parentOwner);
		const ownerRegion = parentCache?.keyedRegion;
		const parentHostKey = region?.parentHostKey ?? null;
		if (!region || !region.reader || !parentCache || !ownerRegion || ownerRegion.collection !== region || parentHostKey === null || region.requiresOwnerRender || !region.ownerInputsAdmitted || closedCollectionSitesFor(parentCache.type) !== void 0 && parentCache.collectionPropsOwned !== true || !collectionOwnerApiAdmitted(region, parentCache) || !componentCodeCurrent(parentCache.type)) return false;
		const read = region.reader.read();
		if (read.status !== "available") {
			this.#count("collection.delta.reader-expired");
			return false;
		}
		if (collectionOwnerNeedsGenericRows(parentCache, read.batches)) return false;
		if (read.batches.length === 0) {
			if (!region.reader.acknowledge(read.toVersion)) return false;
			this.#pendingCollectionRegionKeys.delete(regionKey);
			return true;
		}
		const overlay = /* @__PURE__ */ new Map();
		const storeGenerationAtPrepare = this.#storeNotificationGeneration;
		const originalRows = /* @__PURE__ */ new Map();
		const activationPreviousOwners = /* @__PURE__ */ new Map();
		const stagedOwners = [];
		const newlyAllocatedOwners = [];
		const preparedStores = [];
		const operations = [];
		const rowFor = (key) => {
			if (overlay.has(key)) return overlay.get(key) ?? null;
			const node = region.rows.get(key)?.node;
			const componentSiteId = region.componentSiteId ?? (node && typeof node === "object" && !Array.isArray(node) && typeof node.type === "function" ? getComponentSiteId(node.type) : void 0);
			if (!componentSiteId) return null;
			const owner = this.world.findOwner(region.parentOwner, collectionOwnerSite(region.siteId, componentSiteId), key);
			if (!node || owner === void 0) return null;
			const cache = this.#componentCache.get(owner);
			const hostKey = region.hostKeysByCollectionKey.get(key);
			if (!cache || !hostKey) return null;
			const row = {
				owner,
				hostKey,
				node,
				cache
			};
			originalRows.set(key, row);
			return row;
		};
		const activationPreviousOwner = (key) => {
			if (!activationPreviousOwners.has(key)) {
				const componentSiteId = region.componentSiteId;
				activationPreviousOwners.set(key, componentSiteId ? this.world.findOwner(region.parentOwner, collectionOwnerSite(region.siteId, componentSiteId), key) : void 0);
			}
			return activationPreviousOwners.get(key);
		};
		const prepareRow = (key, value, existingOwner, stagedInsert = false, stagedPreviousOwner) => {
			const rendered = region.renderRow(value);
			if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" || typeof rendered.type !== "function" || region.componentSiteId !== void 0 && getComponentSiteId(rendered.type) !== region.componentSiteId) return null;
			const rowComponentSiteId = getComponentSiteId(rendered.type);
			const ownerSiteId = collectionOwnerSite(region.siteId, rowComponentSiteId);
			const authoredKey = rendered.props.key;
			if (authoredKey != null && String(authoredKey) !== key) return null;
			const owner = stagedInsert ? this.world.createStagedOwner(region.parentOwner, ownerSiteId, key) : existingOwner ?? this.world.resolveOwner(region.parentOwner, ownerSiteId, key);
			const staged = stagedInsert || existingOwner !== void 0 && stagedOwners.includes(existingOwner);
			if (staged) stagedOwners.push(owner);
			else if (existingOwner === void 0) newlyAllocatedOwners.push(owner);
			const { key: _key, ref: _ref, ...props } = rendered.props;
			ownNumericOwnerProps(rendered.type, rendered, props);
			const collectionPropsOwned = ownCollectionOwnerProps(rendered.type, rendered, props);
			const priorCache = !staged && existingOwner !== void 0 ? this.#componentCache.get(existingOwner) : void 0;
			const hostKeyScope = priorCache?.hostKeyScope ?? key;
			const scopeExplicitHostKeys = priorCache?.scopeExplicitHostKeys === true;
			const ownEffects = /* @__PURE__ */ new Map();
			const propBoundSites = /* @__PURE__ */ new Set();
			const storeTransaction = new StoreRenderTransaction(this.#rootId);
			const activeOwner = {
				world: this.world,
				owner,
				numericStateReadsPrimitive: true,
				collectionPropsOwned,
				collectionProps: props,
				collectionSites: closedCollectionSitesFor(rendered.type),
				stateLayout: numericOwnerPropsAdmitted(rendered.type, props, isRuntimeOwnedElement(rendered)) ? compiledStateLayoutFor(rendered.type) : void 0,
				propBoundSites,
				readStore: (siteId, source) => storeTransaction.read(source, `${owner}\u0000${siteId}`),
				registerEffect: (siteId, setup) => {
					if (!siteId || typeof setup !== "function") throw new Error("Invalid effect registration");
					const effectId = effectKey(owner, siteId);
					if (ownEffects.has(effectId)) throw new Error(`Effect site ${siteId} was registered twice for owner ${owner}`);
					ownEffects.set(effectId, {
						owner,
						siteId,
						setup
					});
				}
			};
			activeOwners.push(activeOwner);
			let result;
			try {
				if (this.#activeCounters) {
					this.#count("owner.component-visits");
					this.#count("owner.component-renders");
				}
				result = rendered.type(props);
			} finally {
				activeOwners.pop();
			}
			preparedStores.push(storeTransaction);
			if (storeTransaction.stores.size > 0) return null;
			storeTransaction.discard();
			result = carryHostKeys(result, hostKeyScope, "0", void 0, scopeExplicitHostKeys);
			const hostKey = singleHostRootKey(result);
			if (hostKey === null || hasNestedComponent(result)) return null;
			const cache = {
				type: rendered.type,
				hostKeyScope,
				scopeExplicitHostKeys,
				collectionPropsOwned,
				props,
				numericPropsAdmitted: numericOwnerPropsAdmitted(rendered.type, props, isRuntimeOwnedElement(rendered)),
				numericStateAdmitted: activeOwner.numericStateReadsPrimitive,
				collectionEntry: canonicalCollectionEntry(region.collection, key),
				result,
				expandedResult: result,
				subtreeOwners: /* @__PURE__ */ new Set([owner]),
				ownEffects,
				propBoundSites
			};
			return {
				owner,
				hostKey,
				node: {
					...rendered,
					props: {
						...rendered.props,
						key
					}
				},
				cache,
				...staged ? {
					staged: true,
					previousOwner: stagedPreviousOwner
				} : {}
			};
		};
		const discardCandidate = () => {
			for (const transaction of preparedStores) {
				transaction.discard();
				this.#discardUncommittedStoreRoots(transaction);
			}
			for (const owner of [.../* @__PURE__ */ new Set([...stagedOwners, ...newlyAllocatedOwners])]) {
				this.world.destroyOwner(owner);
				this.#dropPendingForOwner(owner);
			}
		};
		try {
			for (const batch of read.batches) {
				if (batch.fromVersion + 1 !== batch.version) {
					discardCandidate();
					return false;
				}
				for (const operation of batch.operations) if (operation.type === "remove") {
					const row = rowFor(operation.key);
					if (!row) {
						discardCandidate();
						return false;
					}
					if (row.cache.subtreeOwners.size !== 1 || this.#ownerHasStoreReaders(row.owner)) {
						discardCandidate();
						return false;
					}
					overlay.set(operation.key, null);
					operations.push({
						type: "remove",
						key: row.hostKey
					});
				} else if (operation.type === "move") {
					const row = rowFor(operation.key);
					const anchor = operation.beforeKey === null ? null : rowFor(operation.beforeKey);
					if (!row || operation.beforeKey !== null && !anchor) {
						discardCandidate();
						return false;
					}
					operations.push({
						type: "move",
						key: row.hostKey,
						beforeKey: anchor?.hostKey ?? null
					});
				} else {
					const previous = rowFor(operation.key);
					const isInsert = operation.type === "insert";
					if (isInsert && previous) {
						discardCandidate();
						return false;
					}
					if (!isInsert && !previous) {
						discardCandidate();
						return false;
					}
					if (previous && (previous.cache.subtreeOwners.size !== 1 || this.#ownerHasStoreReaders(previous.owner))) {
						discardCandidate();
						return false;
					}
					const anchor = isInsert && operation.beforeKey !== null ? rowFor(operation.beforeKey) : null;
					if (isInsert && operation.beforeKey !== null && !anchor) {
						discardCandidate();
						return false;
					}
					const previousOwner = isInsert ? activationPreviousOwner(operation.key) : previous?.staged ? previous.previousOwner : void 0;
					const candidate = prepareRow(operation.key, operation.value, previous?.owner, isInsert, previousOwner);
					if (!candidate || previous && candidate.hostKey !== previous.hostKey) {
						discardCandidate();
						return false;
					}
					overlay.set(operation.key, candidate);
					operations.push(isInsert ? {
						type: "insert",
						key: candidate.hostKey,
						beforeKey: anchor?.hostKey ?? null,
						tree: candidate.cache.expandedResult
					} : {
						type: "replace",
						key: candidate.hostKey,
						tree: candidate.cache.expandedResult
					});
				}
			}
		} catch {
			discardCandidate();
			this.#collectionSnapshotFallbackKeys.add(regionKey);
			this.#count("collection.delta.render-fallback");
			return false;
		}
		if (!collectionOwnerApiAdmitted(region, parentCache) || region.collection.version !== read.toVersion || this.#storeNotificationGeneration !== storeGenerationAtPrepare || this.#pendingChanges.size > 0) {
			discardCandidate();
			this.#count("collection.delta.stale-candidate");
			return false;
		}
		const capturedDeltaValues = /* @__PURE__ */ new Map();
		for (const candidate of overlay.values()) {
			if (!candidate) continue;
			for (const site of candidate.cache.propBoundSites) {
				const source = this.world.scalarSource(candidate.owner, site);
				if (!source) continue;
				let sites = capturedDeltaValues.get(candidate.owner);
				if (!sites) capturedDeltaValues.set(candidate.owner, sites = /* @__PURE__ */ new Map());
				sites.set(site, source.value);
			}
		}
		if (!prepareCollectionReaderAcknowledgement(region.reader, read.toVersion)) {
			discardCandidate();
			return false;
		}
		let deltaCommitted;
		try {
			deltaCommitted = this.#commitHostMutation(() => this.#vdom.commitKeyedRegionDelta(parentHostKey, region.siteId, operations), true);
		} catch (error) {
			discardCandidate();
			throw error;
		}
		if (!deltaCommitted) {
			this.#abandonDirectHostMutation();
			discardCandidate();
			return false;
		}
		const effectErrors = [];
		const deferredEffects = [];
		try {
			if (!collectionOwnerApiAdmitted(region, parentCache)) throw new Error("Collection public API changed during host application");
			const acknowledge = prepareCollectionReaderAcknowledgement(region.reader, read.toVersion);
			if (!acknowledge) throw new Error("Collection reader cannot accept captured publication");
			if (!this.world.isAlive(region.parentOwner)) throw new Error("Collection parent was removed during host application");
			for (const previous of originalRows.values()) if (!this.world.isAlive(previous.owner)) throw new Error("Collection owner was removed during host application");
			const activations = /* @__PURE__ */ new Map();
			for (const candidate of overlay.values()) {
				if (!candidate) continue;
				if (!this.world.isAlive(candidate.owner) || !componentCodeCurrent(candidate.cache.type)) throw new Error("Collection owner changed during host application");
				if (candidate.staged) activations.set(candidate.owner, this.world.prepareStagedOwnerActivation(candidate.owner, candidate.previousOwner));
			}
			acknowledge();
			for (const [key, candidate] of overlay) {
				const previous = originalRows.get(key);
				if (candidate === null) {
					if (previous) this.#retireCollectionRow(previous.owner, effectErrors, deferredEffects);
					region.rows.delete(key);
					region.hostKeysByCollectionKey.delete(key);
					ownerRegion.outputsByKey.delete(key);
					if (previous) ownerRegion.keysByOwner.delete(previous.owner);
					continue;
				}
				if (candidate.staged) {
					activations.get(candidate.owner)();
					if (candidate.previousOwner !== void 0) this.#retireCollectionRow(candidate.previousOwner, effectErrors, deferredEffects);
				}
				const oldOwner = previous?.owner;
				if (oldOwner !== void 0 && oldOwner !== candidate.owner) {
					this.#retireCollectionRow(oldOwner, effectErrors, deferredEffects);
					ownerRegion.keysByOwner.delete(oldOwner);
				}
				const previousCache = this.#componentCache.get(candidate.owner);
				this.#componentCache.set(candidate.owner, candidate.cache);
				if (!this.#liveOwners.has(candidate.owner)) this.#count("owner.created");
				this.#liveOwners.add(candidate.owner);
				for (const ancestor of this.world.ownerLineage(candidate.owner).slice(1)) {
					const ancestorCache = this.#componentCache.get(ancestor);
					if (ancestorCache?.subtreeOwners instanceof Set && !ancestorCache.subtreeOwners.has(candidate.owner)) {
						ancestorCache.subtreeOwners.add(candidate.owner);
						this.#count("collection.owner-membership-writes");
					}
				}
				if (previousCache) this.#syncOwnerSourceValues(candidate.owner, previousCache, candidate.cache.propBoundSites, capturedDeltaValues.get(candidate.owner));
				else for (const site of candidate.cache.propBoundSites) {
					const source = this.world.scalarSource(candidate.owner, site);
					if (source) {
						this.#sourceValueSyncVisits++;
						this.#lastSourceValues.set(source, capturedDeltaValues.get(candidate.owner)?.get(site) ?? source.value);
					}
				}
				region.rows.set(key, {
					node: candidate.node,
					entry: candidate.cache.collectionEntry
				});
				region.hostKeysByCollectionKey.set(key, candidate.hostKey);
				region.componentSiteId = getComponentSiteId(candidate.cache.type);
				ownerRegion.outputsByKey.set(key, candidate.cache.expandedResult);
				ownerRegion.keysByOwner.set(candidate.owner, key);
				deferredEffects.push(() => {
					effectErrors.push(...this.#reconcileOwnerEffects(candidate.owner, candidate.cache.ownEffects));
				});
				this.#count("collection.rows-prepared");
			}
			const publishedOwners = new Set([...overlay.values()].flatMap((candidate) => candidate ? [candidate.owner] : []));
			for (const owner of [.../* @__PURE__ */ new Set([...stagedOwners, ...newlyAllocatedOwners])]) {
				if (publishedOwners.has(owner)) continue;
				this.world.destroyOwner(owner);
				this.#dropPendingForOwner(owner);
			}
			for (const ancestor of this.world.ownerLineage(region.parentOwner)) {
				const cache = this.#componentCache.get(ancestor);
				if (!cache) continue;
				const keyedRegion = cache.keyedRegion ? {
					...cache.keyedRegion,
					version: createKeyedOwnerVersion()
				} : void 0;
				if (keyedRegion?.collection !== region && keyedRegion) {
					keyedRegion.outputsByKey.clear();
					keyedRegion.keysByOwner.clear();
				}
				this.#componentCache.set(ancestor, {
					...cache,
					result: null,
					expandedResult: null,
					invalidatedByCollection: true,
					...keyedRegion ? { keyedRegion } : {}
				});
			}
			if (region.collection.version === read.toVersion) this.#pendingCollectionRegionKeys.delete(regionKey);
			else {
				this.#pendingCollectionRegionKeys.add(regionKey);
				this.#schedule();
			}
			this.#count("collection.delta-operations", operations.length);
			this.#publishDirectHostMutation();
		} catch (error) {
			if (this.#directPublicationPending) this.#failDirectHostMutation(error);
			throw error;
		}
		try {
			this.#vdom.flushRefs();
		} catch (error) {
			effectErrors.push(error);
		}
		for (const effect of deferredEffects) try {
			effect();
		} catch (error) {
			effectErrors.push(error);
		}
		if (effectErrors.length) throw new AggregateError(effectErrors, "Collection row effect lifecycle failed after VDOM commit");
		return true;
	}
	#retireCollectionRow(owner, errors, deferredEffects) {
		const cache = this.#componentCache.get(owner);
		if (!cache) return;
		const lineage = this.world.ownerLineage(owner).slice(1);
		this.#count("owner.retired");
		if (deferredEffects) deferredEffects.push(() => {
			errors.push(...this.#reconcileOwnerEffects(owner, /* @__PURE__ */ new Map()));
			this.world.destroyOwner(owner);
			this.#dropPendingForOwner(owner);
		});
		else errors.push(...this.#reconcileOwnerEffects(owner, /* @__PURE__ */ new Map()));
		this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
		this.#componentCache.delete(owner);
		this.#liveOwners.delete(owner);
		if (!deferredEffects) {
			this.#dropPendingForOwner(owner);
			this.world.destroyOwner(owner);
		}
		for (const ancestor of lineage) {
			const ancestorCache = this.#componentCache.get(ancestor);
			if (ancestorCache?.subtreeOwners instanceof Set && ancestorCache.subtreeOwners.delete(owner)) this.#count("collection.owner-membership-writes");
		}
	}
	#retireOwnerAccepted(owner) {
		const cache = this.#componentCache.get(owner);
		if (!cache) return;
		const lineage = this.world.ownerLineage(owner).slice(1);
		this.#count("owner.retired");
		this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
		this.#componentCache.delete(owner);
		this.#liveOwners.delete(owner);
		this.#dropPendingForOwner(owner);
		this.world.destroyOwner(owner);
		for (const ancestor of lineage) {
			const ancestorCache = this.#componentCache.get(ancestor);
			if (ancestorCache?.subtreeOwners instanceof Set && ancestorCache.subtreeOwners.delete(owner)) this.#count("collection.owner-membership-writes");
		}
	}
	#forgetOwnerSourceValues(owner, sites) {
		for (const site of sites) {
			const source = this.world.scalarSource(owner, site);
			if (source) this.#lastSourceValues.delete(source);
		}
	}
	#commitHostMutation(commit, deferPublication = false) {
		const direct = !this.#candidateHostCommit;
		if (this.#codeInvalidated) throw new Error("Compiled module changed; remount the root");
		if (direct) this.#vdom.beginPublication();
		let failed = false;
		let primaryFailure;
		this.#hostApplicationDepth++;
		try {
			const result = commit();
			if (this.#disposeRequested) throw new Error("Root disposal was requested during host application");
			if (this.#codeInvalidated) throw new Error("Compiled module changed during host application");
			if (direct) {
				if (deferPublication) this.#directPublicationPending = true;
				else if (result !== false) {
					this.#vdom.publishAccepted();
					this.#publicationVersion++;
				} else this.#vdom.cancelPublication();
			}
			return result;
		} catch (error) {
			failed = true;
			primaryFailure = error;
			if (direct) this.#vdom.failPublication();
			this.#terminalHostFailure ??= error;
			this.#terminalHostFailed = true;
			const cleanup = collectCleanupErrors([() => this.#dropPendingDirectIntent(), () => this.#cancelTerminalResourceWaits()]);
			try {
				return throwWithCleanup(error, cleanup);
			} catch (failure) {
				primaryFailure = failure;
				throw failure;
			}
		} finally {
			this.#hostApplicationDepth--;
			this.#finishDeferredLifetime(failed ? { error: primaryFailure } : void 0);
		}
	}
	#publishDirectHostMutation() {
		if (!this.#directPublicationPending) throw new Error("No direct host publication is pending");
		if (this.#codeInvalidated) this.#failDirectHostMutation(/* @__PURE__ */ new Error("Compiled module changed before publication"));
		this.#vdom.publishAccepted();
		this.#publicationVersion++;
		this.#directPublicationPending = false;
		this.#finishDeferredLifetime();
		if (this.#deferredFlush && !this.#disposed) this.#schedule();
	}
	#abandonDirectHostMutation() {
		if (!this.#directPublicationPending) return;
		this.#vdom.cancelPublication();
		this.#directPublicationPending = false;
		this.#finishDeferredLifetime();
	}
	#failDirectHostMutation(error) {
		this.#vdom.failPublication();
		this.#directPublicationPending = false;
		this.#terminalHostFailure ??= error;
		this.#terminalHostFailed = true;
		this.#terminalFailureKind = "publication";
		const cleanup = collectCleanupErrors([() => this.#dropPendingDirectIntent(), () => this.#cancelTerminalResourceWaits()]);
		this.#finishDeferredLifetime({ error }, cleanup);
		throw error;
	}
	#dropPendingDirectIntent() {
		const intent = this.#pendingDirectIntent;
		this.#pendingDirectIntent = null;
		const release = intent?.releaseStoreLease;
		if (intent) {
			intent.releaseStoreLease = null;
			intent.tree = null;
		}
		release?.();
	}
	#cancelTerminalResourceWaits() {
		const errors = collectCleanupErrors([...this.#liveResourceSubscriptions.values()].map(({ unsubscribe }) => unsubscribe).concat([...this.#publicationIntents.keys()]));
		this.#liveResourceSubscriptions.clear();
		this.#pendingResourceRetry = false;
		this.#pendingBoundaryRetries.clear();
		if (errors.length === 1) throw errors[0];
		if (errors.length) throw new AggregateError(errors, "Resource wait cleanup failed");
	}
	#completeDeferredDispose() {
		if (!this.#disposeRequested || this.#disposed || this.#publicationBarrier || this.#directPublicationPending || this.#nativeCellCutActive || this.#hostApplicationDepth > 0) return;
		this.#disposeRequested = false;
		this.dispose();
	}
	#finishDeferredLifetime(primary, priorErrors = []) {
		const errors = [...priorErrors, ...collectCleanupErrors([() => this.#retireCompiledInterests(), () => this.#completeDeferredDispose()])];
		if (primary) throwWithCleanup(primary.error, errors);
		if (errors.length === 1) throw errors[0];
		if (errors.length) throw new AggregateError(errors, "Deferred lifetime cleanup failed");
	}
	#assertNoPublicationBarrier(operation) {
		if (this.#nativeCellCutActive || this.#hostApplicationDepth > 0 || this.#directPublicationPending) throw new Error(`Cannot ${operation} while a native numeric cell cut is executing`);
		if (this.#publicationBarrier) throw new Error(`Cannot ${operation} while a native root candidate is publishing`);
	}
	#releasePublicationBarrier(candidate) {
		if (this.#publicationBarrier !== candidate) return;
		this.#publicationBarrier = null;
		this.#finishDeferredLifetime();
		const shouldFlush = this.#deferredFlush || this.#hasPendingWork();
		this.#deferredFlush = false;
		if (shouldFlush && !this.#disposed && !this.#disposing && !this.#terminalHostFailed) this.#schedule();
	}
	#hasPendingWork() {
		if (this.#publicationIntents.size > 0) return this.#unheldCellChanges() || this.#unheldCollectionChanges() || [...this.#pendingBoundaryRetries].some((owner) => {
			const cache = this.#componentCache.get(owner);
			if (!cache?.pendingResource) return false;
			const child = Object.getOwnPropertyDescriptor(cache.props, "children")?.value;
			const stores = /* @__PURE__ */ new Set();
			const resources = this.#boundaryResourceDependencies(child, stores);
			return !!resources && !this.#resourceHoldWait(resources, void 0, { stores: [...stores] });
		}) || this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration && this.#partialStoreAttemptGeneration !== this.#storeNotificationGeneration && [...this.#liveStoreSubscriptions.keys()].some((store) => !this.#heldStore(store));
		if (this.#pendingDirectIntent) return this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0 || this.#pendingDirectIntent.attemptedStoreGeneration !== null && this.#storeNotificationGeneration !== this.#pendingDirectIntent.attemptedStoreGeneration;
		return this.#pendingChanges.size > 0 || this.#pendingCollectionRegionKeys.size > 0 || this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0 || this.#storeNotificationGeneration !== this.#committedStoreNotificationGeneration;
	}
	#schedule() {
		if (this.#disposed || this.#codeInvalidated || this.#terminalHostFailed || this.#scheduled) return;
		if (this.#publicationBarrier || this.#hostApplicationDepth > 0 || this.#directPublicationPending || this.#scopedFlushActive) {
			this.#deferredFlush = true;
			return;
		}
		this.#scheduled = true;
		this.#scheduleCommit(() => {
			if (this.#disposed || this.#codeInvalidated || this.#terminalHostFailed || !this.#scheduled) return;
			this.#scheduled = false;
			if (this.#publicationBarrier || this.#hostApplicationDepth > 0 || this.#directPublicationPending || this.#scopedFlushActive) {
				this.#deferredFlush = true;
				return;
			}
			if (this.#hasPendingWork()) this.flush();
		});
	}
	#finishChanges(captured) {
		this.world.clearChangesThrough(captured);
		this.#pendingChanges.clearThrough(captured);
		if (this.#pendingChanges.size > 0) this.#schedule();
	}
	#ownerHasStoreReaders(owner) {
		for (const readerId of this.#liveStoreReaders.keys()) if (this.#readerBelongsToOwner(readerId, owner)) return true;
		return false;
	}
	#syncStoreReaders(transaction, sparseStoreCandidate = false) {
		if (this.#disposed) return;
		const nextReaders = /* @__PURE__ */ new Map();
		for (const [readerId, stores] of transaction.readers) {
			if (sparseStoreCandidate) this.#count("store.sparse.reader-publication-map-visits");
			nextReaders.set(readerId, new Set(stores));
		}
		for (const [readerId, stores] of this.#liveStoreReaders) {
			if (sparseStoreCandidate) this.#count("store.sparse.reader-publication-map-visits");
			const next = nextReaders.get(readerId);
			for (const store of stores) if (!next?.has(store)) store.forgetReader(this.#rootId, readerId);
		}
		this.#liveStoreReaders = nextReaders;
		this.#reconcileStoreSubscriptions(sparseStoreCandidate);
	}
	#reconcileStoreSubscriptions(sparseStoreCandidate = false) {
		if (this.#disposed) return;
		const nextStores = /* @__PURE__ */ new Set();
		for (const stores of this.#liveStoreReaders.values()) {
			if (sparseStoreCandidate) this.#count("store.sparse.subscription-reader-visits");
			for (const store of stores) nextStores.add(store);
		}
		for (const stores of this.#storeDependencyLeases.values()) for (const store of stores) nextStores.add(store);
		for (const [store, unsubscribe] of this.#liveStoreSubscriptions) {
			if (nextStores.has(store)) continue;
			unsubscribe();
			if ((this.#candidateStoreHolds.get(store) ?? 0) === 0) store.detachRoot(this.#rootId);
			this.#liveStoreSubscriptions.delete(store);
		}
		for (const store of nextStores) {
			if (this.#liveStoreSubscriptions.has(store)) continue;
			this.#liveStoreSubscriptions.set(store, store.subscribe(this.#rootId, () => {
				this.#storeNotificationGeneration++;
				this.#schedule();
			}));
		}
	}
	#syncResourceSubscriptions(resources) {
		const wanted = new Set(resources.filter((resource) => resource.status.status === "pending"));
		for (const [resource, subscription] of this.#liveResourceSubscriptions) {
			if (wanted.has(resource)) continue;
			subscription.unsubscribe();
			this.#liveResourceSubscriptions.delete(resource);
		}
		for (const resource of wanted) {
			let boundary = null;
			for (const [owner, cache] of this.#componentCache) {
				if (!cache.nativeBoundary || cache.pendingResource !== resource) continue;
				if (boundary !== null) {
					boundary = null;
					break;
				}
				boundary = owner;
			}
			const existing = this.#liveResourceSubscriptions.get(resource);
			if (existing) {
				existing.boundary = boundary;
				continue;
			}
			const unsubscribe = resource.subscribe(() => {
				const subscription = this.#liveResourceSubscriptions.get(resource);
				subscription?.unsubscribe();
				this.#liveResourceSubscriptions.delete(resource);
				if (!this.#disposed) {
					if (subscription?.boundary !== null && subscription?.boundary !== void 0) this.#pendingBoundaryRetries.add(subscription.boundary);
					else this.#pendingResourceRetry = true;
					this.#schedule();
				}
			});
			this.#liveResourceSubscriptions.set(resource, {
				unsubscribe,
				boundary
			});
		}
	}
	#discardUncommittedStoreRoots(transaction) {
		for (const store of transaction.stores) if (!this.#liveStoreSubscriptions.has(store) && (this.#candidateStoreHolds.get(store) ?? 0) === 0) store.detachRoot(this.#rootId);
	}
	#releaseCandidateStoreHolds(stores) {
		for (const store of stores) {
			const count = this.#candidateStoreHolds.get(store) ?? 0;
			if (count > 1) {
				this.#candidateStoreHolds.set(store, count - 1);
				continue;
			}
			this.#candidateStoreHolds.delete(store);
			if (!this.#liveStoreSubscriptions.has(store)) store.detachRoot(this.#rootId);
		}
	}
	#dropPendingForOwner(owner) {
		this.#pendingChanges.dropOwner(owner);
	}
	#captureOwnerSourceValues(owner, sites) {
		const captured = /* @__PURE__ */ new Map();
		for (const site of sites) {
			const source = this.world.scalarSource(owner, site);
			if (source) captured.set(site, source.value);
		}
		return captured;
	}
	#syncLastSourceValues(caches, captured) {
		if (this.#disposed) return;
		const live = /* @__PURE__ */ new Set();
		for (const [owner, cache] of caches) for (const site of cache.propBoundSites) {
			this.#sourceValueSyncVisits++;
			const source = this.world.scalarSource(owner, site);
			if (!source) continue;
			live.add(source);
			this.#lastSourceValues.set(source, captured ? captured.get(owner)?.get(site) ?? this.#lastSourceValues.get(source) ?? source.value : source.value);
		}
		for (const source of this.#lastSourceValues.keys()) if (!live.has(source)) this.#lastSourceValues.delete(source);
	}
	#syncOwnerSourceValues(owner, previous, nextSites, captured) {
		for (const site of previous.propBoundSites) {
			if (nextSites.has(site)) continue;
			const source = this.world.scalarSource(owner, site);
			if (source) this.#lastSourceValues.delete(source);
		}
		for (const site of nextSites) {
			this.#sourceValueSyncVisits++;
			const source = this.world.scalarSource(owner, site);
			if (source) this.#lastSourceValues.set(source, captured?.get(site) ?? source.value);
		}
	}
	#applyCandidateNumericWrites(writes) {
		const pending = writes.filter((write) => this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source && this.#vdom.hasBoundSource(write.source));
		if (pending.length === 0) return;
		const updates = pending.map(({ source, current }) => [source, current]);
		for (const write of pending) write.source.value = write.previous;
		try {
			this.#vdom.setSources(updates);
		} finally {
			for (const write of pending) if (this.world.isAlive(write.owner) && this.world.version(write.owner, write.site) === write.version && this.world.scalarSource(write.owner, write.site) === write.source) write.source.value = write.current;
		}
	}
	#flushNumericSources(changes, previousValues = this.#lastSourceValues) {
		const pending = [];
		const seenSources = /* @__PURE__ */ new Set();
		for (const change of changes) {
			const source = this.world.scalarSourceForChange(change);
			if (!source) return false;
			const previous = previousValues.get(source);
			if (previous === void 0) return false;
			if (seenSources.has(source)) continue;
			seenSources.add(source);
			pending.push({
				change,
				source,
				previous,
				current: source.value
			});
		}
		const updates = pending.map(({ source, current }) => [source, current]);
		for (const { source, previous } of pending) source.value = previous;
		try {
			const wrote = this.#commitHostMutation(() => this.#vdom.setSources(updates), true);
			try {
				for (const { source, current } of pending) this.#lastSourceValues.set(source, current);
				this.#finishChanges(changes);
				if (this.#directPublicationPending) this.#publishDirectHostMutation();
			} catch (error) {
				if (this.#directPublicationPending) this.#failDirectHostMutation(error);
				throw error;
			}
			return wrote || changes.length > 0;
		} finally {
			for (const write of pending) if (this.world.isAlive(write.change.owner) && this.world.versionForChange(write.change) === write.change.version && this.world.scalarSourceForChange(write.change) === write.source) write.source.value = write.current;
		}
	}
	#clearNumericProgramBuffers() {
		for (let index = 0; index < this.#numericProgramUsedCount; index++) this.#numericProgramSources[index] = void 0;
		this.#numericProgramUsedCount = 0;
	}
	#clearNativeRowBuffers() {
		for (let index = 0; index < this.#nativeRowUsedCount; index++) {
			this.#nativeRowTokens[index] = void 0;
			this.#nativeRowViews[index] = void 0;
		}
		this.#nativeRowUsedCount = 0;
		if (this.#disposed) {
			this.#nativeRowTokens.length = 0;
			this.#nativeRowViews.length = 0;
			this.#nativeChangedRows = /* @__PURE__ */ new Uint32Array(0);
			this.#nativeChangedSlots = /* @__PURE__ */ new Uint32Array(0);
		}
	}
	#acknowledgeNativeCellCut(count) {
		if (this.#disposed) return;
		for (let index = 0; index < count; index++) this.#lastSourceValues.set(this.#numericProgramSources[index], this.#numericProgramCurrentValues[index]);
		this.world.clearCellChangesThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
		this.#pendingChanges.clearNativeThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
	}
	/** Execute one compiler-owned row plan per affected committed owner. */
	#tryCommitNativeRows(count) {
		if (this.#nativeChangedRows.length < count) {
			let capacity = Math.max(16, this.#nativeChangedRows.length);
			while (capacity < count) capacity *= 2;
			this.#nativeChangedRows = new Uint32Array(capacity);
			this.#nativeChangedSlots = new Uint32Array(capacity);
		}
		if (this.#nativeRowEpoch === Number.MAX_SAFE_INTEGER) {
			this.#nativeRowPrograms = /* @__PURE__ */ new WeakMap();
			this.#nativeRowEpoch = 0;
		}
		const epoch = ++this.#nativeRowEpoch;
		let accepted = false;
		try {
			for (let index = 0; index < count; index++) {
				const handle = this.#nativeCellHandles[index];
				const cache = this.#componentCache.get(handle.owner);
				if (!cache) return null;
				const view = this.world.numericRowForCell(handle, this.#nativeCellVersions[index]);
				if (!view || !view.layout.programId) return null;
				let prepared = this.#nativeRowPrograms.get(view.rowIdentity);
				if (!this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) return null;
				if (!prepared) {
					const token = this.#vdom.prepareNumericRowProgram(view);
					if (!token) return null;
					prepared = {
						token,
						epoch: 0,
						index: 0
					};
					this.#nativeRowPrograms.set(view.rowIdentity, prepared);
				}
				if (prepared.epoch !== epoch) {
					prepared.epoch = epoch;
					prepared.index = this.#nativeRowUsedCount++;
					this.#nativeRowTokens[prepared.index] = prepared.token;
					this.#nativeRowViews[prepared.index] = view;
				}
				this.#nativeChangedRows[index] = prepared.index;
				this.#nativeChangedSlots[index] = view.slot;
				this.#numericProgramSources[index] = view.source;
				this.#numericProgramCurrentValues[index] = view.columns[view.slot].values[view.row];
				this.#numericProgramUsedCount = index + 1;
			}
			let declined = false;
			let wrote = this.#commitHostMutation(() => {
				const result = this.#vdom.executePreparedNumericRows(this.#nativeRowTokens, this.#nativeChangedRows, this.#nativeChangedSlots, this.#numericProgramCurrentValues, count);
				if (result === null) {
					declined = true;
					return false;
				}
				return result;
			}, true);
			if (declined) {
				this.#abandonDirectHostMutation();
				for (let index = 0; index < count; index++) {
					const handle = this.#nativeCellHandles[index];
					const cache = this.#componentCache.get(handle.owner);
					if (!cache || !this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) return null;
					const current = this.world.numericRowForCell(handle, this.#nativeCellVersions[index]);
					const prior = this.#nativeRowViews[this.#nativeChangedRows[index]];
					if (!current || current.rowIdentity !== prior.rowIdentity || current.slot !== this.#nativeChangedSlots[index] || current.source !== this.#numericProgramSources[index]) return null;
				}
				for (let index = 0; index < this.#nativeRowUsedCount; index++) {
					const view = this.#nativeRowViews[index];
					const token = this.#vdom.prepareNumericRowProgram(view);
					if (!token) return null;
					this.#nativeRowTokens[index] = token;
					this.#nativeRowPrograms.get(view.rowIdentity).token = token;
				}
				declined = false;
				wrote = this.#commitHostMutation(() => {
					const result = this.#vdom.executePreparedNumericRows(this.#nativeRowTokens, this.#nativeChangedRows, this.#nativeChangedSlots, this.#numericProgramCurrentValues, count);
					if (result === null) {
						declined = true;
						return false;
					}
					return result;
				}, true);
				if (declined) {
					this.#abandonDirectHostMutation();
					return null;
				}
			}
			accepted = true;
			this.#count("numeric.row-batches");
			this.#count("numeric.row-count", this.#nativeRowUsedCount);
			this.#count("numeric.row-cells", count);
			try {
				this.#acknowledgeNativeCellCut(count);
				this.#publishDirectHostMutation();
			} catch (error) {
				if (this.#directPublicationPending) this.#failDirectHostMutation(error);
				throw error;
			}
			return wrote || count > 0;
		} finally {
			this.#clearNativeRowBuffers();
			if (!accepted) this.#clearNumericProgramBuffers();
		}
	}
	/** Capture exact published lane cells; null keeps the existing fallback cut. */
	#tryCommitNativeLanes(count) {
		let accepted = false;
		try {
			for (let index = 0; index < count; index++) {
				const handle = this.#nativeCellHandles[index];
				const cache = this.#componentCache.get(handle.owner);
				if (!cache) return null;
				const lane = this.world.numericLaneForCell(handle, this.#nativeCellVersions[index]);
				if (!lane) return null;
				let prepared = this.#nativeLanePrograms.get(lane);
				if (!this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) return null;
				if (!prepared) {
					const source = this.world.scalarSourceForCell(handle);
					if (!source) return null;
					const token = this.#vdom.prepareNumericCellProgram(source, lane.column, lane.row);
					if (!token) return null;
					prepared = {
						token,
						source
					};
					this.#nativeLanePrograms.set(lane, prepared);
				}
				this.#nativeLaneTokens[index] = prepared.token;
				this.#numericProgramSources[index] = prepared.source;
				this.#numericProgramCurrentValues[index] = lane.column.values[lane.row];
				this.#numericProgramUsedCount = index + 1;
			}
			let declined = false;
			let wrote = this.#commitHostMutation(() => {
				const result = this.#vdom.executePreparedNumericCells(this.#nativeLaneTokens, this.#numericProgramCurrentValues, count);
				if (result === null) {
					declined = true;
					return false;
				}
				return result;
			}, true);
			if (declined) {
				this.#abandonDirectHostMutation();
				declined = false;
				for (let index = 0; index < count; index++) {
					const handle = this.#nativeCellHandles[index];
					const cache = this.#componentCache.get(handle.owner);
					if (!cache || !this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) return null;
					const lane = this.world.numericLaneForCell(handle, this.#nativeCellVersions[index]);
					if (!lane) return null;
					this.#nativeLanePrograms.delete(lane);
					const source = this.world.scalarSourceForCell(handle);
					if (!source) return null;
					const token = this.#vdom.prepareNumericCellProgram(source, lane.column, lane.row);
					if (!token) return null;
					this.#nativeLanePrograms.set(lane, {
						token,
						source
					});
					this.#nativeLaneTokens[index] = token;
					this.#numericProgramSources[index] = source;
				}
				wrote = this.#commitHostMutation(() => {
					const result = this.#vdom.executePreparedNumericCells(this.#nativeLaneTokens, this.#numericProgramCurrentValues, count);
					if (result === null) {
						declined = true;
						return false;
					}
					return result;
				}, true);
				if (declined) {
					this.#abandonDirectHostMutation();
					return null;
				}
			}
			accepted = true;
			this.#count("numeric.lane-batches");
			this.#count("numeric.lane-cells", count);
			try {
				this.#acknowledgeNativeCellCut(count);
				this.#publishDirectHostMutation();
			} catch (error) {
				if (this.#directPublicationPending) this.#failDirectHostMutation(error);
				throw error;
			}
			return wrote || count > 0;
		} finally {
			if (!accepted) this.#clearNumericProgramBuffers();
		}
	}
	/** Snapshot-free route for a fully native, compiler-approved numeric cut. */
	#tryFlushNativeCellCut() {
		const capacity = this.#pendingChanges.size;
		if (this.#nativeCellHandles.length < capacity) {
			this.#nativeCellHandles.length = capacity;
			this.#nativeCellVersions.length = capacity;
		}
		if (this.#nativeLaneTokens.length < capacity) this.#nativeLaneTokens.length = capacity;
		const count = this.#pendingChanges.captureNative(this.#nativeCellHandles, this.#nativeCellVersions);
		if (count === null || count === 0) {
			this.#clearNativeCellCutBuffers();
			return false;
		}
		this.#nativeCellCutActive = true;
		let committed = false;
		try {
			const rowCommit = this.#tryCommitNativeRows(count);
			if (rowCommit !== null) {
				committed = rowCommit;
				return committed;
			}
			const laneCommit = this.#tryCommitNativeLanes(count);
			if (laneCommit !== null) {
				committed = laneCommit;
				return committed;
			}
			for (let index = 0; index < count; index++) {
				const handle = this.#nativeCellHandles[index];
				const version = this.#nativeCellVersions[index];
				const cache = this.#componentCache.get(handle.owner);
				const source = this.world.scalarSourceForCell(handle);
				const currentVersion = this.world.versionForCell(handle);
				if (!cache || !this.#compiledPropSitesForCache(handle.owner, cache).has(handle.site) || !source || !this.#lastSourceValues.has(source) || !this.#vdom.hasSourceProgram(source) || currentVersion !== version) return false;
				this.#numericProgramSources[index] = source;
				this.#numericProgramCurrentValues[index] = source.value;
				this.#numericProgramPreviousValues[index] = this.#lastSourceValues.get(source);
				this.#numericProgramUsedCount = index + 1;
			}
			this.#count("numeric.program-source-buffer-capacity", this.#numericProgramSources.length);
			if (this.#invalidation) {
				for (let index = 0; index < count; index++) {
					const slot = this.#invalidation.sourceSlots.get(this.#nativeCellHandles[index].site);
					if (slot !== void 0) this.#invalidation.dispatcher.invalidateSourceSlot(slot);
				}
				this.#invalidation.dispatcher.flush(() => {});
			}
			for (let index = 0; index < count; index++) this.#numericProgramSources[index].value = this.#numericProgramPreviousValues[index];
			try {
				const wrote = this.#commitHostMutation(() => this.#vdom.executeSourceProgram(this.#numericProgramSources, this.#numericProgramCurrentValues, count), true);
				try {
					for (let index = 0; index < count; index++) {
						const source = this.#numericProgramSources[index];
						this.#lastSourceValues.set(source, this.#numericProgramCurrentValues[index]);
					}
					this.world.clearCellChangesThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
					this.#pendingChanges.clearNativeThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
					this.#publishDirectHostMutation();
				} catch (error) {
					if (this.#directPublicationPending) this.#failDirectHostMutation(error);
					throw error;
				}
				committed = wrote || count > 0;
				return committed;
			} finally {
				for (let index = 0; index < count; index++) {
					const handle = this.#nativeCellHandles[index];
					const source = this.#numericProgramSources[index];
					if (!this.#disposed && this.world.versionForCell(handle) === this.#nativeCellVersions[index] && this.world.scalarSourceForCell(handle) === source) source.value = this.#numericProgramCurrentValues[index];
				}
			}
		} finally {
			this.#clearNumericProgramBuffers();
			this.#clearNativeCellCutBuffers(count);
			this.#nativeCellCutActive = false;
			this.#finishDeferredLifetime();
			if (this.#disposed) {
				this.#nativeCellHandles.length = 0;
				this.#nativeCellVersions.length = 0;
				this.#nativeLaneTokens.length = 0;
				this.#numericProgramSources.length = 0;
				this.#numericProgramCurrentValues.length = 0;
				this.#numericProgramPreviousValues.length = 0;
			} else if (!this.#terminalHostFailed && (this.#deferredFlush || committed && this.#hasPendingWork())) {
				this.#deferredFlush = false;
				this.#schedule();
			}
		}
	}
	#clearNativeCellCutBuffers(count = this.#nativeCellHandles.length) {
		for (let index = 0; index < count; index++) {
			this.#nativeCellHandles[index] = void 0;
			this.#nativeCellVersions[index] = 0;
			this.#nativeLaneTokens[index] = void 0;
		}
	}
	#expand(node, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, path, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch = false, boundaryHostScope, collectionEntry) {
		if (node == null || node === false || typeof node === "string" || typeof node === "number") return node;
		if (Array.isArray(node)) {
			const regionId = getKeyedOwnerRegionId(node);
			const version = getKeyedOwnerVersion(node);
			const collectionDescriptor = version === null ? void 0 : collectionRegionDescriptors.get(version);
			const outputsByKey = version === null || this.#keyedOwnerReuseMode !== "token" && !collectionDescriptor ? null : /* @__PURE__ */ new Map();
			const keysByOwner = outputsByKey ? /* @__PURE__ */ new Map() : null;
			let regionSiteId = collectionDescriptor?.componentSiteId ?? null;
			let validRegion = outputsByKey !== null;
			const siteOrdinals = /* @__PURE__ */ new Map();
			let changed = false;
			const collectionKeys = collectionDescriptor ? [...collectionDescriptor.rows.keys()] : [];
			const siblingPending = [];
			const children = node.map((child, index) => {
				const childPath = `${path}/${index}`;
				const siteId = child && !Array.isArray(child) && typeof child === "object" && child.type === Suspense ? `@suspense:${String(child.props.__nativeBoundarySite ?? "anonymous")}` : child && !Array.isArray(child) && typeof child === "object" && typeof child.type === "function" ? getComponentSiteId(child.type) : "";
				const ordinal = siteId ? siteOrdinals.get(siteId) ?? 0 : 0;
				if (siteId) siteOrdinals.set(siteId, ordinal + 1);
				const journalMark = protectedBranch ? expansionJournal?.checkpoint() : void 0;
				const ownerMark = protectedBranch ? ownerPreparation?.checkpoint() : void 0;
				const storeMark = protectedBranch ? storeTransaction.checkpoint() : void 0;
				let expanded;
				try {
					expanded = this.#expand(child, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, siteId ? `${childPath}#${ordinal}` : childPath, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionDescriptor?.siteId ?? collectionOwnerScope, collectionDescriptor ? !siteId ? collectionKeys[index] : void 0 : collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, false, void 0, collectionDescriptor?.rows.get(collectionKeys[index])?.entry);
				} catch (error) {
					if (!isPendingResource(error) && !(error instanceof ResourceRejection)) throw error;
					if (storeMark === void 0) throw error;
					const branchReaders = storeMark === void 0 ? /* @__PURE__ */ new Map() : storeTransaction.readersSince(storeMark);
					if (ownerMark) ownerPreparation?.rollbackTo(ownerMark);
					if (storeMark !== void 0) {
						storeTransaction.rollbackTo(storeMark);
						if (branchReaders.size) storeTransaction.preserveCapturedReaders(branchReaders);
					}
					if (journalMark !== void 0) expansionJournal?.rollback(journalMark);
					if (error instanceof ResourceRejection) throw error;
					siblingPending.push(error);
					return child;
				} finally {
					if (storeMark !== void 0) storeTransaction.releaseCheckpoint(storeMark);
					if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
				}
				if (expanded !== child) changed = true;
				if (outputsByKey && regionId !== null) {
					if (!child || Array.isArray(child) || typeof child !== "object" || typeof child.type !== "function") validRegion = false;
					else {
						const childSiteId = getComponentSiteId(child.type);
						const rawKey = child.props.key;
						if ((collectionDescriptor ? regionSiteId !== null && regionSiteId !== childSiteId : childSiteId !== regionId) || rawKey == null || regionSiteId !== null && regionSiteId !== childSiteId) validRegion = false;
						else {
							regionSiteId = childSiteId;
							const key = String(rawKey);
							const owner = ownerPreparation?.findOwner?.(parentOwner, collectionDescriptor ? collectionOwnerSite(collectionDescriptor.siteId, childSiteId) : childSiteId, key) ?? (ownerPreparation ? void 0 : this.world.findOwner(parentOwner, collectionDescriptor ? collectionOwnerSite(collectionDescriptor.siteId, childSiteId) : childSiteId, key));
							if (outputsByKey.has(key) || owner === void 0) validRegion = false;
							else {
								outputsByKey.set(key, expanded);
								keysByOwner?.set(owner, key);
							}
						}
					}
				}
				return expanded;
			});
			if (siblingPending.length) throw siblingPending[0];
			let collectedCollection;
			if (collectionDescriptor && collectionDescriptor.siteId === regionId && collectionDescriptor.rows.size === children.length) {
				const hostKeysByCollectionKey = /* @__PURE__ */ new Map();
				const liveRows = /* @__PURE__ */ new Map();
				let index = 0;
				for (const collectionKey of collectionDescriptor.rows.keys()) {
					liveRows.set(collectionKey, {
						node: node[index],
						entry: collectionDescriptor.rows.get(collectionKey)?.entry
					});
					const hostKey = singleHostRootKey(children[index++] ?? null);
					if (hostKey !== null) hostKeysByCollectionKey.set(collectionKey, hostKey);
				}
				collectedCollection = {
					...collectionDescriptor,
					rows: liveRows,
					parentOwner,
					parentHostKey: null,
					hostKeysByCollectionKey
				};
				if (this.#collectedCollectionRegions) {
					if (expansionJournal) expansionJournal.set(this.#collectedCollectionRegions, `${parentOwner}\u0000${collectedCollection.siteId}`, collectedCollection);
					else this.#collectedCollectionRegions.set(`${parentOwner}\u0000${collectedCollection.siteId}`, collectedCollection);
				}
			}
			if (validRegion && outputsByKey && regionId !== null && version !== null && (regionSiteId !== null || collectionDescriptor !== void 0) && outputsByKey.size === node.length) {
				const collected = {
					regionId,
					version,
					componentSiteId: regionSiteId ?? collectionDescriptor?.componentSiteId ?? "",
					outputsByKey,
					keysByOwner,
					...collectedCollection && !collectedCollection.requiresOwnerRender && collectedCollection.componentSiteId ? { collection: collectedCollection } : {}
				};
				if (this.#collectedKeyedRegions) {
					if (expansionJournal) expansionJournal.set(this.#collectedKeyedRegions, parentOwner, collected);
					else this.#collectedKeyedRegions.set(parentOwner, collected);
				}
			}
			return changed ? copyKeyedOwnerMetadata(node, children) : node;
		}
		if (node.type === Suspense) {
			this.#everHadNativeBoundary = true;
			const props = node.props;
			const siteId = props.__nativeBoundarySite || `@runtime-suspense:${path}`;
			const lastSegment = path.slice(path.lastIndexOf("/") + 1);
			const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
			const identityKey = props.key == null ? `@slot:${siteId}:${ordinal}` : String(props.key);
			const ownerSite = `\u0000native-suspense:${siteId}`;
			const priorBoundaryOwner = ownerPreparation ? ownerPreparation.findOwner(parentOwner, ownerSite, identityKey) : this.world.findOwner(parentOwner, ownerSite, identityKey);
			const boundaryOwner = ownerPreparation ? ownerPreparation.resolveOwner(parentOwner, ownerSite, identityKey) : this.world.resolveOwner(parentOwner, ownerSite, identityKey);
			if (!priorBoundaryOwner && !ownerPreparation && expansionJournal) expansionJournal.undo(() => {
				if (this.world.isAlive(boundaryOwner)) this.world.destroyOwner(boundaryOwner);
			});
			if (!this.#liveOwners.has(boundaryOwner)) {
				if (expansionJournal) expansionJournal.push(createdOwners, boundaryOwner);
				else createdOwners.push(boundaryOwner);
			}
			if (expansionJournal) expansionJournal.add(nextOwners, boundaryOwner);
			else nextOwners.add(boundaryOwner);
			if (!subtreeOwnersByOwner.has(boundaryOwner)) {
				if (expansionJournal) expansionJournal.set(subtreeOwnersByOwner, boundaryOwner, /* @__PURE__ */ new Set([boundaryOwner]));
				else subtreeOwnersByOwner.set(boundaryOwner, /* @__PURE__ */ new Set([boundaryOwner]));
			}
			for (const ancestor of ownerPath) {
				const descendants = subtreeOwnersByOwner.get(ancestor);
				if (descendants) {
					if (expansionJournal) expansionJournal.add(descendants, boundaryOwner);
					else descendants.add(boundaryOwner);
				}
			}
			const boundaryKey = String(boundaryOwner);
			if (boundaryState && !boundaryState.visited.has(boundaryKey)) {
				boundaryState.visited.add(boundaryKey);
				expansionJournal?.undo(() => boundaryState.visited.delete(boundaryKey));
			}
			const branchJournal = expansionJournal ?? new ExpansionJournal();
			const recordBoundaryOutput = (output, pendingResource) => {
				const cache = {
					type: Suspense,
					hostKeyScope: identityKey,
					props: { ...props },
					result: props.children ?? null,
					expandedResult: output,
					subtreeOwners: new Set(subtreeOwnersByOwner.get(boundaryOwner) ?? [boundaryOwner]),
					ownEffects: /* @__PURE__ */ new Map(),
					propBoundSites: /* @__PURE__ */ new Set(),
					nativeBoundary: true,
					...pendingResource ? { pendingResource } : {}
				};
				if (expansionJournal) expansionJournal.set(nextComponentCache, boundaryOwner, cache);
				else nextComponentCache.set(boundaryOwner, cache);
				return output;
			};
			const heldBoundary = boundaryState?.held?.boundaries.get(boundaryOwner);
			if (heldBoundary) {
				const accepted = heldBoundary.cache;
				if (this.#componentCache.get(boundaryOwner) !== accepted || !sameClosedBoundaryProps(node, accepted.props) || !accepted.nativeBoundary || accepted.pendingResource !== heldBoundary.resource || [...accepted.subtreeOwners].some((owner) => !this.#liveOwners.has(owner) || !this.#componentCache.has(owner))) {
					boundaryState.blocked = true;
					return accepted.expandedResult;
				}
				const heldOwners = accepted.subtreeOwners;
				for (const heldOwner of heldOwners) {
					const cache = this.#componentCache.get(heldOwner);
					nextOwners.add(heldOwner);
					nextComponentCache.set(heldOwner, cache);
					for (const [key, effect] of cache.ownEffects) nextEffects.set(key, effect);
					if (cache.nativeBoundary) boundaryState.visited.add(String(heldOwner));
					for (const ancestor of ownerPath) subtreeOwnersByOwner.get(ancestor)?.add(heldOwner);
				}
				const heldReaders = /* @__PURE__ */ new Map();
				for (const [readerId, stores] of this.#liveStoreReaders) if ([...heldOwners].some((owner) => this.#readerBelongsToOwner(readerId, owner))) heldReaders.set(readerId, stores);
				storeTransaction.preserveReaders(heldReaders);
				boundaryState.retained.add(boundaryOwner);
				return accepted.expandedResult;
			}
			const storeMark = storeTransaction.checkpoint();
			const ownerMark = ownerPreparation?.checkpoint();
			const journalMark = branchJournal.checkpoint();
			ownerPath.push(boundaryOwner);
			try {
				const primary = this.#expand(props.children ?? null, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, branchJournal, boundaryPrimaries, boundaryState, true, boundaryOwner);
				if (boundaryPrimaries) {
					const snapshot = { tree: props.children ?? null };
					if (expansionJournal) expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
					else boundaryPrimaries.set(boundaryKey, snapshot);
				}
				storeTransaction.releaseCheckpoint(storeMark);
				if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
				return recordBoundaryOutput(primary);
			} catch (error) {
				if (!isPendingResource(error) && !(error instanceof ResourceRejection)) {
					storeTransaction.releaseCheckpoint(storeMark);
					if (ownerMark) ownerPreparation?.releaseCheckpoint(ownerMark);
					throw error;
				}
				const suspendedReaders = storeTransaction.readersSince(storeMark);
				storeTransaction.rollbackTo(storeMark);
				storeTransaction.releaseCheckpoint(storeMark);
				if (ownerMark) {
					ownerPreparation?.rollbackTo(ownerMark);
					ownerPreparation?.releaseCheckpoint(ownerMark);
				}
				branchJournal.rollback(journalMark);
				if (suspendedReaders.size) {
					const pendingReaderDependencies = new Map([...suspendedReaders].map(([readerId, stores]) => [`\u0000suspense-pending:${boundaryKey}:${readerId}`, stores]));
					storeTransaction.preserveCapturedReaders(pendingReaderDependencies);
				}
				const previous = boundaryPrimaries?.get(boundaryKey);
				if (isPendingResource(error) && previous) {
					const retainedStoreMark = storeTransaction.checkpoint();
					const retainedOwnerMark = ownerPreparation?.checkpoint();
					const retainedJournalMark = branchJournal.checkpoint();
					try {
						const retained = this.#expand(previous.tree, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense-retained:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, branchJournal, boundaryPrimaries, boundaryState, true, boundaryOwner);
						storeTransaction.releaseCheckpoint(retainedStoreMark);
						if (retainedOwnerMark) ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
						return recordBoundaryOutput(retained);
					} catch (retainedError) {
						if (!isPendingResource(retainedError) && !(retainedError instanceof ResourceRejection)) {
							storeTransaction.releaseCheckpoint(retainedStoreMark);
							if (retainedOwnerMark) ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
							throw retainedError;
						}
					}
					if (retainedOwnerMark) {
						ownerPreparation?.rollbackTo(retainedOwnerMark);
						ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
					}
					storeTransaction.rollbackTo(retainedStoreMark);
					storeTransaction.releaseCheckpoint(retainedStoreMark);
					branchJournal.rollback(retainedJournalMark);
					if (boundaryState) boundaryState.blocked = true;
					return null;
				}
				const fallback = error instanceof ResourceRejection ? props.error?.(error.reason) ?? null : props.pending ?? props.fallback ?? null;
				const expandedFallback = this.#expand(fallback, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense-fallback:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch, boundaryOwner);
				if (error instanceof ResourceRejection && boundaryPrimaries) {
					const snapshot = { tree: fallback };
					if (expansionJournal) expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
					else boundaryPrimaries.set(boundaryKey, snapshot);
				}
				return recordBoundaryOutput(expandedFallback, isPendingResource(error) ? error.resource : void 0);
			} finally {
				ownerPath.pop();
				if (!expansionJournal) branchJournal.clear();
			}
		}
		if (typeof node.type === "function") {
			if (!componentCodeCurrent(node.type)) throw new Error("Compiled component revision is obsolete; remount with current code");
			if (this.#activeCounters) this.#count("owner.component-visits");
			const siteId = getComponentSiteId(node.type);
			const lastSegment = path.slice(path.lastIndexOf("/") + 1);
			const ownerKey = keyedIdentity(node, siteId, Number(lastSegment.split("#").at(-1)) || 0);
			let key = boundaryHostScope === void 0 ? String(ownerKey) : `${boundaryHostScope}\u0000${String(ownerKey)}`;
			const ownerSite = collectionOwnerScope ? collectionOwnerSite(collectionRowScopeKey === void 0 ? collectionOwnerScope : `${collectionOwnerScope}#row:${collectionRowScopeKey}`, siteId) : siteId;
			const acceptedOwner = collectionOwnerScope && collectionEntry && ownerPreparation ? ownerPreparation.findOwner(parentOwner, ownerSite, ownerKey) : void 0;
			const acceptedEntry = acceptedOwner === void 0 ? void 0 : this.#componentCache.get(acceptedOwner)?.collectionEntry;
			if (acceptedEntry !== void 0 && collectionEntry !== void 0 && acceptedEntry !== collectionEntry) ownerPreparation?.replaceOwner(parentOwner, ownerSite, ownerKey);
			const priorOwner = ownerPreparation ? void 0 : this.world.findOwner(parentOwner, ownerSite, ownerKey);
			const owner = ownerPreparation ? ownerPreparation.resolveOwner(parentOwner, ownerSite, ownerKey) : this.world.resolveOwner(parentOwner, ownerSite, ownerKey);
			if (!ownerPreparation && priorOwner === void 0 && expansionJournal) expansionJournal.undo(() => {
				if (this.world.isAlive(owner)) this.world.destroyOwner(owner);
			});
			if (!this.#liveOwners.has(owner)) {
				if (expansionJournal) expansionJournal.push(createdOwners, owner);
				else createdOwners.push(owner);
				if (this.#activeCounters) this.#count("owner.created");
			}
			if (expansionJournal) expansionJournal.add(nextOwners, owner);
			else nextOwners.add(owner);
			if (!subtreeOwnersByOwner.has(owner)) {
				if (expansionJournal) expansionJournal.set(subtreeOwnersByOwner, owner, /* @__PURE__ */ new Set([owner]));
				else subtreeOwnersByOwner.set(owner, /* @__PURE__ */ new Set([owner]));
			}
			for (const ancestor of ownerPath) {
				const descendants = subtreeOwnersByOwner.get(ancestor);
				if (descendants) {
					if (expansionJournal) expansionJournal.add(descendants, owner);
					else descendants.add(owner);
				}
			}
			const { key: _key, ref: _ref, ...componentProps } = node.props;
			ownNumericOwnerProps(node.type, node, componentProps);
			const collectionPropsOwned = ownCollectionOwnerProps(node.type, node, componentProps);
			const numericPropsAdmitted = numericOwnerPropsAdmitted(node.type, componentProps, isRuntimeOwnedElement(node));
			const cached = this.#componentCache.get(owner);
			const scopeExplicitHostKeys = cached?.scopeExplicitHostKeys === true || collectionEntry !== void 0 && acceptedOwner !== void 0 && acceptedOwner !== owner;
			if (collectionEntry !== void 0) {
				if (cached?.hostKeyScope !== void 0) key = String(cached.hostKeyScope);
				else if (acceptedOwner !== void 0 && acceptedOwner !== owner) key = `${key}\u0000owner:${owner}`;
			}
			const propsUnchanged = cached !== void 0 && cached.numericPropsAdmitted === numericPropsAdmitted && cached.collectionPropsOwned === collectionPropsOwned && shallowEqual(cached.props, componentProps);
			const shouldRender = forceRender || dirtyOwners.has(owner) || !cached || cached.invalidatedByCollection === true || cached.type !== node.type || !propsUnchanged;
			ownerPath.push(owner);
			try {
				if (!shouldRender && cached && !relevantOwners.has(owner) && !cached.invalidatedBySparseStore) {
					if (this.#activeCounters) this.#count("owner.cached-reused", cached.subtreeOwners.size);
					for (const cachedOwner of cached.subtreeOwners) {
						if (expansionJournal) expansionJournal.add(nextOwners, cachedOwner);
						else nextOwners.add(cachedOwner);
						const childCache = this.#componentCache.get(cachedOwner);
						if (!childCache) throw new Error(`Missing component cache for owner ${cachedOwner}`);
						if (expansionJournal) expansionJournal.set(nextComponentCache, cachedOwner, childCache);
						else nextComponentCache.set(cachedOwner, childCache);
						if (childCache.nativeBoundary && boundaryState) {
							const boundaryKey = String(cachedOwner);
							if (!boundaryState.visited.has(boundaryKey)) {
								if (expansionJournal) expansionJournal.add(boundaryState.visited, boundaryKey);
								else boundaryState.visited.add(boundaryKey);
							}
						}
						for (const [registeredKey, effect] of childCache.ownEffects) if (expansionJournal) expansionJournal.set(nextEffects, registeredKey, effect);
						else nextEffects.set(registeredKey, effect);
						if (cachedOwner !== owner) for (const ancestor of ownerPath) {
							const descendants = subtreeOwnersByOwner.get(ancestor);
							if (descendants) {
								if (expansionJournal) expansionJournal.add(descendants, cachedOwner);
								else descendants.add(cachedOwner);
							}
						}
					}
					return cached.expandedResult;
				}
				let result = cached?.result;
				let ownEffects = cached?.ownEffects;
				let propBoundSites = cached?.propBoundSites ?? /* @__PURE__ */ new Set();
				let numericStateAdmitted = cached?.numericStateAdmitted === true;
				if (shouldRender) {
					const prepared = cached?.numericPropsAdmitted === numericPropsAdmitted && cached?.collectionPropsOwned === collectionPropsOwned && (cached?.collectionPropsOwned !== true || propsUnchanged) ? this.#preparedRenders.get(owner) ?? null : null;
					if (prepared) {
						result = prepared.result;
						ownEffects = prepared.ownEffects;
						propBoundSites = prepared.propBoundSites;
						numericStateAdmitted = prepared.numericStateAdmitted;
						for (const [registeredKey, effect] of ownEffects) if (expansionJournal) expansionJournal.set(nextEffects, registeredKey, effect);
						else nextEffects.set(registeredKey, effect);
					} else {
						ownEffects = /* @__PURE__ */ new Map();
						const nextPropBoundSites = /* @__PURE__ */ new Set();
						propBoundSites = nextPropBoundSites;
						const activeOwner = {
							world: ownerPreparation ?? this.world,
							owner,
							numericStateReadsPrimitive: true,
							collectionPropsOwned,
							collectionProps: componentProps,
							collectionSites: closedCollectionSitesFor(node.type),
							stateLayout: numericOwnerPropsAdmitted(node.type, componentProps, isRuntimeOwnedElement(node)) ? compiledStateLayoutFor(node.type) : void 0,
							propBoundSites: nextPropBoundSites,
							readStore: (storeSiteId, source) => storeTransaction.read(source, `${owner}\u0000${storeSiteId}`),
							readResource: (source) => {
								if (!resourceReads) throw new Error("Resource reads require a root resource candidate");
								this.#everReadResource = true;
								return resourceReads.read(source);
							},
							captureBinding,
							registerEffect: (effectSiteId, setup) => {
								if (effectSiteId.length === 0) throw new Error("Effect site ID must not be empty");
								if (typeof setup !== "function") throw new Error("Effect setup must be a function");
								const key = effectKey(owner, effectSiteId);
								if (nextEffects.has(key)) throw new Error(`Effect site ${effectSiteId} was registered more than once for owner ${owner}`);
								const registration = {
									owner,
									siteId: effectSiteId,
									setup
								};
								if (expansionJournal) expansionJournal.set(nextEffects, key, registration);
								else nextEffects.set(key, registration);
								ownEffects.set(key, registration);
							}
						};
						activeOwners.push(activeOwner);
						try {
							if (this.#activeCounters) this.#count("owner.component-renders");
							result = node.type(componentProps);
						} finally {
							activeOwners.pop();
						}
						numericStateAdmitted = activeOwner.numericStateReadsPrimitive;
						result = carryHostKeys(result, key, "0", void 0, scopeExplicitHostKeys);
					}
				} else if (ownEffects) for (const [registeredKey, effect] of ownEffects) if (expansionJournal) expansionJournal.set(nextEffects, registeredKey, effect);
				else nextEffects.set(registeredKey, effect);
				const expandedResult = this.#expand(result ?? null, owner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, void 0, void 0, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch);
				const collectedKeyedRegion = this.#collectedKeyedRegions?.get(owner);
				const collectionRegion = collectedKeyedRegion?.collection;
				if (collectionRegion) {
					const completeRegion = {
						...collectionRegion,
						parentHostKey: singleHostRootKey(expandedResult)
					};
					if (this.#collectedCollectionRegions) {
						if (expansionJournal) expansionJournal.set(this.#collectedCollectionRegions, `${owner}\u0000${completeRegion.siteId}`, completeRegion);
						else this.#collectedCollectionRegions.set(`${owner}\u0000${completeRegion.siteId}`, completeRegion);
					}
					const updatedRegion = {
						...collectedKeyedRegion,
						collection: completeRegion
					};
					if (this.#collectedKeyedRegions) {
						if (expansionJournal) expansionJournal.set(this.#collectedKeyedRegions, owner, updatedRegion);
						else this.#collectedKeyedRegions.set(owner, updatedRegion);
					}
				}
				const componentCache = {
					type: node.type,
					hostKeyScope: key,
					scopeExplicitHostKeys,
					props: componentProps,
					numericPropsAdmitted,
					numericStateAdmitted,
					collectionEntry,
					collectionPropsOwned,
					result: result ?? null,
					expandedResult,
					subtreeOwners: subtreeOwnersByOwner.get(owner) ?? /* @__PURE__ */ new Set([owner]),
					ownEffects: ownEffects ?? /* @__PURE__ */ new Map(),
					propBoundSites,
					...this.#collectedKeyedRegions?.get(owner) ? { keyedRegion: this.#collectedKeyedRegions.get(owner) } : {}
				};
				if (expansionJournal) expansionJournal.set(nextComponentCache, owner, componentCache);
				else nextComponentCache.set(owner, componentCache);
				return expandedResult;
			} finally {
				ownerPath.pop();
			}
		}
		const children = this.#expand(node.props.children, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/${node.type === Fragment ? "fragment" : node.type}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState);
		return children === node.props.children ? node : copyRuntimeElement(node.type, {
			...node.props,
			children
		});
	}
	#assertActive() {
		if (this.#codeInvalidated) throw new Error("Compiled module changed; remount the root");
		if (this.#disposed) throw new Error("ComponentStateRoot is disposed");
		if (this.#disposeRequested) throw new Error("ComponentStateRoot disposal is pending publication");
		if (this.#terminalHostFailed) throw new Error(this.#terminalFailureKind === "host" ? "ComponentStateRoot cannot continue after a host commit failure" : "ComponentStateRoot cannot continue after partial publication", { cause: this.#terminalHostFailure });
	}
};
var shallowEqual = (left, right) => {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;
	for (const key of leftKeys) if (!Object.hasOwn(right, key) || !Object.is(left[key], right[key])) return false;
	return true;
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+..+..+Volumes+Depot+Developer+r3act+implementation+2026_6e5e772f357a3d442390898016ad88eb/node_modules/@r3act/core/dist/src/native_runtime_api.js
/** Public native author API; `jsx` uses the classic variadic factory ABI. */
var createDOMRoot = (container, options = {}) => new ComponentStateRoot(new DOMVDOMHost(), container, options);
var initialRows = () => Array.from({ length: 256 }, (_, id) => id);
var editedRows = () => [
	...initialRows().slice(2),
	256,
	0
];
//#endregion
//#region native_arm.tsx
registerCompiledSemanticPlan({
	"schema_version": 1,
	"source_file": "native_arm.tsx",
	"module_revision": "native-v1-b96d11cb46cb9e95",
	"owners": [
		{
			"site_id": "native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native_arm.tsx#component:Detail",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native_arm.tsx#component:DetailFallback",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native_arm.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native_arm.tsx#component:HealthFallback",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native_arm.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native_arm.tsx#component:Rows",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "native_arm.tsx#component:Detail#store:0",
			"owner_site_id": "native_arm.tsx#component:Detail",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native_arm.tsx#component:Health#store:0",
			"owner_site_id": "native_arm.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native_arm.tsx#component:Row#state:0",
			"owner_site_id": "native_arm.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "native_arm.tsx#component:Row#store:0",
			"owner_site_id": "native_arm.tsx#component:Row",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native_arm.tsx#component:Rows#store:0",
			"owner_site_id": "native_arm.tsx#component:Rows",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": "native_arm.tsx#opaque-sink:1529",
		"owner_site_id": "native_arm.tsx#component:Row",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": "native_arm.tsx#component:Detail#store:0",
			"owner_site_id": "native_arm.tsx#component:Detail",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native_arm.tsx#component:DetailFallback#effect:0",
			"owner_site_id": "native_arm.tsx#component:DetailFallback",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native_arm.tsx#component:Health#store:0",
			"owner_site_id": "native_arm.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native_arm.tsx#component:HealthFallback#effect:0",
			"owner_site_id": "native_arm.tsx#component:HealthFallback",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native_arm.tsx#component:Row#store:0",
			"owner_site_id": "native_arm.tsx#component:Row",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native_arm.tsx#component:Row#effect:0",
			"owner_site_id": "native_arm.tsx#component:Row",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native_arm.tsx#component:Rows#store:0",
			"owner_site_id": "native_arm.tsx#component:Rows",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
defineComponent("native_arm.tsx#component:App", App, { propOnlySites: [] });
defineComponent("native_arm.tsx#component:Detail", Detail, { propOnlySites: [] });
defineComponent("native_arm.tsx#component:DetailFallback", DetailFallback, {
	propOnlySites: [],
	hostLeafOutput: true
});
defineComponent("native_arm.tsx#component:Health", Health, { propOnlySites: [] });
defineComponent("native_arm.tsx#component:HealthFallback", HealthFallback, {
	propOnlySites: [],
	hostLeafOutput: true
});
defineComponent("native_arm.tsx#component:Row", Row, { propOnlySites: [] });
defineComponent("native_arm.tsx#component:Rows", Rows, { propOnlySites: [] });
function deferred() {
	let resolve;
	return {
		promise: new Promise((done) => {
			resolve = done;
		}),
		resolve
	};
}
function createDomain() {
	const detail = deferred();
	const health = deferred();
	return {
		stepStore: createAsyncStore(0),
		itemsStore: createAsyncStore(initialRows()),
		detail,
		health,
		detailResource: new AsyncResource(detail.promise),
		healthResource: new AsyncResource(health.promise),
		counts: {
			rowSetups: 0,
			rowCleanups: 0,
			detailFallbackSetups: 0,
			detailFallbackCleanups: 0,
			healthFallbackSetups: 0,
			healthFallbackCleanups: 0
		}
	};
}
function Row(props) {
	const step = useAt("native_arm.tsx#component:Row#store:0", props.domain.stepStore);
	const [local, setLocal] = useStateAt("native_arm.tsx#component:Row#state:0", 0);
	useEffectAt("native_arm.tsx#component:Row#effect:0", () => {
		props.domain.counts.rowSetups++;
		return () => {
			props.domain.counts.rowCleanups++;
		};
	});
	return /* @__PURE__ */ jsx("button", {
		"data-row": props.id,
		"data-step": step,
		"data-local": local,
		style: {
			transform: `translateX(${(step + props.id) % 128}px)`,
			opacity: ((step + props.id) % 10 + 1) / 10
		},
		onClick: () => setLocal((previous) => previous + 1)
	}, `${props.id}:${step}:${local}`);
}
function Rows(props) {
	return /* @__PURE__ */ jsx("div", { "data-rows": "ready" }, useAt("native_arm.tsx#component:Rows#store:0", props.domain.itemsStore).map((id) => /* @__PURE__ */ jsx(Row, {
		key: id,
		id,
		domain: props.domain
	})));
}
function Detail(props) {
	return /* @__PURE__ */ jsx("output", {
		key: "detail-output",
		"data-detail": "ready"
	}, useAt("native_arm.tsx#component:Detail#store:0", props.domain.detailResource));
}
function Health(props) {
	return /* @__PURE__ */ jsx("output", {
		key: "health-output",
		"data-health": "ready"
	}, useAt("native_arm.tsx#component:Health#store:0", props.domain.healthResource));
}
function DetailFallback(props) {
	useEffectAt("native_arm.tsx#component:DetailFallback#effect:0", () => {
		props.domain.counts.detailFallbackSetups++;
		return () => {
			props.domain.counts.detailFallbackCleanups++;
		};
	});
	return /* @__PURE__ */ jsx("output", {
		key: "detail-output",
		"data-detail": "waiting"
	}, "waiting");
}
function HealthFallback(props) {
	useEffectAt("native_arm.tsx#component:HealthFallback#effect:0", () => {
		props.domain.counts.healthFallbackSetups++;
		return () => {
			props.domain.counts.healthFallbackCleanups++;
		};
	});
	return /* @__PURE__ */ jsx("output", {
		key: "health-output",
		"data-health": "waiting"
	}, "waiting");
}
function App(props) {
	return /* @__PURE__ */ jsx("main", null, /* @__PURE__ */ jsx(Rows, { domain: props.domain }), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx(DetailFallback, { domain: props.domain }),
		__nativeBoundarySite: "native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(Detail, { domain: props.domain })), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx(HealthFallback, { domain: props.domain }),
		__nativeBoundarySite: "native_arm.tsx#boundary:1"
	}, /* @__PURE__ */ jsx(Health, { domain: props.domain })));
}
function mountScene(root) {
	const domain = createDomain();
	root.mount(/* @__PURE__ */ jsx(App, { domain }));
	let disposed = false;
	const diagnostics = () => {
		const step = domain.stepStore.diagnostics();
		const items = domain.itemsStore.diagnostics();
		const state = root.diagnostics();
		return {
			arm: "native",
			...domain.counts,
			storeListeners: step.listeners + items.listeners,
			storeReaders: step.readers + items.readers,
			ownerCount: state.ownerCount,
			pendingChangeCount: state.pendingChangeCount,
			disposed: state.disposed
		};
	};
	return {
		updateStep(step) {
			if (disposed) throw new Error("Native scene is disposed");
			domain.stepStore.dispatch(step);
			root.flush();
		},
		editRows() {
			if (disposed) throw new Error("Native scene is disposed");
			domain.itemsStore.dispatch(editedRows());
			root.flush();
		},
		settleDetail() {
			if (disposed) throw new Error("Native scene is disposed");
			domain.detail.resolve("detail ready");
		},
		settleHealth() {
			if (disposed) throw new Error("Native scene is disposed");
			domain.health.resolve("health ready");
		},
		diagnostics,
		dispose() {
			if (!disposed) {
				disposed = true;
				root.dispose();
			}
			return diagnostics();
		}
	};
}
function mountNative(host) {
	return mountScene(createDOMRoot(host));
}
//#endregion
//#region entry.ts
function createAuthoredLifecycleApi(selectedArm, mountScene) {
	let host = null;
	let controller = null;
	let retainedController = null;
	let row0 = null;
	let arm = null;
	let finalDiagnostics = null;
	function active() {
		if (!controller) throw new Error("scene is not mounted");
		return controller;
	}
	function resource(name) {
		if (!host) return {
			fallback: 0,
			ready: 0,
			text: null
		};
		const fallback = host.querySelectorAll(`[data-${name}="waiting"]`);
		const ready = host.querySelectorAll(`[data-${name}="ready"]`);
		const node = ready[0] ?? fallback[0];
		return {
			fallback: fallback.length,
			ready: ready.length,
			text: node?.textContent ?? null
		};
	}
	return {
		mount(nextArm) {
			if (host || controller || retainedController) throw new Error("previous scene must be released");
			if (nextArm !== selectedArm) throw new Error(`selected page only supports ${selectedArm}`);
			const element = document.createElement("section");
			element.dataset.arm = nextArm;
			document.body.append(element);
			try {
				const next = mountScene(element);
				host = element;
				controller = next;
				arm = nextArm;
				finalDiagnostics = null;
				row0 = null;
			} catch (error) {
				element.remove();
				throw error;
			}
		},
		clickRow() {
			const row = host?.querySelector("[data-row=\"0\"]");
			if (!row) throw new Error("row 0 missing");
			row0 ??= row;
			row.click();
		},
		update(step) {
			active().updateStep(step);
		},
		edit() {
			active().editRows();
		},
		settleDetail() {
			active().settleDetail();
		},
		settleHealth() {
			active().settleHealth();
		},
		inspect() {
			const rows = [...host?.querySelectorAll("[data-row]") ?? []].map((node) => ({
				id: Number(node.dataset.row),
				step: node.dataset.step ?? null,
				local: node.dataset.local ?? null,
				transform: node.style.transform,
				opacity: node.style.opacity,
				text: node.textContent ?? ""
			}));
			const currentRow0 = host?.querySelector("[data-row=\"0\"]") ?? null;
			return {
				arm,
				rows,
				row0Retained: row0 ? currentRow0 === row0 : null,
				detail: resource("detail"),
				health: resource("health"),
				diagnostics: controller?.diagnostics() ?? finalDiagnostics,
				remainingChildren: host?.childNodes.length ?? 0
			};
		},
		dispose(options) {
			const next = active();
			const diagnostics = next.dispose();
			const remainingChildren = host?.childNodes.length ?? 0;
			controller = null;
			finalDiagnostics = diagnostics;
			row0 = null;
			host?.remove();
			host = null;
			if (options.retain) retainedController = next;
			return {
				diagnostics,
				remainingChildren
			};
		},
		release() {
			if (controller) throw new Error("dispose before release");
			retainedController = null;
			finalDiagnostics = null;
			arm = null;
		}
	};
}
function installAuthoredLifecycle(selectedArm, mountScene) {
	if (window.__authoredLifecycle) throw new Error("authored lifecycle API already installed");
	window.__authoredLifecycle = createAuthoredLifecycleApi(selectedArm, mountScene);
}
//#endregion
//#region native.ts
installAuthoredLifecycle("native", mountNative);
//#endregion
