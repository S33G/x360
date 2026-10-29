import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    // /x360/ is an optional local alias for testing GitHub Pages project hosting.
    let pathname = decodeURIComponent(url.pathname).replace(/^\/x360(?=\/)/, '');
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filename = path.resolve(root, `.${pathname}`);
    if (!filename.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end('Forbidden'); return; }
    if (!(await stat(filename)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(filename));
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Page not found. Build the guide with npm run build.'); }
}).listen(4173, '127.0.0.1', () => console.log('Field Guide: http://127.0.0.1:4173/ — project-path check: http://127.0.0.1:4173/x360/'));
