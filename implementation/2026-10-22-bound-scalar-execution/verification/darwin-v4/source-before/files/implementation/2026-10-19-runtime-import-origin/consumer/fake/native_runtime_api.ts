export * from "@r3act/core";
let calls = 0;
export const originCalls = () => calls;
export function use(value: string) { calls++; return `custom:${value}`; }
