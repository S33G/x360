import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()];
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function attributes(tag) {
  const result = new Map();
  const expression = /([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s<>]+)))?/g;
  for (const match of tag.replace(/^<\/?[^\s>]+/, '').matchAll(expression)) {
    result.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  return result;
}

function inspectHtml(source) {
  // Do not mistake text in comments, scripts, or styles for document links/IDs.
  const markup = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, '<$1$2></$1>');
  const tags = [...markup.matchAll(/<[a-z][\w:-]*\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)].map(match => ({
    name: match[0].match(/^<([\w:-]+)/)[1].toLowerCase(), attrs: attributes(match[0])
  }));
  const ids = new Set();
  const links = [];
  for (const { name, attrs } of tags) {
    if (attrs.has('id')) ids.add(attrs.get('id'));
    if (name === 'a' && attrs.has('name')) ids.add(attrs.get('name'));
    for (const attribute of ['href', 'src', 'xlink:href']) {
      if (attrs.has(attribute)) links.push(attrs.get(attribute));
    }
  }
  return { markup, tags, ids, links };
}

function mermaidBlocks(markdown) {
  const blocks = [];
  let marker;
  let lines = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!marker) {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})mermaid\s*$/);
      if (opening) marker = opening[1];
    } else if (new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(line)) {
      blocks.push(lines.join('\n').trim());
      marker = undefined;
      lines = [];
    } else lines.push(line);
  }
  return blocks;
}

/** Check a generated site without executing its JavaScript or following network URLs. */
export async function checkSite(directory) {
  const root = path.resolve(directory);
  const errors = [];
  const files = new Set();
  async function walk(relative = '') {
    let entries;
    try { entries = await readdir(path.join(root, relative), { withFileTypes: true }); }
    catch { errors.push(`${relative || 'site'}: cannot read directory`); return; }
    for (const entry of entries) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isSymbolicLink()) errors.push(`${name}: symbolic links are not publishable`);
      else if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) files.add(name);
    }
  }
  await walk();
  if (!files.has('index.html')) errors.push('index.html: missing entry page');
  const pages = new Map();
  for (const file of [...files].filter(name => name.endsWith('.html')).sort()) {
    const source = await readFile(path.join(root, file), 'utf8');
    const parsed = inspectHtml(source);
    pages.set(file, parsed);
    if (parsed.tags.some(tag => tag.attrs.get('class')?.split(/\s+/).includes('console-model'))) {
      for (const required of ['assets/console-mesh.json', 'assets/console-model.LICENSE.md']) {
        if (!files.has(required)) errors.push(`${file}: missing homepage asset ${required}`);
      }
    }
    if (!parsed.tags.find(tag => tag.name === 'html')?.attrs.get('lang')?.trim()) errors.push(`${file}: missing nonempty html lang`);
    const title = parsed.markup.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
    if (!title?.replace(/<[^>]*>/g, '').trim()) errors.push(`${file}: missing nonempty title`);
    const main = parsed.markup.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1];
    if (!main?.trim()) errors.push(`${file}: missing nonempty main`);
    if (/file:\/\/|\/(?:Users|home|private\/tmp|private\/var\/folders)\/|\b[A-Za-z]:\\/i.test(decodeEntities(source))) {
      errors.push(`${file}: contains file: URL or absolute local path`);
    }
    if (/^(?:docs|skills)\//.test(file)) {
      const raw = file.replace(/\.html$/, '.md');
      if (!files.has(raw)) errors.push(`${file}: missing raw Markdown counterpart ${raw}`);
      else {
        const markdown = await readFile(path.join(root, raw), 'utf8');
        const retained = [...source.matchAll(/(<code\b(?:"[^"]*"|'[^']*'|[^'">])*?>)([\s\S]*?)<\/code\s*>/gi)]
          .filter(match => attributes(match[1]).get('class')?.split(/\s+/).includes('language-mermaid'))
          .map(match => decodeEntities(match[2]).replace(/\r\n/g, '\n').trim());
        for (const block of mermaidBlocks(markdown)) {
          const index = retained.indexOf(block);
          if (index < 0) errors.push(`${file}: Mermaid source was lost or changed`);
          else retained.splice(index, 1);
        }
      }
    }
  }

  const references = new Map([...pages].map(([file, page]) => [file, page.links]));
  // esbuild emits literal module URLs. Check lazy and static imports as well as
  // HTML references, without evaluating any generated or third-party code.
  for (const file of [...files].filter(name => /^assets\/.*\.js$/.test(name))) {
    const source = await readFile(path.join(root, file), 'utf8');
    const imports = [
      /\bimport\s*\(\s*["']((?:\.{1,2}\/|\/)[^"']+)["']\s*\)/g,
      /\b(?:import|export)\s*(?:\{[^}]*\}|\*\s*(?:as\s+\w+)?|[$\w]+(?:\s*,\s*\{[^}]*\})?)\s*from\s*["']((?:\.{1,2}\/|\/)[^"']+)["']/g,
      /\bimport\s*["']((?:\.{1,2}\/|\/)[^"']+)["']/g
    ].flatMap(expression => [...source.matchAll(expression)].map(match => match[1]));
    references.set(file, imports);
  }
  for (const [file, links] of references) {
    for (const original of links) {
      const link = original.trim();
      const label = `${file}: ${original}`;
      if (/^(?:https?:|mailto:|tel:)/i.test(link)) continue;
      if (/^[a-z][a-z\d+.-]*:/i.test(link)) { errors.push(`${label}: unsupported URL scheme`); continue; }
      if (link.startsWith('/')) { errors.push(`${label}: root-relative URL breaks nested hosting`); continue; }
      if (link.includes('\\')) { errors.push(`${label}: backslash or local path in URL`); continue; }
      let pathname;
      let fragment;
      try {
        pathname = decodeURIComponent(link.split(/[?#]/, 1)[0]);
        fragment = link.includes('#') ? decodeURIComponent(link.slice(link.indexOf('#') + 1)).split(':~:')[0] : '';
      } catch { errors.push(`${label}: invalid percent encoding`); continue; }
      if (pathname.includes('\\') || pathname.includes('\0')) { errors.push(`${label}: invalid path characters`); continue; }
      const absolute = pathname ? path.resolve(root, path.posix.dirname(file), pathname) : path.join(root, file);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) { errors.push(`${label}: escapes site root`); continue; }
      let target = relative;
      if (!files.has(target) && files.has(path.posix.join(target, 'index.html'))) target = path.posix.join(target, 'index.html');
      if (!files.has(target)) { errors.push(`${label}: missing target`); continue; }
      if (fragment && pages.has(target) && !pages.get(target).ids.has(fragment)) errors.push(`${label}: missing anchor`);
    }
  }
  for (const required of ['assets/client.js']) {
    if (!files.has(required) || !(await readFile(path.join(root, required), 'utf8')).trim()) errors.push(`${required}: missing or empty bundle`);
  }
  const chunks = [...files].filter(file => /^assets\/vendor\/.+\.js$/.test(file));
  if (!chunks.length) errors.push('assets/vendor: missing JavaScript chunks');
  for (const chunk of chunks) {
    if (!(await readFile(path.join(root, chunk), 'utf8')).trim()) errors.push(`${chunk}: empty JavaScript chunk`);
  }
  return { errors: [...new Set(errors)], pages: pages.size, files: files.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkSite(process.argv[2] || fileURLToPath(new URL('../dist/', import.meta.url)));
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Site checks passed: ${result.pages} pages, ${result.files} files.`);
}
