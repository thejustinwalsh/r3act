import { normalizeClosedNumericExpression } from "./closed_numeric_expression.js";
import { captureClosedCollectionRowInputs, evaluateClosedCollectionRowProgram, normalizeClosedCollectionRowProgram, } from "./closed_collection_row_program.js";
import { normalizeClosedComponentForwardProgram, } from "./closed_component_forward_program.js";
import { closedStoreHostInputs, closedStoreHostInputPaths, evaluateClosedStoreHostProgram, evaluateClosedStoreHostTree, normalizeClosedStoreHostProgram, } from "./closed_store_host_program.js";
import { evaluateClosedResourceHostProgram, normalizeClosedResourceHostProgram, } from "./closed_resource_host_program.js";
import { captureCompiledSemanticRevision, isCompiledSemanticRevisionCurrent, subscribeCompiledSemanticRevision, } from "./compiled_semantic_plan.js";
import { AsyncStore, captureCanonicalStoreReaderReceipt, inspectCanonicalStoreReaderReceipt, StoreRenderTransaction, } from "./async_store_runtime.js";
import { AsyncResource, AsyncResourceTable, isPendingResourceToken, ResourceRejection, } from "./async_resource_runtime.js";
import { canonicalResourceVersion, closedResourceStatus, ResourceReadSet, } from "./resource_read_set.js";
import { captureClosedProjectionValues } from "./owned_store_record.js";
import { snapshotScopedHostProp } from "./scoped_host_values.js";
import { assertHostPublicationClaim, createHostPublicationClaim, hostPublicationDomain, isHostPublicationDomainBusy, quarantineHostPublicationDomains, releaseHostPublicationDomains, subscribeHostPublicationAvailability, tryClaimHostPublicationDomains, } from "./host_publication_domain.js";
import { PendingStateChanges } from "./pending_state_changes.js";
import { associateCompiledOwnerUpdateProgram, compiledStateLayoutSlot, normalizeCompiledStateLayout, } from "./compiled_state_layout.js";
import { OwnerStateWorld, } from "./owner_state_world.js";
import { bindSources, bindStateSource, canRebindCapturedBindingSources, canonicalScalarSourceValue, copyKeyedOwnerMetadata, copyRuntimeElement, createKeyedOwnerVersion, Fragment, getKeyedOwnerRegionId, getKeyedOwnerVersion, isRuntimeOwnedElement, keyedOwnerChildren, rebindCapturedBindingSources, stampComponentOutput, } from "./jsx_binding_runtime.js";
import { VDOMSnapshotRoot, } from "./vdom_snapshot_runtime.js";
import { DerivedRegionDispatcher, } from "./derived_region_runtime.js";
import { canonicalCollectionApiIntact, canonicalCollectionEntry, canonicalCollectionVersion, prepareCollectionReaderAcknowledgement, } from "./keyed_collection.js";
const collectCleanupErrors = (actions) => {
    const errors = [];
    for (const action of actions) {
        try {
            action();
        }
        catch (error) {
            errors.push(error);
        }
    }
    return errors;
};
const throwWithCleanup = (error, errors) => {
    if (errors.length) {
        throw new AggregateError([error, ...errors], "Publication and cleanup failed");
    }
    throw error;
};
const sameClosedHostOutput = (tag, name, previous, next) => {
    if (Object.is(previous, next))
        return true;
    try {
        const oldValue = snapshotScopedHostProp(tag, name, previous);
        const newValue = snapshotScopedHostProp(tag, name, next);
        if (!oldValue.accepted || !newValue.accepted)
            return false;
        const old = oldValue.value, proposed = newValue.value;
        if (Object.is(old, proposed))
            return true;
        if (Array.isArray(old) && Array.isArray(proposed)) {
            return old.length === proposed.length &&
                old.every((value, index) => Object.is(value, proposed[index]));
        }
        if (old && proposed && typeof old === "object" && typeof proposed === "object") {
            const keys = Object.keys(old);
            return keys.length === Object.keys(proposed).length &&
                keys.every((key) => Object.hasOwn(proposed, key) &&
                    Object.is(old[key], proposed[key]));
        }
        return false;
    }
    catch {
        return false;
    }
};
const componentRegistration = Symbol("compiled-component-registration");
const definedComponents = new WeakMap();
class SparseCandidateIneligible extends Error {
}
class HeldPublicationWait extends Error {
    resource;
    constructor(resource) {
        super("Publication is held");
        this.resource = resource;
    }
}
const groupPublicationReceipts = new WeakMap();
/** Recheck every private cut after the last grouped caller callback. */
export const admitPreparedNativeGroup = (candidates) => candidates.every((candidate) => groupPublicationReceipts.get(candidate)?.preHostCurrent() === true);
/** Apply one already-admitted group member without repeating public preflight. */
export const commitAdmittedNativeCandidate = (candidate) => {
    const receipt = groupPublicationReceipts.get(candidate);
    if (!receipt)
        throw new Error("Native candidate has no live publication receipt");
    receipt.commitAdmitted();
};
class HostPublicationBusyError extends Error {
    constructor() { super("Host publication domain is busy"); }
}
export class UnsupportedGroupOpaqueFreshnessError extends Error {
    constructor(kind = "input") {
        super(`Grouped host admission requires canonical freshness for opaque ${kind}`);
    }
}
const rootHostPublicationDomain = Symbol("native.root.host-publication-domain");
export const isNativeRootHostPublicationBusy = (root) => isHostPublicationDomainBusy(root[rootHostPublicationDomain]());
export const subscribeNativeRootHostPublication = (root, callback) => subscribeHostPublicationAvailability([root[rootHostPublicationDomain]()], callback);
/** Claim every host touched by one prepared native group before its first write. */
export const claimPreparedNativeGroup = (candidates) => {
    const receipts = candidates.map((candidate) => groupPublicationReceipts.get(candidate));
    if (receipts.some((receipt) => !receipt)) {
        throw new Error("Native candidate has no live publication receipt");
    }
    const domains = [...new Set(receipts.map((receipt) => receipt.domain))];
    const claim = createHostPublicationClaim();
    if (tryClaimHostPublicationDomains(domains, claim) === "busy") {
        return {
            status: "busy",
            subscribe: (callback) => subscribeHostPublicationAvailability(domains, callback),
        };
    }
    const touched = new Set();
    for (const receipt of receipts) {
        receipt.bindClaim(claim, () => { touched.add(receipt.domain); }, () => touched.size > 0);
    }
    let released = false;
    return {
        status: "claimed",
        release: () => {
            if (released)
                return;
            released = true;
            releaseHostPublicationDomains(domains, claim);
        },
        quarantine: (error) => {
            if (!touched.size)
                return false;
            quarantineHostPublicationDomains([...touched], claim, error);
            return true;
        },
    };
};
/** Accept a prepared group using only its private final admission receipts. */
export const publishPreparedNativeGroup = (candidates) => {
    const receipts = candidates.map((candidate) => groupPublicationReceipts.get(candidate));
    if (receipts.some((receipt) => !receipt) ||
        receipts.some((receipt) => !receipt.current())) {
        throw new Error("Native candidate became stale before grouped publication");
    }
    for (const receipt of receipts)
        receipt.accept();
};
const sameClosedBoundaryNode = (left, right, depth = 0) => {
    if (Object.is(left, right))
        return true;
    if (depth > 32 || !isRuntimeOwnedElement(left) ||
        !isRuntimeOwnedElement(right))
        return false;
    const leftType = Object.getOwnPropertyDescriptor(left, "type")?.value;
    const rightType = Object.getOwnPropertyDescriptor(right, "type")?.value;
    const leftProps = Object.getOwnPropertyDescriptor(left, "props")?.value;
    const rightProps = Object.getOwnPropertyDescriptor(right, "props")?.value;
    if (leftType !== rightType || !leftProps || !rightProps ||
        Object.getPrototypeOf(leftProps) !== Object.prototype ||
        Object.getPrototypeOf(rightProps) !== Object.prototype ||
        !Object.isFrozen(leftProps) || !Object.isFrozen(rightProps))
        return false;
    const leftKeys = Reflect.ownKeys(leftProps);
    const rightKeys = Reflect.ownKeys(rightProps);
    if (leftKeys.length !== rightKeys.length || leftKeys.length > 64)
        return false;
    return leftKeys.every((key, index) => {
        if (key !== rightKeys[index])
            return false;
        const a = Object.getOwnPropertyDescriptor(leftProps, key);
        const b = Object.getOwnPropertyDescriptor(rightProps, key);
        return !!a && !!b && "value" in a && "value" in b &&
            sameClosedBoundaryNode(a.value, b.value, depth + 1);
    });
};
const sameClosedBoundaryProps = (element, accepted) => {
    if (!isRuntimeOwnedElement(element))
        return false;
    const props = Object.getOwnPropertyDescriptor(element, "props")?.value;
    if (!props || Object.getPrototypeOf(props) !== Object.prototype ||
        Object.getPrototypeOf(accepted) !== Object.prototype ||
        !Object.isFrozen(props))
        return false;
    const keys = Reflect.ownKeys(props);
    const acceptedKeys = Reflect.ownKeys(accepted);
    if (keys.length !== acceptedKeys.length || keys.length > 64)
        return false;
    return keys.every((key, index) => {
        if (key !== acceptedKeys[index])
            return false;
        const current = Object.getOwnPropertyDescriptor(props, key);
        const previous = Object.getOwnPropertyDescriptor(accepted, key);
        return !!current && !!previous && "value" in current &&
            "value" in previous &&
            sameClosedBoundaryNode(current.value, previous.value);
    });
};
const collectionRegionDescriptors = new WeakMap();
const activeOwners = [];
class StaleCollectionCandidate extends Error {
}
/** Native local resource boundary. The runtime recognizes this marker before invoking it. */
export const Suspense = (props) => props.children ?? null;
const isPendingResource = (error) => isPendingResourceToken(error);
const worldResourceTables = new WeakMap();
class ExpansionJournal {
    #undo = [];
    checkpoint() {
        return this.#undo.length;
    }
    clear() {
        this.#undo.length = 0;
    }
    rollback(cursor) {
        for (let i = this.#undo.length - 1; i >= cursor; i--)
            this.#undo[i]();
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
            if (!had)
                set.delete(value);
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
}
const effectKey = (owner, siteId) => `${owner}\u0000${siteId}`;
const closedCandidateValidate = () => false;
const closedCandidateAction = () => {
    throw new Error("Native root candidate is closed");
};
const closedCandidateNoop = () => { };
const closedCandidateLease = () => closedCandidateNoop;
/** Attach the stable component-site ID that a compiler would emit for a function component. */
export const defineComponent = (siteId, render, metadata) => {
    if (siteId.length === 0) {
        throw new Error("Component site ID must not be empty");
    }
    const priorDefinition = definedComponents.get(render);
    if (priorDefinition && priorDefinition.siteId === siteId &&
        !metadata && !priorDefinition.metadata &&
        siteId.lastIndexOf("#component:") < 0)
        return render;
    if (priorDefinition) {
        throw new TypeError("Component function is already registered");
    }
    const moduleEnd = siteId.lastIndexOf("#component:");
    let normalizedMetadata;
    if (metadata || moduleEnd >= 0) {
        const propOnlySites = [...(metadata?.propOnlySites ?? [])];
        if (propOnlySites.some((site) => typeof site !== "string" || !site)) {
            throw new Error("Component prop-only metadata contains an invalid state site ID");
        }
        if (metadata?.numericPrimitiveProps !== undefined &&
            !Array.isArray(metadata.numericPrimitiveProps)) {
            throw new Error("Component numeric primitive prop metadata is invalid");
        }
        const numericPrimitiveProps = metadata?.numericPrimitiveProps === undefined
            ? undefined : [...metadata.numericPrimitiveProps];
        if (numericPrimitiveProps?.some((name) => typeof name !== "string" || !name || name === "key" || name === "ref")) {
            throw new Error("Component numeric primitive prop metadata is invalid");
        }
        if (metadata?.numericRetainedProps !== undefined &&
            !Array.isArray(metadata.numericRetainedProps)) {
            throw new Error("Component numeric retained prop metadata is invalid");
        }
        const numericRetainedProps = metadata?.numericRetainedProps === undefined
            ? undefined : [...metadata.numericRetainedProps];
        if (numericRetainedProps &&
            (numericRetainedProps.some((name) => name !== "children") ||
                new Set(numericRetainedProps).size !== numericRetainedProps.length)) {
            throw new Error("Component numeric retained prop metadata is invalid");
        }
        if (metadata?.closedCollectionSites !== undefined &&
            !Array.isArray(metadata.closedCollectionSites)) {
            throw new Error("Component collection site metadata is invalid");
        }
        const closedCollectionSites = metadata?.closedCollectionSites === undefined
            ? undefined : [...metadata.closedCollectionSites];
        if (closedCollectionSites?.some((site) => typeof site !== "string" || !site))
            throw new Error("Component collection site metadata is invalid");
        if (metadata?.closedCollectionRowPrograms !== undefined &&
            !Array.isArray(metadata.closedCollectionRowPrograms)) {
            throw new Error("Closed collection row program metadata is invalid");
        }
        const closedCollectionRowPrograms = metadata?.closedCollectionRowPrograms?.map((raw) => {
            const program = normalizeClosedCollectionRowProgram(raw);
            if (!program)
                throw new Error("Closed collection row program metadata is invalid");
            return program;
        });
        if (closedCollectionRowPrograms && (closedCollectionRowPrograms.some((program) => program.componentProgramId !== siteId ||
            !closedCollectionSites?.includes(program.collectionSiteId)) || new Set(closedCollectionRowPrograms.map((program) => program.collectionSiteId)).size !== closedCollectionRowPrograms.length)) {
            throw new Error("Closed collection row program must match its owner and site");
        }
        let stateLayout;
        if (metadata?.stateLayout !== undefined) {
            const layout = metadata.stateLayout;
            if (layout.programId !== undefined && layout.programId !== siteId) {
                throw new Error("Compiled state layout program ID must match its component site");
            }
            const normalized = normalizeCompiledStateLayout(layout);
            if (normalized.slots.some((entry) => !propOnlySites.includes(entry.siteId))) {
                throw new Error("Invalid compiled state layout slot");
            }
            stateLayout = normalized;
        }
        if (metadata?.ownerUpdateProgram !== undefined) {
            const program = metadata.ownerUpdateProgram;
            if (!stateLayout || program.programId !== siteId ||
                stateLayout.programId !== siteId) {
                throw new Error("Compiled owner update program must match its component and state layout IDs");
            }
            if ((program.schemaVersion === 3) !==
                (numericRetainedProps?.length === 1 &&
                    numericRetainedProps[0] === "children")) {
                throw new Error("Retained-child admission requires matching owner program schema 3 metadata");
            }
            associateCompiledOwnerUpdateProgram(stateLayout, program);
        }
        else if (numericRetainedProps?.length) {
            throw new Error("Numeric retained props require a compiled owner update program");
        }
        const closedResourceHostProgram = metadata?.closedResourceHostProgram === undefined
            ? undefined
            : normalizeClosedResourceHostProgram(metadata.closedResourceHostProgram);
        if (metadata?.closedResourceHostProgram !== undefined &&
            (!closedResourceHostProgram || closedResourceHostProgram.componentProgramId !== siteId)) {
            throw new Error("Closed resource host program must match its component revision");
        }
        const closedStoreHostProgram = metadata?.closedStoreHostProgram === undefined
            ? undefined : normalizeClosedStoreHostProgram(metadata.closedStoreHostProgram);
        if (metadata?.closedStoreHostProgram !== undefined &&
            (!closedStoreHostProgram || closedStoreHostProgram.componentProgramId !== siteId)) {
            throw new Error("Closed Store host program must match its component revision");
        }
        const closedComponentForwardProgram = metadata?.closedComponentForwardProgram === undefined
            ? undefined : normalizeClosedComponentForwardProgram(metadata.closedComponentForwardProgram);
        if (metadata?.closedComponentForwardProgram !== undefined &&
            (!closedComponentForwardProgram || closedComponentForwardProgram.componentProgramId !== siteId)) {
            throw new Error("Closed component forward program must match its component revision");
        }
        const revisions = [stateLayout?.moduleRevision,
            closedResourceHostProgram?.moduleRevision, closedStoreHostProgram?.moduleRevision,
            closedComponentForwardProgram?.moduleRevision,
            ...(closedCollectionRowPrograms?.map((program) => program.moduleRevision) ?? [])]
            .filter((value) => value !== undefined);
        const expectedRevision = revisions[0];
        if (revisions.some((revision) => revision !== expectedRevision)) {
            throw new Error("Compiled component programs disagree on module revision");
        }
        const revision = moduleEnd < 0 ? undefined : captureCompiledSemanticRevision(siteId.slice(0, moduleEnd), expectedRevision);
        if (expectedRevision && !revision) {
            throw new Error("Compiled component program has no matching module revision");
        }
        normalizedMetadata = Object.freeze({
            propOnlySites: Object.freeze(propOnlySites),
            ...(numericPrimitiveProps
                ? { numericPrimitiveProps: Object.freeze(numericPrimitiveProps) }
                : {}),
            ...(numericRetainedProps
                ? { numericRetainedProps: Object.freeze(numericRetainedProps) }
                : {}),
            ...(closedCollectionSites
                ? { closedCollectionSites: Object.freeze(closedCollectionSites) }
                : {}),
            ...(closedCollectionRowPrograms
                ? { closedCollectionRowPrograms: Object.freeze(closedCollectionRowPrograms) }
                : {}),
            hostLeafOutput: metadata?.hostLeafOutput === true,
            ...(revision ? { revision } : {}),
            ...(stateLayout ? { stateLayout } : {}),
            ...(closedResourceHostProgram ? { closedResourceHostProgram } : {}),
            ...(closedStoreHostProgram ? { closedStoreHostProgram } : {}),
            ...(closedComponentForwardProgram ? { closedComponentForwardProgram } : {}),
        });
    }
    const registration = Object.freeze({ siteId, metadata: normalizedMetadata });
    Object.defineProperty(render, componentRegistration, { value: registration });
    definedComponents.set(render, registration);
    return render;
};
const emptyCompiledPropSites = new Set();
const componentRevision = (component) => typeof component === "function"
    ? (definedComponents.get(component) ??
        component[componentRegistration])?.metadata?.revision
    : undefined;
const componentCodeCurrent = (component) => {
    const revision = componentRevision(component);
    return !revision || isCompiledSemanticRevisionCurrent(revision);
};
const componentCodeCurrentPrivate = (component) => {
    const revision = typeof component === "function"
        ? definedComponents.get(component)?.metadata?.revision : undefined;
    return !revision || isCompiledSemanticRevisionCurrent(revision);
};
const treeReferencesCompiledSource = (node, sourceFile, seen = new WeakSet()) => {
    if (node == null || typeof node !== "object")
        return false;
    if (seen.has(node))
        return true;
    seen.add(node);
    try {
        if (Array.isArray(node)) {
            const length = Object.getOwnPropertyDescriptor(node, "length")?.value;
            if (typeof length !== "number")
                return true;
            for (let index = 0; index < length; index++) {
                const child = Object.getOwnPropertyDescriptor(node, String(index));
                if (!child || !("value" in child) ||
                    treeReferencesCompiledSource(child.value, sourceFile, seen))
                    return true;
            }
            return false;
        }
        const type = Object.getOwnPropertyDescriptor(node, "type");
        const props = Object.getOwnPropertyDescriptor(node, "props");
        if (!type || !("value" in type) || !props || !("value" in props) ||
            props.value === null || typeof props.value !== "object")
            return true;
        if (componentRevision(type.value)?.sourceFile === sourceFile)
            return true;
        const children = Object.getOwnPropertyDescriptor(props.value, "children");
        return !!children && (!("value" in children) ||
            treeReferencesCompiledSource(children.value, sourceFile, seen));
    }
    catch {
        return true;
    }
    finally {
        seen.delete(node);
    }
};
const cacheReferencesCompiledSource = (cache, sourceFile) => {
    if (componentRevision(cache.type)?.sourceFile === sourceFile ||
        treeReferencesCompiledSource(cache.result, sourceFile))
        return true;
    const children = Object.getOwnPropertyDescriptor(cache.props, "children");
    return !!children && (!("value" in children) ||
        treeReferencesCompiledSource(children.value, sourceFile));
};
const cacheCodeCurrent = (caches) => {
    for (const cache of caches)
        if (!componentCodeCurrent(cache.type))
            return false;
    return true;
};
const cacheCodeCurrentPrivate = (caches) => {
    for (const cache of caches)
        if (!componentCodeCurrentPrivate(cache.type))
            return false;
    return true;
};
const capturedScalarCurrent = (source, value) => {
    const current = canonicalScalarSourceValue(source);
    return current !== null && Object.is(current, value);
};
const prepareAdmittedBindings = (items, resolve) => {
    const captured = [];
    for (const item of items) {
        const canonical = [];
        for (const site of item.sites) {
            const source = resolve(item.owner, site);
            if (!source)
                return null;
            canonical.push(source);
        }
        if (!canRebindCapturedBindingSources(item.binding, canonical))
            return null;
        captured.push(canonical);
    }
    return captured;
};
const applyAdmittedBindings = (items, captured) => {
    if (captured.length !== items.length)
        throw new Error("Binding admission changed");
    for (let index = 0; index < items.length; index++) {
        if (!rebindCapturedBindingSources(items[index].binding, captured[index])) {
            throw new Error("Binding admission changed");
        }
    }
};
const canonicalWorldIsAlive = OwnerStateWorld.prototype.isAlive;
const canonicalWorldOwnerLineage = OwnerStateWorld.prototype.ownerLineage;
const canonicalWorldClearCellChangesThrough = OwnerStateWorld.prototype.clearCellChangesThrough;
const canonicalWorldIsWithin = OwnerStateWorld.prototype.isWithin;
const canonicalWorldFindOwner = OwnerStateWorld.prototype.findOwner;
const canonicalWorldScalarSource = OwnerStateWorld.prototype.scalarSource;
const canonicalWorldScalarSourceForCell = OwnerStateWorld.prototype.scalarSourceForCell;
const canonicalWorldVersion = OwnerStateWorld.prototype.version;
const canonicalWorldVersionForCell = OwnerStateWorld.prototype.versionForCell;
const canonicalResourceCutCurrent = (reads) => {
    const status = reads.preparedCanonicalStatus();
    if (status === "unsupported")
        throw new UnsupportedGroupOpaqueFreshnessError("resource");
    return status === "current";
};
const canonicalCollectionCutCurrent = (collection, version) => {
    const current = canonicalCollectionVersion(collection);
    if (current === null || version === null) {
        throw new UnsupportedGroupOpaqueFreshnessError("collection");
    }
    return current === version;
};
const canonicalResourceVersionCurrent = (resource, version) => {
    const current = canonicalResourceVersion(resource);
    if (current === null || version === null) {
        throw new UnsupportedGroupOpaqueFreshnessError("resource");
    }
    return current === version;
};
const captureCodeRevisions = (caches) => {
    const revisions = [];
    try {
        for (const cache of caches) {
            const revision = componentRevision(cache.type);
            if (revision)
                revisions.push(revision);
        }
    }
    catch (error) {
        return { error };
    }
    return { revisions };
};
const codeRevisionsCurrent = (captured) => {
    if ("error" in captured)
        throw captured.error;
    return captured.revisions.every(isCompiledSemanticRevisionCurrent);
};
const compiledStateLayoutFor = (component) => typeof component === "function"
    ? definedComponents.get(component)?.metadata?.stateLayout
    : undefined;
const numericOwnerPropsAdmitted = (component, props, owned) => {
    const metadata = typeof component === "function"
        ? definedComponents.get(component)?.metadata : undefined;
    const names = metadata?.numericPrimitiveProps;
    const retainedNames = metadata?.numericRetainedProps;
    if (!names?.length && !retainedNames?.length)
        return true;
    if (!owned || !Object.isFrozen(props))
        return false;
    for (const name of names ?? []) {
        const descriptor = Object.getOwnPropertyDescriptor(props, name);
        if (!descriptor || !("value" in descriptor) ||
            (descriptor.value !== null && descriptor.value !== undefined &&
                typeof descriptor.value !== "string" &&
                typeof descriptor.value !== "number" &&
                typeof descriptor.value !== "boolean"))
            return false;
    }
    for (const name of retainedNames ?? []) {
        const descriptor = Object.getOwnPropertyDescriptor(props, name);
        if (!descriptor || !("value" in descriptor) ||
            !isRuntimeOwnedElement(descriptor.value) ||
            !Object.isFrozen(descriptor.value))
            return false;
    }
    return true;
};
const ownNumericOwnerProps = (component, source, props) => {
    const metadata = typeof component === "function"
        ? definedComponents.get(component)?.metadata : undefined;
    if ((metadata?.numericPrimitiveProps?.length ||
        metadata?.numericRetainedProps?.length) && isRuntimeOwnedElement(source) &&
        Object.isFrozen(source.props))
        Object.freeze(props);
    return props;
};
const closedCollectionSitesFor = (component) => typeof component === "function"
    ? definedComponents.get(component)?.metadata?.closedCollectionSites
    : undefined;
const closedCollectionRowProgramFor = (owner, siteId, rowSiteId) => {
    if (typeof owner !== "function")
        return undefined;
    const program = definedComponents.get(owner)?.metadata?.closedCollectionRowPrograms
        ?.find((candidate) => candidate.collectionSiteId === siteId);
    const ownerSite = definedComponents.get(owner)?.siteId;
    const rowSite = program && definedComponents.get(program.rowComponent)?.siteId;
    if (!program || !componentCodeCurrent(owner) ||
        !componentCodeCurrent(program.rowComponent) ||
        ownerSite !== program.componentProgramId ||
        rowSite !== program.rowComponentProgramId ||
        (rowSiteId !== undefined && rowSiteId !== program.rowComponentProgramId)) {
        return undefined;
    }
    const ownerRevision = componentRevision(owner);
    const rowRevision = componentRevision(program.rowComponent);
    if (!ownerRevision || !rowRevision ||
        ownerRevision.sourceFile !== rowRevision.sourceFile ||
        ownerRevision.moduleRevision !== program.moduleRevision ||
        rowRevision.moduleRevision !== program.moduleRevision)
        return undefined;
    return program;
};
const ownCollectionOwnerProps = (component, source, props) => {
    if (!closedCollectionSitesFor(component)?.length ||
        !isRuntimeOwnedElement(source) || !Object.isFrozen(source.props))
        return false;
    Object.freeze(props);
    return true;
};
const collectionOwnerInputsAdmitted = (active, siteId, collection) => {
    if (active.collectionSites === undefined)
        return true;
    if (!active.collectionPropsOwned ||
        !active.collectionSites?.includes(siteId) ||
        canonicalCollectionVersion(collection) === null ||
        !canonicalCollectionApiIntact(collection))
        return false;
    const props = active.collectionProps;
    if (!props || !Object.isFrozen(props))
        return false;
    for (const key of Reflect.ownKeys(props)) {
        const descriptor = Object.getOwnPropertyDescriptor(props, key);
        if (!descriptor)
            return false;
        if (!("value" in descriptor))
            return false;
        const value = descriptor.value;
        if (value === collection || value === null || value === undefined ||
            typeof value === "string" || typeof value === "number" ||
            typeof value === "boolean")
            continue;
        return false;
    }
    return true;
};
const collectionOwnerApiAdmitted = (region, cache) => closedCollectionSitesFor(cache.type) === undefined ||
    canonicalCollectionApiIntact(region.collection);
const collectionOwnerNeedsGenericRows = (cache, batches) => closedCollectionSitesFor(cache.type) !== undefined &&
    batches.some((batch) => batch.operations.some((operation) => operation.type === "insert" || operation.type === "replace"));
const numericOwnerCacheAdmitted = (cache) => cache.numericPropsAdmitted === true && cache.numericStateAdmitted === true;
const closedResourceHostProgramFor = (component) => typeof component === "function" && componentCodeCurrent(component)
    ? definedComponents.get(component)?.metadata?.closedResourceHostProgram
    : undefined;
const closedStoreHostProgramFor = (component) => typeof component === "function" && componentCodeCurrent(component)
    ? definedComponents.get(component)?.metadata?.closedStoreHostProgram
    : undefined;
const closedComponentForwardProgramFor = (component) => typeof component === "function" && componentCodeCurrent(component)
    ? definedComponents.get(component)?.metadata?.closedComponentForwardProgram
    : undefined;
const validateNumericBindingProgram = (descriptor, sites) => {
    if (descriptor === undefined)
        return undefined;
    if (!descriptor || typeof descriptor !== "object" ||
        (descriptor.schemaVersion !== 1 && descriptor.schemaVersion !== 2) ||
        typeof descriptor.sinkId !== "string" || descriptor.sinkId.length === 0 ||
        !Array.isArray(descriptor.sourceSites) ||
        descriptor.sourceSites.length !== sites.length) {
        throw new TypeError("Invalid numeric binding program descriptor");
    }
    if (descriptor.schemaVersion === 2 &&
        (typeof descriptor.ownerProgramId !== "string" ||
            descriptor.ownerProgramId.length === 0 ||
            descriptor.sourceSites.some((site) => typeof site !== "string" || site.length === 0) ||
            new Set(descriptor.sourceSites).size !== descriptor.sourceSites.length)) {
        throw new TypeError("Invalid owner-scoped numeric binding descriptor");
    }
    for (let index = 0; index < sites.length; index++) {
        if (typeof descriptor.sourceSites[index] !== "string" ||
            descriptor.sourceSites[index] !== sites[index]) {
            throw new TypeError("Numeric binding program source sites must exactly match the binding");
        }
    }
    // Freeze descriptor identity and source shape at activation; cached VDOM eligibility
    // must not change if callers later mutate the descriptor.
    const closedExpression = descriptor.closedExpression === undefined
        ? null
        : normalizeClosedNumericExpression(descriptor.closedExpression, sites.length);
    Object.freeze(descriptor.sourceSites);
    Object.freeze(descriptor);
    return Object.freeze({
        ...descriptor,
        closedExpression: closedExpression ?? undefined,
    });
};
/** Build immutable owner metadata only when the v2 program names this exact layout. */
const numericOwnerBindingFor = (active, descriptor, siteIds) => {
    if (descriptor?.schemaVersion !== 2 || !active.stateLayout ||
        active.stateLayout.programId !== descriptor.ownerProgramId)
        return undefined;
    const sourceSlots = [];
    for (const siteId of siteIds) {
        const slot = compiledStateLayoutSlot(active.stateLayout, siteId);
        if (slot === undefined)
            return undefined;
        sourceSlots.push(slot);
    }
    return Object.freeze({
        owner: active.owner,
        programId: descriptor.ownerProgramId,
        layout: active.stateLayout,
        sourceSlots: Object.freeze(sourceSlots),
    });
};
export function bindStatePropsAt(siteIds, derive, numericProgram) {
    const active = activeOwners[activeOwners.length - 1];
    if (!active) {
        throw new Error("bindStatePropsAt must run while an owner-aware component is rendering");
    }
    if (siteIds.length === 0 || typeof derive !== "function") {
        throw new Error("A state prop binding needs sites and a derive function");
    }
    const validatedProgram = validateNumericBindingProgram(numericProgram, siteIds);
    const numericOwner = numericOwnerBindingFor(active, validatedProgram, siteIds);
    const sources = [];
    let missingNumericSite;
    for (const siteId of siteIds) {
        const source = active.world.scalarSource(active.owner, siteId);
        if (!source) {
            missingNumericSite ??= siteId;
            continue;
        }
        active.propBoundSites.add(siteId);
        sources.push(source);
    }
    if (missingNumericSite !== undefined) {
        if (!numericOwner || validatedProgram?.schemaVersion !== 2) {
            throw new Error(`State site ${missingNumericSite} is not a numeric state cell`);
        }
        // Promotion removes numeric sources but leaves the authored owner slots.
        // Read their actual values and call the same projector with no coercion.
        const values = siteIds.map((siteId) => active.world.useState(active.owner, siteId, undefined, active.stateLayout)[0]);
        return derive(values);
    }
    const binding = bindSources(sources, derive, validatedProgram);
    const ownedBinding = numericOwner ? Object.assign(binding, { numericOwner }) : binding;
    active.captureBinding?.(ownedBinding, sources, active.owner, siteIds);
    return ownedBinding;
}
/** Build a live numeric binding from one state cell owned by the active component. */
export const bindStatePropAt = (siteId, project, numericProgram) => {
    const active = activeOwners[activeOwners.length - 1];
    if (!active) {
        throw new Error("bindStatePropAt must run while an owner-aware component is rendering");
    }
    if (typeof siteId !== "string" || siteId.length === 0 ||
        typeof project !== "function") {
        throw new Error("A state prop binding needs a site and project function");
    }
    const validatedProgram = validateNumericBindingProgram(numericProgram, [
        siteId,
    ]);
    const numericOwner = numericOwnerBindingFor(active, validatedProgram, [siteId]);
    const source = active.world.scalarSource(active.owner, siteId);
    if (!source) {
        if ((validatedProgram?.schemaVersion === 1 &&
            active.stateLayout?.slots.some((slot) => slot.siteId === siteId)) ||
            numericOwner !== undefined) {
            // Promotion reuses the already-initialized cell and evaluates the authored expression
            // without retaining a numeric subscription.
            const [value] = active.world.useState(active.owner, siteId, undefined, active.stateLayout);
            return project(value);
        }
        throw new Error(`State site ${siteId} is not a numeric state cell`);
    }
    active.propBoundSites.add(siteId);
    const sources = [source];
    const sites = [siteId];
    // Keep the conservative writer behavior for projections that return a stable
    // mutable object. The scalar source still drives the normal binding protocol.
    const binding = validatedProgram?.closedExpression
        ? bindSources(sources, ([value]) => project(value), validatedProgram)
        : bindStateSource(source, project, validatedProgram);
    if (numericOwner)
        Object.assign(binding, { numericOwner });
    active.captureBinding?.(binding, sources, active.owner, sites);
    return binding;
};
/** Explicit-site hook primitive; the compiler can lower familiar useState calls to this form. */
export const useStateAt = (siteId, initial) => {
    const active = activeOwners[activeOwners.length - 1];
    if (!active) {
        throw new Error("useStateAt must run while an owner-aware component is rendering");
    }
    const result = active.stateLayout
        ? active.world.useState(active.owner, siteId, initial, active.stateLayout)
        : active.world.useState(active.owner, siteId, initial);
    const value = result[0];
    if (value !== null && value !== undefined &&
        typeof value !== "string" && typeof value !== "number" &&
        typeof value !== "boolean")
        active.numericStateReadsPrimitive = false;
    return result;
};
/** Register an effect by compiler site ID; setup runs after commit, cleanup on deactivation or owner removal. */
export const useEffectAt = (siteId, setup) => {
    const active = activeOwners[activeOwners.length - 1];
    if (!active) {
        throw new Error("useEffectAt must run while an owner-aware component is rendering");
    }
    active.registerEffect(siteId, setup);
};
/** Read a shared store or selector at a stable compiler-owned component site. */
export const useStoreAt = (siteId, source) => {
    const active = activeOwners[activeOwners.length - 1];
    if (!active) {
        throw new Error("useStoreAt must run while an owner-aware component is rendering");
    }
    if (!siteId || !source || typeof source.read !== "function") {
        throw new Error("useStoreAt requires a site ID and store source");
    }
    return active.readStore(siteId, source);
};
/** Generic authored read: stores keep their value semantics; resources unwrap and suspend. */
export const useAt = (siteId, source) => {
    if (source instanceof AsyncResource) {
        const active = activeOwners[activeOwners.length - 1];
        if (!active?.readResource) {
            throw new Error("useAt resource reads require an owner-aware render");
        }
        return active.readResource(source);
    }
    if (source && (typeof source === "object" || typeof source === "function") &&
        typeof source.read === "function") {
        return useStoreAt(siteId, source);
    }
    if (source && (typeof source === "object" || typeof source === "function")) {
        const active = activeOwners[activeOwners.length - 1];
        if (!active?.readResource) {
            throw new Error("useAt resource reads require an owner-aware render");
        }
        return active.readResource(source);
    }
    throw new TypeError("useAt requires a store source, resource, or thenable");
};
/**
 * Compiler lowering for `items.map(row => <Row key={row.id} ... />)` when the
 * input is a proven keyed collection. Initial/full renders take a snapshot;
 * committed roots consume later collection batches through a sparse region.
 */
export const renderCollectionAt = (siteId, collection, renderRow, options = {}) => {
    if (activeOwners.length === 0) {
        throw new Error("renderCollectionAt must run while an owner is rendering");
    }
    if (!siteId || !collection || typeof collection.snapshot !== "function" ||
        typeof collection.createReader !== "function" ||
        typeof renderRow !== "function") {
        throw new Error("renderCollectionAt requires a site, collection, and row renderer");
    }
    const ownerInputsAdmitted = collectionOwnerInputsAdmitted(activeOwners[activeOwners.length - 1], siteId, collection);
    const snapshotVersion = collection.version;
    const rows = new Map();
    let componentSiteId;
    const snapshot = collection.snapshot();
    const entries = canonicalCollectionApiIntact(collection)
        ? snapshot.map(({ key }) => canonicalCollectionEntry(collection, key))
        : undefined;
    const children = snapshot.map(({ key, value }, index) => {
        const entry = entries?.[index] ?? canonicalCollectionEntry(collection, key);
        const rendered = renderRow(value);
        if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" ||
            !(typeof rendered.type === "function" ||
                typeof rendered.type === "string")) {
            throw new Error("Keyed collection rows must render one element");
        }
        const rowSiteId = typeof rendered.type === "function"
            ? getComponentSiteId(rendered.type)
            : undefined;
        if (rowSiteId && componentSiteId && componentSiteId !== rowSiteId) {
            throw new Error("A collection region must map one component site");
        }
        if (rowSiteId)
            componentSiteId = rowSiteId;
        const authoredKey = rendered.props.key;
        if (authoredKey != null && String(authoredKey) !== key) {
            throw new Error(`Collection key ${key} does not match rendered row key ${String(authoredKey)}`);
        }
        const props = { ...rendered.props, key };
        const owned = isRuntimeOwnedElement(rendered);
        const node = owned
            ? copyRuntimeElement(rendered.type, props)
            : { ...rendered, props };
        rows.set(key, { node: null, entry });
        return node;
    });
    const version = createKeyedOwnerVersion();
    const marked = keyedOwnerChildren(siteId, children, version);
    collectionRegionDescriptors.set(version, {
        siteId,
        componentSiteId,
        collection,
        renderRow,
        rows,
        snapshotVersion,
        requiresOwnerRender: options.requiresOwnerRender === true,
        ownerInputsAdmitted,
    });
    return marked;
};
const getComponentSiteId = (type) => {
    if (typeof type !== "function") {
        throw new Error("Expected a function component");
    }
    const siteId = (definedComponents.get(type) ??
        type[componentRegistration])?.siteId;
    if (!siteId) {
        throw new Error("Owner-aware components must be registered with defineComponent(siteId, render)");
    }
    return siteId;
};
const keyedIdentity = (element, siteId, ordinal) => {
    const key = element.props.key;
    return key == null ? `@slot:${siteId}:${ordinal}` : String(key);
};
const collectionOwnerSite = (collectionSiteId, componentSiteId) => `${componentSiteId}\u0000collection:${collectionSiteId}`;
const carryHostKeys = (node, componentKey, path = "0", onVisit, scopeExplicitHostKeys = false, owner) => {
    onVisit?.();
    if (node == null || node === false)
        return node;
    if (typeof node === "string" || typeof node === "number") {
        return owner === undefined ? node : stampComponentOutput(node, owner, `${String(componentKey)}:${path}`);
    }
    if (Array.isArray(node)) {
        return copyKeyedOwnerMetadata(node, node.map((child, index) => carryHostKeys(child, componentKey, `${path}.${index}`, onVisit, scopeExplicitHostKeys, owner)));
    }
    if (node.type === Fragment) {
        return copyRuntimeElement(node.type, {
            ...node.props,
            children: carryHostKeys(node.props.children, componentKey, path, onVisit, scopeExplicitHostKeys, owner),
        });
    }
    const existingKey = node.props.key;
    const key = existingKey == null
        ? `${String(componentKey)}:${path}`
        : scopeExplicitHostKeys
            ? `${String(componentKey)}\u0000${String(existingKey)}`
            : String(existingKey);
    const type = node.type;
    return copyRuntimeElement(type, { ...node.props, key }, typeof type === "string" ? owner : undefined);
};
const singleHostRootKey = (node, onVisit) => {
    const roots = [];
    const flatten = (value) => {
        onVisit?.();
        if (value == null || value === false)
            return true;
        if (Array.isArray(value))
            return value.every(flatten);
        if (typeof value === "string" || typeof value === "number")
            return false;
        if (value.type === Fragment)
            return flatten(value.props.children);
        if (typeof value.type !== "string")
            return false;
        roots.push(value);
        return true;
    };
    if (!flatten(node) || roots.length !== 1 || roots[0].props.key == null) {
        return null;
    }
    return String(roots[0].props.key);
};
const hasNestedComponent = (node, onVisit) => {
    onVisit?.();
    if (node == null || node === false || typeof node === "string" ||
        typeof node === "number")
        return false;
    if (Array.isArray(node)) {
        return node.some((child) => hasNestedComponent(child, onVisit));
    }
    if (typeof node.type === "function")
        return true;
    return hasNestedComponent(node.props.children, onVisit);
};
/**
 * Component execution bridge between owner/site state and retained VDOM.
 * The native module compiler supplies stable component, hook, and collection
 * site IDs; explicit helpers remain available to host adapters and extensions.
 */
export class ComponentStateRoot {
    #hostPublicationDomain;
    #hostAvailabilityWait = null;
    #activeRootClaim = null;
    #renderPreparation;
    world;
    #rootOwner;
    #rootId;
    #vdom;
    #tree = null;
    #pendingDirectIntent = null;
    #liveOwners = new Set();
    #liveEffects = new Map();
    #liveEffectKeysByOwner = new Map();
    #componentCache = new Map();
    // Metadata lists compiler-approved sinks; the committed cache records sinks bound
    // in this render, so render identity invalidates conditional-output changes.
    #compiledPropSitesByCache = new WeakMap();
    #liveCollectionRegions = new Map();
    #pendingCollectionRegionKeys = new Set();
    #collectionSnapshotFallbackKeys = new Set();
    #preparedRenders = new Map();
    #disposed = false;
    #disposing = false;
    #disposeRequested = false;
    #hostApplicationDepth = 0;
    #directPublicationPending = false;
    #publicationVersion = 0;
    #preparedCandidates = new Map();
    #candidateHostCommit = false;
    #publicationBarrier = null;
    #deferredFlush = false;
    #disposeListeners = new Set();
    #retireListeners = new Set();
    #candidateStoreHolds = new Map();
    #storeDependencyLeases = new Map();
    #terminalHostFailure;
    #terminalHostFailed = false;
    #terminalFailureKind = "host";
    #scheduled = false;
    #pendingChanges = new PendingStateChanges();
    #lastSourceValues = new Map();
    #numericProgramSources = [];
    #numericProgramCurrentValues = [];
    #numericProgramPreviousValues = [];
    #numericProgramUsedCount = 0;
    #nativeCellHandles = [];
    #nativeCellVersions = [];
    #nativeLaneTokens = [];
    #nativeLanePrograms = new WeakMap();
    #nativeRowPrograms = new WeakMap();
    #nativeRowEpoch = 0;
    #nativeRowTokens = [];
    #nativeRowViews = [];
    #nativeChangedRows = new Uint32Array(0);
    #nativeChangedSlots = new Uint32Array(0);
    #nativeRowUsedCount = 0;
    #nativeCellCutActive = false;
    #liveStoreSubscriptions = new Map();
    #liveStoreReaders = new Map();
    #resourceTable;
    #liveResourceSubscriptions = new Map();
    // Resource reads are transaction-scoped; until owner footprints are cached, a
    // store-driven candidate rebuilds the tree after any resource read.
    #everReadResource = false;
    // This sticky bit avoids scanning every cache to decide whether a store
    // candidate may safely skip native-boundary expansion.
    #everHadNativeBoundary = false;
    #pendingResourceRetry = false;
    #pendingBoundaryRetries = new Set();
    #publicationIntents = new Map();
    #scopedFlushActive = false;
    #boundaryPrimaries = new Map();
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
    [rootHostPublicationDomain]() {
        return this.#hostPublicationDomain;
    }
    constructor(host, container, options = {}) {
        this.#hostPublicationDomain = hostPublicationDomain(host);
        if (options.renderPreparation !== undefined &&
            options.renderPreparation !== "repeatable") {
            throw new TypeError("Unknown render preparation capability");
        }
        this.#renderPreparation = options.renderPreparation;
        this.world = options.world ?? new OwnerStateWorld();
        let resourceTable = worldResourceTables.get(this.world);
        if (!resourceTable) {
            resourceTable = new AsyncResourceTable();
            worldResourceTables.set(this.world, resourceTable);
        }
        this.#resourceTable = resourceTable;
        this.#profile = options.profile;
        this.#profileCounter = options.profileCounter;
        this.#keyedOwnerReuse = options.keyedOwnerReuse ??
            options.keyedOwnerReuseMode !== undefined;
        this.#keyedOwnerReuseMode = options.keyedOwnerReuseMode ?? "checked";
        this.#vdom = new VDOMSnapshotRoot(host, container, options.profile, options.profileCounter
            ? (counters) => {
                for (const [name, count] of Object.entries(counters)) {
                    this.#count(name, count);
                }
            }
            : undefined, options.keyIndexMaintenance);
        const rootId = options.rootId ?? `root-${ComponentStateRoot.#nextRootId++}`;
        if (!rootId)
            throw new Error("Component root ID must not be empty");
        this.#rootId = rootId;
        this.#scheduleCommit = options.scheduleCommit ??
            ((commit) => queueMicrotask(commit));
        if (options.invalidationPlan) {
            const plan = options.invalidationPlan;
            if (plan.region_component_site_ids.some((siteId) => typeof siteId !== "string" || siteId.length === 0)) {
                throw new Error("Component invalidation plan has an invalid component site ID");
            }
            for (const region of plan.region_ids) {
                if (region >= plan.region_component_site_ids.length) {
                    throw new Error("Component invalidation region has no component site ID");
                }
            }
            this.#invalidation = {
                dispatcher: new DerivedRegionDispatcher(plan),
                sourceSlots: new Map(plan.source_paths.map((siteId, index) => [siteId, index])),
                componentSites: plan.region_component_site_ids,
            };
        }
        this.#unsubscribeRevision = subscribeCompiledSemanticRevision((change) => {
            if (this.#disposed || this.#codeInvalidated)
                return;
            let affected = treeReferencesCompiledSource(this.#tree, change.sourceFile) ||
                treeReferencesCompiledSource(this.#pendingDirectIntent?.tree ?? null, change.sourceFile);
            for (const cache of this.#componentCache.values()) {
                if (cacheReferencesCompiledSource(cache, change.sourceFile)) {
                    affected = true;
                    break;
                }
            }
            if (!affected) {
                for (const referencesSource of this.#preparedCandidates.values()) {
                    if (referencesSource(change.sourceFile)) {
                        affected = true;
                        break;
                    }
                }
            }
            if (!affected)
                return;
            this.#codeInvalidated = true;
            this.#revisionRetirementPending = true;
            this.#retireCompiledInterests();
        });
        this.#rootOwner = this.world.claimRootId(rootId);
        this.#unsubscribe = this.world.subscribeDirtyCells((handle, version) => {
            if (!this.world.isWithin(handle.owner, this.#rootOwner))
                return;
            this.#pendingChanges.setCell(handle, version);
            if (this.#pendingDirectIntent)
                this.#pendingResourceRetry = true;
            this.#schedule();
        });
    }
    #waitForHostAvailability(flushRequested = false) {
        if (this.#hostAvailabilityWait) {
            this.#hostAvailabilityWait.flushRequested ||= flushRequested;
            return;
        }
        if (this.#disposed)
            return;
        const wait = { unsubscribe: () => { }, flushRequested };
        this.#hostAvailabilityWait = wait;
        wait.unsubscribe = subscribeHostPublicationAvailability([this.#hostPublicationDomain], () => {
            if (this.#hostAvailabilityWait !== wait)
                return;
            this.#hostAvailabilityWait = null;
            wait.unsubscribe();
            if (this.#disposed)
                return;
            if (this.#disposeRequested)
                this.dispose();
            else if (this.#hostPublicationDomain.failed)
                return;
            else if (this.#pendingDirectIntent || wait.flushRequested)
                this.flush();
            else if (this.#hasPendingWork())
                this.#schedule();
        });
    }
    #enterDirectHostDomain(flushRequested = false) {
        const claim = createHostPublicationClaim();
        if (tryClaimHostPublicationDomains([this.#hostPublicationDomain], claim) === "busy") {
            this.#waitForHostAvailability(flushRequested);
            return false;
        }
        this.#activeRootClaim = claim;
        return true;
    }
    #assertPreparationHostAvailable() {
        if (isHostPublicationDomainBusy(this.#hostPublicationDomain, this.#activeRootClaim ?? undefined))
            throw new HostPublicationBusyError();
    }
    #leaveDirectHostDomain() {
        const claim = this.#activeRootClaim;
        if (!claim)
            return;
        this.#activeRootClaim = null;
        if (this.#disposeRequested)
            this.#waitForHostAvailability();
        releaseHostPublicationDomains([this.#hostPublicationDomain], claim);
        if (!this.#disposeRequested && !this.#disposed &&
            !this.#hostPublicationDomain.failed && this.#deferredFlush &&
            this.#pendingDirectIntent) {
            queueMicrotask(() => {
                if (!this.#disposed && !this.#disposeRequested &&
                    !this.#hostPublicationDomain.failed && this.#deferredFlush &&
                    this.#pendingDirectIntent)
                    this.flush();
            });
        }
    }
    #retireCompiledInterests() {
        if (!this.#revisionRetirementPending || this.#disposed ||
            this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
            this.#nativeCellCutActive || this.#directPublicationPending)
            return;
        this.#revisionRetirementPending = false;
        const listeners = [...this.#retireListeners];
        this.#retireListeners.clear();
        const errors = collectCleanupErrors([
            ...listeners,
            () => {
                const cleanup = collectCleanupErrors([...this.#preparedCandidates.keys()].map((candidate) => () => candidate.discard()));
                if (cleanup.length)
                    throw new AggregateError(cleanup, "Revision candidate cleanup failed");
            },
            () => this.#dropPendingDirectIntent(),
            () => this.#cancelTerminalResourceWaits(),
            () => {
                const subscriptions = [...this.#liveStoreSubscriptions];
                const readers = [...this.#liveStoreReaders];
                for (const stores of this.#storeDependencyLeases.values())
                    stores.clear();
                this.#storeDependencyLeases.clear();
                this.#liveStoreSubscriptions.clear();
                this.#liveStoreReaders.clear();
                const cleanup = collectCleanupErrors([
                    ...subscriptions.map(([, unsubscribe]) => unsubscribe),
                    ...readers.flatMap(([readerId, stores]) => [...stores].map((store) => () => store.forgetReader(this.#rootId, readerId))),
                    ...subscriptions.filter(([store]) => (this.#candidateStoreHolds.get(store) ?? 0) === 0).map(([store]) => () => store.detachRoot(this.#rootId)),
                ]);
                if (cleanup.length)
                    throw new AggregateError(cleanup, "Revision Store cleanup failed");
            },
            () => {
                const regions = [...this.#liveCollectionRegions.values()];
                this.#liveCollectionRegions.clear();
                const cleanup = collectCleanupErrors(regions.flatMap((region) => [
                    ...(region.unsubscribe ? [region.unsubscribe] : []),
                    ...(region.reader ? [() => region.reader.detach()] : []),
                ]));
                if (cleanup.length)
                    throw new AggregateError(cleanup, "Revision collection cleanup failed");
            },
            () => this.#unsubscribe(),
            () => {
                const cleanup = this.#cleanupEffects(this.#liveEffects.values());
                this.#liveEffects.clear();
                this.#liveEffectKeysByOwner.clear();
                if (cleanup.length)
                    throw new AggregateError(cleanup, "Revision effect cleanup failed");
            },
        ]);
        if (errors.length === 1)
            throw errors[0];
        if (errors.length)
            throw new AggregateError(errors, "Revision cleanup failed");
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
        if ([...leasedStores].some((store) => !(store instanceof AsyncStore))) {
            throw new TypeError("Store dependency holds require native stores");
        }
        const leaseId = Symbol("root-store-dependencies");
        this.#storeDependencyLeases.set(leaseId, leasedStores);
        try {
            this.#reconcileStoreSubscriptions();
        }
        catch (error) {
            leasedStores.clear();
            this.#storeDependencyLeases.delete(leaseId);
            return throwWithCleanup(error, collectCleanupErrors([
                () => this.#reconcileStoreSubscriptions(),
            ]));
        }
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            leasedStores.clear();
            this.#storeDependencyLeases.delete(leaseId);
            this.#reconcileStoreSubscriptions();
        };
    }
    /** Prepare an isolated full-tree candidate without touching host or live caches. */
    prepare(tree, options = {}) {
        this.#requireRepeatableRender(options.renderPreparation);
        this.#assertActive();
        this.#assertPreparationHostAvailable();
        const held = this.#publicationIntents.values().next().value;
        if (held)
            return this.#prepareBlockedPublication([held.wait]);
        return this.#prepareCandidate(tree, options, true, new Set(), new Set());
    }
    /** Prepare tracked root work without requiring callers to provide a full tree. */
    preparePending(options = {}) {
        this.#validateRenderPreparation(options.renderPreparation);
        this.#assertActive();
        this.#assertNoPublicationBarrier("prepare");
        this.#assertPreparationHostAvailable();
        if (this.#terminalHostFailed) {
            throw new Error("Component root is terminal after a host commit failure");
        }
        const held = this.#publicationIntents.values().next().value;
        if (held)
            return this.#prepareBlockedPublication([held.wait]);
        if (this.#pendingDirectIntent) {
            this.#requireRepeatableRender(options.renderPreparation);
            return this.#prepareCandidate(this.#pendingDirectIntent.tree, { transitions: options.transitions ?? [] }, true, new Set(), new Set());
        }
        const changes = this.#pendingChanges.capture();
        if (changes.length === 0 && this.#pendingCollectionRegionKeys.size === 0 &&
            this.#storeNotificationGeneration ===
                this.#committedStoreNotificationGeneration &&
            (options.transitions?.length ?? 0) === 0)
            return null;
        const mixed = this.#prepareMixedCollectionCandidate(changes, {
            storeGeneration: this.#storeNotificationGeneration,
            transitions: options.transitions ?? [],
            renderPreparation: options.renderPreparation,
        });
        if (!mixed)
            this.#requireRepeatableRender(options.renderPreparation);
        return mixed ?? this.#prepareCandidate(this.#tree, { transitions: options.transitions ?? [] }, true, new Set(), new Set());
    }
    /** Prepare explicit move/remove collection work without broadening its tree cut. */
    prepareCollections(collections, publicationLease) {
        return this.prepareTransaction({ cells: [], collections }, publicationLease);
    }
    /** Prepare one declared closed local, Store and keyed collection cut. */
    prepareTransaction(work, resourceLease) {
        const { cells, collections } = work;
        const selectedStores = work.stores ?? [];
        if (!this.#leaseCoversSelection(resourceLease, new Set(work.resources ?? []), { cells, stores: selectedStores, collections })) {
            return null;
        }
        if (work.resources?.length) {
            return this.prepareResources(work.resources, resourceLease, { cells, stores: selectedStores, collections });
        }
        const holdWait = this.#resourceHoldWait(new Set(), resourceLease, { cells, stores: selectedStores, collections });
        if (holdWait)
            return this.#prepareBlockedPublication([holdWait]);
        if (collections.length === 0)
            return this.#prepareClosedInputCandidate(cells, selectedStores, false, () => true, resourceLease);
        this.#assertActive();
        this.#assertNoPublicationBarrier("prepare transaction");
        this.#assertPreparationHostAvailable();
        if ((this.#pendingDirectIntent && !(resourceLease &&
            this.#publicationIntents.has(resourceLease))) ||
            this.#terminalHostFailed || this.#codeInvalidated ||
            new Set(collections).size !== collections.length)
            return null;
        const selected = new Set();
        const acceptedCollections = [];
        for (const collection of collections) {
            let found = false;
            for (const [key, region] of this.#liveCollectionRegions) {
                if (region.collection !== collection)
                    continue;
                found = true;
                if (this.#pendingCollectionRegionKeys.has(key)) {
                    selected.add(key);
                }
                else {
                    const reader = region.reader;
                    const read = reader?.read();
                    if (!reader || read?.status !== "available" ||
                        read.batches.length !== 0 ||
                        collection.version !== read.toVersion)
                        return null;
                    acceptedCollections.push(() => {
                        if (this.#liveCollectionRegions.get(key) !== region ||
                            region.reader !== reader ||
                            this.#pendingCollectionRegionKeys.has(key) ||
                            collection.version !== read.toVersion)
                            return false;
                        const current = reader.read();
                        return current.status === "available" &&
                            current.batches.length === 0 &&
                            current.toVersion === read.toVersion;
                    });
                }
            }
            if (!found)
                return null;
        }
        if (!selected.size) {
            if (cells.length || selectedStores.length)
                return this.#prepareClosedInputCandidate(cells, selectedStores, false, () => true, resourceLease, acceptedCollections, new Set(), collections);
            return this.#prepareAcceptedResourceNoop(new Map(), resourceLease, acceptedCollections, new Set(), collections);
        }
        return this.#prepareMixedCollectionCandidate([], {
            storeGeneration: this.#storeNotificationGeneration,
            transitions: [],
            selectedRegionKeys: selected,
            scopedStructural: true,
            scopedCells: cells,
            scopedStores: selectedStores,
            resourceLease,
            acceptedCollections,
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
        this.#assertPreparationHostAvailable();
        if (!this.#leaseCoversSelection(resourceLease, new Set(resources), inputs)) {
            return null;
        }
        if (!resources.length || new Set(resources).size !== resources.length ||
            (this.#pendingDirectIntent &&
                !(resourceLease && this.#publicationIntents.has(resourceLease))) ||
            this.#terminalHostFailed || this.#codeInvalidated)
            return null;
        const selected = new Set(resources);
        if (resources.some((resource) => closedResourceStatus(resource) === null ||
            closedResourceStatus(resource)?.status === "rejected"))
            return null;
        const boundaries = [];
        const covered = new Set();
        const dependencies = new Set(selected);
        const jointStores = new Set();
        for (const [owner, cache] of this.#componentCache) {
            if (!cache.nativeBoundary || !cache.pendingResource)
                continue;
            const child = Object.getOwnPropertyDescriptor(cache.props, "children")?.value;
            const boundaryStores = new Set();
            const footprint = this.#boundaryResourceDependencies(child, boundaryStores);
            if (!footprint)
                continue;
            footprint.add(cache.pendingResource);
            if (![...selected].some((resource) => footprint.has(resource)))
                continue;
            boundaries.push(owner);
            for (const store of boundaryStores)
                jointStores.add(store);
            for (const resource of footprint) {
                dependencies.add(resource);
                if (selected.has(resource))
                    covered.add(resource);
            }
        }
        const accepted = new Map();
        for (const [key, primary] of this.#boundaryPrimaries) {
            const owner = Number(key);
            const footprint = this.#boundaryResourceDependencies(primary.tree);
            if (!footprint)
                continue;
            for (const resource of footprint) {
                if (selected.has(resource)) {
                    covered.add(resource);
                    accepted.set(owner, primary.tree);
                }
            }
        }
        if (covered.size !== selected.size)
            return null;
        const wait = this.#resourceHoldWait(dependencies, resourceLease, {
            ...inputs, stores: [...(inputs.stores ?? []), ...jointStores],
        });
        const pending = [...dependencies].filter((resource) => closedResourceStatus(resource)?.status === "pending");
        if ([...dependencies].some((resource) => closedResourceStatus(resource) === null ||
            closedResourceStatus(resource)?.status === "rejected"))
            return null;
        if (wait || pending.length) {
            return this.#prepareBlockedPublication([...pending, ...(wait ? [wait] : [])]);
        }
        const acceptedCurrent = () => [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
            this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner));
        if (inputs.collections?.length) {
            const selectedKeys = new Set();
            const acceptedCollections = [];
            if (new Set(inputs.collections).size !== inputs.collections.length)
                return null;
            for (const collection of inputs.collections) {
                let found = false;
                for (const [key, region] of this.#liveCollectionRegions) {
                    if (region.collection !== collection)
                        continue;
                    found = true;
                    if (this.#pendingCollectionRegionKeys.has(key)) {
                        selectedKeys.add(key);
                    }
                    else {
                        const reader = region.reader;
                        const read = reader?.read();
                        if (!reader || read?.status !== "available" ||
                            read.batches.length !== 0 ||
                            collection.version !== read.toVersion)
                            return null;
                        acceptedCollections.push(() => {
                            if (this.#liveCollectionRegions.get(key) !== region ||
                                region.reader !== reader ||
                                this.#pendingCollectionRegionKeys.has(key) ||
                                collection.version !== read.toVersion)
                                return false;
                            const current = reader.read();
                            return current.status === "available" &&
                                current.batches.length === 0 &&
                                current.toVersion === read.toVersion;
                        });
                    }
                }
                if (!found)
                    return null;
            }
            if (!selectedKeys.size) {
                if (!boundaries.length) {
                    if (!inputs.cells?.length && !inputs.stores?.length) {
                        return this.#prepareAcceptedResourceNoop(accepted, resourceLease, acceptedCollections, selected, inputs.collections);
                    }
                    return this.#prepareClosedInputCandidate(inputs.cells ?? [], inputs.stores ?? [], false, acceptedCurrent, resourceLease, acceptedCollections, selected, inputs.collections);
                }
                return this.#prepareResourceReveals(boundaries, resourceLease, inputs.cells ?? [], inputs.stores ?? [], [acceptedCurrent, ...acceptedCollections], selected, inputs.collections);
            }
            return this.#prepareMixedCollectionCandidate([], {
                storeGeneration: this.#storeNotificationGeneration,
                transitions: [], selectedRegionKeys: selectedKeys,
                scopedStructural: true,
                scopedCells: inputs.cells ?? [], scopedStores: inputs.stores ?? [],
                scopedResourceOwners: boundaries, resourceLease,
                acceptedCollections: [acceptedCurrent, ...acceptedCollections],
                acceptedResources: selected,
                acceptedCollectionFootprint: inputs.collections,
            });
        }
        if (!boundaries.length) {
            if (inputs.cells?.length || inputs.stores?.length) {
                return this.#prepareClosedInputCandidate(inputs.cells ?? [], inputs.stores ?? [], false, acceptedCurrent, resourceLease, [], selected);
            }
            return this.#prepareAcceptedResourceNoop(accepted, resourceLease, [], selected);
        }
        return this.#prepareResourceReveals(boundaries, resourceLease, inputs.cells ?? [], inputs.stores ?? [], [acceptedCurrent], selected);
    }
    #prepareBlockedPublication(pendingResources) {
        const stores = new StoreRenderTransaction(this.#rootId);
        return this.#createCandidateLifecycle({
            baseVersion: this.#publicationVersion,
            baseVDOMVersion: this.#vdom.version,
            scope: { kind: "retained" }, stores, transitions: [],
            pendingResources, blocked: true,
            codeCurrent: () => false,
            validatePrepared: () => false,
            validatePreparedPrivate: () => false,
            validatePostHost: () => false,
            finalGroupCurrent: () => false,
            commitHost: () => { throw new Error("Resource candidate is blocked"); },
            commitHostAdmitted: () => { throw new Error("Resource candidate is blocked"); },
            preparePublication: () => { }, publish: () => { },
            installSubscriptions: () => [], runEffects: () => [],
            discard: () => stores.discard(), releaseArtifacts: () => { },
            effectFailureMessage: "Blocked resource candidate callbacks failed",
        });
    }
    #prepareAcceptedResourceNoop(accepted, resourceLease, validators = [], resources = new Set(), collections = []) {
        if (!accepted.size && !validators.length)
            return null;
        const stores = new StoreRenderTransaction(this.#rootId);
        const collectionVersions = collections.map((collection) => [collection, canonicalCollectionVersion(collection)]);
        const resourceVersions = [...resources].map((resource) => [resource, canonicalResourceVersion(resource)]);
        const current = () => validators.every((validate) => validate()) &&
            [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
                this.#liveOwners.has(owner) && this.world.isAlive(owner));
        return this.#createCandidateLifecycle({
            baseVersion: this.#publicationVersion,
            baseVDOMVersion: this.#vdom.version,
            scope: { kind: "retained" }, stores, transitions: [],
            pendingResources: [], blocked: false,
            permitPendingDirectIntent: () => resourceLease !== undefined &&
                this.#publicationIntents.has(resourceLease),
            admissionCurrent: () => (!resourceLease ||
                this.#publicationIntents.has(resourceLease)) &&
                !this.#resourceHoldWait(resources, resourceLease, { collections }) &&
                (!resourceLease || this.#publicationIntents.has(resourceLease)),
            codeCurrent: current,
            validatePrepared: () => current() && stores.validate(),
            validatePreparedPrivate: () => (!resourceLease ||
                this.#publicationIntents.has(resourceLease)) &&
                !this.#resourceHoldWait(new Set(resourceVersions.map(([resource]) => resource)), resourceLease, { collections: collectionVersions.map(([collection]) => collection) }) && [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
                this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner)) && collectionVersions.every(([collection, version]) => canonicalCollectionCutCurrent(collection, version)) && resourceVersions.every(([resource, version]) => canonicalResourceVersionCurrent(resource, version)) && stores.validatePreparedCanonical(),
            validatePostHost: () => current() && stores.validatePublicationInputs(),
            finalGroupCurrent: () => [...accepted].every(([owner, tree]) => this.#boundaryPrimaries.get(String(owner))?.tree === tree &&
                this.#liveOwners.has(owner) && this.world.isAlive(owner)) && collectionVersions.every(([collection, version]) => {
                const current = canonicalCollectionVersion(collection);
                return version === null || current === null || current >= version;
            }) && resourceVersions.every(([resource, version]) => version === null || canonicalResourceVersion(resource) === version) && stores.validatePublicationInputsCanonical(),
            commitHost: () => { },
            commitHostAdmitted: () => { },
            preparePublication: () => stores.preparePublicationAfterHost(),
            publish: () => { stores.publishAccepted(); this.#publicationVersion++; },
            installSubscriptions: () => [], runEffects: () => {
                stores.notifyPublished();
                return [];
            },
            discard: () => stores.discard(), releaseArtifacts: () => { },
            effectFailureMessage: "Accepted resource candidate callbacks failed",
        });
    }
    /** Keep a declared pending cut out of automatic publication until released. */
    holdTransactionPublications(work) {
        this.#assertActive();
        const unique = new Set(work.resources);
        const cells = Object.freeze((work.cells ?? []).map((cell) => Object.freeze({
            owner: cell.owner, site: cell.site, cellIdentity: cell.cellIdentity,
        })));
        let wake;
        const wait = new AsyncResource(new Promise((resolve) => {
            wake = resolve;
        }));
        let released = false;
        const release = () => {
            if (released)
                return;
            released = true;
            this.#publicationIntents.delete(release);
            wake();
            this.#partialStoreAttemptGeneration = -1;
            if (this.#pendingDirectIntent && this.#publicationIntents.size === 0) {
                this.#pendingResourceRetry = true;
            }
            if (!this.#disposed && !this.#terminalHostFailed &&
                (this.#pendingDirectIntent || this.#hasPendingWork()))
                this.#schedule();
        };
        this.#publicationIntents.set(release, {
            resources: unique,
            cells,
            stores: new Set(work.stores ?? []),
            collections: new Set(work.collections ?? []),
            wait,
        });
        return release;
    }
    #heldCell(handle) {
        return [...this.#publicationIntents.values()].some(({ cells }) => cells.some((selected) => selected.owner === handle.owner &&
            selected.site === handle.site &&
            selected.cellIdentity === handle.cellIdentity));
    }
    #readerBelongsToOwner(readerId, owner) {
        return readerId.startsWith(`${owner}\u0000`) ||
            readerId.startsWith(`\u0000suspense-pending:${owner}:`) ||
            (readerId.startsWith("\u0000suspense-pending:") &&
                readerId.includes(`:${owner}\u0000`));
    }
    #heldStore(store) {
        return [...this.#publicationIntents.values()].some(({ stores }) => stores.has(store));
    }
    #heldCollection(collection) {
        return [...this.#publicationIntents.values()].some(({ collections }) => collections.has(collection));
    }
    #captureHeldGenericState() {
        if (this.#publicationIntents.size === 0 ||
            this.#pendingCollectionRegionKeys.size > 0)
            return null;
        const pendingChanges = this.#pendingChanges.capture();
        if (pendingChanges.some((change) => !change.cellIdentity || this.#heldCell({
            owner: change.owner,
            site: change.site,
            cellIdentity: change.cellIdentity,
        })))
            return null;
        const holds = new Map();
        const boundaries = new Map();
        for (const [release, hold] of this.#publicationIntents) {
            if (hold.cells.length || hold.stores.size ||
                hold.collections.size || hold.resources.size === 0)
                return null;
            holds.set(release, hold);
            for (const resource of hold.resources) {
                const status = closedResourceStatus(resource);
                if (status === null)
                    return null;
                const entries = [...this.#componentCache].filter(([owner, cache]) => this.#liveOwners.has(owner) && cache.nativeBoundary &&
                    cache.pendingResource === resource);
                if (entries.length !== 1)
                    return null;
                const [owner, cache] = entries[0];
                boundaries.set(owner, { cache, resource });
            }
        }
        const heldOwners = new Set([...boundaries.values()].flatMap(({ cache }) => [...cache.subtreeOwners]));
        if (pendingChanges.some((change) => heldOwners.has(change.owner)))
            return null;
        const readers = new Map();
        for (const [readerId, membership] of this.#liveStoreReaders) {
            if (![...heldOwners].some((owner) => this.#readerBelongsToOwner(readerId, owner)))
                continue;
            const receipts = new Map();
            for (const store of membership) {
                const receipt = captureCanonicalStoreReaderReceipt(store, this.#rootId, readerId);
                if (!receipt)
                    return null;
                receipts.set(store, receipt);
            }
            readers.set(readerId, { membership, receipts });
        }
        return boundaries.size ? { holds, boundaries, readers } : null;
    }
    #heldGenericReadersState(state) {
        let result = "current";
        for (const [readerId, { membership, receipts }] of state.readers) {
            if (this.#liveStoreReaders.get(readerId) !== membership ||
                membership.size !== receipts.size)
                return null;
            for (const store of membership) {
                const receipt = receipts.get(store);
                if (!receipt)
                    return null;
                const status = inspectCanonicalStoreReaderReceipt(store, this.#rootId, readerId, receipt);
                if (status === null)
                    return null;
                if (status === "retained")
                    result = "retained";
            }
        }
        return result;
    }
    #captureBoundaryAncestorControlsCurrent(boundaryOwner) {
        const ancestors = new Set(this.world.ownerLineage(boundaryOwner).slice(1));
        const localControlsCurrent = () => !this.#pendingChanges.capture().some((change) => ancestors.has(change.owner));
        if (!localControlsCurrent())
            return null;
        const readers = [];
        for (const [readerId, membership] of this.#liveStoreReaders) {
            if (![...ancestors].some((owner) => this.#readerBelongsToOwner(readerId, owner)))
                continue;
            const receipts = new Map();
            for (const store of membership) {
                const receipt = captureCanonicalStoreReaderReceipt(store, this.#rootId, readerId);
                if (!receipt || inspectCanonicalStoreReaderReceipt(store, this.#rootId, readerId, receipt) !== "current")
                    return null;
                receipts.set(store, receipt);
            }
            readers.push({ readerId, membership, receipts });
        }
        return () => localControlsCurrent() && readers.every(({ readerId, membership, receipts }) => this.#liveStoreReaders.get(readerId) === membership &&
            membership.size === receipts.size && [...membership].every((store) => {
            const receipt = receipts.get(store);
            return receipt !== undefined && inspectCanonicalStoreReaderReceipt(store, this.#rootId, readerId, receipt) === "current";
        }));
    }
    #heldGenericStateCurrent(state) {
        if (this.#heldGenericReadersState(state) === null)
            return false;
        if (this.#publicationIntents.size !== state.holds.size)
            return false;
        for (const [release, hold] of state.holds) {
            if (this.#publicationIntents.get(release) !== hold)
                return false;
        }
        for (const [owner, { cache, resource }] of state.boundaries) {
            if (!this.#liveOwners.has(owner) || !canonicalWorldIsAlive.call(this.world, owner) ||
                this.#componentCache.get(owner) !== cache ||
                !cacheCodeCurrentPrivate([cache]) ||
                cache.pendingResource !== resource)
                return false;
            for (const heldOwner of cache.subtreeOwners) {
                if (!this.#liveOwners.has(heldOwner) ||
                    !canonicalWorldIsAlive.call(this.world, heldOwner) ||
                    !canonicalWorldIsWithin.call(this.world, heldOwner, owner) ||
                    !this.#componentCache.has(heldOwner))
                    return false;
            }
        }
        return true;
    }
    #unheldCellChanges() {
        if (this.#publicationIntents.size === 0) {
            return this.#pendingChanges.size > 0;
        }
        return this.#pendingChanges.capture().some((change) => !change.cellIdentity || !this.#heldCell({
            owner: change.owner, site: change.site,
            cellIdentity: change.cellIdentity,
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
            if (owner === lease)
                break;
            if (![...resources].some((resource) => hold.resources.has(resource)) &&
                !(footprint.cells ?? []).some((cell) => hold.cells.some((held) => held.owner === cell.owner && held.site === cell.site &&
                    held.cellIdentity === cell.cellIdentity)) &&
                !(footprint.stores ?? []).some((store) => hold.stores.has(store)) &&
                !(footprint.collections ?? []).some((collection) => hold.collections.has(collection)))
                continue;
            return hold.wait;
        }
        return null;
    }
    #leaseCoversSelection(lease, resources, footprint) {
        if (!lease)
            return true;
        const held = this.#publicationIntents.get(lease);
        return !!held && [...resources].every((resource) => held.resources.has(resource)) &&
            (footprint.cells ?? []).every((cell) => held.cells.some((selected) => selected.owner === cell.owner && selected.site === cell.site &&
                selected.cellIdentity === cell.cellIdentity)) &&
            (footprint.stores ?? []).every((store) => held.stores.has(store)) &&
            (footprint.collections ?? []).every((collection) => held.collections.has(collection)) &&
            this.#publicationIntents.get(lease) === held;
    }
    #boundaryResourceDependencies(tree, stores) {
        const dependencies = new Set();
        let node = tree;
        const visited = new Set();
        for (let depth = 0; depth < 9; depth++) {
            if (!node || Array.isArray(node) || typeof node !== "object" ||
                !Object.isFrozen(node))
                return null;
            const type = Object.getOwnPropertyDescriptor(node, "type")?.value;
            const props = Object.getOwnPropertyDescriptor(node, "props")?.value;
            if (typeof type !== "function" || visited.has(type) ||
                !props || typeof props !== "object" || !Object.isFrozen(props))
                return null;
            visited.add(type);
            const descriptors = Object.getOwnPropertyDescriptors(props);
            if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") ||
                Object.values(descriptors).some((descriptor) => !("value" in descriptor)))
                return null;
            for (const descriptor of Object.values(descriptors)) {
                if (descriptor.value instanceof AsyncResource)
                    dependencies.add(descriptor.value);
                if (descriptor.value instanceof AsyncStore)
                    stores?.add(descriptor.value);
            }
            const forward = closedComponentForwardProgramFor(type);
            if (!forward)
                return dependencies;
            const nextProps = {};
            for (const [name, expression] of forward.props) {
                if (expression.kind === "prop") {
                    const source = descriptors[expression.name];
                    if (!source || !("value" in source))
                        return null;
                    nextProps[name] = source.value;
                }
                else
                    nextProps[name] = expression.value;
            }
            node = Object.freeze({ type: forward.childComponent,
                props: Object.freeze(nextProps) });
        }
        return null;
    }
    #stageClosedStoreOutputs(selected, stores, requireOutputChange = false, newlyStaged = new Set(), retiredPendingReaders = new Set(), resourceLease) {
        if (new Set(selected).size !== selected.length)
            throw new SparseCandidateIneligible();
        const selectedStores = new Set(selected);
        const inputStores = new Set(selected);
        const inputResources = new Set();
        const owners = new Map();
        const covered = new Set();
        const seen = new Set();
        const regions = [];
        const resources = new ResourceReadSet(this.#resourceTable);
        let outputChanged = false;
        const ownValue = (object, name) => {
            const descriptor = Object.getOwnPropertyDescriptor(object, name);
            return descriptor && "value" in descriptor ? descriptor.value : undefined;
        };
        const treeRegions = (host, previous, next) => {
            const staged = [];
            let changed = false;
            const visit = (shape, old, proposed) => {
                if (!old || !proposed || Array.isArray(old) || Array.isArray(proposed) ||
                    typeof old !== "object" || typeof proposed !== "object")
                    return false;
                const priorElement = Object.getOwnPropertyDescriptors(old);
                const nextElement = Object.getOwnPropertyDescriptors(proposed);
                const oldType = priorElement.type, newType = nextElement.type;
                const oldProps = priorElement.props, newProps = nextElement.props;
                if (!oldType || !newType || !oldProps || !newProps ||
                    !("value" in oldType) || !("value" in newType) ||
                    !("value" in oldProps) || !("value" in newProps))
                    return false;
                const priorType = oldType.value;
                const nextType = newType.value;
                const priorProps = oldProps.value;
                const nextProps = newProps.value;
                if (priorType !== shape.tag || nextType !== shape.tag ||
                    !priorProps || !nextProps || typeof priorProps !== "object" ||
                    typeof nextProps !== "object" || Array.isArray(priorProps) ||
                    Array.isArray(nextProps))
                    return false;
                const priorDescriptors = Object.getOwnPropertyDescriptors(priorProps);
                const nextDescriptors = Object.getOwnPropertyDescriptors(nextProps);
                const oldKey = priorDescriptors.key, newKey = nextDescriptors.key;
                if (!oldKey || !newKey || !("value" in oldKey) || !("value" in newKey) ||
                    oldKey.value !== shape.key || newKey.value !== shape.key)
                    return false;
                const expected = new Set(["key", "children", ...shape.props.map(([name]) => name)]);
                if (Object.keys(priorDescriptors).some((name) => !expected.has(name)) ||
                    Object.keys(nextDescriptors).some((name) => !expected.has(name)))
                    return false;
                const props = [];
                for (const [name] of shape.props) {
                    const prior = priorDescriptors[name];
                    const proposedValue = nextDescriptors[name];
                    if (!prior || !proposedValue || !("value" in prior) ||
                        !("value" in proposedValue))
                        return false;
                    props.push([name, proposedValue.value]);
                    changed ||= !sameClosedHostOutput(shape.tag, name, prior.value, proposedValue.value);
                }
                const childrenFor = (descriptors) => {
                    const descriptor = descriptors.children;
                    if (descriptor && !("value" in descriptor))
                        return null;
                    if (shape.children.length === 0)
                        return descriptor?.value === undefined ? [] : null;
                    const value = descriptor?.value;
                    if (shape.children.length === 1)
                        return Array.isArray(value) ? null : [value];
                    if (!Array.isArray(value))
                        return null;
                    const elements = Object.getOwnPropertyDescriptors(value);
                    const length = elements.length;
                    if (!length || !("value" in length) ||
                        length.value !== shape.children.length ||
                        Reflect.ownKeys(value).length !== shape.children.length + 1)
                        return null;
                    const copy = [];
                    for (let index = 0; index < shape.children.length; index++) {
                        const item = elements[index];
                        if (!item || !("value" in item))
                            return null;
                        copy.push(item.value);
                    }
                    return copy;
                };
                const oldChildren = childrenFor(priorDescriptors);
                const nextChildren = childrenFor(nextDescriptors);
                if (!oldChildren || !nextChildren ||
                    oldChildren.length !== shape.children.length ||
                    nextChildren.length !== shape.children.length)
                    return false;
                const childDescriptions = [];
                staged.push({ key: shape.key, tag: shape.tag, props, children: childDescriptions });
                for (let index = 0; index < shape.children.length; index++) {
                    const child = shape.children[index];
                    const oldChild = oldChildren[index];
                    const nextChild = nextChildren[index];
                    if (child.kind === "host") {
                        childDescriptions.push({ kind: "host", key: child.host.key, tag: child.host.tag });
                        if (!visit(child.host, oldChild, nextChild))
                            return false;
                    }
                    else {
                        if ((typeof oldChild !== "string" && typeof oldChild !== "number") ||
                            (typeof nextChild !== "string" && typeof nextChild !== "number"))
                            return false;
                        const oldText = String(oldChild);
                        const nextText = String(nextChild);
                        childDescriptions.push({ kind: "text", text: nextText });
                        changed ||= oldText !== nextText;
                    }
                }
                return true;
            };
            return visit(host, previous, next) ? { regions: staged, changed } : null;
        };
        const current = (privateOnly = false) => [...owners].every(([owner, { cache, inputs }]) => this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner) &&
            this.#componentCache.get(owner) === cache &&
            (privateOnly ? componentCodeCurrentPrivate(cache.type) :
                componentCodeCurrent(cache.type)) &&
            inputs.every(({ id, prop, source, membership }) => ownValue(cache.props, prop) === source &&
                (membership === undefined ||
                    (this.#liveStoreReaders.get(id) === membership && membership.size === 1 &&
                        membership.has(source)))) && [...this.#liveStoreReaders.keys()].every((id) => !id.startsWith(`${owner}\u0000`) || covered.has(id))) && [...this.#liveStoreReaders].every(([id, membership]) => ![...membership].some((store) => selectedStores.has(store)) ||
            covered.has(id) || retiredPendingReaders.has(id)) && (privateOnly ? resources.validateCanonical() : resources.validate());
        try {
            for (const [id, membership] of this.#liveStoreReaders) {
                if (![...membership].some((store) => selectedStores.has(store)))
                    continue;
                const split = id.indexOf("\u0000");
                const owner = Number(id.slice(0, split));
                if (split <= 0 || !Number.isSafeInteger(owner))
                    throw new SparseCandidateIneligible();
                if (owners.has(owner))
                    continue;
                const cache = this.#componentCache.get(owner);
                const program = typeof cache?.type === "function"
                    ? definedComponents.get(cache.type)?.metadata?.closedStoreHostProgram
                    : undefined;
                if (!cache || !program || cache.subtreeOwners.size !== 1 ||
                    cache.ownEffects.size !== 0 || cache.propBoundSites.size !== 0 ||
                    cache.keyedRegion || cache.nativeBoundary || !componentCodeCurrent(cache.type)) {
                    throw new SparseCandidateIneligible();
                }
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
                        const wait = this.#resourceHoldWait(new Set(), resourceLease, { stores: [store] });
                        if (wait)
                            throw new HeldPublicationWait(wait);
                        if (!inputMembership || inputMembership.size !== 1 ||
                            !inputMembership.has(store))
                            throw new SparseCandidateIneligible();
                        projections = stores.readClosedProjections(store, inputId, paths);
                        if (selectedStores.has(store))
                            seen.add(store);
                    }
                    else {
                        if (inputMembership || !(store instanceof AsyncResource)) {
                            throw new SparseCandidateIneligible();
                        }
                        inputResources.add(store);
                        const wait = this.#resourceHoldWait(new Set([store]), resourceLease);
                        if (wait)
                            throw new HeldPublicationWait(wait);
                        const status = resources.readClosed(store);
                        projections = status ? captureClosedProjectionValues(status.value, paths) : null;
                    }
                    if (!projections)
                        throw new SparseCandidateIneligible();
                    inputs.push({ id: inputId, prop: input.storeProp, source: store,
                        ...(inputMembership ? { membership: inputMembership } : {}) });
                    values.push(...projections);
                    if (inputMembership)
                        covered.add(inputId);
                }
                const output = program.schemaVersion === 4 || program.schemaVersion === 5
                    ? null : evaluateClosedStoreHostProgram(program, values);
                if (program.schemaVersion === 4 || program.schemaVersion === 5) {
                    const tree = evaluateClosedStoreHostTree(program, values);
                    if (!tree)
                        throw new SparseCandidateIneligible();
                    const next = copyRuntimeElement(tree.type, tree.props, owner);
                    const previous = cache.expandedResult;
                    const staged = treeRegions(program.host, previous, next);
                    if (!staged)
                        throw new SparseCandidateIneligible();
                    outputChanged ||= staged.changed;
                    owners.set(owner, { cache, inputs, next });
                    regions.push(...staged.regions);
                    continue;
                }
                const previous = cache.expandedResult;
                if (!output || !previous || Array.isArray(previous) || typeof previous !== "object" ||
                    previous.type !== program.host.tag || previous.props.key !== program.host.key ||
                    (previous.props.children !== undefined && previous.props.children !== null && previous.props.children !== false)) {
                    throw new SparseCandidateIneligible();
                }
                outputChanged ||= output.some(([name, value]) => !sameClosedHostOutput(program.host.tag, name, previous.props[name], value));
                const next = copyRuntimeElement(program.host.tag, Object.fromEntries([["key", program.host.key], ...output]), owner);
                owners.set(owner, { cache, inputs, next });
                regions.push({ key: program.host.key, tag: program.host.tag, props: output });
            }
            if ([...selectedStores].some((store) => !seen.has(store) && !newlyStaged.has(store)) ||
                (requireOutputChange && !outputChanged) ||
                !current() || !stores.validate())
                throw new SparseCandidateIneligible();
            const ownerIds = new Set(owners.keys());
            return {
                owners: ownerIds, regions, current: () => current(),
                privateCurrent: () => current(true), inputStores, inputResources,
                privatePreparedCurrent: () => current(true) &&
                    canonicalResourceCutCurrent(resources),
                publish: () => {
                    for (const [owner, { next }] of owners) {
                        const cache = this.#componentCache.get(owner);
                        this.#componentCache.set(owner, { ...cache, result: next, expandedResult: next });
                        this.#refreshDirectKeyedRegionOutput(owner);
                        for (const ancestor of this.world.ownerLineage(owner).slice(1)) {
                            const live = this.#componentCache.get(ancestor);
                            if (live)
                                this.#componentCache.set(ancestor, {
                                    ...live, expandedResult: null, invalidatedBySparseStore: true,
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
                },
            };
        }
        catch (error) {
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
    #prepareClosedInputCandidate(cells, selected, requireOutputChange = false, acceptedCurrent = () => true, resourceLease, acceptedCollections = [], acceptedResources = new Set(), acceptedCollectionFootprint = []) {
        this.#assertActive();
        this.#assertNoPublicationBarrier("prepare closed inputs");
        this.#assertPreparationHostAvailable();
        if (!this.#leaseCoversSelection(resourceLease, new Set(), { cells, stores: selected }))
            return null;
        const holdWait = this.#resourceHoldWait(new Set(), resourceLease, { cells, stores: selected });
        if (holdWait)
            return this.#prepareBlockedPublication([holdWait]);
        if ((this.#pendingDirectIntent && !(resourceLease &&
            this.#publicationIntents.has(resourceLease))) ||
            (!cells.length && !selected.length))
            return null;
        const captured = this.#captureRetainedCells(cells);
        if (!captured)
            return null;
        const { writes, sources } = captured;
        const stores = new StoreRenderTransaction(this.#rootId);
        let closed = null;
        let program = null;
        try {
            if (selected.length)
                closed = this.#stageClosedStoreOutputs(selected, stores, requireOutputChange, new Set(), new Set(), resourceLease);
            program = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas([], writes.map(({ source, value }) => [source, value]), closed?.regions ?? []);
            if (!program || program.readSources.some((source) => !sources.has(source))) {
                throw new SparseCandidateIneligible();
            }
        }
        catch (error) {
            const errors = collectCleanupErrors([
                () => program?.discard(), () => closed?.release(), () => stores.discard(),
                () => this.#discardUncommittedStoreRoots(stores),
            ]);
            if (error instanceof HeldPublicationWait && !errors.length) {
                return this.#prepareBlockedPublication([error.resource]);
            }
            if (error instanceof SparseCandidateIneligible && !errors.length)
                return null;
            return throwWithCleanup(error, errors);
        }
        const codeCurrent = () => acceptedCurrent() &&
            acceptedCollections.every((validate) => validate()) &&
            (closed?.current() ?? true) && writes.every(({ handle }) => {
            const cache = this.#componentCache.get(handle.owner);
            return cache !== undefined && componentCodeCurrent(cache.type);
        });
        const handles = writes.map(({ handle }) => handle);
        const versions = writes.map(({ version }) => version);
        const acceptedCollectionVersions = acceptedCollectionFootprint.map((collection) => [collection, canonicalCollectionVersion(collection)]);
        const acceptedResourceVersions = [...acceptedResources].map((resource) => [resource, canonicalResourceVersion(resource)]);
        return this.#createCandidateLifecycle({
            baseVersion: this.#publicationVersion, baseVDOMVersion: this.#vdom.version,
            scope: { kind: "retained" }, stores, transitions: [], pendingResources: [], blocked: false,
            permitPendingDirectIntent: () => resourceLease !== undefined &&
                this.#publicationIntents.has(resourceLease),
            admissionCurrent: () => (!resourceLease ||
                this.#publicationIntents.has(resourceLease)) &&
                !this.#resourceHoldWait(acceptedResources, resourceLease, {
                    cells: handles, stores: [...selected, ...(closed?.inputStores ?? [])],
                    collections: acceptedCollectionFootprint,
                }) && !this.#resourceHoldWait(new Set(closed?.inputResources ?? []), resourceLease) &&
                (!resourceLease || this.#publicationIntents.has(resourceLease)),
            codeCurrent,
            validatePrepared: () => program.validate() && this.#validateRetainedCells(writes, false) &&
                (closed?.current() ?? true) && stores.validate(),
            validatePreparedPrivate: () => program.validatePreparedPrivate() &&
                (!resourceLease || this.#publicationIntents.has(resourceLease)) &&
                !this.#resourceHoldWait(new Set(acceptedResourceVersions.map(([resource]) => resource)), resourceLease, { cells: handles,
                    stores: [...selected, ...(closed?.inputStores ?? [])],
                    collections: acceptedCollectionVersions.map(([collection]) => collection) }) &&
                this.#validateRetainedCellsPrivate(writes) &&
                (closed?.privatePreparedCurrent() ?? true) &&
                stores.validatePreparedCanonical() && acceptedCurrent() &&
                acceptedCollectionVersions.every(([collection, version]) => canonicalCollectionCutCurrent(collection, version)) && acceptedResourceVersions.every(([resource, version]) => canonicalResourceVersionCurrent(resource, version)) && writes.every(({ handle }) => {
                const cache = this.#componentCache.get(handle.owner);
                return cache !== undefined && componentCodeCurrentPrivate(cache.type);
            }),
            validatePostHost: () => program.validatePostHost() && this.#validateRetainedCells(writes, true) &&
                (closed?.current() ?? true) && stores.validatePublicationInputs(),
            finalGroupCurrent: () => program.validatePostHostPrivate() &&
                this.#validateRetainedCells(writes, true) &&
                (closed?.privateCurrent() ?? true) && stores.validatePublicationInputsCanonical() &&
                acceptedCurrent() &&
                acceptedCollectionVersions.every(([collection, version]) => version === null || canonicalCollectionVersion(collection) === version) && acceptedResourceVersions.every(([resource, version]) => version === null || canonicalResourceVersion(resource) === version) && writes.every(({ handle }) => {
                const cache = this.#componentCache.get(handle.owner);
                return cache !== undefined && componentCodeCurrentPrivate(cache.type);
            }),
            commitHost: () => program.commit(),
            commitHostAdmitted: () => program.commitAdmitted(),
            preparePublication: () => stores.preparePublicationAfterHost(),
            publish: () => {
                stores.publishAccepted();
                closed?.publish();
                for (const write of writes)
                    this.#lastSourceValues.set(write.source, write.value);
                this.world.clearCellChangesThrough(handles, versions, handles.length);
                this.#pendingChanges.clearNativeThrough(handles, versions, handles.length);
                this.#publicationVersion++;
            },
            installSubscriptions: () => [],
            runEffects: () => { stores.notifyPublished(); return []; },
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
            effectFailureMessage: "Closed input publication callbacks failed",
        });
    }
    #captureRetainedCells(cells) {
        const writes = [];
        const sources = new Set();
        for (const input of cells) {
            const handle = Object.freeze({
                owner: input.owner, site: input.site, cellIdentity: input.cellIdentity,
            });
            const source = this.world.scalarSourceForCell(handle);
            const version = this.world.versionForCell(handle);
            const cache = this.#componentCache.get(handle.owner);
            if (!source || version === null || !cache ||
                !this.#liveOwners.has(handle.owner) ||
                !this.#compiledPropSitesForCache(handle.owner, cache).has(handle.site))
                return null;
            if (sources.has(source))
                continue;
            sources.add(source);
            const value = Object.getOwnPropertyDescriptor(source, "value")?.value;
            if (typeof value !== "number")
                return null;
            writes.push({ handle, source, version, value });
        }
        return { writes, sources };
    }
    #validateRetainedCells(writes, afterHost) {
        return writes.every((write) => {
            const version = this.world.versionForCell(write.handle);
            return this.#liveOwners.has(write.handle.owner) &&
                this.world.scalarSourceForCell(write.handle) === write.source &&
                version !== null && (afterHost ? version >= write.version : version === write.version) &&
                (afterHost && version > write.version || Object.is(Object.getOwnPropertyDescriptor(write.source, "value")?.value, write.value));
        });
    }
    #validateRetainedCellsPrivate(writes) {
        return writes.every((write) => this.#liveOwners.has(write.handle.owner) &&
            canonicalWorldScalarSourceForCell.call(this.world, write.handle) === write.source &&
            canonicalWorldVersionForCell.call(this.world, write.handle) === write.version &&
            capturedScalarCurrent(write.source, write.value));
    }
    #createCandidateLifecycle(spec) {
        const scopedDelta = spec.scope !== undefined;
        const appliedVDOMDelta = !spec.scope ? 1
            : spec.scope.kind === "retained" ? 0 : spec.scope.versionDelta;
        let admittedVersion = spec.baseVersion;
        let admittedVDOMVersion = spec.baseVDOMVersion;
        const candidateStores = new Set(spec.stores.stores);
        for (const store of candidateStores) {
            this.#candidateStoreHolds.set(store, (this.#candidateStoreHolds.get(store) ?? 0) + 1);
        }
        let storesReleased = false;
        const releaseStores = () => {
            if (storesReleased)
                return;
            storesReleased = true;
            this.#releaseCandidateStoreHolds(candidateStores);
        };
        let phase = "prepared";
        let released = false;
        let subscriptionsInstalled = false;
        let candidateHandle = null;
        let groupClaim = null;
        let groupEntered = null;
        let groupWasPartial = null;
        let ownClaim = null;
        let enteredHostApplication = false;
        const releaseOwnClaim = () => {
            if (!ownClaim)
                return;
            const claim = ownClaim;
            ownClaim = null;
            releaseHostPublicationDomains([this.#hostPublicationDomain], claim);
        };
        const pendingResources = [...spec.pendingResources];
        const release = (published) => {
            if (released)
                return;
            released = true;
            try {
                spec.releaseArtifacts(published);
            }
            finally {
                pendingResources.length = 0;
                candidateStores.clear();
                if (candidateHandle) {
                    groupPublicationReceipts.delete(candidateHandle);
                    Object.defineProperties(candidateHandle, {
                        baseVersion: { value: admittedVersion, enumerable: true, configurable: true },
                        targetVersion: { value: admittedVersion + 1, enumerable: true, configurable: true },
                    });
                    Object.defineProperty(candidateHandle, "pendingResources", {
                        value: Object.freeze([]),
                        enumerable: true,
                        configurable: true,
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
                () => { this.#preparedCandidates.delete(candidate); },
                () => release(false),
                () => this.#releasePublicationBarrier(candidate, groupClaim ?? ownClaim ?? undefined),
                releaseOwnClaim,
            ]);
            if (errors.length === 1)
                throw errors[0];
            if (errors.length)
                throw new AggregateError(errors, "Candidate cleanup failed");
        };
        const failUnpublished = (error) => {
            if (!enteredHostApplication) {
                try {
                    finishUnpublished("discarded");
                }
                catch (cleanupError) {
                    throw new AggregateError([error, cleanupError], "Candidate admission and cleanup failed");
                }
                throw error;
            }
            phase = "failed";
            this.#terminalHostFailure ??= error;
            this.#terminalHostFailed = true;
            const claim = groupClaim ?? this.#activeRootClaim ?? ownClaim;
            const errors = collectCleanupErrors([
                () => {
                    if (claim)
                        quarantineHostPublicationDomains([this.#hostPublicationDomain], claim, error);
                },
                () => this.#vdom.failPublication(),
                () => this.#dropPendingDirectIntent(),
                () => this.#cancelTerminalResourceWaits(),
                () => spec.discard(),
                releaseStores,
                () => { this.#preparedCandidates.delete(candidate); },
                () => release(false),
                () => this.#releasePublicationBarrier(candidate, groupClaim ?? ownClaim ?? undefined),
                releaseOwnClaim,
            ]);
            return throwWithCleanup(error, errors);
        };
        const rootVersion = () => this.#publicationVersion;
        const acceptPrepared = () => {
            if (phase !== "publication-ready")
                throw new Error(`Candidate is ${phase}`);
            try {
                spec.publish();
                this.#vdom.publishAccepted();
                phase = "published";
                spec.accepted?.();
                releaseOwnClaim();
            }
            catch (error) {
                this.#terminalFailureKind = "publication";
                failUnpublished(error);
            }
        };
        const finalPrivateCurrent = () => phase === "publication-ready" && !released &&
            !this.#disposed && !this.#disposeRequested &&
            !this.#terminalHostFailed && !this.#codeInvalidated &&
            (!scopedDelta || spec.permitPendingDirectIntent?.() ||
                this.#pendingDirectIntent === null) &&
            this.#publicationVersion === admittedVersion &&
            this.#vdom.appliedVersion === admittedVDOMVersion + appliedVDOMDelta &&
            spec.finalGroupCurrent();
        const preHostLifecycleCurrent = () => phase === "prepared" && !released &&
            !this.#disposed && !this.#disposeRequested &&
            !this.#terminalHostFailed && !this.#hostPublicationDomain.failed &&
            !this.#codeInvalidated &&
            (scopedDelta || this.#publicationIntents.size === 0 ||
                (spec.permitHeldFullCandidate?.() ?? false)) &&
            (!scopedDelta || spec.permitPendingDirectIntent?.() ||
                this.#pendingDirectIntent === null) &&
            (scopedDelta || (this.#publicationVersion === spec.baseVersion &&
                this.#vdom.version === spec.baseVDOMVersion));
        const preHostPrivateCurrent = () => preHostLifecycleCurrent() &&
            spec.validatePreparedPrivate();
        const commitHostInternal = (admitted) => {
            if (phase !== "prepared")
                throw new Error(`Candidate is ${phase}`);
            this.#assertNoPublicationBarrier("commit another candidate");
            if ((!admitted && !candidate.validate()) ||
                !(admitted ? preHostPrivateCurrent() : preHostLifecycleCurrent())) {
                if (phase === "prepared" && !released)
                    finishUnpublished("discarded");
                throw new Error("Native root candidate is stale");
            }
            const claim = groupClaim ?? this.#activeRootClaim ??
                createHostPublicationClaim();
            if (tryClaimHostPublicationDomains([this.#hostPublicationDomain], claim) === "busy")
                throw new HostPublicationBusyError();
            if (!groupClaim && !this.#activeRootClaim)
                ownClaim = claim;
            admittedVersion = this.#publicationVersion;
            admittedVDOMVersion = this.#vdom.version;
            this.#publicationBarrier = candidate;
            try {
                this.#vdom.beginPublication();
                this.#candidateHostCommit = true;
                enteredHostApplication = true;
                groupEntered?.();
                if (admitted)
                    spec.commitHostAdmitted();
                else
                    spec.commitHost();
                if (phase !== "prepared" || this.#disposed || this.#disposeRequested) {
                    throw new Error("Native root candidate was cancelled during host commit");
                }
                phase = "host-committed";
            }
            catch (error) {
                failUnpublished(error);
            }
            finally {
                this.#candidateHostCommit = false;
            }
        };
        const candidate = {
            rootId: this.#rootId,
            get baseVersion() {
                return scopedDelta && phase === "prepared"
                    ? rootVersion() : admittedVersion;
            },
            get targetVersion() { return candidate.baseVersion + 1; },
            stores: candidateStores,
            transitions: Object.freeze([...spec.transitions]),
            pendingResources: Object.freeze([...pendingResources]),
            blocked: spec.blocked,
            retainStoreDependencies: () => {
                if (this.#disposed || released)
                    return () => { };
                return this.holdStoreDependencies(candidateStores);
            },
            validate: () => phase === "prepared" && !released && !this.#disposed &&
                !this.#disposeRequested &&
                !this.#terminalHostFailed && !this.#hostPublicationDomain.failed &&
                !this.#codeInvalidated &&
                (scopedDelta || this.#publicationIntents.size === 0 ||
                    (spec.permitHeldFullCandidate?.() ?? false)) &&
                (!scopedDelta || spec.permitPendingDirectIntent?.() ||
                    this.#pendingDirectIntent === null) &&
                (spec.admissionCurrent?.() ?? true) &&
                spec.codeCurrent() &&
                (scopedDelta || (this.#publicationVersion === spec.baseVersion &&
                    this.#vdom.version === spec.baseVDOMVersion)) &&
                spec.validatePrepared() && !this.#codeInvalidated &&
                (!scopedDelta || spec.permitPendingDirectIntent?.() ||
                    this.#pendingDirectIntent === null) &&
                (spec.admissionCurrent?.() ?? true) &&
                spec.codeCurrent(),
            commitHost: () => commitHostInternal(false),
            validatePostHost: () => (phase === "host-committed" || phase === "publication-ready") && !this.#disposed &&
                !this.#disposeRequested && !this.#terminalHostFailed &&
                !this.#codeInvalidated &&
                (!scopedDelta || spec.permitPendingDirectIntent?.() ||
                    this.#pendingDirectIntent === null) &&
                spec.codeCurrent() &&
                this.#publicationVersion === admittedVersion &&
                this.#vdom.appliedVersion === admittedVDOMVersion + appliedVDOMDelta &&
                spec.validatePostHost() && !this.#codeInvalidated &&
                (!scopedDelta || spec.permitPendingDirectIntent?.() ||
                    this.#pendingDirectIntent === null) &&
                spec.codeCurrent(),
            preparePublication: () => {
                if (phase !== "host-committed") {
                    throw new Error(`Candidate is ${phase}`);
                }
                if (!candidate.validatePostHost()) {
                    const error = new Error("Native root candidate became stale after host commit");
                    failUnpublished(error);
                }
                try {
                    spec.preparePublication();
                    phase = "publication-ready";
                }
                catch (error) {
                    failUnpublished(error);
                }
            },
            publish: () => {
                if (phase === "host-committed")
                    candidate.preparePublication();
                if (phase !== "publication-ready") {
                    throw new Error(`Candidate is ${phase}`);
                }
                try {
                    if (this.#codeInvalidated ||
                        (scopedDelta && !spec.permitPendingDirectIntent?.() &&
                            this.#pendingDirectIntent !== null) ||
                        !spec.codeCurrent() || !finalPrivateCurrent()) {
                        throw new Error("Compiled module changed before publication");
                    }
                }
                catch (error) {
                    this.#terminalFailureKind = "publication";
                    failUnpublished(error);
                }
                acceptPrepared();
            },
            installSubscriptions: () => {
                if (phase !== "published")
                    throw new Error(`Candidate is ${phase}`);
                if (subscriptionsInstalled)
                    return [];
                subscriptionsInstalled = true;
                try {
                    return [...spec.installSubscriptions()];
                }
                catch (error) {
                    return [error];
                }
            },
            runEffects: () => {
                if (phase !== "published")
                    throw new Error(`Candidate is ${phase}`);
                const errors = candidate.installSubscriptions();
                try {
                    errors.push(...spec.runEffects());
                }
                catch (error) {
                    errors.push(error);
                }
                finally {
                    if (phase === "published")
                        phase = "finished";
                    errors.push(...collectCleanupErrors([
                        () => { this.#preparedCandidates.delete(candidate); },
                        releaseStores,
                        () => release(true),
                        () => this.#releasePublicationBarrier(candidate, groupClaim ?? ownClaim ?? undefined),
                    ]));
                }
                if (errors.length) {
                    throw new AggregateError(errors, spec.effectFailureMessage);
                }
            },
            discard: () => {
                if (phase === "published" || phase === "finished" ||
                    phase === "discarded" || phase === "failed")
                    return;
                if (phase === "host-committed" || phase === "publication-ready") {
                    throw new Error("Cannot discard a candidate after host commit");
                }
                finishUnpublished("discarded");
            },
            failGroup: (error) => {
                if (phase === "failed" || phase === "discarded")
                    return;
                if (!enteredHostApplication && !this.#hostPublicationDomain.failed &&
                    !(groupWasPartial?.() ?? false)) {
                    finishUnpublished("discarded");
                    return;
                }
                const wasPublished = phase === "published" || phase === "finished";
                phase = "failed";
                this.#terminalHostFailure ??= error;
                this.#terminalHostFailed = true;
                if (wasPublished)
                    this.#terminalFailureKind = "publication";
                const errors = collectCleanupErrors([
                    () => {
                        const claim = groupClaim ?? this.#activeRootClaim ?? ownClaim;
                        if (claim && enteredHostApplication) {
                            quarantineHostPublicationDomains([this.#hostPublicationDomain], claim, error);
                        }
                    },
                    () => this.#vdom.failPublication(),
                    () => this.#dropPendingDirectIntent(),
                    () => this.#cancelTerminalResourceWaits(),
                    () => { if (!wasPublished)
                        spec.discard(); },
                    releaseStores,
                    () => { this.#preparedCandidates.delete(candidate); },
                    () => release(wasPublished),
                    () => this.#releasePublicationBarrier(candidate, groupClaim ?? ownClaim ?? undefined),
                    releaseOwnClaim,
                ]);
                if (errors.length)
                    throwWithCleanup(error, errors);
            },
        };
        candidateHandle = candidate;
        groupPublicationReceipts.set(candidate, {
            preHostCurrent: preHostPrivateCurrent,
            commitAdmitted: () => commitHostInternal(true),
            current: finalPrivateCurrent,
            accept: acceptPrepared,
            domain: this.#hostPublicationDomain,
            bindClaim: (claim, entered, partial) => {
                groupClaim = claim;
                groupEntered = entered;
                groupWasPartial = partial;
            },
        });
        this.#preparedCandidates.set(candidate, spec.referencesCompiledSource ?? (() => false));
        if (this.#codeInvalidated)
            candidate.discard();
        return candidate;
    }
    #prepareSparseStoreCandidate(readerOwners, capturedChanges, directOnlyOwners, storeGenerationAtPrepare) {
        if (this.#renderPreparation !== "repeatable")
            return null;
        if (readerOwners.size === 0 || this.#everReadResource ||
            this.#everHadNativeBoundary || this.#pendingCollectionRegionKeys.size > 0)
            return null;
        // Every non-reader state change must already have been approved as a
        // numeric host binding. Structural owners stay on the generic candidate.
        for (const change of capturedChanges) {
            if (!readerOwners.has(change.owner) &&
                !directOnlyOwners.has(change.owner))
                return null;
        }
        const readerCaches = new Map();
        const readerKeys = new Map();
        for (const owner of readerOwners) {
            this.#count("store.sparse.eligibility-owner-visits");
            if (!this.world.isAlive(owner) || !this.#liveOwners.has(owner)) {
                return null;
            }
            this.#count("store.sparse.reader-cache-lookups");
            const cache = this.#componentCache.get(owner);
            if (!cache || cache.nativeBoundary || cache.subtreeOwners.size !== 1) {
                return null;
            }
            const metadata = typeof cache.type === "function"
                ? definedComponents.get(cache.type)?.metadata : undefined;
            if (metadata?.hostLeafOutput !== true)
                return null;
            if (hasNestedComponent(cache.result, () => this.#count("store.sparse.eligibility-tree-node-visits")))
                return null;
            const hostKey = singleHostRootKey(cache.expandedResult, () => this.#count("store.sparse.eligibility-tree-node-visits"));
            if (hostKey === null)
                return null;
            readerCaches.set(owner, cache);
            readerKeys.set(owner, hostKey);
        }
        const baseVersion = this.#publicationVersion;
        const baseVDOMVersion = this.#vdom.version;
        const candidateChanges = [...capturedChanges];
        const preparation = this.world.beginPreparation();
        const stores = new StoreRenderTransaction(this.#rootId);
        let resourceReads = new ResourceReadSet(this.#resourceTable);
        const cachePatches = new Map();
        const ancestorPatches = new Map();
        const capturedBindings = [];
        const numericWrites = [];
        const numericSources = new Set();
        for (const change of candidateChanges) {
            if (!directOnlyOwners.has(change.owner))
                continue;
            if (!this.world.isAlive(change.owner))
                continue;
            const source = this.world.scalarSource(change.owner, change.site);
            const previous = source ? this.#lastSourceValues.get(source) : undefined;
            if (!source || previous === undefined || numericSources.has(source)) {
                continue;
            }
            numericSources.add(source);
            numericWrites.push({
                owner: change.owner,
                site: change.site,
                source,
                version: this.world.version(change.owner, change.site),
                previous,
                current: source.value,
            });
        }
        const validateNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) &&
            this.world.version(write.owner, write.site) === write.version &&
            this.world.scalarSource(write.owner, write.site) === write.source &&
            Object.is(write.source.value, write.current));
        const validatePostHostNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) &&
            this.world.scalarSource(write.owner, write.site) === write.source &&
            this.world.version(write.owner, write.site) >= write.version &&
            (this.world.version(write.owner, write.site) > write.version ||
                Object.is(write.source.value, write.current)));
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
                            sites,
                        });
                    },
                    onOutputNode: () => this.#count("store.sparse.output-tree-node-visits"),
                });
                if (!prepared || resourceWasRead) {
                    preparationFailed = true;
                    break;
                }
                const result = prepared.result;
                if (hasNestedComponent(result, () => this.#count("store.sparse.output-tree-node-visits")) ||
                    singleHostRootKey(result, () => this.#count("store.sparse.output-tree-node-visits")) !== readerKeys.get(owner)) {
                    preparationFailed = true;
                    break;
                }
                cachePatches.set(owner, {
                    ...cached,
                    result,
                    expandedResult: result,
                    ownEffects: prepared.ownEffects,
                    propBoundSites: prepared.propBoundSites,
                    numericStateAdmitted: prepared.numericStateAdmitted,
                });
                regions.push({ key: readerKeys.get(owner), tree: result });
                this.#count("store.sparse.reader-owner-renders");
                for (const ancestor of this.world.ownerLineage(owner).slice(1)) {
                    this.#count("store.sparse.ancestor-owner-visits");
                    if (ancestorPatches.has(ancestor))
                        continue;
                    const ancestorCache = this.#componentCache.get(ancestor);
                    if (!ancestorCache || ancestorCache.invalidatedBySparseStore) {
                        continue;
                    }
                    ancestorPatches.set(ancestor, {
                        ...ancestorCache,
                        expandedResult: null,
                        invalidatedBySparseStore: true,
                    });
                }
            }
            if (preparationFailed || resourceWasRead) {
                throw new SparseCandidateIneligible();
            }
            preparedHost = this.#vdom.prepareKeyedRegions(regions);
            if (!preparedHost)
                throw new SparseCandidateIneligible();
        }
        catch (error) {
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
            if (resourceWasRead || preparationFailed ||
                error instanceof SparseCandidateIneligible) {
                return null;
            }
            throw error;
        }
        const capturedSparseValues = new Map();
        for (const [owner, cache] of cachePatches) {
            for (const site of cache.propBoundSites) {
                const source = preparation.scalarSource(owner, site);
                if (!source)
                    continue;
                let sites = capturedSparseValues.get(owner);
                if (!sites)
                    capturedSparseValues.set(owner, sites = new Map());
                sites.set(site, source.value);
            }
        }
        const capturedCodeRevisions = captureCodeRevisions(cachePatches.values());
        let admittedBindings = null;
        const validateAdmittedBindings = () => {
            admittedBindings = prepareAdmittedBindings(capturedBindings, (owner, site) => canonicalWorldIsAlive.call(this.world, owner)
                ? canonicalWorldScalarSource.call(this.world, owner, site) : null);
            if (admittedBindings === null) {
                throw new UnsupportedGroupOpaqueFreshnessError("binding");
            }
            return true;
        };
        const commitSparseHost = (admitted) => {
            preparation.beginHostApplication();
            if (admitted)
                applyAdmittedBindings(capturedBindings, admittedBindings ?? []);
            else
                for (const item of capturedBindings) {
                    const canonical = item.sites.map((site, index) => this.world.isAlive(item.owner)
                        ? this.world.scalarSource(item.owner, site) ?? item.sources[index]
                        : item.sources[index]);
                    if (rebindCapturedBindingSources(item.binding, canonical))
                        continue;
                    const mutable = item.binding.sources;
                    if (mutable) {
                        for (let index = 0; index < canonical.length; index++) {
                            mutable[index] = canonical[index];
                        }
                    }
                    item.binding.source = canonical[0];
                }
            if (admitted)
                preparedHost.commitAdmitted();
            else
                preparedHost.commit();
            preparedHost = null;
            this.#applyCandidateNumericWrites(numericWrites);
        };
        return this.#createCandidateLifecycle({
            baseVersion,
            baseVDOMVersion,
            stores,
            transitions: [],
            pendingResources: [],
            blocked: false,
            codeCurrent: () => cacheCodeCurrent(cachePatches.values()),
            validatePrepared: () => this.#storeNotificationGeneration === storeGenerationAtPrepare &&
                preparation.validate() && !preparation.hasStateWrites() &&
                stores.validate() && validateNumericWrites() &&
                (resourceReads?.validate() ?? false) &&
                (preparedHost?.validate?.() ?? false),
            validatePreparedPrivate: () => this.#storeNotificationGeneration === storeGenerationAtPrepare &&
                preparation.validate() && !preparation.hasStateWrites() &&
                stores.validatePreparedCanonical() &&
                numericWrites.every((write) => canonicalWorldIsAlive.call(this.world, write.owner) &&
                    canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&
                    canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&
                    capturedScalarCurrent(write.source, write.current)) && (resourceReads ? canonicalResourceCutCurrent(resourceReads) : false) &&
                (preparedHost?.validatePreparedPrivate() ?? false) &&
                validateAdmittedBindings() &&
                cacheCodeCurrentPrivate(cachePatches.values()) &&
                codeRevisionsCurrent(capturedCodeRevisions),
            validatePostHost: () => preparation.validatePublicationInputs() &&
                !preparation.hasStateWrites() &&
                stores.validatePublicationInputs() &&
                validatePostHostNumericWrites() &&
                (resourceReads?.validate() ?? false),
            finalGroupCurrent: () => preparation.validatePublicationInputs() &&
                !preparation.hasStateWrites() &&
                stores.validatePublicationInputsCanonical() &&
                validatePostHostNumericWrites() &&
                (resourceReads?.validateCanonical() ?? false) &&
                cacheCodeCurrentPrivate(cachePatches.values()) &&
                codeRevisionsCurrent(capturedCodeRevisions),
            preparePublication: () => {
                preparation.preparePublicationAfterHost();
                stores.preparePublicationAfterHost();
            },
            commitHost: () => commitSparseHost(false),
            commitHostAdmitted: () => commitSparseHost(true),
            publish: () => {
                preparation.publishAccepted();
                stores.publishAccepted();
                for (const [owner, cache] of cachePatches) {
                    this.#count("store.sparse.cache-patch-writes");
                    this.#componentCache.set(owner, cache);
                }
                for (const owner of cachePatches.keys()) {
                    this.#refreshDirectKeyedRegionOutput(owner, true);
                }
                for (const [owner, cache] of ancestorPatches) {
                    this.#count("store.sparse.ancestor-marker-writes");
                    this.#componentCache.set(owner, cache);
                }
                for (const [owner, cache] of cachePatches) {
                    this.#count("store.sparse.source-history-owner-visits");
                    const previous = readerCaches.get(owner);
                    this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites, capturedSparseValues.get(owner));
                }
                for (const write of numericWrites) {
                    if (this.world.isAlive(write.owner) &&
                        this.world.scalarSource(write.owner, write.site) === write.source) {
                        if (this.#vdom.hasBoundSource(write.source)) {
                            this.#lastSourceValues.set(write.source, write.current);
                        }
                        else {
                            this.#lastSourceValues.delete(write.source);
                        }
                    }
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
                }
                catch (error) {
                    return [error];
                }
            },
            runEffects: () => {
                const errors = [];
                try {
                    preparation.notifyPublished();
                }
                catch (error) {
                    errors.push(error);
                }
                try {
                    stores.notifyPublished();
                }
                catch (error) {
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
                admittedBindings = null;
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
            effectFailureMessage: "Component effects failed after sparse store candidate publication",
        });
    }
    #prepareCandidate(tree, options, forceRender, dirtyOwners, relevantOwners, numericChanges = [], heldGenericState) {
        this.#assertActive();
        this.#assertNoPublicationBarrier("prepare");
        this.#assertPreparationHostAvailable();
        if (this.#terminalHostFailed) {
            throw new Error("Component root is terminal after a host commit failure");
        }
        const baseVersion = this.#publicationVersion;
        const baseVDOMVersion = this.#vdom.version;
        const directIntentAtPrepare = this.#pendingDirectIntent;
        let acceptedIntentLease = null;
        let retryResourceAfterPublication = false;
        const storeGenerationAtPrepare = this.#storeNotificationGeneration;
        const capturedChanges = this.#pendingChanges.capture();
        // Direct-writer owners are reused, so recapture their source/version on every
        // candidate attempt instead of relying on OwnerPreparation validation.
        const numericWrites = [];
        const numericSources = new Set();
        for (const change of numericChanges) {
            if (!this.world.isAlive(change.owner))
                continue;
            const source = this.world.scalarSource(change.owner, change.site);
            const previous = source ? this.#lastSourceValues.get(source) : undefined;
            if (!source || previous === undefined || numericSources.has(source)) {
                continue;
            }
            numericSources.add(source);
            numericWrites.push({
                owner: change.owner,
                site: change.site,
                source,
                version: this.world.version(change.owner, change.site),
                previous,
                current: source.value,
            });
        }
        const validateNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) &&
            this.world.version(write.owner, write.site) === write.version &&
            this.world.scalarSource(write.owner, write.site) === write.source &&
            Object.is(write.source.value, write.current));
        const validatePostHostNumericWrites = () => numericWrites.every((write) => this.world.isAlive(write.owner) &&
            this.world.scalarSource(write.owner, write.site) === write.source &&
            this.world.version(write.owner, write.site) >= write.version &&
            (this.world.version(write.owner, write.site) > write.version ||
                Object.is(write.source.value, write.current)));
        const preparation = this.world.beginPreparation();
        const stores = new StoreRenderTransaction(this.#rootId, {
            transitions: options.transitions,
        });
        let resourceReads = new ResourceReadSet(this.#resourceTable);
        const expansionJournal = undefined;
        const nextBoundaryPrimaries = new Map(this.#boundaryPrimaries);
        const boundaryState = {
            blocked: false,
            visited: new Set(),
            held: heldGenericState,
            retained: heldGenericState ? new Set() : undefined,
        };
        const nextOwners = new Set();
        const nextEffects = new Map();
        const nextCache = new Map();
        const createdOwners = [];
        const keyedRegions = new Map();
        const collectionRegions = new Map();
        const capturedBindings = [];
        let expanded;
        let preparedHost = null;
        const priorKeyed = this.#collectedKeyedRegions;
        const priorCollections = this.#collectedCollectionRegions;
        this.#collectedKeyedRegions = keyedRegions;
        this.#collectedCollectionRegions = collectionRegions;
        try {
            expanded = this.#expand(tree, this.#rootOwner, nextOwners, nextEffects, nextCache, createdOwners, "root", forceRender, dirtyOwners, relevantOwners, [], new Map(), stores, undefined, undefined, preparation, (binding, sources, owner, sites) => capturedBindings.push({ binding, sources, owner, sites }), resourceReads, expansionJournal, nextBoundaryPrimaries, boundaryState);
            if (heldGenericState &&
                (boundaryState.retained?.size !== heldGenericState.boundaries.size ||
                    !this.#heldGenericStateCurrent(heldGenericState))) {
                boundaryState.blocked = true;
            }
            for (const key of nextBoundaryPrimaries.keys()) {
                if (!boundaryState.visited.has(key))
                    nextBoundaryPrimaries.delete(key);
            }
            // Tagged bindings select direct writers on the first commit, even for empty collections.
            // The VDOM retains whole-style fallback when the host lacks field writes.
            preparedHost = this.#vdom.prepareCommit(expanded, null, true);
            expanded = null;
        }
        catch (error) {
            preparation.discard();
            stores.discard();
            resourceReads?.discard();
            resourceReads = null;
            this.#discardUncommittedStoreRoots(stores);
            throw error;
        }
        finally {
            this.#collectedKeyedRegions = priorKeyed;
            this.#collectedCollectionRegions = priorCollections;
        }
        const capturedBoundValues = new Map();
        for (const [owner, cache] of nextCache) {
            for (const site of cache.propBoundSites) {
                const source = preparation.scalarSource(owner, site);
                if (!source)
                    continue;
                let sites = capturedBoundValues.get(owner);
                if (!sites)
                    capturedBoundValues.set(owner, sites = new Map());
                sites.set(site, source.value);
            }
        }
        const candidatePendingResources = [...new Set([
                ...resourceReads.pending,
                ...[...(heldGenericState?.boundaries.values() ?? [])].map(({ resource }) => resource),
            ])];
        const ownerIds = new Set(nextOwners);
        const previousOwners = new Set(this.#liveOwners);
        const artifacts = {
            preparation: preparation,
            stores: stores,
            preparedHost: preparedHost,
            tree: { value: tree },
            nextCache: nextCache,
            nextEffects: nextEffects,
            nextOwners: nextOwners,
            ownerIds: ownerIds,
            previousOwners: previousOwners,
            keyedRegions: keyedRegions,
            collectionRegions: collectionRegions,
            capturedBindings: capturedBindings,
            capturedChanges: capturedChanges,
            numericWrites: numericWrites,
        };
        let admittedBindings = null;
        let artifactsReleased = false;
        const releaseCandidateArtifacts = (published) => {
            if (artifactsReleased)
                return;
            artifactsReleased = true;
            admittedBindings = null;
            resourceReads?.discard();
            resourceReads = null;
            candidatePendingResources.length = 0;
            artifacts.preparation = null;
            artifacts.stores = null;
            artifacts.preparedHost = null;
            artifacts.tree = null;
            if (!published)
                artifacts.nextCache?.clear();
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
            if (!published)
                nextBoundaryPrimaries.clear();
            // Candidate methods share this preparation scope. Clear large source
            // objects as well as their explicit artifact holders on every terminal path.
            tree = null;
            expanded = null;
            preparedHost = null;
        };
        const validatesCollections = () => [...(artifacts.keyedRegions?.values() ?? [])].every((region) => !region.collection ||
            region.collection.collection.version ===
                region.collection.snapshotVersion) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) => region.collection.version === region.snapshotVersion);
        const validatesPostHostCollections = () => [...(artifacts.keyedRegions?.values() ?? [])].every((region) => !region.collection ||
            region.collection.collection.version >=
                region.collection.snapshotVersion) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) => region.collection.version >= region.snapshotVersion);
        const validatesPostHostCollectionsCanonical = () => [...(artifacts.keyedRegions?.values() ?? [])].every((region) => {
            if (!region.collection)
                return true;
            const version = canonicalCollectionVersion(region.collection.collection);
            return version === null || version >= region.collection.snapshotVersion;
        }) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) => {
            const version = canonicalCollectionVersion(region.collection);
            return version === null || version >= region.snapshotVersion;
        });
        const validatesPreparedCollectionsCanonical = () => [...(artifacts.keyedRegions?.values() ?? [])].every((region) => !region.collection || canonicalCollectionCutCurrent(region.collection.collection, region.collection.snapshotVersion)) && [...(artifacts.collectionRegions?.values() ?? [])].every((region) => canonicalCollectionCutCurrent(region.collection, region.snapshotVersion));
        const capturedCodeRevisions = captureCodeRevisions(artifacts.nextCache?.values() ?? []);
        const validateAdmittedBindings = () => {
            admittedBindings = prepareAdmittedBindings(artifacts.capturedBindings ?? [], (owner, site) => canonicalWorldIsAlive.call(this.world, owner)
                ? canonicalWorldScalarSource.call(this.world, owner, site)
                : artifacts.preparation.scalarSource(owner, site));
            if (admittedBindings === null) {
                throw new UnsupportedGroupOpaqueFreshnessError("binding");
            }
            return true;
        };
        const commitFullHost = (admitted) => {
            artifacts.preparation.beginHostApplication();
            if (admitted)
                applyAdmittedBindings(artifacts.capturedBindings ?? [], admittedBindings ?? []);
            else
                for (const item of artifacts.capturedBindings ?? []) {
                    const canonical = item.sites.map((site, index) => this.world.isAlive(item.owner)
                        ? this.world.scalarSource(item.owner, site) ?? item.sources[index]
                        : item.sources[index]);
                    if (rebindCapturedBindingSources(item.binding, canonical))
                        continue;
                    const mutable = item.binding.sources;
                    if (mutable) {
                        for (let index = 0; index < canonical.length; index++) {
                            mutable[index] = canonical[index];
                        }
                    }
                    item.binding.source = canonical[0];
                }
            if (admitted)
                artifacts.preparedHost.commitAdmitted();
            else
                artifacts.preparedHost.commit();
            artifacts.preparedHost = null;
            this.#applyCandidateNumericWrites(artifacts.numericWrites ?? []);
        };
        return this.#createCandidateLifecycle({
            baseVersion,
            baseVDOMVersion,
            stores,
            transitions: options.transitions ?? [],
            pendingResources: candidatePendingResources,
            blocked: boundaryState.blocked,
            permitHeldFullCandidate: heldGenericState
                ? () => this.#heldGenericStateCurrent(heldGenericState)
                : undefined,
            referencesCompiledSource: (sourceFile) => treeReferencesCompiledSource(tree, sourceFile) ||
                [...(artifacts.nextCache?.values() ?? [])].some((cache) => cacheReferencesCompiledSource(cache, sourceFile)),
            codeCurrent: () => this.#pendingDirectIntent === directIntentAtPrepare &&
                (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState)) &&
                cacheCodeCurrent(artifacts.nextCache?.values() ?? []),
            validatePrepared: () => artifacts.preparation !== null && artifacts.preparation.validate() &&
                !artifacts.preparation.hasStateWrites() &&
                artifacts.stores !== null && artifacts.stores.validate() &&
                validateNumericWrites() &&
                (resourceReads?.validate() ?? false) &&
                !boundaryState.blocked && validatesCollections() &&
                (artifacts.preparedHost?.validate?.() ?? false),
            validatePreparedPrivate: () => artifacts.preparation !== null && artifacts.preparation.validate() &&
                !artifacts.preparation.hasStateWrites() &&
                artifacts.stores !== null && artifacts.stores.validatePreparedCanonical() &&
                (artifacts.numericWrites ?? []).every((write) => canonicalWorldIsAlive.call(this.world, write.owner) &&
                    canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&
                    canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&
                    capturedScalarCurrent(write.source, write.current)) && !boundaryState.blocked &&
                validatesPreparedCollectionsCanonical() &&
                this.#pendingDirectIntent === directIntentAtPrepare &&
                (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState)) &&
                cacheCodeCurrentPrivate(artifacts.nextCache?.values() ?? []) &&
                codeRevisionsCurrent(capturedCodeRevisions) &&
                (resourceReads ? canonicalResourceCutCurrent(resourceReads) : false) &&
                (artifacts.preparedHost?.validatePreparedPrivate() ?? false) &&
                validateAdmittedBindings(),
            validatePostHost: () => artifacts.preparation !== null &&
                artifacts.preparation.validatePublicationInputs() &&
                !artifacts.preparation.hasStateWrites() &&
                artifacts.stores !== null &&
                artifacts.stores.validatePublicationInputs() &&
                validatePostHostNumericWrites() &&
                !boundaryState.blocked && validatesPostHostCollections(),
            finalGroupCurrent: () => artifacts.preparation !== null &&
                artifacts.preparation.validatePublicationInputs() &&
                !artifacts.preparation.hasStateWrites() &&
                artifacts.stores !== null &&
                artifacts.stores.validatePublicationInputsCanonical() &&
                validatePostHostNumericWrites() && !boundaryState.blocked &&
                validatesPostHostCollectionsCanonical() &&
                cacheCodeCurrentPrivate(artifacts.nextCache?.values() ?? []) &&
                codeRevisionsCurrent(capturedCodeRevisions) &&
                this.#pendingDirectIntent === directIntentAtPrepare &&
                (!heldGenericState || this.#heldGenericStateCurrent(heldGenericState)) &&
                ((resourceReads?.validateCanonical() ?? true) ||
                    (retryResourceAfterPublication = true)),
            preparePublication: () => {
                retryResourceAfterPublication = resourceReads !== null &&
                    !resourceReads.validate();
                artifacts.preparation.preparePublicationAfterHost();
                artifacts.stores.preparePublicationAfterHost();
                if (!validatesPostHostCollections() ||
                    !validatePostHostNumericWrites() ||
                    !artifacts.stores.validatePublicationInputs() ||
                    !artifacts.preparation.validatePublicationInputs()) {
                    throw new Error("Full candidate inputs changed before publication");
                }
            },
            commitHost: () => commitFullHost(false),
            commitHostAdmitted: () => commitFullHost(true),
            publish: () => {
                artifacts.preparation.publishAccepted();
                artifacts.stores.publishAccepted();
                this.#tree = artifacts.tree.value;
                this.#liveOwners = new Set(artifacts.ownerIds);
                this.#componentCache = artifacts.nextCache;
                this.#boundaryPrimaries = nextBoundaryPrimaries;
                if (retryResourceAfterPublication)
                    this.#pendingResourceRetry = true;
                resourceReads?.discard();
                resourceReads = null;
                this.#syncLastSourceValues(artifacts.nextCache, capturedBoundValues);
                if (this.#storeNotificationGeneration === storeGenerationAtPrepare &&
                    (!heldGenericState ||
                        this.#heldGenericReadersState(heldGenericState) === "current")) {
                    this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
                }
                this.world.clearChangesThrough(capturedChanges);
                this.#pendingChanges.clearThrough(capturedChanges);
                this.#publicationVersion++;
            },
            accepted: () => {
                if (directIntentAtPrepare &&
                    this.#pendingDirectIntent === directIntentAtPrepare) {
                    this.#pendingDirectIntent = null;
                    acceptedIntentLease = directIntentAtPrepare.releaseStoreLease;
                    directIntentAtPrepare.releaseStoreLease = null;
                    directIntentAtPrepare.tree = null;
                }
            },
            installSubscriptions: () => {
                if (this.#disposed)
                    return [];
                const errors = [];
                try {
                    this.#syncStoreReaders(artifacts.stores);
                }
                catch (error) {
                    errors.push(error);
                }
                finally {
                    const releaseLease = acceptedIntentLease;
                    acceptedIntentLease = null;
                    if (releaseLease)
                        errors.push(...collectCleanupErrors([releaseLease]));
                }
                if (options.autoRetryResources !== false) {
                    try {
                        this.#syncResourceSubscriptions(candidatePendingResources);
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
                try {
                    this.#syncCollectionRegions(artifacts.nextCache, artifacts.collectionRegions);
                }
                catch (error) {
                    errors.push(error);
                }
                return errors;
            },
            runEffects: () => {
                if (this.#disposed)
                    return [];
                const errors = [];
                try {
                    artifacts.preparation.notifyPublished();
                }
                catch (error) {
                    errors.push(error);
                }
                try {
                    artifacts.stores.notifyPublished();
                }
                catch (error) {
                    errors.push(error);
                }
                errors.push(...this.#reconcileEffects(artifacts.nextEffects));
                for (const previous of artifacts.previousOwners ?? []) {
                    if (artifacts.ownerIds?.has(previous))
                        continue;
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
            effectFailureMessage: "Component effects failed after candidate publication",
        });
    }
    /** Root-wide declaration that generic render preparation may repeat. */
    get renderPreparation() {
        return this.#renderPreparation;
    }
    #requireRepeatableRender(capability) {
        this.#validateRenderPreparation(capability);
        if (capability === "repeatable" || this.#renderPreparation === "repeatable")
            return;
        throw new Error("Isolated generic preparation requires renderPreparation: repeatable");
    }
    #validateRenderPreparation(capability) {
        if (capability !== undefined && capability !== "repeatable") {
            throw new TypeError("Unknown render preparation capability");
        }
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
        if (typeof listener !== "function") {
            throw new Error("Dispose listener must be a function");
        }
        if (this.#disposed) {
            listener();
            return () => { };
        }
        this.#disposeListeners.add(listener);
        return () => this.#disposeListeners.delete(listener);
    }
    /** Observe terminal work retirement; callers still dispose the accepted host tree. */
    onRetire(listener) {
        if (typeof listener !== "function")
            throw new Error("Retire listener must be a function");
        if (this.#disposed || (this.#codeInvalidated && !this.#revisionRetirementPending)) {
            listener();
            return () => { };
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
            disposed: this.#disposed,
        };
    }
    mount(tree) {
        this.#assertActive();
        this.#assertNoPublicationBarrier("mount");
        if (this.version !== 0) {
            throw new Error("ComponentStateRoot is already mounted");
        }
        if (!this.#enterDirectHostDomain()) {
            this.#pendingDirectIntent = {
                tree,
                releaseStoreLease: null,
                attemptedStoreGeneration: null,
            };
            this.#deferredFlush = true;
            return;
        }
        try {
            this.#renderAndCommit(tree, true);
        }
        finally {
            this.#leaveDirectHostDomain();
        }
    }
    /** Commit one batched owner/site update; return false when there is no work. */
    flush() {
        this.#assertActive();
        // Keep capture buffers owned by the outer frame across reentrant flushes; its
        // acknowledgement schedules any newer setter version.
        if (this.#nativeCellCutActive || this.#scopedFlushActive) {
            if (isHostPublicationDomainBusy(this.#hostPublicationDomain)) {
                this.#waitForHostAvailability(true);
            }
            this.#scheduled = false;
            this.#deferredFlush = true;
            return false;
        }
        if (this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
            this.#directPublicationPending || this.#activeRootClaim) {
            if (isHostPublicationDomainBusy(this.#hostPublicationDomain)) {
                this.#waitForHostAvailability(true);
            }
            this.#deferredFlush = true;
            this.#scheduled = false;
            return false;
        }
        if (!this.#enterDirectHostDomain(true)) {
            this.#scheduled = false;
            this.#deferredFlush = true;
            return false;
        }
        this.#deferredFlush = false;
        try {
            const flushStarted = this.#profile ? performance.now() : 0;
            const reportFlush = () => {
                if (this.#activeCounters) {
                    this.#profileCounter?.(Object.fromEntries(this.#activeCounters));
                    this.#activeCounters = undefined;
                }
                if (this.#profile) {
                    this.#profile("root.flush", performance.now() - flushStarted);
                }
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
                    return this.#renderAndCommit(intent.tree, true, new Set(), new Set(), 0, [], intent);
                }
                catch (error) {
                    if (!this.#disposed && !this.#codeInvalidated &&
                        !this.#terminalHostFailed && this.#tree === acceptedTree) {
                        this.#pendingResourceRetry ||= retryResource;
                        for (const owner of retryBoundaries) {
                            const cache = this.#componentCache.get(owner);
                            if (cache?.nativeBoundary && cache.pendingResource) {
                                this.#pendingBoundaryRetries.add(owner);
                            }
                        }
                        scheduleRestoredWork = !this.#pendingDirectIntent;
                    }
                    throw error;
                }
                finally {
                    this.#scopedFlushActive = false;
                    const shouldSchedule = scheduleRestoredWork ||
                        (this.#deferredFlush && this.#hasPendingWork());
                    this.#deferredFlush = false;
                    if (shouldSchedule)
                        this.#schedule();
                    reportFlush();
                }
            }
            const storeGenerationAtStart = this.#storeNotificationGeneration;
            const asyncWorkPending = this.#liveResourceSubscriptions.size > 0 ||
                this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0;
            const canTryClosedStores = this.#liveResourceSubscriptions.size > 0 &&
                (this.#publicationIntents.size > 0 ||
                    (!this.#pendingResourceRetry && this.#pendingBoundaryRetries.size === 0)) &&
                !this.#unheldCellChanges() && !this.#unheldCollectionChanges() &&
                storeGenerationAtStart !== this.#committedStoreNotificationGeneration &&
                (this.#publicationIntents.size === 0 ||
                    this.#partialStoreAttemptGeneration !== storeGenerationAtStart);
            if (canTryClosedStores && this.#publicationIntents.size > 0) {
                this.#partialStoreAttemptGeneration = storeGenerationAtStart;
            }
            if (canTryClosedStores && this.#tryFlushClosedStores()) {
                const fresh = this.#storeNotificationGeneration !== storeGenerationAtStart ||
                    (this.#publicationIntents.size === 0 &&
                        (this.#pendingResourceRetry || this.#pendingBoundaryRetries.size > 0));
                this.#deferredFlush = false;
                if (fresh || this.#hasPendingWork())
                    this.#schedule();
                reportFlush();
                return true;
            }
            const urgentPublished = (asyncWorkPending ||
                this.#publicationIntents.size > 0) &&
                this.#pendingChanges.size > 0 &&
                !this.#unheldCollectionChanges() &&
                this.#tryFlushUrgentRetainedCut();
            if (this.#disposed || this.#terminalHostFailed || this.#codeInvalidated) {
                reportFlush();
                return urgentPublished;
            }
            const resourceRetry = this.#pendingResourceRetry;
            this.#pendingResourceRetry = false;
            if (resourceRetry && this.#publicationIntents.size > 0) {
                this.#pendingResourceRetry = true;
            }
            const boundaryRetries = [...this.#pendingBoundaryRetries];
            const capturedBoundaryOwners = new Set(boundaryRetries);
            this.#pendingBoundaryRetries.clear();
            const canDrainBoundaries = !this.#unheldCellChanges() &&
                !this.#unheldCollectionChanges();
            const acceptedTree = this.#tree;
            let boundaryPublished = false;
            let boundaryFallback = false;
            let boundaryAborted = false;
            if (canDrainBoundaries && boundaryRetries.length > 0) {
                const drained = this.#drainBoundaryRetries(boundaryRetries, acceptedTree);
                boundaryPublished = drained.published;
                boundaryFallback = drained.fallback;
                boundaryAborted = drained.aborted;
            }
            else if (boundaryRetries.length > 0) {
                boundaryFallback = true;
                for (const owner of boundaryRetries)
                    this.#pendingBoundaryRetries.add(owner);
            }
            if (boundaryAborted) {
                this.#deferredFlush = false;
                reportFlush();
                return boundaryPublished || urgentPublished;
            }
            const retryWholeTree = (resourceRetry &&
                this.#publicationIntents.size === 0) || boundaryFallback;
            if ((boundaryPublished || urgentPublished) && !retryWholeTree) {
                this.#deferredFlush = false;
                if (urgentPublished) {
                    if (this.#hasPendingWork())
                        this.#schedule();
                }
                else if (this.#hasPendingWork())
                    this.#schedule();
                reportFlush();
                return true;
            }
            if (boundaryPublished || urgentPublished)
                this.#deferredFlush = false;
            if (this.#publicationIntents.size > 0 &&
                (this.#pendingDirectIntent ||
                    this.#pendingChanges.size > 0 ||
                    this.#storeNotificationGeneration !==
                        this.#committedStoreNotificationGeneration) &&
                (this.#pendingChanges.size > 0 || canTryClosedStores ||
                    this.#partialStoreAttemptGeneration !==
                        this.#storeNotificationGeneration)) {
                const intent = this.#pendingDirectIntent;
                this.#partialStoreAttemptGeneration = this.#storeNotificationGeneration;
                this.#scopedFlushActive = true;
                let published = false;
                try {
                    published = this.#renderAndCommit(intent?.tree ?? this.#tree, true, new Set(), new Set(), 0, [], intent);
                }
                finally {
                    this.#scopedFlushActive = false;
                }
                const deferred = this.#deferredFlush;
                this.#deferredFlush = false;
                if (deferred && this.#hasPendingWork())
                    this.#schedule();
                if (published) {
                    reportFlush();
                    return true;
                }
            }
            if (this.#publicationIntents.size > 0 &&
                (this.#pendingDirectIntent || this.#pendingChanges.size > 0 ||
                    this.#pendingCollectionRegionKeys.size > 0 ||
                    this.#storeNotificationGeneration !==
                        this.#committedStoreNotificationGeneration)) {
                reportFlush();
                return boundaryPublished || urgentPublished;
            }
            const runGenericRetry = () => {
                const unprocessed = [...this.#pendingBoundaryRetries].filter((owner) => capturedBoundaryOwners.has(owner));
                for (const owner of unprocessed)
                    this.#pendingBoundaryRetries.delete(owner);
                let published = false;
                this.#deferredFlush = false;
                this.#scopedFlushActive = true;
                try {
                    published = this.#renderAndCommit(this.#tree, true);
                }
                catch (error) {
                    if (!this.#disposed) {
                        for (const owner of unprocessed) {
                            const cache = this.#componentCache.get(owner);
                            if (cache?.nativeBoundary && cache.pendingResource) {
                                this.#pendingBoundaryRetries.add(owner);
                            }
                        }
                        if (!this.#terminalHostFailed)
                            this.#pendingResourceRetry = true;
                    }
                    throw error;
                }
                finally {
                    this.#scopedFlushActive = false;
                }
                if (!published && !this.#disposed) {
                    for (const owner of unprocessed) {
                        const cache = this.#componentCache.get(owner);
                        if (cache?.nativeBoundary && cache.pendingResource) {
                            this.#pendingBoundaryRetries.add(owner);
                        }
                    }
                }
                const deferred = this.#deferredFlush;
                this.#deferredFlush = false;
                if ((published && deferred) ||
                    (this.#pendingChanges.size === 0 &&
                        this.#pendingCollectionRegionKeys.size === 0 &&
                        [...this.#pendingBoundaryRetries].some((owner) => !capturedBoundaryOwners.has(owner))))
                    this.#schedule();
                return published;
            };
            const storeGeneration = this.#storeNotificationGeneration;
            const storeChangePending = storeGeneration !== this.#committedStoreNotificationGeneration;
            if (this.#pendingChanges.size === 0 && !storeChangePending &&
                this.#pendingCollectionRegionKeys.size === 0 && !retryWholeTree) {
                return false;
            }
            if (retryWholeTree && this.#pendingChanges.size === 0 && !storeChangePending &&
                this.#pendingCollectionRegionKeys.size === 0) {
                runGenericRetry();
                reportFlush();
                return true;
            }
            this.#activeCounters = this.#profileCounter ? new Map() : undefined;
            if (!retryWholeTree && !storeChangePending &&
                this.#pendingCollectionRegionKeys.size === 0 &&
                this.#pendingChanges.size > 0 &&
                this.#tryFlushNativeCellCut()) {
                reportFlush();
                return true;
            }
            const capturedChanges = this.#pendingChanges.capture();
            if (retryWholeTree) {
                runGenericRetry();
                reportFlush();
                return true;
            }
            const collectionOnly = capturedChanges.length === 0 &&
                !storeChangePending && this.#pendingCollectionRegionKeys.size > 0;
            let tryMixed = !collectionOnly &&
                this.#pendingCollectionRegionKeys.size > 0 &&
                (capturedChanges.length > 0 || storeChangePending);
            if (collectionOnly) {
                const delta = this.#flushCollectionDelta();
                if (delta === true) {
                    reportFlush();
                    return true;
                }
                tryMixed = delta === "closed-row";
            }
            if (tryMixed) {
                const mixed = this.#prepareMixedCollectionCandidate(capturedChanges, {
                    storeGeneration,
                    transitions: [],
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
            if (collectionOnly) {
                this.#profile?.("collection.delta.fallback-candidate", 0);
            }
            if (capturedChanges.length === 0 && !storeChangePending &&
                this.#pendingCollectionRegionKeys.size === 0)
                return false;
            const dirtyOwners = new Set(capturedChanges.map((change) => change.owner));
            if (this.#invalidation) {
                const graphMappedOwners = [];
                for (const change of capturedChanges) {
                    const sourceSlot = this.#invalidation.sourceSlots.get(change.site);
                    if (sourceSlot === undefined)
                        continue;
                    this.#invalidation.dispatcher.invalidateSourceSlot(sourceSlot);
                    graphMappedOwners.push(change.owner);
                }
                const affectedComponentSites = new Set();
                this.#invalidation.dispatcher.flush((region) => affectedComponentSites.add(this.#invalidation.componentSites[region]));
                for (const owner of graphMappedOwners) {
                    const cache = this.#componentCache.get(owner);
                    if (cache &&
                        !affectedComponentSites.has(getComponentSiteId(cache.type))) {
                        dirtyOwners.delete(owner);
                    }
                }
            }
            const directOnlyOwners = new Set();
            const ownerEligibility = new Map();
            for (const change of capturedChanges) {
                const cache = this.#componentCache.get(change.owner);
                const approvedSites = cache
                    ? this.#compiledPropSitesForCache(change.owner, cache)
                    : undefined;
                const source = this.world.scalarSourceForChange(change);
                const approved = !!cache &&
                    !!approvedSites?.has(change.site) && !!source &&
                    this.#lastSourceValues.has(source);
                ownerEligibility.set(change.owner, (ownerEligibility.get(change.owner) ?? true) && approved);
            }
            for (const [owner, eligible] of ownerEligibility) {
                if (eligible) {
                    directOnlyOwners.add(owner);
                    // A compiler-approved prop sink is itself a valid dependency even if
                    // an optional component invalidation graph omits its state site.
                    dirtyOwners.add(owner);
                }
            }
            const initialDirtyOwnerIds = [...dirtyOwners];
            this.#profile?.(`dispatch.diagnostic.dirty-owner-count.${initialDirtyOwnerIds.length}`, 0);
            this.#profile?.(`dispatch.diagnostic.change-count.${capturedChanges.length}`, 0);
            if (initialDirtyOwnerIds.length !== 1) {
                this.#profile?.("dispatch.structural-gate.owner-count-not-one", 0);
            }
            else if (capturedChanges.length !== 1) {
                this.#profile?.("dispatch.structural-gate.change-count-not-one", 0);
            }
            const numericOnly = capturedChanges.length > 0 &&
                directOnlyOwners.size === dirtyOwners.size;
            let succeeded = false;
            if (numericOnly && !storeChangePending &&
                this.#pendingCollectionRegionKeys.size === 0) {
                succeeded = this.#flushNumericSources(capturedChanges);
            }
            if (succeeded) {
                reportFlush();
                return true;
            }
            // Reader/collection cache scans stay off the numeric-only fast path.
            const storeReaderOwners = new Set();
            let hasSuspendedStoreReader = false;
            let missingStoreReaderOwner = false;
            for (const readerId of this.#liveStoreReaders.keys()) {
                this.#count("store.sparse.live-reader-selection-visits");
                if (readerId.startsWith("\u0000suspense-pending:")) {
                    hasSuspendedStoreReader = true;
                    continue;
                }
                const separator = readerId.indexOf("\u0000");
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
                if (!this.#componentCache.has(owner))
                    missingStoreReaderOwner = true;
            }
            const collectionParentOwners = new Set();
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
            for (const owner of storeReaderOwners)
                dirtyOwners.add(owner);
            this.#count("store.reader-owners-selected", storeReaderOwners.size);
            this.#count("collection.parent-owners-selected", collectionParentOwners.size);
            // Store selectors and footprints are transaction-scoped; re-execute live readers
            // so source switches detach atomically at publication.
            if (this.#everReadResource || this.#everHadNativeBoundary ||
                hasSuspendedStoreReader ||
                missingCollectionParent || missingStoreReaderOwner) {
                this.#renderAndCommit(this.#tree, true);
                reportFlush();
                return true;
            }
            const sparseChangesAreSafe = capturedChanges.every((change) => storeReaderOwners.has(change.owner) || directOnlyOwners.has(change.owner));
            const sparseReaderStateChange = capturedChanges.some((change) => storeReaderOwners.has(change.owner) && !directOnlyOwners.has(change.owner));
            if ((storeChangePending || sparseReaderStateChange) && sparseChangesAreSafe &&
                this.#pendingCollectionRegionKeys.size === 0) {
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
            const relevantOwners = new Set();
            const addRelevantLineage = (owners) => {
                for (const owner of owners) {
                    for (const ancestor of this.world.ownerLineage(owner)) {
                        relevantOwners.add(ancestor);
                    }
                }
            };
            addRelevantLineage(dirtyOwners);
            // The generic candidate carries latest numeric bindings; retain direct-only owners
            // and apply their host writes during VDOM commit.
            if (directOnlyOwners.size > 0) {
                for (const owner of directOnlyOwners) {
                    if (!storeReaderOwners.has(owner) &&
                        !collectionParentOwners.has(owner))
                        dirtyOwners.delete(owner);
                }
                relevantOwners.clear();
                addRelevantLineage(dirtyOwners);
            }
            const dirtyOwnerIds = [...dirtyOwners];
            const hasSelectiveOwnerCandidate = collectionParentOwners.size > 0 ||
                this.#liveStoreSubscriptions.size > 0 || storeChangePending;
            const partialCommit = !hasSelectiveOwnerCandidate &&
                dirtyOwnerIds.length === 1 && capturedChanges.length === 1
                ? this.#tryPartialOwnerCommit(dirtyOwnerIds[0])
                : !hasSelectiveOwnerCandidate && dirtyOwnerIds.length > 0 &&
                    directOnlyOwners.size === 0
                    ? this.#tryPartialOwnerCommits(dirtyOwnerIds)
                    : false;
            if (partialCommit) {
                this.#profile?.("dispatch.path.partial-owner", 0);
                this.#finishChanges(capturedChanges);
                reportFlush();
                return true;
            }
            const structuralCommit = !hasSelectiveOwnerCandidate &&
                dirtyOwnerIds.length === 1 && capturedChanges.length === 1 &&
                directOnlyOwners.size === 0
                ? this.#tryStructuralOwnerCommit(dirtyOwnerIds[0])
                : false;
            if (structuralCommit) {
                this.#profile?.("dispatch.path.structural-owner", 0);
                this.#finishChanges(capturedChanges);
                reportFlush();
                return true;
            }
            this.#profile?.("dispatch.path.full-reconcile", 0);
            try {
                this.#renderAndCommit(this.#tree, false, dirtyOwners, relevantOwners, 0, directOnlyOwners.size > 0
                    ? capturedChanges.filter((change) => directOnlyOwners.has(change.owner))
                    : []);
            }
            finally {
                this.#preparedRenders.clear();
            }
            reportFlush();
            return true;
        }
        finally {
            this.#leaveDirectHostDomain();
        }
    }
    /** Replace the declarative tree while preserving component owners by site/key. */
    update(tree) {
        this.#assertActive();
        this.#assertNoPublicationBarrier("update");
        const previous = this.#pendingDirectIntent;
        const intent = {
            tree,
            releaseStoreLease: previous?.releaseStoreLease ?? null,
            attemptedStoreGeneration: null,
        };
        if (previous) {
            previous.releaseStoreLease = null;
            previous.tree = null;
        }
        this.#pendingDirectIntent = intent;
        if (this.#activeRootClaim || !this.#enterDirectHostDomain()) {
            this.#deferredFlush = true;
            return;
        }
        try {
            this.#renderAndCommit(tree, true, new Set(), new Set(), 0, [], intent);
        }
        finally {
            this.#leaveDirectHostDomain();
        }
    }
    render(tree) {
        this.update(tree);
    }
    dispose() {
        this.#disposeWithClaim();
    }
    #disposeWithClaim(borrowedClaim) {
        if (this.#disposed)
            return;
        if (this.#publicationBarrier || this.#nativeCellCutActive ||
            this.#directPublicationPending ||
            this.#hostApplicationDepth > 0 ||
            (this.#activeRootClaim && this.#activeRootClaim !== borrowedClaim)) {
            this.#disposeRequested = true;
            this.#vdom.cancelPendingRefAttachments();
            if (this.#activeRootClaim)
                this.#waitForHostAvailability();
            return;
        }
        const teardownClaim = borrowedClaim ?? createHostPublicationClaim();
        if (tryClaimHostPublicationDomains([this.#hostPublicationDomain], teardownClaim, "teardown") === "busy") {
            this.#disposeRequested = true;
            this.#vdom.cancelPendingRefAttachments();
            this.#waitForHostAvailability();
            return;
        }
        try {
            this.#disposing = true;
            const disposeErrors = [];
            for (const candidate of [...this.#preparedCandidates.keys()]) {
                try {
                    candidate.failGroup(new Error("Component root disposed during candidate preparation"));
                }
                catch (error) {
                    disposeErrors.push(error);
                }
            }
            this.#disposed = true;
            this.#disposing = false;
            this.#deferredFlush = false;
            this.#hostAvailabilityWait?.unsubscribe();
            this.#hostAvailabilityWait = null;
            disposeErrors.push(...collectCleanupErrors([...this.#retireListeners]));
            this.#retireListeners.clear();
            disposeErrors.push(...collectCleanupErrors([...this.#publicationIntents.keys()]));
            try {
                this.#dropPendingDirectIntent();
            }
            catch (error) {
                disposeErrors.push(error);
            }
            for (const listener of this.#disposeListeners) {
                try {
                    listener();
                }
                catch (error) {
                    disposeErrors.push(error);
                }
            }
            this.#disposeListeners.clear();
            this.#unsubscribe();
            this.#unsubscribeRevision();
            this.#scheduled = false;
            this.#pendingChanges.clear();
            this.#lastSourceValues.clear();
            this.#nativeLanePrograms = new WeakMap();
            this.#nativeRowPrograms = new WeakMap();
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
            }
            catch (error) {
                disposeErrors.push(error);
                try {
                    quarantineHostPublicationDomains([this.#hostPublicationDomain], teardownClaim, error);
                }
                catch (quarantineError) {
                    disposeErrors.push(quarantineError);
                }
            }
            const subscribedStores = [...this.#liveStoreSubscriptions.keys()];
            for (const unsubscribe of this.#liveStoreSubscriptions.values()) {
                unsubscribe();
            }
            this.#liveStoreSubscriptions.clear();
            for (const stores of this.#storeDependencyLeases.values())
                stores.clear();
            this.#storeDependencyLeases.clear();
            for (const subscription of this.#liveResourceSubscriptions.values()) {
                subscription.unsubscribe();
            }
            this.#liveResourceSubscriptions.clear();
            this.#pendingBoundaryRetries.clear();
            this.#boundaryPrimaries.clear();
            for (const [readerId, stores] of this.#liveStoreReaders) {
                for (const store of stores)
                    store.forgetReader(this.#rootId, readerId);
            }
            this.#liveStoreReaders.clear();
            for (const store of subscribedStores) {
                store.detachRoot(this.#rootId);
            }
            const effectErrors = [
                ...disposeErrors,
                ...this.#cleanupEffects(this.#liveEffects.values()),
            ];
            this.#liveEffects.clear();
            this.#liveEffectKeysByOwner.clear();
            for (const owner of this.#liveOwners)
                this.world.destroyOwner(owner);
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
            if (effectErrors.length) {
                throw new AggregateError(effectErrors, "Component effect cleanup failed during dispose");
            }
        }
        finally {
            if (!borrowedClaim) {
                releaseHostPublicationDomains([this.#hostPublicationDomain], teardownClaim);
            }
        }
    }
    #drainBoundaryRetries(targets, acceptedTree) {
        let published = false;
        let fallback = false;
        let aborted = false;
        let next = 0;
        this.#scopedFlushActive = true;
        try {
            while (next < targets.length) {
                if (this.#disposed || this.#disposeRequested ||
                    this.#codeInvalidated || this.#terminalHostFailed ||
                    this.#tree !== acceptedTree) {
                    aborted = true;
                    break;
                }
                if (this.#unheldCellChanges() ||
                    this.#unheldCollectionChanges()) {
                    fallback = true;
                    break;
                }
                const heldResource = this.#componentCache.get(targets[next])?.pendingResource;
                const heldCache = this.#componentCache.get(targets[next]);
                const heldChild = heldCache && Object.getOwnPropertyDescriptor(heldCache.props, "children")?.value;
                const heldStores = new Set();
                const heldDependencies = this.#boundaryResourceDependencies(heldChild, heldStores);
                if ((heldResource && this.#resourceHoldWait(new Set([heldResource]))) ||
                    (heldDependencies && this.#resourceHoldWait(heldDependencies, undefined, { stores: [...heldStores] }))) {
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
                }
                catch (error) {
                    const cleanup = collectCleanupErrors([() => reveal.discard()]);
                    return throwWithCleanup(error, cleanup);
                }
            }
        }
        catch (error) {
            if (!this.#disposed && !this.#terminalHostFailed) {
                this.#pendingResourceRetry = true;
            }
            throw error;
        }
        finally {
            for (; next < targets.length; next++) {
                const owner = targets[next];
                const cache = this.#componentCache.get(owner);
                if (cache?.nativeBoundary && cache.pendingResource) {
                    this.#pendingBoundaryRetries.add(owner);
                }
            }
            this.#scopedFlushActive = false;
        }
        if (this.#disposed || this.#disposeRequested || this.#codeInvalidated ||
            this.#terminalHostFailed || this.#tree !== acceptedTree)
            aborted = true;
        return { published, fallback, aborted };
    }
    #tryFlushUrgentRetainedCut() {
        const count = this.#pendingChanges.size;
        if (count === 0 || this.#unheldCollectionChanges())
            return false;
        const handles = Array(count);
        const versions = Array(count);
        if (this.#pendingChanges.captureNative(handles, versions) !== count)
            return false;
        const complete = [];
        for (let index = 0; index < count; index++) {
            const handle = handles[index];
            if (!handle || this.world.versionForCell(handle) !== versions[index]) {
                return false;
            }
            const source = this.world.scalarSourceForCell(handle);
            if (!source || !this.#lastSourceValues.has(source))
                return false;
            if (!this.#heldCell(handle))
                complete.push(handle);
        }
        if (!complete.length)
            return false;
        const candidate = this.prepareRetained(complete);
        if (!candidate)
            return false;
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
        }
        catch (error) {
            const cleanup = collectCleanupErrors([() => candidate.discard()]);
            return throwWithCleanup(error, cleanup);
        }
        finally {
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
            const complete = selected.length
                ? this.#prepareClosedStoreCandidate(selected, false) : null;
            if (complete) {
                try {
                    if (complete.validate()) {
                        complete.commitHost();
                        complete.publish();
                        if (this.#liveStoreSubscriptions.size === selected.length &&
                            selected.every((store) => this.#liveStoreSubscriptions.has(store))) {
                            this.#committedStoreNotificationGeneration = capturedGeneration;
                        }
                        complete.runEffects();
                        return true;
                    }
                    complete.discard();
                }
                catch (error) {
                    return throwWithCleanup(error, collectCleanupErrors([() => complete.discard()]));
                }
            }
            for (const store of [...this.#liveStoreSubscriptions.keys()]) {
                if (this.#heldStore(store))
                    continue;
                if (this.#disposed || this.#disposeRequested || this.#terminalHostFailed ||
                    this.#codeInvalidated || this.#tree !== acceptedTree)
                    break;
                const candidate = this.#prepareClosedStoreCandidate([store], true);
                if (!candidate)
                    continue;
                try {
                    if (!candidate.validate()) {
                        candidate.discard();
                        continue;
                    }
                    candidate.commitHost();
                    candidate.publish();
                    published = true;
                    candidate.runEffects();
                }
                catch (error) {
                    return throwWithCleanup(error, collectCleanupErrors([() => candidate.discard()]));
                }
            }
        }
        finally {
            this.#scopedFlushActive = false;
        }
        return published;
    }
    #prepareBoundaryReveal(boundaryOwner, resourceLease) {
        return this.#prepareResourceReveals([boundaryOwner], resourceLease);
    }
    #prepareResourceReveals(boundaryOwners, resourceLease, cells = [], selectedStores = [], acceptedCollections = [], acceptedResources = new Set(), acceptedCollectionFootprint = []) {
        this.#assertActive();
        this.#assertNoPublicationBarrier("prepare resource reveals");
        this.#assertPreparationHostAvailable();
        if (!boundaryOwners.length || new Set(boundaryOwners).size !== boundaryOwners.length ||
            this.#terminalHostFailed || this.#codeInvalidated)
            return null;
        const baseVersion = this.#publicationVersion;
        const baseVDOMVersion = this.#vdom.version;
        const preparation = this.world.beginPreparation();
        const stores = new StoreRenderTransaction(this.#rootId);
        let reads = new ResourceReadSet(this.#resourceTable);
        let program = null;
        let closed = null;
        const stages = [];
        let writes = [];
        let sources = new Set();
        try {
            const captured = this.#captureRetainedCells(cells);
            if (!captured)
                throw new SparseCandidateIneligible();
            writes = captured.writes;
            sources = captured.sources;
            for (const owner of boundaryOwners) {
                const stage = this.#stageBoundaryReveal(owner, preparation, stores, reads, resourceLease);
                if (!stage)
                    throw new SparseCandidateIneligible();
                stages.push(stage);
            }
            if (selectedStores.length) {
                const newlyStaged = new Set(stages.flatMap((stage) => [...stage.storeInputs]));
                const pendingReaderIds = new Set(stages.flatMap((stage) => [...stage.pendingReaderIds]));
                closed = this.#stageClosedStoreOutputs(selectedStores, stores, false, newlyStaged, pendingReaderIds, resourceLease);
            }
            program = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas([], writes.map(({ source, value }) => [source, value]), closed?.regions ?? [], stages.map(({ region }) => region));
            if (!program || program.readSources.some((source) => !sources.has(source))) {
                throw new SparseCandidateIneligible();
            }
            if (!preparation.validate() || !stores.validate() || !reads.validate() ||
                !stages.every((stage) => stage.current())) {
                throw new SparseCandidateIneligible();
            }
        }
        catch (error) {
            const cleanup = collectCleanupErrors([
                () => program?.discard(), () => preparation.discard(),
                () => stores.discard(), () => reads?.discard(),
                () => closed?.release(),
                ...stages.map((stage) => () => stage.release()),
            ]);
            if (error instanceof HeldPublicationWait && !cleanup.length) {
                return this.#prepareBlockedPublication([error.resource]);
            }
            if (error instanceof SparseCandidateIneligible && !cleanup.length)
                return null;
            return throwWithCleanup(error, cleanup);
        }
        const handles = writes.map(({ handle }) => handle);
        const versions = writes.map(({ version }) => version);
        const acceptedCollectionVersions = acceptedCollectionFootprint.map((collection) => [collection, canonicalCollectionVersion(collection)]);
        const acceptedResourceVersions = [...acceptedResources].map((resource) => [resource, canonicalResourceVersion(resource)]);
        const stageCurrent = () => stages.every((stage) => stage.current()) &&
            acceptedCollections.every((validate) => validate()) &&
            (closed?.current() ?? true) && writes.every(({ handle }) => {
            const cache = this.#componentCache.get(handle.owner);
            return cache !== undefined && componentCodeCurrent(cache.type);
        });
        return this.#createCandidateLifecycle({
            baseVersion, baseVDOMVersion,
            scope: { kind: "keyed", versionDelta: 1 },
            stores, transitions: [], pendingResources: [], blocked: false,
            permitPendingDirectIntent: () => resourceLease !== undefined &&
                this.#publicationIntents.has(resourceLease),
            admissionCurrent: () => (!resourceLease ||
                this.#publicationIntents.has(resourceLease)) &&
                !this.#resourceHoldWait(new Set([
                    ...acceptedResources,
                    ...stages.flatMap((stage) => [...stage.dependencies]),
                ]), resourceLease, {
                    cells: handles, stores: [...selectedStores,
                        ...stages.flatMap((stage) => [...stage.storeInputs]),
                        ...(closed?.inputStores ?? [])],
                    collections: acceptedCollectionFootprint,
                }) && !this.#resourceHoldWait(new Set(closed?.inputResources ?? []), resourceLease) &&
                (!resourceLease || this.#publicationIntents.has(resourceLease)),
            codeCurrent: stageCurrent,
            validatePrepared: () => preparation.validate() &&
                !preparation.hasStateWrites() && stores.validate() &&
                (reads?.validate() ?? false) && (program?.validate() ?? false) &&
                this.#validateRetainedCells(writes, false) && stageCurrent(),
            validatePreparedPrivate: () => (!resourceLease ||
                this.#publicationIntents.has(resourceLease)) && preparation.validate() &&
                !this.#resourceHoldWait(new Set([
                    ...acceptedResourceVersions.map(([resource]) => resource),
                    ...stages.flatMap((stage) => [...stage.dependencies]),
                    ...(closed?.inputResources ?? []),
                ]), resourceLease, {
                    cells: handles, stores: [...selectedStores,
                        ...stages.flatMap((stage) => [...stage.storeInputs]),
                        ...(closed?.inputStores ?? [])],
                    collections: acceptedCollectionVersions.map(([collection]) => collection),
                }) &&
                !preparation.hasStateWrites() && stores.validatePreparedCanonical() &&
                (reads ? canonicalResourceCutCurrent(reads) : false) &&
                (program?.validatePreparedPrivate() ?? false) &&
                this.#validateRetainedCellsPrivate(writes) &&
                stages.every((stage) => stage.privateCurrent()) &&
                (closed?.privatePreparedCurrent() ?? true) &&
                acceptedCollectionVersions.every(([collection, version]) => canonicalCollectionCutCurrent(collection, version)) && acceptedResourceVersions.every(([resource, version]) => canonicalResourceVersionCurrent(resource, version)) && writes.every(({ handle }) => {
                const cache = this.#componentCache.get(handle.owner);
                return cache !== undefined && componentCodeCurrentPrivate(cache.type);
            }),
            validatePostHost: () => preparation.validatePublicationInputs() &&
                !preparation.hasStateWrites() && stores.validatePublicationInputs() &&
                (reads?.validate() ?? false) && (program?.validatePostHost() ?? false) &&
                this.#validateRetainedCells(writes, true) && stageCurrent(),
            finalGroupCurrent: () => preparation.validatePublicationInputs() &&
                !preparation.hasStateWrites() &&
                stores.validatePublicationInputsCanonical() &&
                (reads?.validateCanonical() ?? false) &&
                (program?.validatePostHostPrivate() ?? false) &&
                this.#validateRetainedCells(writes, true) &&
                stages.every((stage) => stage.privateCurrent()) &&
                writes.every(({ handle }) => {
                    const cache = this.#componentCache.get(handle.owner);
                    return cache !== undefined && componentCodeCurrentPrivate(cache.type);
                }),
            commitHost: () => { preparation.beginHostApplication(); program.commit(); },
            commitHostAdmitted: () => {
                preparation.beginHostApplication();
                program.commitAdmitted();
            },
            preparePublication: () => {
                preparation.preparePublicationAfterHost();
                stores.preparePublicationAfterHost();
            },
            publish: () => {
                preparation.publishAccepted();
                stores.publishAccepted();
                for (const stage of stages)
                    stage.publish();
                closed?.publish();
                for (const write of writes)
                    this.#lastSourceValues.set(write.source, write.value);
                this.world.clearCellChangesThrough(handles, versions, handles.length);
                this.#pendingChanges.clearNativeThrough(handles, versions, handles.length);
                reads?.discard();
                reads = null;
                this.#publicationVersion++;
            },
            installSubscriptions: () => {
                for (const stage of stages)
                    stage.installSubscriptions();
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
                }
                catch (error) {
                    errors.push(error);
                }
                try {
                    stores.notifyPublished();
                }
                catch (error) {
                    errors.push(error);
                }
                try {
                    this.#vdom.flushRefs();
                }
                catch (error) {
                    errors.push(error);
                }
                for (const stage of stages)
                    errors.push(...stage.runEffects());
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
                for (const stage of stages)
                    stage.release();
                stages.length = 0;
                writes.length = 0;
                sources.clear();
                handles.length = 0;
                versions.length = 0;
                reads?.discard();
                reads = null;
            },
            effectFailureMessage: "Resource reveal effects failed",
        });
    }
    #stageBoundaryReveal(boundaryOwner, preparation, stores, reads, resourceLease) {
        const boundaryCache = this.#componentCache.get(boundaryOwner);
        if (!boundaryCache?.nativeBoundary || !boundaryCache.pendingResource ||
            !this.#liveOwners.has(boundaryOwner) || !this.world.isAlive(boundaryOwner) ||
            this.#boundaryPrimaries.has(String(boundaryOwner)))
            return null;
        const ancestorControlsCurrent = this.#captureBoundaryAncestorControlsCurrent(boundaryOwner);
        if (!ancestorControlsCurrent)
            return null;
        const resource = boundaryCache.pendingResource;
        if (this.#resourceHoldWait(new Set([resource]), resourceLease))
            return null;
        if (closedResourceStatus(resource)?.status !== "fulfilled")
            return null;
        const child = Object.getOwnPropertyDescriptor(boundaryCache.props, "children")?.value;
        if (!isRuntimeOwnedElement(child))
            return null;
        const dependencyStores = new Set();
        const dependencies = this.#boundaryResourceDependencies(child, dependencyStores);
        if (!dependencies || this.#resourceHoldWait(dependencies, resourceLease, { stores: [...dependencyStores] }))
            return null;
        const steps = [];
        const visited = new Set();
        let projected = child;
        for (;;) {
            const type = Object.getOwnPropertyDescriptor(projected, "type")?.value;
            const props = Object.getOwnPropertyDescriptor(projected, "props")?.value;
            if (typeof type !== "function" || !definedComponents.has(type) ||
                visited.has(type) ||
                !props || typeof props !== "object" || !Object.isFrozen(props))
                return null;
            visited.add(type);
            const siteId = definedComponents.get(type)?.siteId;
            const revision = componentRevision(type);
            if (!siteId || !revision || !isCompiledSemanticRevisionCurrent(revision))
                return null;
            if (steps.length && (revision.sourceFile !== steps[0].revision.sourceFile ||
                revision.moduleRevision !== steps[0].revision.moduleRevision))
                return null;
            const descriptors = Object.getOwnPropertyDescriptors(props);
            if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string") ||
                Object.values(descriptors).some((descriptor) => !("value" in descriptor)) ||
                descriptors.ref?.value != null)
                return null;
            const authoredKey = descriptors.key?.value;
            if (authoredKey != null && typeof authoredKey !== "string")
                return null;
            const ownerKey = authoredKey ?? `@slot:${siteId}:0`;
            const hostKeyScope = steps.length
                ? ownerKey : `${boundaryOwner}\u0000${ownerKey}`;
            const forward = closedComponentForwardProgramFor(type);
            steps.push({ node: projected,
                type: type, props, descriptors,
                siteId, ownerKey, hostKeyScope, revision,
                ...(forward ? { forward } : {}) });
            if (!forward)
                break;
            if (steps.length > 8 ||
                forward.childComponent === type ||
                definedComponents.get(forward.childComponent)?.siteId !==
                    forward.childComponentProgramId ||
                !componentCodeCurrent(forward.childComponent))
                return null;
            const nextRevision = componentRevision(forward.childComponent);
            if (!nextRevision || nextRevision.sourceFile !== revision.sourceFile ||
                nextRevision.moduleRevision !== revision.moduleRevision)
                return null;
            const nextProps = {};
            for (const [name, expression] of forward.props) {
                if (expression.kind === "prop") {
                    const source = descriptors[expression.name];
                    if (!source || !("value" in source))
                        return null;
                    nextProps[name] = source.value;
                }
                else
                    nextProps[name] = expression.value;
            }
            nextProps.key = forward.key ?? `${hostKeyScope}:0`;
            projected = Object.freeze({
                type: forward.childComponent,
                props: Object.freeze(nextProps),
            });
        }
        const leaf = steps.at(-1);
        const childType = leaf.type;
        const childProps = leaf.props;
        const descriptors = leaf.descriptors;
        const legacyResourceProgram = closedResourceHostProgramFor(childType);
        const legacySource = legacyResourceProgram
            ? descriptors[legacyResourceProgram.resourceProp]?.value
            : undefined;
        const resourceProgram = legacySource === resource ? legacyResourceProgram : undefined;
        const storeProgram = closedStoreHostProgramFor(childType);
        if (!resourceProgram && !storeProgram)
            return null;
        const hostKey = (resourceProgram ?? storeProgram).host.key;
        const source = resourceProgram ? descriptors[resourceProgram.resourceProp]?.value : undefined;
        if (resourceProgram && source !== resource)
            return null;
        const first = steps[0];
        if (this.world.findOwner(boundaryOwner, first.siteId, first.ownerKey) !== undefined) {
            return null;
        }
        const oldOutput = boundaryCache.expandedResult;
        if (!isRuntimeOwnedElement(oldOutput) ||
            typeof Object.getOwnPropertyDescriptor(oldOutput, "type")?.value !== "string") {
            return null;
        }
        const oldOutputProps = Object.getOwnPropertyDescriptor(oldOutput, "props")?.value;
        if (!oldOutputProps || typeof oldOutputProps !== "object" ||
            Object.getOwnPropertyDescriptor(oldOutputProps, "key")?.value !== hostKey)
            return null;
        if (!boundaryCache.subtreeOwners.has(boundaryOwner) ||
            boundaryCache.ownEffects.size !== 0 ||
            boundaryCache.propBoundSites.size !== 0)
            return null;
        const fallbackCaches = new Map();
        for (const owner of boundaryCache.subtreeOwners) {
            if (owner === boundaryOwner)
                continue;
            const cache = this.#componentCache.get(owner);
            if (!cache || !this.#liveOwners.has(owner) || !this.world.isAlive(owner) ||
                !this.world.isWithin(owner, boundaryOwner) || cache.nativeBoundary ||
                cache.keyedRegion || cache.pendingResource || cache.propBoundSites.size ||
                this.#ownerHasStoreReaders(owner))
                return null;
            const revision = componentRevision(cache.type);
            if (revision && !isCompiledSemanticRevisionCurrent(revision))
                return null;
            fallbackCaches.set(owner, { cache, revision });
        }
        const oldTag = Object.getOwnPropertyDescriptor(oldOutput, "type")?.value;
        const retired = [...fallbackCaches.keys()].sort((left, right) => this.world.ownerLineage(right).length - this.world.ownerLineage(left).length);
        const retiredEffects = [...this.#liveEffects].filter(([, effect]) => fallbackCaches.has(effect.owner));
        const pendingPrefix = `\u0000suspense-pending:${boundaryOwner}:`;
        const pendingReaders = new Map();
        for (const [readerId, membership] of this.#liveStoreReaders) {
            if (readerId.startsWith(pendingPrefix))
                pendingReaders.set(readerId, membership);
        }
        if (pendingReaders.size && resourceProgram)
            return null;
        if (pendingReaders.size && !storeProgram)
            return null;
        const acceptedReaders = new Map();
        const storeInputs = new Set();
        try {
            const preparedOwners = [];
            let parentOwner = boundaryOwner;
            for (const step of steps) {
                if (preparation.findOwner(parentOwner, step.siteId, step.ownerKey) !== undefined) {
                    throw new SparseCandidateIneligible();
                }
                const owner = preparation.resolveOwner(parentOwner, step.siteId, step.ownerKey);
                preparedOwners.push(owner);
                parentOwner = owner;
            }
            const childOwner = preparedOwners.at(-1);
            let generated = null;
            if (!resourceProgram && storeProgram) {
                const values = [];
                const consumedPending = new Set();
                for (const input of closedStoreHostInputs(storeProgram)) {
                    const value = descriptors[input.storeProp]?.value;
                    const paths = closedStoreHostInputPaths(input);
                    const readerId = `${childOwner}\u0000${input.storeUseSiteId}`;
                    if (value instanceof AsyncStore) {
                        storeInputs.add(value);
                        const captured = stores.readClosedProjections(value, readerId, paths);
                        if (!captured)
                            throw new SparseCandidateIneligible();
                        values.push(...captured);
                        acceptedReaders.set(readerId, new Set([value]));
                        for (const [pendingId, membership] of pendingReaders) {
                            const oldId = pendingId.slice(pendingPrefix.length);
                            if (!oldId.endsWith(`\u0000${input.storeUseSiteId}`))
                                continue;
                            if (membership.size !== 1 || !membership.has(value) ||
                                consumedPending.has(pendingId)) {
                                throw new SparseCandidateIneligible();
                            }
                            consumedPending.add(pendingId);
                        }
                    }
                    else if (value instanceof AsyncResource) {
                        if (pendingReaders.size && [...pendingReaders.keys()].some((id) => id.endsWith(`\u0000${input.storeUseSiteId}`))) {
                            throw new SparseCandidateIneligible();
                        }
                        const status = reads.readClosed(value);
                        const captured = status ? captureClosedProjectionValues(status.value, paths) : null;
                        if (!captured)
                            throw new SparseCandidateIneligible();
                        values.push(...captured);
                    }
                    else
                        throw new SparseCandidateIneligible();
                }
                if (consumedPending.size !== pendingReaders.size ||
                    !stores.retireClosedReaders(pendingReaders))
                    throw new SparseCandidateIneligible();
                generated = evaluateClosedStoreHostTree(storeProgram, values);
            }
            else if (resourceProgram) {
                const status = reads.readClosed(resource);
                generated = status && evaluateClosedResourceHostProgram(resourceProgram, status.value);
            }
            if (!generated)
                throw new SparseCandidateIneligible();
            generated = copyRuntimeElement(generated.type, generated.props, childOwner);
            const preparedCaches = new Map();
            for (let index = 0; index < steps.length; index++) {
                const step = steps[index];
                const componentProps = {};
                for (const [name, descriptor] of Object.entries(step.descriptors)) {
                    if (name !== "key" && name !== "ref")
                        componentProps[name] = descriptor.value;
                }
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
                    ownEffects: new Map(),
                    propBoundSites: new Set(),
                });
            }
            const forwardingCodeCurrent = () => steps.every((step, index) => isCompiledSemanticRevisionCurrent(step.revision) &&
                (step.forward === undefined ||
                    (closedComponentForwardProgramFor(step.type) === step.forward &&
                        definedComponents.get(step.forward.childComponent)?.siteId ===
                            step.forward.childComponentProgramId &&
                        step.forward.childComponent === steps[index + 1]?.type)));
            const forwardingCurrent = () => steps.every((step) => {
                if (Object.getOwnPropertyDescriptor(step.node, "type")?.value !== step.type ||
                    Object.getOwnPropertyDescriptor(step.node, "props")?.value !== step.props)
                    return false;
                const now = Object.getOwnPropertyDescriptors(step.props);
                const names = Reflect.ownKeys(now);
                return names.length === Reflect.ownKeys(step.descriptors).length &&
                    names.every((name) => {
                        const original = step.descriptors[name];
                        const actual = now[name];
                        return original && actual && "value" in original && "value" in actual &&
                            Object.is(actual.value, original.value);
                    });
            });
            const privateCurrent = () => ancestorControlsCurrent() && forwardingCodeCurrent() &&
                closedResourceStatus(resource)?.status === "fulfilled" &&
                !this.#codeInvalidated &&
                this.#componentCache.get(boundaryOwner) === boundaryCache &&
                this.#liveOwners.has(boundaryOwner) && canonicalWorldIsAlive.call(this.world, boundaryOwner) &&
                [...fallbackCaches].every(([owner, { cache, revision }]) => this.#componentCache.get(owner) === cache &&
                    this.#liveOwners.has(owner) && canonicalWorldIsAlive.call(this.world, owner) &&
                    !this.#ownerHasStoreReaders(owner) &&
                    (!revision || isCompiledSemanticRevisionCurrent(revision))) && retiredEffects.every(([key, effect]) => this.#liveEffects.get(key) === effect) &&
                !this.#boundaryPrimaries.has(String(boundaryOwner)) &&
                boundaryCache.pendingResource === resource &&
                canonicalWorldFindOwner.call(this.world, boundaryOwner, first.siteId, first.ownerKey) === undefined &&
                [...pendingReaders].every(([id, membership]) => this.#liveStoreReaders.get(id) === membership) &&
                preparation.validatePublicationInputs();
            const current = () => Object.getOwnPropertyDescriptor(child, "type")?.value === steps[0].type &&
                Object.getOwnPropertyDescriptor(child, "props")?.value === steps[0].props &&
                forwardingCurrent() &&
                Object.getOwnPropertyDescriptor(oldOutput, "type")?.value === oldTag &&
                Object.getOwnPropertyDescriptor(oldOutput, "props")?.value === oldOutputProps &&
                privateCurrent();
            const sourceCurrent = () => (resourceProgram ? Object.getOwnPropertyDescriptor(childProps, resourceProgram.resourceProp)?.value === source : true) &&
                (!resourceProgram && storeProgram ? closedStoreHostInputs(storeProgram).every((input) => Object.getOwnPropertyDescriptor(childProps, input.storeProp)?.value ===
                    descriptors[input.storeProp]?.value) : true);
            return {
                region: { key: hostKey, tree: generated },
                resource,
                dependencies: new Set([resource, ...dependencies]),
                storeInputs,
                pendingReaderIds: new Set(pendingReaders.keys()),
                stores,
                current: () => sourceCurrent() && current(),
                privateCurrent: () => sourceCurrent() && current(),
                privatePreparedCurrent: () => sourceCurrent() && current(),
                publish: () => {
                    for (const owner of retired)
                        this.#retireOwnerAccepted(owner);
                    for (const [key] of retiredEffects)
                        this.#liveEffects.delete(key);
                    for (const owner of retired)
                        this.#liveEffectKeysByOwner.delete(owner);
                    for (const [owner, cache] of preparedCaches)
                        this.#componentCache.set(owner, cache);
                    this.#componentCache.set(boundaryOwner, {
                        ...boundaryCache,
                        expandedResult: generated,
                        subtreeOwners: new Set([boundaryOwner, ...preparedOwners]),
                        pendingResource: undefined,
                    });
                    for (const owner of preparedOwners)
                        this.#liveOwners.add(owner);
                    for (const readerId of pendingReaders.keys())
                        this.#liveStoreReaders.delete(readerId);
                    for (const [readerId, membership] of acceptedReaders) {
                        this.#liveStoreReaders.set(readerId, membership);
                    }
                    this.#boundaryPrimaries.set(String(boundaryOwner), { tree: child });
                    this.#refreshDirectKeyedRegionOutput(boundaryOwner);
                    for (const ancestor of this.world.ownerLineage(boundaryOwner).slice(1)) {
                        const cache = this.#componentCache.get(ancestor);
                        if (!cache)
                            continue;
                        const subtreeOwners = cache.subtreeOwners;
                        for (const owner of preparedOwners)
                            subtreeOwners.add(owner);
                        this.#componentCache.set(ancestor, {
                            ...cache,
                            result: null,
                            expandedResult: null,
                            subtreeOwners,
                            invalidatedByCollection: true,
                        });
                    }
                },
                installSubscriptions: () => {
                    if (acceptedReaders.size)
                        this.#reconcileStoreSubscriptions();
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
                },
            };
        }
        catch (error) {
            if (error instanceof SparseCandidateIneligible)
                return null;
            throw error;
        }
    }
    #renderAndCommit(tree, forceRender, dirtyOwners = new Set(), relevantOwners = new Set(), collectionRetry = 0, numericChanges = [], directIntent = null) {
        let candidate = null;
        const heldGenericState = this.#publicationIntents.size > 0
            ? this.#captureHeldGenericState()
            : undefined;
        if (this.#publicationIntents.size > 0 && !heldGenericState)
            return false;
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
            }
            catch (error) {
                return throwWithCleanup(error, collectCleanupErrors([nextLease]));
            }
        };
        try {
            candidate = this.#prepareCandidate(tree, {}, forceRender, dirtyOwners, relevantOwners, numericChanges, heldGenericState ?? undefined);
            if (directIntent && this.#pendingDirectIntent !== directIntent) {
                candidate.discard();
                return false;
            }
            if (candidate.blocked) {
                if (directIntent)
                    holdDirectFrontier(candidate, directIntent);
                else
                    this.#syncResourceSubscriptions([...candidate.pendingResources]);
                candidate.discard();
                return false;
            }
            if (!candidate.validate()) {
                if (directIntent && this.#pendingDirectIntent !== directIntent) {
                    candidate.discard();
                    return false;
                }
                if (directIntent && this.#renderPreparation !== "repeatable" &&
                    candidate.pendingResources.length > 0) {
                    holdDirectFrontier(candidate, directIntent);
                }
                if (collectionRetry >= 2 && directIntent &&
                    this.#renderPreparation === "repeatable") {
                    if (candidate.pendingResources.length === 0) {
                        throw new Error("Direct update stayed stale without a dependency wake");
                    }
                    holdDirectFrontier(candidate, directIntent);
                    if (this.#pendingDirectIntent === directIntent &&
                        this.#liveResourceSubscriptions.size === 0) {
                        throw new Error("Direct update stayed stale without a dependency wake");
                    }
                }
                candidate.discard();
                if (this.#renderPreparation === "repeatable" && collectionRetry < 2) {
                    return this.#renderAndCommit(tree, forceRender, dirtyOwners, relevantOwners, collectionRetry + 1, numericChanges, directIntent);
                }
                if (!directIntent && this.#renderPreparation === "repeatable") {
                    this.#schedule();
                }
                return false;
            }
            candidate.commitHost();
            candidate.publish();
            candidate.runEffects();
            return true;
        }
        catch (error) {
            if (error instanceof StaleCollectionCandidate &&
                this.#renderPreparation === "repeatable" && collectionRetry < 2) {
                return this.#renderAndCommit(tree, forceRender, dirtyOwners, relevantOwners, collectionRetry + 1, numericChanges, directIntent);
            }
            if (candidate) {
                const failedCandidate = candidate;
                const cleanup = collectCleanupErrors([
                    () => failedCandidate.discard(),
                    () => {
                        if (directIntent && this.#pendingDirectIntent === directIntent) {
                            this.#dropPendingDirectIntent();
                        }
                    },
                ]);
                return throwWithCleanup(error, cleanup);
            }
            if (directIntent && this.#pendingDirectIntent === directIntent) {
                return throwWithCleanup(error, collectCleanupErrors([
                    () => this.#dropPendingDirectIntent(),
                ]));
            }
            throw error;
        }
    }
    #preparePartialOwnerRender(owner) {
        return this.#prepareOwnerRender(owner);
    }
    #prepareOwnerRender(owner, options = {}) {
        const cached = this.#componentCache.get(owner);
        if (!cached)
            return null;
        const ownEffects = new Map();
        const propBoundSites = new Set();
        const ownsStoreTransaction = options.stores === undefined;
        const storeTransaction = options.stores ??
            new StoreRenderTransaction(this.#rootId);
        let result;
        const activeOwner = {
            world: options.preparation ?? this.world,
            owner,
            numericStateReadsPrimitive: true,
            collectionPropsOwned: cached.collectionPropsOwned,
            collectionProps: cached.props,
            collectionSites: closedCollectionSitesFor(cached.type),
            stateLayout: numericOwnerCacheAdmitted(cached)
                ? compiledStateLayoutFor(cached.type) : undefined,
            propBoundSites,
            readStore: (siteId, source) => storeTransaction.read(source, `${owner}\u0000${siteId}`),
            ...(options.resourceReads
                ? {
                    readResource: (source) => {
                        options.onResourceRead?.();
                        this.#everReadResource = true;
                        return options.resourceReads.read(source);
                    },
                }
                : {}),
            ...(options.captureBinding
                ? { captureBinding: options.captureBinding }
                : {}),
            registerEffect: (siteId, setup) => {
                if (!siteId || typeof setup !== "function") {
                    throw new Error("Invalid effect registration");
                }
                const key = effectKey(owner, siteId);
                if (ownEffects.has(key)) {
                    throw new Error(`Effect site ${siteId} was registered more than once for owner ${owner}`);
                }
                ownEffects.set(key, { owner, siteId, setup });
            },
        };
        activeOwners.push(activeOwner);
        const renderStarted = this.#profile ? performance.now() : 0;
        if (this.#activeCounters)
            this.#count("owner.component-renders");
        try {
            result = cached.type(cached.props);
        }
        catch (error) {
            if (ownsStoreTransaction) {
                storeTransaction.discard();
                this.#discardUncommittedStoreRoots(storeTransaction);
            }
            throw error;
        }
        finally {
            activeOwners.pop();
        }
        if (ownsStoreTransaction && storeTransaction.stores.size > 0) {
            storeTransaction.discard();
            this.#discardUncommittedStoreRoots(storeTransaction);
            return null;
        }
        if (ownsStoreTransaction)
            storeTransaction.discard();
        result = carryHostKeys(result, cached.hostKeyScope, "0", options.onOutputNode, cached.scopeExplicitHostKeys === true, owner);
        if (this.#profile) {
            this.#profile("owner.render-and-key", performance.now() - renderStarted);
        }
        return { owner, result, ownEffects, propBoundSites,
            numericStateAdmitted: activeOwner.numericStateReadsPrimitive };
    }
    #commitPartialOwnerRender(prepared, captured) {
        const cached = this.#componentCache.get(prepared.owner);
        this.#componentCache.set(prepared.owner, {
            ...cached,
            result: prepared.result,
            expandedResult: prepared.result,
            subtreeOwners: new Set([prepared.owner]),
            ownEffects: prepared.ownEffects,
            propBoundSites: prepared.propBoundSites,
            numericStateAdmitted: prepared.numericStateAdmitted,
        });
        this.#syncOwnerSourceValues(prepared.owner, cached, prepared.propBoundSites, captured);
        this.#refreshDirectKeyedRegionOutput(prepared.owner);
    }
    #tryPartialOwnerCommit(owner) {
        if (this.#renderPreparation !== "repeatable")
            return false;
        const cached = this.#componentCache.get(owner);
        if (!cached || cached.subtreeOwners.size !== 1)
            return false;
        const oldKey = singleHostRootKey(cached.expandedResult);
        if (oldKey === null)
            return false;
        const prepared = this.#preparePartialOwnerRender(owner);
        if (!prepared)
            return false;
        const nextKey = singleHostRootKey(prepared.result);
        if (!hasNestedComponent(prepared.result) && nextKey === oldKey) {
            const captured = this.#captureOwnerSourceValues(owner, prepared.propBoundSites);
            const committed = this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, prepared.result), true);
            if (committed) {
                try {
                    this.#commitPartialOwnerRender(prepared, captured);
                    this.#publishDirectHostMutation();
                }
                catch (error) {
                    if (this.#directPublicationPending) {
                        this.#failDirectHostMutation(error);
                    }
                    throw error;
                }
                const effectErrors = this.#reconcileOwnerEffects(prepared.owner, prepared.ownEffects);
                if (effectErrors.length) {
                    throw new AggregateError(effectErrors, "Component effect setup or cleanup failed after partial commit");
                }
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
        if (this.#renderPreparation !== "repeatable")
            return false;
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
        const nextRootKey = singleHostRootKey(prepared.result);
        if (nextRootKey !== oldKey) {
            this.#profile?.("dispatch.structural-bail.root-key-changed", 0);
            this.#preparedRenders.set(owner, prepared);
            return false;
        }
        if (this.#keyedOwnerReuse) {
            const expandStarted = this.#profile ? performance.now() : 0;
            const expandedResult = this.#expandStableKeyedOwnerResult(prepared.result, owner, cached);
            if (this.#profile) {
                this.#profile("owner.expand-and-cache", performance.now() - expandStarted);
            }
            if (expandedResult !== null) {
                const captured = this.#captureOwnerSourceValues(owner, prepared.propBoundSites);
                const committed = this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, expandedResult), true);
                if (committed) {
                    try {
                        this.#componentCache.set(owner, {
                            ...cached,
                            result: prepared.result,
                            expandedResult,
                            ownEffects: prepared.ownEffects,
                            propBoundSites: prepared.propBoundSites,
                            numericStateAdmitted: prepared.numericStateAdmitted,
                        });
                        this.#syncOwnerSourceValues(owner, cached, prepared.propBoundSites, captured);
                        this.#publishDirectHostMutation();
                    }
                    catch (error) {
                        if (this.#directPublicationPending) {
                            this.#failDirectHostMutation(error);
                        }
                        throw error;
                    }
                    const effectErrors = this.#reconcileOwnerEffects(owner, prepared.ownEffects);
                    if (effectErrors.length) {
                        throw new AggregateError(effectErrors, "Component effects failed after keyed-owner reuse commit");
                    }
                    this.#profile?.("dispatch.path.keyed-owner-reuse", 0);
                    return true;
                }
                this.#abandonDirectHostMutation();
            }
        }
        const affectedOwners = new Set(cached.subtreeOwners);
        const nextOwners = new Set([owner]);
        const nextComponentCache = new Map();
        const nextEffects = new Map();
        const createdOwners = [];
        const subtreeOwnersByOwner = new Map([[
                owner,
                new Set([
                    owner,
                ]),
            ]]);
        const expandStarted = this.#profile ? performance.now() : 0;
        this.#collectedKeyedRegions = new Map();
        this.#collectedCollectionRegions = new Map();
        let structuralStoreRead = false;
        const structuralStoreTransaction = new StoreRenderTransaction(this.#rootId);
        const expandedResult = (() => {
            try {
                for (const [key, effect] of prepared.ownEffects) {
                    nextEffects.set(key, effect);
                }
                const expanded = this.#expand(prepared.result, owner, nextOwners, nextEffects, nextComponentCache, createdOwners, `structural/${getComponentSiteId(cached.type)}`, false, new Set(), new Set(), [owner], subtreeOwnersByOwner, structuralStoreTransaction);
                if (structuralStoreTransaction.stores.size > 0) {
                    structuralStoreRead = true;
                    structuralStoreTransaction.discard();
                    this.#discardUncommittedStoreRoots(structuralStoreTransaction);
                    return null;
                }
                return expanded;
            }
            catch (error) {
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
        if (this.#profile) {
            this.#profile("owner.expand-and-cache", performance.now() - expandStarted);
        }
        if (structuralStoreRead) {
            for (let index = createdOwners.length - 1; index >= 0; index--) {
                const candidateOwner = createdOwners[index];
                this.world.destroyOwner(candidateOwner);
                this.#dropPendingForOwner(candidateOwner);
            }
            return false;
        }
        const ownSubtreeOwners = subtreeOwnersByOwner.get(owner) ??
            new Set([owner]);
        nextComponentCache.set(owner, {
            ...cached,
            result: prepared.result,
            expandedResult,
            subtreeOwners: ownSubtreeOwners,
            ownEffects: prepared.ownEffects,
            propBoundSites: prepared.propBoundSites,
            numericStateAdmitted: prepared.numericStateAdmitted,
            ...(structuralKeyedRegions?.get(owner)
                ? { keyedRegion: structuralKeyedRegions.get(owner) }
                : {}),
        });
        const capturedStructuralValues = new Map();
        for (const [nextOwner, component] of nextComponentCache) {
            capturedStructuralValues.set(nextOwner, this.#captureOwnerSourceValues(nextOwner, component.propBoundSites));
        }
        let structurallyCommitted;
        try {
            structurallyCommitted = this.#commitHostMutation(() => this.#vdom.commitKeyedRegion(oldKey, expandedResult), true);
        }
        catch (error) {
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
            // Full reconciliation remains the correctness fallback. Reuse any
            // component results already produced while preparing this subtree.
            for (const candidateOwner of ownSubtreeOwners) {
                const candidate = nextComponentCache.get(candidateOwner);
                if (candidate) {
                    this.#preparedRenders.set(candidateOwner, {
                        owner: candidateOwner,
                        result: candidate.result,
                        ownEffects: candidate.ownEffects,
                        propBoundSites: candidate.propBoundSites,
                        numericStateAdmitted: candidate.numericStateAdmitted === true,
                    });
                }
            }
            return false;
        }
        const retiredOwners = [];
        try {
            for (const previousOwner of affectedOwners) {
                if (nextOwners.has(previousOwner))
                    continue;
                if (this.#activeCounters)
                    this.#count("owner.retired");
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
        }
        catch (error) {
            if (this.#directPublicationPending)
                this.#failDirectHostMutation(error);
            throw error;
        }
        const effectErrors = [];
        for (const previousOwner of retiredOwners) {
            effectErrors.push(...this.#reconcileOwnerEffects(previousOwner, new Map()));
            this.world.destroyOwner(previousOwner);
            this.#dropPendingForOwner(previousOwner);
        }
        for (const [nextOwner, component] of nextComponentCache) {
            effectErrors.push(...this.#reconcileOwnerEffects(nextOwner, component.ownEffects));
        }
        try {
            this.#syncCollectionRegions(this.#componentCache, structuralCollectionRegions ?? new Map());
        }
        catch (error) {
            effectErrors.push(error);
        }
        if (effectErrors.length) {
            throw new AggregateError(effectErrors, "Component effect setup or cleanup failed after structural commit");
        }
        return true;
    }
    #expandStableKeyedOwnerResult(node, parentOwner, previousOwnerCache) {
        let regionCount = 0;
        let reusedRows = 0;
        const visit = (value) => {
            if (value == null || value === false || typeof value === "string" ||
                typeof value === "number")
                return value;
            if (Array.isArray(value)) {
                const regionId = getKeyedOwnerRegionId(value);
                if (regionId !== null) {
                    regionCount++;
                    if (this.#keyedOwnerReuseMode === "token") {
                        const version = getKeyedOwnerVersion(value);
                        const keyedRegion = previousOwnerCache.keyedRegion;
                        if (regionCount !== 1 || version === null || !keyedRegion ||
                            keyedRegion.regionId !== regionId ||
                            keyedRegion.version !== version ||
                            keyedRegion.outputsByKey.size !== value.length ||
                            previousOwnerCache.subtreeOwners.size !== value.length + 1) {
                            if (this.#activeCounters) {
                                this.#count("owner.keyed-region.token-mismatches");
                            }
                            return null;
                        }
                        const output = [];
                        for (const child of value) {
                            const key = String(child.props.key);
                            const cachedOutput = keyedRegion.outputsByKey.get(key);
                            if (cachedOutput === undefined)
                                return null;
                            output.push(cachedOutput);
                        }
                        if (this.#activeCounters) {
                            this.#count("owner.keyed-region.token-hits", value.length);
                            this.#count("owner.keyed-region.token-output-reuses", output.length);
                        }
                        reusedRows += output.length;
                        return copyKeyedOwnerMetadata(value, output);
                    }
                    if (regionCount !== 1 || value.length === 0 ||
                        previousOwnerCache.subtreeOwners.size !== value.length + 1)
                        return null;
                    const output = [];
                    const seenKeys = new Set();
                    let componentSiteId = null;
                    for (const child of value) {
                        if (child == null || child === false || Array.isArray(child) ||
                            typeof child !== "object" || typeof child.type !== "function")
                            return null;
                        const siteId = getComponentSiteId(child.type);
                        if (siteId !== regionId ||
                            (componentSiteId && siteId !== componentSiteId)) {
                            return null;
                        }
                        componentSiteId = siteId;
                        const rawKey = child.props.key;
                        if (rawKey == null)
                            return null;
                        const key = String(rawKey);
                        if (seenKeys.has(key))
                            return null;
                        seenKeys.add(key);
                        const childOwner = this.world.findOwner(parentOwner, siteId, key);
                        if (childOwner === undefined || !this.#liveOwners.has(childOwner)) {
                            return null;
                        }
                        const childCache = this.#componentCache.get(childOwner);
                        if (!childCache || childCache.type !== child.type ||
                            childCache.subtreeOwners.size !== 1)
                            return null;
                        const { key: _key, ref: _ref, ...props } = child.props;
                        if (!shallowEqual(childCache.props, props))
                            return null;
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
                    if (expanded === null)
                        return null;
                    output.push(expanded);
                    if (expanded !== child)
                        changed = true;
                }
                return changed ? output : value;
            }
            if (typeof value.type === "function")
                return null;
            const child = visit(value.props.children);
            if (child === null)
                return null;
            return child === value.props.children
                ? value
                : copyRuntimeElement(value.type, { ...value.props, children: child });
        };
        const result = visit(node);
        if (result === null || regionCount !== 1 || reusedRows === 0) {
            this.#count("owner.keyed-region.fallback");
            return null;
        }
        return result;
    }
    #tryPartialOwnerCommits(owners) {
        if (this.#renderPreparation !== "repeatable")
            return false;
        const keys = new Map();
        const seenKeys = new Set();
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
        for (const item of ready) {
            if (hasNestedComponent(item.result) ||
                singleHostRootKey(item.result) !== keys.get(item.owner)) {
                for (const candidate of ready) {
                    this.#preparedRenders.set(candidate.owner, candidate);
                }
                this.#profile?.("dispatch.partial-bail.changed-root-or-nested-owner", 0);
                return false;
            }
        }
        const regions = ready.map((item) => ({
            key: keys.get(item.owner),
            tree: item.result,
        }));
        const capturedPartialValues = new Map(ready.map((item) => [
            item.owner,
            this.#captureOwnerSourceValues(item.owner, item.propBoundSites),
        ]));
        if (!this.#commitHostMutation(() => this.#vdom.commitKeyedRegions(regions), true)) {
            this.#abandonDirectHostMutation();
            this.#profile?.("dispatch.partial-bail.keyed-regions-rejected", 0);
            for (const item of ready)
                this.#preparedRenders.set(item.owner, item);
            return false;
        }
        try {
            for (const item of ready) {
                const cached = this.#componentCache.get(item.owner);
                this.#componentCache.set(item.owner, {
                    ...cached,
                    result: item.result,
                    expandedResult: item.result,
                    subtreeOwners: new Set([item.owner]),
                    ownEffects: item.ownEffects,
                    propBoundSites: item.propBoundSites,
                    numericStateAdmitted: item.numericStateAdmitted,
                });
                this.#syncOwnerSourceValues(item.owner, cached, item.propBoundSites, capturedPartialValues.get(item.owner));
                this.#refreshDirectKeyedRegionOutput(item.owner);
                this.#preparedRenders.delete(item.owner);
            }
            this.#publishDirectHostMutation();
        }
        catch (error) {
            if (this.#directPublicationPending)
                this.#failDirectHostMutation(error);
            throw error;
        }
        const effectErrors = [];
        for (const item of ready) {
            effectErrors.push(...this.#reconcileOwnerEffects(item.owner, item.ownEffects));
        }
        if (effectErrors.length) {
            throw new AggregateError(effectErrors, "Component effects failed after multi-region partial commit");
        }
        return true;
    }
    #cleanupEffects(effects) {
        const errors = [];
        for (const effect of effects) {
            if (!effect.cleanup)
                continue;
            try {
                effect.cleanup();
            }
            catch (error) {
                errors.push(error);
            }
        }
        return errors;
    }
    #reconcileEffects(nextEffects) {
        const errors = [];
        try {
            this.#vdom.flushRefs();
        }
        catch (error) {
            errors.push(error);
        }
        if (this.#disposed || this.#disposeRequested)
            return errors;
        const previousEffects = this.#liveEffects;
        const nextLiveEffects = new Map();
        const registrationsToStart = [];
        for (const [key, registration] of nextEffects) {
            const previous = previousEffects.get(key);
            if (previous) {
                nextLiveEffects.set(key, previous);
            }
            else {
                registrationsToStart.push([key, registration]);
            }
        }
        const removedEffects = [...previousEffects]
            .filter(([key]) => !nextEffects.has(key))
            .map(([, effect]) => effect);
        this.#liveEffects = nextLiveEffects;
        this.#rebuildLiveEffectKeysByOwner();
        for (const effect of removedEffects) {
            if (!effect.cleanup)
                continue;
            try {
                effect.cleanup();
            }
            catch (error) {
                errors.push(error);
            }
            if (this.#disposed || this.#disposeRequested)
                return errors;
        }
        for (const [key, registration] of registrationsToStart) {
            if (this.#disposed || this.#disposeRequested)
                break;
            let cleanup;
            try {
                cleanup = registration.setup();
            }
            catch (error) {
                errors.push(error);
                if (this.#disposed || this.#disposeRequested)
                    break;
                cleanup = undefined;
            }
            // setup may synchronously dispose the root before it returns its cleanup.
            if (this.#disposed || this.#disposeRequested) {
                if (typeof cleanup === "function") {
                    try {
                        cleanup();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
                break;
            }
            const effect = {
                owner: registration.owner,
                siteId: registration.siteId,
                cleanup: typeof cleanup === "function" ? cleanup : undefined,
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
        }
        catch (error) {
            errors.push(error);
        }
        if (this.#disposed || this.#disposeRequested)
            return errors;
        const currentKeys = this.#liveEffectKeysByOwner.get(owner);
        if (currentKeys) {
            const removedEffects = [];
            for (const key of [...currentKeys]) {
                if (nextEffects.has(key))
                    continue;
                const previous = this.#liveEffects.get(key);
                if (previous)
                    removedEffects.push(previous);
                this.#liveEffects.delete(key);
                currentKeys.delete(key);
            }
            for (const effect of removedEffects) {
                if (effect.cleanup) {
                    try {
                        effect.cleanup();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
                if (this.#disposed || this.#disposeRequested)
                    return errors;
            }
        }
        for (const [key, registration] of nextEffects) {
            if (this.#disposed || this.#disposeRequested)
                break;
            if (this.#liveEffects.has(key))
                continue;
            let cleanup;
            try {
                cleanup = registration.setup();
            }
            catch (error) {
                errors.push(error);
                if (this.#disposed || this.#disposeRequested)
                    break;
                cleanup = undefined;
            }
            if (this.#disposed || this.#disposeRequested) {
                if (typeof cleanup === "function") {
                    try {
                        cleanup();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                }
                break;
            }
            const effect = {
                owner,
                siteId: registration.siteId,
                cleanup: typeof cleanup === "function" ? cleanup : undefined,
            };
            this.#liveEffects.set(key, effect);
            this.#addLiveEffectKey(key, effect);
        }
        if (this.#liveEffectKeysByOwner.get(owner)?.size === 0) {
            this.#liveEffectKeysByOwner.delete(owner);
        }
        return errors;
    }
    #rebuildLiveEffectKeysByOwner() {
        this.#liveEffectKeysByOwner.clear();
        for (const [key, effect] of this.#liveEffects) {
            this.#addLiveEffectKey(key, effect);
        }
    }
    #addLiveEffectKey(key, effect) {
        let keys = this.#liveEffectKeysByOwner.get(effect.owner);
        if (!keys)
            this.#liveEffectKeysByOwner.set(effect.owner, keys = new Set());
        keys.add(key);
    }
    #count(name, count = 1) {
        if (!this.#activeCounters || count === 0)
            return;
        this.#activeCounters.set(name, (this.#activeCounters.get(name) ?? 0) + count);
    }
    #compiledPropSitesForCache(owner, cache) {
        if (cache.propBoundSites.size === 0)
            return emptyCompiledPropSites;
        if (!numericOwnerCacheAdmitted(cache) ||
            !this.world.ownerStateValuesArePrimitive(owner)) {
            return emptyCompiledPropSites;
        }
        const cached = this.#compiledPropSitesByCache.get(cache);
        if (cached)
            return cached;
        const metadata = typeof cache.type === "function"
            ? definedComponents.get(cache.type)?.metadata : undefined;
        if (!metadata?.propOnlySites.length)
            return emptyCompiledPropSites;
        this.#count("numeric.compiled-site-cache-constructions");
        const eligible = new Set();
        for (const site of metadata?.propOnlySites ?? []) {
            this.#count("numeric.compiled-site-metadata-inspections");
            if (cache.propBoundSites.has(site))
                eligible.add(site);
        }
        this.#compiledPropSitesByCache.set(cache, eligible);
        return eligible;
    }
    #compiledOwnerSiteCertified(owner, cache, site) {
        if (!numericOwnerCacheAdmitted(cache) ||
            !this.world.ownerStateValuesArePrimitive(owner))
            return false;
        const metadata = typeof cache.type === "function"
            ? definedComponents.get(cache.type)?.metadata : undefined;
        return metadata?.propOnlySites.includes(site) === true;
    }
    #refreshDirectKeyedRegionOutput(owner, sparseStore = false) {
        if (sparseStore)
            this.#count("store.sparse.keyed-output-edge-visits");
        const parentOwner = this.world.ownerLineage(owner)[1];
        if (parentOwner === undefined)
            return;
        const parentCache = this.#componentCache.get(parentOwner);
        const keyedRegion = parentCache?.keyedRegion;
        const key = keyedRegion?.keysByOwner.get(owner);
        if (key === undefined || !keyedRegion)
            return;
        const childCache = this.#componentCache.get(owner);
        if (childCache) {
            keyedRegion.outputsByKey.set(key, childCache.expandedResult);
        }
    }
    #syncCollectionRegions(caches, collected = new Map()) {
        if (this.#disposed)
            return;
        const next = new Map();
        for (const [owner, component] of caches) {
            const region = component.keyedRegion?.collection;
            if (!region)
                continue;
            const key = `${owner}\u0000${region.siteId}`;
            next.set(key, region);
        }
        for (const [key, region] of collected)
            next.set(key, region);
        for (const [key, previous] of this.#liveCollectionRegions) {
            const current = next.get(key);
            if (current?.collection === previous.collection) {
                current.reader = previous.reader;
                current.unsubscribe = previous.unsubscribe;
                if (current.reader &&
                    current.snapshotVersion === previous.collection.version) {
                    current.reader.resetTo(current.snapshotVersion);
                    this.#collectionSnapshotFallbackKeys.delete(key);
                }
                if (current.snapshotVersion !== previous.collection.version) {
                    this.#pendingCollectionRegionKeys.add(key);
                }
                else {
                    this.#pendingCollectionRegionKeys.delete(key);
                }
                continue;
            }
            previous.unsubscribe?.();
            previous.reader?.detach();
            this.#count("collection.reader-detaches");
            this.#pendingCollectionRegionKeys.delete(key);
            this.#collectionSnapshotFallbackKeys.delete(key);
        }
        for (const [key, region] of next) {
            if (region.reader)
                continue;
            region.reader = region.collection.createReader();
            region.unsubscribe = region.collection.subscribe(() => {
                if (this.#disposed)
                    return;
                this.#pendingCollectionRegionKeys.add(key);
                this.#schedule();
            });
            this.#count("collection.reader-attaches");
            if (region.snapshotVersion !== region.collection.version) {
                this.#pendingCollectionRegionKeys.add(key);
            }
        }
        this.#liveCollectionRegions = next;
    }
    #prepareMixedCollectionCandidate(capturedChanges, options) {
        const repeatable = this.#renderPreparation === "repeatable" ||
            options.renderPreparation === "repeatable";
        if (this.#pendingCollectionRegionKeys.size === 0 ||
            (!options.scopedStructural &&
                (this.#everReadResource || this.#everHadNativeBoundary)))
            return null;
        const storeGenerationAtPrepare = options.storeGeneration;
        const baseVersion = this.#publicationVersion;
        const baseVDOMVersion = this.#vdom.version;
        const preparation = this.world.beginPreparation();
        const stores = new StoreRenderTransaction(this.#rootId, {
            transitions: options.transitions,
        });
        let resourceReads = new ResourceReadSet(this.#resourceTable);
        const stages = new Map();
        const rowsByOwner = new Map();
        const droppedReaderIds = new Set();
        const renderedOwners = new Set();
        const retiredOwners = new Set();
        const privateOwners = new Set();
        let closedStoreOutputs = null;
        const capturedBindings = [];
        const leafCaches = new Map();
        const leafPreviousCaches = new Map();
        const leafRegions = [];
        const numericWrites = [];
        const numericSources = new Set();
        const scopedCellWrites = [];
        const resourceStages = [];
        const scopedSources = new Set();
        const scopedHandles = [];
        const scopedVersions = [];
        const validateScopedCells = (afterHost) => this.#validateRetainedCells(scopedCellWrites, afterHost);
        const hasScopedStoreReaderConflict = () => {
            if (!options.scopedStructural)
                return false;
            for (const owner of retiredOwners) {
                if (this.#ownerHasStoreReaders(owner))
                    return true;
            }
            return false;
        };
        const discardArtifacts = () => {
            try {
                preparation.discard();
            }
            finally {
                stores.discard();
                resourceReads?.discard();
                resourceReads = null;
                this.#discardUncommittedStoreRoots(stores);
                closedStoreOutputs?.release();
                closedStoreOutputs = null;
                for (const stage of resourceStages)
                    stage.release();
                resourceStages.length = 0;
            }
        };
        let preparedProgram = null;
        let committedProgram = null;
        let preparationFailed = false;
        let resourceWasRead = false;
        try {
            if (!options.scopedStructural &&
                this.#storeNotificationGeneration !== storeGenerationAtPrepare) {
                // Store notifications may have advanced since the caller captured its
                // generation; rebuild under the latest root-visible store cut.
                throw new SparseCandidateIneligible();
            }
            if (options.scopedStructural) {
                const captured = this.#captureRetainedCells(options.scopedCells ?? []);
                if (!captured)
                    throw new SparseCandidateIneligible();
                scopedCellWrites.push(...captured.writes);
                for (const source of captured.sources)
                    scopedSources.add(source);
                for (const write of scopedCellWrites) {
                    scopedHandles.push(write.handle);
                    scopedVersions.push(write.version);
                }
            }
            const storeChangePending = this.#storeNotificationGeneration !==
                this.#committedStoreNotificationGeneration;
            if (options.scopedStructural && (options.transitions.length > 0 || capturedChanges.length > 0 ||
                !options.selectedRegionKeys?.size))
                throw new SparseCandidateIneligible();
            const regionKeys = options.selectedRegionKeys ?? (storeChangePending
                ? new Set(this.#liveCollectionRegions.keys())
                : new Set(this.#pendingCollectionRegionKeys));
            for (const regionKey of regionKeys) {
                this.#count("collection.mixed-region-visits");
                if (this.#collectionSnapshotFallbackKeys.has(regionKey)) {
                    preparationFailed = true;
                    break;
                }
                const region = this.#liveCollectionRegions.get(regionKey);
                const parentCache = region &&
                    this.#componentCache.get(region.parentOwner);
                const ownerRegion = parentCache?.keyedRegion;
                if (!region || !region.reader || !parentCache || !ownerRegion ||
                    ownerRegion.collection !== region || !region.parentHostKey ||
                    region.requiresOwnerRender || !region.ownerInputsAdmitted ||
                    (closedCollectionSitesFor(parentCache.type) !== undefined &&
                        parentCache.collectionPropsOwned !== true) ||
                    !collectionOwnerApiAdmitted(region, parentCache) ||
                    !componentCodeCurrent(parentCache.type) ||
                    (options.scopedStructural &&
                        !this.#pendingCollectionRegionKeys.has(regionKey))) {
                    preparationFailed = true;
                    break;
                }
                const read = region.reader.read();
                if (read.status !== "available") {
                    preparationFailed = true;
                    break;
                }
                const rowProgram = closedCollectionRowProgramFor(parentCache.type, region.siteId, region.componentSiteId);
                if (collectionOwnerNeedsGenericRows(parentCache, read.batches) &&
                    !rowProgram) {
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
                    rows: new Map(),
                    previousRows: new Map(),
                    operations: [],
                    ...(rowProgram ? { rowProgram } : {}),
                };
                stages.set(regionKey, stage);
            }
            if (preparationFailed || stages.size === 0) {
                throw new SparseCandidateIneligible();
            }
            if (!repeatable &&
                [...stages.values()].some((stage) => stage.read.batches.some((batch) => batch.operations.some((operation) => operation.type !== "move" && operation.type !== "remove" &&
                    !stage.rowProgram))))
                throw new SparseCandidateIneligible();
            if (options.scopedStructural) {
                for (const stage of stages.values()) {
                    for (const batch of stage.read.batches) {
                        if (batch.operations.some((operation) => operation.type !== "move" && operation.type !== "remove") && !stage.rowProgram)
                            throw new SparseCandidateIneligible();
                    }
                }
            }
            const rowFor = (stage, key) => {
                if (stage.rows.has(key))
                    return stage.rows.get(key) ?? null;
                const node = stage.region.rows.get(key)?.node;
                const componentSiteId = stage.region.componentSiteId ??
                    (node && typeof node === "object" && !Array.isArray(node) &&
                        typeof node.type === "function"
                        ? getComponentSiteId(node.type)
                        : undefined);
                if (!node || !componentSiteId)
                    return null;
                const owner = preparation.findOwner(stage.region.parentOwner, collectionOwnerSite(stage.region.siteId, componentSiteId), key);
                const cache = owner === undefined
                    ? undefined
                    : this.#componentCache.get(owner);
                const hostKey = stage.region.hostKeysByCollectionKey.get(key);
                if (owner === undefined || !cache || !hostKey)
                    return null;
                const row = { owner, hostKey, node, cache, privateOwner: false };
                stage.previousRows.set(key, row);
                rowsByOwner.set(owner, { stage, key });
                return row;
            };
            const prepareRenderedRow = (stage, key, rendered, owner, previous, privateOwner, closedOutput) => {
                if (typeof rendered.type !== "function" ||
                    (stage.region.componentSiteId !== undefined &&
                        getComponentSiteId(rendered.type) !== stage.region.componentSiteId))
                    return null;
                const authoredKey = rendered.props.key;
                if (authoredKey != null && String(authoredKey) !== key)
                    return null;
                const { key: _key, ref: _ref, ...props } = rendered.props;
                ownNumericOwnerProps(rendered.type, rendered, props);
                const collectionPropsOwned = ownCollectionOwnerProps(rendered.type, rendered, props);
                const priorCache = previous?.owner === owner ? previous.cache : undefined;
                const hostKeyScope = priorCache?.hostKeyScope ?? key;
                const scopeExplicitHostKeys = priorCache?.scopeExplicitHostKeys === true;
                if (previous?.privateOwner && previous.owner === owner) {
                    stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${owner}\u0000`)));
                    for (let index = capturedBindings.length - 1; index >= 0; index--) {
                        if (capturedBindings[index].owner === owner) {
                            capturedBindings.splice(index, 1);
                        }
                    }
                }
                const ownEffects = new Map();
                const propBoundSites = new Set();
                const activeOwner = {
                    world: preparation,
                    owner,
                    numericStateReadsPrimitive: true,
                    collectionPropsOwned,
                    collectionProps: props,
                    collectionSites: closedCollectionSitesFor(rendered.type),
                    stateLayout: numericOwnerPropsAdmitted(rendered.type, props, isRuntimeOwnedElement(rendered))
                        ? compiledStateLayoutFor(rendered.type) : undefined,
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
                            sites,
                        });
                    },
                    registerEffect: (siteId, setup) => {
                        if (!siteId || typeof setup !== "function") {
                            throw new Error("Invalid effect registration");
                        }
                        const effectId = effectKey(owner, siteId);
                        if (ownEffects.has(effectId)) {
                            throw new Error(`Effect site ${siteId} was registered twice for owner ${owner}`);
                        }
                        ownEffects.set(effectId, { owner, siteId, setup });
                    },
                };
                let result;
                if (closedOutput) {
                    result = closedOutput;
                }
                else {
                    activeOwners.push(activeOwner);
                    try {
                        if (this.#activeCounters) {
                            this.#count("owner.component-visits");
                            this.#count("owner.component-renders");
                        }
                        result =
                            rendered.type(props);
                    }
                    finally {
                        activeOwners.pop();
                    }
                }
                if (resourceWasRead)
                    return null;
                result = carryHostKeys(result, hostKeyScope, "0", undefined, scopeExplicitHostKeys, owner);
                const hostKey = singleHostRootKey(result);
                if (hostKey === null || hasNestedComponent(result))
                    return null;
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
                    subtreeOwners: new Set([owner]),
                    ownEffects,
                    propBoundSites,
                };
                const node = { ...rendered, props: { ...rendered.props, key } };
                const row = { owner, hostKey, node, cache, privateOwner };
                renderedOwners.add(owner);
                if (privateOwner)
                    privateOwners.add(owner);
                if (previous && previous.owner !== owner) {
                    retiredOwners.add(previous.owner);
                }
                rowsByOwner.set(owner, { stage, key });
                return row;
            };
            const appendOperation = (stage, operation) => {
                stage.operations.push(operation);
                return "ok";
            };
            for (const stage of stages.values()) {
                for (const batch of stage.read.batches) {
                    if (batch.fromVersion + 1 !== batch.version) {
                        throw new SparseCandidateIneligible();
                    }
                    for (const operation of batch
                        .operations) {
                        this.#count("collection.delta-operations");
                        if (operation.type === "remove") {
                            const previous = rowFor(stage, operation.key);
                            if (!previous)
                                throw new SparseCandidateIneligible();
                            if (options.scopedStructural &&
                                previous.cache.subtreeOwners.size !== 1)
                                throw new SparseCandidateIneligible();
                            const removeResult = appendOperation(stage, {
                                type: "remove",
                                key: previous.hostKey,
                            });
                            if (removeResult === false)
                                throw new SparseCandidateIneligible();
                            stage.rows.set(operation.key, null);
                            if (privateOwners.has(previous.owner)) {
                                preparation.discardPrivateOwner(previous.owner);
                                privateOwners.delete(previous.owner);
                                renderedOwners.delete(previous.owner);
                                rowsByOwner.delete(previous.owner);
                                for (let index = capturedBindings.length - 1; index >= 0; index--) {
                                    if (capturedBindings[index].owner === previous.owner) {
                                        capturedBindings.splice(index, 1);
                                    }
                                }
                                stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${previous.owner}\u0000`)));
                            }
                            else {
                                retiredOwners.add(previous.owner);
                            }
                        }
                        else if (operation.type === "move") {
                            const row = rowFor(stage, operation.key);
                            const anchor = operation.beforeKey === null
                                ? null
                                : rowFor(stage, operation.beforeKey);
                            if (!row || (operation.beforeKey !== null && !anchor) ||
                                appendOperation(stage, {
                                    type: "move",
                                    key: row.hostKey,
                                    beforeKey: anchor?.hostKey ?? null,
                                }) === false)
                                throw new SparseCandidateIneligible();
                        }
                        else {
                            const previous = rowFor(stage, operation.key);
                            const inserting = operation.type === "insert";
                            if ((inserting && previous) || (!inserting && !previous)) {
                                throw new SparseCandidateIneligible();
                            }
                            const anchor = inserting && operation.beforeKey !== null
                                ? rowFor(stage, operation.beforeKey)
                                : null;
                            if (inserting && operation.beforeKey !== null && !anchor) {
                                throw new SparseCandidateIneligible();
                            }
                            if (!repeatable && !stage.rowProgram) {
                                throw new SparseCandidateIneligible();
                            }
                            const program = stage.rowProgram;
                            if (program && previous && (previous.cache.type !== program.rowComponent ||
                                previous.cache.subtreeOwners.size !== 1 ||
                                previous.cache.ownEffects.size !== 0 ||
                                previous.cache.propBoundSites.size !== 0 ||
                                this.#ownerHasStoreReaders(previous.owner)))
                                throw new SparseCandidateIneligible();
                            const inputs = program
                                ? captureClosedCollectionRowInputs(program, operation.value)
                                : null;
                            const closedOutput = program && inputs
                                ? evaluateClosedCollectionRowProgram(program, inputs)
                                : undefined;
                            if (program && !closedOutput)
                                throw new SparseCandidateIneligible();
                            const rendered = program
                                ? copyRuntimeElement(program.rowComponent, { [program.rowProp]: operation.value })
                                : stage.region.renderRow(operation.value);
                            if (!rendered || Array.isArray(rendered) ||
                                typeof rendered !== "object" ||
                                typeof rendered.type !== "function")
                                throw new SparseCandidateIneligible();
                            const componentSiteId = getComponentSiteId(rendered.type);
                            const ownerSite = collectionOwnerSite(stage.region.siteId, componentSiteId);
                            const existing = preparation.findOwner(stage.region.parentOwner, ownerSite, operation.key);
                            const preserveReplacementOwner = operation.type === "replace" &&
                                existing !== undefined;
                            const owner = existing === undefined
                                ? preparation.resolveOwner(stage.region.parentOwner, ownerSite, operation.key)
                                : preserveReplacementOwner
                                    ? existing
                                    : preparation.replaceOwner(stage.region.parentOwner, ownerSite, operation.key);
                            const candidate = prepareRenderedRow(stage, operation.key, rendered, owner, previous, owner !== existing, closedOutput ?? undefined);
                            if (!candidate ||
                                (previous && candidate.hostKey !== previous.hostKey))
                                throw new SparseCandidateIneligible();
                            const hostOperation = previous === null
                                ? {
                                    type: "insert",
                                    key: candidate.hostKey,
                                    beforeKey: anchor?.hostKey ?? null,
                                    tree: candidate.cache.expandedResult,
                                }
                                : {
                                    type: "replace",
                                    key: candidate.hostKey,
                                    tree: candidate.cache.expandedResult,
                                };
                            const appendResult = appendOperation(stage, hostOperation);
                            if (appendResult === false)
                                throw new SparseCandidateIneligible();
                            stage.rows.set(operation.key, candidate);
                            if (previous) {
                                if (previous.owner !== candidate.owner &&
                                    privateOwners.has(previous.owner)) {
                                    preparation.discardPrivateOwner(previous.owner);
                                    privateOwners.delete(previous.owner);
                                    renderedOwners.delete(previous.owner);
                                    rowsByOwner.delete(previous.owner);
                                    for (let index = capturedBindings.length - 1; index >= 0; index--) {
                                        if (capturedBindings[index].owner === previous.owner) {
                                            capturedBindings.splice(index, 1);
                                        }
                                    }
                                    stores.dropReaders([...stores.readers.keys()].filter((id) => id.startsWith(`${previous.owner}\u0000`)));
                                }
                            }
                        }
                    }
                }
            }
            const affectedReaderIds = new Set(droppedReaderIds);
            const readerOwners = new Map();
            if (!options.scopedStructural)
                for (const readerId of this.#liveStoreReaders.keys()) {
                    const split = readerId.indexOf("\u0000");
                    if (split <= 0)
                        throw new SparseCandidateIneligible();
                    const owner = Number(readerId.slice(0, split));
                    if (!Number.isSafeInteger(owner))
                        throw new SparseCandidateIneligible();
                    const ids = readerOwners.get(owner) ?? [];
                    ids.push(readerId);
                    readerOwners.set(owner, ids);
                }
            if (!options.scopedStructural) {
                // Resolve only store-reader owners through the reverse index, keeping work
                // proportional to participating readers.
                for (const owner of readerOwners.keys()) {
                    this.#count("collection.mixed-store-reader-visits");
                    for (const stage of stages.values()) {
                        const collectionKey = stage.ownerRegion.keysByOwner.get(owner);
                        if (collectionKey !== undefined && stage.region.rows.has(collectionKey)) {
                            rowsByOwner.set(owner, { stage, key: collectionKey });
                            break;
                        }
                    }
                }
                for (const [owner, ids] of readerOwners) {
                    if (retiredOwners.has(owner)) {
                        for (const id of ids) {
                            droppedReaderIds.add(id);
                            affectedReaderIds.add(id);
                        }
                    }
                    else if (renderedOwners.has(owner)) {
                        for (const id of ids)
                            affectedReaderIds.add(id);
                    }
                }
                // Fold touched collection readers into that region; other store readers must be
                // independent host leaves.
                if (storeChangePending) {
                    for (const [owner, ids] of readerOwners) {
                        if (retiredOwners.has(owner))
                            continue;
                        const rowLocation = rowsByOwner.get(owner);
                        if (rowLocation) {
                            const stage = rowLocation.stage;
                            const row = rowFor(stage, rowLocation.key);
                            if (!row) {
                                for (const id of ids)
                                    droppedReaderIds.add(id);
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
                                for (const id of ids)
                                    affectedReaderIds.add(id);
                                continue;
                            }
                            const rendered = row.node;
                            if (!repeatable) {
                                throw new SparseCandidateIneligible();
                            }
                            const prepared = prepareRenderedRow(stage, rowLocation.key, rendered, owner, row, false);
                            if (!prepared ||
                                !appendOperation(stage, {
                                    type: "replace",
                                    key: row.hostKey,
                                    tree: prepared.cache.expandedResult,
                                }))
                                throw new SparseCandidateIneligible();
                            stage.rows.set(rowLocation.key, prepared);
                            for (const id of ids)
                                affectedReaderIds.add(id);
                        }
                        else {
                            if (!storeChangePending)
                                continue;
                            const cache = this.#componentCache.get(owner);
                            const metadata = cache && typeof cache.type === "function"
                                ? definedComponents.get(cache.type)?.metadata : undefined;
                            if (!cache || cache.nativeBoundary ||
                                metadata?.hostLeafOutput !== true ||
                                cache.subtreeOwners.size !== 1 || hasNestedComponent(cache.result))
                                throw new SparseCandidateIneligible();
                            const key = singleHostRootKey(cache.expandedResult);
                            if (!key)
                                throw new SparseCandidateIneligible();
                            this.#count("owner.component-visits");
                            if (!repeatable) {
                                throw new SparseCandidateIneligible();
                            }
                            const prepared = this.#prepareOwnerRender(owner, {
                                preparation,
                                stores,
                                resourceReads,
                                captureBinding: (binding, sources, bindingOwner, sites) => capturedBindings.push({
                                    binding,
                                    sources,
                                    owner: bindingOwner,
                                    sites,
                                }),
                                onResourceRead: () => resourceWasRead = true,
                            });
                            if (!prepared || resourceWasRead ||
                                singleHostRootKey(prepared.result) !== key ||
                                hasNestedComponent(prepared.result))
                                throw new SparseCandidateIneligible();
                            leafCaches.set(owner, {
                                ...cache,
                                result: prepared.result,
                                expandedResult: prepared.result,
                                ownEffects: prepared.ownEffects,
                                propBoundSites: prepared.propBoundSites,
                                numericStateAdmitted: prepared.numericStateAdmitted,
                            });
                            leafPreviousCaches.set(owner, cache);
                            leafRegions.push({ key, tree: prepared.result });
                            for (const id of ids)
                                affectedReaderIds.add(id);
                        }
                    }
                }
                // Remove stale observations from deleted/replaced rows, then carry every
                // unaffected reader footprint forward into this shared store cut.
                if (droppedReaderIds.size)
                    stores.dropReaders(droppedReaderIds);
                const preserved = new Map();
                for (const [readerId, readerStores] of this.#liveStoreReaders) {
                    if (affectedReaderIds.has(readerId))
                        continue;
                    preserved.set(readerId, readerStores);
                }
                if (preserved.size)
                    stores.preserveReaders(preserved);
            }
            const touchedOldOwners = new Set([...retiredOwners, ...renderedOwners]);
            for (const change of capturedChanges) {
                if (touchedOldOwners.has(change.owner))
                    continue;
                const cache = this.#componentCache.get(change.owner);
                const source = this.world.scalarSourceForChange(change);
                const approvedSites = cache
                    ? this.#compiledPropSitesForCache(change.owner, cache)
                    : undefined;
                const previous = source
                    ? this.#lastSourceValues.get(source)
                    : undefined;
                if (!cache || !approvedSites?.has(change.site) || !source ||
                    previous === undefined || !this.#vdom.hasBoundSource(source) ||
                    numericSources.has(source))
                    throw new SparseCandidateIneligible();
                numericSources.add(source);
                numericWrites.push({
                    owner: change.owner,
                    site: change.site,
                    source,
                    version: change.version,
                    previous,
                    current: source.value,
                    change,
                });
            }
            const validateNumericWrites = () => numericWrites.every((write) => this.world.versionForChange(write.change) === write.version &&
                this.world.scalarSource(write.owner, write.site) === write.source &&
                Object.is(write.source.value, write.current));
            const validatePostHostNumericWrites = () => numericWrites.every((write) => this.world.scalarSource(write.owner, write.site) === write.source &&
                this.world.version(write.owner, write.site) >= write.version &&
                (this.world.version(write.owner, write.site) > write.version ||
                    Object.is(write.source.value, write.current)));
            if (resourceWasRead || preparation.hasStateWrites()) {
                throw new SparseCandidateIneligible();
            }
            if (hasScopedStoreReaderConflict())
                throw new SparseCandidateIneligible();
            const scopedClosedRowOwners = options.scopedStructural &&
                [...renderedOwners].every((owner) => {
                    const location = rowsByOwner.get(owner);
                    return location?.stage.rowProgram !== undefined &&
                        location.stage.rows.get(location.key)?.owner === owner;
                }) && [...privateOwners].every((owner) => renderedOwners.has(owner));
            if (options.scopedStructural && (leafRegions.length > 0 || leafCaches.size > 0 ||
                numericWrites.length > 0 || !scopedClosedRowOwners))
                throw new SparseCandidateIneligible();
            if (options.scopedStructural && scopedCellWrites.some(({ handle }) => retiredOwners.has(handle.owner)))
                throw new SparseCandidateIneligible();
            if (options.scopedResourceOwners?.length) {
                for (const owner of options.scopedResourceOwners) {
                    const stage = this.#stageBoundaryReveal(owner, preparation, stores, resourceReads, options.resourceLease);
                    if (!stage)
                        throw new SparseCandidateIneligible();
                    resourceStages.push(stage);
                }
            }
            if (options.scopedStructural && options.scopedStores?.length) {
                const newlyStaged = new Set(resourceStages.flatMap((stage) => [...stage.storeInputs]));
                const pendingReaderIds = new Set(resourceStages.flatMap((stage) => [...stage.pendingReaderIds]));
                closedStoreOutputs = this.#stageClosedStoreOutputs(options.scopedStores, stores, false, newlyStaged, pendingReaderIds, options.resourceLease);
            }
            if (options.scopedStructural && closedStoreOutputs &&
                [...closedStoreOutputs.owners].some((owner) => retiredOwners.has(owner)))
                throw new SparseCandidateIneligible();
            const deltas = [...stages.values()].filter((stage) => stage.operations.length > 0).map((stage) => ({
                parentKey: stage.region.parentHostKey,
                regionId: stage.region.siteId,
                operations: stage.operations,
            }));
            if (options.scopedStructural && (scopedCellWrites.length > 0 ||
                (closedStoreOutputs?.regions.length ?? 0) > 0 ||
                resourceStages.length > 0)) {
                const joint = this.#vdom.prepareScopedKeyedRetainedAndStoreDeltas(deltas, scopedCellWrites.map(({ source, value }) => [source, value]), closedStoreOutputs?.regions ?? [], resourceStages.map(({ region }) => region));
                if (!joint || joint.readSources.some((source) => !scopedSources.has(source)))
                    throw new SparseCandidateIneligible();
                preparedProgram = joint;
            }
            else {
                preparedProgram = this.#vdom.prepareKeyedRegionDeltas(deltas, leafRegions, options.scopedStructural ? { scoped: true } : undefined);
            }
            if (!preparedProgram)
                throw new SparseCandidateIneligible();
            if (options.scopedStructural && !preparedProgram.scoped) {
                throw new SparseCandidateIneligible();
            }
            const capturedMixedValues = new Map();
            const captureMixedValues = (owner, cache) => {
                for (const site of cache.propBoundSites) {
                    const source = preparation.scalarSource(owner, site);
                    if (!source)
                        continue;
                    let sites = capturedMixedValues.get(owner);
                    if (!sites)
                        capturedMixedValues.set(owner, sites = new Map());
                    sites.set(site, source.value);
                }
            };
            for (const [owner, cache] of leafCaches)
                captureMixedValues(owner, cache);
            if (!options.scopedStructural)
                for (const stage of stages.values()) {
                    for (const row of stage.rows.values()) {
                        if (row)
                            captureMixedValues(row.owner, row.cache);
                    }
                }
            const touchedCollections = [...stages.values()];
            let collectionAcknowledgements = [];
            const validateCollections = () => touchedCollections.every((stage) => collectionOwnerApiAdmitted(stage.region, stage.parentCache) &&
                stage.region.collection.version === stage.read.toVersion);
            const validatePostHostCollections = () => touchedCollections.every((stage) => collectionOwnerApiAdmitted(stage.region, stage.parentCache) &&
                stage.region.collection.version >= stage.read.toVersion);
            const validatePostHostCollectionsCanonical = () => touchedCollections.every((stage) => {
                const version = canonicalCollectionVersion(stage.region.collection);
                return collectionOwnerApiAdmitted(stage.region, stage.parentCache) &&
                    (version === null || version >= stage.read.toVersion);
            });
            const validateScopedCachePrivate = () => !options.scopedStructural ||
                !hasScopedStoreReaderConflict() &&
                    touchedCollections.every((stage) => this.#liveCollectionRegions.get(stage.key) === stage.region &&
                        stage.region.reader === stage.reader &&
                        this.#componentCache.get(stage.region.parentOwner) === stage.parentCache &&
                        componentCodeCurrentPrivate(stage.parentCache.type) &&
                        stage.parentCache.keyedRegion === stage.ownerRegion &&
                        [...stage.previousRows.values()].every((row) => this.#componentCache.get(row.owner) === row.cache &&
                            canonicalWorldIsAlive.call(this.world, row.owner)));
            const validateScopedCache = () => validateScopedCachePrivate() &&
                (options.acceptedCollections?.every((validate) => validate()) ?? true) &&
                touchedCollections.every((stage) => componentCodeCurrent(stage.parentCache.type));
            let admittedBindings = null;
            const artifactsReleased = { value: false };
            const releaseArtifacts = () => {
                if (artifactsReleased.value)
                    return;
                artifactsReleased.value = true;
                admittedBindings = null;
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
                for (const stage of resourceStages)
                    stage.release();
                resourceStages.length = 0;
                privateOwners.clear();
                retiredOwners.clear();
                renderedOwners.clear();
            };
            const capturedCodeRevisions = captureCodeRevisions([
                ...leafCaches.values(),
                ...[...stages.values()].flatMap((stage) => [...stage.rows.values(), ...stage.previousRows.values()]
                    .flatMap((row) => row ? [row.cache] : [])),
            ]);
            const acceptedCollectionVersions = (options.acceptedCollectionFootprint ?? [])
                .map((collection) => [collection, canonicalCollectionVersion(collection)]);
            const acceptedResourceVersions = [...(options.acceptedResources ?? [])]
                .map((resource) => [resource, canonicalResourceVersion(resource)]);
            const validateAdmittedBindings = () => {
                admittedBindings = prepareAdmittedBindings(capturedBindings, (owner, site) => privateOwners.has(owner)
                    ? preparation.scalarSource(owner, site)
                    : canonicalWorldIsAlive.call(this.world, owner)
                        ? canonicalWorldScalarSource.call(this.world, owner, site) : null);
                if (admittedBindings === null) {
                    throw new UnsupportedGroupOpaqueFreshnessError("binding");
                }
                return true;
            };
            const validateMixedPreparedPrivate = () => {
                return (!options.resourceLease ||
                    this.#publicationIntents.has(options.resourceLease)) &&
                    !this.#resourceHoldWait(new Set([
                        ...acceptedResourceVersions.map(([resource]) => resource),
                        ...resourceStages.flatMap((stage) => [...stage.dependencies]),
                        ...(closedStoreOutputs?.inputResources ?? []),
                    ]), options.resourceLease, {
                        cells: scopedHandles,
                        stores: [...(options.scopedStores ?? []),
                            ...resourceStages.flatMap((stage) => [...stage.storeInputs]),
                            ...(closedStoreOutputs?.inputStores ?? [])],
                        collections: [...touchedCollections.map((stage) => stage.region.collection),
                            ...acceptedCollectionVersions.map(([collection]) => collection)],
                    }) &&
                    (options.scopedStructural ||
                        this.#storeNotificationGeneration === storeGenerationAtPrepare) &&
                    preparation.validate() && !preparation.hasStateWrites() &&
                    stores.validatePreparedCanonical() &&
                    numericWrites.every((write) => canonicalWorldIsAlive.call(this.world, write.owner) &&
                        canonicalWorldVersion.call(this.world, write.owner, write.site) === write.version &&
                        canonicalWorldScalarSource.call(this.world, write.owner, write.site) === write.source &&
                        capturedScalarCurrent(write.source, write.current)) &&
                    touchedCollections.every((stage) => canonicalCollectionCutCurrent(stage.region.collection, stage.read.toVersion)) && validateScopedCachePrivate() &&
                    (resourceReads ? canonicalResourceCutCurrent(resourceReads) : false) &&
                    (preparedProgram?.validatePreparedPrivate() ?? false) &&
                    this.#validateRetainedCellsPrivate(scopedCellWrites) &&
                    resourceStages.every((stage) => stage.privatePreparedCurrent()) &&
                    (closedStoreOutputs?.privatePreparedCurrent() ?? true) &&
                    acceptedCollectionVersions.every(([collection, version]) => canonicalCollectionCutCurrent(collection, version)) && acceptedResourceVersions.every(([resource, version]) => canonicalResourceVersionCurrent(resource, version)) && cacheCodeCurrentPrivate(leafCaches.values()) &&
                    [...stages.values()].every((stage) => componentCodeCurrentPrivate(stage.parentCache.type) &&
                        [...stage.rows.values(), ...stage.previousRows.values()].every((row) => !row || componentCodeCurrentPrivate(row.cache.type))) && codeRevisionsCurrent(capturedCodeRevisions) &&
                    validateAdmittedBindings();
            };
            return this.#createCandidateLifecycle({
                baseVersion,
                baseVDOMVersion,
                scope: options.scopedStructural
                    ? { kind: "keyed", versionDelta: preparedProgram.structuralVersionDelta }
                    : undefined,
                stores,
                transitions: options.transitions,
                pendingResources: [],
                blocked: false,
                permitPendingDirectIntent: () => !!options.resourceLease &&
                    this.#publicationIntents.has(options.resourceLease),
                admissionCurrent: () => (!options.resourceLease ||
                    this.#publicationIntents.has(options.resourceLease)) &&
                    !this.#resourceHoldWait(new Set([
                        ...(options.acceptedResources ?? []),
                        ...resourceStages.flatMap((stage) => [...stage.dependencies]),
                    ]), options.resourceLease, {
                        cells: scopedHandles,
                        stores: [...(options.scopedStores ?? []),
                            ...resourceStages.flatMap((stage) => [...stage.storeInputs]),
                            ...(closedStoreOutputs?.inputStores ?? [])],
                        collections: [...touchedCollections.map((stage) => stage.region.collection),
                            ...(options.acceptedCollectionFootprint ?? [])],
                    }) && !this.#resourceHoldWait(new Set(closedStoreOutputs?.inputResources ?? []), options.resourceLease) &&
                    (!options.resourceLease || this.#publicationIntents.has(options.resourceLease)),
                codeCurrent: () => cacheCodeCurrent(leafCaches.values()) &&
                    validateScopedCache() && (closedStoreOutputs?.current() ?? true) &&
                    resourceStages.every((stage) => stage.current()) &&
                    scopedCellWrites.every(({ handle }) => {
                        const cache = this.#componentCache.get(handle.owner);
                        return cache !== undefined && componentCodeCurrent(cache.type);
                    }) &&
                    touchedCollections.every((stage) => [...stage.rows.values(), ...stage.previousRows.values()].every((row) => !row || componentCodeCurrent(row.cache.type))),
                validatePrepared: () => (options.scopedStructural ||
                    this.#storeNotificationGeneration === storeGenerationAtPrepare) &&
                    preparation.validate() && !preparation.hasStateWrites() &&
                    stores.validate() && validateNumericWrites() &&
                    validateCollections() &&
                    validateScopedCache() &&
                    (resourceReads?.validate() ?? false) &&
                    resourceStages.every((stage) => stage.current()) &&
                    (preparedProgram?.validate() ?? false) &&
                    preparation.validate() && validateScopedCells(false) &&
                    (closedStoreOutputs?.current() ?? true) && stores.validate(),
                validatePreparedPrivate: validateMixedPreparedPrivate,
                validatePostHost: () => preparation.validatePublicationInputs() &&
                    !preparation.hasStateWrites() &&
                    stores.validatePublicationInputs() &&
                    validatePostHostNumericWrites() &&
                    validatePostHostCollections() &&
                    validateScopedCache() &&
                    (!options.scopedStructural ||
                        committedProgram?.validatePostHost() === true) &&
                    (resourceReads?.validate() ?? false) &&
                    resourceStages.every((stage) => stage.current()) &&
                    preparation.validatePublicationInputs() && validateScopedCells(true) &&
                    (closedStoreOutputs?.current() ?? true) && stores.validatePublicationInputs(),
                finalGroupCurrent: () => preparation.validatePublicationInputs() &&
                    !preparation.hasStateWrites() &&
                    stores.validatePublicationInputsCanonical() &&
                    validatePostHostNumericWrites() &&
                    validatePostHostCollectionsCanonical() &&
                    validateScopedCachePrivate() &&
                    (!options.scopedStructural ||
                        committedProgram?.validatePostHostPrivate() === true) &&
                    (resourceReads?.validateCanonical() ?? false) &&
                    resourceStages.every((stage) => stage.privateCurrent()) &&
                    validateScopedCells(true) &&
                    (closedStoreOutputs?.privateCurrent() ?? true) &&
                    cacheCodeCurrentPrivate(leafCaches.values()) &&
                    codeRevisionsCurrent(capturedCodeRevisions),
                preparePublication: () => {
                    preparation.preparePublicationAfterHost();
                    stores.preparePublicationAfterHost();
                    collectionAcknowledgements = touchedCollections.map((stage) => {
                        const acknowledge = stage.region.reader &&
                            prepareCollectionReaderAcknowledgement(stage.region.reader, stage.read.toVersion);
                        if (!acknowledge) {
                            throw new Error("Collection reader cannot accept captured publication");
                        }
                        return acknowledge;
                    });
                },
                commitHost: () => {
                    preparation.beginHostApplication();
                    for (const item of capturedBindings) {
                        const canonical = item.sites.map((site, index) => privateOwners.has(item.owner)
                            ? preparation.scalarSource(item.owner, site) ??
                                item.sources[index]
                            : this.world.scalarSource(item.owner, site) ??
                                item.sources[index]);
                        if (rebindCapturedBindingSources(item.binding, canonical))
                            continue;
                        const mutable = item.binding.sources;
                        if (mutable) {
                            for (let index = 0; index < canonical.length; index++) {
                                mutable[index] = canonical[index];
                            }
                        }
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
                commitHostAdmitted: () => {
                    preparation.beginHostApplication();
                    applyAdmittedBindings(capturedBindings, admittedBindings ?? []);
                    committedProgram = preparedProgram;
                    preparedProgram.commitAdmitted();
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
                    for (let index = 0; index < collectionAcknowledgements.length; index++) {
                        if (collectionAcknowledgements[index]()) {
                            this.#pendingCollectionRegionKeys.delete(touchedCollections[index].key);
                        }
                    }
                    collectionAcknowledgements = [];
                    for (const [owner, cache] of leafCaches) {
                        this.#componentCache.set(owner, cache);
                    }
                    for (const stage of stages.values()) {
                        for (const [key, candidate] of stage.rows) {
                            if (!candidate) {
                                const previous = stage.previousRows.get(key);
                                if (options.scopedStructural && previous) {
                                    this.#retireOwnerAccepted(previous.owner);
                                }
                                stage.region.rows.delete(key);
                                stage.region.hostKeysByCollectionKey.delete(key);
                                stage.ownerRegion.outputsByKey.delete(key);
                                if (previous) {
                                    stage.ownerRegion.keysByOwner.delete(previous.owner);
                                }
                                continue;
                            }
                            stage.region.rows.set(key, {
                                node: candidate.node,
                                entry: candidate.cache.collectionEntry,
                            });
                            stage.region.hostKeysByCollectionKey.set(key, candidate.hostKey);
                            const previous = stage.previousRows.get(key);
                            this.#componentCache.set(candidate.owner, candidate.cache);
                            if (!this.#liveOwners.has(candidate.owner)) {
                                this.#count("owner.created");
                            }
                            this.#liveOwners.add(candidate.owner);
                            for (const ancestor of canonicalWorldOwnerLineage.call(this.world, candidate.owner)
                                .slice(1)) {
                                const ancestorCache = this.#componentCache.get(ancestor);
                                if (ancestorCache?.subtreeOwners instanceof Set &&
                                    !ancestorCache.subtreeOwners.has(candidate.owner)) {
                                    ancestorCache.subtreeOwners.add(candidate.owner);
                                    this.#count("collection.owner-membership-writes");
                                }
                            }
                            stage.ownerRegion.outputsByKey.set(key, candidate.cache.expandedResult);
                            stage.ownerRegion.keysByOwner.set(candidate.owner, key);
                            if (previous && previous.owner !== candidate.owner) {
                                stage.ownerRegion.keysByOwner.delete(previous.owner);
                            }
                            if (previous && previous.owner === candidate.owner &&
                                !options.scopedStructural) {
                                this.#syncOwnerSourceValues(candidate.owner, previous.cache, candidate.cache.propBoundSites, capturedMixedValues.get(candidate.owner));
                            }
                            else if (!previous || previous.owner !== candidate.owner) {
                                for (const site of candidate.cache.propBoundSites) {
                                    const source = this.world.scalarSource(candidate.owner, site);
                                    if (source) {
                                        this.#lastSourceValues.set(source, capturedMixedValues.get(candidate.owner)?.get(site) ??
                                            source.value);
                                    }
                                }
                            }
                        }
                        for (const ancestor of canonicalWorldOwnerLineage.call(this.world, stage.region.parentOwner)) {
                            const cache = this.#componentCache.get(ancestor);
                            if (!cache)
                                continue;
                            const keyedRegion = cache.keyedRegion
                                ? { ...cache.keyedRegion, version: createKeyedOwnerVersion() }
                                : undefined;
                            if (!options.scopedStructural &&
                                keyedRegion?.collection !== stage.region && keyedRegion) {
                                keyedRegion.outputsByKey.clear();
                                keyedRegion.keysByOwner.clear();
                            }
                            this.#componentCache.set(ancestor, {
                                ...cache,
                                result: null,
                                expandedResult: null,
                                invalidatedByCollection: true,
                                ...(keyedRegion ? { keyedRegion } : {}),
                            });
                        }
                    }
                    for (const stage of resourceStages)
                        stage.publish();
                    closedStoreOutputs?.publish();
                    for (const [owner, cache] of leafCaches) {
                        const previous = leafPreviousCaches.get(owner);
                        if (previous) {
                            this.#syncOwnerSourceValues(owner, previous, cache.propBoundSites, capturedMixedValues.get(owner));
                        }
                        this.#refreshDirectKeyedRegionOutput(owner, true);
                    }
                    for (const write of numericWrites) {
                        this.#lastSourceValues.set(write.source, write.current);
                    }
                    for (const write of scopedCellWrites) {
                        this.#lastSourceValues.set(write.source, write.value);
                    }
                    resourceReads?.discard();
                    resourceReads = null;
                    if (capturedChanges.length > 0) {
                        this.world.clearChangesThrough(capturedChanges);
                        this.#pendingChanges.clearThrough(capturedChanges);
                    }
                    if (scopedCellWrites.length > 0) {
                        canonicalWorldClearCellChangesThrough.call(this.world, scopedHandles, scopedVersions, scopedHandles.length);
                        this.#pendingChanges.clearNativeThrough(scopedHandles, scopedVersions, scopedHandles.length);
                    }
                    if (!options.scopedStructural) {
                        this.#committedStoreNotificationGeneration = storeGenerationAtPrepare;
                    }
                    this.#publicationVersion++;
                },
                installSubscriptions: () => {
                    if (options.scopedStructural) {
                        for (const stage of resourceStages)
                            stage.installSubscriptions();
                        if (stores.closedInputsChanged()) {
                            this.#storeNotificationGeneration++;
                            this.#schedule();
                        }
                        return [];
                    }
                    try {
                        this.#syncStoreReaders(stores);
                        return [];
                    }
                    catch (error) {
                        return [error];
                    }
                },
                runEffects: () => {
                    const errors = [];
                    try {
                        preparation.notifyPublished();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                    if (!options.scopedStructural || closedStoreOutputs ||
                        resourceStages.length > 0) {
                        try {
                            stores.notifyPublished();
                        }
                        catch (error) {
                            errors.push(error);
                        }
                    }
                    try {
                        this.#vdom.flushRefs();
                    }
                    catch (error) {
                        errors.push(error);
                    }
                    // Match the full candidate lifecycle: retired owners clean up before
                    // replacement effects publish any same-key external registrations.
                    for (const owner of retiredOwners) {
                        if (options.scopedStructural) {
                            errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
                        }
                        else
                            this.#retireCollectionRow(owner, errors);
                    }
                    for (const [owner, cache] of leafCaches) {
                        errors.push(...this.#reconcileOwnerEffects(owner, cache.ownEffects));
                    }
                    for (const stage of stages.values()) {
                        for (const [key, row] of stage.rows) {
                            if (!row)
                                continue;
                            errors.push(...this.#reconcileOwnerEffects(row.owner, row.cache.ownEffects));
                        }
                    }
                    for (const stage of resourceStages) {
                        errors.push(...stage.runEffects());
                    }
                    return errors;
                },
                discard: discardArtifacts,
                releaseArtifacts,
                effectFailureMessage: "Mixed collection candidate effects failed after publication",
            });
        }
        catch (error) {
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
            if (error instanceof HeldPublicationWait)
                return this.#prepareBlockedPublication([error.resource]);
            if (error instanceof SparseCandidateIneligible || preparationFailed ||
                resourceWasRead)
                return null;
            throw error;
        }
    }
    #flushCollectionDelta() {
        if (this.#pendingCollectionRegionKeys.size !== 1)
            return false;
        const regionKey = this.#pendingCollectionRegionKeys.values().next().value;
        if (!regionKey)
            return false;
        if (this.#collectionSnapshotFallbackKeys.has(regionKey))
            return false;
        const region = this.#liveCollectionRegions.get(regionKey);
        const parentCache = region && this.#componentCache.get(region.parentOwner);
        const ownerRegion = parentCache?.keyedRegion;
        const parentHostKey = region?.parentHostKey ?? null;
        if (!region || !region.reader || !parentCache || !ownerRegion ||
            ownerRegion.collection !== region || parentHostKey === null ||
            region.requiresOwnerRender || !region.ownerInputsAdmitted ||
            (closedCollectionSitesFor(parentCache.type) !== undefined &&
                parentCache.collectionPropsOwned !== true) ||
            !collectionOwnerApiAdmitted(region, parentCache) ||
            !componentCodeCurrent(parentCache.type))
            return false;
        const read = region.reader.read();
        if (read.status !== "available") {
            this.#count("collection.delta.reader-expired");
            return false;
        }
        if (collectionOwnerNeedsGenericRows(parentCache, read.batches)) {
            return closedCollectionRowProgramFor(parentCache.type, region.siteId, region.componentSiteId) ? "closed-row" : false;
        }
        if (this.#renderPreparation !== "repeatable" &&
            read.batches.some((batch) => batch.operations.some((operation) => operation.type !== "move" && operation.type !== "remove")))
            return false;
        if (read.batches.length === 0) {
            if (!region.reader.acknowledge(read.toVersion))
                return false;
            this.#pendingCollectionRegionKeys.delete(regionKey);
            return true;
        }
        const overlay = new Map();
        const storeGenerationAtPrepare = this.#storeNotificationGeneration;
        const originalRows = new Map();
        const activationPreviousOwners = new Map();
        const stagedOwners = [];
        const newlyAllocatedOwners = [];
        const preparedStores = [];
        const operations = [];
        const rowFor = (key) => {
            if (overlay.has(key))
                return overlay.get(key) ?? null;
            const node = region.rows.get(key)?.node;
            const componentSiteId = region.componentSiteId ??
                (node && typeof node === "object" && !Array.isArray(node) &&
                    typeof node.type === "function"
                    ? getComponentSiteId(node.type)
                    : undefined);
            if (!componentSiteId)
                return null;
            const owner = this.world.findOwner(region.parentOwner, collectionOwnerSite(region.siteId, componentSiteId), key);
            if (!node || owner === undefined)
                return null;
            const cache = this.#componentCache.get(owner);
            const hostKey = region.hostKeysByCollectionKey.get(key);
            if (!cache || !hostKey)
                return null;
            const row = { owner, hostKey, node, cache };
            originalRows.set(key, row);
            return row;
        };
        const activationPreviousOwner = (key) => {
            if (!activationPreviousOwners.has(key)) {
                const componentSiteId = region.componentSiteId;
                activationPreviousOwners.set(key, componentSiteId
                    ? this.world.findOwner(region.parentOwner, collectionOwnerSite(region.siteId, componentSiteId), key)
                    : undefined);
            }
            return activationPreviousOwners.get(key);
        };
        const prepareRow = (key, value, existingOwner, stagedInsert = false, stagedPreviousOwner) => {
            const rendered = region.renderRow(value);
            if (!rendered || Array.isArray(rendered) || typeof rendered !== "object" ||
                typeof rendered.type !== "function" ||
                (region.componentSiteId !== undefined &&
                    getComponentSiteId(rendered.type) !== region.componentSiteId))
                return null;
            const rowComponentSiteId = getComponentSiteId(rendered.type);
            const ownerSiteId = collectionOwnerSite(region.siteId, rowComponentSiteId);
            const authoredKey = rendered.props.key;
            if (authoredKey != null && String(authoredKey) !== key)
                return null;
            const owner = stagedInsert
                ? this.world.createStagedOwner(region.parentOwner, ownerSiteId, key)
                : existingOwner ??
                    this.world.resolveOwner(region.parentOwner, ownerSiteId, key);
            const staged = stagedInsert ||
                (existingOwner !== undefined && stagedOwners.includes(existingOwner));
            if (staged)
                stagedOwners.push(owner);
            else if (existingOwner === undefined)
                newlyAllocatedOwners.push(owner);
            const { key: _key, ref: _ref, ...props } = rendered.props;
            ownNumericOwnerProps(rendered.type, rendered, props);
            const collectionPropsOwned = ownCollectionOwnerProps(rendered.type, rendered, props);
            const priorCache = !staged && existingOwner !== undefined
                ? this.#componentCache.get(existingOwner)
                : undefined;
            const hostKeyScope = priorCache?.hostKeyScope ?? key;
            const scopeExplicitHostKeys = priorCache?.scopeExplicitHostKeys === true;
            const ownEffects = new Map();
            const propBoundSites = new Set();
            const storeTransaction = new StoreRenderTransaction(this.#rootId);
            const activeOwner = {
                world: this.world,
                owner,
                numericStateReadsPrimitive: true,
                collectionPropsOwned,
                collectionProps: props,
                collectionSites: closedCollectionSitesFor(rendered.type),
                stateLayout: numericOwnerPropsAdmitted(rendered.type, props, isRuntimeOwnedElement(rendered))
                    ? compiledStateLayoutFor(rendered.type) : undefined,
                propBoundSites,
                readStore: (siteId, source) => storeTransaction.read(source, `${owner}\u0000${siteId}`),
                registerEffect: (siteId, setup) => {
                    if (!siteId || typeof setup !== "function") {
                        throw new Error("Invalid effect registration");
                    }
                    const effectId = effectKey(owner, siteId);
                    if (ownEffects.has(effectId)) {
                        throw new Error(`Effect site ${siteId} was registered twice for owner ${owner}`);
                    }
                    ownEffects.set(effectId, { owner, siteId, setup });
                },
            };
            activeOwners.push(activeOwner);
            let result;
            try {
                if (this.#activeCounters) {
                    this.#count("owner.component-visits");
                    this.#count("owner.component-renders");
                }
                result =
                    rendered.type(props);
            }
            finally {
                activeOwners.pop();
            }
            preparedStores.push(storeTransaction);
            if (storeTransaction.stores.size > 0)
                return null;
            storeTransaction.discard();
            result = carryHostKeys(result, hostKeyScope, "0", undefined, scopeExplicitHostKeys, owner);
            const hostKey = singleHostRootKey(result);
            if (hostKey === null || hasNestedComponent(result))
                return null;
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
                subtreeOwners: new Set([owner]),
                ownEffects,
                propBoundSites,
            };
            return {
                owner,
                hostKey,
                node: { ...rendered, props: { ...rendered.props, key } },
                cache,
                ...(staged ? { staged: true, previousOwner: stagedPreviousOwner } : {}),
            };
        };
        const discardCandidate = () => {
            for (const transaction of preparedStores) {
                transaction.discard();
                this.#discardUncommittedStoreRoots(transaction);
            }
            for (const owner of [...new Set([...stagedOwners, ...newlyAllocatedOwners])]) {
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
                for (const operation of batch
                    .operations) {
                    if (operation.type === "remove") {
                        const row = rowFor(operation.key);
                        if (!row) {
                            discardCandidate();
                            return false;
                        }
                        if (row.cache.subtreeOwners.size !== 1 ||
                            this.#ownerHasStoreReaders(row.owner)) {
                            discardCandidate();
                            return false;
                        }
                        overlay.set(operation.key, null);
                        operations.push({ type: "remove", key: row.hostKey });
                    }
                    else if (operation.type === "move") {
                        const row = rowFor(operation.key);
                        const anchor = operation.beforeKey === null
                            ? null
                            : rowFor(operation.beforeKey);
                        if (!row || (operation.beforeKey !== null && !anchor)) {
                            discardCandidate();
                            return false;
                        }
                        operations.push({
                            type: "move",
                            key: row.hostKey,
                            beforeKey: anchor?.hostKey ?? null,
                        });
                    }
                    else {
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
                        if (previous && (previous.cache.subtreeOwners.size !== 1 ||
                            this.#ownerHasStoreReaders(previous.owner))) {
                            discardCandidate();
                            return false;
                        }
                        const anchor = isInsert && operation.beforeKey !== null
                            ? rowFor(operation.beforeKey)
                            : null;
                        if (isInsert && operation.beforeKey !== null && !anchor) {
                            discardCandidate();
                            return false;
                        }
                        const previousOwner = isInsert
                            ? activationPreviousOwner(operation.key)
                            : previous?.staged
                                ? previous.previousOwner
                                : undefined;
                        const candidate = prepareRow(operation.key, operation.value, previous?.owner, isInsert, previousOwner);
                        if (!candidate || (previous && candidate.hostKey !== previous.hostKey)) {
                            discardCandidate();
                            return false;
                        }
                        overlay.set(operation.key, candidate);
                        operations.push(isInsert
                            ? {
                                type: "insert",
                                key: candidate.hostKey,
                                beforeKey: anchor?.hostKey ?? null,
                                tree: candidate.cache.expandedResult,
                            }
                            : {
                                type: "replace",
                                key: candidate.hostKey,
                                tree: candidate.cache.expandedResult,
                            });
                    }
                }
            }
        }
        catch {
            discardCandidate();
            this.#collectionSnapshotFallbackKeys.add(regionKey);
            this.#count("collection.delta.render-fallback");
            return false;
        }
        if (!collectionOwnerApiAdmitted(region, parentCache) ||
            region.collection.version !== read.toVersion ||
            this.#storeNotificationGeneration !== storeGenerationAtPrepare ||
            this.#pendingChanges.size > 0) {
            discardCandidate();
            this.#count("collection.delta.stale-candidate");
            return false;
        }
        const capturedDeltaValues = new Map();
        for (const candidate of overlay.values()) {
            if (!candidate)
                continue;
            for (const site of candidate.cache.propBoundSites) {
                const source = this.world.scalarSource(candidate.owner, site);
                if (!source)
                    continue;
                let sites = capturedDeltaValues.get(candidate.owner);
                if (!sites)
                    capturedDeltaValues.set(candidate.owner, sites = new Map());
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
        }
        catch (error) {
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
            if (!collectionOwnerApiAdmitted(region, parentCache)) {
                throw new Error("Collection public API changed during host application");
            }
            const acknowledge = prepareCollectionReaderAcknowledgement(region.reader, read.toVersion);
            if (!acknowledge) {
                throw new Error("Collection reader cannot accept captured publication");
            }
            if (!this.world.isAlive(region.parentOwner)) {
                throw new Error("Collection parent was removed during host application");
            }
            for (const previous of originalRows.values()) {
                if (!this.world.isAlive(previous.owner)) {
                    throw new Error("Collection owner was removed during host application");
                }
            }
            const activations = new Map();
            for (const candidate of overlay.values()) {
                if (!candidate)
                    continue;
                if (!this.world.isAlive(candidate.owner) || !componentCodeCurrent(candidate.cache.type)) {
                    throw new Error("Collection owner changed during host application");
                }
                if (candidate.staged) {
                    activations.set(candidate.owner, this.world.prepareStagedOwnerActivation(candidate.owner, candidate.previousOwner));
                }
            }
            acknowledge();
            for (const [key, candidate] of overlay) {
                const previous = originalRows.get(key);
                if (candidate === null) {
                    if (previous) {
                        this.#retireCollectionRow(previous.owner, effectErrors, deferredEffects);
                    }
                    region.rows.delete(key);
                    region.hostKeysByCollectionKey.delete(key);
                    ownerRegion.outputsByKey.delete(key);
                    if (previous)
                        ownerRegion.keysByOwner.delete(previous.owner);
                    continue;
                }
                if (candidate.staged) {
                    activations.get(candidate.owner)();
                    if (candidate.previousOwner !== undefined) {
                        this.#retireCollectionRow(candidate.previousOwner, effectErrors, deferredEffects);
                    }
                }
                const oldOwner = previous?.owner;
                if (oldOwner !== undefined && oldOwner !== candidate.owner) {
                    this.#retireCollectionRow(oldOwner, effectErrors, deferredEffects);
                    ownerRegion.keysByOwner.delete(oldOwner);
                }
                const previousCache = this.#componentCache.get(candidate.owner);
                this.#componentCache.set(candidate.owner, candidate.cache);
                if (!this.#liveOwners.has(candidate.owner)) {
                    this.#count("owner.created");
                }
                this.#liveOwners.add(candidate.owner);
                for (const ancestor of this.world.ownerLineage(candidate.owner).slice(1)) {
                    const ancestorCache = this.#componentCache.get(ancestor);
                    if (ancestorCache?.subtreeOwners instanceof Set &&
                        !ancestorCache.subtreeOwners.has(candidate.owner)) {
                        ancestorCache.subtreeOwners.add(candidate.owner);
                        this.#count("collection.owner-membership-writes");
                    }
                }
                if (previousCache) {
                    this.#syncOwnerSourceValues(candidate.owner, previousCache, candidate.cache.propBoundSites, capturedDeltaValues.get(candidate.owner));
                }
                else {
                    for (const site of candidate.cache.propBoundSites) {
                        const source = this.world.scalarSource(candidate.owner, site);
                        if (source) {
                            this.#sourceValueSyncVisits++;
                            this.#lastSourceValues.set(source, capturedDeltaValues.get(candidate.owner)?.get(site) ??
                                source.value);
                        }
                    }
                }
                region.rows.set(key, {
                    node: candidate.node,
                    entry: candidate.cache.collectionEntry,
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
            for (const owner of [...new Set([...stagedOwners, ...newlyAllocatedOwners])]) {
                if (publishedOwners.has(owner))
                    continue;
                this.world.destroyOwner(owner);
                this.#dropPendingForOwner(owner);
            }
            // Drop snapshot ancestor arrays in O(depth); stable keys/maps serve sparse deltas,
            // and the next generic render rebuilds invalidated ancestors.
            for (const ancestor of this.world.ownerLineage(region.parentOwner)) {
                const cache = this.#componentCache.get(ancestor);
                if (!cache)
                    continue;
                const keyedRegion = cache.keyedRegion
                    ? { ...cache.keyedRegion, version: createKeyedOwnerVersion() }
                    : undefined;
                if (keyedRegion?.collection !== region && keyedRegion) {
                    keyedRegion.outputsByKey.clear();
                    keyedRegion.keysByOwner.clear();
                }
                this.#componentCache.set(ancestor, {
                    ...cache,
                    result: null,
                    expandedResult: null,
                    invalidatedByCollection: true,
                    ...(keyedRegion ? { keyedRegion } : {}),
                });
            }
            if (region.collection.version === read.toVersion) {
                this.#pendingCollectionRegionKeys.delete(regionKey);
            }
            else {
                this.#pendingCollectionRegionKeys.add(regionKey);
                this.#schedule();
            }
            this.#count("collection.delta-operations", operations.length);
            this.#publishDirectHostMutation();
        }
        catch (error) {
            if (this.#directPublicationPending)
                this.#failDirectHostMutation(error);
            throw error;
        }
        try {
            this.#vdom.flushRefs();
        }
        catch (error) {
            effectErrors.push(error);
        }
        for (const effect of deferredEffects) {
            try {
                effect();
            }
            catch (error) {
                effectErrors.push(error);
            }
        }
        if (effectErrors.length) {
            throw new AggregateError(effectErrors, "Collection row effect lifecycle failed after VDOM commit");
        }
        return true;
    }
    #retireCollectionRow(owner, errors, deferredEffects) {
        const cache = this.#componentCache.get(owner);
        if (!cache)
            return;
        const lineage = this.world.ownerLineage(owner).slice(1);
        this.#count("owner.retired");
        if (deferredEffects) {
            deferredEffects.push(() => {
                errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
                this.world.destroyOwner(owner);
                this.#dropPendingForOwner(owner);
            });
        }
        else {
            errors.push(...this.#reconcileOwnerEffects(owner, new Map()));
        }
        this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
        this.#componentCache.delete(owner);
        this.#liveOwners.delete(owner);
        if (!deferredEffects) {
            this.#dropPendingForOwner(owner);
            this.world.destroyOwner(owner);
        }
        for (const ancestor of lineage) {
            const ancestorCache = this.#componentCache.get(ancestor);
            if (ancestorCache?.subtreeOwners instanceof Set &&
                ancestorCache.subtreeOwners.delete(owner)) {
                this.#count("collection.owner-membership-writes");
            }
        }
    }
    #retireOwnerAccepted(owner) {
        const cache = this.#componentCache.get(owner);
        if (!cache)
            return;
        const lineage = this.world.ownerLineage(owner).slice(1);
        this.#count("owner.retired");
        this.#forgetOwnerSourceValues(owner, cache.propBoundSites);
        this.#componentCache.delete(owner);
        this.#liveOwners.delete(owner);
        this.#dropPendingForOwner(owner);
        this.world.destroyOwner(owner);
        for (const ancestor of lineage) {
            const ancestorCache = this.#componentCache.get(ancestor);
            if (ancestorCache?.subtreeOwners instanceof Set &&
                ancestorCache.subtreeOwners.delete(owner))
                this.#count("collection.owner-membership-writes");
        }
    }
    #forgetOwnerSourceValues(owner, sites) {
        for (const site of sites) {
            const source = this.world.scalarSource(owner, site);
            if (source)
                this.#lastSourceValues.delete(source);
        }
    }
    #commitHostMutation(commit, deferPublication = false) {
        const direct = !this.#candidateHostCommit;
        if (this.#codeInvalidated)
            throw new Error("Compiled module changed; remount the root");
        if (direct) {
            if (!this.#activeRootClaim) {
                throw new Error("Direct host mutation has no publication claim");
            }
            assertHostPublicationClaim(this.#hostPublicationDomain, this.#activeRootClaim);
        }
        if (direct)
            this.#vdom.beginPublication();
        let failed = false;
        let primaryFailure;
        this.#hostApplicationDepth++;
        try {
            const result = commit();
            if (this.#disposeRequested) {
                throw new Error("Root disposal was requested during host application");
            }
            if (this.#codeInvalidated)
                throw new Error("Compiled module changed during host application");
            if (direct) {
                if (deferPublication) {
                    this.#directPublicationPending = true;
                }
                else if (result !== false) {
                    this.#vdom.publishAccepted();
                    this.#publicationVersion++;
                }
                else {
                    this.#vdom.cancelPublication();
                }
            }
            return result;
        }
        catch (error) {
            failed = true;
            primaryFailure = error;
            if (direct)
                this.#vdom.failPublication();
            this.#terminalHostFailure ??= error;
            this.#terminalHostFailed = true;
            const cleanup = collectCleanupErrors([
                () => {
                    if (direct && this.#activeRootClaim) {
                        quarantineHostPublicationDomains([this.#hostPublicationDomain], this.#activeRootClaim, error);
                    }
                },
                () => this.#dropPendingDirectIntent(),
                () => this.#cancelTerminalResourceWaits(),
            ]);
            try {
                return throwWithCleanup(error, cleanup);
            }
            catch (failure) {
                primaryFailure = failure;
                throw failure;
            }
        }
        finally {
            this.#hostApplicationDepth--;
            this.#finishDeferredLifetime(failed ? { error: primaryFailure } : undefined);
        }
    }
    #publishDirectHostMutation() {
        if (!this.#directPublicationPending) {
            throw new Error("No direct host publication is pending");
        }
        if (!this.#activeRootClaim) {
            throw new Error("Direct host publication has no claim");
        }
        assertHostPublicationClaim(this.#hostPublicationDomain, this.#activeRootClaim);
        if (this.#codeInvalidated) {
            this.#failDirectHostMutation(new Error("Compiled module changed before publication"));
        }
        this.#vdom.publishAccepted();
        this.#publicationVersion++;
        this.#directPublicationPending = false;
        this.#finishDeferredLifetime();
        if (this.#deferredFlush && !this.#disposed)
            this.#schedule();
    }
    #abandonDirectHostMutation() {
        if (!this.#directPublicationPending)
            return;
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
        const cleanup = collectCleanupErrors([
            () => {
                if (this.#activeRootClaim)
                    quarantineHostPublicationDomains([this.#hostPublicationDomain], this.#activeRootClaim, error);
            },
            () => this.#dropPendingDirectIntent(),
            () => this.#cancelTerminalResourceWaits(),
        ]);
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
        if (errors.length === 1)
            throw errors[0];
        if (errors.length)
            throw new AggregateError(errors, "Resource wait cleanup failed");
    }
    #completeDeferredDispose(borrowedClaim) {
        if (!this.#disposeRequested || this.#disposed || this.#publicationBarrier ||
            this.#directPublicationPending ||
            this.#nativeCellCutActive || this.#hostApplicationDepth > 0)
            return;
        this.#disposeRequested = false;
        this.#disposeWithClaim(this.#activeRootClaim ?? borrowedClaim);
    }
    #finishDeferredLifetime(primary, priorErrors = [], borrowedClaim) {
        const errors = [...priorErrors, ...collectCleanupErrors([
                () => this.#retireCompiledInterests(),
                () => this.#completeDeferredDispose(borrowedClaim),
            ])];
        if (primary)
            throwWithCleanup(primary.error, errors);
        if (errors.length === 1)
            throw errors[0];
        if (errors.length)
            throw new AggregateError(errors, "Deferred lifetime cleanup failed");
    }
    #assertNoPublicationBarrier(operation) {
        if (this.#nativeCellCutActive || this.#hostApplicationDepth > 0 ||
            this.#directPublicationPending) {
            throw new Error(`Cannot ${operation} while a native numeric cell cut is executing`);
        }
        if (this.#publicationBarrier) {
            throw new Error(`Cannot ${operation} while a native root candidate is publishing`);
        }
    }
    #releasePublicationBarrier(candidate, borrowedClaim) {
        if (this.#publicationBarrier !== candidate) {
            this.#finishDeferredLifetime(undefined, [], borrowedClaim);
            return;
        }
        this.#publicationBarrier = null;
        this.#finishDeferredLifetime(undefined, [], borrowedClaim);
        const shouldFlush = this.#deferredFlush || this.#hasPendingWork();
        this.#deferredFlush = false;
        if (shouldFlush && !this.#disposed && !this.#disposing &&
            !this.#terminalHostFailed)
            this.#schedule();
    }
    #hasPendingWork() {
        if (this.#publicationIntents.size > 0) {
            return this.#unheldCellChanges() || this.#unheldCollectionChanges() ||
                [...this.#pendingBoundaryRetries].some((owner) => {
                    const cache = this.#componentCache.get(owner);
                    if (!cache?.pendingResource)
                        return false;
                    const child = Object.getOwnPropertyDescriptor(cache.props, "children")?.value;
                    const stores = new Set();
                    const resources = this.#boundaryResourceDependencies(child, stores);
                    return !!resources && !this.#resourceHoldWait(resources, undefined, { stores: [...stores] });
                }) ||
                (this.#storeNotificationGeneration !==
                    this.#committedStoreNotificationGeneration &&
                    this.#partialStoreAttemptGeneration !==
                        this.#storeNotificationGeneration &&
                    [...this.#liveStoreSubscriptions.keys()].some((store) => !this.#heldStore(store)));
        }
        if (this.#pendingDirectIntent) {
            return this.#pendingResourceRetry ||
                this.#pendingBoundaryRetries.size > 0 ||
                (this.#pendingDirectIntent.attemptedStoreGeneration !== null &&
                    this.#storeNotificationGeneration !==
                        this.#pendingDirectIntent.attemptedStoreGeneration);
        }
        return this.#pendingChanges.size > 0 ||
            this.#pendingCollectionRegionKeys.size > 0 ||
            this.#pendingResourceRetry ||
            this.#pendingBoundaryRetries.size > 0 ||
            this.#storeNotificationGeneration !==
                this.#committedStoreNotificationGeneration;
    }
    #schedule() {
        if (this.#disposed || this.#disposeRequested || this.#codeInvalidated ||
            this.#terminalHostFailed || this.#hostPublicationDomain.failed ||
            this.#scheduled)
            return;
        if (isHostPublicationDomainBusy(this.#hostPublicationDomain, this.#activeRootClaim ?? undefined)) {
            this.#deferredFlush = true;
            this.#waitForHostAvailability();
            return;
        }
        if (this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
            this.#directPublicationPending || this.#scopedFlushActive) {
            this.#deferredFlush = true;
            return;
        }
        this.#scheduled = true;
        this.#scheduleCommit(() => {
            if (this.#disposed || this.#disposeRequested || this.#codeInvalidated ||
                this.#terminalHostFailed || !this.#scheduled)
                return;
            this.#scheduled = false;
            if (this.#publicationBarrier || this.#hostApplicationDepth > 0 ||
                this.#directPublicationPending || this.#scopedFlushActive) {
                this.#deferredFlush = true;
                return;
            }
            if (this.#pendingDirectIntent || this.#hasPendingWork()) {
                this.flush();
            }
        });
    }
    #finishChanges(captured) {
        this.world.clearChangesThrough(captured);
        this.#pendingChanges.clearThrough(captured);
        if (this.#pendingChanges.size > 0)
            this.#schedule();
    }
    #ownerHasStoreReaders(owner) {
        for (const readerId of this.#liveStoreReaders.keys()) {
            if (this.#readerBelongsToOwner(readerId, owner))
                return true;
        }
        return false;
    }
    #syncStoreReaders(transaction, sparseStoreCandidate = false) {
        if (this.#disposed)
            return;
        const nextReaders = new Map();
        for (const [readerId, stores] of transaction.readers) {
            if (sparseStoreCandidate) {
                this.#count("store.sparse.reader-publication-map-visits");
            }
            nextReaders.set(readerId, new Set(stores));
        }
        for (const [readerId, stores] of this.#liveStoreReaders) {
            if (sparseStoreCandidate) {
                this.#count("store.sparse.reader-publication-map-visits");
            }
            const next = nextReaders.get(readerId);
            for (const store of stores) {
                if (!next?.has(store))
                    store.forgetReader(this.#rootId, readerId);
            }
        }
        this.#liveStoreReaders = nextReaders;
        this.#reconcileStoreSubscriptions(sparseStoreCandidate);
    }
    #reconcileStoreSubscriptions(sparseStoreCandidate = false) {
        if (this.#disposed)
            return;
        const nextStores = new Set();
        for (const stores of this.#liveStoreReaders.values()) {
            if (sparseStoreCandidate) {
                this.#count("store.sparse.subscription-reader-visits");
            }
            for (const store of stores)
                nextStores.add(store);
        }
        for (const stores of this.#storeDependencyLeases.values()) {
            for (const store of stores)
                nextStores.add(store);
        }
        for (const [store, unsubscribe] of this.#liveStoreSubscriptions) {
            if (nextStores.has(store))
                continue;
            unsubscribe();
            if ((this.#candidateStoreHolds.get(store) ?? 0) === 0) {
                store.detachRoot(this.#rootId);
            }
            this.#liveStoreSubscriptions.delete(store);
        }
        for (const store of nextStores) {
            if (this.#liveStoreSubscriptions.has(store))
                continue;
            this.#liveStoreSubscriptions.set(store, store.subscribe(this.#rootId, () => {
                this.#storeNotificationGeneration++;
                this.#schedule();
            }));
        }
    }
    #syncResourceSubscriptions(resources) {
        const wanted = new Set(resources.filter((resource) => resource.status.status === "pending"));
        for (const [resource, subscription] of this.#liveResourceSubscriptions) {
            if (wanted.has(resource))
                continue;
            subscription.unsubscribe();
            this.#liveResourceSubscriptions.delete(resource);
        }
        for (const resource of wanted) {
            let boundary = null;
            for (const [owner, cache] of this.#componentCache) {
                if (!cache.nativeBoundary || cache.pendingResource !== resource)
                    continue;
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
                    if (subscription?.boundary !== null && subscription?.boundary !== undefined) {
                        this.#pendingBoundaryRetries.add(subscription.boundary);
                    }
                    else
                        this.#pendingResourceRetry = true;
                    this.#schedule();
                }
            });
            this.#liveResourceSubscriptions.set(resource, { unsubscribe, boundary });
        }
    }
    #discardUncommittedStoreRoots(transaction) {
        for (const store of transaction.stores) {
            if (!this.#liveStoreSubscriptions.has(store) &&
                (this.#candidateStoreHolds.get(store) ?? 0) === 0) {
                store.detachRoot(this.#rootId);
            }
        }
    }
    #releaseCandidateStoreHolds(stores) {
        for (const store of stores) {
            const count = this.#candidateStoreHolds.get(store) ?? 0;
            if (count > 1) {
                this.#candidateStoreHolds.set(store, count - 1);
                continue;
            }
            this.#candidateStoreHolds.delete(store);
            if (!this.#liveStoreSubscriptions.has(store)) {
                store.detachRoot(this.#rootId);
            }
        }
    }
    #dropPendingForOwner(owner) {
        this.#pendingChanges.dropOwner(owner);
    }
    #captureOwnerSourceValues(owner, sites) {
        const captured = new Map();
        for (const site of sites) {
            const source = this.world.scalarSource(owner, site);
            if (source)
                captured.set(site, source.value);
        }
        return captured;
    }
    #syncLastSourceValues(caches, captured) {
        if (this.#disposed)
            return;
        const live = new Set();
        for (const [owner, cache] of caches) {
            for (const site of cache.propBoundSites) {
                this.#sourceValueSyncVisits++;
                const source = this.world.scalarSource(owner, site);
                if (!source)
                    continue;
                live.add(source);
                this.#lastSourceValues.set(source, captured
                    ? captured.get(owner)?.get(site) ??
                        this.#lastSourceValues.get(source) ?? source.value
                    : source.value);
            }
        }
        for (const source of this.#lastSourceValues.keys()) {
            if (!live.has(source))
                this.#lastSourceValues.delete(source);
        }
    }
    #syncOwnerSourceValues(owner, previous, nextSites, captured) {
        for (const site of previous.propBoundSites) {
            if (nextSites.has(site))
                continue;
            const source = this.world.scalarSource(owner, site);
            if (source)
                this.#lastSourceValues.delete(source);
        }
        for (const site of nextSites) {
            this.#sourceValueSyncVisits++;
            const source = this.world.scalarSource(owner, site);
            if (source) {
                this.#lastSourceValues.set(source, captured?.get(site) ?? source.value);
            }
        }
    }
    #applyCandidateNumericWrites(writes) {
        const pending = writes.filter((write) => this.world.isAlive(write.owner) &&
            this.world.version(write.owner, write.site) === write.version &&
            this.world.scalarSource(write.owner, write.site) === write.source &&
            this.#vdom.hasBoundSource(write.source));
        if (pending.length === 0)
            return;
        // VDOM validates and updates sources before writers; refs and effects wait until
        // the source-to-prop update and candidate publication succeed.
        const updates = pending.map(({ source, current }) => [source, current]);
        for (const write of pending)
            write.source.value = write.previous;
        try {
            this.#vdom.setSources(updates);
        }
        finally {
            // A writer can synchronously trigger another state update. Preserve
            // newer values; otherwise restore this candidate's captured snapshot.
            for (const write of pending) {
                if (this.world.isAlive(write.owner) &&
                    this.world.version(write.owner, write.site) === write.version &&
                    this.world.scalarSource(write.owner, write.site) === write.source)
                    write.source.value = write.current;
            }
        }
    }
    #flushNumericSources(changes, previousValues = this.#lastSourceValues) {
        const pending = [];
        const seenSources = new Set();
        for (const change of changes) {
            const source = this.world.scalarSourceForChange(change);
            if (!source)
                return false;
            const previous = previousValues.get(source);
            if (previous === undefined)
                return false;
            if (seenSources.has(source))
                continue;
            seenSources.add(source);
            pending.push({
                change,
                source,
                previous,
                current: source.value,
            });
        }
        // Resolve every source and its prior committed value before touching any
        // shared source handle. An unavailable binding can safely take fallback.
        const updates = pending.map(({ source, current }) => [source, current]);
        for (const { source, previous } of pending)
            source.value = previous;
        try {
            // Host writers can fail after earlier writes. Propagate that failure
            // with state pending; fallback or retry could apply a second sequence.
            const wrote = this.#commitHostMutation(() => this.#vdom.setSources(updates), true);
            try {
                for (const { source, current } of pending) {
                    this.#lastSourceValues.set(source, current);
                }
                this.#finishChanges(changes);
                if (this.#directPublicationPending)
                    this.#publishDirectHostMutation();
            }
            catch (error) {
                if (this.#directPublicationPending)
                    this.#failDirectHostMutation(error);
                throw error;
            }
            return wrote || changes.length > 0;
        }
        finally {
            for (const write of pending) {
                if (this.world.isAlive(write.change.owner) &&
                    this.world.versionForChange(write.change) === write.change.version &&
                    this.world.scalarSourceForChange(write.change) === write.source)
                    write.source.value = write.current;
            }
        }
    }
    #clearNumericProgramBuffers() {
        for (let index = 0; index < this.#numericProgramUsedCount; index++) {
            this.#numericProgramSources[index] = undefined;
        }
        this.#numericProgramUsedCount = 0;
    }
    #clearNativeRowBuffers() {
        for (let index = 0; index < this.#nativeRowUsedCount; index++) {
            this.#nativeRowTokens[index] = undefined;
            this.#nativeRowViews[index] = undefined;
        }
        this.#nativeRowUsedCount = 0;
        if (this.#disposed) {
            this.#nativeRowTokens.length = 0;
            this.#nativeRowViews.length = 0;
            this.#nativeChangedRows = new Uint32Array(0);
            this.#nativeChangedSlots = new Uint32Array(0);
        }
    }
    #acknowledgeNativeCellCut(count) {
        if (this.#disposed)
            return;
        for (let index = 0; index < count; index++) {
            this.#lastSourceValues.set(this.#numericProgramSources[index], this.#numericProgramCurrentValues[index]);
        }
        this.world.clearCellChangesThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
        this.#pendingChanges.clearNativeThrough(this.#nativeCellHandles, this.#nativeCellVersions, count);
    }
    /** Execute one compiler-owned row plan per affected committed owner. */
    #tryCommitNativeRows(count) {
        if (this.#nativeChangedRows.length < count) {
            let capacity = Math.max(16, this.#nativeChangedRows.length);
            while (capacity < count)
                capacity *= 2;
            this.#nativeChangedRows = new Uint32Array(capacity);
            this.#nativeChangedSlots = new Uint32Array(capacity);
        }
        // These epochs are Root-local: grafted roots never share cut bookkeeping.
        if (this.#nativeRowEpoch === Number.MAX_SAFE_INTEGER) {
            this.#nativeRowPrograms = new WeakMap();
            this.#nativeRowEpoch = 0;
        }
        const epoch = ++this.#nativeRowEpoch;
        let accepted = false;
        try {
            for (let index = 0; index < count; index++) {
                const handle = this.#nativeCellHandles[index];
                const cache = this.#componentCache.get(handle.owner);
                if (!cache)
                    return null;
                const view = this.world.numericRowForCell(handle, this.#nativeCellVersions[index]);
                if (!view || !view.layout.programId)
                    return null;
                let prepared = this.#nativeRowPrograms.get(view.rowIdentity);
                if (!this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
                    return null;
                }
                if (!prepared) {
                    const token = this.#vdom.prepareNumericRowProgram(view);
                    if (!token)
                        return null;
                    prepared = { token, epoch: 0, index: 0 };
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
                this.#numericProgramCurrentValues[index] =
                    view.columns[view.slot].values[view.row];
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
                // A binding edit can stale a cached VDOM token. Recheck the entire
                // World cut before rebuilding any row token; never recapture values.
                for (let index = 0; index < count; index++) {
                    const handle = this.#nativeCellHandles[index];
                    const cache = this.#componentCache.get(handle.owner);
                    if (!cache || !this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
                        return null;
                    }
                    const current = this.world.numericRowForCell(handle, this.#nativeCellVersions[index]);
                    const prior = this.#nativeRowViews[this.#nativeChangedRows[index]];
                    if (!current || current.rowIdentity !== prior.rowIdentity ||
                        current.slot !== this.#nativeChangedSlots[index] ||
                        current.source !== this.#numericProgramSources[index])
                        return null;
                }
                for (let index = 0; index < this.#nativeRowUsedCount; index++) {
                    const view = this.#nativeRowViews[index];
                    const token = this.#vdom.prepareNumericRowProgram(view);
                    if (!token)
                        return null;
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
            }
            catch (error) {
                if (this.#directPublicationPending)
                    this.#failDirectHostMutation(error);
                throw error;
            }
            return wrote || count > 0;
        }
        finally {
            this.#clearNativeRowBuffers();
            if (!accepted)
                this.#clearNumericProgramBuffers();
        }
    }
    /** Capture exact published lane cells; null keeps the existing fallback cut. */
    #tryCommitNativeLanes(count) {
        let accepted = false;
        try {
            for (let index = 0; index < count; index++) {
                const handle = this.#nativeCellHandles[index];
                const cache = this.#componentCache.get(handle.owner);
                if (!cache)
                    return null;
                const lane = this.world.numericLaneForCell(handle, this.#nativeCellVersions[index]);
                if (!lane)
                    return null;
                let prepared = this.#nativeLanePrograms.get(lane);
                if (!this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
                    return null;
                }
                if (!prepared) {
                    const source = this.world.scalarSourceForCell(handle);
                    if (!source)
                        return null;
                    const token = this.#vdom.prepareNumericCellProgram(source, lane.column, lane.row);
                    if (!token)
                        return null;
                    prepared = { token, source };
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
                // On a mutation-free preflight decline, refresh tokens and retry once with
                // the same captured values.
                for (let index = 0; index < count; index++) {
                    const handle = this.#nativeCellHandles[index];
                    const cache = this.#componentCache.get(handle.owner);
                    if (!cache || !this.#compiledOwnerSiteCertified(handle.owner, cache, handle.site)) {
                        return null;
                    }
                    const lane = this.world.numericLaneForCell(handle, this.#nativeCellVersions[index]);
                    if (!lane)
                        return null;
                    this.#nativeLanePrograms.delete(lane);
                    const source = this.world.scalarSourceForCell(handle);
                    if (!source)
                        return null;
                    const token = this.#vdom.prepareNumericCellProgram(source, lane.column, lane.row);
                    if (!token)
                        return null;
                    this.#nativeLanePrograms.set(lane, { token, source });
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
                // A repeated preflight decline preserves the generic fallback path.
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
            }
            catch (error) {
                if (this.#directPublicationPending)
                    this.#failDirectHostMutation(error);
                throw error;
            }
            return wrote || count > 0;
        }
        finally {
            if (!accepted)
                this.#clearNumericProgramBuffers();
        }
    }
    /** Snapshot-free route for a fully native, compiler-approved numeric cut. */
    #tryFlushNativeCellCut() {
        const capacity = this.#pendingChanges.size;
        if (this.#nativeCellHandles.length < capacity) {
            this.#nativeCellHandles.length = capacity;
            this.#nativeCellVersions.length = capacity;
        }
        if (this.#nativeLaneTokens.length < capacity) {
            this.#nativeLaneTokens.length = capacity;
        }
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
                if (!cache || !this.#compiledPropSitesForCache(handle.owner, cache).has(handle.site) ||
                    !source || !this.#lastSourceValues.has(source) ||
                    !this.#vdom.hasSourceProgram(source) || currentVersion !== version)
                    return false;
                this.#numericProgramSources[index] = source;
                this.#numericProgramCurrentValues[index] = source.value;
                this.#numericProgramPreviousValues[index] = this.#lastSourceValues.get(source);
                this.#numericProgramUsedCount = index + 1;
            }
            this.#count("numeric.program-source-buffer-capacity", this.#numericProgramSources.length);
            if (this.#invalidation) {
                for (let index = 0; index < count; index++) {
                    const slot = this.#invalidation.sourceSlots.get(this.#nativeCellHandles[index].site);
                    if (slot !== undefined) {
                        this.#invalidation.dispatcher.invalidateSourceSlot(slot);
                    }
                }
                this.#invalidation.dispatcher.flush(() => { });
            }
            for (let index = 0; index < count; index++) {
                this.#numericProgramSources[index].value =
                    this.#numericProgramPreviousValues[index];
            }
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
                }
                catch (error) {
                    if (this.#directPublicationPending) {
                        this.#failDirectHostMutation(error);
                    }
                    throw error;
                }
                committed = wrote || count > 0;
                return committed;
            }
            finally {
                for (let index = 0; index < count; index++) {
                    const handle = this.#nativeCellHandles[index];
                    const source = this.#numericProgramSources[index];
                    if (!this.#disposed &&
                        this.world.versionForCell(handle) ===
                            this.#nativeCellVersions[index] &&
                        this.world.scalarSourceForCell(handle) === source)
                        source.value = this.#numericProgramCurrentValues[index];
                }
            }
        }
        finally {
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
            }
            else if (!this.#terminalHostFailed &&
                (this.#deferredFlush || (committed && this.#hasPendingWork()))) {
                this.#deferredFlush = false;
                this.#schedule();
            }
        }
    }
    #clearNativeCellCutBuffers(count = this.#nativeCellHandles.length) {
        for (let index = 0; index < count; index++) {
            this.#nativeCellHandles[index] = undefined;
            this.#nativeCellVersions[index] = 0;
            this.#nativeLaneTokens[index] = undefined;
        }
    }
    #expand(node, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, path, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch = false, boundaryHostScope, collectionEntry) {
        if (node == null || node === false || typeof node === "string" ||
            typeof node === "number")
            return node;
        if (Array.isArray(node)) {
            const regionId = getKeyedOwnerRegionId(node);
            const version = getKeyedOwnerVersion(node);
            const collectionDescriptor = version === null
                ? undefined
                : collectionRegionDescriptors.get(version);
            const outputsByKey = version === null ||
                (this.#keyedOwnerReuseMode !== "token" && !collectionDescriptor)
                ? null
                : new Map();
            const keysByOwner = outputsByKey ? new Map() : null;
            let regionSiteId = collectionDescriptor?.componentSiteId ??
                null;
            let validRegion = outputsByKey !== null;
            const siteOrdinals = new Map();
            let changed = false;
            const collectionKeys = collectionDescriptor
                ? [...collectionDescriptor.rows.keys()]
                : [];
            const siblingPending = [];
            const children = node.map((child, index) => {
                const childPath = `${path}/${index}`;
                const siteId = child && !Array.isArray(child) &&
                    typeof child === "object" && child.type === Suspense
                    ? `@suspense:${String(child.props.__nativeBoundarySite ?? "anonymous")}`
                    : child && !Array.isArray(child) && typeof child === "object" &&
                        typeof child.type === "function"
                        ? getComponentSiteId(child.type)
                        : "";
                const ordinal = siteId ? (siteOrdinals.get(siteId) ?? 0) : 0;
                if (siteId)
                    siteOrdinals.set(siteId, ordinal + 1);
                const journalMark = protectedBranch
                    ? expansionJournal?.checkpoint()
                    : undefined;
                const ownerMark = protectedBranch
                    ? ownerPreparation?.checkpoint()
                    : undefined;
                const storeMark = protectedBranch
                    ? storeTransaction.checkpoint()
                    : undefined;
                let expanded;
                try {
                    expanded = this.#expand(child, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, siteId ? `${childPath}#${ordinal}` : childPath, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionDescriptor?.siteId ?? collectionOwnerScope, collectionDescriptor
                        ? !siteId ? collectionKeys[index] : undefined
                        : collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, false, undefined, collectionDescriptor?.rows.get(collectionKeys[index])?.entry);
                }
                catch (error) {
                    if (!isPendingResource(error) && !(error instanceof ResourceRejection))
                        throw error;
                    if (storeMark === undefined)
                        throw error;
                    const branchReaders = storeMark === undefined
                        ? new Map()
                        : storeTransaction.readersSince(storeMark);
                    if (ownerMark)
                        ownerPreparation?.rollbackTo(ownerMark);
                    if (storeMark !== undefined) {
                        storeTransaction.rollbackTo(storeMark);
                        if (branchReaders.size) {
                            storeTransaction.preserveCapturedReaders(branchReaders);
                        }
                    }
                    if (journalMark !== undefined) {
                        expansionJournal?.rollback(journalMark);
                    }
                    if (error instanceof ResourceRejection)
                        throw error;
                    siblingPending.push(error);
                    return child;
                }
                finally {
                    if (storeMark !== undefined) {
                        storeTransaction.releaseCheckpoint(storeMark);
                    }
                    if (ownerMark)
                        ownerPreparation?.releaseCheckpoint(ownerMark);
                }
                if (expanded !== child)
                    changed = true;
                if (outputsByKey && regionId !== null) {
                    if (!child || Array.isArray(child) || typeof child !== "object" ||
                        typeof child.type !== "function") {
                        validRegion = false;
                    }
                    else {
                        const childSiteId = getComponentSiteId(child.type);
                        const rawKey = child.props.key;
                        if ((collectionDescriptor
                            ? regionSiteId !== null && regionSiteId !== childSiteId
                            : childSiteId !== regionId) ||
                            rawKey == null ||
                            (regionSiteId !== null && regionSiteId !== childSiteId)) {
                            validRegion = false;
                        }
                        else {
                            regionSiteId = childSiteId;
                            const key = String(rawKey);
                            const owner = ownerPreparation?.findOwner?.(parentOwner, collectionDescriptor
                                ? collectionOwnerSite(collectionDescriptor.siteId, childSiteId)
                                : childSiteId, key) ?? (ownerPreparation ? undefined : this.world.findOwner(parentOwner, collectionDescriptor
                                ? collectionOwnerSite(collectionDescriptor.siteId, childSiteId)
                                : childSiteId, key));
                            if (outputsByKey.has(key) || owner === undefined) {
                                validRegion = false;
                            }
                            else {
                                outputsByKey.set(key, expanded);
                                keysByOwner?.set(owner, key);
                            }
                        }
                    }
                }
                return expanded;
            });
            if (siblingPending.length)
                throw siblingPending[0];
            let collectedCollection;
            if (collectionDescriptor && collectionDescriptor.siteId === regionId &&
                collectionDescriptor.rows.size === children.length) {
                const hostKeysByCollectionKey = new Map();
                const liveRows = new Map();
                let index = 0;
                for (const collectionKey of collectionDescriptor.rows.keys()) {
                    liveRows.set(collectionKey, {
                        node: node[index],
                        entry: collectionDescriptor.rows.get(collectionKey)?.entry,
                    });
                    const hostKey = singleHostRootKey(children[index++] ?? null);
                    if (hostKey !== null) {
                        hostKeysByCollectionKey.set(collectionKey, hostKey);
                    }
                }
                collectedCollection = {
                    ...collectionDescriptor,
                    rows: liveRows,
                    parentOwner,
                    parentHostKey: null,
                    hostKeysByCollectionKey,
                };
                if (this.#collectedCollectionRegions) {
                    if (expansionJournal) {
                        expansionJournal.set(this.#collectedCollectionRegions, `${parentOwner}\u0000${collectedCollection.siteId}`, collectedCollection);
                    }
                    else {
                        this.#collectedCollectionRegions.set(`${parentOwner}\u0000${collectedCollection.siteId}`, collectedCollection);
                    }
                }
            }
            if (validRegion && outputsByKey && regionId !== null && version !== null &&
                (regionSiteId !== null || collectionDescriptor !== undefined) &&
                outputsByKey.size === node.length) {
                const collected = {
                    regionId,
                    version,
                    componentSiteId: regionSiteId ??
                        collectionDescriptor?.componentSiteId ?? "",
                    outputsByKey,
                    keysByOwner: keysByOwner,
                    ...(collectedCollection &&
                        !collectedCollection.requiresOwnerRender &&
                        collectedCollection.componentSiteId
                        ? { collection: collectedCollection }
                        : {}),
                };
                if (this.#collectedKeyedRegions) {
                    if (expansionJournal) {
                        expansionJournal.set(this.#collectedKeyedRegions, parentOwner, collected);
                    }
                    else
                        this.#collectedKeyedRegions.set(parentOwner, collected);
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
            const identityKey = props.key == null
                ? `@slot:${siteId}:${ordinal}`
                : String(props.key);
            const ownerSite = `\u0000native-suspense:${siteId}`;
            const priorBoundaryOwner = ownerPreparation
                ? ownerPreparation.findOwner(parentOwner, ownerSite, identityKey)
                : this.world.findOwner(parentOwner, ownerSite, identityKey);
            const boundaryOwner = ownerPreparation
                ? ownerPreparation.resolveOwner(parentOwner, ownerSite, identityKey)
                : this.world.resolveOwner(parentOwner, ownerSite, identityKey);
            if (!priorBoundaryOwner && !ownerPreparation && expansionJournal) {
                expansionJournal.undo(() => {
                    if (this.world.isAlive(boundaryOwner)) {
                        this.world.destroyOwner(boundaryOwner);
                    }
                });
            }
            if (!this.#liveOwners.has(boundaryOwner)) {
                if (expansionJournal) {
                    expansionJournal.push(createdOwners, boundaryOwner);
                }
                else
                    createdOwners.push(boundaryOwner);
            }
            if (expansionJournal)
                expansionJournal.add(nextOwners, boundaryOwner);
            else
                nextOwners.add(boundaryOwner);
            if (!subtreeOwnersByOwner.has(boundaryOwner)) {
                if (expansionJournal) {
                    expansionJournal.set(subtreeOwnersByOwner, boundaryOwner, new Set([boundaryOwner]));
                }
                else {
                    subtreeOwnersByOwner.set(boundaryOwner, new Set([boundaryOwner]));
                }
            }
            for (const ancestor of ownerPath) {
                const descendants = subtreeOwnersByOwner.get(ancestor);
                if (descendants) {
                    if (expansionJournal) {
                        expansionJournal.add(descendants, boundaryOwner);
                    }
                    else
                        descendants.add(boundaryOwner);
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
                    ownEffects: new Map(),
                    propBoundSites: new Set(),
                    nativeBoundary: true,
                    ...(pendingResource ? { pendingResource } : {}),
                };
                if (expansionJournal) {
                    expansionJournal.set(nextComponentCache, boundaryOwner, cache);
                }
                else
                    nextComponentCache.set(boundaryOwner, cache);
                return output;
            };
            const heldBoundary = boundaryState?.held?.boundaries.get(boundaryOwner);
            if (heldBoundary) {
                const accepted = heldBoundary.cache;
                if (this.#componentCache.get(boundaryOwner) !== accepted ||
                    !sameClosedBoundaryProps(node, accepted.props) ||
                    !accepted.nativeBoundary ||
                    accepted.pendingResource !== heldBoundary.resource ||
                    [...accepted.subtreeOwners].some((owner) => !this.#liveOwners.has(owner) ||
                        !this.#componentCache.has(owner))) {
                    boundaryState.blocked = true;
                    return accepted.expandedResult;
                }
                const heldOwners = accepted.subtreeOwners;
                for (const heldOwner of heldOwners) {
                    const cache = this.#componentCache.get(heldOwner);
                    nextOwners.add(heldOwner);
                    nextComponentCache.set(heldOwner, cache);
                    for (const [key, effect] of cache.ownEffects)
                        nextEffects.set(key, effect);
                    if (cache.nativeBoundary)
                        boundaryState.visited.add(String(heldOwner));
                    for (const ancestor of ownerPath) {
                        subtreeOwnersByOwner.get(ancestor)?.add(heldOwner);
                    }
                }
                const heldReaders = new Map();
                for (const [readerId, stores] of this.#liveStoreReaders) {
                    if ([...heldOwners].some((owner) => this.#readerBelongsToOwner(readerId, owner)))
                        heldReaders.set(readerId, stores);
                }
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
                    const snapshot = {
                        tree: props.children ?? null,
                    };
                    if (expansionJournal) {
                        expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
                    }
                    else
                        boundaryPrimaries.set(boundaryKey, snapshot);
                }
                storeTransaction.releaseCheckpoint(storeMark);
                if (ownerMark)
                    ownerPreparation?.releaseCheckpoint(ownerMark);
                return recordBoundaryOutput(primary);
            }
            catch (error) {
                if (!isPendingResource(error) && !(error instanceof ResourceRejection)) {
                    storeTransaction.releaseCheckpoint(storeMark);
                    if (ownerMark)
                        ownerPreparation?.releaseCheckpoint(ownerMark);
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
                    // Boundary-scoped IDs keep captured subscriptions separate when
                    // lexical sites read from different sources.
                    const pendingReaderDependencies = new Map([...suspendedReaders].map(([readerId, stores]) => [
                        `\u0000suspense-pending:${boundaryKey}:${readerId}`,
                        stores,
                    ]));
                    storeTransaction.preserveCapturedReaders(pendingReaderDependencies);
                }
                const previous = boundaryPrimaries?.get(boundaryKey);
                if (isPendingResource(error) && previous) {
                    // Retain the committed raw primary by evaluating it against this
                    // candidate's current owner state and pinned store projection.
                    const retainedStoreMark = storeTransaction.checkpoint();
                    const retainedOwnerMark = ownerPreparation?.checkpoint();
                    const retainedJournalMark = branchJournal.checkpoint();
                    try {
                        const retained = this.#expand(previous.tree, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense-retained:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, branchJournal, boundaryPrimaries, boundaryState, true, boundaryOwner);
                        // Successful re-expansion records actual reads as retained dependencies,
                        // naturally releasing conditional reads removed by this draft.
                        storeTransaction.releaseCheckpoint(retainedStoreMark);
                        if (retainedOwnerMark) {
                            ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
                        }
                        return recordBoundaryOutput(retained);
                    }
                    catch (retainedError) {
                        if (!isPendingResource(retainedError) &&
                            !(retainedError instanceof ResourceRejection)) {
                            storeTransaction.releaseCheckpoint(retainedStoreMark);
                            if (retainedOwnerMark) {
                                ownerPreparation?.releaseCheckpoint(retainedOwnerMark);
                            }
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
                    if (boundaryState)
                        boundaryState.blocked = true;
                    return null;
                }
                const fallback = error instanceof ResourceRejection
                    ? props.error?.(error.reason) ?? null
                    : props.pending ?? props.fallback ?? null;
                const expandedFallback = this.#expand(fallback, boundaryOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/suspense-fallback:${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch, boundaryOwner);
                if (error instanceof ResourceRejection && boundaryPrimaries) {
                    const snapshot = { tree: fallback };
                    if (expansionJournal) {
                        expansionJournal.set(boundaryPrimaries, boundaryKey, snapshot);
                    }
                    else
                        boundaryPrimaries.set(boundaryKey, snapshot);
                }
                return recordBoundaryOutput(expandedFallback, isPendingResource(error) ? error.resource : undefined);
            }
            finally {
                ownerPath.pop();
                if (!expansionJournal)
                    branchJournal.clear();
            }
        }
        if (typeof node.type === "function") {
            if (!componentCodeCurrent(node.type)) {
                throw new Error("Compiled component revision is obsolete; remount with current code");
            }
            if (this.#activeCounters)
                this.#count("owner.component-visits");
            const siteId = getComponentSiteId(node.type);
            const lastSegment = path.slice(path.lastIndexOf("/") + 1);
            const ordinal = Number(lastSegment.split("#").at(-1)) || 0;
            const ownerKey = keyedIdentity(node, siteId, ordinal);
            // Scope host keys only at native boundaries. Ordinary owner keys must
            // remain canonical so sparse keyed-region commits target the same hosts.
            let key = boundaryHostScope === undefined
                ? String(ownerKey)
                : `${boundaryHostScope}\u0000${String(ownerKey)}`;
            const ownerSite = collectionOwnerScope
                ? collectionOwnerSite(collectionRowScopeKey === undefined
                    ? collectionOwnerScope
                    : `${collectionOwnerScope}#row:${collectionRowScopeKey}`, siteId)
                : siteId;
            const acceptedOwner = collectionOwnerScope && collectionEntry &&
                ownerPreparation
                ? ownerPreparation.findOwner(parentOwner, ownerSite, ownerKey)
                : undefined;
            const acceptedEntry = acceptedOwner === undefined
                ? undefined
                : this.#componentCache.get(acceptedOwner)?.collectionEntry;
            if (acceptedEntry !== undefined && collectionEntry !== undefined &&
                acceptedEntry !== collectionEntry)
                ownerPreparation?.replaceOwner(parentOwner, ownerSite, ownerKey);
            const priorOwner = ownerPreparation ? undefined : this.world.findOwner(parentOwner, ownerSite, ownerKey);
            const owner = ownerPreparation
                ? ownerPreparation.resolveOwner(parentOwner, ownerSite, ownerKey)
                : this.world.resolveOwner(parentOwner, ownerSite, ownerKey);
            if (!ownerPreparation && priorOwner === undefined && expansionJournal) {
                expansionJournal.undo(() => {
                    if (this.world.isAlive(owner))
                        this.world.destroyOwner(owner);
                });
            }
            if (!this.#liveOwners.has(owner)) {
                if (expansionJournal)
                    expansionJournal.push(createdOwners, owner);
                else
                    createdOwners.push(owner);
                if (this.#activeCounters)
                    this.#count("owner.created");
            }
            if (expansionJournal)
                expansionJournal.add(nextOwners, owner);
            else
                nextOwners.add(owner);
            if (!subtreeOwnersByOwner.has(owner)) {
                if (expansionJournal) {
                    expansionJournal.set(subtreeOwnersByOwner, owner, new Set([owner]));
                }
                else
                    subtreeOwnersByOwner.set(owner, new Set([owner]));
            }
            for (const ancestor of ownerPath) {
                const descendants = subtreeOwnersByOwner.get(ancestor);
                if (descendants) {
                    if (expansionJournal)
                        expansionJournal.add(descendants, owner);
                    else
                        descendants.add(owner);
                }
            }
            const { key: _key, ref: _ref, ...componentProps } = node.props;
            ownNumericOwnerProps(node.type, node, componentProps);
            const collectionPropsOwned = ownCollectionOwnerProps(node.type, node, componentProps);
            const numericPropsAdmitted = numericOwnerPropsAdmitted(node.type, componentProps, isRuntimeOwnedElement(node));
            const cached = this.#componentCache.get(owner);
            const scopeExplicitHostKeys = cached?.scopeExplicitHostKeys === true ||
                (collectionEntry !== undefined && acceptedOwner !== undefined &&
                    acceptedOwner !== owner);
            if (collectionEntry !== undefined) {
                if (cached?.hostKeyScope !== undefined) {
                    key = String(cached.hostKeyScope);
                }
                else if (acceptedOwner !== undefined && acceptedOwner !== owner) {
                    key = `${key}\u0000owner:${owner}`;
                }
            }
            const propsUnchanged = cached !== undefined &&
                cached.numericPropsAdmitted === numericPropsAdmitted &&
                cached.collectionPropsOwned === collectionPropsOwned &&
                shallowEqual(cached.props, componentProps);
            const shouldRender = forceRender || dirtyOwners.has(owner) || !cached ||
                cached.invalidatedByCollection === true ||
                cached.type !== node.type || !propsUnchanged;
            ownerPath.push(owner);
            try {
                if (!shouldRender && cached && !relevantOwners.has(owner) &&
                    !cached.invalidatedBySparseStore) {
                    if (this.#activeCounters) {
                        this.#count("owner.cached-reused", cached.subtreeOwners.size);
                    }
                    for (const cachedOwner of cached.subtreeOwners) {
                        if (expansionJournal)
                            expansionJournal.add(nextOwners, cachedOwner);
                        else
                            nextOwners.add(cachedOwner);
                        const childCache = this.#componentCache.get(cachedOwner);
                        if (!childCache) {
                            throw new Error(`Missing component cache for owner ${cachedOwner}`);
                        }
                        if (expansionJournal) {
                            expansionJournal.set(nextComponentCache, cachedOwner, childCache);
                        }
                        else
                            nextComponentCache.set(cachedOwner, childCache);
                        if (childCache.nativeBoundary && boundaryState) {
                            const boundaryKey = String(cachedOwner);
                            if (!boundaryState.visited.has(boundaryKey)) {
                                if (expansionJournal) {
                                    expansionJournal.add(boundaryState.visited, boundaryKey);
                                }
                                else
                                    boundaryState.visited.add(boundaryKey);
                            }
                        }
                        for (const [registeredKey, effect] of childCache.ownEffects) {
                            if (expansionJournal) {
                                expansionJournal.set(nextEffects, registeredKey, effect);
                            }
                            else
                                nextEffects.set(registeredKey, effect);
                        }
                        if (cachedOwner !== owner) {
                            for (const ancestor of ownerPath) {
                                const descendants = subtreeOwnersByOwner.get(ancestor);
                                if (descendants) {
                                    if (expansionJournal) {
                                        expansionJournal.add(descendants, cachedOwner);
                                    }
                                    else
                                        descendants.add(cachedOwner);
                                }
                            }
                        }
                    }
                    return cached.expandedResult;
                }
                let result = cached?.result;
                let ownEffects = cached?.ownEffects;
                let propBoundSites = cached?.propBoundSites ??
                    new Set();
                let numericStateAdmitted = cached?.numericStateAdmitted === true;
                if (shouldRender) {
                    const prepared = cached?.numericPropsAdmitted === numericPropsAdmitted &&
                        cached?.collectionPropsOwned === collectionPropsOwned &&
                        (cached?.collectionPropsOwned !== true || propsUnchanged)
                        ? this.#preparedRenders.get(owner) ?? null : null;
                    if (prepared) {
                        result = prepared.result;
                        ownEffects = prepared.ownEffects;
                        propBoundSites = prepared.propBoundSites;
                        numericStateAdmitted = prepared.numericStateAdmitted;
                        for (const [registeredKey, effect] of ownEffects) {
                            if (expansionJournal) {
                                expansionJournal.set(nextEffects, registeredKey, effect);
                            }
                            else
                                nextEffects.set(registeredKey, effect);
                        }
                    }
                    else {
                        ownEffects = new Map();
                        const nextPropBoundSites = new Set();
                        propBoundSites = nextPropBoundSites;
                        const activeOwner = {
                            world: ownerPreparation ?? this.world,
                            owner,
                            numericStateReadsPrimitive: true,
                            collectionPropsOwned,
                            collectionProps: componentProps,
                            collectionSites: closedCollectionSitesFor(node.type),
                            stateLayout: numericOwnerPropsAdmitted(node.type, componentProps, isRuntimeOwnedElement(node))
                                ? compiledStateLayoutFor(node.type) : undefined,
                            propBoundSites: nextPropBoundSites,
                            readStore: (storeSiteId, source) => storeTransaction.read(source, `${owner}\u0000${storeSiteId}`),
                            readResource: (source) => {
                                if (!resourceReads) {
                                    throw new Error("Resource reads require a root resource candidate");
                                }
                                this.#everReadResource = true;
                                return resourceReads.read(source);
                            },
                            captureBinding,
                            registerEffect: (effectSiteId, setup) => {
                                if (effectSiteId.length === 0) {
                                    throw new Error("Effect site ID must not be empty");
                                }
                                if (typeof setup !== "function") {
                                    throw new Error("Effect setup must be a function");
                                }
                                const key = effectKey(owner, effectSiteId);
                                if (nextEffects.has(key)) {
                                    throw new Error(`Effect site ${effectSiteId} was registered more than once for owner ${owner}`);
                                }
                                const registration = { owner, siteId: effectSiteId, setup };
                                if (expansionJournal) {
                                    expansionJournal.set(nextEffects, key, registration);
                                }
                                else
                                    nextEffects.set(key, registration);
                                ownEffects.set(key, registration);
                            },
                        };
                        activeOwners.push(activeOwner);
                        try {
                            if (this.#activeCounters)
                                this.#count("owner.component-renders");
                            result = node.type(componentProps);
                        }
                        finally {
                            activeOwners.pop();
                        }
                        numericStateAdmitted = activeOwner.numericStateReadsPrimitive;
                        result = carryHostKeys(result, key, "0", undefined, scopeExplicitHostKeys, owner);
                    }
                }
                else if (ownEffects) {
                    for (const [registeredKey, effect] of ownEffects) {
                        if (expansionJournal) {
                            expansionJournal.set(nextEffects, registeredKey, effect);
                        }
                        else
                            nextEffects.set(registeredKey, effect);
                    }
                }
                const expandedResult = this.#expand(result ?? null, owner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/${siteId}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, undefined, undefined, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState, protectedBranch);
                const collectedKeyedRegion = this.#collectedKeyedRegions?.get(owner);
                const collectionRegion = collectedKeyedRegion?.collection;
                if (collectionRegion) {
                    const completeRegion = {
                        ...collectionRegion,
                        parentHostKey: singleHostRootKey(expandedResult),
                    };
                    if (this.#collectedCollectionRegions) {
                        if (expansionJournal) {
                            expansionJournal.set(this.#collectedCollectionRegions, `${owner}\u0000${completeRegion.siteId}`, completeRegion);
                        }
                        else {
                            this.#collectedCollectionRegions.set(`${owner}\u0000${completeRegion.siteId}`, completeRegion);
                        }
                    }
                    const updatedRegion = {
                        ...collectedKeyedRegion,
                        collection: completeRegion,
                    };
                    if (this.#collectedKeyedRegions) {
                        if (expansionJournal) {
                            expansionJournal.set(this.#collectedKeyedRegions, owner, updatedRegion);
                        }
                        else
                            this.#collectedKeyedRegions.set(owner, updatedRegion);
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
                    subtreeOwners: subtreeOwnersByOwner.get(owner) ?? new Set([owner]),
                    ownEffects: ownEffects ?? new Map(),
                    propBoundSites,
                    ...(this.#collectedKeyedRegions?.get(owner)
                        ? { keyedRegion: this.#collectedKeyedRegions.get(owner) }
                        : {}),
                };
                if (expansionJournal) {
                    expansionJournal.set(nextComponentCache, owner, componentCache);
                }
                else
                    nextComponentCache.set(owner, componentCache);
                return expandedResult;
            }
            finally {
                ownerPath.pop();
            }
        }
        const children = this.#expand(node.props.children, parentOwner, nextOwners, nextEffects, nextComponentCache, createdOwners, `${path}/${node.type === Fragment ? "fragment" : node.type}`, forceRender, dirtyOwners, relevantOwners, ownerPath, subtreeOwnersByOwner, storeTransaction, collectionOwnerScope, collectionRowScopeKey, ownerPreparation, captureBinding, resourceReads, expansionJournal, boundaryPrimaries, boundaryState);
        return children === node.props.children
            ? node
            : copyRuntimeElement(node.type, { ...node.props, children });
    }
    #assertActive() {
        if (this.#codeInvalidated)
            throw new Error("Compiled module changed; remount the root");
        if (this.#disposed)
            throw new Error("ComponentStateRoot is disposed");
        if (this.#disposeRequested) {
            throw new Error("ComponentStateRoot disposal is pending publication");
        }
        if (this.#terminalHostFailed) {
            throw new Error(this.#terminalFailureKind === "host"
                ? "ComponentStateRoot cannot continue after a host commit failure"
                : "ComponentStateRoot cannot continue after partial publication", { cause: this.#terminalHostFailure });
        }
        if (this.#hostPublicationDomain.failed) {
            throw new Error("ComponentStateRoot cannot continue after a shared host failure", {
                cause: this.#hostPublicationDomain.failure,
            });
        }
    }
}
const shallowEqual = (left, right) => {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length)
        return false;
    for (const key of leftKeys) {
        if (!Object.hasOwn(right, key) || !Object.is(left[key], right[key])) {
            return false;
        }
    }
    return true;
};
//# sourceMappingURL=component_state_runtime.js.map