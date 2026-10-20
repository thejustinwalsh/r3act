export const declaredHostValuePolicy = (policy) => policy === "scalar" || policy === "copy" ||
    policy === "borrow-call" || policy === "retain"
    ? policy
    : "unknown";
//# sourceMappingURL=host_property_contract.js.map