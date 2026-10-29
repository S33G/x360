import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(path.join(tmpdir(), 'x360-nand-tests-'));
after(() => rm(directory, { recursive: true, force: true }));
await build({ entryPoints: ['nand/core.ts', 'nand/demo.ts', 'nand/cli.ts'].map(file => path.join(root, file)), outdir: directory, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', target: 'node22', logLevel: 'silent' });
const { analyzeNand, redactReport, DATA_BYTES, RAW_BYTES } = await import(pathToFileURL(path.join(directory, 'core.mjs')));
const { createDemoNand } = await import(pathToFileURL(path.join(directory, 'demo.mjs')));

function stripSpare(raw) {
  const data = new Uint8Array(DATA_BYTES);
  for (let page = 0; page < data.length / 512; page++) data.set(raw.subarray(page * 528, page * 528 + 512), page * 512);
  return data;
}

function blankImage() {
  const image = new Uint8Array(DATA_BYTES).fill(255);
  image.fill(0, 0, 128);
  image.set([255, 0x4f]);
  return image;
}

// A synthetic RC4 encryptor for fixture construction; no console material.
function fixtureRc4(key, data) {
  const table = Array.from({ length: 256 }, (_, n) => n);
  let a = 0, b = 0;
  for (; a < 256; a++) { b = (b + table[a] + key[a % key.length]) % 256; [table[a], table[b]] = [table[b], table[a]]; }
  a = 0; b = 0;
  return Uint8Array.from(data, byte => {
    a = (a + 1) % 256; b = (b + table[a]) % 256;
    [table[a], table[b]] = [table[b], table[a]];
    return byte ^ table[(table[a] + table[b]) % 256];
  });
}

function withSyntheticKeyvault() {
  const image = blankImage();
  const key = new Uint8Array(16).fill(0x12);
  const serial = '1'.repeat(12);
  const dvd = new Uint8Array(16).fill(0x34);
  const clear = new Uint8Array(0x4000);
  const nonce = new Uint8Array(16).fill(0x67);
  clear.set(new TextEncoder().encode(serial), 0xb0);
  clear.set(dvd, 0x100);
  clear.fill(0x78, 0x2b0, 0x2c0); // Distinct bytes catch the legacy wrong DVD-key offset.
  clear.set(new TextEncoder().encode('DEMO DRIVE'), 0xc92);
  const derived = createHmac('sha1', key).update(nonce).digest().subarray(0, 16);
  image.set(nonce, 0x4000);
  image.set(fixtureRc4(derived, clear.subarray(16)), 0x4010);
  return { image, key, serial, dvd: Buffer.from(dvd).toString('hex') };
}

function cli(args) {
  return spawnSync(process.execPath, [path.join(directory, 'cli.mjs'), ...args], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
}

test('synthetic demo provides geometry, split boot headers, board hint, block map and bounded filesystem metadata', async () => {
  const report = await analyzeNand(createDemoNand());
  assert.equal(report.schemaVersion, '1.0');
  assert.equal(report.input.sizeBytes, RAW_BYTES);
  assert.equal(report.input.pageCount, 32768);
  assert.equal(report.input.blockCount, 1024);
  assert.equal(report.input.spareLayout, 'small-block');
  assert.equal(report.header.valid, true);
  assert.equal(report.smc.boardHint, 'Trinity');
  assert.equal(report.smc.version, '3.01');
  assert.equal(report.bootloaders.length, 5);
  assert.equal(report.bootloaders[1].offset, 0x9ac0, 'non-page-aligned split header is discovered');
  assert.equal(report.fileSystem.status, 'metadata-only');
  assert.equal(report.fileSystem.entries.length, 2);
  assert.ok(report.fileSystem.entries.every(entry => entry.name === '<REDACTED>'));
  assert.equal(report.blocks.length, 1024);
  assert.equal(report.blockStats.markedBad, 1);
  assert.equal(Object.values(report.blockStats).reduce((sum, count) => sum + count, 0), 1024);
  assert.equal(report.keyvault.status, 'not-requested');
  assert.match(report.warnings.join(' '), /not an authenticated boot chain/);
});

test('data-only analysis preserves structural results and does not invent spare metadata', async () => {
  const raw = createDemoNand();
  const [rawReport, dataReport] = await Promise.all([analyzeNand(raw), analyzeNand(stripSpare(raw))]);
  assert.deepEqual(dataReport.bootloaders, rawReport.bootloaders);
  assert.deepEqual(dataReport.smc, rawReport.smc);
  assert.equal(dataReport.input.hasSpare, false);
  assert.equal(dataReport.input.spareLayout, 'none');
  assert.equal(dataReport.blockStats.markedBad, 0);
  assert.equal(dataReport.fileSystem.status, 'unavailable');
});

test('rejects partial, expanded and other geometry without guessing', async () => {
  for (const size of [0, 512, DATA_BYTES - 1, DATA_BYTES + 1, RAW_BYTES + 1, 0x2000000]) {
    await assert.rejects(analyzeNand(new Uint8Array(size)), /Unsupported image size/);
  }
});

test('unrecognized headers leave structural decoding unavailable but still report block fill', async () => {
  const report = await analyzeNand(new Uint8Array(DATA_BYTES).fill(255));
  assert.equal(report.header.valid, false);
  assert.equal(report.smc.status, 'invalid');
  assert.equal(report.bootloaders.length, 0);
  assert.equal(report.fileSystem.status, 'unavailable');
  assert.equal(report.blockStats.erased, 1024);
});

test('SMC pointer overflow, oversized ranges and truncated version fields are not decoded', async () => {
  for (const [offset, length] of [[0xfffffff0, 0x3000], [0x1000, 0x10001], [0x1000, 0x102], [16, 0x3000]]) {
    const image = blankImage();
    const view = new DataView(image.buffer);
    view.setUint32(0x7c, offset, false); view.setUint32(0x78, length, false);
    const report = await analyzeNand(image);
    assert.equal(report.smc.status, 'invalid');
    assert.equal(report.smc.boardHint, null);
  }
});

test('boot signatures need valid bounded headers and do not expose raw header text', async () => {
  const image = blankImage();
  const view = new DataView(image.buffer);
  const privateText = 'SYNTHETIC PRIVATE HEADER';
  image.set(new TextEncoder().encode(privateText), 0x10);
  for (const [at, size, entry] of [[0x8000, 0xffffffff, 0], [0x9000, 16, 0], [0xa000, 0x100, 0x100], [0xb000, 0x100, 3], [0xc000, 0x100, 32]]) {
    image.set([67, 66, 0x23, 0xe4], at);
    view.setUint32(at + 8, entry, false); view.setUint32(at + 12, size, false);
  }
  const report = await analyzeNand(image);
  assert.deepEqual(report.bootloaders.map(item => item.offset), [0xc000]);
  assert.equal(JSON.stringify(report).includes(privateText), false);
});

test('newer 16 MiB spare layout is inferred and uses its sequence byte', async () => {
  const image = createDemoNand();
  for (let page = 0; page < DATA_BYTES / 512; page++) {
    const at = page * 528 + 512;
    if (image[at + 12] === 255) continue;
    const old = image.slice(at, at + 3);
    image[at] = old[2]; image[at + 1] = old[0]; image[at + 2] = old[1];
  }
  const report = await analyzeNand(image);
  assert.equal(report.input.spareLayout, 'big-on-small');
  assert.equal(report.fileSystem.status, 'metadata-only');
  assert.equal(report.fileSystem.rootBlock, 0x100);
  assert.equal(report.fileSystem.entries.length, 2);
});

test('ambiguous spare bytes do not produce a fabricated filesystem root', async () => {
  const image = createDemoNand();
  for (let page = 0; page < DATA_BYTES / 512; page++) image.fill(255, page * 528 + 512, (page + 1) * 528);
  const report = await analyzeNand(image);
  assert.equal(report.input.spareLayout, 'unknown');
  assert.equal(report.fileSystem.status, 'unavailable');
  assert.equal(report.fileSystem.rootBlock, null);
});

test('malformed filesystem entries are omitted and names require explicit sensitive opt-in', async () => {
  const image = createDemoNand();
  const first = (0x100 * 32 + 1) * 528;
  new DataView(image.buffer).setUint32(first + 24, 0xffffffff, false);
  const report = await analyzeNand(image, { includeSensitive: true });
  assert.equal(report.fileSystem.entries.length, 1);
  assert.equal(report.fileSystem.entries[0].name, 'demo-config.dat');
  assert.match(report.warnings.join(' '), /1 malformed filesystem entries/);
});

test('equal filesystem sequences are reported as ambiguous instead of arbitrarily chosen', async () => {
  const image = createDemoNand();
  const at = 0x124 * 32 * 528 + 512;
  image[at + 2] = 7; image[at + 12] = 0x30;
  const report = await analyzeNand(image);
  assert.equal(report.fileSystem.rootBlock, null);
  assert.equal(report.fileSystem.status, 'not-found');
  assert.match(report.warnings.join(' '), /tied sequence numbers/);
});

test('keyvault checks remain explicitly unauthenticated and redact all parsed fields by default', async () => {
  const fixture = withSyntheticKeyvault();
  const report = await analyzeNand(fixture.image, { cpuKey: fixture.key });
  assert.equal(report.keyvault.status, 'plausible');
  assert.ok(Object.values(report.keyvault.fields).every(value => value === '<REDACTED>'));
  for (const secret of [fixture.serial, fixture.dvd, Buffer.from(fixture.key).toString('hex')]) assert.equal(JSON.stringify(report).includes(secret), false);
  assert.match(report.warnings.join(' '), /does not authenticate/);
  const revealed = await analyzeNand(fixture.image, { cpuKey: fixture.key, includeSensitive: true });
  assert.equal(revealed.keyvault.fields.serial, fixture.serial);
  assert.equal(revealed.keyvault.fields.dvdKey, fixture.dvd, 'DVD key is read at 0x100, not the legacy 0x2b0 offset');
  assert.equal(JSON.stringify(revealed).includes(Buffer.from(fixture.key).toString('hex')), false);
});

test('invalid CPU key sizes reject; incorrect key does not produce fields', async () => {
  const fixture = withSyntheticKeyvault();
  await assert.rejects(analyzeNand(fixture.image, { cpuKey: new Uint8Array(15) }), /Invalid CPU key/);
  const report = await analyzeNand(fixture.image, { cpuKey: new Uint8Array(16).fill(0xaa) });
  assert.equal(report.keyvault.status, 'implausible');
  assert.equal(report.keyvault.fields, undefined);
});

test('a declared alternate Keyvault location is not interpreted as the fixed retail layout', async () => {
  const fixture = withSyntheticKeyvault();
  new DataView(fixture.image.buffer).setUint32(0x6c, 0x8000, false);
  const report = await analyzeNand(fixture.image, { cpuKey: fixture.key });
  assert.equal(report.keyvault.status, 'unavailable');
  assert.equal(report.keyvault.fields, undefined);
  assert.match(report.warnings.join(' '), /declared Keyvault offset/);
});

test('input and key remain unchanged; redaction makes a detached report', async () => {
  const fixture = withSyntheticKeyvault();
  const before = new Uint8Array(fixture.image);
  const beforeKey = new Uint8Array(fixture.key);
  const report = await analyzeNand(fixture.image, { cpuKey: fixture.key, includeSensitive: true });
  assert.deepEqual(fixture.image, before);
  assert.deepEqual(fixture.key, beforeKey);
  const redacted = redactReport(report);
  assert.equal(redacted.privacy.redacted, true);
  assert.equal(redacted.keyvault.fields.serial, '<REDACTED>');
  assert.equal(report.keyvault.fields.serial, fixture.serial);
  redacted.blocks[0].status = 'erased';
  assert.notEqual(report.blocks[0].status, 'erased');
});

test('standalone Node bundle matches the core JSON and never discovers adjacent keys', async () => {
  const fixture = withSyntheticKeyvault();
  const imagePath = path.join(directory, 'synthetic-input.bin');
  await writeFile(imagePath, fixture.image);
  await writeFile(path.join(directory, 'cpukey.txt'), Buffer.from(fixture.key).toString('hex'));
  const result = cli(['--input', imagePath, '--json']);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), await analyzeNand(fixture.image));
  assert.equal(JSON.parse(result.stdout).keyvault.status, 'not-requested');
  assert.equal(result.stdout.includes(imagePath), false);
});

test('CLI explicit key file stays redacted unless requested and creates owner-only reports', async () => {
  const fixture = withSyntheticKeyvault();
  const imagePath = path.join(directory, 'keyed-input.bin');
  const keyPath = path.join(directory, 'explicit-key.txt');
  const outPath = path.join(directory, 'private-report.json');
  await writeFile(imagePath, fixture.image);
  await writeFile(keyPath, Buffer.from(fixture.key).toString('hex'));
  const result = cli(['--input', imagePath, '--cpu-key-file', keyPath, '--json', '--out', outPath]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.includes(outPath), false);
  assert.equal(JSON.parse(await readFile(outPath, 'utf8')).keyvault.fields.serial, '<REDACTED>');
  if (process.platform !== 'win32') assert.equal((await stat(outPath)).mode & 0o777, 0o600);
  const revealed = cli(['--input', imagePath, '--cpu-key-file', keyPath, '--include-sensitive', '--json']);
  assert.equal(revealed.status, 0);
  assert.equal(JSON.parse(revealed.stdout).keyvault.fields.serial, fixture.serial);
});

test('CLI refuses existing output, input/key overwrite, raw key arguments, directories and unsupported files', async () => {
  const fixture = withSyntheticKeyvault();
  const imagePath = path.join(directory, 'protected-input.bin');
  const keyPath = path.join(directory, 'protected-key.txt');
  const outputPath = path.join(directory, 'already-present.txt');
  await writeFile(imagePath, fixture.image);
  await writeFile(keyPath, Buffer.from(fixture.key).toString('hex'));
  await writeFile(outputPath, 'KEEP');
  for (const args of [
    ['--input', imagePath, '--out', imagePath],
    ['--input', imagePath, '--cpu-key-file', keyPath, '--out', keyPath],
    ['--input', imagePath, '--out', outputPath],
    ['--input', imagePath, Buffer.from(fixture.key).toString('hex')],
    ['--input', directory], ['--input', outputPath], ['--input', 'missing-private-name'],
  ]) {
    const result = cli(args);
    assert.equal(result.status, 1);
    for (const value of [imagePath, keyPath, outputPath, 'missing-private-name', fixture.serial]) assert.equal(result.stderr.includes(value), false);
  }
  assert.deepEqual(new Uint8Array(await readFile(imagePath)), fixture.image);
  assert.equal(await readFile(keyPath, 'utf8'), Buffer.from(fixture.key).toString('hex'));
  assert.equal(await readFile(outputPath, 'utf8'), 'KEEP');
  assert.equal(cli(['--help']).status, 0);
});

test('CLI rejects named pipes for input and key files without waiting for a writer', { skip: process.platform === 'win32' }, async () => {
  const pipePath = path.join(directory, 'synthetic-pipe');
  const imagePath = path.join(directory, 'pipe-test-input.bin');
  const created = spawnSync('mkfifo', [pipePath], { encoding: 'utf8', timeout: 1500 });
  assert.equal(created.status, 0, 'create a temporary test FIFO');
  await writeFile(imagePath, blankImage());
  for (const args of [['--input', pipePath], ['--input', imagePath, '--cpu-key-file', pipePath]]) {
    const result = spawnSync(process.execPath, [path.join(directory, 'cli.mjs'), ...args], { encoding: 'utf8', timeout: 1500, killSignal: 'SIGKILL' });
    assert.equal(result.error, undefined, 'CLI exits instead of timing out on a FIFO');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /readable regular files/);
    assert.equal(result.stderr.includes(pipePath), false);
  }
});
