/* ============================================================
   Heka Universe — Header, footer y drawer del carrito
   Se inyectan en <div id="site-header"> y <div id="site-footer">
   para no repetir el HTML en cada página.
   ============================================================ */

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Our Origins', href: '/pages/about-us', children: [
    { label: 'Origins of Heka', href: '/pages/about-us' },
    { label: 'Universe of Pau', href: '/pages/universe-of-pau' },
  ]},
  { label: 'Ritual Studio', href: '/pages/ritual-studio', children: [
    { label: 'Heka Rituals', href: '/pages/ritual-studio' },
    { label: 'Encaustic Art', href: '/pages/encaustic-art' },
    { label: 'Wax Alchemy', href: '/pages/wax-atelier' },
    { label: 'Space Activation', href: '/pages/space-activation' },
  ]},
  { label: 'Shop the Universe', href: '/pages/shop-the-universe', children: [
    { label: 'Shop The Universe', href: '/pages/shop-the-universe' },
    { label: 'Artifacts', href: '/pages/artifacts-shop' },
    { label: 'Candles', href: '/pages/candles' },
    { label: 'Eclipse Couture', href: '/collections/eclipse-couture', children: [
      { label: 'Wax Painted Clothes', href: '/collections/wax-painted-clothes' },
      { label: 'Hand Painted Clothes', href: '/collections/hand-painted-clothes' },
    ]},
  ]},
  { label: 'Contact Us', href: '/pages/contact' },
];

function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  const path = location.pathname;
  const CARET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.75 1.34 6.25 2.66 14.66 12l-8.41 9.34 1.5 1.31 9-10L17.34 12l-.59-.66z"/></svg>';
  const list = items => `<ul class="nav-dropdown">${items.map(c => c.children
    ? `<li class="has-sub"><a href="${c.href}"><span>${c.label}</span>${CARET}</a>${list(c.children).replace('nav-dropdown', 'nav-dropdown nav-dropdown--sub')}</li>`
    : `<li><a href="${c.href}"><span>${c.label}</span></a></li>`).join('')}</ul>`;
  const flat = items => (items || []).flatMap(c => [c.href, ...flat(c.children)]);
  const nav = NAV.map(item => {
    const active = path === item.href || flat(item.children).includes(path)
      || (item.label === 'Shop the Universe' && /^\/(collections|products)\//.test(path));
    const drop = item.children ? list(item.children) : '';
    return `<div class="nav-item"><a href="${item.href}" class="${active ? 'active' : ''}">${item.label}</a>${drop}</div>`;
  }).join('');

  el.outerHTML = `
  <header class="site-header">
    <div class="container">
      <button class="icon-btn menu-toggle" aria-label="Menú" onclick="document.querySelector('.main-nav').classList.toggle('open')"><i class="ti ti-menu-2"></i></button>
      <a href="/" class="logo"><img src="/assets/img/brand/logo.png" alt="Casita Heka" width="56" height="56"></a>
      <nav class="main-nav">${nav}</nav>
      <div class="header-actions">
        <a href="/search" class="icon-btn" aria-label="Buscar"><i class="ti ti-search"></i></a>
        <a href="/account/login" class="icon-btn" aria-label="Cuenta"><i class="ti ti-user"></i></a>
        <a href="/wishlist" class="icon-btn" aria-label="Wishlist"><i class="ti ti-heart"></i><span class="badge" id="wish-count"></span></a>
        <button class="icon-btn" aria-label="Carrito" onclick="openCartDrawer()"><i class="ti ti-shopping-bag"></i><span class="badge" id="cart-count"></span></button>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  // Réplica del footer de hekauniverse.com: fondo arena, enlaces centrados
  // (los títulos de columna en el original son invisibles: color = fondo)
  el.outerHTML = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <nav class="footer-col" aria-label="Shop">
          <a href="/">Home</a>
          <a href="/pages/about-us">Our Origins</a>
          <a href="/pages/ritual-studio">Ritual Studio</a>
          <a href="/pages/shop-the-universe">Shop The Universe</a>
          <a href="/pages/contact">Contact Us</a>
        </nav>
        <nav class="footer-col" aria-label="Information">
          <a href="/pages/contact">Contact Us</a>
          <a href="/pages/wax-atelier">Candle Care</a>
          <a href="/pages/ritual-studio">Garments Care</a>
          <a href="/policies/purchase">Purchase Policy</a>
          <a href="/policies/privacy-policy">Privacy Policy</a>
          <a href="/policies/terms-of-service">Terms Of Service</a>
          <a href="/policies/accessibility">Accessibility</a>
        </nav>
        <div class="footer-col" aria-hidden="true"></div>
        <div class="footer-col footer-newsletter">
          <p>Sign up for exclusive updates, new arrivals &amp; insider only discounts</p>
          <form onsubmit="event.preventDefault(); showToast('Thanks for subscribing! (maqueta: falta backend)'); this.reset();">
            <input type="email" required placeholder="enter your email address" aria-label="Your email">
            <button type="submit">Submit</button>
          </form>
          <a class="footer-social" href="https://www.instagram.com/paumaloheka/" target="_blank" rel="noopener" aria-label="Instagram"><i class="ti ti-brand-instagram"></i></a>
        </div>
      </div>
    </div>
  </footer>`;
}

