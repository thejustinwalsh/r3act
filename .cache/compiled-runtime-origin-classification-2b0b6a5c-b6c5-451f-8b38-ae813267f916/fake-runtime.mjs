export * from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const observations = { calls: 0 };
export function use(value) {
	observations.calls++;
	return `fake:${String(value)}`;
}
