/* ============================================================
   Descarga fuentes, videos e imágenes sueltas del sitio original
   para no depender del CDN de Shopify.
     assets/fonts/   FLOWRISE.otf, Lacquer-Regular.ttf
     assets/video/   videos de la portada y de Our Origins
     assets/img/bg/  fondos
   Uso:  npm run sync:assets      (Node 18+)
   ============================================================ */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const FILES = [
  ['assets/fonts/FLOWRISE.otf',        'https://hekauniverse.com/cdn/shop/files/FLOWRISE.otf?v=1756202793'],
  ['assets/fonts/Lacquer-Regular.ttf', 'https://hekauniverse.com/cdn/shop/files/Lacquer-Regular.ttf?v=1756490285'],
  ['assets/video/home.mov',            'https://cdn.shopify.com/videos/c/o/v/c8516cf527c048518e14a84069675277.mov'],
  ['assets/video/heka.mp4',            'https://cdn.shopify.com/videos/c/o/v/abef70b8138845c7b813ee4fc94c8c09.mp4'],
  ['assets/video/inspired.mp4',        'https://cdn.shopify.com/videos/c/o/v/761208a0359d414da61ce2e98ac328fd.mp4'],
  ['assets/video/reel-3.mov',          'https://cdn.shopify.com/videos/c/o/v/c209e327f90e4d749a6949a758e5aa76.mov'],
  ['assets/video/reel-4.mp4',          'https://cdn.shopify.com/videos/c/o/v/63739c8caceb4666aa55dd2c6ed6a1b1.mp4'],
  ['assets/video/ritual.mp4',          'https://cdn.shopify.com/videos/c/o/v/330e36f178e2430f87e16375f5f04455.mp4'],
  ['assets/img/bg/visual-identity.jpg','https://hekauniverse.com/cdn/shop/files/Visual_identity_-_website_5.001.jpg?width=2000'],
];

(async () => {
  for (const [rel, url] of FILES) {
    const dest = path.join(ROOT, rel);
    if (fs.existsSync(dest)) { console.log(`  = ${rel} (ya existe)`); continue; }
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error(r.status);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      console.log(`  ✔ ${rel} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
    } catch (e) { console.warn(`  ! ${rel}: ${e.message}`); }
  }
  console.log('Listo.');
})();
