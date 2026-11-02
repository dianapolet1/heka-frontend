/* ============================================================
   Heka Universe — Componentes de tienda reutilizables
   productCard · vista rápida · QR por artículo · wishlist · recientes
   ============================================================ */

// ── Tarjeta de producto ──────────────────────────────────────
function productCard(p) {
  const wished = Wishlist.has(p.handle);
  return `
  <article class="product-card">
    <div class="media-wrap">
    <a href="${productUrl(p.handle)}" class="media">
      <img src="${esc(p.images[0] || '')}" alt="${esc(p.title)}" loading="lazy">
      ${p.images[1] ? `<img class="img-hover" src="${esc(p.images[1])}" alt="" loading="lazy">` : ''}
    </a>
    <div class="card-actions">
      <button class="icon-btn ${wished ? 'wish-active' : ''}" data-wish="${p.handle}" aria-label="Wishlist" onclick="toggleWish(this)">
        <i class="ti ${wished ? 'ti-heart-filled' : 'ti-heart'}"></i></button>
      <button class="icon-btn" aria-label="QR" title="QR" onclick="openQr('${p.handle}')"><i class="ti ti-qrcode"></i></button>
    </div>
    <button class="btn quick-view-btn" onclick="openQuickView('${p.handle}')">Quick Add</button>
    </div>
    <div class="info">
      <div class="vendor">${esc(p.vendor)}</div>
      <a href="${productUrl(p.handle)}" class="title">${esc(p.title)}</a>
      <p class="summary">${esc(p.descriptionText.slice(0, 110))}${p.descriptionText.length > 110 ? '…' : ''}</p>
      <div class="price">${p.variants.length > 1 && new Set(p.variants.map(v => v.price)).size > 1 ? 'From ' : ''}${formatMoney(p.price)}${p.isSubscription ? ' / month' : ''}</div>
    </div>
  </article>`;
}

function renderGrid(el, products, emptyMsg = 'No products found') {
  el.innerHTML = products.length
    ? products.map(productCard).join('')
    : `<div class="empty" style="grid-column:1/-1"><i class="ti ti-candle"></i>${emptyMsg}</div>`;
}

// ── Wishlist ─────────────────────────────────────────────────
function toggleWish(btn) {
  const on = Wishlist.toggle(btn.dataset.wish);
  document.querySelectorAll(`[data-wish="${btn.dataset.wish}"]`).forEach(b => {
    b.classList.toggle('wish-active', on);
    b.querySelector('i').className = `ti ${on ? 'ti-heart-filled' : 'ti-heart'}`;
  });
  showToast(on ? 'Added to wishlist' : 'Removed from wishlist');
}

// ── Selector de variante (acabado) ───────────────────────────
function variantChips(p, selectedId, onChange) {
  return `<div class="option-label">${esc(p.optionName === 'Finish' ? 'Finish · Acabado' : p.optionName)}</div>
    <div class="chips">${p.variants.map(v => `
      <button class="chip ${v.id === selectedId ? 'active' : ''}" ${v.available ? '' : 'disabled'}
        onclick="${onChange}('${v.id}')">${esc(v.finish)}</button>`).join('')}</div>`;
}

// ── Vista rápida ─────────────────────────────────────────────
let qvState = null;

