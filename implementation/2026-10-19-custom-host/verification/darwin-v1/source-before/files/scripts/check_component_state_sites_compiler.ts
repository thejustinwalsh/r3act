const cwd = Deno.cwd();
const tempDir = await Deno.makeTempDir({ dir: `${cwd}/.cache`, prefix: "component-sites-check-" });
try {
  const compile = await new Deno.Command("cargo", {
    args: [
      "run", "--quiet", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
      "compiler/fixtures/component_state_sites.tsx", "--component-state-sites", "--transform-component-state",
      "--out", `${tempDir}/plan.json`, "--emit", `${tempDir}/plan.ts`,
      "--runtime-import", "../component_state_runtime.ts",
      "--jsx-import", "../jsx_binding_runtime.ts",
      "--emit-transform", `${tempDir}/component_state_transform.tsx`,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!compile.success) throw new Error(`OXC failed to compile component state sites:\n${new TextDecoder().decode(compile.stderr)}`);

  const plan = JSON.parse(await Deno.readTextFile(`${tempDir}/plan.json`));
  if (plan.schema_version !== 3 || plan.source_file !== "compiler/fixtures/component_state_sites.tsx" ||
    plan.components?.length !== 5) throw new Error("Unexpected component state-site plan shape");
  const byName = new Map(plan.components.map((component: any) => [component.name, component]));
  const panel = byName.get("ConditionalPanel") as any;
  const counter = byName.get("Counter") as any;
  const row = byName.get("KeyedRow") as any;
  const effects = byName.get("EffectProbe") as any;
  const panelStateIds = panel?.state_sites?.map((site: any) => site.site_id);
  const counterStateIds = counter?.state_sites?.map((site: any) => site.site_id);
  const benchmarkItem = byName.get("BenchmarkItem") as any;
  if (panel?.component_site_id !== "compiler/fixtures/component_state_sites.tsx#component:ConditionalPanel" ||
    panelStateIds?.join("|") !== [
      "compiler/fixtures/component_state_sites.tsx#component:ConditionalPanel#state:0",
      "compiler/fixtures/component_state_sites.tsx#component:ConditionalPanel#state:1",
    ].join("|") ||
    counter?.component_site_id !== "compiler/fixtures/component_state_sites.tsx#component:Counter" ||
    counterStateIds?.join("|") !== "compiler/fixtures/component_state_sites.tsx#component:Counter#state:0" ||
    row?.component_site_id !== "compiler/fixtures/component_state_sites.tsx#component:KeyedRow" ||
    row?.state_sites?.[0]?.site_id !== "compiler/fixtures/component_state_sites.tsx#component:KeyedRow#state:0" ||
    effects?.effect_sites?.length !== 1 ||
    effects?.effect_sites?.[0]?.site_id !== "compiler/fixtures/component_state_sites.tsx#component:EffectProbe#effect:0" ||
    effects?.effect_sites?.[0]?.argument_count !== 1) {
    throw new Error("OXC emitted unstable or incorrectly scoped component/state-site IDs");
  }
  const invalidation = plan.invalidation_graph;
  const expectedSourceIds = plan.components.flatMap((component: any) => component.state_sites.map((site: any) => site.site_id));
  const expectedRegionIds = plan.components.flatMap((component: any, region: number) => component.state_sites.map(() => region));
  const expectedOffsets = [0];
  for (const _source of expectedSourceIds) expectedOffsets.push(expectedOffsets.at(-1)! + 1);
  if (benchmarkItem?.component_site_id !== "compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem" ||
    benchmarkItem?.state_sites?.[0]?.site_id !== "compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem#state:0" ||
    invalidation?.source_count !== expectedSourceIds.length ||
    invalidation.source_paths?.join("|") !== expectedSourceIds.join("|") ||
    invalidation.source_region_offsets?.join(",") !== expectedOffsets.join(",") ||
    invalidation.region_ids?.join(",") !== expectedRegionIds.join(",") ||
    invalidation.region_component_site_ids?.join("|") !== plan.components.map((component: any) => component.component_site_id).join("|")) {
    throw new Error("OXC emitted an invalid component state-site invalidation graph");
  }
  for (const component of plan.components) {
    if (component.state_sites.some((site: any, index: number) => site.ordinal !== index ||
      !Number.isInteger(site.call.start) || site.call.end <= site.call.start)) {
      throw new Error(`Invalid state-site ordinal or source span in ${component.name}`);
    }
    if (component.effect_sites.some((site: any, index: number) => site.ordinal !== index ||
      site.argument_count !== 1 || !Number.isInteger(site.call.start) || site.call.end <= site.call.start)) {
      throw new Error(`Invalid effect-site ordinal, arity, or source span in ${component.name}`);
    }
  }

  const checkedIn = await Deno.readTextFile("src/browser/generated_component_state_sites.ts");
  const emitted = await Deno.readTextFile(`${tempDir}/plan.ts`);
  if (checkedIn !== emitted) throw new Error("Checked-in component state-site module is stale; run deno task compiler:state:plan");
  const checkedInTransform = await Deno.readTextFile("src/browser/generated_component_state_transform.tsx");
  const emittedTransform = await Deno.readTextFile(`${tempDir}/component_state_transform.tsx`);
  if (checkedInTransform !== emittedTransform) throw new Error("Checked-in component state transform is stale; run deno task compiler:state:plan");

  const expectUnsupported = async (fixture: string, expectedMessage: string) => {
    const result = await new Deno.Command("cargo", {
      args: [
        "run", "--quiet", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
        fixture, "--component-state-sites", "--transform-component-state",
        "--runtime-import", "../component_state_runtime.ts",
        "--jsx-import", "../jsx_binding_runtime.ts",
        "--emit-transform", `${tempDir}/unsupported.tsx`,
      ],
      cwd,
      env: { CARGO_HOME: `${cwd}/.cache/cargo` },
      stdout: "piped",
      stderr: "piped",
    }).output();
    const diagnostic = new TextDecoder().decode(result.stderr);
    if (result.success || !diagnostic.includes(expectedMessage)) {
      throw new Error(`Expected ${fixture} to fail with ${JSON.stringify(expectedMessage)}, got ${JSON.stringify(diagnostic)}`);
    }
  };
  await expectUnsupported(
    "compiler/fixtures/component_state_unsupported_alias.tsx",
    "useState/useEffect imports must be named, unaliased, and exclusive",
  );
  await expectUnsupported(
    "compiler/fixtures/component_state_unsupported_arrow.tsx",
    "imported useState/useEffect calls must belong to named function components",
  );
  await expectUnsupported(
    "compiler/fixtures/component_state_unsupported_effect_deps.tsx",
    "useEffect must have exactly one callback argument",
  );
} finally {
  await Deno.remove(tempDir, { recursive: true });
}
console.log("OXC emitted deterministic component/state-site TSX and rejected unsupported alias and arrow forms.");
