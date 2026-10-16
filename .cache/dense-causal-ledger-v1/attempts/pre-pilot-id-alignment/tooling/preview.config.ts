import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const work=path.resolve(here,'..');
export default defineConfig({
  root:path.join(work,'snapshot/.cache/high-frequency-harness-stage'),
  build:{outDir:path.join(work,'build/dist')},
  preview:{allowedHosts:['.localhost'],headers:{
    'Cross-Origin-Opener-Policy':'same-origin',
    'Cross-Origin-Embedder-Policy':'require-corp',
    'Cache-Control':'no-store',
  }},
});
