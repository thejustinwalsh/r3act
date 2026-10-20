import { createNativeRoot, jsx } from "@r3act/core";
const node = (tag, text = null) => ({
	tag,
	props: {},
	children: [],
	parent: null,
	text
});
const check = (condition, message) => {
	if (!condition) throw new Error(`public copy host: ${message}`);
};
export function verifyPublicCopyHost() {
	const container = node("container");
	const sample = {
		x: 1,
		y: 2,
		z: 3
	};
	const payload = { retained: true };
	let sampleWrites = 0;
	let payloadWrites = 0;
	const host = {
		createElement(tag) {
			return node(tag);
		},
		createText(text) {
			return node("#text", text);
		},
		setText(target, text) {
			target.text = text;
		},
		setProp(target, name, value) {
			if (name === "sample") {
				sampleWrites++;
				const copy = value;
				target.props[name] = {
					x: copy.x,
					y: copy.y,
					z: copy.z
				};
			} else {
				if (name === "payload") payloadWrites++;
				target.props[name] = value;
			}
		},
		capturePropertyValue(_target, name, next) {
			if (name !== "sample" || !next || typeof next !== "object") return null;
			const value = next;
			if (![
				value.x,
				value.y,
				value.z
			].every((item) => typeof item === "number")) return null;
			const writeValue = Object.freeze({
				x: value.x,
				y: value.y,
				z: value.z
			});
			const comparison = Object.freeze([
				writeValue.x,
				writeValue.y,
				writeValue.z
			]);
			return Object.freeze({
				kind: "copy",
				writeValue,
				comparison
			});
		},
		place(parent, child, before) {
			if (child.parent) {
				const old = child.parent.children.indexOf(child);
				if (old >= 0) child.parent.children.splice(old, 1);
			}
			const index = before ? parent.children.indexOf(before) : parent.children.length;
			check(index >= 0, "placement anchor is missing");
			parent.children.splice(index, 0, child);
			child.parent = parent;
		},
		remove(parent, child) {
			const index = parent.children.indexOf(child);
			check(index >= 0, "removed child is missing");
			parent.children.splice(index, 1);
			child.parent = null;
		}
	};
	const root = createNativeRoot(host, container, { rootId: "public-copy-host-contract" });
	try {
		const tree = () => jsx("sample", {
			key: "sample",
			sample,
			payload
		});
		root.mount(tree());
		const mounted = container.children[0];
		check(mounted?.props.sample !== sample, "initial sample was retained by reference");
		check(mounted.props.payload === payload, "payload was copied");
		const initialSampleWrites = sampleWrites;
		const initialPayloadWrites = payloadWrites;
		sample.x = 4;
		root.update(tree());
		check(container.children[0] === mounted, "host identity changed on a prop update");
		check(mounted.props.sample.x === 4, "mutated same-reference sample stayed stale");
		check(sampleWrites === initialSampleWrites + 1, "changed copied sample did not write exactly once");
		check(payloadWrites === initialPayloadWrites, "unchanged retained payload was force-written");
		root.update(tree());
		check(sampleWrites === initialSampleWrites + 1, "unchanged copied sample was written again");
		check(payloadWrites === initialPayloadWrites, "unchanged retained payload was written again");
		return {
			status: "PASS_PUBLIC_COPY_HOST",
			sampleWrites,
			payloadWrites,
			copied: { ...mounted.props.sample }
		};
	} finally {
		root.dispose();
		check(container.children.length === 0, "dispose left mounted children");
	}
}
