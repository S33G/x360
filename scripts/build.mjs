import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { pages, outputFor } from '../site/content.mjs';
import { renderMarkdown } from '../site/markdown.mjs';
import { pageTemplate } from '../site/template.mjs';
import { skillFiles } from './skill-catalog.mjs';
import { checkReferences } from './skill-suite.mjs';
import { buildNand, checkNandSkill } from './build-nand.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await checkNandSkill();
const staleSkills = await checkReferences(root);
if (staleSkills.length) throw new Error('Bundled skill references are stale. Run npm run skills:sync before building.');
// Fail before replacing the previous build if the licensed model is missing.
try { await readFile(path.join(root, 'assets/console-mesh.json')); }
catch { throw new Error('Missing homepage model. See docs/MAINTAINING.md to prepare assets/console-mesh.json from the licensed GLB.'); }
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
await buildNand(dist);
const search = [];
// An explicit content list prevents local console data, tooling and reports from being published.
for (const page of pages) {
  const source = await readFile(path.join(root, page.file), 'utf8');
  const rendered = renderMarkdown(source, page.file);
  const output = path.join(dist, outputFor(page.file));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, pageTemplate(page, rendered, source));
  const raw = path.join(dist, page.file);
  await mkdir(path.dirname(raw), { recursive: true });
  await writeFile(raw, source);
  search.push({ title: page.label, url: outputFor(page.file), text: source.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*_>|`]/g, '').replace(/\s+/g, ' ').trim() });
}
for (const [input, output] of [['site/style.css', 'assets/style.css'], ['site/timeline.css', 'assets/timeline.css'], ['site/theme.js', 'assets/theme.js'], ['assets/favicon.svg', 'assets/favicon.svg'], ['assets/console-mesh.json', 'assets/console-mesh.json'], ['assets/console-model.LICENSE.md', 'assets/console-model.LICENSE.md']]) {
  await copyFile(path.join(root, input), path.join(dist, output));
}
// Publish only the same explicitly reviewed files shipped in each skill folder.
for (const file of skillFiles()) {
  await mkdir(path.dirname(path.join(dist, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(dist, file));
}
await build({ absWorkingDir: root, entryPoints: ['site/client.mjs'], outdir: 'dist/assets', entryNames: 'client', chunkNames: 'vendor/[name]-[hash]', bundle: true, splitting: true, format: 'esm', minify: true, target: ['es2022'], legalComments: 'linked' });
await writeFile(path.join(dist, 'search-index.json'), JSON.stringify(search));
await writeFile(path.join(dist, 'llms.txt'), `# Xbox 360 Field Guide\n\nAI-assisted educational research. No console operation is authorized by reading this index.\n\n${pages.map(p => `- [${p.label}](${p.file}): ${p.description || p.label}`).join('\n')}\n`);
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built ${pages.length} pages and raw Markdown copies in dist/.`);
