import { asyncTask } from "somewhere-else";

export const value = asyncTask("value", async (input) => input.get("$request"));
