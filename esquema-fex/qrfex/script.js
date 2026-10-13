'use strict';

/* =========================================================
   QR Studio
   ========================================================= */

/* ---------- CONFIGURA AQUÍ TUS REDES SOCIALES ----------
   Pega la URL completa de cada perfil (con https://).
   Mientras estén vacías, los iconos se muestran atenuados. */
const SOCIAL_LINKS = {
  tiktok:   '',   // Ejemplo: 'https://www.tiktok.com/@tu_usuario'
  facebook: '',   // Ejemplo: 'https://www.facebook.com/tu_pagina'
  youtube:  ''    // Ejemplo: 'https://www.youtube.com/@tu_canal'
};

/* ---------- Configuración de la API ---------- */
const API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';
const MAX_BYTES = 900;          // Límite de datos de la API en peticiones GET
const QUIET_ZONE = 2;           // Zona de silencio (en módulos) -> parámetro qzone
const LOGO_RATIO = 0.22;        // Lado del logotipo respecto al lado del QR
const LOGO_MAX_FILE = 5 * 1024 * 1024;

const FG_PRESETS = [
  { name: 'Negro',   hex: '#000000' },
  { name: 'Rojo',    hex: '#c0192b' },
  { name: 'Azul',    hex: '#1d4ed8' },
  { name: 'Verde',   hex: '#15803d' },
  { name: 'Violeta', hex: '#5b21b6' }
];
const BG_PRESETS = [
  { name: 'Blanco',   hex: '#ffffff' },
  { name: 'Gris claro', hex: '#f1f5f9' },
  { name: 'Lila claro', hex: '#ede9fe' },
  { name: 'Crema',    hex: '#fef9c3' }
];

/* ---------- Referencias al DOM ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  form: $('qrForm'), content: $('content'), clearBtn: $('clearBtn'), contentError: $('contentError'),
  fgColor: $('fgColor'), bgColor: $('bgColor'), fgSwatches: $('fgSwatches'), bgSwatches: $('bgSwatches'),
  contrastWarn: $('contrastWarn'),
  logoInput: $('logoInput'), logoPreview: $('logoPreview'), logoThumb: $('logoThumb'),
  logoRemove: $('logoRemove'), logoError: $('logoError'),
  generateBtn: $('generateBtn'),
  badge: $('badge'), emptyState: $('emptyState'), result: $('result'),
  qrFrame: $('qrFrame'), canvas: $('qrCanvas'), loader: $('loader'),
  renderError: $('renderError'), renderErrorText: $('renderErrorText'), retryBtn: $('retryBtn'),
  metaContent: $('metaContent'), metaSize: $('metaSize'),
  downloadBtn: $('downloadBtn'), openBtn: $('openBtn'), copyBtn: $('copyBtn'), anotherBtn: $('anotherBtn'),
  toast: $('toast')
};

/* ---------- Estado ---------- */
const state = {
  fg: '#000000',
  bg: '#ffffff',
  generated: null,     // { content } del último QR generado
  logoImg: null,       // HTMLImageElement del logotipo
  exportable: false,   // true si el canvas se puede exportar (sin restricciones CORS)
  apiUrl: '',          // URL de la API del QR actual
  blobUrl: '',         // URL local (blob) del PNG final
  renderId: 0
};

/* =========================================================
   Utilidades
   ========================================================= */
let toastTimer;
function showToast(message, type = 'success') {
  el.toast.textContent = message;
  el.toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.className = 'toast ' + type; }, 3200);
}

function getSize() {
  const checked = document.querySelector('input[name="size"]:checked');
  return checked ? parseInt(checked.value, 10) : 300;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* =========================================================
   Redes sociales
   ========================================================= */
function initSocial() {
  document.querySelectorAll('[data-social]').forEach((a) => {
    const url = (SOCIAL_LINKS[a.dataset.social] || '').trim();
    if (/^https?:\/\//i.test(url)) {
      a.href = url;
    } else {
      a.classList.add('is-pending');
      a.title += ' (configura la URL en script.js)';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Aún no has configurado este enlace en script.js', 'error');
      });
    }
  });
}

