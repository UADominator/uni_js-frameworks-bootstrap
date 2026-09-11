import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = 'src';
const PORT = Number(process.env.PORT ?? 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const resolve = (url) => {
  const path = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const target = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return target;
};

createServer((request, response) => {
  const file = resolve(request.url);

  if (!existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('404');
    return;
  }

  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`Настільня: http://localhost:${PORT}/pages/index.html`);
});
