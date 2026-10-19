//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/closed_numeric_expression.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/scoped_host_values.js
var isSafeClosedStyleName = (name) => name !== "__proto__" && name !== "prototype" && name !== "constructor" && (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name) || /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(name));
Object.freeze({ accepted: false });
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/closed_host_value.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/closed_component_forward_program.js
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
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/jsx_binding_runtime.js
var keyedOwnerRegionTag = Symbol("keyed-owner-region");
var keyedOwnerVersionTag = Symbol("keyed-owner-version");
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
/** Classic JSX factory used by the TSX prototype page. */
function jsx(type, props, ...children) {
	const next = { ...props ?? {} };
	if (children.length === 1) next.children = freezeChild(children[0]);
	else if (children.length > 1) next.children = Object.freeze(children.map(freezeChild));
	else if (Array.isArray(next.children)) next.children = Object.freeze(next.children.map(freezeChild));
	Object.freeze(next);
	return Object.freeze({
		type,
		props: next
	});
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/closed_host_tree.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/closed_store_host_program.js
var record$1 = closedDataRecord;
var exact$1 = exactClosedFields;
var array = closedDataArray$1;
var allowedName = (tag, name) => tag === "div" || tag === "span" || tag === "output" ? /^data-[a-z][a-z0-9-]*$/.test(name) : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
var input = (site, prop) => typeof site === "string" && site.length > 0 && typeof prop === "string" && /^[A-Za-z_$][\w$]*$/.test(prop) ? Object.freeze({
	storeUseSiteId: site,
	storeProp: prop
}) : null;
Object.freeze([Object.freeze([])]);
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/closed_resource_host_program.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/compiled_semantic_plan.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/owned_store_record.js
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
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/async_store_runtime.js
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
	/** Call after host commit. Repeated calls are harmless. */
	commit() {
		if (this.#committed) return;
		if (!this.validate()) throw new Error(`Store snapshot for root ${this.rootId} is stale; rebuild before commit`);
		this.commitAfterValidatedRender();
	}
	/** Publish selector history after a renderer's pre-host-commit validation. */
	commitAfterValidatedRender() {
		if (this.#committed) return;
		this.store._commitReaderValues(this.rootId, this.#pending);
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
		const session = new StoreReadSession(rootId, readerId, transitions, this.#readerValues.get(rootId)?.get(readerId) ?? /* @__PURE__ */ new Map(), snapshotStates);
		const value = source.read(session);
		pending.set(readerId, session.next);
		return value;
	}
	/** Read-only committed selection history, never mutated during preparation. */
	_readerValuesFor(rootId, readerId) {
		return this.#readerValues.get(rootId)?.get(readerId) ?? /* @__PURE__ */ new Map();
	}
	diagnostics() {
		return Object.freeze({
			roots: this.#knownRoots.size,
			listeners: [...this.#roots.values()].reduce((count, values) => count + values.size, 0),
			readers: [...this.#readerValues.values()].reduce((count, values) => count + values.size, 0),
			retainedActions: this.#entries.length,
			transitions: this.#transitions.size
		});
	}
	_commitReaderValues(rootId, pending) {
		this._publishPreparedReaderValues(rootId, this._prepareReaderValues(rootId, pending));
	}
	_prepareReaderValues(rootId, pending) {
		if (!this.#knownRoots.has(rootId)) throw new Error(`Store reader root is no longer live: ${rootId}`);
		const prepared = /* @__PURE__ */ new Map();
		for (const [readerId, values] of pending) prepared.set(readerId, values === null ? null : new Map(values));
		const existing = this.#readerValues.get(rootId);
		return {
			rootReaders: existing ?? /* @__PURE__ */ new Map(),
			isNewRoot: existing === void 0,
			entries: prepared
		};
	}
	_publishPreparedReaderValues(rootId, prepared) {
		if (prepared.isNewRoot) this.#readerValues.set(rootId, prepared.rootReaders);
		for (const [readerId, values] of prepared.entries) if (values === null) prepared.rootReaders.delete(readerId);
		else prepared.rootReaders.set(readerId, values);
	}
	_validateRender(rootId, version, rootEpoch) {
		return this.#knownRoots.has(rootId) && this.#rootEpochs.get(rootId) === rootEpoch && this.getRootVersion(rootId) === version;
	}
	_validateRenderLineage(rootId, version, rootEpoch) {
		return this.#knownRoots.has(rootId) && this.#rootEpochs.get(rootId) === rootEpoch && this.getRootVersion(rootId) >= version;
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
AsyncStore.prototype._prepareReaderValues;
AsyncStore.prototype._publishPreparedReaderValues;
var closedDirectProjectionPaths = Object.freeze([Object.freeze([])]);
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/async_resource_runtime.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/resource_read_set.js
var resourcePrototype = AsyncResource.prototype;
resourcePrototype.read;
Object.getOwnPropertyDescriptor(resourcePrototype, "status").get;
Object.getOwnPropertyDescriptor(resourcePrototype, "version").get;
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/compiled_state_layout.js
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
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/world_dirty_journal.js
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
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/owner_state_world.js
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
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/dom_style_writer.js
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
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/vdom_snapshot_runtime.js
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
var domBaseSetProp = class DOMVDOMHost {
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
}.prototype.setProp;
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/component_state_runtime.js
var componentSite = Symbol("compiled-component-site");
var activeOwners = [];
/** Attach the stable component-site ID that a compiler would emit for a function component. */
var defineComponent = (siteId, render, metadata) => {
	if (siteId.length === 0) throw new Error("Component site ID must not be empty");
	Object.defineProperty(render, componentSite, { value: siteId });
	const moduleEnd = siteId.lastIndexOf("#component:");
	if (metadata || moduleEnd >= 0) {
		const propOnlySites = [...metadata?.propOnlySites ?? []];
		if (propOnlySites.some((site) => typeof site !== "string" || !site)) throw new Error("Component prop-only metadata contains an invalid state site ID");
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
		Object.defineProperty(render, componentMetadata, { value: Object.freeze({
			propOnlySites: Object.freeze(propOnlySites),
			hostLeafOutput: metadata?.hostLeafOutput === true,
			...revision ? { revision } : {},
			...stateLayout ? { stateLayout } : {},
			...closedResourceHostProgram ? { closedResourceHostProgram } : {},
			...closedStoreHostProgram ? { closedStoreHostProgram } : {},
			...closedComponentForwardProgram ? { closedComponentForwardProgram } : {}
		}) });
	}
	return render;
};
var componentMetadata = Symbol("compiled-component-metadata");
/** Explicit-site hook primitive; the compiler can lower familiar useState calls to this form. */
var useStateAt = (siteId, initial) => {
	const active = activeOwners[activeOwners.length - 1];
	if (!active) throw new Error("useStateAt must run while an owner-aware component is rendering");
	return active.stateLayout ? active.world.useState(active.owner, siteId, initial, active.stateLayout) : active.world.useState(active.owner, siteId, initial);
};
//#endregion
//#region node_modules/.pnpm/@r3act+core@file+..+..+..+..+..+.cache+r3act-package-build+tarballs+r3act-core.tgz_react@19.3.0_three@0.186.1/node_modules/@r3act/core/dist/src/native_runtime_api.js
/** Public native author API; `jsx` uses the classic variadic factory ABI. */
//#endregion
//#region native_arm.tsx
registerCompiledSemanticPlan({
	"schema_version": 1,
	"source_file": "native_arm.tsx",
	"module_revision": "native-v1-2509d0d75a6b029e",
	"owners": [{
		"site_id": "native_arm.tsx#component:Counter",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "native_arm.tsx#component:Counter#state:0",
		"owner_site_id": "native_arm.tsx#component:Counter",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "native_arm.tsx#opaque-sink:191",
		"owner_site_id": "native_arm.tsx#component:Counter",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
defineComponent("native_arm.tsx#component:Counter", Counter, { propOnlySites: [] });
function Counter(props) {
	const [level, setLevel] = useStateAt("native_arm.tsx#component:Counter#state:0", props.initial);
	return /* @__PURE__ */ jsx("button", {
		key: "counter",
		"data-level": level,
		onClick: () => setLevel((previous) => previous + 1)
	}, "level ", level);
}
var compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-2509d0d75a6b029e",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native_arm.tsx",
		"module_revision": "native-v1-2509d0d75a6b029e",
		"owners": [{
			"site_id": "native_arm.tsx#component:Counter",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "native_arm.tsx#component:Counter#state:0",
			"owner_site_id": "native_arm.tsx#component:Counter",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "native_arm.tsx#opaque-sink:191",
			"owner_site_id": "native_arm.tsx#component:Counter",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native_arm.tsx#component:Counter\", Counter, { propOnlySites: [] });\n\nexport function Counter(props: { initial: number }) {\n  const [level, setLevel] = __nativeUseStateAt(\"native_arm.tsx#component:Counter#state:0\", props.initial);\n  return <button key=\"counter\" data-level={level}\n    onClick={() => setLevel((previous) => previous + 1)}>level {level}</button>;\n}\n",
	"components": [{
		"name": "Counter",
		"component_site_id": "native_arm.tsx#component:Counter",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "native_arm.tsx#component:Counter#state:0",
			"initial_value": "props.initial"
		}],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["native_arm.tsx#opaque-sink:191"]
	}]
};
//#endregion
export { Counter, compiledNativeComponentPlan };

//# sourceMappingURL=native.js.map