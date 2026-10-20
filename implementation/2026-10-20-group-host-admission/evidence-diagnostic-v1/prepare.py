from pathlib import Path
import difflib
import hashlib
import json
import shutil

PRODUCT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
WORK = HERE / "workspace"
COMPILER_FILES = [
    "compiled_joint_input_transaction_test.mjs",
    "compiled_numeric_descriptor_test_helpers.mjs",
    "vite_native_module.ts",
    "native_compiler_artifact.ts",
    "native_runtime_origin.ts",
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(source, old, new, label):
    count = source.count(old)
    if count != (2 if label == "keyed-structural" else 1):
        raise RuntimeError(f"{label}: expected one match, got {count}")
    return source.replace(old, new, 1)


def segment(source, begin, end, edits):
    start = source.index(begin)
    stop = source.index(end, start + len(begin))
    body = source[start:stop]
    for label, old, new in edits:
        body = replace_once(body, old, new, label)
    return source[:start] + body + source[stop:]


def instrument_root(source):
    source = """const __diag = (label: string, value: boolean, root: string): boolean => {
  if (!value) console.error(`[GROUP-DIAG] ${root} ${label}`);
  return value;
};
""" + source
    source = segment(source, "const preHostLifecycleCurrent =", "const commitHostInternal =", [
        ("lifecycle-phase", 'phase === "prepared"', '__diag("lifecycle.phase", phase === "prepared", this.#rootId)'),
        ("lifecycle-release", '!released &&', '__diag("lifecycle.released", !released, this.#rootId) &&'),
        ("lifecycle-dispose", '!this.#disposed && !this.#disposeRequested &&', '__diag("lifecycle.disposed", !this.#disposed && !this.#disposeRequested, this.#rootId) &&'),
        ("lifecycle-host", '!this.#terminalHostFailed && !this.#hostPublicationDomain.failed &&', '__diag("lifecycle.host", !this.#terminalHostFailed && !this.#hostPublicationDomain.failed, this.#rootId) &&'),
        ("lifecycle-code", '!this.#codeInvalidated &&', '__diag("lifecycle.code", !this.#codeInvalidated, this.#rootId) &&'),
        ("lifecycle-intents", '(scopedDelta || this.#publicationIntents.size === 0 ||\n        (spec.permitHeldFullCandidate?.() ?? false))', '__diag("lifecycle.intents", scopedDelta || this.#publicationIntents.size === 0 ||\n        (spec.permitHeldFullCandidate?.() ?? false), this.#rootId)'),
        ("lifecycle-pending", '(!scopedDelta || spec.permitPendingDirectIntent?.() ||\n        this.#pendingDirectIntent === null)', '__diag("lifecycle.pendingDirect", !scopedDelta || spec.permitPendingDirectIntent?.() ||\n        this.#pendingDirectIntent === null, this.#rootId)'),
        ("lifecycle-base", '(scopedDelta || (this.#publicationVersion === spec.baseVersion &&\n        this.#vdom.version === spec.baseVDOMVersion))', '__diag("lifecycle.base", scopedDelta || (this.#publicationVersion === spec.baseVersion &&\n        this.#vdom.version === spec.baseVDOMVersion), this.#rootId)'),
        ("private-spec", 'spec.validatePreparedPrivate();', '__diag("preHost.specPrivate", spec.validatePreparedPrivate(), this.#rootId);'),
    ])
    source = segment(source, "const validateMixedPreparedPrivate =", "return this.#createCandidateLifecycle({", [
        ("mixed-lease", '(!options.resourceLease ||\n            this.#publicationIntents.has(options.resourceLease))', '__diag("mixed.resourceLease", !options.resourceLease ||\n            this.#publicationIntents.has(options.resourceLease), this.#rootId)'),
        ("mixed-hold", '!this.#resourceHoldWait(new Set([', '__diag("mixed.resourceHold", !this.#resourceHoldWait(new Set(['),
        ("mixed-hold-end", 'collections: [...touchedCollections.map((stage) => stage.region.collection),\n              ...acceptedCollectionVersions.map(([collection]) => collection)],\n          })', 'collections: [...touchedCollections.map((stage) => stage.region.collection),\n              ...acceptedCollectionVersions.map(([collection]) => collection)],\n          }), this.#rootId)'),
        ("mixed-generation", '(options.scopedStructural ||\n            this.#storeNotificationGeneration === storeGenerationAtPrepare)', '__diag("mixed.storeGeneration", options.scopedStructural ||\n            this.#storeNotificationGeneration === storeGenerationAtPrepare, this.#rootId)'),
        ("mixed-preparation", 'preparation.validate() && !preparation.hasStateWrites()', '__diag("mixed.preparation", preparation.validate() && !preparation.hasStateWrites(), this.#rootId)'),
        ("mixed-stores", 'stores.validatePreparedCanonical()', '__diag("mixed.storesCanonical", stores.validatePreparedCanonical(), this.#rootId)'),
        ("mixed-numeric", 'numericWrites.every((write) =>\n            canonicalWorldIsAlive.call(this.world, write.owner) &&\n            canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&\n            canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&\n            capturedScalarCurrent(write.source, write.current)\n          )', '__diag("mixed.numericWrites", numericWrites.every((write) =>\n            canonicalWorldIsAlive.call(this.world, write.owner) &&\n            canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&\n            canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&\n            capturedScalarCurrent(write.source, write.current)\n          ), this.#rootId)'),
        ("mixed-collections", 'touchedCollections.every((stage) =>\n            canonicalCollectionCutCurrent(stage.region.collection, stage.read.toVersion)\n          )', '__diag("mixed.collections", touchedCollections.every((stage) =>\n            canonicalCollectionCutCurrent(stage.region.collection, stage.read.toVersion)\n          ), this.#rootId)'),
        ("mixed-cache", 'validateScopedCachePrivate()', '__diag("mixed.scopedCache", validateScopedCachePrivate(), this.#rootId)'),
        ("mixed-resource", '(resourceReads ? canonicalResourceCutCurrent(resourceReads) : false)', '__diag("mixed.resourceCut", resourceReads ? canonicalResourceCutCurrent(resourceReads) : false, this.#rootId)'),
        ("mixed-vdom", '(preparedProgram?.validatePreparedPrivate() ?? false)', '__diag("mixed.vdomProgram", preparedProgram?.validatePreparedPrivate() ?? false, this.#rootId)'),
        ("mixed-cells", 'this.#validateRetainedCellsPrivate(scopedCellWrites)', '__diag("mixed.retainedCells", this.#validateRetainedCellsPrivate(scopedCellWrites), this.#rootId)'),
        ("mixed-resource-stages", 'resourceStages.every((stage) => stage.privatePreparedCurrent())', '__diag("mixed.resourceStages", resourceStages.every((stage) => stage.privatePreparedCurrent()), this.#rootId)'),
        ("mixed-closed-store", '(closedStoreOutputs?.privatePreparedCurrent() ?? true)', '__diag("mixed.closedStoreOutputs", closedStoreOutputs?.privatePreparedCurrent() ?? true, this.#rootId)'),
        ("mixed-accepted-collections", 'acceptedCollectionVersions.every(([collection, version]) =>\n            canonicalCollectionCutCurrent(collection, version)\n          )', '__diag("mixed.acceptedCollections", acceptedCollectionVersions.every(([collection, version]) =>\n            canonicalCollectionCutCurrent(collection, version)\n          ), this.#rootId)'),
        ("mixed-accepted-resources", 'acceptedResourceVersions.every(([resource, version]) =>\n            canonicalResourceVersionCurrent(resource, version)\n          )', '__diag("mixed.acceptedResources", acceptedResourceVersions.every(([resource, version]) =>\n            canonicalResourceVersionCurrent(resource, version)\n          ), this.#rootId)'),
        ("mixed-cache-code", 'cacheCodeCurrentPrivate(leafCaches.values())', '__diag("mixed.leafCode", cacheCodeCurrentPrivate(leafCaches.values()), this.#rootId)'),
        ("mixed-revisions", 'codeRevisionsCurrent(capturedCodeRevisions)', '__diag("mixed.codeRevisions", codeRevisionsCurrent(capturedCodeRevisions), this.#rootId)'),
        ("mixed-binding", 'validateAdmittedBindings()', '__diag("mixed.bindings", validateAdmittedBindings(), this.#rootId)'),
    ])
    return source


def instrument_vdom(source):
    source = """const __vdomIds = new WeakMap<object, number>();
let __nextVdomId = 1;
const __diag = (label: string, value: boolean, root: object, enabled = true): boolean => {
  if (enabled && !value) {
    let id = __vdomIds.get(root);
    if (!id) __vdomIds.set(root, id = __nextVdomId++);
    console.error(`[GROUP-DIAG] vdom-${id} ${label}`);
  }
  return value;
};
""" + source
    source = segment(source, 'const program: PreparedScopedKeyedRetainedProgram = {', 'return program;', [
        ("composite-state", 'validatePreparedPrivate: () => state === "prepared" &&', 'validatePreparedPrivate: () => __diag("composite.state", state === "prepared", this) &&'),
        ("composite-structural", 'structural.every((plan) => plan.validatePreparedPrivate())', '__diag("composite.structural", structural.every((plan) => plan.validatePreparedPrivate()), this)'),
        ("composite-retained", '(!retained || this.#isRetainedSourceDeltaCurrent(\n          retained, undefined, true, true,\n        ))', '__diag("composite.retained", !retained || this.#isRetainedSourceDeltaCurrent(\n          retained, undefined, true, true,\n        ), this)'),
        ("composite-store", '(!store || this.#isStorePropDeltaCurrent(store, false, false, true))', '__diag("composite.store", !store || this.#isStorePropDeltaCurrent(store, false, false, true), this)'),
    ])
    source = segment(source, 'const program: PreparedKeyedVDOMProgram = {', 'function releasePrepared()', [
        ("keyed-state", 'validatePreparedPrivate: () =>\n        state === "prepared" && admittedHost !== null && !this.#publicationFailed &&', 'validatePreparedPrivate: () =>\n        __diag("keyed.state", state === "prepared" && admittedHost !== null && !this.#publicationFailed, this) &&'),
        ("keyed-structural", '(scoped ? validateScoped() :\n          this.#version === baseVersion && validateTargets())', '__diag("keyed.structural", scoped ? validateScoped() :\n          this.#version === baseVersion && validateTargets(), this)'),
        ("keyed-leaves", '(!hasLeafRegions || preparedLeaves!.validatePreparedPrivate())', '__diag("keyed.leaves", !hasLeafRegions || preparedLeaves!.validatePreparedPrivate(), this)'),
    ])
    source = segment(source, '#isRetainedSourceDeltaCurrent(\n', '/** Apply a projected cut', [
        ("retained-record", 'if (!record || record.root !== this || this.#publicationFailed ||', 'if (!__diag("retained.record", !!record && record.root === this && !this.#publicationFailed, this, privateOnly) ||'),
        ("retained-scalar", 'if (value === null || !Object.is(value, record.readValues[index])) {', 'if (!__diag("retained.scalarValue", value !== null && Object.is(value, record.readValues[index]), this, privateOnly)) {'),
        ("retained-generation", '(group.acceptedWriteGeneration ?? 0) !==\n          record.generations[index]', '!__diag("retained.writerGeneration", (group.acceptedWriteGeneration ?? 0) ===\n          record.generations[index], this, privateOnly)'),
        ("retained-group", '!this.#retainedGroupSourcesCurrent(group, privateOnly)', '!__diag("retained.sources", this.#retainedGroupSourcesCurrent(group, privateOnly), this, privateOnly)'),
        ("retained-closed", '!closedExpressionForBinding(group.rawValue as import("./jsx_binding_runtime.ts").BoundValue)', '!__diag("retained.closedBinding", !!closedExpressionForBinding(group.rawValue as import("./jsx_binding_runtime.ts").BoundValue), this, privateOnly)'),
        ("retained-sink", '!this.#programSinkSlotByGroup.has(group)', '!__diag("retained.sinkSlot", this.#programSinkSlotByGroup.has(group), this, privateOnly)'),
    ])
    return source


def main():
    if WORK.exists():
        failed = HERE / "workspace-preparation-failed-v0"
        if (HERE / "manifest.json").exists() or failed.exists():
            raise RuntimeError("Diagnostic snapshot already exists; preserve it")
        WORK.rename(failed)
        (HERE / "preparation-failure-v0.txt").write_text(
            "Initial preparation stopped at duplicated keyed structural guard; partial snapshot preserved.\n"
        )
    product_files = sorted((PRODUCT / "src").rglob("*"))
    product_files = [path for path in product_files if path.is_file()]
    product_files += [PRODUCT / "compiler" / name for name in COMPILER_FILES]
    product_files += [PRODUCT / "package.json"]
    before = {str(path.relative_to(PRODUCT)): digest(path) for path in product_files}
    shutil.copytree(PRODUCT / "src", WORK / "src")
    (WORK / "compiler").mkdir(parents=True)
    for name in COMPILER_FILES:
        shutil.copy2(PRODUCT / "compiler" / name, WORK / "compiler" / name)
    shutil.copy2(PRODUCT / "package.json", WORK / "package.json")
    (WORK / "node_modules").symlink_to(PRODUCT / "node_modules", target_is_directory=True)
    binary = PRODUCT / "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"
    debug_dir = WORK / "compiler/oxc-spike/target/debug"
    debug_dir.mkdir(parents=True)
    (debug_dir / binary.name).symlink_to(binary)
    originals = {}
    changes = {}
    for name, transform in [("component_state_runtime.ts", instrument_root),
                            ("vdom_snapshot_runtime.ts", instrument_vdom)]:
        target = WORK / "src" / name
        original = target.read_text()
        changed = transform(original)
        target.write_text(changed)
        originals[f"src/{name}"] = digest(PRODUCT / "src" / name)
        changes[f"src/{name}"] = digest(target)
        patch = difflib.unified_diff(original.splitlines(True), changed.splitlines(True),
            fromfile=f"product/src/{name}", tofile=f"diagnostic/src/{name}")
        (HERE / f"{name}.patch").write_text("".join(patch))
    after = {str(path.relative_to(PRODUCT)): digest(path) for path in product_files}
    if before != after:
        raise RuntimeError("Production source changed during snapshot preparation")
    snapshot = {relative: digest(WORK / relative) for relative in before}
    manifest = {
        "schemaVersion": 1,
        "purpose": "One correctness diagnosis of compiled joint input grouped admission",
        "productUnchanged": before == after,
        "productBeforeSha256": before,
        "productAfterSha256": after,
        "snapshotSha256": snapshot,
        "instrumentedOriginalSha256": originals,
        "instrumentedSnapshotSha256": changes,
        "symlinks": [
            {"path": "workspace/node_modules", "target": str(PRODUCT / "node_modules")},
            {"path": "workspace/compiler/oxc-spike/target/debug/ui-graph-compiler-spike", "target": str(binary), "sha256": digest(binary)},
        ],
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
