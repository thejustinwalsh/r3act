export { useState, useEffect, createStore } from "file:///workspace/r3act/src/native_runtime_api.ts";
export const observations = {
	calls: 0,
	last: undefined
};
export function use(value) {
	observations.calls++;
	observations.last = value;
	return `wrapper:${String(value)}`;
}
