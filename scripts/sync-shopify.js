/* ============================================================
   Descarga los datos públicos de la tienda Shopify a /data
     - products.json, collections.json, pages.json
     - collection-products.json  (qué productos hay en cada colección)
   Uso:  node scripts/sync-shopify.js     (Node 18+)
   Opcional:  node scripts/sync-shopify.js --images   (baja las imágenes a /assets/img/products)
   Solo lee lo público. Lo que no esté publicado (p. ej. la ropa)
   hay que sacarlo del export CSV del admin.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const STORE = process.env.SHOPIFY_STORE || 'https://hekauniverse.com';
const DATA = path.join(__dirname, '..', 'data');
const IMG = path.join(__dirname, '..', 'assets', 'img', 'products');
const withImages = process.argv.includes('--images');

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'heka-sync/1.0' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// Shopify pagina con ?limit=250&page=N
async function getAll(endpoint, key) {
  const all = [];
  for (let page = 1; page < 50; page++) {
    const data = await getJson(`${STORE}/${endpoint}?limit=250&page=${page}`);
    if (!data[key]?.length) break;
    all.push(...data[key]);
    if (data[key].length < 250) break;
  }
  return all;
}

function save(name, data) {
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(data, null, 2));
  console.log(`  ✔ data/${name}`);
}

(async () => {
  console.log(`Sincronizando desde ${STORE} …`);
  fs.mkdirSync(DATA, { recursive: true });

  const products = await getAll('products.json', 'products');
  save('products.json', { products });

  const collections = await getAll('collections.json', 'collections');
  if (!collections.some(c => c.handle === 'all')) {
    collections.unshift({ id: 0, title: 'All', handle: 'all', description: '', image: null, products_count: products.length });
  }
  save('collections.json', { collections });

  const map = {};
  for (const c of collections) {
    try {
      const items = c.handle === 'all' ? products : await getAll(`collections/${c.handle}/products.json`, 'products');
      map[c.handle] = items.map(p => p.handle);
    } catch (e) { map[c.handle] = []; console.warn(`  ! ${c.handle}: ${e.message}`); }
  }
  save('collection-products.json', map);

  try { save('pages.json', { pages: await getAll('pages.json', 'pages') }); }
  catch (e) { console.warn('  ! pages.json:', e.message); }

  if (withImages) {
    fs.mkdirSync(IMG, { recursive: true });
    for (const p of products) for (const img of p.images) {
      const name = `${p.handle}-${img.position}${path.extname(new URL(img.src).pathname)}`;
      const r = await fetch(img.src);
      fs.writeFileSync(path.join(IMG, name), Buffer.from(await r.arrayBuffer()));
      console.log(`  ↓ ${name}`);
    }
  }

  console.log(`Listo: ${products.length} productos, ${collections.length} colecciones.`);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
