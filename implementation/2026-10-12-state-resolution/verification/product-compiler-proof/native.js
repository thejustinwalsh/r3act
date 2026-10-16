import { createDOMRoot, createKeyedCollection } from "../native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, bindStatePropAt as __nativeBindStatePropAt } from "../native_runtime_api.ts";
__nativeDefineComponent("src/browser/native_product_mixed_arm.tsx#component:ProductMixedBoard", ProductMixedBoard, { propOnlySites: [] });
__nativeDefineComponent("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow", ProductMixedRow, { propOnlySites: [
	"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0",
	"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1",
	"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2"
] });
import { productMixedState } from "./product_mixed_contract.ts";
function ProductMixedRow({ id, session }) {
	const [x, setX] = __nativeUseStateAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0", 0);
	const [y, setY] = __nativeUseStateAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1", 0);
	const [rotation, setRotation] = __nativeUseStateAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2", 0);
	__nativeUseEffectAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#effect:0", () => {
		const setFrame = (frame) => {
			const state = productMixedState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.mounts++;
		session.rowSetters.set(id, setFrame);
		return () => {
			session.cleanups++;
			if (session.rowSetters.get(id) === setFrame) {
				session.rowSetters.delete(id);
			}
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		className: "entity",
		"data-id": id,
		style: {
			left: __nativeBindStatePropAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0", (x) => `${x}px`),
			top: __nativeBindStatePropAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1", (y) => `${y}px`),
			transform: __nativeBindStatePropAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2", (rotation) => `rotate(${rotation}deg)`)
		}
	});
}
function ProductMixedBoard({ rows, session }) {
	return /* @__PURE__ */ __nativeJsx.jsx("div", { className: "board" }, __nativeRenderCollectionAt("src/browser/native_product_mixed_arm.tsx#component:ProductMixedBoard#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(ProductMixedRow, {
		key: row.id,
		id: row.id,
		session
	}))));
}
const applyEdit = (session, edit) => {
	const rows = session.rows;
	if (!rows) throw new Error("Cannot edit a disposed product mixed collection");
	const removed = new Set(edit.removed);
	const retained = session.currentIds.filter((id) => !removed.has(id));
	const beforeMove = [...retained, ...edit.inserted];
	const movedPrefix = beforeMove.slice(0, 13);
	const target = [...beforeMove.slice(13), ...movedPrefix];
	const operations = [];
	for (const id of edit.removed) {
		operations.push({
			type: "remove",
			key: String(id)
		});
	}
	for (const id of edit.inserted) {
		operations.push({
			type: "insert",
			key: String(id),
			value: { id },
			beforeKey: null
		});
	}
	for (const id of movedPrefix) {
		operations.push({
			type: "move",
			key: String(id),
			beforeKey: null
		});
	}
	if (operations.length > 0) {
		const result = rows.apply(rows.version, operations);
		if (!result.ok) {
			throw new Error(`Product mixed collection edit failed: ${result.reason}`);
		}
	}
	session.currentIds = target;
};
export const createProductMixedNative = (container, ids) => {
	const initialIds = [...ids];
	let rows = createKeyedCollection(initialIds.map((id) => ({ id })), (row) => String(row.id));
	const session = {
		rows,
		rowSetters: new Map(),
		currentIds: initialIds,
		mounts: 0,
		cleanups: 0
	};
	let root = createDOMRoot(container, { scheduleCommit: () => {} });
	let disposed = false;
	let finalRootDiagnostics = {};
	let finalCollectionStats = null;
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(ProductMixedBoard, {
		rows,
		session
	}));
	root.flush();
	for (const setFrame of session.rowSetters.values()) setFrame(0);
	root.flush();
	return {
		step(frame, edit) {
			if (disposed || !root) {
				throw new Error("Cannot step a disposed product mixed controller");
			}
			if (!edit) {
				for (const setFrame of session.rowSetters.values()) {
					setFrame(frame);
				}
				root.flush();
				return;
			}
			const removed = new Set(edit.removed);
			for (const [id, setFrame] of session.rowSetters) {
				if (removed.has(id)) continue;
				setFrame(frame);
			}
			applyEdit(session, edit);
			root.flush();
			let insertedRowsNeedFrame = false;
			for (const id of edit.inserted) {
				const setFrame = session.rowSetters.get(id);
				if (setFrame) {
					setFrame(frame);
					insertedRowsNeedFrame = true;
				}
			}
			if (insertedRowsNeedFrame) root.flush();
		},
		diagnostics() {
			return {
				renders: -1,
				mounts: session.mounts,
				cleanups: session.cleanups,
				writers: session.rowSetters.size,
				extra: {
					root: root?.diagnostics() ?? finalRootDiagnostics,
					collection: rows?.stats() ?? finalCollectionStats,
					collectionSize: rows?.size ?? 0,
					collectionVersion: rows?.version ?? null,
					registeredSetters: session.rowSetters.size
				}
			};
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			if (root) {
				root.dispose();
				finalRootDiagnostics = root.diagnostics();
				finalCollectionStats = rows?.stats() ?? null;
				root = null;
			}
			session.rowSetters.clear();
			session.currentIds = [];
			session.rows = null;
			rows = null;
		}
	};
};
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": "src/browser/native_product_mixed_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  createKeyedCollection,\n  type KeyedCollection,\n  useEffect,\n  useState,\n} from \"../native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../native_runtime_api.ts\";\n__nativeDefineComponent(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedBoard\", ProductMixedBoard, { propOnlySites: [] });\n__nativeDefineComponent(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow\", ProductMixedRow, { propOnlySites: [\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0\", \"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1\", \"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2\"] });\nimport type {\n  ProductMixedController,\n  ProductMixedDiagnostics,\n  ProductMixedEdit,\n  ProductMixedFactory,\n} from \"./product_mixed_contract.ts\";\nimport { productMixedState } from \"./product_mixed_contract.ts\";\n\ntype ProductMixedRowData = { id: number };\ntype FrameSetter = (frame: number) => void;\ntype ProductMixedSession = {\n  rows: KeyedCollection<ProductMixedRowData> | null;\n  rowSetters: Map<number, FrameSetter>;\n  currentIds: number[];\n  mounts: number;\n  cleanups: number;\n};\n\nfunction ProductMixedRow({\n  id,\n  session,\n}: {\n  id: number;\n  session: ProductMixedSession;\n  key?: string | number;\n}) {\n  const [x, setX] = __nativeUseStateAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1\", 0);\n  const [rotation, setRotation] = __nativeUseStateAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2\", 0);\n\n  __nativeUseEffectAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#effect:0\", () => {\n    const setFrame: FrameSetter = (frame) => {\n      const state = productMixedState(id, frame);\n      setX(state.x);\n      setY(state.y);\n      setRotation(state.rotation);\n    };\n    session.mounts++;\n    session.rowSetters.set(id, setFrame);\n    return () => {\n      session.cleanups++;\n      if (session.rowSetters.get(id) === setFrame) {\n        session.rowSetters.delete(id);\n      }\n    };\n  });\n\n  return (\n    <i\n      className=\"entity\"\n      data-id={id}\n      style={{\n        left: __nativeBindStatePropAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0\", (x) => (`${x}px`)),\n        top: __nativeBindStatePropAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1\", (y) => (`${y}px`)),\n        transform: __nativeBindStatePropAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2\", (rotation) => (`rotate(${rotation}deg)`)),\n      }}\n    />\n  );\n}\n\nfunction ProductMixedBoard({ rows, session }: { rows: KeyedCollection<ProductMixedRowData>; session: ProductMixedSession }) {\n  return (\n    <div className=\"board\">\n      {__nativeRenderCollectionAt(\"src/browser/native_product_mixed_arm.tsx#component:ProductMixedBoard#collection:0\", rows, ((row) => (\n        <ProductMixedRow key={row.id} id={row.id} session={session} />\n      )))}\n    </div>\n  );\n}\n\nconst applyEdit = (\n  session: ProductMixedSession,\n  edit: ProductMixedEdit,\n) => {\n  const rows = session.rows;\n  if (!rows) throw new Error(\"Cannot edit a disposed product mixed collection\");\n  const removed = new Set(edit.removed);\n  const retained = session.currentIds.filter((id) => !removed.has(id));\n  const beforeMove = [...retained, ...edit.inserted];\n  const movedPrefix = beforeMove.slice(0, 13);\n  const target = [...beforeMove.slice(13), ...movedPrefix];\n\n  const operations: Array<\n    | { type: \"remove\"; key: string }\n    | {\n      type: \"insert\";\n      key: string;\n      value: ProductMixedRowData;\n      beforeKey: string | null;\n    }\n    | { type: \"move\"; key: string; beforeKey: string | null }\n  > = [];\n  for (const id of edit.removed) {\n    operations.push({ type: \"remove\", key: String(id) });\n  }\n  for (const id of edit.inserted) {\n    operations.push({\n      type: \"insert\",\n      key: String(id),\n      value: { id },\n      beforeKey: null,\n    });\n  }\n  for (const id of movedPrefix) {\n    operations.push({ type: \"move\", key: String(id), beforeKey: null });\n  }\n\n  if (operations.length > 0) {\n    const result = rows.apply(rows.version, operations);\n    if (!result.ok) {\n      throw new Error(`Product mixed collection edit failed: ${result.reason}`);\n    }\n  }\n  session.currentIds = target;\n};\n\nexport const createProductMixedNative: ProductMixedFactory = (\n  container,\n  ids,\n): ProductMixedController => {\n  const initialIds = [...ids];\n  let rows: KeyedCollection<ProductMixedRowData> | null = createKeyedCollection(\n    initialIds.map((id) => ({ id })),\n    (row) => String(row.id),\n  );\n  const session: ProductMixedSession = {\n    rows,\n    rowSetters: new Map(),\n    currentIds: initialIds,\n    mounts: 0,\n    cleanups: 0,\n  };\n  let root: ReturnType<typeof createDOMRoot> | null = createDOMRoot(container, {\n    scheduleCommit: () => {},\n  });\n  let disposed = false;\n  let finalRootDiagnostics: Readonly<Record<string, unknown>> = {};\n  let finalCollectionStats: ReturnType<KeyedCollection<ProductMixedRowData>[\"stats\"]> | null = null;\n\n  root.mount(<ProductMixedBoard rows={rows} session={session} />);\n  root.flush();\n  for (const setFrame of session.rowSetters.values()) setFrame(0);\n  root.flush();\n\n  return {\n    step(frame, edit) {\n      if (disposed || !root) {\n        throw new Error(\"Cannot step a disposed product mixed controller\");\n      }\n      if (!edit) {\n        for (const setFrame of session.rowSetters.values()) {\n          setFrame(frame);\n        }\n        root.flush();\n        return;\n      }\n\n      const removed = new Set(edit.removed);\n      for (const [id, setFrame] of session.rowSetters) {\n        if (removed.has(id)) continue;\n        setFrame(frame);\n      }\n      applyEdit(session, edit);\n      root.flush();\n\n      let insertedRowsNeedFrame = false;\n      for (const id of edit.inserted) {\n        const setFrame = session.rowSetters.get(id);\n        if (setFrame) {\n          setFrame(frame);\n          insertedRowsNeedFrame = true;\n        }\n      }\n      if (insertedRowsNeedFrame) root.flush();\n    },\n    diagnostics(): ProductMixedDiagnostics {\n      return {\n        renders: -1,\n        mounts: session.mounts,\n        cleanups: session.cleanups,\n        writers: session.rowSetters.size,\n        extra: {\n          root: root?.diagnostics() ?? finalRootDiagnostics,\n          collection: rows?.stats() ?? finalCollectionStats,\n          collectionSize: rows?.size ?? 0,\n          collectionVersion: rows?.version ?? null,\n          registeredSetters: session.rowSetters.size,\n        },\n      };\n    },\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      if (root) {\n        root.dispose();\n        finalRootDiagnostics = root.diagnostics();\n        finalCollectionStats = rows?.stats() ?? null;\n        root = null;\n      }\n      session.rowSetters.clear();\n      session.currentIds = [];\n      session.rows = null;\n      rows = null;\n    },\n  };\n};\n",
	"components": [{
		"name": "ProductMixedBoard",
		"component_site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedBoard",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [{
			"site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedBoard#collection:0",
			"source_expression": "rows",
			"row_parameter": "row",
			"requires_owner_render": false
		}]
	}, {
		"name": "ProductMixedRow",
		"component_site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow",
		"prop_only_sites": [
			"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0",
			"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1",
			"src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2"
		],
		"host_leaf_output": false,
		"state_sites": [
			{
				"site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:0",
				"initial_value": "0"
			},
			{
				"site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:1",
				"initial_value": "0"
			},
			{
				"site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:2",
				"initial_value": "0"
			}
		],
		"effect_sites": [{ "site_id": "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#effect:0" }],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "../native_runtime_api.ts";
