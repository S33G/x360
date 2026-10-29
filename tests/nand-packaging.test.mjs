import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildNand, nodeBundle } from '../scripts/build-nand.mjs';

test('offline bundle contains its worker and styles; all downloads have matching checksums', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'x360-package-'));
  try {
    await buildNand(directory);
    const html = await readFile(path.join(directory, 'downloads/x360-nand-inspector.html'), 'utf8');
    assert.match(html, /worker-src blob:/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /data-nand-analyzer/);
    assert.match(html, /new Worker\(/);
    assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)=/i);
    assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
    const browser = await readFile(path.join(directory, 'assets/nand.js'), 'utf8');
    assert.doesNotMatch(browser, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
    assert.equal(await readFile(path.join(directory, 'downloads/x360nand.mjs'), 'utf8'), await nodeBundle());
    const checksums = await readFile(path.join(directory, 'downloads/SHA256SUMS.txt'), 'utf8');
    assert.equal(checksums.trim().split('\n').length, 3);
    for (const line of checksums.trim().split('\n')) {
      const [expected, filename] = line.split('  ');
      const content = await readFile(path.join(directory, 'downloads', filename));
      assert.equal(createHash('sha256').update(content).digest('hex'), expected);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
