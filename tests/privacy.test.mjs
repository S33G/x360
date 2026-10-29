import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanner = path.join(root, 'scripts/check-secrets.mjs');
const analyzer = path.join(root, 'skills/xbox360-nand-analysis/scripts/x360nand.mjs');
const cpu = Buffer.alloc(16, 0x12);
const dvd = Buffer.alloc(16, 0x34);
const serial = '1'.repeat(12);
const consoleId = Buffer.alloc(5, 0x56);

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'x360-privacy-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function run(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
  return { status: result.status, output: result.stdout + result.stderr };
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, 'temporary Git repository operation succeeds');
}

test('scanner reports secret types and locations without echoing values', (t) => {
  const dir = temporary(t);
  const privatePath = '/' + ['Users', 'synthetic-person', 'private-data'].join('/');
  fs.writeFileSync(path.join(dir, 'notes.md'), [
    `CPU key: ${cpu.toString('hex')}`,
    `DVD key: ${dvd.toString('hex')}`,
    `Serial: ${serial}`,
    `Console ID: ${consoleId.toString('hex')}`,
    `Input: ${privatePath}`,
  ].join('\n'));
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  for (const value of [cpu.toString('hex'), dvd.toString('hex'), serial, consoleId.toString('hex'), privatePath]) {
    assert.equal(result.output.includes(value), false, 'report must not reveal a matched value');
  }
  assert.match(result.output, /key-like-hex/);
  assert.match(result.output, /console-identifier/);
  assert.match(result.output, /personal-absolute-path/);
  assert.match(result.output, /"line":5/);
});

test('scanner accepts placeholders and ordinary long content hashes', (t) => {
  const dir = temporary(t);
  fs.writeFileSync(path.join(dir, 'notes.md'), [
    'CPU key: <REDACTED_CPU_KEY>',
    'Serial: <REDACTED_SERIAL>',
    `sha1=${'a'.repeat(40)}`,
    `sha256=${'b'.repeat(64)}`,
  ].join('\n'));
  assert.equal(run(scanner, [], dir).status, 0);
});

test('scanner catches quoted and unquoted passwords without echoing them', (t) => {
  const dir = temporary(t);
  const secret = ['synthetic', 'password', 'fixture'].join('-');
  fs.writeFileSync(path.join(dir, 'config.txt'), `password: ${secret}\napi_key = "${secret}"\n`);
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /credential-assignment/);
  assert.equal(result.output.includes(secret), false);
});

test('scanner catches spaced console identifiers and Windows personal paths', (t) => {
  const dir = temporary(t);
  const windowsPath = ['C:', 'Users', 'synthetic-person', 'private-data'].join('\\');
  const id = Array(5).fill('56').join(' ');
  fs.writeFileSync(path.join(dir, 'notes.txt'), `Console ID: ${id}\nInput: ${windowsPath}\n`);
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /console-identifier/);
  assert.match(result.output, /personal-absolute-path/);
  assert.equal(result.output.includes(windowsPath), false);
  assert.equal(result.output.includes(id), false);
});

test('public constants are exempt only in reviewed file and context', (t) => {
  const dir = temporary(t);
  fs.mkdirSync(path.join(dir, 'docs'));
  const marker = '0'.repeat(16);
  fs.writeFileSync(path.join(dir, 'docs/PEER_PRESSURE_GUIDE.md'), `Content/${marker}/\n`);
  assert.equal(run(scanner, [], dir).status, 0);
  fs.writeFileSync(path.join(dir, 'notes.md'), `${marker}\n`);
  assert.equal(run(scanner, [], dir).status, 1);
});

test('reviewed vendor constants do not exempt an injected full key', (t) => {
  const dir = temporary(t);
  fs.mkdirSync(path.join(dir, 'dist/assets/vendor'), { recursive: true });
  const file = path.join(dir, 'dist/assets/vendor/chunk-fixture.js');
  const publicValues = `const max=${Number.MAX_SAFE_INTEGER},alphabet="${'01234567' + '89abcdef'}";`;
  fs.writeFileSync(file, publicValues);
  assert.equal(run(scanner, [], dir).status, 0);
  fs.writeFileSync(file, `${publicValues}const unknown="${cpu.toString('hex')}";`);
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /key-like-hex/);
  assert.equal(result.output.includes(cpu.toString('hex')), false);
});

test('vendor exceptions never apply to authored or first-party generated content', (t) => {
  const dir = temporary(t);
  const files = ['docs/example.md', 'dist/index.html', 'dist/docs/example.md', 'dist/search-index.json', 'dist/assets/client.js'];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), String(Number.MAX_SAFE_INTEGER));
  }
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  for (const file of files) assert.equal(result.output.includes(file), true);
});

