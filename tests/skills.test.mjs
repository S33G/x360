import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillCatalog, skillFiles } from '../scripts/skill-catalog.mjs';
import { checkSkill, checkReferences, referenceCopy } from '../scripts/skill-suite.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('each skill works when copied without the rest of the repository', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'x360-skills-'));
  try {
    for (const skill of skillCatalog) {
      const destination = path.join(temp, skill.name);
      await cp(path.join(root, 'skills', skill.name), destination, { recursive: true });
      assert.deepEqual(await checkSkill(destination, skill), [], skill.name);
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('bundled references match the canonical chapters', async () => {
  assert.deepEqual(await checkReferences(root), []);
});

test('reference copying keeps same-skill links local and makes other chapter links portable', () => {
  const skill = skillCatalog.find(item => item.name === 'xbox360-nand-structure');
  const source = '# NAND\n\n[Boot](BOOT_CHAIN.md#chain) [Other](CUSTOM_FIRMWARE.md) [Here](#nand)\n\n[detail]: BOOT_CHAIN.md#chain\n\n```text\n[example](BOOT_CHAIN.md)\n```\n';
  const copy = referenceCopy(source, 'docs/NAND_EXPLAINED.md', skill);
  assert.match(copy, /\[Boot\]\(boot-chain\.md#chain\)/);
  assert.match(copy, /\[Other\]\(https:\/\/github\.com\/s33G\/x360\/blob\/main\/docs\/CUSTOM_FIRMWARE\.md\)/);
  assert.match(copy, /\[Here\]\(#nand\)/);
  assert.match(copy, /\[detail\]: boot-chain\.md#chain/);
  assert.match(copy, /```text\n\[example\]\(BOOT_CHAIN\.md\)\n```/);
});

test('the portable-file allowlist includes the analyzer only in the analysis skill', () => {
  const scripts = skillFiles().filter(file => file.endsWith('.mjs'));
  assert.deepEqual(scripts, ['skills/xbox360-nand-analysis/scripts/x360nand.mjs']);
  assert.equal(new Set(skillFiles()).size, skillFiles().length);
});

test('validation rejects missing references, escaping paths and unexpected files', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'x360-skill-validation-'));
  const skill = skillCatalog.find(item => item.name === 'xbox360-boot-chain');
  const destination = path.join(temp, skill.name);
  try {
    await cp(path.join(root, 'skills', skill.name), destination, { recursive: true });
    const entry = path.join(destination, 'SKILL.md');
    await writeFile(entry, (await readFile(entry, 'utf8')) + '\n[Missing](references/missing.md)\n[Escape](../outside.md)\n');
    await writeFile(path.join(destination, 'unexpected.txt'), 'fixture');
    const errors = await checkSkill(destination, skill);
    assert.ok(errors.some(error => error.includes('references/missing.md') && error.includes('missing')));
    assert.ok(errors.some(error => error.includes('../outside.md') && error.includes('escapes')));
    assert.ok(errors.some(error => error.includes('unexpected.txt') && error.includes('unexpected')));
  } finally { await rm(temp, { recursive: true, force: true }); }
});
