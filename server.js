/* ============================================================
   Heka Universe — servidor local de desarrollo (sin dependencias)
   Respeta las mismas URLs que Shopify para no perder SEO:
     /products/:handle      → tienda/producto.html
     /collections/:handle   → tienda/catalogo.html
     /pages/:handle         → pages/:handle.html
   Uso:  node server.js   (o  npm run dev)
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const ROUTES = [
  [/^\/$/, 'index.html'],
  [/^\/products\/[^/]+\/?$/, 'tienda/producto.html'],
  [/^\/collections(\/[^/]+)?\/?$/, 'tienda/catalogo.html'],
  [/^\/search\/?$/, 'tienda/catalogo.html'],
  [/^\/cart\/?$/, 'tienda/carrito.html'],
  [/^\/checkout\/?$/, 'tienda/checkout.html'],
  [/^\/wishlist\/?$/, 'tienda/wishlist.html'],
  [/^\/account(\/login)?\/?$/, 'cuenta/login.html'],
];

function resolve(urlPath) {
  for (const [re, file] of ROUTES) if (re.test(urlPath)) return file;
  const m = urlPath.match(/^\/pages\/([a-z0-9-]+)\/?$/);
  if (m) return `pages/${m[1]}.html`;
  return urlPath.slice(1);
}

function send(res, status, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(status, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = resolve(urlPath);
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }

  fs.stat(file, (err, st) => {
    if (!err && st.isFile()) return send(res, 200, file);
    send(res, 404, path.join(ROOT, '404.html'));
  });
}).listen(PORT, () => console.log(`Heka frontend → http://localhost:${PORT}`));
