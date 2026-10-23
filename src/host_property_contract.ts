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
  mayReenter: true;
}>;

export type HostCopyComparisonScalar = string | number | boolean | bigint |
  null | undefined;
/**
 * Optional result for an object-valued host property at its write boundary.
 * `writeValue` is an independent stable input passed exactly to the writer;
 * `comparison` is copied into private accepted history after a successful write.
 * Equal tuples skip only for the same authored input reference. A new input
 * reference still writes, while a null capture keeps reference equality.
 * Capture may throw or reenter and is never a render-purity certificate.
 * Malformed captures throw; their comparison is never accepted.
 */
export type HostCopyValueCapture = Readonly<{
  kind: "copy";
  writeValue: unknown;
  comparison: readonly HostCopyComparisonScalar[];
}>;

export const declaredHostValuePolicy = (
  policy: unknown,
): HostValuePolicy | "unknown" =>
  policy === "scalar" || policy === "copy" ||
    policy === "borrow-call" || policy === "retain"
    ? policy
    : "unknown";
