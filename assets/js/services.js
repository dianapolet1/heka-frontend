/* ============================================================
   Heka Universe — Capa de servicios
   Hoy lee /data/*.json y guarda en localStorage.
   Mañana: cambia API_MODE a true y estas mismas funciones
   llamarán al backend (/api/...). Las pantallas no cambian.
   ============================================================ */

const API_MODE = false;          // ← true cuando exista el backend
const API_BASE = '/api';

// ── Helpers de almacenamiento ────────────────────────────────
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem('heka:' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('heka:' + key, JSON.stringify(value)); } catch {}
    document.dispatchEvent(new CustomEvent('heka:' + key, { detail: value }));
  },
};

// ── Normalizador: formato Shopify → modelo Heka ──────────────
// Es el mismo modelo que tendrá la tabla products/variants en la BD.
function normalizeProduct(p, collectionMap = {}) {
  const variants = p.variants.map(v => ({
    id: String(v.id),
    title: v.title,
    finish: v.option1,                       // "acabado"
    price: Number(v.price),
    compareAt: v.compare_at_price ? Number(v.compare_at_price) : null,
    available: v.available !== false,
    sku: v.sku || null,
  }));
  const text = (p.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: String(p.id),
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.body_html || '',
    descriptionText: text,
    type: p.product_type || '',
    vendor: p.vendor || '',
    tags: p.tags || [],
    images: (p.images || []).sort((a, b) => a.position - b.position).map(i => i.src),
    optionName: p.options?.[0]?.name || 'Finish',
    variants,
    price: Math.min(...variants.map(v => v.price)),
    isSubscription: /subscription|suscripci/i.test(text),
    collections: Object.keys(collectionMap).filter(h => collectionMap[h].includes(p.handle)),
  };
}

// ── Catálogo ─────────────────────────────────────────────────
const Catalog = {
  _cache: null,

  async load() {
    if (this._cache) return this._cache;
    if (API_MODE) {
      const [products, collections] = await Promise.all([
        fetch(`${API_BASE}/products`).then(r => r.json()),
        fetch(`${API_BASE}/collections`).then(r => r.json()),
      ]);
      return (this._cache = { products, collections });
    }
    const [p, c, cp] = await Promise.all([
      fetch('/data/products.json').then(r => r.json()),
      fetch('/data/collections.json').then(r => r.json()),
      fetch('/data/collection-products.json').then(r => r.json()),
    ]);
    return (this._cache = {
      products: p.products.map(x => normalizeProduct(x, cp)),
      collections: c.collections,
    });
  },

  async products({ collection, q } = {}) {
    let { products } = await this.load();
    if (collection && collection !== 'all') products = products.filter(p => p.collections.includes(collection));
    if (q) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      products = products.filter(p => {
        const hay = [p.title, p.descriptionText, p.type, ...p.tags, ...p.variants.map(v => v.finish)].join(' ').toLowerCase();
        return terms.every(t => hay.includes(t));
      });
    }
    return products;
  },

  async product(handle) {
    const { products } = await this.load();
    return products.find(p => p.handle === handle) || null;
  },

  async collections() { return (await this.load()).collections; },
  async collection(handle) { return (await this.collections()).find(c => c.handle === handle) || null; },
};

// ── Carrito ──────────────────────────────────────────────────
const Cart = {
  items() { return store.get('cart', []); },
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
  subtotal() { return this.items().reduce((s, i) => s + i.price * i.qty, 0); },

  add(product, variantId, qty = 1) {
    const v = product.variants.find(x => x.id === variantId) || product.variants[0];
    const items = this.items();
    const found = items.find(i => i.variantId === v.id);
    if (found) found.qty += qty;
    else items.push({
      variantId: v.id, productId: product.id, handle: product.handle, title: product.title,
      variant: v.title, price: v.price, image: product.images[0] || '', qty,
    });
    this._save(items);
  },
  setQty(variantId, qty) {
    let items = this.items();
    if (qty <= 0) items = items.filter(i => i.variantId !== variantId);
    else items.forEach(i => { if (i.variantId === variantId) i.qty = qty; });
    this._save(items);
  },
  remove(variantId) { this.setQty(variantId, 0); },
  clear() { this._save([]); },

  _save(items) {
    store.set('cart', items);
    // Carrito abandonado: guardamos la última actividad.
    // Con backend, aquí se hará POST /api/carts para que el servidor
    // mande el correo de recuperación si no se completa la compra.
    store.set('cart_updated_at', items.length ? Date.now() : null);
  },
};

// ── Wishlist ─────────────────────────────────────────────────
const Wishlist = {
  handles() { return store.get('wishlist', []); },
  has(handle) { return this.handles().includes(handle); },
  toggle(handle) {
    const list = this.handles();
    const next = list.includes(handle) ? list.filter(h => h !== handle) : [handle, ...list];
    store.set('wishlist', next);
    return next.includes(handle);
  },
};

// ── Vistos recientemente ─────────────────────────────────────
const Recent = {
  MAX: 8,
  handles() { return store.get('recent', []); },
  push(handle) {
    const list = [handle, ...this.handles().filter(h => h !== handle)].slice(0, this.MAX);
    store.set('recent', list);
  },
};
