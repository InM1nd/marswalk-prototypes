// Local dev entry point: serves the static hub at "/" and reverse-proxies
// each prototype's own Vite dev server under its path prefix (e.g. /wheel),
// so everything lives on one origin/port instead of one port per prototype.
//
// Mirrors production routing in vercel.ts — one Vercel project, path-based
// rewrites to each built app under dist/{wheel,scratch,runner,plinko,catch,advent}.
import http from 'node:http';
import httpProxy from 'http-proxy';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HUB_DIR = fileURLToPath(new URL('../apps/hub', import.meta.url));
const PORT = 4000;

// path prefix -> upstream dev server. Add an entry here as each prototype gets a dev server.
const PROXIES = {
  '/wheel': 'http://localhost:5173',
  '/scratch': 'http://localhost:5174',
  '/runner': 'http://localhost:5175',
  '/plinko': 'http://localhost:5176',
  '/catch': 'http://localhost:5177',
  '/advent': 'http://localhost:5178',
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
};

const proxy = httpProxy.createProxyServer({ ws: true, changeOrigin: true });
proxy.on('error', (err, _req, res) => {
  console.error('[proxy] upstream unreachable:', err.message);
  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Prototype dev server not reachable yet — give it a few seconds to start.');
  }
});

function matchProxy(url) {
  return Object.entries(PROXIES).find(([prefix]) => url === prefix || url.startsWith(`${prefix}/`));
}

function serveHubStatic(req, res) {
  const pathname = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = normalize(join(HUB_DIR, pathname));
  if (!filePath.startsWith(HUB_DIR) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const match = matchProxy(req.url);
  if (match) {
    proxy.web(req, res, { target: match[1] });
    return;
  }
  serveHubStatic(req, res);
});

// Vite's HMR client needs the websocket upgrade proxied too, on the same path prefix.
server.on('upgrade', (req, socket, head) => {
  const match = matchProxy(req.url);
  if (match) proxy.ws(req, socket, head, { target: match[1] });
});

server.listen(PORT, () => {
  console.log(`[hub] http://localhost:${PORT}/`);
  for (const [prefix, target] of Object.entries(PROXIES)) {
    console.log(`[proxy] http://localhost:${PORT}${prefix}/  ->  ${target}`);
  }
});
