import MarkdownIt from 'markdown-it';
import path from 'node:path';
import { outputFor, repository, pages } from './content.mjs';
import { renderTimeline } from './timeline.mjs';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const slug = text => text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/ /g, '-');

export function renderMarkdown(source, file) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  const headings = [];
  const seen = new Set();
  const headingRenderer = md.renderer.rules.heading_open;
  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const label = tokens[index + 1].children?.filter(token => token.type === 'text' || token.type === 'code_inline').map(token => token.content).join('') || tokens[index + 1].content;
    const base = slug(label);
    let id = base;
    let count = 0;
    while (seen.has(id)) id = `${base}-${++count}`;
    seen.add(id);
    tokens[index].attrSet('id', id);
    if (tokens[index].tag === 'h2') headings.push({ id, label });
    return headingRenderer ? headingRenderer(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
  };
  const linkRenderer = md.renderer.rules.link_open;
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const href = token.attrGet('href');
    if (href && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) {
      const [, pathname, suffix = ''] = href.match(/^([^?#]*)([?#].*)?$/);
      if (pathname.endsWith('.md')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURI(pathname)));
        if (pages.some(page => page.file === target)) {
          token.attrSet('href', path.posix.relative(path.posix.dirname(outputFor(file)), outputFor(target)) + suffix);
        }
      } else if (/\.(?:js|mjs)$/.test(pathname)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), pathname));
        token.attrSet('href', `${repository}/blob/main/${target}${suffix}`);
      }
    }
    return linkRenderer ? linkRenderer(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
  };
  md.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable reference table"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';
  md.core.ruler.after('inline', 'status-notes', state => {
    for (let index = 0; index < state.tokens.length; index++) {
      if (state.tokens[index].type !== 'blockquote_open') continue;
      const text = state.tokens[index + 2]?.content || '';
      const status = text.match(/^\*\*(Legacy|Beta)\*\*/)?.[1].toLowerCase();
      if (status) state.tokens[index].attrSet('class', `status-note status-${status}`);
    }
  });
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    if (tokens[index].info.trim() !== 'mermaid') return fence(tokens, index, options, env, self);
    return `<figure class="diagram"><div class="diagram-canvas" aria-label="Rendered concept diagram"></div><details open><summary>Diagram source · Mermaid</summary><pre><code class="language-mermaid">${escapeHtml(tokens[index].content)}</code></pre></details></figure>`;
  };
  const cleanSource = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const tokens = md.parse(cleanSource, {});
  const render = part => md.renderer.render(part, md.options, {});
  const html = file === 'docs/EXPLOIT_TIMELINE.md' ? renderTimeline(tokens, render, escapeHtml) : render(tokens);
  return { html, headings };
}
