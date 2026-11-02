/* ============================================================
   Baja texto e imágenes de las páginas institucionales
   desde el HTML público de hekauniverse.com
     - assets/img/pages/<handle>/NN.ext   (imágenes)
     - data/pages-content/<handle>.json   ({ title, texts[], images[] })
   Uso:  node scripts/sync-pages.js     (Node 18+)
   ============================================================ */

const fs = require('fs');
const path = require('path');

const STORE = process.env.SHOPIFY_STORE || 'https://hekauniverse.com';
const ROOT = path.join(__dirname, '..');
const PAGES = ['home', 'about-us', 'universe-of-pau', 'ritual-studio', 'encaustic-art',
  'wax-atelier', 'space-activation', 'contact', 'experience-design', 'shop-the-universe'];

const decode = s => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&rsquo;|&lsquo;/g, "'")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

function extract(html) {
  // Solo el contenido principal: sin header, footer, scripts ni estilos
  let main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
  main = main.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, '');

  const texts = [];
  const re = /<(h1|h2|h3|h4|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(main))) {
    const t = decode(m[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
    if (t && t.length > 1 && !texts.some(x => x.text === t)) texts.push({ tag: m[1].toLowerCase(), text: t });
  }

  const imgs = new Map();
  const imgRe = /(?:https?:)?\/\/[^"'\s,)]+?\/(?:cdn\/shop|s\/files)\/[^"'\s,)]+?\.(?:jpe?g|png|webp|gif)/gi;
  for (const u of main.match(imgRe) || []) {
    const url = (u.startsWith('//') ? 'https:' + u : u);
    const key = path.basename(new URL(url).pathname);
    if (/logo|icon|favicon|placeholder/i.test(key)) continue;
    if (!imgs.has(key)) imgs.set(key, url.split('?')[0] + '?width=1800');
  }
  return { texts, images: [...imgs.values()] };
}

(async () => {
  for (const handle of PAGES) {
    const url = handle === 'home' ? STORE + '/' : `${STORE}/pages/${handle}`;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 heka-sync' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) { console.warn(`  ! ${handle}: ${r.status}`); continue; }
      const html = await r.text();
      const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [, handle])[1]).trim();
      const { texts, images } = extract(html);

      const dir = path.join(ROOT, 'assets', 'img', 'pages', handle);
      fs.mkdirSync(dir, { recursive: true });
      const local = [];
      for (const [i, src] of images.entries()) {
        try {
          const ext = path.extname(new URL(src).pathname) || '.jpg';
          const name = String(i + 1).padStart(2, '0') + ext;
          const res = await fetch(src, { signal: AbortSignal.timeout(30000) });
          fs.writeFileSync(path.join(dir, name), Buffer.from(await res.arrayBuffer()));
          local.push({ file: `/assets/img/pages/${handle}/${name}`, original: src });
        } catch (e) { console.warn(`    ! imagen ${src}: ${e.message}`); }
      }

      fs.mkdirSync(path.join(ROOT, 'data', 'pages-content'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'data', 'pages-content', `${handle}.json`),
        JSON.stringify({ handle, url, title, texts, images: local }, null, 2));
      console.log(`  ✔ ${handle}: ${texts.length} textos, ${local.length} imágenes`);
    } catch (e) { console.warn(`  ! ${handle}: ${e.message}`); }
  }
  console.log('Listo. Revisa data/pages-content/ y assets/img/pages/');
})();
