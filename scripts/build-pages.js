/* ============================================================
   Build para GitHub Pages
   Genera _site/ con:
   - todas las rutas absolutas (/assets, /pages, …) con el prefijo
     del repo (p. ej. /heka-frontend), porque Pages sirve el sitio
     en https://usuario.github.io/heka-frontend/
   - un .html por cada ruta que en local resuelve server.js
     (/products/:handle, /collections/:handle, /cart, …)
   El proyecto local NO cambia: `npm run dev` sigue igual.

   Uso:  BASE=/heka-frontend node scripts/build-pages.js
         (sin BASE, o BASE="" si usas dominio propio)
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '_site');
const BASE = (process.env.BASE || '').replace(/\/+$/, '');

const SKIP = new Set(['node_modules', '_site', '_to_delete', '.git', '.github', 'scripts', 'server.js', 'package.json', 'package-lock.json', 'README.md', '.gitignore']);
const TEXT = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt']);
// Primeras carpetas/rutas del sitio que llevan prefijo
const ROUTES = 'assets|data|pages|products|collections|cart|checkout|wishlist|search|account|tienda|cuenta|policies|404';

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function rewrite(text, file) {
  if (!BASE) return text;
  const isVendor = file.includes(`${path.sep}vendor${path.sep}`);
  if (isVendor) return text;
  // "/assets/…", '/pages/…', `/products/…`, url(/assets/…), ="/"
  text = text.replace(new RegExp(`(["'\`(]\\s*)\\/(?=(?:${ROUTES})(?:[/?#.\\s"'\`)]|$))`, 'g'), `$1${BASE}/`);
  text = text.replace(/(["'`])\/(?=["'`?#])/g, `$1${BASE}/`);   // la raíz: "/" "/?x" "/#x"
  // location.pathname ya trae el prefijo y los textos con los que se compara también.
  // Única regex de rutas en el código (menú activo en Shop the Universe):
  text = text.replace('/^\\/(collections|products)\\//.test(path)', `/^\\/(collections|products)\\//.test(path.slice(${JSON.stringify(BASE)}.length))`);
  return text;
}

function walk(dir, fn) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    fs.statSync(p).isDirectory() ? walk(p, fn) : fn(p);
  }
}

function page(from, to) {
  const dst = path.join(OUT, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(OUT, from), dst);
}

// 1. Copia
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(ROOT, OUT);

// 2. Rutas que en local resuelve server.js
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8')).products || [];
const collections = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/collections.json'), 'utf8')).collections || [];
for (const p of products) page('tienda/producto.html', `products/${p.handle}.html`);
page('tienda/catalogo.html', 'collections.html');
for (const c of collections) page('tienda/catalogo.html', `collections/${c.handle}.html`);
// Colecciones que el menú enlaza aunque no estén en el JSON
for (const h of ['candles', 'eclipse-couture', 'wax-painted-clothes', 'hand-painted-clothes', 'artifacts']) {
  if (!fs.existsSync(path.join(OUT, `collections/${h}.html`))) page('tienda/catalogo.html', `collections/${h}.html`);
}
page('tienda/catalogo.html', 'search.html');
page('tienda/carrito.html', 'cart.html');
page('tienda/checkout.html', 'checkout.html');
page('tienda/wishlist.html', 'wishlist.html');
page('cuenta/login.html', 'account.html');
page('cuenta/login.html', 'account/login.html');

// 3. Prefijo en rutas absolutas
let n = 0;
walk(OUT, f => {
  if (!TEXT.has(path.extname(f))) return;
  const src = fs.readFileSync(f, 'utf8');
  const out = rewrite(src, f);
  if (out !== src) { fs.writeFileSync(f, out); n++; }
});

// 4. Sin Jekyll (si no, ignora carpetas con "_" y tarda más)
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`_site listo · BASE="${BASE}" · ${products.length} productos · ${collections.length} colecciones · ${n} archivos con rutas ajustadas`);