/* =========================================================
   Selectores de color
   ========================================================= */
function buildSwatches(container, presets, kind) {
  presets.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = p.hex;
    b.dataset.hex = p.hex;
    b.setAttribute('aria-label', p.name);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => setColor(kind, p.hex));
    container.appendChild(b);
  });
}

function setColor(kind, hex) {
  state[kind] = hex.toLowerCase();
  const input = kind === 'fg' ? el.fgColor : el.bgColor;
  const box = kind === 'fg' ? el.fgSwatches : el.bgSwatches;
  input.value = state[kind];
  box.querySelectorAll('.swatch').forEach((s) => {
    s.setAttribute('aria-pressed', String(s.dataset.hex === state[kind]));
  });
  updateContrastWarning();
  scheduleLiveUpdate();
}

function updateContrastWarning() {
  const ratio = contrastRatio(state.fg, state.bg);
  const inverted = luminance(state.fg) > luminance(state.bg);
  el.contrastWarn.hidden = !(ratio < 4 || inverted);
}

/* =========================================================
   Validación
   ========================================================= */
function validateContent(raw) {
  const value = raw.trim();
  if (!value) return { ok: false, message: 'Escribe o pega algo para convertir en código QR.' };

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      if (!u.hostname) throw new Error('sin host');
    } catch {
      return { ok: false, message: 'El enlace no tiene un formato válido. Revisa que esté completo (ej. https://tusitio.com).' };
    }
  }

  const bytes = new TextEncoder().encode(value).length;
  if (bytes > MAX_BYTES) {
    return { ok: false, message: `El contenido es demasiado largo (${bytes} bytes). El máximo es ${MAX_BYTES} bytes.` };
  }
  return { ok: true, value };
}

function showFieldError(message) {
  el.contentError.textContent = message;
  el.contentError.hidden = false;
  el.content.setAttribute('aria-invalid', 'true');
}
function clearFieldError() {
  el.contentError.hidden = true;
  el.contentError.textContent = '';
  el.content.removeAttribute('aria-invalid');
}

/* =========================================================
   API y dibujo
   ========================================================= */
function buildApiUrl({ content, size, fg, bg, ecc }) {
  // size y data tal como en la URL base original; el resto son parámetros
  // documentados de la API: color, bgcolor, ecc, qzone, margin, format.
  return API_BASE +
    '?size=' + size + 'x' + size +
    '&data=' + encodeURIComponent(content) +
    '&color=' + fg.slice(1) +
    '&bgcolor=' + bg.slice(1) +
    '&ecc=' + ecc +
    '&qzone=' + QUIET_ZONE +
    '&margin=0' +
    '&format=png';
}

function loadImage(src, withCors) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (withCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLogo(ctx, size, logo) {
  const box = size * LOGO_RATIO;            // área del logotipo
  const pad = box * 0.14;                   // margen de seguridad
  const plate = box + pad * 2;              // placa blanca
  const x = (size - plate) / 2;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, x, x, plate, plate, plate * 0.18);
  ctx.fill();
  ctx.restore();

  const w = logo.naturalWidth || 1, h = logo.naturalHeight || 1;
  const scale = Math.min(box / w, box / h);
  const dw = w * scale, dh = h * scale;
  ctx.drawImage(logo, (size - dw) / 2, (size - dh) / 2, dw, dh);
}

function setLoading(on) {
  el.loader.hidden = !on;
  el.qrFrame.classList.toggle('is-loading', on);
  el.qrFrame.setAttribute('aria-busy', String(on));
}

function setBusy(on) {
  el.generateBtn.disabled = on;
  el.generateBtn.setAttribute('aria-busy', String(on));
}