function ensureModals() {
  if (document.getElementById('qv-modal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="qv-modal"><div class="modal">
      <button class="icon-btn modal-close" data-close-modal><i class="ti ti-x"></i></button>
      <div id="qv-content"></div></div></div>
    <div class="modal-overlay" id="qr-modal"><div class="modal modal-sm">
      <button class="icon-btn modal-close" data-close-modal><i class="ti ti-x"></i></button>
      <div id="qr-content"></div></div></div>`);
}

async function openQuickView(handle) {
  ensureModals();
  const p = await Catalog.product(handle);
  if (!p) return;
  qvState = { p, variantId: p.variants.find(v => v.available)?.id || p.variants[0].id, qty: 1 };
  renderQuickView();
  openModal('qv-modal');
}

function renderQuickView() {
  const { p, variantId, qty } = qvState;
  const v = p.variants.find(x => x.id === variantId);
  document.getElementById('qv-content').innerHTML = `
    <div class="qv-grid">
      <img src="${esc(p.images[0] || '')}" alt="${esc(p.title)}">
      <div>
        ${p.isSubscription ? '<span class="tag-sub">Monthly subscription</span>' : ''}
        <h2>${esc(p.title)}</h2>
        <div class="pdp-price">${formatMoney(v.price)}</div>
        <p class="pdp-desc">${esc(p.descriptionText.slice(0, 220))}${p.descriptionText.length > 220 ? '…' : ''}</p>
        ${variantChips(p, variantId, 'qvSelect')}
        <div class="pdp-buy">
          <div class="qty"><button onclick="qvQty(-1)">−</button><input value="${qty}" readonly><button onclick="qvQty(1)">+</button></div>
          <button class="btn btn-primary" onclick="qvAdd()" ${v.available ? '' : 'disabled'}>${v.available ? 'Add to cart' : 'Sold out'}</button>
        </div>
        <a href="${productUrl(p.handle)}" style="text-decoration:underline;font-size:13px">View full details</a>
      </div>
    </div>`;
}
function qvSelect(id) { qvState.variantId = id; renderQuickView(); }
function qvQty(d) { qvState.qty = Math.max(1, qvState.qty + d); renderQuickView(); }
function qvAdd() {
  Cart.add(qvState.p, qvState.variantId, qvState.qty);
  closeModal('qv-modal');
  openCartDrawer();
}

// ── QR por artículo (colores y logo de Heka) ─────────────────
// Usa qrcode-generator solo para la matriz; el dibujo es propio:
// módulos ciruela redondeados sobre arena y el logo al centro.
const QR_STYLE = {
  fg: '#684D63', bg: '#E3D0A9', logo: '/assets/img/brand/logo.png',
  logoH: .64,   // alto del logo respecto al QR (el logo es alto y delgado)
  gap: .14      // aire entre el contorno del logo y los puntos (en módulos)
};
let qrLogo = null;

// Carga el logo, lo recorta a su contorno visible y guarda su canal alfa
// para poder quitar solo los puntos que pisan la silueta.
async function qrLogoInfo() {
  if (qrLogo) return qrLogo;
  const img = new Image();
  img.src = QR_STYLE.logo;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const octx = out.getContext('2d');
  octx.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  // Pinta el logo en el morado de la marca (conserva la forma con su alfa)
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = QR_STYLE.fg;
  octx.fillRect(0, 0, w, h);
  const alpha = (fx, fy) => d[((y0 + Math.round(fy * (h - 1))) * W + x0 + Math.round(fx * (w - 1))) * 4 + 3];
  qrLogo = { url: out.toDataURL('image/png'), ratio: w / h, alpha };
  return qrLogo;
}

function brandQrSvg(text, logo) {
  const qr = qrcode(0, 'H');            // nivel H: aguanta ~30% tapado por el logo
  qr.addData(text); qr.make();
  const n = qr.getModuleCount(), m = 3, size = n + m * 2;
  // Logo centrado, sin círculo ni recuadro
  const lh = n * QR_STYLE.logoH, lw = lh * logo.ratio;
  const lx = m + (n - lw) / 2, ly = m + (n - lh) / 2, g = QR_STYLE.gap;
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  // ¿La celda (ampliada por el aire) toca la silueta del logo?
  const touchesLogo = (r, c) => {
    const ax = c + m - g, ay = r + m - g, bx = c + m + 1 + g, by = r + m + 1 + g;
    if (bx < lx || ax > lx + lw || by < ly || ay > ly + lh) return false;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
      const x = ax + (bx - ax) * i / 8, y = ay + (by - ay) * j / 8;
      if (x < lx || x > lx + lw || y < ly || y > ly + lh) continue;
      if (logo.alpha((x - lx) / lw, (y - ly) / lh) > 24) return true;
    }
    return false;
  };
  let dots = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!qr.isDark(r, c) || inFinder(r, c) || touchesLogo(r, c)) continue;
    dots += `<rect x="${c + m + .08}" y="${r + m + .08}" width=".84" height=".84" rx=".38"/>`;
  }
  const finder = (x, y) => `
    <rect x="${x}" y="${y}" width="7" height="7" rx="2" fill="${QR_STYLE.fg}"/>
    <rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.4" fill="${QR_STYLE.bg}"/>
    <rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".9" fill="${QR_STYLE.fg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">
    <rect width="${size}" height="${size}" fill="${QR_STYLE.bg}"/>
    <g fill="${QR_STYLE.fg}">${dots}</g>
    ${finder(m, m)}${finder(m + n - 7, m)}${finder(m, m + n - 7)}
    <image href="${logo.url}" xlink:href="${logo.url}" x="${lx}" y="${ly}" width="${lw}" height="${lh}" preserveAspectRatio="none"/>
  </svg>`;
}

// Tarjeta PNG para imprimir/compartir: QR + nombre + URL, con fondo arena
async function brandQrPng(svg, title, url) {
  const W = 1000, H = 1240;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = c.getContext('2d');
  ctx.fillStyle = QR_STYLE.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = QR_STYLE.fg; ctx.lineWidth = 3; ctx.strokeRect(30, 30, W - 60, H - 60);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  ctx.drawImage(img, 110, 90, 780, 780);
  await document.fonts?.ready;
  ctx.fillStyle = '#232323'; ctx.textAlign = 'center';
  ctx.font = '500 64px Fraunces, Georgia, serif'; ctx.fillText(title, W / 2, 970);
  ctx.fillStyle = QR_STYLE.fg; ctx.font = '600 30px Manrope, sans-serif';
  ctx.fillText('CASITA HEKA', W / 2, 1030);
  ctx.fillStyle = '#5A4E45'; ctx.font = '400 24px Manrope, sans-serif';
  ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1100);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

async function openQr(handle) {
  ensureModals();
  const p = await Catalog.product(handle);
  if (!p) return;
  const url = absoluteUrl(productUrl(handle));
  const svg = brandQrSvg(url, await qrLogoInfo());
  const box = document.getElementById('qr-content');
  box.closest('.modal').classList.add('qr-modal');
  box.innerHTML = `
    <div class="eyebrow">Casita Heka</div>
    <h3>${esc(p.title)}</h3>
    <div class="qr-box">${svg}</div>
    <p class="qr-hint">Scan to open this piece</p>
    <div class="qr-url">${esc(url)}</div>
    <div class="qr-actions">
      <button class="btn btn-outline" data-act="copy"><i class="ti ti-link"></i> Copy link</button>
      <button class="btn btn-primary" data-act="download"><i class="ti ti-download"></i> Download</button>
      ${navigator.share ? '<button class="btn btn-outline" data-act="share"><i class="ti ti-share"></i> Share</button>' : ''}
    </div>`;
  box.querySelector('.qr-actions').onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'copy') copyLink(url);
    if (act === 'download' || act === 'share') {
      const blob = await brandQrPng(svg, p.title, url);
      const file = new File([blob], `qr-${handle}.png`, { type: 'image/png' });
      if (act === 'share' && navigator.canShare?.({ files: [file] })) {
        navigator.share({ title: p.title, url, files: [file] }).catch(() => {});
      } else if (act === 'share') {
        navigator.share({ title: p.title, url }).catch(() => {});
      } else {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    }
  };
  openModal('qr-modal');
}

function copyLink(url) {
  navigator.clipboard?.writeText(url).then(() => showToast('Enlace copiado'), () => showToast(url));
}

// ── Vistos recientemente ─────────────────────────────────────
async function renderRecentlyViewed(containerId, excludeHandle) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const handles = Recent.handles().filter(h => h !== excludeHandle);
  const products = (await Promise.all(handles.map(h => Catalog.product(h)))).filter(Boolean).slice(0, 4);
  const section = el.closest('section');
  if (!products.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;
  renderGrid(el, products);
}
