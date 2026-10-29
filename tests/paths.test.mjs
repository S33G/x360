import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { getBoardOptions } from '../site/path-picker.mjs';
import { boards, methods } from '../site/paths-data.mjs';
import { pages, outputFor } from '../site/content.mjs';

const ids = entries => entries.map(entry => entry.id);
const allIds = selection => ids([...selection.current, ...selection.other]);

test('unknown board selections do not imply any supported route', () => {
  for (const value of ['unknown', 'not-a-board', '', undefined]) {
    assert.equal(getBoardOptions(value), null, `Unexpected options for ${value}`);
  }
});

test('Winchester exposes only Bad Update and no hardware or historical route', () => {
  const selection = getBoardOptions('winchester');
  assert.equal(selection.board.id, 'winchester');
  assert.deepEqual(ids(selection.current), ['bad-update']);
  assert.equal(selection.current[0].kind, 'software');
  assert.deepEqual(selection.other, []);
});

test('Corona, Waitsburg and Stingray retain Bad Update but exclude Peer Pressure', () => {
  for (const board of ['corona', 'waitsburg', 'stingray']) {
    const selection = getBoardOptions(board);
    assert.ok(ids(selection.current).includes('bad-update'), `${board} lost Bad Update`);
    assert.ok(!allIds(selection).includes('peer-pressure'), `${board} offered Peer Pressure`);
  }
});

test('Tonasket does not inherit early Jasper JTAG eligibility', () => {
  const selection = getBoardOptions('tonasket');
  assert.ok(!allIds(selection).includes('jtag'));
  assert.ok(ids(selection.current).includes('peer-pressure'));
  assert.ok(ids(selection.current).includes('rgh3'));
});

test('Xenon has an EXT_CLK candidate without being offered RGH3', () => {
  const selection = getBoardOptions('xenon');
  assert.ok(ids(selection.current).includes('ext-clk'));
  assert.ok(!allIds(selection).includes('rgh3'));
});

test('Falcon current routes stay separate from historical and beta alternatives', () => {
  const { current, other } = getBoardOptions('falcon');
  for (const id of ['bad-update', 'peer-pressure', 'jtag', 'rgh12', 'rgh3']) {
    assert.ok(ids(current).includes(id), `${id} missing from current routes`);
    assert.ok(!ids(other).includes(id), `${id} incorrectly placed among alternatives`);
  }
  for (const id of ['rgh1', 'rgh2', 'rjtag', 'rjtop', 'rgh13']) {
    assert.ok(ids(other).includes(id), `${id} missing from alternatives`);
    assert.ok(!ids(current).includes(id), `${id} incorrectly offered as current`);
  }
});

test('early-board historical and beta methods do not become current candidates', () => {
  const { current, other } = getBoardOptions('xenon');
  for (const id of ['king-kong', 'ext-plus3']) {
    assert.ok(ids(other).includes(id));
    assert.ok(!ids(current).includes(id));
  }
});

test('board and method identifiers are unique so selection cannot silently shadow an entry', () => {
  assert.equal(new Set(ids(boards)).size, boards.length, 'Duplicate board ID');
  assert.equal(new Set(ids(methods)).size, methods.length, 'Duplicate method ID');
});

test('every method link resolves to a published page from the comparison chapter', () => {
  const siteRoot = new URL('https://field-guide.example/x360/');
  const chapter = new URL('docs/BETTER_SOFTMOD.html', siteRoot);
  const published = new Set(pages.map(page => new URL(outputFor(page.file), siteRoot).href));
  for (const method of methods) {
    const target = new URL(method.href, chapter);
    target.hash = '';
    target.search = '';
    assert.ok(published.has(target.href), `${method.id} links to unpublished ${method.href}`);
  }
});

test('every exploit Markdown page is included in the explicit publication list', async () => {
  const files = await readdir(new URL('../docs/exploits/', import.meta.url), { recursive: true });
  const published = new Set(pages.map(page => path.posix.normalize(page.file)));
  const missing = files
    .filter(file => file.endsWith('.md'))
    .map(file => path.posix.join('docs/exploits', file))
    .filter(source => !published.has(source))
    .sort();
  assert.deepEqual(missing, [], 'Exploit pages missing from publication and navigation');
});

test('page identities and output paths are unique so no chapter is overwritten', () => {
  // The publication model uses the source file as a page's identity.
  const identities = pages.map(page => path.posix.normalize(page.file));
  const outputs = pages.map(page => path.posix.normalize(outputFor(page.file)));
  assert.equal(new Set(identities).size, pages.length, 'Duplicate page identity');
  assert.equal(new Set(outputs).size, pages.length, 'Duplicate page output path');
});
