const cwd = Deno.cwd();
const command = new Deno.Command("cargo", {
  args: [
    "check",
    "--locked",
    "--manifest-path",
    "compiler/oxc-spike/Cargo.toml",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code || 1);

const ir = JSON.parse(
  await Deno.readTextFile(`${cwd}/results/compiler-oxc-binding-ir.json`),
);
const plan = ir.repeated_host_plan;
if (ir.schema_version !== 5 || !plan) {
  throw new Error(
    "OXC fixture did not emit the expected schema-v5 repeated-host plan",
  );
}
if (
  plan.binding_source_parameter !== plan.item_parameter ||
  plan.bindings?.length !== 2
) {
  throw new Error(
    "OXC fixture must bind the repeated map item to two host properties",
  );
}
if (
  plan.dependency_graph?.source_count !== 1 ||
  JSON.stringify(plan.dependency_graph.source_paths) !==
    JSON.stringify(["source"]) ||
  JSON.stringify(plan.dependency_graph.source_binding_offsets) !==
    JSON.stringify([0, 2]) ||
  JSON.stringify(plan.dependency_graph.binding_ids) !== JSON.stringify([0, 1])
) {
  throw new Error(
    "OXC did not emit the expected CSR dependency template for the two bindings",
  );
}
const bindings = new Map(
  plan.bindings.map((
    binding: { property: string; projection_body_expression: string },
  ) => [
    binding.property,
    binding.projection_body_expression,
  ]),
);
if (
  bindings.get("transform") !== "`translate3d(${value % 320}px, 0, 0)`" ||
  bindings.get("opacity") !== "(value % 100) / 100"
) {
  throw new Error(
    "OXC did not associate both projectors with their correct style-property keys",
  );
}

const generated = await Deno.readTextFile(
  `${cwd}/src/browser/generated_binding_particles.ts`,
);
if (
  !generated.includes('sourceTargetLayout: "identity"') ||
  !generated.includes('property: "transform"') ||
  !generated.includes('property: "opacity"') ||
  !generated.includes(
    'sourceCount: 1, sourcePaths: ["source"], sourceBindingOffsets: [0,2], bindingIds: [0,1]',
  ) ||
  !generated.includes(
    "sharedSourceCount: 0, sharedSourcePaths: [], sharedSourceBindingOffsets: [0], sharedBindingIds: []",
  )
) {
  throw new Error(
    "Generated TypeScript plan is missing the identity layout, dependency template, or one of its bindings",
  );
}

const snakeIr = JSON.parse(
  await Deno.readTextFile(`${cwd}/results/compiler-snake-frame-ir.json`),
);
const snakePlan = snakeIr.repeated_host_plan;
if (
  snakeIr.schema_version !== 5 || snakePlan?.root_tag !== "div" ||
  snakePlan?.item_tag !== "i" ||
  snakePlan?.dependency_graph?.source_count !== 2 ||
  JSON.stringify(snakePlan.dependency_graph.source_paths) !==
    JSON.stringify(["segment.x", "segment.y"]) ||
  JSON.stringify(snakePlan.dependency_graph.source_binding_offsets) !==
    JSON.stringify([0, 1, 2]) ||
  JSON.stringify(snakePlan.dependency_graph.binding_ids) !==
    JSON.stringify([0, 1])
) {
  throw new Error(
    "OXC did not emit the expected two-source Snake repeated-host graph",
  );
}
if (
  snakePlan.bindings?.[0]?.property !== "left" ||
  snakePlan.bindings?.[0]?.source_slot !== 0 ||
  snakePlan.bindings?.[1]?.property !== "top" ||
  snakePlan.bindings?.[1]?.source_slot !== 1
) {
  throw new Error("OXC assigned incorrect Snake host writers or source slots");
}
const snakeGenerated = await Deno.readTextFile(
  `${cwd}/src/browser/generated_snake_frame_plan.ts`,
);
if (
  !snakeGenerated.includes('sourcePaths: ["segment.x","segment.y"]') ||
  !snakeGenerated.includes('style as any)["left"]') ||
  !snakeGenerated.includes('style as any)["top"]')
) {
  throw new Error("OXC did not emit the specialized Snake x/y style writers");
}

const tempDir = await Deno.makeTempDir({
  dir: `${cwd}/.cache`,
  prefix: "oxc-compiler-check-",
});
try {
  const fixtureRun = await new Deno.Command("cargo", {
    args: [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      "compiler/fixtures/basic_scene.tsx",
      "--out",
      `${tempDir}/basic_scene.json`,
      "--emit",
      `${tempDir}/basic_scene.ts`,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!fixtureRun.success) {
    throw new Error(
      `OXC failed to compile the generic scene fixture:\n${
        new TextDecoder().decode(fixtureRun.stderr)
      }`,
    );
  }
  const fixtureIr = JSON.parse(
    await Deno.readTextFile(`${tempDir}/basic_scene.json`),
  );
  const fixturePlan = fixtureIr.repeated_host_plan;
  if (fixturePlan?.root_tag !== "section" || fixturePlan?.item_tag !== "span") {
    throw new Error(
      "OXC did not compile a repeated host with non-particle intrinsic tags",
    );
  }
  if (
    fixturePlan.dependency_graph?.source_count !== 1 ||
    JSON.stringify(fixturePlan.dependency_graph.source_paths) !==
      JSON.stringify(["node"]) ||
    JSON.stringify(fixturePlan.dependency_graph.source_binding_offsets) !==
      JSON.stringify([0, 2]) ||
    JSON.stringify(fixturePlan.dependency_graph.binding_ids) !==
      JSON.stringify([0, 1])
  ) {
    throw new Error(
      "OXC did not emit the dependency template for the generic scene fixture",
    );
  }
  const fixtureCode = await Deno.readTextFile(`${tempDir}/basic_scene.ts`);
  if (
    !fixtureCode.includes('rootTag: "section"') ||
    !fixtureCode.includes('itemTag: "span"') ||
    !fixtureCode.includes('"role": "img"')
  ) {
    throw new Error(
      "OXC codegen did not preserve generic host tags and static attributes",
    );
  }

  const multiRun = await new Deno.Command("cargo", {
    args: [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      "compiler/fixtures/multi_trait_scene.tsx",
      "--out",
      `${tempDir}/multi_trait_scene.json`,
      "--emit",
      `${tempDir}/multi_trait_scene.ts`,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!multiRun.success) {
    throw new Error(
      `OXC failed to compile the multi-trait fixture:\n${
        new TextDecoder().decode(multiRun.stderr)
      }`,
    );
  }
  const multiIr = JSON.parse(
    await Deno.readTextFile(`${tempDir}/multi_trait_scene.json`),
  );
  const multiPlan = multiIr.repeated_host_plan;
  await Deno.writeTextFile(
    `${cwd}/results/compiler-multi-trait-ir.json`,
    `${JSON.stringify(multiIr, null, 2)}\n`,
  );
  if (
    multiPlan?.dependency_graph?.source_count !== 2 ||
    JSON.stringify(multiPlan.dependency_graph.source_paths) !==
      JSON.stringify(["node.x", "node.y"]) ||
    JSON.stringify(multiPlan.dependency_graph.source_binding_offsets) !==
      JSON.stringify([0, 2, 3]) ||
    JSON.stringify(multiPlan.dependency_graph.binding_ids) !==
      JSON.stringify([0, 2, 1])
  ) {
    throw new Error("OXC failed to emit the expected multi-source CSR graph");
  }
  if (
    multiPlan.bindings[0]?.source_slot !== 0 ||
    multiPlan.bindings[1]?.source_slot !== 1 ||
    multiPlan.bindings[2]?.source_slot !== 0
  ) {
    throw new Error(
      "OXC emitted incorrect source slots for the multi-trait fixture",
    );
  }
  const multiCode = await Deno.readTextFile(`${tempDir}/multi_trait_scene.ts`);
  if (
    !multiCode.includes('sourcePaths: ["node.x","node.y"]') ||
    !multiCode.includes("sourceSlot: 1")
  ) {
    throw new Error("OXC codegen did not preserve multi-source graph metadata");
  }

  const sharedRun = await new Deno.Command("cargo", {
    args: [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      "compiler/fixtures/shared_source_scene.tsx",
      "--out",
      `${tempDir}/shared_source_scene.json`,
      "--emit",
      `${tempDir}/shared_source_scene.ts`,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!sharedRun.success) {
    throw new Error(
      `OXC failed to compile the shared-source fixture:\n${
        new TextDecoder().decode(sharedRun.stderr)
      }`,
    );
  }
  const sharedPlan =
    JSON.parse(await Deno.readTextFile(`${tempDir}/shared_source_scene.json`))
      .repeated_host_plan;
  const sharedGraph = sharedPlan?.dependency_graph;
  if (
    sharedGraph?.source_count !== 1 ||
    JSON.stringify(sharedGraph.source_paths) !== JSON.stringify(["node.x"]) ||
    JSON.stringify(sharedGraph.source_binding_offsets) !==
      JSON.stringify([0, 2]) ||
    JSON.stringify(sharedGraph.binding_ids) !== JSON.stringify([0, 2]) ||
    sharedGraph.shared_source_count !== 1 ||
    JSON.stringify(sharedGraph.shared_source_paths) !==
      JSON.stringify(["props.alpha"]) ||
    JSON.stringify(sharedGraph.shared_source_binding_offsets) !==
      JSON.stringify([0, 1]) ||
    JSON.stringify(sharedGraph.shared_binding_ids) !== JSON.stringify([1])
  ) {
    throw new Error(
      "OXC failed to emit separate local and shared-source CSR graphs",
    );
  }
  if (
    sharedPlan.bindings[0]?.source_scope !== "item" ||
    sharedPlan.bindings[1]?.source_scope !== "shared" ||
    sharedPlan.bindings[2]?.source_scope !== "item"
  ) {
    throw new Error("OXC failed to mark the binding source scopes");
  }
  const sharedCode = await Deno.readTextFile(
    `${tempDir}/shared_source_scene.ts`,
  );
  if (
    !sharedCode.includes('sharedSourcePaths: ["props.alpha"]') ||
    !sharedCode.includes('sourceScope: "shared"')
  ) {
    throw new Error(
      "OXC codegen did not preserve shared-source scope and path metadata",
    );
  }
  if (
    !sharedCode.includes(
      "writeItem(element: HTMLElement, sourceSlot: number",
    ) ||
    !sharedCode.includes(
      "writeShared(element: HTMLElement, sourceSlot: number",
    ) ||
    !sharedCode.includes('style as any)["transform"]') ||
    !sharedCode.includes('style as any)["opacity"]') ||
    !sharedCode.includes(
      "mountRepeatedHostPlan(sources, container, bindingParticlesPlan, sharedSourceValues, bindingParticlesWriters)",
    )
  ) {
    throw new Error(
      "OXC codegen did not emit specialized local/shared host writers for the compiled plan",
    );
  }

  const unsupportedSharedRun = await new Deno.Command("cargo", {
    args: [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      "compiler/fixtures/unsupported_shared_root.tsx",
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const unsupportedSharedError = new TextDecoder().decode(
    unsupportedSharedRun.stderr,
  );
  if (
    unsupportedSharedRun.success ||
    !unsupportedSharedError.includes("dotted path rooted in a shared input")
  ) {
    throw new Error(
      `OXC must reject a shared path rooted in a local variable; got:\n${unsupportedSharedError}`,
    );
  }

  const unsupportedRun = await new Deno.Command("cargo", {
    args: [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      "compiler/fixtures/unsupported_dynamic_prop.tsx",
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const unsupportedError = new TextDecoder().decode(unsupportedRun.stderr);
  if (
    unsupportedRun.success ||
    !unsupportedError.includes(
      "dynamic host attribute `title` is not represented by the compiled plan",
    )
  ) {
    throw new Error(
      `OXC must reject an unrepresented dynamic host prop with a clear diagnostic; got:\n${unsupportedError}`,
    );
  }
} finally {
  await Deno.remove(tempDir, { recursive: true });
}

console.log(
  "OXC emitted item-local, shared-source, and Snake x/y CSR plans, and rejected unsupported dynamic props and non-parameter shared roots.",
);