test('vendor constants do not suppress other credential rules on the same line', (t) => {
  const dir = temporary(t);
  fs.mkdirSync(path.join(dir, 'dist/assets/vendor'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist/assets/vendor/chunk-fixture.js'), `const max=${Number.MAX_SAFE_INTEGER}; password="${['synthetic', 'credential'].join('-')}";`);
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /credential-assignment/);
});

test('reviewed vendor parser tables do not exempt injected byte sequences', (t) => {
  const dir = temporary(t);
  fs.mkdirSync(path.join(dir, 'dist/assets/vendor'), { recursive: true });
  const file = path.join(dir, 'dist/assets/vendor/chunk-fixture.js');
  const parserTable = Array.from({ length: 16 }, (_, i) => i + 10).join(',');
  fs.writeFileSync(file, `const table=[${parserTable}];`);
  assert.equal(run(scanner, [], dir).status, 0);
  const unknown = Array(16).fill('ab').join(',');
  fs.writeFileSync(file, `const table=[${parserTable}],unknown="${unknown}";`);
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /key-like-hex/);
  assert.equal(result.output.includes(unknown), false);
});

test('scanner checks ignored artifacts and hides sensitive filenames', (t) => {
  const dir = temporary(t);
  git(dir, ['init', '-q']);
  fs.writeFileSync(path.join(dir, '.gitignore'), '*.bin\n');
  fs.writeFileSync(path.join(dir, `dump-${serial}.bin`), Buffer.alloc(4));
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /sensitive-artifact/);
  assert.equal(result.output.includes(serial), false);
  assert.equal(result.output.includes(`dump-${serial}.bin`), false);
});

test('masked filenames still count as distinct artifact findings', (t) => {
  const dir = temporary(t);
  fs.writeFileSync(path.join(dir, `dump-${serial}.bin`), Buffer.alloc(4));
  fs.writeFileSync(path.join(dir, `other-${serial}.bin`), Buffer.alloc(4));
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.equal((result.output.match(/"type":"sensitive-artifact"/g) || []).length, 2);
  assert.equal(result.output.includes(serial), false);
});

test('history scan catches deleted secrets without printing them', (t) => {
  const dir = temporary(t);
  git(dir, ['init', '-q']);
  fs.writeFileSync(path.join(dir, 'old.md'), `CPU key: ${cpu.toString('hex')}\n`);
  git(dir, ['add', 'old.md']);
  git(dir, ['-c', 'user.name=Synthetic Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', "Synthetic fixture\n\nCo-Author: s33g's Agent"]);
  fs.writeFileSync(path.join(dir, 'old.md'), 'CPU key: <REDACTED_CPU_KEY>\n');
  git(dir, ['add', 'old.md']);
  git(dir, ['-c', 'user.name=Synthetic Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', "Redacted fixture\n\nCo-Author: s33g's Agent"]);
  assert.equal(run(scanner, [], dir).status, 0);
  const result = run(scanner, ['--history'], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /key-like-hex/);
  assert.equal(result.output.includes(cpu.toString('hex')), false);
});

test('scanner does not follow symlinks outside the repository', (t) => {
  const dir = temporary(t);
  const outside = temporary(t);
  fs.writeFileSync(path.join(outside, 'private.txt'), cpu.toString('hex'));
  fs.symlinkSync(outside, path.join(dir, 'outside'));
  assert.equal(run(scanner, [], dir).status, 0);
});

function rc4Fixture(key, input) {
  const state = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + state[i] + key[i % key.length]) % 256;
    [state[i], state[j]] = [state[j], state[i]];
  }
  let i = 0;
  j = 0;
  return Buffer.from(input.map((byte) => {
    i = (i + 1) % 256;
    j = (j + state[i]) % 256;
    [state[i], state[j]] = [state[j], state[i]];
    return byte ^ state[(state[i] + state[j]) % 256];
  }));
}

function imageFixture(t, { rawWithOob = false } = {}) {
  const dir = temporary(t);
  const image = Buffer.alloc(0x1000000);
  image.writeUInt16BE(0xff4f, 0);
  const kv = Buffer.alloc(0x4000);
  kv.write(serial, 0xb0, 'ascii');
  dvd.copy(kv, 0x100);
  consoleId.copy(kv, 0x9ca);
  const key = crypto.createHmac('sha1', cpu).update(kv.subarray(0, 16)).digest().subarray(0, 16);
  const encrypted = Buffer.concat([kv.subarray(0, 16), rc4Fixture(key, kv.subarray(16))]);
  encrypted.copy(image, 0x4000);
  const filename = path.join(dir, 'synthetic-input.bin');
  if (rawWithOob) {
    const raw = Buffer.alloc(0x1080000, 0xff);
    for (let page = 0; page < image.length / 0x200; page++) {
      image.copy(raw, page * 0x210, page * 0x200, (page + 1) * 0x200);
    }
    fs.writeFileSync(filename, raw);
  } else {
    fs.writeFileSync(filename, image);
  }
  fs.writeFileSync(path.join(dir, 'cpukey.txt'), cpu.toString('hex'));
  return { dir, filename };
}

