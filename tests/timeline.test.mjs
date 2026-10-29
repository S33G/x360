import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderMarkdown } from '../site/markdown.mjs';
import { pages } from '../site/content.mjs';
import { pageTemplate } from '../site/template.mjs';
import { methodStatus, glitchOrder, methodKey } from '../site/method-meta.mjs';
import { getBoardOptions } from '../site/path-picker.mjs';

const timelineFile = 'docs/EXPLOIT_TIMELINE.md';
const fixture = '# Timeline\n\nIntro.\n\n## Recent era\n\n### 2026 — Recent milestone\n\n> **Beta** — Still evolving.\n\n[Read more](exploits/RGH13.md).\n\n### 2025 — Earlier milestone\n\nPreserved detail.\n\n## Early era\n\n### 2007 — Old milestone\n\n> **Legacy** — Historical requirements.\n\n## Reading this timeline\n\nKeep the caveat.\n';

test('timeline enhancement retains Markdown content, links and stable anchors without JavaScript', () => {
  const { html, headings } = renderMarkdown(fixture, timelineFile);
  assert.equal((html.match(/class="timeline-event"/g) || []).length, 3);
  assert.match(html, /3 milestones/);
  assert.match(html, /href="#recent-era"/);
  assert.match(html, /id="2026--recent-milestone"/);
  assert.match(html, /href="exploits\/RGH13.html"/);
  assert.match(html, /status-note status-beta/);
  assert.match(html, /status-note status-legacy/);
  assert.match(html, /Preserved detail/);
  assert.match(html, /Keep the caveat/);
  assert.equal(headings.length, 3);
  assert.doesNotMatch(html, /<script/);
});

test('timeline handles ordinary sections and escapes untrusted titles', () => {
  const { html } = renderMarkdown('# Timeline\n\n## Notes\n\n### Undated heading\n\nKeep this too.\n\n## Era\n\n### 2026 — <img src=x onerror=alert(1)>\n\nText.\n', timelineFile);
  assert.match(html, /Undated heading/);
  assert.match(html, /Keep this too/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img/);
});

test('canonical timeline is ordinary Markdown and every milestone reaches the web version', async () => {
  const source = await readFile(new URL('../docs/EXPLOIT_TIMELINE.md', import.meta.url), 'utf8');
  const milestones = [...source.matchAll(/^### .+ — .+$/gm)];
  assert.ok(milestones.length >= 20);
  assert.doesNotMatch(source, /<(?:section|article|div|ol)\b|```mermaid/);
  const { html } = renderMarkdown(source, timelineFile);
  assert.equal((html.match(/class="timeline-event"/g) || []).length, milestones.length);
  assert.ok(html.indexOf('2026') < html.indexOf('2006'));
  assert.match(html, /class="timeline-status is-legacy">Legacy release<\/strong>/);
  assert.match(html, /class="timeline-status is-beta">Beta<\/strong>/);
  const jtag = source.split('### 2009 —')[1].split('\n### ')[0];
  assert.match(jtag, /remains useful/);
  assert.doesNotMatch(jtag, /\*\*Legacy/);
});

test('status badges agree with visible Markdown notices and do not mark current older methods obsolete', async () => {
  for (const [name, status] of Object.entries(methodStatus)) {
    const file = `docs/exploits/${name}.md`;
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(source, new RegExp(`^> \\*\\*${status === 'legacy' ? 'Legacy' : 'Beta'}\\*\\*`, 'm'), name);
    const page = pages.find(item => item.file === file);
    assert.equal(page.status, status);
    const html = pageTemplate(page, renderMarkdown(source, file), source);
    assert.match(html, new RegExp(`class="method-badge is-${status}"`));
  }
  for (const name of ['JTAG', 'RGH12', 'SRGH', 'MUFAS', 'EXT_CLK']) assert.equal(methodStatus[name], undefined);
});

test('sidebar and picker keep newer glitch variants ahead of legacy methods', () => {
  assert.deepEqual(pages.filter(page => page.group === 'Hardware glitch methods').map(page => methodKey(page.file)), glitchOrder);
  const falcon = getBoardOptions('falcon');
  const current = falcon.current.map(item => item.id);
  assert.ok(current.indexOf('rgh3') < current.indexOf('rgh12'));
  const other = falcon.other.map(item => item.id);
  assert.equal(other[0], 'rgh13');
  assert.ok(other.indexOf('rgh2') < other.indexOf('rgh1'));
});
