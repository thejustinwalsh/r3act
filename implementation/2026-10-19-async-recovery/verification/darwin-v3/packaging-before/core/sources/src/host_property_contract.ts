/** A host declaration about one observed property write, not an admission proof. */
export type HostValuePolicy = "scalar" | "copy" | "borrow-call" | "retain";
export type HostResourceOwnership = "owned" | "borrowed" | "shared-owned";
export type HostResourceDescription = Readonly<{
  object: object;
  ownership: HostResourceOwnership;
}>;
export type HostPropertyCapability = Readonly<{
  valuePolicy: HostValuePolicy | "unknown";
  targetResource: HostResourceDescription | null;
  valueResource: HostResourceDescription | null;
  mayThrow: true;
}>;

export const declaredHostValuePolicy = (
  policy: unknown,
): HostValuePolicy | "unknown" =>
  policy === "scalar" || policy === "copy" ||
    policy === "borrow-call" || policy === "retain"
    ? policy
    : "unknown";
