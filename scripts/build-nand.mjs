import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { nandTemplate } from '../site/nand-template.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const skillFile = 'skills/xbox360-nand-analysis/scripts/x360nand.mjs';
const sourceFiles = ['nand/core.ts', 'nand/cli.ts', 'nand/demo.ts', 'nand/worker.ts', 'site/nand-ui.ts'];
const banner = '// Generated from the TypeScript sources in s33G/x360. AI-assisted educational research.\n// Read-only analysis; no affiliation with M$. See docs/NOTICE.md.\n';
const inlineScript = source => source.replace(/<\/script/gi, '<\\/script');

async function bundle(entry, options = {}) {
  const result = await build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false,
    format: 'esm', target: 'es2022', legalComments: 'none', ...options });
  return result.outputFiles[0].text;
}

export async function nodeBundle() {
  return bundle('nand/cli.ts', { platform: 'node', banner: { js: banner } });
}

export async function checkNandSkill({ write = false } = {}) {
  const expected = await nodeBundle();
  const target = path.join(root, skillFile);
  if (write) await writeFile(target, expected);
  const actual = await readFile(target, 'utf8').catch(() => '');
  if (actual !== expected) throw new Error('Bundled NAND skill is stale. Run npm run build:nand.');
}

/** Build only explicitly named public source files. Never reads console inputs. */
export async function buildNand(destination = path.join(root, 'dist')) {
  const downloads = path.join(destination, 'downloads');
  const assets = path.join(destination, 'assets');
  await mkdir(downloads, { recursive: true });
  await mkdir(assets, { recursive: true });
  const worker = await bundle('nand/worker.ts', { format: 'iife' });
  const browser = await bundle('site/nand-entry.ts', {
    format: 'iife', define: { __NAND_WORKER_SOURCE__: JSON.stringify(worker) }
  });
  const css = await readFile(path.join(root, 'site/nand.css'), 'utf8');
  await writeFile(path.join(assets, 'nand.js'), browser);
  await writeFile(path.join(assets, 'nand.css'), css);
  await writeFile(path.join(downloads, 'x360nand.mjs'), await nodeBundle());
  await writeFile(path.join(downloads, 'x360nand-core.mjs'), await bundle('nand/core.ts', { banner: { js: banner } }));
  const html = `<!doctype html>
<html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; worker-src blob:; connect-src 'none'; img-src data:; base-uri 'none'; form-action 'none'">
<title>NAND inspector · Xbox 360 Field Guide</title><style>
:root{color-scheme:dark;--bg:#121512;--panel:#181c18;--ink:#f1f3e9;--muted:#a4afa0;--lime:#c0f16a;--lime-text:#16210c;--line:#30382e;--mono:ui-monospace,SFMono-Regular,Consolas,monospace;font-family:Arial,sans-serif;background:var(--bg);color:var(--ink)}
*{box-sizing:border-box}body{margin:0}main{max-width:1260px;margin:auto;padding:32px 24px}h1{font-size:clamp(30px,6vw,48px);letter-spacing:-1.5px;margin:10px 0 20px}.offline-brand{color:var(--lime);font:12px var(--mono);letter-spacing:2px}.nand-heading h2{display:none}.offline-footer{margin:36px 0 10px;color:var(--muted);font-size:12px;line-height:1.8}button,input{font:inherit}button{cursor:pointer}a{color:var(--lime)}[hidden]{display:none!important}
${css}</style></head><body><main><p class="offline-brand">360 / FIELD GUIDE / OFFLINE</p><h1>NAND inspector</h1>${nandTemplate()}<noscript><p>JavaScript is required for analysis. No input has been read.</p></noscript><footer class="offline-footer">Single-file local analysis. No uploads or external assets.<br>Written with help from AI. For educational purposes only. Unaffiliated with M$ or the Xbox team. Readers and users are assumed to know what they are doing; s33g takes no responsibility for anything done with this material.<br>Source and full instructions: s33G/x360 on GitHub, docs/NAND_ANALYZER.md.</footer></main><script>${inlineScript(browser)}</script></body></html>`;
  await writeFile(path.join(downloads, 'x360-nand-inspector.html'), html);
  for (const file of sourceFiles) {
    await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
    await copyFile(path.join(root, file), path.join(destination, file));
  }
  const names = ['x360-nand-inspector.html', 'x360nand.mjs', 'x360nand-core.mjs'];
  const checksums = [];
  for (const name of names) checksums.push(`${createHash('sha256').update(await readFile(path.join(downloads, name))).digest('hex')}  ${name}`);
  await writeFile(path.join(downloads, 'SHA256SUMS.txt'), checksums.join('\n') + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--sync-skill', '--check-skill'].includes(args[0])) throw new Error('Use --sync-skill or --check-skill.');
  await checkNandSkill({ write: args[0] === '--sync-skill' });
  if (args[0] === '--sync-skill') await buildNand();
  console.log(args[0] === '--sync-skill' ? 'Built browser and Node downloads; updated the portable analyzer.' : 'Bundled TypeScript analyzer is current.');
}
