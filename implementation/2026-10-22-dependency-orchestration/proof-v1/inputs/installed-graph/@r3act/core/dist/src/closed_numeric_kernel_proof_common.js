export const MAX_SOURCE = 32768;
export const MAX_TOKENS = 16384;
export const MAX_NODES = 8192;
export const MAX_LOCALS = 128;
export const MAX_DEPTH = 128;
export const MAX_SLOTS = 32;
const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export const isClosedNumericIdentifier = (name) => identifier.test(name);
const numeric = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/;
const operatorSet = new Set(["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "|", "^", "&"]);
const precedence = Object.freeze({
    "|": 1, "^": 2, "&": 3, "<<": 4, ">>": 4, ">>>": 4,
    "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "**": 7,
});
export const isClosedNumericOperator = (operator) => operatorSet.has(operator);
export const closedNumericPrecedence = (operator) => precedence[operator];
const punctuators = [">>>", "=>", "**", "<<", ">>", "++", "--", "...", "==", "!=", "<=", ">=", "&&", "||", "??"];
export class Decline extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
export function fail(code) { throw new Decline(code); }
const lineTerminator = (ch) => ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029";
export const lex = (source) => {
    const tokens = [];
    let i = 0;
    const push = (text, category) => {
        if (tokens.length >= MAX_TOKENS)
            fail("tokens");
        tokens.push({ text, category });
    };
    while (i < source.length) {
        const start = i;
        const ch = source[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if (source.startsWith("//", i)) {
            i += 2;
            while (i < source.length && !lineTerminator(source[i]))
                i++;
            continue;
        }
        if (source.startsWith("/*", i)) {
            i = source.indexOf("*/", i + 2);
            if (i < 0)
                fail("syntax");
            i += 2;
            continue;
        }
        if (/[A-Za-z_$]/.test(ch)) {
            i++;
            while (i < source.length && /[A-Za-z0-9_$]/.test(source[i]))
                i++;
            push(source.slice(start, i), "id");
            continue;
        }
        if (/[0-9]/.test(ch) || ch === "." && /[0-9]/.test(source[i + 1] ?? "")) {
            const rest = source.slice(i);
            const match = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(rest);
            if (!match || !numeric.test(match[0]))
                fail("syntax");
            i += match[0].length;
            push(match[0], "number");
            continue;
        }
        if (ch === "'" || ch === '"') {
            i++;
            while (i < source.length && source[i] !== ch) {
                if (source[i] === "\\" || source[i] === "\n" || source[i] === "\r")
                    fail("syntax");
                i++;
            }
            if (i >= source.length)
                fail("syntax");
            i++;
            push(source.slice(start, i), "string");
            continue;
        }
        const long = punctuators.find((part) => source.startsWith(part, i));
        if (long) {
            i += long.length;
            push(long, "punct");
            continue;
        }
        if ("(){}[];,=+-*/%~|^&.<>".includes(ch)) {
            i++;
            push(ch, "punct");
            continue;
        }
        fail("syntax");
    }
    return tokens;
};
export class Graph {
    nodes = [];
    keys = new Map();
    add(kind, value, left, right) {
        const key = kind === "literal" ? `l:${Object.is(value, -0) ? "-0" : value}`
            : `${kind}:${value}:${left ?? ""}:${right ?? ""}`;
        const prior = this.keys.get(key);
        if (prior !== undefined)
            return prior;
        if (this.nodes.length >= MAX_NODES)
            fail("nodes");
        const id = this.nodes.length;
        this.nodes.push({ kind, value, left, right });
        this.keys.set(key, id);
        return id;
    }
    literal(value) {
        if (!Number.isFinite(value))
            fail("literal");
        return this.add("literal", value);
    }
}
Object.freeze(Graph.prototype);
Object.freeze(Graph);
export const hostNode = (expression, graph, depth = 0) => {
    if (depth > MAX_DEPTH)
        fail("depth");
    switch (expression.kind) {
        case "input": return graph.add("input", expression.index);
        case "literal":
            if (typeof expression.value !== "number")
                fail("host-expression");
            return graph.literal(expression.value);
        case "unary": {
            if (!["+", "-", "~"].includes(expression.operator))
                fail("host-expression");
            const child = hostNode(expression.argument, graph, depth + 1);
            const node = graph.nodes[child];
            return (expression.operator === "+" || expression.operator === "-") && node.kind === "literal"
                ? graph.literal(expression.operator === "-" ? -node.value : +node.value)
                : graph.add("unary", expression.operator, child);
        }
        case "binary":
            if (!operatorSet.has(expression.operator))
                fail("host-expression");
            return graph.add("binary", expression.operator, hostNode(expression.left, graph, depth + 1), hostNode(expression.right, graph, depth + 1));
        default: fail("host-expression");
    }
};
//# sourceMappingURL=closed_numeric_kernel_proof_common.js.map