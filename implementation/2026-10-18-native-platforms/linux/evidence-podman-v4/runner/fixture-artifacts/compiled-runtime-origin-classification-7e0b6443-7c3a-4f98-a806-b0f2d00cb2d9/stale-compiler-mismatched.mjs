#!/usr/local/bin/node
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  while (buffer.includes("\n")) {
    const cut = buffer.indexOf("\n");
    const line = buffer.slice(0, cut);
    buffer = buffer.slice(cut + 1);
    if (!line.trim()) continue;
    const request = JSON.parse(line);
    process.stdout.write(JSON.stringify({ id: request.id, code: request.source, plan: {}, edits: [], trusted_runtime_modules: ["@r3act/core", "@alias/native"] }) + "\n");
  }
});
