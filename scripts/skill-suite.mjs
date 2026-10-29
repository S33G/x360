#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { skillCatalog, filesForSkill, skillRepository } from './skill-catalog.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const markdown = new MarkdownIt();

export function referenceCopy(source, sourceFile, skill) {
  const localCopies = new Map(Object.entries(skill.references).map(([target, original]) => [original, target]));
  const portableLink = href => {
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(href)) return href;
    const [, pathname, suffix = ''] = href.match(/^([^?#]*)([?#].*)?$/);
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), decodeURI(pathname)));
    if (target.startsWith('../') || path.posix.isAbsolute(target)) throw new Error('Reference escapes repository');
    if (localCopies.has(target)) return localCopies.get(target) + suffix;
    return `${skillRepository}/blob/main/${target}${suffix}`;
  };
  let fence = null;
  const content = source.split('\n').map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return line;
    }
    if (fence) return line;
    return line
      .replace(/(\]\()([^\s)]+)(?=\))/g, (_, prefix, href) => prefix + portableLink(href))
      .replace(/^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/, (_, prefix, href) => prefix + portableLink(href));
  }).join('\n');
  const hash = createHash('sha256').update(source).digest('hex');
  return `<!-- Generated from ${sourceFile}; edit the canonical chapter and run npm run skills:sync. -->\n<!-- Source SHA-256: ${hash} -->\n\n${content}`;
}

export async function checkReferences(root = repositoryRoot, write = false) {
  const stale = [];
  for (const skill of skillCatalog) {
    for (const [target, sourceFile] of Object.entries(skill.references)) {
      const source = await readFile(path.join(root, sourceFile), 'utf8');
      const expected = referenceCopy(source, sourceFile, skill);
      const destination = `skills/${skill.name}/references/${target}`;
      const absolute = path.join(root, destination);
      let current;
      try { current = await readFile(absolute, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (current === expected) continue;
      if (write) {
        await mkdir(path.dirname(absolute), { recursive: true });
        await writeFile(absolute, expected);
      } else stale.push(`${destination}: missing or stale; run npm run skills:sync`);
    }
  }
  return stale;
}

async function collectFiles(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, relative));
    else files.push(relative);
  }
  return files.sort();
}

function metadataErrors(source, name) {
  const errors = [];
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return ['SKILL.md: missing YAML frontmatter'];
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s*(?:#|$)/.test(line) || /^ {2}[a-z][a-z0-9_-]*:\s*.+$/.test(line)) continue;
    const field = line.match(/^([a-z][a-z0-9-]*):\s*(.*)$/);
    if (!field) { errors.push('SKILL.md: unsupported frontmatter syntax'); continue; }
    if (fields.has(field[1])) errors.push(`SKILL.md: duplicate ${field[1]}`);
    fields.set(field[1], field[2].replace(/^(["'])(.*)\1$/, '$2'));
  }
  if (fields.get('name') !== name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) errors.push('SKILL.md: invalid or mismatched name');
  const description = fields.get('description');
  if (!description || description.length > 1024) errors.push('SKILL.md: description must have 1–1024 characters');
  for (const key of fields.keys()) {
    if (!['name', 'description', 'compatibility', 'metadata', 'license'].includes(key)) errors.push(`SKILL.md: non-portable field ${key}`);
  }
  if ((fields.get('compatibility') || '').length > 500) errors.push('SKILL.md: compatibility exceeds 500 characters');
  return errors;
}

export async function checkSkill(root, skill) {
  const errors = [];
  let files;
  try { files = await collectFiles(root); } catch { return [`${skill.name}: missing skill directory`]; }
  const allowed = new Set(filesForSkill(skill));
  const actual = new Set(files);
  for (const file of files) if (!allowed.has(file)) errors.push(`${file}: unexpected file`);
  for (const file of allowed) if (!actual.has(file)) errors.push(`${file}: missing file`);
  for (const file of files) {
    const absolute = path.join(root, file);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) { errors.push(`${file}: symlinks are not portable`); continue; }
    if (!allowed.has(file)) continue;
    const bytes = await readFile(absolute);
    if (bytes.includes(0)) { errors.push(`${file}: binary data is not expected`); continue; }
    const source = bytes.toString('utf8');
    if (file === 'SKILL.md') errors.push(...metadataErrors(source, skill.name));
    if (!file.endsWith('.md')) continue;
    const visit = async tokens => {
      for (const token of tokens) {
        const href = token.attrGet('href') || token.attrGet('src');
        if (href && !/^(?:https?:|mailto:|#)/i.test(href)) {
          const target = decodeURI(href.split(/[?#]/)[0]);
          const resolved = path.resolve(path.dirname(absolute), target);
          const relative = path.relative(root, resolved);
          if (/^[a-z][a-z\d+.-]*:/i.test(target) || path.isAbsolute(target) || relative.startsWith('..') || path.isAbsolute(relative)) {
            errors.push(`${file}: ${href} escapes skill folder`);
          } else if (!actual.has(relative.split(path.sep).join('/'))) {
            errors.push(`${file}: ${href} missing reference`);
          }
        }
        if (token.children) await visit(token.children);
      }
    };
    await visit(markdown.parse(source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''), {}));
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== '--write')) {
    console.error('Usage: node scripts/skill-suite.mjs [--write]');
    process.exitCode = 2;
  } else {
    try {
      const errors = await checkReferences(repositoryRoot, args.includes('--write'));
      for (const skill of skillCatalog) errors.push(...(await checkSkill(path.join(repositoryRoot, 'skills', skill.name), skill)).map(error => `${skill.name}: ${error}`));
      if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
      else console.log(`Skill checks passed: ${skillCatalog.length} self-contained folders; canonical references match.`);
    } catch {
      console.error('Skill checks could not complete. Check the catalog and file access.');
      process.exitCode = 2;
    }
  }
}
