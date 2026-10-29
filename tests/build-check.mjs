import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../scripts/check-site.mjs';

const page = content => `<!doctype html><html lang="en"><head><title>Fixture</title></head><body><main id="main">${content}</main></body></html>`;
const baseFiles = {
  'index.html': page('<a href="docs/guide.html#first-step">Guide</a><script src="assets/client.js"></script>'),
  'docs/guide.html': page('<h1 id="first-step">Guide</h1><a href="../index.html#main">Home</a><a href="guide.md">Markdown</a>'),
  'docs/guide.md': '# Guide\n',
  'assets/client.js': 'import("./vendor/chunk.js");',
  'assets/vendor/chunk.js': 'export const fixture = true;'
};

async function withSite(changes, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'x360-site-check-'));
  try {
    for (const [name, content] of Object.entries({ ...baseFiles, ...changes })) {
      if (content === null) continue;
      const file = path.join(root, name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
    }
    await run(await checkSite(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('valid nested links and local bundles pass the built-site checker', async () => {
  await withSite({}, result => assert.deepEqual(result.errors, []));
});

test('missing target pages and broken same-page or cross-page anchors fail', async () => {
  await withSite({ 'index.html': page('<a href="docs/missing.html">Missing</a><a href="docs/guide.html#missing">Wrong anchor</a><a href="#nowhere">Local</a>') }, result => {
    assert.ok(result.errors.some(error => error.includes('missing.html') && error.includes('missing target')));
    assert.ok(result.errors.some(error => error.includes('guide.html#missing') && error.includes('missing anchor')));
    assert.ok(result.errors.some(error => error.includes('#nowhere') && error.includes('missing anchor')));
  });
});

test('encoded traversal, root-relative links, and local file paths fail', async () => {
  await withSite({ 'index.html': page('<a href="%2e%2e/secret.txt">Escape</a><img src="/assets/client.js"><a href="file:///private/tmp/secret">Local</a>') }, result => {
    assert.ok(result.errors.some(error => error.includes('escapes site root')));
    assert.ok(result.errors.some(error => error.includes('root-relative')));
    assert.ok(result.errors.some(error => error.includes('file:')));
  });
});

test('HTML entity decoding preserves working query strings and Unicode fragments', async () => {
  await withSite({
    'index.html': page('<a href="docs/guide.html?a=1&amp;b=2#caf%C3%A9">Guide</a><a href="https://example.com/?a=1&amp;b=2">External</a>'),
    'docs/guide.html': page('<h1 id="café">Guide</h1>')
  }, result => assert.deepEqual(result.errors, []));
});

test('missing language, title, main content, raw Markdown and bundles fail', async () => {
  await withSite({
    'docs/guide.html': '<html><head><title> </title></head><body><main> </main></body></html>',
    'docs/guide.md': null,
    'assets/client.js': null,
    'assets/vendor/chunk.js': null
  }, result => {
    for (const expected of ['lang', 'title', 'main', 'raw Markdown', 'assets/client.js', 'assets/vendor']) {
      assert.ok(result.errors.some(error => error.includes(expected)), `expected error for ${expected}`);
    }
  });
});

test('Mermaid source must survive HTML generation with its code intact', async () => {
  const markdown = '# Guide\n\n```mermaid\nflowchart LR\n  A[One] --> B[Two]\n```\n';
  await withSite({ 'docs/guide.md': markdown }, result => assert.ok(result.errors.some(error => error.includes('Mermaid source'))));
  await withSite({
    'docs/guide.md': markdown,
    'docs/guide.html': page('<h1 id="first-step">Guide</h1><details><summary>Diagram source</summary><pre><code class="language-mermaid">flowchart LR\n  A[One] --&gt; B[Two]\n</code></pre></details>')
  }, result => assert.deepEqual(result.errors, []));
});

test('missing lazy-loaded vendor chunks fail even when other chunks remain', async () => {
  await withSite({
    'assets/client.js': 'import("./vendor/missing.js");'
  }, result => assert.ok(result.errors.some(error => error.includes('vendor/missing.js') && error.includes('missing target'))));
});

test('vendor string values named import are not treated as module URLs', async () => {
  await withSite({
    'assets/client.js': 'const values={a:"import",b:"@import"}; import("./vendor/chunk.js");'
  }, result => assert.deepEqual(result.errors, []));
});

test('a homepage with a model must publish both geometry and attribution', async () => {
  await withSite({ 'index.html': page('<figure class="console-model"></figure>') }, result => {
    assert.ok(result.errors.some(error => error.includes('console-mesh.json')));
    assert.ok(result.errors.some(error => error.includes('console-model.LICENSE.md')));
  });
});

test('the generated distribution satisfies the publication contract', async () => {
  const result = await checkSite(fileURLToPath(new URL('../dist/', import.meta.url)));
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.ok(result.pages > 1, 'run node scripts/build.mjs before this test');
});
