import test from 'node:test';
import assert from 'node:assert/strict';

const renderer = await import('../site/markdown.mjs').catch(() => ({}));

test('Markdown links work inside nested GitHub Pages project paths', () => {
  assert.equal(typeof renderer.renderMarkdown, 'function');
  const { html } = renderer.renderMarkdown('# Hello\n\n[Next](../README.md#start-exploring) [NAND](NAND_EXPLAINED.md) [Source](https://example.com/readme.md)', 'docs/START_HERE.md');
  assert.match(html, /href="..\/index.html#start-exploring"/);
  assert.match(html, /href="NAND_EXPLAINED.html"/);
  assert.match(html, /href="https:\/\/example.com\/readme.md"/);
});

test('Headings expose GitHub-style anchors, including duplicate headings', () => {
  assert.equal(typeof renderer.renderMarkdown, 'function');
  const { html, headings } = renderer.renderMarkdown('# Start\n\n## M$ and NAND\n## M$ and NAND', 'README.md');
  assert.match(html, /id="m-and-nand"/);
  assert.match(html, /id="m-and-nand-1"/);
  assert.equal(headings.length, 2);
});

test('Mermaid stays available as safe readable source without JavaScript', () => {
  assert.equal(typeof renderer.renderMarkdown, 'function');
  const { html } = renderer.renderMarkdown('# Diagram\n\n```mermaid\nflowchart LR\n A[Input] --> B[Output]\n```', 'README.md');
  assert.match(html, /class="diagram"/);
  assert.match(html, /Diagram source/);
  assert.match(html, /A\[Input\] --&gt; B\[Output\]/);
});

test('Embedded HTML and dangerous link schemes are not executed', () => {
  assert.equal(typeof renderer.renderMarkdown, 'function');
  const { html } = renderer.renderMarkdown('# Safe\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))', 'README.md');
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test('Markdown links retain both query and fragment components', () => {
  const { html } = renderer.renderMarkdown('[Section](NAND_EXPLAINED.md?view=1#working-with-dumps)', 'docs/START_HERE.md');
  assert.match(html, /href="NAND_EXPLAINED.html\?view=1#working-with-dumps"/);
});

test('Heading deduplication avoids IDs already used by other heading text', () => {
  const { headings } = renderer.renderMarkdown('## Same\n## Same\n## Same-1', 'README.md');
  assert.deepEqual(headings.map(h => h.id), ['same', 'same-1', 'same-1-1']);
});

test('raw Markdown assets retain their extension instead of becoming nonexistent pages', () => {
  const { html } = renderer.renderMarkdown('[License](../assets/console-model.LICENSE.md)', 'docs/CREDITS.md');
  assert.match(html, /href="..\/assets\/console-model.LICENSE.md"/);
});
