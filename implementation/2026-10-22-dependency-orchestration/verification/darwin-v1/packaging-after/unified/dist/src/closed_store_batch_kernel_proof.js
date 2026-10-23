import { closedStoreHostInputPaths, closedStoreHostInputs, isNormalizedClosedStoreHostProgram, } from "./closed_store_host_program.js";
import { Decline, Graph, MAX_DEPTH, MAX_LOCALS, MAX_NODES, MAX_SLOTS, MAX_SOURCE, closedNumericPrecedence, fail, hostNode, isClosedNumericIdentifier, isClosedNumericOperator, lex, } from "./closed_numeric_kernel_proof_common.js";
const mintKey = Symbol("closed-store-batch-proof");
const intrinsicApply = Reflect.apply;
const functionToString = Function.prototype.toString;
const intrinsicIsArray = Array.isArray;
const isSafeInteger = Number.isSafeInteger;
export const CLOSED_STORE_BATCH_MAX_ROWS = 4096;
class BatchParser {
    tokens;
    graph;
    sharedCount;
    varyingCount;
    numericIndices;
    at = 0;
    depth = 0;
    shared = "";
    varying = "";
    outputs = "";
    rowCount = "";
    row = "";
    rowOutput = "";
    locals = new Map();
    assigned = [];
    constructor(tokens, graph, sharedCount, varyingCount, numericIndices) {
        this.tokens = tokens;
        this.graph = graph;
        this.sharedCount = sharedCount;
        this.varyingCount = varyingCount;
        this.numericIndices = numericIndices;
    }
    peek(offset = 0) { return this.tokens[this.at + offset]; }
    take() { return this.tokens[this.at++] ?? fail("syntax"); }
    eat(value) {
        if (this.peek()?.text !== value)
            return false;
        this.at++;
        return true;
    }
    need(value) { if (!this.eat(value))
        fail("syntax"); }
    name() {
        const token = this.take();
        if (token.category !== "id" || !isClosedNumericIdentifier(token.text) ||
            ["this", "arguments", "eval", "await", "yield"].includes(token.text))
            fail("syntax");
        return token.text;
    }
    index(limit = MAX_SLOTS) {
        const token = this.take();
        if (token.category !== "number" || !/^(?:0|[1-9][0-9]*)$/.test(token.text))
            fail("index");
        const index = Number(token.text);
        if (!isSafeInteger(index) || index >= limit)
            fail("index");
        return index;
    }
    varyingIndex() {
        this.need("[");
        this.need(this.row);
        if (this.eat("*")) {
            if (this.index() !== this.varyingCount)
                fail("stride");
        }
        else if (this.varyingCount !== 1)
            fail("stride");
        const offset = this.eat("+") ? this.index(this.varyingCount) : 0;
        this.need("]");
        return this.sharedCount + offset;
    }
    expression(inRow, min = 0) {
        if (++this.depth > MAX_DEPTH)
            fail("depth");
        try {
            let left;
            const token = this.take();
            if (token.text === "(") {
                left = this.expression(inRow);
                this.need(")");
            }
            else if (token.text === "+" || token.text === "-" || token.text === "~") {
                const childId = this.expression(inRow, 7);
                const child = this.graph.nodes[childId];
                left = (token.text === "+" || token.text === "-") && child.kind === "literal"
                    ? this.graph.literal(token.text === "-" ? -child.value : +child.value)
                    : this.graph.add("unary", token.text, childId);
            }
            else if (token.category === "number") {
                left = this.graph.literal(Number(token.text));
            }
            else if (token.category === "id") {
                if (inRow && (token.text === this.row || token.text === this.rowOutput)) {
                    fail("reference");
                }
                else if (token.text === this.shared) {
                    this.need("[");
                    const index = this.index(this.sharedCount);
                    this.need("]");
                    left = this.graph.add("input", index);
                }
                else if (inRow && token.text === this.varying) {
                    left = this.graph.add("input", this.varyingIndex());
                }
                else {
                    const local = this.locals.get(token.text);
                    if (local === undefined)
                        fail("reference");
                    left = local;
                }
            }
            else
                fail("syntax");
            while (true) {
                const operator = this.peek()?.text;
                if (!operator || !isClosedNumericOperator(operator) ||
                    closedNumericPrecedence(operator) < min)
                    break;
                this.take();
                const right = this.expression(inRow, closedNumericPrecedence(operator) +
                    (operator === "**" ? 0 : 1));
                left = this.graph.add("binary", operator, left, right);
            }
            return left;
        }
        finally {
            this.depth--;
        }
    }
    declaration(inRow) {
        const declarationKind = this.take().text;
        do {
            const name = this.name();
            const outputAlias = inRow && this.peek()?.text === "=" &&
                this.peek(1)?.text === this.outputs && this.peek(2)?.text === "[";
            const countShadowAlias = outputAlias && declarationKind === "let" &&
                name === this.rowCount;
            if (([this.shared, this.varying, this.outputs, this.rowCount, this.row,
                this.rowOutput].includes(name) && !countShadowAlias) ||
                this.locals.has(name) || this.locals.size >= MAX_LOCALS)
                fail("local");
            this.need("=");
            if (outputAlias) {
                if (this.rowOutput)
                    fail("output-alias");
                this.need(this.outputs);
                this.need("[");
                this.need(this.row);
                this.need("]");
                this.rowOutput = name;
            }
            else {
                this.locals.set(name, this.expression(inRow));
            }
        } while (this.eat(","));
    }
    assignment() {
        const target = this.name();
        if (target === this.rowOutput && this.rowOutput) {
            this.need("[");
        }
        else if (target === this.outputs) {
            this.need("[");
            this.need(this.row);
            this.need("]");
            this.need("[");
        }
        else
            fail("assignment");
        const index = this.index();
        this.need("]");
        if (index !== this.numericIndices[this.assigned.length])
            fail("output-order");
        this.need("=");
        this.assigned.push(this.expression(true));
    }
    statements(inRow) {
        while (this.peek()?.text !== "}") {
            const before = this.at;
            if (["const", "let", "var"].includes(this.peek()?.text ?? ""))
                this.declaration(inRow);
            else if (inRow) {
                this.assignment();
                while (this.eat(","))
                    this.assignment();
            }
            else
                fail("syntax");
            if (!this.eat(";") && this.peek()?.text !== "}")
                fail("syntax");
            if (this.at === before)
                fail("syntax");
        }
    }
    parse() {
        if (this.eat("function") && this.peek()?.category === "id")
            this.name();
        this.need("(");
        this.shared = this.name();
        this.need(",");
        this.varying = this.name();
        this.need(",");
        this.outputs = this.name();
        this.need(",");
        this.rowCount = this.name();
        this.need(")");
        if (new Set([this.shared, this.varying, this.outputs, this.rowCount]).size !== 4)
            fail("parameters");
        if (!this.eat("=>") && this.peek()?.text !== "{")
            fail("syntax");
        this.need("{");
        if (this.peek()?.category === "string") {
            const directive = this.take().text;
            if (directive !== '"use strict"' && directive !== "'use strict'")
                fail("syntax");
            this.need(";");
        }
        while (["const", "let", "var"].includes(this.peek()?.text ?? "")) {
            this.declaration(false);
            this.need(";");
        }
        this.need("for");
        this.need("(");
        const loopKind = this.take().text;
        if (loopKind !== "let" && loopKind !== "var")
            fail("loop-init");
        this.row = this.name();
        if ([this.outputs, this.rowCount].includes(this.row) ||
            loopKind === "var" && [this.shared, this.varying].includes(this.row) ||
            this.locals.has(this.row))
            fail("loop-init");
        this.need("=");
        if (this.index(1) !== 0)
            fail("loop-init");
        this.need(";");
        this.need(this.row);
        this.need("<");
        this.need(this.rowCount);
        this.need(";");
        if (this.eat("++"))
            this.need(this.row);
        else {
            this.need(this.row);
            this.need("++");
        }
        this.need(")");
        if (this.eat("{")) {
            this.statements(true);
            this.need("}");
        }
        else {
            this.assignment();
            while (this.eat(","))
                this.assignment();
            this.eat(";");
        }
        this.need("}");
        if (this.at !== this.tokens.length || this.assigned.length !== this.numericIndices.length) {
            fail("output-count");
        }
        return this.assigned;
    }
}
class VerifiedBatchKernel {
    kind = "verified";
    numericPropIndices;
    sharedInputCount;
    varyingInputCount;
    #kernel;
    #host;
    #outputWidth;
    constructor(key, kernel, host, indices, shared, varying) {
        if (key !== mintKey)
            throw new TypeError("batch-proof");
        this.#kernel = kernel;
        this.#host = host;
        this.#outputWidth = host.host.props.length;
        this.numericPropIndices = Object.freeze([...indices]);
        this.sharedInputCount = shared;
        this.varyingInputCount = varying;
        Object.freeze(this);
    }
    static execute(proof, sharedInputs, varyingInputs, outputs, rowCount) {
        if (typeof proof !== "object" || proof === null || !(#kernel in proof)) {
            throw new TypeError("batch-proof");
        }
        const verified = proof;
        if (!isSafeInteger(rowCount) || rowCount < 0 || rowCount > CLOSED_STORE_BATCH_MAX_ROWS ||
            sharedInputs.length !== verified.sharedInputCount ||
            varyingInputs.length !== rowCount * verified.varyingInputCount ||
            outputs.length !== rowCount)
            throw new TypeError("batch-shape");
        for (let index = 0; index < rowCount; index++) {
            if (!intrinsicIsArray(outputs[index]) ||
                outputs[index].length !== verified.#outputWidth)
                throw new TypeError("batch-shape");
        }
        if (verified.#host.host.props.length !== verified.#outputWidth) {
            throw new TypeError("batch-host");
        }
        intrinsicApply(verified.#kernel, undefined, [sharedInputs, varyingInputs, outputs, rowCount]);
    }
}
Object.freeze(VerifiedBatchKernel.prototype);
const canonicalExecute = VerifiedBatchKernel.execute;
Object.freeze(VerifiedBatchKernel);
export const executeVerifiedClosedStoreBatch = (proof, sharedInputs, varyingInputs, outputs, rowCount) => canonicalExecute(proof, sharedInputs, varyingInputs, outputs, rowCount);
export function proveClosedStoreBatchKernel(candidate, host) {
    try {
        if (!isNormalizedClosedStoreHostProgram(host) || typeof candidate !== "function") {
            fail("candidate");
        }
        if (host.schemaVersion === 4 || host.schemaVersion === 5 &&
            (host.host.tag !== "group" || host.host.children.length !== 0))
            fail("host-shape");
        const shared = closedStoreHostInputs(host).reduce((count, input) => count + closedStoreHostInputPaths(input).length, 0);
        const varying = host.schemaVersion === 7 ? host.stateSites.length : 0;
        if (shared < 1 || shared + varying > MAX_SLOTS)
            fail("slots");
        const expressions = [];
        const numericPropIndices = [];
        for (let index = 0; index < host.host.props.length; index++) {
            const value = host.host.props[index][1];
            if (value.kind === "literal" && typeof value.value !== "number")
                continue;
            if (value.kind === "tuple" || value.kind === "style")
                fail("host-shape");
            expressions.push(value);
            numericPropIndices.push(index);
        }
        if (!expressions.length || expressions.length > MAX_SLOTS)
            fail("host-shape");
        const source = intrinsicApply(functionToString, candidate, []);
        if (source.length > MAX_SOURCE || new TextEncoder().encode(source).byteLength > MAX_SOURCE) {
            fail("source-size");
        }
        const graph = new Graph();
        const expected = expressions.map((value) => hostNode(value, graph));
        const actual = new BatchParser(lex(source), graph, shared, varying, numericPropIndices).parse();
        if (graph.nodes.length > MAX_NODES ||
            actual.some((node, index) => node !== expected[index]))
            fail("mismatch");
        return new VerifiedBatchKernel(mintKey, candidate, host, numericPropIndices, shared, varying);
    }
    catch (error) {
        return Object.freeze({ kind: "rejected", reason: error instanceof Decline ? error.code : "source" });
    }
}
//# sourceMappingURL=closed_store_batch_kernel_proof.js.map