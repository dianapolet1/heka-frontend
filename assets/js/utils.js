/* ============================================================
   Heka Universe — Utils globales
   ============================================================ */

// Confirmado en el código de Shopify: la tienda cobra en USD
const CURRENCY = 'USD';
const LOCALE = 'en-US';

function formatMoney(amount) {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(amount);
}

function esc(str = '') {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Lee el handle desde la URL: /products/altar-set  ó  ?handle=altar-set
function handleFromPath(prefix) {
  const q = new URLSearchParams(location.search).get('handle');
  if (q) return q;
  const parts = location.pathname.split('/').filter(Boolean);
  const i = parts.indexOf(prefix);
  return i >= 0 ? parts[i + 1] || null : null;
}

// Convierte HTML (p. ej. descripciones de Shopify/Squarespace) a texto plano.
// DOMParser no ejecuta scripts ni carga imágenes: es seguro con HTML ajeno.
function htmlToText(html = '') {
  const doc = new DOMParser().parseFromString(String(html).replace(/<br\s*\/?>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function productUrl(handle) { return `/products/${handle}`; }
function absoluteUrl(path) { return location.origin + path; }

// ── Toast ────────────────────────────────────────────────────
function showToast(message) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ── Modales ──────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
  if (e.target.closest('[data-close-modal]')) e.target.closest('.modal-overlay')?.classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  if (typeof closeCartDrawer === 'function') closeCartDrawer();
});
