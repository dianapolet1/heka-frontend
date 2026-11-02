# Heka Universe — Frontend

Réplica de [hekauniverse.com](https://hekauniverse.com) (lado cliente) en **HTML, CSS y JS puro**, con la misma filosofía que PayDesk: sistema de diseño con tokens y una capa de servicios que hoy lee JSON locales y mañana llama al backend.

## Correr en local

```bash
npm run dev          # http://localhost:3000
npm run sync         # baja productos/colecciones/páginas públicas de Shopify a /data
npm run sync:images  # igual + descarga las imágenes a assets/img/products
```

No necesita `npm install` (no tiene dependencias). Requiere Node 18+.

## Estructura

```
heka-frontend/
├── index.html                 Home
├── 404.html
├── server.js                  Servidor local con las mismas URLs que Shopify
├── data/                      products.json, collections.json, collection-products.json
├── scripts/sync-shopify.js    Sincroniza /data desde la tienda pública
├── assets/
│   ├── css/  tokens.css · layout.css · components.css
│   └── js/   utils.js · services.js · layout.js · ui.js
├── tienda/   catalogo · producto · carrito · checkout · wishlist
├── pages/    about-us · universe-of-pau · ritual-studio · encaustic-art · wax-alchemy · space-activation · contact
└── cuenta/   login (placeholder)
```

## URLs (iguales a Shopify → menos redirecciones 301)

| URL | Archivo |
|---|---|
| `/products/:handle` | `tienda/producto.html` |
| `/collections/:handle` | `tienda/catalogo.html` |
| `/search?q=` | `tienda/catalogo.html` |
| `/pages/:handle` | `pages/:handle.html` |
| `/cart` · `/checkout` · `/wishlist` | `tienda/*.html` |

## Estado de entregables

| Entregable | Estado |
|---|---|
| Páginas institucionales | Estructura lista · **falta texto e imágenes reales** |
| Catálogo, colecciones, variantes (acabado) | ✅ con datos de prueba |
| Búsqueda, vista rápida | ✅ |
| Wishlist, vistos recientemente | ✅ (`localStorage`) |
| QR por artículo | ✅ ver, copiar, descargar y compartir |
| Carrito | ✅ (`localStorage`) |
| Checkout | Maqueta · falta backend |
| Carrito abandonado | Base lista (`cart_updated_at`, `checkout_draft`) · falta backend + correo |
| Pasarela de pagos | Pendiente · métodos por definir |
| Login / perfil | Placeholder · falta backend |

## Pasar al backend

En `assets/js/services.js` cambia `API_MODE = true`. `Catalog` empezará a llamar a `/api/products` y `/api/collections`; las pantallas no cambian.

## Pendientes con el cliente

- Export CSV de productos (la ropa no está publicada en la tienda en línea, no sale en `products.json`)
- Textos e imágenes de las páginas institucionales
- Confirmar moneda (MXN o USD) → `CURRENCY` en `utils.js`
- Los 3 sets de velas son **suscripciones mensuales** → la pasarela debe soportar cobros recurrentes
- "Wax Alchemy": confirmar URL (en Shopify existe `wax-atelier`)
- Correo, teléfono y dirección para Contacto
