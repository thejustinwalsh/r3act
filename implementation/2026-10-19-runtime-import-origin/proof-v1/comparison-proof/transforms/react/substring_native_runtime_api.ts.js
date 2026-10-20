export * from "@r3act/core";
let calls = 0;
export const substringCalls = () => calls;
export function use(value) {
	calls++;
	return `substring:${value}`;
}