// ── Drawer del carrito ───────────────────────────────────────
function renderCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="drawer-overlay" id="cart-overlay" onclick="closeCartDrawer()"></div>
    <aside class="drawer" id="cart-drawer" aria-label="Carrito">
      <div class="drawer-header"><h3 style="margin:0">Your cart</h3>
        <button class="icon-btn" onclick="closeCartDrawer()"><i class="ti ti-x"></i></button></div>
      <div class="drawer-body" id="drawer-lines"></div>
      <div class="drawer-footer" id="drawer-footer"></div>
    </aside>`);
}

function cartLinesHtml(items) {
  return items.map(i => `
    <div class="line">
      <a href="${productUrl(i.handle)}"><img src="${esc(i.image)}" alt=""></a>
      <div>
        <div class="name">${esc(i.title)}</div>
        <div class="variant">${esc(i.variant)}</div>
        <div class="qty" style="margin-top:6px">
          <button onclick="Cart.setQty('${i.variantId}', ${i.qty - 1})">−</button>
          <input value="${i.qty}" readonly>
          <button onclick="Cart.setQty('${i.variantId}', ${i.qty + 1})">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div>${formatMoney(i.price * i.qty)}</div>
        <button class="remove" onclick="Cart.remove('${i.variantId}')">Remove</button>
      </div>
    </div>`).join('');
}

function refreshCartDrawer() {
  const items = Cart.items();
  const body = document.getElementById('drawer-lines');
  const foot = document.getElementById('drawer-footer');
  if (!body) return;
  if (!items.length) {
    body.innerHTML = `<div class="empty"><i class="ti ti-shopping-bag"></i>Your cart is empty</div>`;
    foot.innerHTML = `<a href="/collections/all" class="btn btn-outline btn-block">Shop the universe</a>`;
    return;
  }
  body.innerHTML = cartLinesHtml(items);
  foot.innerHTML = `
    <div class="totals-row total"><span>Subtotal</span><span>${formatMoney(Cart.subtotal())}</span></div>
    <p style="font-size:12px;color:var(--text-secondary)">Shipping and taxes calculated at checkout.</p>
    <a href="/checkout" class="btn btn-primary btn-block" style="margin-bottom:8px">Checkout</a>
    <a href="/cart" class="btn btn-outline btn-block">View cart</a>`;
}

function openCartDrawer() {
  refreshCartDrawer();
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-drawer').classList.add('open');
}
function closeCartDrawer() {
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.getElementById('cart-drawer')?.classList.remove('open');
}

function refreshBadges() {
  const c = document.getElementById('cart-count');
  const w = document.getElementById('wish-count');
  if (c) { const n = Cart.count(); c.textContent = n || ''; c.dataset.count = n; }
  if (w) { const n = Wishlist.handles().length; w.textContent = n || ''; w.dataset.count = n; }
}

document.addEventListener('heka:cart', () => { refreshBadges(); refreshCartDrawer(); });
document.addEventListener('heka:wishlist', refreshBadges);
window.addEventListener('storage', refreshBadges); // sincroniza entre pestañas


// ── Cursor del tema (círculo ciruela que sigue al mouse) ──────
// Igual que el original: punto pequeño que sigue rápido y aro grande
// que va detrás; sobre botones/enlaces el aro crece y el punto se oculta.
// Solo en escritorio (≥1200px) con mouse; en header y footer queda el puntero normal.
function initCursor() {
  if (!matchMedia('(min-width: 1200px) and (pointer: fine)').matches || document.querySelector('.cursor-fixed')) return;
  const root = document.createElement('div');
  root.className = 'cursor-fixed';
  root.innerHTML = '<div class="cursor cursor--large"></div><div class="cursor cursor--small"></div>';
  document.body.appendChild(root);
  document.body.classList.add('cursor-fixed__show');
  const outer = root.querySelector('.cursor--large'), inner = root.querySelector('.cursor--small');
  const mouse = { x: -100, y: -100 }, pIn = { x: -100, y: -100 }, pOut = { x: -100, y: -100 };
  let scale = 1, targetScale = 1, down = false;
  const HOVER = '.btn, button, select, a, .slide-arrow, .arrow-icon-scroll, [role="button"], input[type="submit"], .product-card, label[for]';
  const NATIVE = '.site-header, .site-footer, .drawer, .drawer-overlay, .modal-overlay';
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    const t = e.target instanceof Element ? e.target : null;
    const native = t?.closest(NATIVE);
    const hover = !native && t?.closest(HOVER);
    root.classList.toggle('is-hidden', !!native);
    root.classList.toggle('is-hover', !!hover);
    targetScale = down || hover ? 2 : 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.add('is-out'));
  document.addEventListener('pointerenter', () => root.classList.remove('is-out'));
  addEventListener('blur', () => root.classList.add('is-out'));
  document.addEventListener('mouseover', () => root.classList.remove('is-out'));
  addEventListener('pointerdown', () => { down = true; targetScale = 2; });
  addEventListener('pointerup', () => { down = false; targetScale = root.classList.contains('is-hover') ? 2 : 1; });
  // Interpolación por cuadro (equivale a los 0.15 s / 0.4 s de GSAP del original)
  const tick = () => {
    pIn.x += (mouse.x - pIn.x) * .45;  pIn.y += (mouse.y - pIn.y) * .45;
    pOut.x += (mouse.x - pOut.x) * .16; pOut.y += (mouse.y - pOut.y) * .16;
    scale += (targetScale - scale) * .25;
    inner.style.transform = `translate(${pIn.x}px, ${pIn.y}px) translate(-50%, -50%)`;
    outer.style.transform = `translate(${pOut.x}px, ${pOut.y}px) translate(-50%, -50%) scale(${scale})`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Flecha fija que baja/sube por secciones (como el original) ──
function initScrollArrow() {
  if (document.querySelector('.arrow-icon-scroll')) return;
  const main = document.querySelector('main');
  if (!main) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'arrow-icon-scroll';
  btn.setAttribute('aria-label', 'Scroll to next section');
  btn.innerHTML = '<svg viewBox="0 0 125.04 280.66" aria-hidden="true"><polygon points="119.85 219.82 69.39 270.27 69.39 0 62.05 0 0 0 0 7.34 62.05 7.34 62.05 270.27 11.59 219.82 6.4 225.01 62.05 280.66 69.39 280.66 125.04 225.01 119.85 219.82"/></svg>';
  document.body.appendChild(btn);
  let dir = 'next';
  const sections = () => [...main.children].filter(el => el.offsetHeight > 0 && !el.hidden);
  const headerH = () => document.querySelector('.site-header')?.offsetHeight || 0;
  const footerH = () => document.querySelector('.site-footer')?.offsetHeight || 0;
  const setDir = d => {
    dir = d;
    btn.classList.toggle('rotate', d === 'prev');
    btn.setAttribute('aria-label', d === 'prev' ? 'Scroll to previous section' : 'Scroll to next section');
  };
  const check = () => {
    const s = sections(); if (!s.length) return;
    const lastH = s[s.length - 1].offsetHeight, firstH = s[0].offsetHeight;
    if (scrollY + lastH >= document.documentElement.scrollHeight - footerH() - 100) setDir('prev');
    else if (scrollY <= firstH / 2) setDir('next');
  };
  // Desplazamiento suave propio (no depende de scroll-behavior del navegador)
  let anim = 0;
  const to = el => {
    const start = scrollY, end = Math.min(el.getBoundingClientRect().top + scrollY - headerH(), document.documentElement.scrollHeight - innerHeight);
    const dur = 700, t0 = performance.now(), id = ++anim;
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = now => {
      if (id !== anim) return;
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, start + (end - start) * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  addEventListener('wheel', () => anim++, { passive: true });   // si el usuario mueve la rueda, se cancela
  btn.addEventListener('click', () => {
    const s = sections(); if (!s.length) return;
    const idx = s.findIndex(el => el.getBoundingClientRect().top >= 0);
    if (idx === -1) { to(s[s.length - 1]); return; }   // ya estamos en el footer
    if (dir === 'next') {
      if (s[idx + 1]) to(s[idx + 1]);
      setDir(idx + 2 >= s.length ? 'prev' : 'next');
    } else {
      if (s[idx - 1]) to(s[idx - 1]);
      setDir(idx <= 1 ? 'next' : 'prev');
    }
  });
  addEventListener('scroll', check, { passive: true });
  check();
}

document.addEventListener('DOMContentLoaded', () => {
  // Como el tema original: las páginas /pages/* llevan 80px al final del contenido
  if (location.pathname.startsWith('/pages/')) document.body.classList.add('template-page');
  renderHeader();
  renderFooter();
  renderCartDrawer();
  refreshBadges();
  initScrollArrow();
  initCursor();
});
