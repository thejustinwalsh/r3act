//#region src/owner_state_world.ts
var e = class {
	#e = 1;
	#t = /* @__PURE__ */ new Map();
	#n = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Set();
	resolveOwner(e, t, n = null) {
		if (t.length === 0) throw Error("Component site ID must not be empty");
		e !== null && this.#o(e);
		let r = this.#n.get(e);
		r || this.#n.set(e, r = /* @__PURE__ */ new Map());
		let i = r.get(t);
		i || r.set(t, i = /* @__PURE__ */ new Map());
		let a = i.get(n);
		if (a !== void 0) return a;
		let o = this.#e++;
		return this.#t.set(o, {
			id: o,
			parent: e,
			componentSiteId: t,
			key: n,
			children: /* @__PURE__ */ new Set()
		}), e !== null && this.#t.get(e).children.add(o), i.set(n, o), o;
	}
	findOwner(e, t, n = null) {
		return e !== null && this.#o(e), this.#n.get(e)?.get(t)?.get(n);
	}
	useState(e, t, n) {
		if (this.#o(e), t.length === 0) throw Error("State site ID must not be empty");
		let r = this.#r.get(e);
		r || this.#r.set(e, r = /* @__PURE__ */ new Map());
		let i = r.get(t);
		return i || (i = {
			value: typeof n == "function" ? n() : n,
			version: 0,
			dispatch: () => !1
		}, i.dispatch = (n) => {
			this.#o(e);
			let r = i.value, a = typeof n == "function" ? n(r) : n;
			if (Object.is(r, a)) return !1;
			i.value = a, i.version++;
			let o = this.#i.get(e);
			o || this.#i.set(e, o = /* @__PURE__ */ new Set()), o.add(t);
			let s = {
				owner: e,
				site: t,
				version: i.version
			};
			for (let e of [...this.#a]) e(s);
			return !0;
		}, r.set(t, i)), [i.value, i.dispatch];
	}
	version(e, t) {
		return this.#o(e), this.#r.get(e)?.get(t)?.version ?? 0;
	}
	pendingChanges() {
		let e = [];
		for (let [t, n] of this.#i) for (let r of n) e.push({
			owner: t,
			site: r,
			version: this.version(t, r)
		});
		return e;
	}
	drainChanges() {
		let e = this.pendingChanges();
		return this.#i.clear(), e;
	}
	ownerLineage(e) {
		this.#o(e);
		let t = [], n = e;
		for (; n !== null;) t.push(n), n = this.#t.get(n).parent;
		return t;
	}
	isAlive(e) {
		return this.#t.has(e);
	}
	hasPendingChanges() {
		return this.#i.size !== 0;
	}
	subscribeChanges(e) {
		return this.#a.add(e), () => this.#a.delete(e);
	}
	destroyOwner(e) {
		let t = this.#t.get(e);
		if (!t) return !1;
		for (let e of [...t.children]) this.destroyOwner(e);
		let n = this.#n.get(t.parent), r = n?.get(t.componentSiteId);
		return r?.delete(t.key), r?.size === 0 && n?.delete(t.componentSiteId), n?.size === 0 && this.#n.delete(t.parent), t.parent !== null && this.#t.get(t.parent)?.children.delete(e), this.#t.delete(e), this.#r.delete(e), this.#i.delete(e), !0;
	}
	#o(e) {
		if (!this.#t.has(e)) throw Error(`Owner ${e} is not alive`);
	}
}, t = Symbol("jsx-runtime-fragment");
function n(e, t, ...n) {
	let i = { ...t ?? {} };
	return n.length === 1 ? i.children = r(n[0]) : n.length > 1 ? i.children = Object.freeze(n.map(r)) : Array.isArray(i.children) && (i.children = Object.freeze(i.children.map(r))), Object.freeze(i), Object.freeze({
		type: e,
		props: i
	});
}
var r = (e) => Array.isArray(e) ? Object.freeze(e.map(r)) : e, i = Symbol("jsx-runtime-binding"), a = (e) => typeof e == "object" && !!e && e[i] === !0, o = (e) => a(e) ? e : null, s = (e) => {
	let t = e.props.key;
	return t == null ? null : String(t);
}, c = (e) => {
	let t = {};
	for (let [n, r] of Object.entries(e)) n !== "children" && n !== "key" && n !== "ref" && (t[n] = r);
	return t;
}, l = /* @__PURE__ */ new WeakMap(), u = (e) => {
	if (e == null || e === !1) return [];
	if (Array.isArray(e)) return e.flatMap((e) => u(e));
	if (typeof e == "string" || typeof e == "number") return [{
		kind: "text",
		text: String(e),
		key: null
	}];
	if (typeof e.type == "function") return u(e.type(e.props));
	if (e.type === t) return u(e.props.children);
	let n = l.get(e);
	if (n) return [n];
	let r = {
		kind: "element",
		tag: e.type,
		key: s(e),
		props: c(e.props),
		children: u(e.props.children)
	};
	return l.set(e, r), [r];
}, d = (e, t) => e.kind === t.kind && e.key === t.key && (e.kind === "text" || t.kind === "element" && e.tag === t.tag), f = (e) => {
	let t = /* @__PURE__ */ new Set();
	for (let n of e) {
		if (n.key !== null) {
			if (t.has(n.key)) throw Error(`Duplicate key in next VDOM children: ${n.key}`);
			t.add(n.key);
		}
		n.kind === "element" && f(n.children);
	}
}, p = (e, t) => {
	if (t.vnode.kind === "element") for (let [n, r] of Object.entries(t.vnode.props)) /^on[A-Z]/.test(n) && typeof r == "function" && e.setProp(t.handle, n, void 0, r);
	for (let n of t.children) p(e, n);
}, m = (e, t, n, r) => {
	let i = /* @__PURE__ */ new Set([...Object.keys(n), ...Object.keys(r)]);
	for (let a of i) {
		let i = g(a, n[a]), o = g(a, r[a]);
		Object.is(i, o) || e.setProp(t, a, o, i);
	}
}, h = (e) => {
	let t = o(e);
	return t ? t.project(t.source.value) : e;
}, g = (e, t) => {
	if (e === "style" && typeof t == "object" && t && !Array.isArray(t)) {
		let e = t, n = {};
		for (let [t, r] of Object.entries(e)) n[t] = h(r);
		return n;
	}
	return h(t);
}, _ = (e, t) => {
	let n = e === "style" && typeof t == "object" && t && !Array.isArray(t) ? Object.values(t) : [t], r = [];
	for (let e of n) {
		let t = o(e);
		t && !r.includes(t.source) && r.push(t.source);
	}
	return r;
}, v = (e, t) => {
	let n = e === "style" && typeof t == "object" && t && !Array.isArray(t) ? Object.entries(t) : [[void 0, t]], r = [];
	for (let [e, t] of n) {
		let n = o(t);
		n && Number.isInteger(n.bindingId) && Number.isInteger(n.sourceSlot) && r.push({
			source: n.source,
			bindingId: n.bindingId,
			sourceSlot: n.sourceSlot,
			styleProperty: e,
			binding: n
		});
	}
	return r;
}, y = (e, t) => {
	if (t.kind === "text") return {
		vnode: t,
		handle: e.createText(t.text),
		children: [],
		parent: null,
		parentIndex: -1
	};
	let n = e.createElement(t.tag);
	m(e, n, {}, t.props);
	let r = x(e, n, [], t.children), i = {
		vnode: t,
		handle: n,
		children: r,
		parent: null,
		parentIndex: -1
	};
	for (let e = 0; e < r.length; e++) r[e].parent = i, r[e].parentIndex = e;
	return i;
}, b = (e, t, n, r) => {
	if (n && n.vnode === r) return n;
	if (!n || !d(n.vnode, r)) {
		n && (p(e, n), e.remove(t, n.handle));
		let i = y(e, r);
		return e.place(t, i.handle, null), i;
	}
	if (r.kind === "text" && n.vnode.kind === "text") return n.vnode.text !== r.text && e.setText(n.handle, r.text), n.vnode = r, n;
	if (r.kind === "element" && n.vnode.kind === "element") {
		m(e, n.handle, n.vnode.props, r.props), n.children = x(e, n.handle, n.children, r.children);
		for (let e = 0; e < n.children.length; e++) n.children[e].parent = n, n.children[e].parentIndex = e;
		return n.vnode = r, n;
	}
	throw Error("Incompatible VDOM node kinds reached update path");
}, x = (e, t, n, r) => {
	if (r.length === n.length && r.every((e, t) => n[t].vnode.key === e.key && d(n[t].vnode, e))) return r.map((r, i) => b(e, t, n[i], r));
	let i = /* @__PURE__ */ new Map(), a = [];
	for (let e = 0; e < n.length; e++) {
		let t = n[e], r = t.vnode.key;
		if (r == null) a.push(t);
		else {
			if (i.has(r)) throw Error(`Duplicate key in previous VDOM children: ${r}`);
			i.set(r, t);
		}
	}
	let o = /* @__PURE__ */ new Set();
	for (let e of r) if (e.key != null) {
		if (o.has(e.key)) throw Error(`Duplicate key in next VDOM children: ${e.key}`);
		o.add(e.key);
	}
	let s = /* @__PURE__ */ new Set(), c = new Uint8Array(r.length), l = 0, u = -1, f = r.map((e, t) => {
		let n;
		return n = e.key == null ? a[l++] : i.get(e.key), !n || !d(n.vnode, e) ? (c[t] = 1, null) : (s.add(n), n.parentIndex < u ? c[t] = 1 : u = n.parentIndex, n);
	}), m = Array(r.length), h = null;
	for (let n = r.length - 1; n >= 0; n--) {
		let i = f[n], a = i ? b(e, t, i, r[n]) : y(e, r[n]);
		c[n] !== 0 && e.place(t, a.handle, h), m[n] = a, h = a.handle;
	}
	for (let r of n) s.has(r) || (p(e, r), e.remove(t, r.handle));
	return m;
}, S = class {
	host;
	container;
	#e = [];
	#t = [];
	#n = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = /* @__PURE__ */ new Map();
	#s = null;
	#c = !1;
	#l = 0;
	#u = 0;
	#d = 0;
	constructor(e, t) {
		this.host = e, this.container = t;
	}
	get version() {
		return this.#l;
	}
	get partialCommitCount() {
		return this.#u;
	}
	get partialCommitBatchCount() {
		return this.#d;
	}
	get snapshot() {
		return this.#t;
	}
	commit(e, t = null, n = !1) {
		this.prepareCommit(e, t, n).commit();
	}
	prepareCommit(e, t = this.#s, n = this.#c) {
		let r = u(e);
		if (f(r), t) {
			this.#m(t);
			let e = (n) => {
				for (let r of n) if (r.kind === "element") {
					for (let [e, n] of Object.entries(r.props)) for (let r of v(e, n)) {
						let e = r.sourceSlot;
						if (e < 0 || e >= t.sourceCount) throw Error(`Compiled binding uses invalid source slot ${e}`);
						let n = t.sourceBindingOffsets[e], i = t.sourceBindingOffsets[e + 1], a = !1;
						for (let e = n; e < i; e++) t.bindingIds[e] === r.bindingId && (a = !0);
						if (!a) throw Error(`Compiled binding ${r.bindingId} is absent from source slot ${e}`);
					}
					e(r.children);
				}
			};
			e(r);
		}
		let i = !1;
		return { commit: () => {
			if (i) throw Error("Prepared VDOM commit can only be applied once");
			i = !0, this.#e = x(this.host, this.container, this.#e, r);
			for (let e = 0; e < this.#e.length; e++) this.#e[e].parent = null, this.#e[e].parentIndex = e;
			this.#t = r, this.#s = t, this.#c = n, this.#p(), this.#f(), this.#l++;
		} };
	}
	commitKeyedRegion(e, t) {
		if (this.#s || this.#c || this.#r.size > 0) return !1;
		let n = this.#n.get(e);
		if (!n || n.size !== 1) return !1;
		let [r] = u(t), i = n.values().next().value;
		if (!i || !r || r.key !== e || !d(i.vnode, r)) return !1;
		let a = [], o = (e) => {
			a.push({
				node: e,
				key: e.vnode.key
			});
			for (let t of e.children) o(t);
		};
		o(i);
		let s = i.parent ? i.parent.handle : this.container;
		b(this.host, s, i, r);
		for (let { node: e, key: t } of a) {
			if (t === null) continue;
			let n = this.#n.get(t);
			n?.delete(e), n?.size === 0 && this.#n.delete(t);
		}
		let c = (e) => {
			let t = e.vnode.key;
			if (t !== null) {
				let n = this.#n.get(t);
				n || this.#n.set(t, n = /* @__PURE__ */ new Set()), n.add(e);
			}
			for (let t of e.children) c(t);
		};
		c(i);
		for (let e = i; e.parent; e = e.parent) {
			let t = e.parent;
			t.vnode.kind === "element" && (t.vnode.children[e.parentIndex] = e.vnode);
		}
		return this.#t = this.#e.map((e) => e.vnode), this.#l++, this.#u++, this.#d++, !0;
	}
	commitKeyedRegions(e) {
		if (e.length === 0 || this.#s || this.#c || this.#r.size > 0) return !1;
		let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set(), r = [];
		for (let i of e) {
			if (!i.key || t.has(i.key)) return !1;
			t.add(i.key);
			let e = this.#n.get(i.key);
			if (!e || e.size !== 1) return !1;
			let a = e.values().next().value, o = u(i.tree);
			if (o.length !== 1) return !1;
			let s = o[0];
			try {
				f([s]);
			} catch {
				return !1;
			}
			if (!a || s.key !== i.key || !d(a.vnode, s) || n.has(a)) return !1;
			let c = [], l = (e) => {
				n.add(e), c.push(e);
				for (let t of e.children) l(t);
			};
			l(a), r.push({
				key: i.key,
				target: a,
				next: s,
				previousSubtree: c
			});
		}
		let i = /* @__PURE__ */ new Set(), a = (e) => {
			if (e.kind !== "element") return !0;
			if (e.key !== null) {
				if (i.has(e.key)) return !1;
				i.add(e.key);
			}
			return e.children.every(a);
		};
		for (let e of r) if (!a(e.next)) return !1;
		for (let e of i) {
			let t = this.#n.get(e);
			if (t && [...t].some((e) => !n.has(e))) return !1;
		}
		for (let e of r) for (let t of e.previousSubtree) {
			let e = t.vnode.key;
			if (e === null) continue;
			let n = this.#n.get(e);
			n?.delete(t), n?.size === 0 && this.#n.delete(e);
		}
		for (let e of r) {
			let t = e.target.parent ? e.target.parent.handle : this.container;
			b(this.host, t, e.target, e.next);
			let n = (e) => {
				let t = e.vnode.key;
				if (t !== null) {
					let n = this.#n.get(t);
					n || this.#n.set(t, n = /* @__PURE__ */ new Set()), n.add(e);
				}
				for (let t of e.children) n(t);
			};
			n(e.target);
		}
		for (let e of r) for (let t = e.target; t.parent; t = t.parent) {
			let e = t.parent;
			e.vnode.kind === "element" && (e.vnode.children[t.parentIndex] = t.vnode);
		}
		return this.#t = this.#e.map((e) => e.vnode), this.#l++, this.#u += r.length, this.#d++, !0;
	}
	setSource(e, t) {
		let n = this.#s ? this.#a.get(e) : this.#r.get(e);
		if (!n || n.length === 0) throw Error("Scalar source is not bound in this VDOM root");
		if (Object.is(e.value, t)) return !1;
		e.value = t;
		for (let e of n) {
			let n = e.project ? e.project(t) : g(e.name, e.rawValue);
			Object.is(e.lastValue, n) || (e.styleProperty === void 0 ? this.host.setProp(e.handle, e.name, n, e.lastValue) : this.host.setStyleProp ? this.host.setStyleProp(e.handle, e.styleProperty, n, e.lastValue) : this.host.setProp(e.handle, "style", { [e.styleProperty]: n }, { [e.styleProperty]: e.lastValue }), e.lastValue = n);
		}
		return !0;
	}
	dispose() {
		for (let e of this.#e) p(this.host, e), this.host.remove(this.container, e.handle);
		this.#e = [], this.#t = [], this.#n.clear(), this.#r.clear(), this.#i.clear(), this.#a.clear(), this.#o.clear(), this.#s = null, this.#c = !1;
	}
	#f() {
		this.#r.clear(), this.#i.clear(), this.#a.clear(), this.#o.clear(), this.#s && this.#m(this.#s);
		let e = (t) => {
			if (t.vnode.kind === "element") for (let [e, n] of Object.entries(t.vnode.props)) if (this.#s) for (let r of v(e, n)) {
				let n = this.#o.get(r.source);
				if (n !== void 0 && n !== r.sourceSlot) throw Error("One scalar source cannot occupy multiple slots in a compiled VDOM root");
				this.#o.set(r.source, r.sourceSlot);
				let i = this.#s.sourceBindingOffsets[r.sourceSlot], a = this.#s.sourceBindingOffsets[r.sourceSlot + 1], o = !1;
				for (let e = i; e < a; e++) this.#s.bindingIds[e] === r.bindingId && (o = !0);
				if (!o) throw Error(`Compiled binding ${r.bindingId} is absent from source slot ${r.sourceSlot}`);
				let s = this.#i.get(r.source);
				s || this.#i.set(r.source, s = /* @__PURE__ */ new Map());
				let c = {
					handle: t.handle,
					name: e,
					styleProperty: r.styleProperty,
					project: r.binding.project,
					rawValue: r.binding,
					lastValue: r.binding.project(r.source.value)
				}, l = s.get(r.bindingId);
				l ? l.push(c) : s.set(r.bindingId, [c]);
			}
			else {
				if (this.#c) {
					let r = e === "style" && typeof n == "object" && n && !Array.isArray(n) ? Object.entries(n) : [[void 0, n]], i = !1;
					for (let [n, a] of r) {
						let r = o(a);
						if (!r) continue;
						i = !0;
						let s = {
							handle: t.handle,
							name: e,
							styleProperty: n,
							project: r.project,
							rawValue: r,
							lastValue: r.project(r.source.value)
						}, c = this.#r.get(r.source);
						c ? c.push(s) : this.#r.set(r.source, [s]);
					}
					if (i) continue;
				}
				let r = _(e, n);
				if (r.length === 0) continue;
				let i = {
					handle: t.handle,
					name: e,
					rawValue: n,
					lastValue: g(e, n)
				};
				for (let e of r) {
					let t = this.#r.get(e);
					t ? t.push(i) : this.#r.set(e, [i]);
				}
			}
			for (let n of t.children) e(n);
		};
		for (let t of this.#e) e(t);
		if (this.#s) for (let [e, t] of this.#i) {
			let n = this.#o.get(e), r = [], i = this.#s.sourceBindingOffsets[n], a = this.#s.sourceBindingOffsets[n + 1];
			for (let e = i; e < a; e++) {
				let n = t.get(this.#s.bindingIds[e]);
				n && r.push(...n);
			}
			r.length > 0 && this.#a.set(e, r);
		}
	}
	#p() {
		this.#n.clear();
		let e = (t) => {
			if (t.vnode.key !== null) {
				let e = this.#n.get(t.vnode.key);
				e || this.#n.set(t.vnode.key, e = /* @__PURE__ */ new Set()), e.add(t);
			}
			for (let n of t.children) e(n);
		};
		for (let t of this.#e) e(t);
	}
	#m(e) {
		if (!Number.isInteger(e.sourceCount) || e.sourceCount < 0 || e.sourcePaths.length !== e.sourceCount || e.sourceBindingOffsets.length !== e.sourceCount + 1 || e.sourceBindingOffsets[0] !== 0 || e.sourceBindingOffsets[e.sourceCount] !== e.bindingIds.length) throw Error("Malformed compiled VDOM dependency graph");
		for (let t = 0; t < e.sourceCount; t++) if (!Number.isInteger(e.sourceBindingOffsets[t]) || e.sourceBindingOffsets[t] > e.sourceBindingOffsets[t + 1]) throw Error(`Malformed compiled VDOM source range at slot ${t}`);
	}
}, C = class {
	createElement(e) {
		return document.createElement(e);
	}
	createText(e) {
		return document.createTextNode(e);
	}
	setText(e, t) {
		e.textContent = t;
	}
	setProp(e, t, n, r) {
		if (e instanceof HTMLElement || e instanceof SVGElement) {
			if (t === "style" && e instanceof HTMLElement) {
				let t = r ?? {}, i = n ?? {};
				for (let n of /* @__PURE__ */ new Set([...Object.keys(t), ...Object.keys(i)])) Object.is(t[n], i[n]) || (n.startsWith("--") ? i[n] == null ? e.style.removeProperty(n) : e.style.setProperty(n, String(i[n])) : e.style[n] = i[n] == null ? "" : String(i[n]));
			} else if (/^on[A-Z]/.test(t)) {
				let i = t.slice(2).toLowerCase();
				typeof r == "function" && e.removeEventListener(i, r), typeof n == "function" && e.addEventListener(i, n);
			} else t === "className" ? e instanceof HTMLElement ? e.className = String(n ?? "") : e.setAttribute("class", String(n ?? "")) : t === "htmlFor" && e instanceof HTMLLabelElement ? e.htmlFor = String(n ?? "") : n == null || n === !1 ? e.removeAttribute(t) : t in e && !t.startsWith("aria-") && !t.startsWith("data-") ? e[t] = n : e.setAttribute(t, n === !0 ? "" : String(n));
		}
	}
	setStyleProp(e, t, n) {
		e instanceof HTMLElement && (t.startsWith("--") ? n == null ? e.style.removeProperty(t) : e.style.setProperty(t, String(n)) : e.style[t] = n == null ? "" : String(n));
	}
	place(e, t, n) {
		(t.parentNode !== e || t.nextSibling !== n) && (n !== null || t.parentNode !== e || e.lastChild !== t) && e.insertBefore(t, n);
	}
	remove(e, t) {
		t.parentNode === e && e.removeChild(t);
	}
}, w = class {
	graph;
	#e;
	#t = [];
	#n = [];
	constructor(e) {
		this.graph = e;
		let { source_count: t, source_paths: n, source_region_offsets: r, region_ids: i } = e;
		if (!Number.isInteger(t) || t < 0 || n.length !== t || r.length !== t + 1 || r[0] !== 0 || r[t] !== i.length) throw Error("Malformed derived-region CSR graph");
		let a = 0;
		for (let e = 0; e < t; e++) {
			let t = r[e], n = r[e + 1];
			if (!Number.isInteger(t) || !Number.isInteger(n) || t < 0 || n < t || n > i.length) throw Error(`Malformed derived-region source range at slot ${e}`);
		}
		for (let e of i) {
			if (!Number.isInteger(e) || e < 0) throw Error("Derived-region graph contains an invalid region ID");
			a = Math.max(a, e + 1);
		}
		this.#e = new Uint8Array(a);
	}
	invalidateSourceSlot(e) {
		let { source_count: t, source_region_offsets: n, region_ids: r } = this.graph;
		if (!Number.isInteger(e) || e < 0 || e >= t) throw RangeError(`Derived-region source slot out of range: ${e}`);
		for (let t = n[e]; t < n[e + 1]; t++) {
			let e = r[t];
			this.#e[e] === 0 && (this.#e[e] = 1, this.#t.push(e));
		}
	}
	flush(e) {
		let t = this.#t;
		this.#t = this.#n, this.#n = t, this.#t.length = 0;
		let n = 0;
		try {
			for (; n < t.length; n++) {
				let r = t[n];
				this.#e[r] = 0, e(r);
			}
			return t.length;
		} finally {
			for (; n < t.length; n++) this.#e[t[n]] = 0;
			t.length = 0;
		}
	}
}, T = Symbol("compiled-component-site"), E = [], D = (e, t) => `${e}\u0000${t}`, O = (e, t) => {
	if (e.length === 0) throw Error("Component site ID must not be empty");
	return Object.defineProperty(t, T, { value: e }), t;
}, k = (e, t) => {
	let n = E[E.length - 1];
	if (!n) throw Error("useStateAt must run while an owner-aware component is rendering");
	return n.world.useState(n.owner, e, t);
}, A = (e) => {
	if (typeof e != "function") throw Error("Expected a function component");
	let t = e[T];
	if (!t) throw Error("Owner-aware components must be registered with defineComponent(siteId, render)");
	return t;
}, j = (e, t, n) => {
	let r = e.props.key;
	return r == null ? `@slot:${t}:${n}` : String(r);
}, M = (e, n, r = "0") => {
	if (e == null || e === !1 || typeof e == "string" || typeof e == "number") return e;
	if (Array.isArray(e)) return e.map((e, t) => M(e, n, `${r}.${t}`));
	if (e.type === t) return {
		...e,
		props: {
			...e.props,
			children: M(e.props.children, n, r)
		}
	};
	let i = e.props.key, a = i == null ? `${String(n)}:${r}` : String(i);
	return {
		...e,
		props: {
			...e.props,
			key: a
		}
	};
}, N = (e) => {
	let n = [], r = (e) => e == null || e === !1 ? !0 : Array.isArray(e) ? e.every(r) : typeof e == "string" || typeof e == "number" ? !1 : e.type === t ? r(e.props.children) : typeof e.type == "string" && (n.push(e), !0);
	return !r(e) || n.length !== 1 || n[0].props.key == null ? null : String(n[0].props.key);
}, P = (e) => e == null || e === !1 || typeof e == "string" || typeof e == "number" ? !1 : Array.isArray(e) ? e.some(P) : typeof e.type == "function" || P(e.props.children), F = class {
	world = new e();
	#e;
	#t;
	#n = null;
	#r = /* @__PURE__ */ new Set();
	#i = /* @__PURE__ */ new Map();
	#a = /* @__PURE__ */ new Map();
	#o = /* @__PURE__ */ new Map();
	#s = /* @__PURE__ */ new Map();
	#c = !1;
	#l = !1;
	#u;
	#d;
	#f;
	constructor(e, t, n = {}) {
		if (this.#t = new S(e, t), this.#e = this.world.resolveOwner(null, "@component-root"), this.#u = n.scheduleCommit ?? ((e) => queueMicrotask(e)), n.invalidationPlan) {
			let e = n.invalidationPlan;
			if (e.region_component_site_ids.some((e) => typeof e != "string" || e.length === 0)) throw Error("Component invalidation plan has an invalid component site ID");
			for (let t of e.region_ids) if (t >= e.region_component_site_ids.length) throw Error("Component invalidation region has no component site ID");
			this.#f = {
				dispatcher: new w(e),
				sourceSlots: new Map(e.source_paths.map((e, t) => [e, t])),
				componentSites: e.region_component_site_ids
			};
		}
		this.#d = this.world.subscribeChanges(() => this.#S());
	}
	get version() {
		return this.#t.version;
	}
	get snapshot() {
		return this.#t.snapshot;
	}
	get partialCommitCount() {
		return this.#t.partialCommitCount;
	}
	get partialCommitBatchCount() {
		return this.#t.partialCommitBatchCount;
	}
	mount(e) {
		if (this.#w(), this.version !== 0) throw Error("ComponentStateRoot is already mounted");
		this.#p(e, !0);
	}
	flush() {
		if (this.#w(), this.#l = !1, !this.world.hasPendingChanges()) return !1;
		let e = this.world.pendingChanges(), t = new Set(e.map((e) => e.owner));
		if (this.#f) {
			let n = [];
			for (let t of e) {
				let e = this.#f.sourceSlots.get(t.site);
				e !== void 0 && (this.#f.dispatcher.invalidateSourceSlot(e), n.push(t.owner));
			}
			let r = /* @__PURE__ */ new Set();
			this.#f.dispatcher.flush((e) => r.add(this.#f.componentSites[e]));
			for (let e of n) {
				let n = this.#o.get(e);
				n && !r.has(A(n.type)) && t.delete(e);
			}
		}
		let n = /* @__PURE__ */ new Set();
		for (let e of t) for (let t of this.world.ownerLineage(e)) n.add(t);
		let r = [...t];
		if ((r.length === 1 && e.length === 1 ? this.#g(r[0]) : r.length > 0 && this.#v(r)) || r.length === 1 && e.length === 1 && this.#_(r[0])) return this.world.drainChanges(), !0;
		try {
			this.#p(this.#n, !1, t, n);
		} finally {
			this.#s.clear();
		}
		return this.world.drainChanges(), !0;
	}
	update(e) {
		this.#w(), this.#p(e, !0), this.world.drainChanges();
	}
	dispose() {
		if (this.#c) return;
		this.#c = !0, this.#d(), this.#l = !1, this.#t.dispose();
		let e = this.#y(this.#i.values());
		this.#i.clear(), this.#a.clear();
		for (let e of this.#r) this.world.destroyOwner(e);
		if (this.#r.clear(), this.#o.clear(), this.world.destroyOwner(this.#e), e.length) throw AggregateError(e, "Component effect cleanup failed during dispose");
	}
	#p(e, t, n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set()) {
		let i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = [];
		try {
			let c = this.#C(e, this.#e, i, a, o, s, "root", t, n, r, [], /* @__PURE__ */ new Map());
			this.#t.commit(c);
		} catch (e) {
			for (let e = s.length - 1; e >= 0; e--) this.world.destroyOwner(s[e]);
			throw e;
		}
		this.#n = e;
		let c = this.#r;
		this.#r = i, this.#o = o;
		let l = this.#b(a);
		for (let e of c) i.has(e) || this.world.destroyOwner(e);
		if (l.length) throw AggregateError(l, "Component effect setup or cleanup failed after commit");
	}
	#m(e) {
		let t = this.#o.get(e);
		if (!t) return null;
		let n = /* @__PURE__ */ new Map(), r;
		E.push({
			world: this.world,
			owner: e,
			registerEffect: (t, r) => {
				if (!t || typeof r != "function") throw Error("Invalid effect registration");
				let i = D(e, t);
				if (n.has(i)) throw Error(`Effect site ${t} was registered more than once for owner ${e}`);
				n.set(i, {
					owner: e,
					siteId: t,
					setup: r
				});
			}
		});
		try {
			r = t.type(t.props);
		} finally {
			E.pop();
		}
		return r = M(r, t.hostKeyScope), {
			owner: e,
			result: r,
			ownEffects: n
		};
	}
	#h(e) {
		let t = this.#o.get(e.owner);
		this.#o.set(e.owner, {
			...t,
			result: e.result,
			expandedResult: e.result,
			subtreeOwners: [e.owner],
			ownEffects: e.ownEffects
		});
		let n = this.#x(e.owner, e.ownEffects);
		if (n.length) throw AggregateError(n, "Component effect setup or cleanup failed after partial commit");
	}
	#g(e) {
		let t = this.#o.get(e);
		if (!t || t.subtreeOwners.length !== 1) return !1;
		let n = N(t.expandedResult);
		if (n === null) return !1;
		let r = this.#m(e);
		if (!r) return !1;
		let i = N(r.result);
		return !P(r.result) && i === n && this.#t.commitKeyedRegion(n, r.result) ? (this.#h(r), !0) : (this.#s.set(e, r), !1);
	}
	#_(e) {
		let t = this.#o.get(e);
		if (!t || t.subtreeOwners.length <= 1) return !1;
		let n = N(t.expandedResult);
		if (n === null) return !1;
		let r = this.#m(e);
		if (!r) return !1;
		if (N(r.result) !== n) return this.#s.set(e, r), !1;
		let i = new Set(t.subtreeOwners), a = /* @__PURE__ */ new Set([e]), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = [], l = /* @__PURE__ */ new Map([[e, [e]]]), u = (() => {
			try {
				for (let [e, t] of r.ownEffects) s.set(e, t);
				return this.#C(r.result, e, a, s, o, c, `structural/${A(t.type)}`, !1, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), [e], l);
			} catch (e) {
				for (let e = c.length - 1; e >= 0; e--) this.world.destroyOwner(c[e]);
				throw e;
			}
		})(), d = l.get(e) ?? [e];
		if (o.set(e, {
			...t,
			result: r.result,
			expandedResult: u,
			subtreeOwners: d,
			ownEffects: r.ownEffects
		}), !this.#t.commitKeyedRegion(n, u)) {
			for (let e of d) {
				let t = o.get(e);
				t && this.#s.set(e, {
					owner: e,
					result: t.result,
					ownEffects: t.ownEffects
				});
			}
			return !1;
		}
		let f = [];
		for (let e of i) a.has(e) || (this.#o.delete(e), this.#r.delete(e), f.push(...this.#x(e, /* @__PURE__ */ new Map())), this.world.destroyOwner(e));
		for (let [e, t] of o) this.#o.set(e, t), this.#r.add(e), f.push(...this.#x(e, t.ownEffects));
		if (f.length) throw AggregateError(f, "Component effect setup or cleanup failed after structural commit");
		return !0;
	}
	#v(e) {
		let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
		for (let r of e) {
			let e = this.#o.get(r);
			if (!e || e.subtreeOwners.length !== 1) return !1;
			let i = N(e.expandedResult);
			if (i === null || n.has(i)) return !1;
			n.add(i), t.set(r, i);
		}
		let r = e.map((e) => this.#m(e));
		if (r.some((e) => e === null)) return !1;
		let i = r;
		for (let e of i) if (P(e.result) || N(e.result) !== t.get(e.owner)) {
			for (let e of i) this.#s.set(e.owner, e);
			return !1;
		}
		let a = i.map((e) => ({
			key: t.get(e.owner),
			tree: e.result
		}));
		if (!this.#t.commitKeyedRegions(a)) {
			for (let e of i) this.#s.set(e.owner, e);
			return !1;
		}
		let o = [];
		for (let e of i) {
			let t = this.#o.get(e.owner);
			this.#o.set(e.owner, {
				...t,
				result: e.result,
				expandedResult: e.result,
				subtreeOwners: [e.owner],
				ownEffects: e.ownEffects
			}), o.push(...this.#x(e.owner, e.ownEffects)), this.#s.delete(e.owner);
		}
		if (o.length) throw AggregateError(o, "Component effects failed after multi-region partial commit");
		return !0;
	}
	#y(e) {
		let t = [];
		for (let n of e) if (n.cleanup) try {
			n.cleanup();
		} catch (e) {
			t.push(e);
		}
		return t;
	}
	#b(e) {
		let t = this.#y([...this.#i].filter(([t]) => !e.has(t)).map(([, e]) => e)), n = /* @__PURE__ */ new Map();
		for (let [r, i] of e) {
			let e = this.#i.get(r);
			if (e) n.set(r, e);
			else try {
				let e = i.setup();
				n.set(r, {
					owner: i.owner,
					siteId: i.siteId,
					cleanup: typeof e == "function" ? e : void 0
				});
			} catch (e) {
				t.push(e), n.set(r, {
					owner: i.owner,
					siteId: i.siteId
				});
			}
		}
		this.#i = n, this.#a.clear();
		for (let [e, t] of n) {
			let n = this.#a.get(t.owner);
			n || this.#a.set(t.owner, n = /* @__PURE__ */ new Set()), n.add(e);
		}
		return t;
	}
	#x(e, t) {
		let n = [], r = this.#a.get(e);
		if (r) for (let e of [...r]) {
			if (t.has(e)) continue;
			let i = this.#i.get(e);
			if (i?.cleanup) try {
				i.cleanup();
			} catch (e) {
				n.push(e);
			}
			this.#i.delete(e), r.delete(e);
		}
		for (let [r, i] of t) {
			if (this.#i.has(r)) continue;
			try {
				let t = i.setup();
				this.#i.set(r, {
					owner: e,
					siteId: i.siteId,
					cleanup: typeof t == "function" ? t : void 0
				});
			} catch (t) {
				n.push(t), this.#i.set(r, {
					owner: e,
					siteId: i.siteId
				});
			}
			let t = this.#a.get(e);
			t || this.#a.set(e, t = /* @__PURE__ */ new Set()), t.add(r);
		}
		return this.#a.get(e)?.size === 0 && this.#a.delete(e), n;
	}
	#S() {
		this.#c || this.#l || (this.#l = !0, this.#u(() => {
			this.#c || !this.#l || (this.#l = !1, this.world.hasPendingChanges() && this.flush());
		}));
	}
	#C(e, n, r, i, a, o, s, c, l, u, d, f) {
		if (e == null || e === !1 || typeof e == "string" || typeof e == "number") return e;
		if (Array.isArray(e)) {
			let t = /* @__PURE__ */ new Map(), p = !1, m = e.map((e, m) => {
				let h = `${s}/${m}`, g = e && !Array.isArray(e) && typeof e == "object" && typeof e.type == "function" ? A(e.type) : "", _ = g ? t.get(g) ?? 0 : 0;
				g && t.set(g, _ + 1);
				let v = this.#C(e, n, r, i, a, o, g ? `${h}#${_}` : h, c, l, u, d, f);
				return v !== e && (p = !0), v;
			});
			return p ? m : e;
		}
		if (typeof e.type == "function") {
			let t = A(e.type), p = s.slice(s.lastIndexOf("/") + 1), m = j(e, t, Number(p.split("#").at(-1)) || 0), h = this.world.resolveOwner(n, t, m);
			this.#r.has(h) || o.push(h), r.add(h), f.has(h) || f.set(h, [h]);
			for (let e of d) {
				let t = f.get(e);
				t && t.push(h);
			}
			let { key: g, ref: _, ...v } = e.props, y = this.#o.get(h), b = y !== void 0 && I(y.props, v), x = c || l.has(h) || !y || y.type !== e.type || !b;
			d.push(h);
			try {
				if (!x && y && !u.has(h)) {
					for (let e of y.subtreeOwners) {
						r.add(e);
						let t = this.#o.get(e);
						if (!t) throw Error(`Missing component cache for owner ${e}`);
						a.set(e, t);
						for (let [e, n] of t.ownEffects) i.set(e, n);
						if (e !== h) for (let t of d) f.get(t)?.push(e);
					}
					return y.expandedResult;
				}
				let n = y?.result, p = y?.ownEffects;
				if (x) {
					let t = this.#s.get(h) ?? null;
					if (t) {
						n = t.result, p = t.ownEffects;
						for (let [e, t] of p) i.set(e, t);
					} else {
						p = /* @__PURE__ */ new Map(), E.push({
							world: this.world,
							owner: h,
							registerEffect: (e, t) => {
								if (e.length === 0) throw Error("Effect site ID must not be empty");
								if (typeof t != "function") throw Error("Effect setup must be a function");
								let n = D(h, e);
								if (i.has(n)) throw Error(`Effect site ${e} was registered more than once for owner ${h}`);
								let r = {
									owner: h,
									siteId: e,
									setup: t
								};
								i.set(n, r), p.set(n, r);
							}
						});
						try {
							n = e.type(v);
						} finally {
							E.pop();
						}
						n = M(n, m);
					}
				} else if (p) for (let [e, t] of p) i.set(e, t);
				let g = this.#C(n ?? null, h, r, i, a, o, `${s}/${t}`, c, l, u, d, f), _ = {
					type: e.type,
					hostKeyScope: m,
					props: v,
					result: n ?? null,
					expandedResult: g,
					subtreeOwners: f.get(h) ?? [h],
					ownEffects: p ?? /* @__PURE__ */ new Map()
				};
				return a.set(h, _), g;
			} finally {
				d.pop();
			}
		}
		let p = this.#C(e.props.children, n, r, i, a, o, `${s}/${e.type === t ? "fragment" : e.type}`, c, l, u, d, f);
		return p === e.props.children ? e : {
			...e,
			props: {
				...e.props,
				children: p
			}
		};
	}
	#w() {
		if (this.#c) throw Error("ComponentStateRoot is disposed");
	}
}, I = (e, t) => {
	let n = Object.keys(e), r = Object.keys(t);
	if (n.length !== r.length) return !1;
	for (let r of n) if (!Object.hasOwn(t, r) || !Object.is(e[r], t[r])) return !1;
	return !0;
}, L = O("bundle.counter", () => {
	let [e, t] = k("bundle.counter.count", 0);
	return n("button", { onClick: () => t((e) => e + 1) }, `Count ${e}`);
}), R = document.querySelector("#app");
if (!R) throw Error("Missing #app mount node");
new F(new C(), R).mount(n(L, {}));
//#endregion