test('analyzer hides identity, key values, and input paths by default', (t) => {
  const { dir, filename } = imageFixture(t);
  const result = run(analyzer, ['--input', filename, '--cpu-key-file', path.join(dir, 'cpukey.txt')], dir);
  assert.equal(result.status, 0);
  for (const value of [cpu.toString('hex'), dvd.toString('hex'), serial, consoleId.toString('hex'), filename]) {
    assert.equal(result.output.toLowerCase().includes(value.toLowerCase()), false, 'default output must be redacted');
  }
  assert.match(result.output, /Keyvault/);
  assert.match(result.output, /REDACTED/);
});

test('analyzer requires an explicit flag to display identity and never prints CPU key', (t) => {
  const { dir, filename } = imageFixture(t);
  const result = run(analyzer, ['--input', filename, '--cpu-key-file', path.join(dir, 'cpukey.txt'), '--include-sensitive'], dir);
  assert.equal(result.status, 0);
  assert.equal(result.output.includes(serial), true);
  assert.equal(result.output.toLowerCase().includes(dvd.toString('hex')), true);
  assert.equal(result.output.includes(cpu.toString('hex')), false);
});

test('analyzer does not disclose private paths when reading fails', (t) => {
  const dir = temporary(t);
  const filename = path.join(dir, `missing-${serial}.bin`);
  const result = run(analyzer, ['--input', filename, '--cpu-key-file', path.join(dir, 'cpukey.txt')], dir);
  assert.notEqual(result.status, 0);
  assert.equal(result.output.includes(filename), false);
  assert.equal(result.output.includes(serial), false);
});

test('analyzer presents serial and SMC checks as heuristics, not authentication', (t) => {
  const { dir, filename } = imageFixture(t);
  const result = run(analyzer, ['--input', filename, '--cpu-key-file', path.join(dir, 'cpukey.txt')], dir);
  assert.equal(result.status, 0);
  assert.match(result.output, /Keyvault plausibility[^\n]*serial-number[^\n]*does not authenticate/i);
  assert.match(result.output, /SMC:/);
  assert.doesNotMatch(result.output, /decrypted & verified|clean \(stock\)|hacked SMC/i);
});

test('analyzer continues to accept exact 16 MiB small-block raw layout', (t) => {
  const { dir, filename } = imageFixture(t, { rawWithOob: true });
  const result = run(analyzer, ['--input', filename, '--cpu-key-file', path.join(dir, 'cpukey.txt')], dir);
  assert.equal(result.status, 0);
  assert.match(result.output, /small-block-raw/);
  assert.match(result.output, /Keyvault/);
});

test('analyzer rejects unsupported sizes even when divisible by small-block page size', (t) => {
  const dir = temporary(t);
  const filename = path.join(dir, 'unsupported-synthetic-input.bin');
  fs.writeFileSync(filename, Buffer.alloc(0x1080000 + 0x210));
  const result = run(analyzer, ['--input', filename, '--cpu-key-file', path.join(dir, 'cpukey.txt')], dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /supported sizes/i);
  assert.doesNotMatch(result.output, /Bootloaders|Keyvault/);
  assert.equal(result.output.includes(filename), false);
});

test('public model URL exemption still catches a key on the same line', (t) => {
  const dir = temporary(t);
  fs.mkdirSync(path.join(dir, 'site'));
  const config = fs.readFileSync(path.join(root, 'site/model-config.mjs'), 'utf8');
  const file = path.join(dir, 'site/model-config.mjs');
  fs.writeFileSync(file, config);
  assert.equal(run(scanner, [], dir).status, 0);
  fs.writeFileSync(file, config.replace(';', `; const secret = "${cpu.toString('hex')}";`));
  const result = run(scanner, [], dir);
  assert.equal(result.status, 1);
  assert.equal(result.output.includes(cpu.toString('hex')), false);
  fs.writeFileSync(file, config.match(/edition-([a-f0-9]+)/)[1]);
  assert.equal(run(scanner, [], dir).status, 1, 'bare IDs remain findings');
});
