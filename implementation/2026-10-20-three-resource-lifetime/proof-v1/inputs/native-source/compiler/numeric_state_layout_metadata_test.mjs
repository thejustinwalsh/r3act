import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { nativeModuleCompilerPlugin } from './vite_native_module.ts';

const projectRoot = path.resolve('.');
const sourcePath = path.join(projectRoot, 'src/browser/native_product_mixed_arm.tsx');
const source = await readFile(sourcePath, 'utf8');
const plugin = nativeModuleCompilerPlugin({ root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === '../native_runtime_api.ts') {
      return { id: path.join(projectRoot, 'src/native_runtime_api.ts') };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};

try {
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed && typeof transformed.code === 'string', 'product TSX was not compiled');

  const planMatch = transformed.code.match(
    /export const compiledNativeComponentPlan = (\{[\s\S]*\}) as const;\s*$/,
  );
  assert.ok(planMatch, 'compiler did not append native component plan metadata');
  const plan = JSON.parse(planMatch[1]);
  const row = plan.components.find((component) => component.name === 'ProductMixedRow');
  assert.ok(row, 'compiled plan omitted ProductMixedRow');
  assert.deepEqual(row.state_layout, {
    schema_version: 1,
    slots: [0, 1, 2].map((slot) => ({
      site_id: `src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:${slot}`,
      slot,
    })),
  });
  assert.equal(row.prop_only_sites.length, 3, 'state-layout proof changed existing prop-only metadata');

  const emittedComponent = plan.component_module;
  assert.match(
    emittedComponent,
    /stateLayout: \{ schemaVersion: 1, slots: \[\{ siteId: "src\/browser\/native_product_mixed_arm\.tsx#component:ProductMixedRow#state:0", slot: 0 \}, \{ siteId: "src\/browser\/native_product_mixed_arm\.tsx#component:ProductMixedRow#state:1", slot: 1 \}, \{ siteId: "src\/browser\/native_product_mixed_arm\.tsx#component:ProductMixedRow#state:2", slot: 2 \}\] \}/,
    'emitted defineComponent metadata did not carry the three ordered product slots',
  );
  assert.equal(
    (emittedComponent.match(/sinkId: "src\/browser\/native_product_mixed_arm\.tsx#numeric-sink:/g) ?? []).length,
    3,
    'product state expressions must remain the three certified numeric sinks',
  );
  assert.doesNotMatch(
    emittedComponent,
    /useStateAt\([^)]*,\s*\d+\s*\)|bindStatePropAt\([^)]*,\s*\d+\s*,/,
    'metadata-only cut must not change numeric helper signatures',
  );

  console.log('Numeric state-layout metadata PASS (product TSX: 3 unary template sinks, authored slot order, unchanged prop-only metadata and helper signatures).');
} finally {
  plugin.closeBundle?.call({});
}