function revokeBlob() {
  if (state.blobUrl) { URL.revokeObjectURL(state.blobUrl); state.blobUrl = ''; }
}

async function renderQR() {
  if (!state.generated) return;
  const id = ++state.renderId;
  const size = getSize();
  const hasLogo = !!state.logoImg;
  const content = state.generated.content;

  el.renderError.hidden = true;
  setLoading(true);
  setBusy(true);
  state.exportable = false;
  revokeBlob();
  el.downloadBtn.disabled = true;

  const url = buildApiUrl({ content, size, fg: state.fg, bg: state.bg, ecc: hasLogo ? 'H' : 'M' });
  state.apiUrl = url;

  try {
    let img, tainted = false;
    try {
      img = await loadImage(url, true);                 // permite exportar el canvas
    } catch {
      img = await loadImage(url, false);                // solo visualización (puede bloquear la exportación)
      tainted = true;
    }
    if (id !== state.renderId) return;                  // llegó una petición más nueva

    const canvas = el.canvas;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    if (hasLogo) drawLogo(ctx, size, state.logoImg);

    // Comprobación real de exportación
    if (!tainted) {
      try {
        const blob = await new Promise((res, rej) => {
          canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob vacío'))), 'image/png');
        });
        if (id !== state.renderId) return;
        state.blobUrl = URL.createObjectURL(blob);
        state.exportable = true;
      } catch {
        state.exportable = false;
      }
    }

    el.metaContent.textContent = content;
    el.metaContent.title = content;
    el.metaSize.textContent = size + ' × ' + size + ' px';
    el.canvas.setAttribute('aria-label',
      'Código QR de ' + (content.length > 80 ? content.slice(0, 80) + '…' : content));
    el.downloadBtn.disabled = false;
  } catch {
    if (id !== state.renderId) return;
    el.renderErrorText.textContent =
      'No se pudo obtener el código QR desde la API. Revisa tu conexión a Internet e inténtalo de nuevo.';
    el.renderError.hidden = false;
    el.downloadBtn.disabled = true;
    showToast('No se pudo generar el código QR', 'error');
  } finally {
    if (id === state.renderId) { setLoading(false); setBusy(false); }
  }
}

/* Cambios de personalización: si ya hay un QR, se actualiza solo */
const scheduleLiveUpdate = debounce(() => { if (state.generated) renderQR(); }, 350);

/* =========================================================
   Generar
   ========================================================= */
function showResult() {
  el.emptyState.hidden = true;
  el.result.hidden = false;
  el.badge.hidden = false;
  el.qrFrame.classList.remove('pop');
  void el.qrFrame.offsetWidth;                  // reinicia la animación
  el.qrFrame.classList.add('pop');
}

async function handleGenerate(e) {
  if (e) e.preventDefault();
  const check = validateContent(el.content.value);
  if (!check.ok) {
    showFieldError(check.message);
    el.content.focus();
    return;
  }
  clearFieldError();
  state.generated = { content: check.value };
  showResult();
  await renderQR();
  if (!el.renderError.hidden) return;
  showToast('¡Código QR generado!');
  if (window.matchMedia('(max-width: 899px)').matches) {
    el.result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
}

/* =========================================================
   Logotipo
   ========================================================= */
function showLogoError(msg) { el.logoError.textContent = msg; el.logoError.hidden = false; }
function clearLogoError() { el.logoError.hidden = true; el.logoError.textContent = ''; }

function removeLogo() {
  state.logoImg = null;
  el.logoInput.value = '';
  el.logoThumb.removeAttribute('src');
  el.logoPreview.hidden = true;
  clearLogoError();
  scheduleLiveUpdate();
}

function handleLogoFile() {
  clearLogoError();
  const file = el.logoInput.files && el.logoInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showLogoError('El archivo debe ser una imagen.'); el.logoInput.value = ''; return; }
  if (file.size > LOGO_MAX_FILE) { showLogoError('La imagen pesa más de 5 MB. Elige una más ligera.'); el.logoInput.value = ''; return; }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.logoImg = img;
      el.logoThumb.src = reader.result;
      el.logoPreview.hidden = false;
      scheduleLiveUpdate();
    };
    img.onerror = () => showLogoError('No se pudo leer esa imagen. Prueba con PNG, JPG o SVG.');
    img.src = reader.result;
  };
  reader.onerror = () => showLogoError('No se pudo leer el archivo.');
  reader.readAsDataURL(file);
}

