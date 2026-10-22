export * from "@r3act/core";

export const observations = { calls: 0 };

export function use(value: unknown): string {
  observations.calls++;
  return `fake:${String(value)}`;
}
