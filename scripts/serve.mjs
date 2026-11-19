// 零依赖静态服务器：提供 dist/，SPA 回退到 index.html，sw.js 不缓存。
// 用法：node scripts/serve.mjs [port] [basePrefix]
//   basePrefix 例如 /shengxi —— 模拟 GitHub Pages 子路径部署（https://serene899.github.io/shengxi/）。
//   不传 basePrefix 时按根路径提供（本机预览 http://127.0.0.1:4304 ）。
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 4304);
const prefix = (process.argv[3] || '').replace(/\/$/, '');
const host = '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://x');
    let pathname = decodeURIComponent(url.pathname);
    if (prefix) {
      if (pathname === '/') { res.writeHead(302, { Location: `${prefix}/` }).end(); return; }
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) { res.writeHead(404).end('not found'); return; }
      pathname = pathname.slice(prefix.length) || '/';
    }
    let p = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let st = await stat(file).catch(() => null);
    if (!st || st.isDirectory()) { file = join(root, 'index.html'); st = await stat(file); }
    const ext = extname(file);
    const headers = {
      'Content-Type': types[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(500).end('error');
  }
}).listen(port, host, () => console.log(`yueji serving dist on http://${host}:${port}${prefix}/`));
