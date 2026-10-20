export { useState, useEffect, createStore } from "@r3act/core";

export const observations = { calls: 0, last: undefined as unknown };

export function use(value: unknown): string {
  observations.calls++;
  observations.last = value;
  return `wrapper:${String(value)}`;
}