/* =========================================================
   Acciones de la vista previa
   ========================================================= */
function handleDownload() {
  if (!state.generated) return;
  if (state.exportable && state.blobUrl) {
    const a = document.createElement('a');
    a.href = state.blobUrl;
    a.download = 'codigo-qr.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Descarga iniciada: codigo-qr.png');
    return;
  }
  // El navegador no permite exportar la imagen compuesta
  if (state.logoImg) {
    showToast('Tu navegador bloqueó la exportación con logotipo. Prueba quitando el logotipo o usando otro navegador.', 'error');
  } else {
    window.open(state.apiUrl, '_blank', 'noopener,noreferrer');
    showToast('No se pudo descargar directamente. Abrí la imagen: mantén pulsado o clic derecho para guardarla.', 'error');
  }
}

function handleOpen() {
  if (!state.generated) return;
  const url = state.exportable && state.blobUrl ? state.blobUrl : state.apiUrl;
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) showToast('El navegador bloqueó la ventana emergente.', 'error');
}

async function handleCopy() {
  if (!state.generated) return;
  const text = state.generated.content;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) throw new Error('copy failed');
    }
    showToast('Contenido copiado al portapapeles');
  } catch {
    showToast('No se pudo copiar el contenido', 'error');
  }
}

function handleAnother() {
  state.renderId++;                 // cancela cualquier petición pendiente
  state.generated = null;
  revokeBlob();
  el.result.hidden = true;
  el.badge.hidden = true;
  el.emptyState.hidden = false;
  el.content.value = '';
  el.clearBtn.hidden = true;
  clearFieldError();
  setBusy(false);
  el.content.focus();
}

/* =========================================================
   Eventos
   ========================================================= */
function init() {
  initSocial();
  buildSwatches(el.fgSwatches, FG_PRESETS, 'fg');
  buildSwatches(el.bgSwatches, BG_PRESETS, 'bg');
  setColor('fg', state.fg);
  setColor('bg', state.bg);

  el.form.addEventListener('submit', handleGenerate);

  el.content.addEventListener('input', () => {
    el.clearBtn.hidden = el.content.value.length === 0;
    if (!el.contentError.hidden) clearFieldError();
  });
  el.clearBtn.addEventListener('click', () => {
    el.content.value = '';
    el.clearBtn.hidden = true;
    clearFieldError();
    el.content.focus();
  });

  document.querySelectorAll('input[name="size"]').forEach((r) =>
    r.addEventListener('change', scheduleLiveUpdate));

  // type="color" dispara 'input' mientras se arrastra; el debounce evita peticiones de más
  el.fgColor.addEventListener('input', (e) => setColor('fg', e.target.value));
  el.bgColor.addEventListener('input', (e) => setColor('bg', e.target.value));

  el.logoInput.addEventListener('change', handleLogoFile);
  el.logoRemove.addEventListener('click', removeLogo);

  el.retryBtn.addEventListener('click', renderQR);
  el.downloadBtn.addEventListener('click', handleDownload);
  el.openBtn.addEventListener('click', handleOpen);
  el.copyBtn.addEventListener('click', handleCopy);
  el.anotherBtn.addEventListener('click', handleAnother);

  window.addEventListener('beforeunload', revokeBlob);

  // Iconos Lucide (si la biblioteca cargó)
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
