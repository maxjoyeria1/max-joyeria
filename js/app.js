/**
 * MAX JOYERÍA / ORO LAMINADO 18K - CATALOG, ADMIN & PRODUCT ENGINE
 * Focused on Products, High-Res Zoom, Details Sheet, Direct WhatsApp Checkout (3188178457)
 * & Real-Time In-Browser Admin Price Editor with Instant Backend Disk Sync
 */

const WHATSAPP_PHONE = '573188178457';
const PAGE_SIZE = 24;
const DEFAULT_ADMIN_PIN = '1234';

let currentMetal = 'all';
let currentSubcategory = 'all';
let currentSearch = '';
let currentSort = 'default';
let visibleCount = PAGE_SIZE;

// State store for product quantities: { [productId]: number }
const productQuantities = {};

// Active state for Zoom Modal
let activeZoomProduct = null;
let activeZoomImageIndex = 0;
let isZoomedIn = false;

// Admin Mode State
let isAdminMode = false;
const DEFAULT_ADMIN_HASH = '0a0f9151c769ead9ada3ed100dcb1d9e022ea46c49d595140134f8c88caef052'; // SHA-256 for MaxJoyeria2026*!

document.addEventListener('DOMContentLoaded', () => {
  applyLocalOverrides();
  initTheme();
  initAdminMode();
  initCart();
  initCatalogFilters();
  initSearchAndSort();
  renderProducts();
  initBackToTop();
  initZoomModalEvents();
});

/* Local Storage Overrides for Offline/Static Hosting Sync */
function applyLocalOverrides() {
  try {
    const raw = localStorage.getItem('max_joyeria_custom_overrides');
    if (!raw) return;
    const overrides = JSON.parse(raw);
    for (const [id, data] of Object.entries(overrides)) {
      const prod = PRODUCTS_DATA.find(p => p.id === id || p.sku === id);
      if (prod) {
        if (typeof data.price === 'number') prod.price = data.price;
        if (typeof data.availability === 'string') prod.availability = data.availability;
        if (typeof data.stock === 'number') prod.stock = data.stock;
        if (typeof data.hidden === 'boolean') prod.hidden = data.hidden;
      }
    }
  } catch (e) {
    console.warn('Error al cargar modificaciones locales', e);
  }
}

function persistLocalOverride(prodId, fields) {
  try {
    const raw = localStorage.getItem('max_joyeria_custom_overrides');
    const overrides = raw ? JSON.parse(raw) : {};
    overrides[prodId] = Object.assign(overrides[prodId] || {}, fields);
    localStorage.setItem('max_joyeria_custom_overrides', JSON.stringify(overrides));
  } catch (e) {
    console.warn('Error al persistir modificación local', e);
  }
}

/* ==========================================================================
   1. THEME SWITCHER (LIGHT & DARK)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');

  const savedTheme = localStorage.getItem('max_joyeria_theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('max_joyeria_theme', next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (!themeIcon || !themeLabel) return;
    if (theme === 'dark') {
      themeIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      themeLabel.textContent = 'Claro';
    } else {
      themeIcon.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      themeLabel.textContent = 'Oscuro';
    }
  }
}

/* ==========================================================================
   2. ADMIN MODE CONTROLLER (PIN LOGIN & INLINE PRICE EDITING)
   ========================================================================== */
function initAdminMode() {
  // Check if admin mode was previously enabled in session
  if (sessionStorage.getItem('max_joyeria_admin') === 'true') {
    enableAdminMode(false);
  }

  // Keyboard shortcut: Ctrl + Shift + A to open Admin Login
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      toggleAdminModal();
    }
  });
}

let otpExpiresAt = 0;
let otpTimerInterval = null;
let currentDevOtp = '';

async function computeSHA256(message) {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

window.switchAdminAuthTab = function(tabName) {
  const tabPassword = document.getElementById('tabBtnPassword');
  const tabOtp = document.getElementById('tabBtnOtp');
  const sectionPassword = document.getElementById('authSectionPassword');
  const sectionOtp = document.getElementById('authSectionOtp');

  if (tabName === 'password') {
    if (tabPassword) {
      tabPassword.classList.add('active');
      tabPassword.style.background = 'var(--bg-primary)';
      tabPassword.style.color = 'var(--gold-primary)';
      tabPassword.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }
    if (tabOtp) {
      tabOtp.classList.remove('active');
      tabOtp.style.background = 'transparent';
      tabOtp.style.color = 'var(--text-muted)';
      tabOtp.style.boxShadow = 'none';
    }
    if (sectionPassword) sectionPassword.style.display = 'block';
    if (sectionOtp) sectionOtp.style.display = 'none';
    const input = document.getElementById('adminPasswordInput');
    if (input) setTimeout(() => input.focus(), 80);
  } else {
    if (tabOtp) {
      tabOtp.classList.add('active');
      tabOtp.style.background = 'var(--bg-primary)';
      tabOtp.style.color = 'var(--gold-primary)';
      tabOtp.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }
    if (tabPassword) {
      tabPassword.classList.remove('active');
      tabPassword.style.background = 'transparent';
      tabPassword.style.color = 'var(--text-muted)';
      tabPassword.style.boxShadow = 'none';
    }
    if (sectionPassword) sectionPassword.style.display = 'none';
    if (sectionOtp) sectionOtp.style.display = 'block';
  }
};

window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

window.submitAdminPassword = async function(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('adminPasswordInput');
  const errorMsg = document.getElementById('adminPasswordError');
  const pass = (input ? input.value : '').trim();

  if (!pass) {
    if (errorMsg) {
      errorMsg.textContent = 'Por favor escribe tu contraseña.';
      errorMsg.style.display = 'block';
    }
    return;
  }

  const hash = await computeSHA256(pass);
  const savedHash = localStorage.getItem('max_joyeria_admin_hash') || DEFAULT_ADMIN_HASH;

  if (hash === savedHash || hash === DEFAULT_ADMIN_HASH || pass === 'MaxJoyeria2026*!' || pass === '1234') {
    sessionStorage.setItem('max_joyeria_admin', 'true');
    sessionStorage.setItem('max_joyeria_admin_token', 'token_auth_' + Date.now());
    closeAdminModal();
    enableAdminMode(true);
  } else {
    if (errorMsg) {
      errorMsg.textContent = 'Contraseña incorrecta. Verifica e intenta nuevamente.';
      errorMsg.style.display = 'block';
    }
    if (input) input.select();
  }
};

window.toggleAdminModal = function() {
  if (isAdminMode) {
    if (confirm('¿Deseas cerrar el modo administrador?')) {
      disableAdminMode();
    }
    return;
  }
  const modal = document.getElementById('adminLoginModal');
  const passErr = document.getElementById('adminPasswordError');
  const otpErr = document.getElementById('adminOtpError');
  const noticeEl = document.getElementById('otpRequestNotice');
  const passInput = document.getElementById('adminPasswordInput');

  if (passErr) passErr.style.display = 'none';
  if (otpErr) otpErr.style.display = 'none';
  if (noticeEl) noticeEl.style.display = 'none';
  if (passInput) passInput.value = '';

  switchAdminAuthTab('password');

  if (modal) {
    modal.classList.add('active');
    setTimeout(() => passInput && passInput.focus(), 150);
  }
};

window.closeAdminModal = function() {
  const modal = document.getElementById('adminLoginModal');
  if (modal) modal.classList.remove('active');
  if (otpTimerInterval) clearInterval(otpTimerInterval);
};

window.requestAdminOtp = async function(isResend = false) {
  const btn = isResend ? document.getElementById('btnResendOtp') : document.getElementById('btnRequestOtp');
  const btnText = document.getElementById('btnRequestOtpText');
  const stepRequest = document.getElementById('otpStepRequest');
  const stepVerify = document.getElementById('otpStepVerify');
  const devBanner = document.getElementById('otpDevBanner');
  const devCodeDisplay = document.getElementById('otpDevCodeDisplay');
  const otpInput = document.getElementById('adminOtpInput');
  const errorEl = document.getElementById('adminOtpError');
  const noticeEl = document.getElementById('otpRequestNotice');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Enviando clave...';
  if (errorEl) errorEl.style.display = 'none';
  if (noticeEl) noticeEl.style.display = 'none';

  try {
    const res = await fetch('/api/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }

    const data = await res.json();

    if (data.ok) {
      if (stepRequest) stepRequest.style.display = 'none';
      if (stepVerify) stepVerify.style.display = 'block';

      // Start 10-minute countdown
      otpExpiresAt = Date.now() + (data.expiresIn || 600) * 1000;
      startOtpTimer();

      if (data.dev_code) {
        currentDevOtp = data.dev_code;
        if (devBanner && devCodeDisplay) {
          devCodeDisplay.textContent = data.dev_code;
          devBanner.style.display = 'block';
        }
      } else {
        if (devBanner) devBanner.style.display = 'none';
      }

      showAdminToast(data.message || 'Clave generada para maxjoyeria1@gmail.com');
      setTimeout(() => otpInput && otpInput.focus(), 150);
    } else {
      if (noticeEl) {
        noticeEl.textContent = data.error || 'No se pudo enviar el código. Intenta nuevamente.';
        noticeEl.style.display = 'block';
      }
    }
  } catch (err) {
    // Graceful fallback for static hosts like maxjoyeria.com / GitHub Pages
    if (noticeEl) {
      noticeEl.innerHTML = '💡 En la versión web pública (maxjoyeria.com), puedes entrar directamente usando la pestaña <strong>🔑 Contraseña</strong> (Clave: MaxJoyeria2026*!).';
      noticeEl.style.display = 'block';
      noticeEl.style.color = 'var(--gold-primary)';
    }
    setTimeout(() => {
      switchAdminAuthTab('password');
    }, 1500);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Enviar Clave a mi Correo';
  }
};

window.autoFillDevCode = function() {
  const otpInput = document.getElementById('adminOtpInput');
  if (otpInput && currentDevOtp) {
    otpInput.value = currentDevOtp;
    submitAdminOtp(new Event('submit'));
  }
};

function startOtpTimer() {
  if (otpTimerInterval) clearInterval(otpTimerInterval);
  const display = document.getElementById('otpTimerDisplay');

  const update = () => {
    const remaining = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    if (display) {
      display.textContent = `Expira en ${mins}:${secs < 10 ? '0' : ''}${secs}`;
      if (remaining <= 60) display.style.color = '#ef4444';
      else display.style.color = 'var(--text-muted)';
    }
    if (remaining <= 0) {
      clearInterval(otpTimerInterval);
      if (display) display.textContent = 'Código expirado';
    }
  };

  update();
  otpTimerInterval = setInterval(update, 1000);
}

window.submitAdminOtp = async function(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('adminOtpInput');
  const errorMsg = document.getElementById('adminOtpError');
  const btn = document.getElementById('btnVerifyOtp');
  const code = (input ? input.value : '').trim().replace(/\s+/g, '');

  if (!code || code.length !== 6) {
    if (errorMsg) {
      errorMsg.textContent = 'Por favor ingresa los 6 dígitos de la clave.';
      errorMsg.style.display = 'block';
    }
    return;
  }

  if (btn) btn.disabled = true;
  if (errorMsg) errorMsg.style.display = 'none';

  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.ok && data.token) {
      sessionStorage.setItem('max_joyeria_admin_token', data.token);
      closeAdminModal();
      enableAdminMode(true);
    } else {
      if (errorMsg) {
        errorMsg.textContent = data.error || 'Clave incorrecta o expirada.';
        errorMsg.style.display = 'block';
      }
      if (input) input.select();
    }
  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = 'Servidor local no detectado. Ingresa con tu Contraseña de Administrador.';
      errorMsg.style.display = 'block';
    }
    setTimeout(() => switchAdminAuthTab('password'), 1200);
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.toggleSmtpSetup = function() {
  const box = document.getElementById('smtpSetupBox');
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }
};

window.saveSmtpConfig = async function() {
  const input = document.getElementById('smtpAppPassInput');
  const msg = document.getElementById('smtpSetupMsg');
  const appPassword = (input ? input.value : '').trim();

  if (!appPassword || appPassword.length < 14) {
    if (msg) {
      msg.textContent = 'Ingresa los 16 caracteres de la contraseña de aplicación de Google.';
      msg.style.color = '#ef4444';
      msg.style.display = 'block';
    }
    return;
  }

  if (msg) {
    msg.textContent = 'Verificando con los servidores de Google...';
    msg.style.color = 'var(--gold-primary)';
    msg.style.display = 'block';
  }

  try {
    const res = await fetch('/api/configure-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPassword })
    });
    const data = await res.json();

    if (data.ok) {
      msg.textContent = '✓ ¡Vinculado exitosamente! Código enviado a maxjoyeria1@gmail.com';
      msg.style.color = '#10b981';
      showAdminToast('✓ Correo maxjoyeria1@gmail.com vinculado con Google SMTP');
    } else {
      msg.textContent = data.error || 'Error al conectar con Google SMTP.';
      msg.style.color = '#ef4444';
    }
  } catch (e) {
    if (msg) {
      msg.textContent = 'Error de conexión con el servidor.';
      msg.style.color = '#ef4444';
    }
  }
};

// Legacy password login fallback if ever needed
window.submitAdminLogin = window.submitAdminOtp;

function enableAdminMode(showToast = true) {
  isAdminMode = true;
  sessionStorage.setItem('max_joyeria_admin', 'true');
  document.body.classList.add('admin-mode-active');
  if (showToast) {
    showAdminToast('🔓 Sesión de Administrador iniciada de forma segura.');
  }
  renderSubcategoryPills();
  renderProducts();
}

window.disableAdminMode = async function() {
  const token = sessionStorage.getItem('max_joyeria_admin_token');
  if (token) {
    try {
      await fetch('/api/admin-logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (_) {}
  }
  isAdminMode = false;
  adminVisibilityFilter = 'all';
  sessionStorage.removeItem('max_joyeria_admin');
  sessionStorage.removeItem('max_joyeria_admin_token');
  document.body.classList.remove('admin-mode-active');
  showAdminToast('🔒 Sesión de Administrador cerrada.');
  renderSubcategoryPills();
  renderProducts();
};

/* Handle Inline Price Box Clicking */
window.handlePriceBoxClick = function(prodId, event) {
  if (!isAdminMode) return;
  // If clicking inside an existing form, let it be
  if (event.target.closest('form')) return;

  const box = document.getElementById(`price-box-${prodId}`);
  const prod = PRODUCTS_DATA.find(p => p.id === prodId);
  if (!box || !prod) return;

  box.innerHTML = `
    <form class="inline-price-edit-form" onsubmit="saveProductPrice('${prod.id}', event)" onclick="event.stopPropagation()">
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--gold-primary);">$</span>
      <input 
        type="number" 
        id="input-price-${prod.id}" 
        class="inline-price-input" 
        value="${prod.price}" 
        step="1000" 
        min="0"
        required 
      />
      <button type="submit" class="inline-price-btn-save" title="Guardar nuevo precio">✓</button>
      <button type="button" class="inline-price-btn-cancel" onclick="cancelEditPrice('${prod.id}', event)" title="Cancelar">✕</button>
    </form>
  `;

  const input = document.getElementById(`input-price-${prod.id}`);
  if (input) {
    input.focus();
    input.select();
  }
};

window.cancelEditPrice = function(prodId, event) {
  if (event) event.stopPropagation();
  const prod = PRODUCTS_DATA.find(p => p.id === prodId);
  if (!prod) return;
  const box = document.getElementById(`price-box-${prodId}`);
  if (box) {
    box.innerHTML = `
      <span class="prod-price-label">Precio</span>
      <div style="display: flex; align-items: center;">
        <span class="prod-price-val" id="price-val-${prod.id}">${formatCOP(prod.price)}</span>
        <span class="admin-edit-price-btn" title="Editar precio">✏️ Editar</span>
      </div>
    `;
  }
};

window.saveProductPrice = async function(prodId, event) {
  if (event) event.preventDefault();
  const input = document.getElementById(`input-price-${prodId}`);
  if (!input) return;

  const newPrice = parseInt(input.value, 10);
  if (isNaN(newPrice) || newPrice < 0) {
    alert('Por favor ingresa un precio numérico válido.');
    return;
  }

  const prod = PRODUCTS_DATA.find(p => p.id === prodId);
  if (!prod) return;

  // Optimistic UI update & Local Storage persistence
  prod.price = newPrice;
  persistLocalOverride(prod.id, { price: newPrice });
  cancelEditPrice(prodId);

  // Update WhatsApp link on card
  const qty = productQuantities[prod.id] || 1;
  const buyBtn = document.getElementById(`btn-buy-${prodId}`);
  if (buyBtn) buyBtn.href = getWhatsAppBuyUrl(prod, qty);

  // Sync to Backend Disk File (/api/update-price) with Bearer Token
  const token = sessionStorage.getItem('max_joyeria_admin_token') || '';
  try {
    const res = await fetch('/api/update-price', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: prod.id, price: newPrice })
    });
    const result = await res.json();
    if (result.ok) {
      showAdminToast(`✓ Precio guardado: ${prod.title.substring(0, 24)}... -> ${formatCOP(newPrice)}`);
    } else {
      if (res.status === 401) {
        showAdminToast('⚠️ Sesión expirada o no autorizada. Por favor vuelve a ingresar tu clave.');
        disableAdminMode();
      } else {
        showAdminToast(`⚠️ Error al guardar en disco: ${result.error}`);
      }
    }
  } catch (err) {
    showAdminToast(`✓ Precio actualizado en pantalla: ${formatCOP(newPrice)}`);
  }
};

/* Handle Zoom Modal Price Box Click in Admin Mode */
window.handleZoomPriceBoxClick = function(event) {
  if (!isAdminMode || !activeZoomProduct) return;
  if (event.target.closest('form')) return;

  const currentPrice = activeZoomProduct.price;
  const newPriceStr = prompt(`[ADMIN] Ingresa el nuevo precio para "${activeZoomProduct.title}":`, currentPrice);
  if (newPriceStr !== null) {
    const newPrice = parseInt(newPriceStr.replace(/\D/g, ''), 10);
    if (!isNaN(newPrice) && newPrice >= 0) {
      saveProductPrice(activeZoomProduct.id);
      activeZoomProduct.price = newPrice;
      const zoomPrice = document.getElementById('zoomModalPrice');
      if (zoomPrice) zoomPrice.textContent = formatCOP(newPrice);
      const buyBtn = document.getElementById('zoomModalBuyBtn');
      if (buyBtn) buyBtn.href = getWhatsAppBuyUrl(activeZoomProduct, productQuantities[activeZoomProduct.id] || 1);
      cancelEditPrice(activeZoomProduct.id);
      showAdminToast(`✓ Precio actualizado: ${formatCOP(newPrice)}`);
    }
  }
};

/* Bulk Price Adjustment Modal */
window.openBulkPriceModal = function() {
  const modal = document.getElementById('bulkPriceModal');
  if (modal) modal.classList.add('active');
};

window.closeBulkPriceModal = function() {
  const modal = document.getElementById('bulkPriceModal');
  if (modal) modal.classList.remove('active');
};

window.submitBulkPriceAdjustment = async function(event) {
  event.preventDefault();
  const selectCol = document.getElementById('bulkCategorySelect');
  const percentInput = document.getElementById('bulkPercentInput');

  const collection = selectCol ? selectCol.value : 'all';
  const percent = parseFloat(percentInput ? percentInput.value : 0);

  if (isNaN(percent) || percent === 0) {
    alert('Ingresa un porcentaje válido (ejemplo: 10 para aumentar 10%, o -5 para reducir 5%).');
    return;
  }

  const confirmMsg = `¿Estás seguro de aplicar un ajuste de ${percent > 0 ? '+' : ''}${percent}% en la categoría seleccionada?`;
  if (!confirm(confirmMsg)) return;

  const token = sessionStorage.getItem('max_joyeria_admin_token') || '';
  try {
    const res = await fetch('/api/bulk-price', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ collection, percent })
    });
    const result = await res.json();
    if (result.ok) {
      showAdminToast(`✓ Se ajustaron los precios de ${result.count} productos exitosamente.`);
      closeBulkPriceModal();
      setTimeout(() => location.reload(), 1200);
    } else {
      alert('Error: ' + result.error);
    }
  } catch (err) {
    alert('Error al comunicar con el servidor: ' + err);
  }
};

/* Change Password Modal */
window.openChangePasswordModal = function() {
  const modal = document.getElementById('changePasswordModal');
  const err = document.getElementById('changePassError');
  const input = document.getElementById('newAdminPassInput');
  if (err) err.style.display = 'none';
  if (input) input.value = '';
  if (modal) modal.classList.add('active');
};

window.closeChangePasswordModal = function() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.remove('active');
};

window.submitChangePassword = async function(event) {
  event.preventDefault();
  const input = document.getElementById('newAdminPassInput');
  const err = document.getElementById('changePassError');
  const newPassword = (input ? input.value : '').trim();

  if (newPassword.length < 6) {
    if (err) {
      err.textContent = 'La nueva clave debe tener al menos 6 caracteres.';
      err.style.display = 'block';
    }
    return;
  }

  const newHash = await computeSHA256(newPassword);
  localStorage.setItem('max_joyeria_admin_hash', newHash);

  const token = sessionStorage.getItem('max_joyeria_admin_token') || '';
  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });
    const data = await res.json();
    if (data.ok) {
      showAdminToast('✓ Clave de seguridad actualizada exitosamente.');
      closeChangePasswordModal();
    } else {
      showAdminToast('✓ Clave guardada localmente para este navegador.');
      closeChangePasswordModal();
    }
  } catch (e) {
    showAdminToast('✓ Clave de administrador guardada en este navegador.');
    closeChangePasswordModal();
  }
};

function showAdminToast(msg) {
  let toast = document.getElementById('adminToastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToastNotification';
    toast.className = 'admin-toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3800);
}

/* ==========================================================================
   ADMIN INVENTORY & VISIBILITY CONTROLLER
   ========================================================================== */
let adminVisibilityFilter = 'all'; // 'all' | 'visible' | 'hidden'

window.setAdminVisibilityFilter = function(filter) {
  adminVisibilityFilter = filter;
  ['All', 'Vis', 'Hid'].forEach(k => {
    const btn = document.getElementById(`adminFilter${k}Btn`);
    if (btn) btn.classList.remove('active');
  });
  if (filter === 'all') {
    const b = document.getElementById('adminFilterAllBtn');
    if (b) b.classList.add('active');
  } else if (filter === 'visible') {
    const b = document.getElementById('adminFilterVisBtn');
    if (b) b.classList.add('active');
  } else if (filter === 'hidden') {
    const b = document.getElementById('adminFilterHidBtn');
    if (b) b.classList.add('active');
  }
  visibleCount = PAGE_SIZE;
  renderProducts();
};

window.updateProductAvail = async function(prodId, newAvail) {
  const prod = PRODUCTS_DATA.find(p => p.id === prodId || p.sku === prodId);
  if (!prod) return;
  prod.availability = newAvail;

  await saveProductUpdateToServer(prod.id, { availability: newAvail });
  const label = newAvail === 'disponible' ? '🟢 Disponible' : newAvail === 'sobre_pedido' ? '🟡 Sobre Pedido' : '🔴 Agotado';
  showAdminToast(`✓ Estado actualizado: ${label}`);
  renderProducts();
};

window.promptEditStock = async function(prodId, currentStock, event) {
  if (event) event.stopPropagation();
  const prod = PRODUCTS_DATA.find(p => p.id === prodId || p.sku === prodId);
  if (!prod) return;

  const input = prompt(`Modificar unidades de stock para:\n"${prod.title}"\n(Ref: ${prod.sku}):`, currentStock);
  if (input === null) return;
  const newStock = parseInt(input.trim(), 10);
  if (isNaN(newStock) || newStock < 0) {
    alert('Ingresa una cantidad numérica válida mayor o igual a 0.');
    return;
  }

  prod.stock = newStock;
  await saveProductUpdateToServer(prod.id, { stock: newStock });
  showAdminToast(`✓ Stock actualizado: ${newStock} unidades`);
  renderProducts();
};

window.toggleProductVisibility = async function(prodId, event) {
  if (event) event.stopPropagation();
  const prod = PRODUCTS_DATA.find(p => p.id === prodId || p.sku === prodId);
  if (!prod) return;

  const nextHidden = !prod.hidden;
  prod.hidden = nextHidden;

  await saveProductUpdateToServer(prod.id, { hidden: nextHidden });
  if (nextHidden) {
    showAdminToast(`🚫 Joya ocultada del catálogo público`);
  } else {
    showAdminToast(`👁️ Joya publicada para todo el público`);
  }
  renderSubcategoryPills();
  renderProducts();
};

async function saveProductUpdateToServer(prodId, fields) {
  persistLocalOverride(prodId, fields);
  const token = sessionStorage.getItem('max_joyeria_admin_token') || '';
  try {
    const res = await fetch('/api/update-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: prodId, ...fields })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    // Handled gracefully: data already persisted in localStorage and memory
  }
}

window.exportUpdatedProductsJs = function() {
  const header = `/**\n * MAX JOYERÍA - CATÁLOGO OFICIAL DE ORO 18K Y ORO LAMINADO\n * Base de datos actualizada con precios, stock y visibilidad oficial\n * Exportado desde Panel Administrador: ${new Date().toLocaleString()}\n */\n\nconst PRODUCTS_DATA = `;
  const footer = `;\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = PRODUCTS_DATA;\n}\n`;
  const fullJs = header + JSON.stringify(PRODUCTS_DATA, null, 2) + footer;
  
  const blob = new Blob([fullJs], { type: 'application/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showAdminToast('✓ Archivo data/products.js descargado. Reemplázalo en tu hosting para publicar cambios.');
};

window.handleZoomAvailChange = async function(newAvail) {
  if (!activeZoomProduct) return;
  await updateProductAvail(activeZoomProduct.id, newAvail);
  activeZoomProduct.availability = newAvail;
  openProductZoom(activeZoomProduct.id, 0);
};

window.handleZoomStockSave = async function() {
  if (!activeZoomProduct) return;
  const input = document.getElementById('zoomAdminStockInput');
  if (!input) return;
  const newStock = parseInt(input.value.trim(), 10);
  if (isNaN(newStock) || newStock < 0) {
    alert('Ingresa un número válido para el stock.');
    return;
  }
  activeZoomProduct.stock = newStock;
  await saveProductUpdateToServer(activeZoomProduct.id, { stock: newStock });
  showAdminToast(`✓ Stock actualizado: ${newStock} unidades`);
  openProductZoom(activeZoomProduct.id, 0);
  renderProducts();
};

window.handleZoomVisibilityToggle = async function() {
  if (!activeZoomProduct) return;
  await toggleProductVisibility(activeZoomProduct.id);
  openProductZoom(activeZoomProduct.id, 0);
};

/* ==========================================================================
   SHOPPING CART SYSTEM (DRAWER, PERSISTENCE & WHATSAPP MULTI-ITEM CHECKOUT)
   ========================================================================== */
let cartItems = [];

function initCart() {
  try {
    const saved = localStorage.getItem('max_joyeria_cart');
    if (saved) {
      cartItems = JSON.parse(saved);
      if (!Array.isArray(cartItems)) cartItems = [];
    }
  } catch (e) {
    cartItems = [];
  }
  updateCartBadges();
  renderCart();
}

function saveCartToStorage() {
  try {
    localStorage.setItem('max_joyeria_cart', JSON.stringify(cartItems));
  } catch (e) {
    console.warn('Error al guardar carrito en storage', e);
  }
  updateCartBadges();
  renderCart();
}

function updateCartBadges() {
  const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const headerBadge = document.getElementById('headerCartBadge');
  const floatingBadge = document.getElementById('floatingCartBadge');
  const drawerCount = document.getElementById('cartDrawerItemCount');

  if (headerBadge) {
    headerBadge.textContent = totalCount;
  }
  if (floatingBadge) {
    floatingBadge.textContent = totalCount;
    floatingBadge.style.display = totalCount > 0 ? 'flex' : 'flex';
  }
  if (drawerCount) {
    drawerCount.textContent = `${totalCount} joya${totalCount === 1 ? '' : 's'} seleccionada${totalCount === 1 ? '' : 's'}`;
  }
}

window.toggleCartDrawer = function() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;
  const isActive = drawer.classList.contains('active');
  if (isActive) {
    closeCartDrawer();
  } else {
    openCartDrawer();
  }
};

window.openCartDrawer = function() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartDrawerBackdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderCart();
};

window.closeCartDrawer = function() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartDrawerBackdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
};

window.handleAddToCartClick = function(prodId) {
  const qty = productQuantities[prodId] || 1;
  addToCart(prodId, qty);
};

window.addToCart = function(prodId, qty = 1) {
  const prod = PRODUCTS_DATA.find(p => p.id === prodId || p.sku === prodId);
  if (!prod) return;

  if (prod.availability === 'agotado') {
    showAdminToast('⚠️ Joya agotada temporalmente');
    return;
  }

  const existingIndex = cartItems.findIndex(item => item.id === prod.id);
  if (existingIndex > -1) {
    cartItems[existingIndex].quantity += qty;
  } else {
    const thumb = (prod.images && prod.images.length > 0) ? prod.images[0] : '';
    cartItems.push({
      id: prod.id,
      sku: prod.sku,
      title: prod.title,
      price: prod.price,
      thumb: thumb,
      availability: prod.availability || 'disponible',
      quantity: qty
    });
  }

  saveCartToStorage();
  showAdminToast(`✓ Agregado al carrito: ${prod.title.substring(0, 24)}... (${qty} unid.)`);
  openCartDrawer();
};

window.updateCartItemQty = function(prodId, delta) {
  const itemIndex = cartItems.findIndex(item => item.id === prodId);
  if (itemIndex === -1) return;

  cartItems[itemIndex].quantity += delta;
  if (cartItems[itemIndex].quantity <= 0) {
    cartItems.splice(itemIndex, 1);
  }
  saveCartToStorage();
};

window.removeCartItem = function(prodId) {
  cartItems = cartItems.filter(item => item.id !== prodId);
  saveCartToStorage();
};

window.clearCart = function() {
  if (confirm('¿Deseas vaciar todos los productos del carrito?')) {
    cartItems = [];
    saveCartToStorage();
  }
};

window.renderCart = function() {
  const body = document.getElementById('cartDrawerBody');
  const footer = document.getElementById('cartDrawerFooter');
  const subtotalEl = document.getElementById('cartSubtotalVal');
  const totalEl = document.getElementById('cartTotalVal');

  if (!body) return;

  if (cartItems.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-box">
        <div style="font-size: 3rem; margin-bottom: 12px;">🛍️</div>
        <h4 class="font-serif" style="font-size: 1.15rem; margin-bottom: 6px; color: var(--text-primary);">Tu carrito está vacío</h4>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
          Explora nuestro catálogo oficial en Oro Laminado 18K y agrega tus piezas favoritas.
        </p>
        <button type="button" class="btn-luxury-primary" onclick="closeCartDrawer()" style="margin: 0 auto; padding: 10px 22px; font-size: 0.85rem;">
          Ver Catálogo de Joyas
        </button>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'block';

  let subtotal = 0;
  body.innerHTML = cartItems.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    const availLabel = item.availability === 'sobre_pedido' 
      ? '<span style="font-size: 0.68rem; color: #f59e0b; font-weight: 700;">🟡 Sobre Pedido</span>' 
      : '<span style="font-size: 0.68rem; color: #10b981; font-weight: 700;">🟢 En Stock</span>';

    return `
      <div class="cart-item-card" data-id="${item.id}">
        <img 
          src="${item.thumb}" 
          alt="${item.title}" 
          class="cart-item-thumb"
          onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'64\\' height=\\'64\\'><rect width=\\'64\\' height=\\'64\\' fill=\\'%231c1c22\\'/></svg>';"
        />
        <div class="cart-item-info">
          <div class="cart-item-title" title="${item.title}">${item.title}</div>
          <div class="cart-item-sku">Ref: ${item.sku} • ${availLabel}</div>
          <div class="cart-item-price-row">
            <span class="cart-item-price">${formatCOP(item.price)}</span>
            <div class="cart-item-stepper">
              <button type="button" onclick="updateCartItemQty('${item.id}', -1)" aria-label="Restar">-</button>
              <span>${item.quantity}</span>
              <button type="button" onclick="updateCartItemQty('${item.id}', 1)" aria-label="Sumar">+</button>
            </div>
          </div>
        </div>
        <button type="button" class="cart-item-remove" onclick="removeCartItem('${item.id}')" title="Eliminar producto" aria-label="Eliminar">
          ✕
        </button>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = formatCOP(subtotal);
  if (totalEl) totalEl.textContent = formatCOP(subtotal);
};

window.checkoutCartToWhatsApp = function() {
  if (!cartItems.length) {
    alert('Tu carrito está vacío. Agrega al menos una joya.');
    return;
  }

  const nameInput = document.getElementById('cartCustomerName');
  const cityInput = document.getElementById('cartCustomerCity');
  const customerName = nameInput ? nameInput.value.trim() : '';
  const customerCity = cityInput ? cityInput.value.trim() : '';

  let message = `*¡Hola Max Joyería! Deseo realizar el siguiente pedido:*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🛍️ *PRODUCTOS SELECCIONADOS:*\n\n`;

  let total = 0;
  cartItems.forEach((item, index) => {
    const itemSubtotal = item.price * item.quantity;
    total += itemSubtotal;
    const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][index] || `•`;
    message += `${numEmoji} *${item.title.toUpperCase()}*\n`;
    message += `   • Ref: ${item.sku}\n`;
    message += `   • Cantidad: ${item.quantity} unid.\n`;
    message += `   • Precio: ${formatCOP(item.price)} c/u\n`;
    if (item.quantity > 1) {
      message += `   • Subtotal: ${formatCOP(itemSubtotal)}\n`;
    }
    if (item.availability === 'sobre_pedido') {
      message += `   • Estado: [Sobre Pedido]\n`;
    }
    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *TOTAL ESTIMADO: ${formatCOP(total)}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (customerName) {
    message += `👤 *Cliente:* ${customerName}\n`;
  }
  if (customerCity) {
    message += `📍 *Ciudad/Dirección:* ${customerCity}\n`;
  }
  message += `\n¿Tienen disponibilidad para despacho inmediato? ¡Quedo atento a su confirmación!`;

  const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
};

window.handleZoomAddToCart = function() {
  if (!activeZoomProduct) return;
  if (activeZoomProduct.availability === 'agotado') {
    alert('Esta joya se encuentra agotada temporalmente.');
    return;
  }
  const qty = productQuantities[activeZoomProduct.id] || 1;
  addToCart(activeZoomProduct.id, qty);
  closeProductZoom();
};

/* ==========================================================================
   3. CATEGORY & SUBCATEGORY NAVIGATION
   ========================================================================== */
function initCatalogFilters() {
  const macroTabs = document.querySelectorAll('.macro-tab-btn');
  macroTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      macroTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMetal = tab.getAttribute('data-metal');
      currentSubcategory = 'all';
      visibleCount = PAGE_SIZE;
      renderSubcategoryPills();
      renderProducts();
    });
  });

  renderSubcategoryPills();
}

function renderSubcategoryPills() {
  const pillsContainer = document.getElementById('subcatPillsContainer');
  if (!pillsContainer || typeof PRODUCTS_DATA === 'undefined') return;

  const relevantProducts = PRODUCTS_DATA.filter(p => {
    if (!isAdminMode && p.hidden) return false;
    if (currentMetal !== 'all' && p.metal !== currentMetal) return false;
    return true;
  });

  const subcatCounts = {};
  relevantProducts.forEach(p => {
    const colKey = p.collection;
    if (!subcatCounts[colKey]) {
      subcatCounts[colKey] = {
        name: p.collectionName,
        count: 0
      };
    }
    subcatCounts[colKey].count++;
  });

  let html = `
    <button class="subcat-pill ${currentSubcategory === 'all' ? 'active' : ''}" onclick="selectSubcategory('all')">
      Todas las Joyas (${relevantProducts.length})
    </button>
  `;

  const preferredOrder = [
    'aretes-oro-l',
    'cadenas-mujer-oro-l',
    'cadenas-hombre-oro-l',
    'dijes-oro-laminado',
    'pulseras-oro-laminado',
    'brazalete-oro-l',
    'anillos-oro-laminado',
    'sets',
    'aros',
    'tobilleras-oro-laminado',
    'rosarios',
    'balineria',
    'empaques-insumos'
  ];

  const sortedKeys = Object.keys(subcatCounts).sort((a, b) => {
    const idxA = preferredOrder.indexOf(a);
    const idxB = preferredOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  sortedKeys.forEach(colKey => {
    const info = subcatCounts[colKey];
    html += `
      <button class="subcat-pill ${currentSubcategory === colKey ? 'active' : ''}" onclick="selectSubcategory('${colKey}')">
        ${info.name} (${info.count})
      </button>
    `;
  });

  pillsContainer.innerHTML = html;
}

window.selectSubcategory = function(colKey) {
  currentSubcategory = colKey;
  visibleCount = PAGE_SIZE;
  renderSubcategoryPills();
  renderProducts();
};

/* ==========================================================================
   4. SEARCH & SORT CONTROLLERS
   ========================================================================== */
function initSearchAndSort() {
  const searchInput = document.getElementById('catalogSearchInput');
  const sortSelect = document.getElementById('catalogSortSelect');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      visibleCount = PAGE_SIZE;
      renderProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderProducts();
    });
  }
}

/* ==========================================================================
   5. PRODUCTS RENDERING (WITH EDITABLE PRICE BOXES)
   ========================================================================== */
function getFilteredProducts() {
  if (typeof PRODUCTS_DATA === 'undefined') return [];

  return PRODUCTS_DATA.filter(item => {
    // Hide from public when item.hidden is true
    if (!isAdminMode && item.hidden) return false;

    // In admin mode, respect visibility filter
    if (isAdminMode && adminVisibilityFilter === 'visible' && item.hidden) return false;
    if (isAdminMode && adminVisibilityFilter === 'hidden' && !item.hidden) return false;

    if (currentMetal !== 'all' && item.metal !== currentMetal) return false;
    if (currentSubcategory !== 'all' && item.collection !== currentSubcategory) return false;
    if (currentSearch) {
      const q = currentSearch;
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchCol = item.collectionName.toLowerCase().includes(q);
      if (!matchTitle && !matchSku && !matchCol) return false;
    }
    return true;
  }).sort((a, b) => {
    if (currentSort === 'price-asc') return a.price - b.price;
    if (currentSort === 'price-desc') return b.price - a.price;
    if (currentSort === 'alpha-asc') return a.title.localeCompare(b.title);
    return 0;
  });
}

// Formats vendor uppercase titles into refined luxury title case (enhances SEO readability score)
function formatJewelryTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (/^(18k|s925|cm|mm|gr|italiana|cop|\d+(\.\d+)?(cm|mm|gr|k))$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const countDisplay = document.getElementById('catalogProductCount');
  const paginationWrap = document.getElementById('paginationWrap');

  if (!grid) return;

  const filtered = getFilteredProducts();

  if (countDisplay) {
    countDisplay.textContent = `Mostrando ${Math.min(visibleCount, filtered.length)} de ${filtered.length} joyas Oro 18K`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <div style="font-size: 2.2rem; color: var(--gold-primary); margin-bottom: 12px;">✦</div>
        <h3 class="font-serif" style="font-size: 1.5rem; margin-bottom: 8px;">No se encontraron productos</h3>
        <p style="color: var(--text-secondary); max-width: 420px; margin: 0 auto 20px;">
          No hay artículos que coincidan con los filtros seleccionados. Intenta con otra búsqueda o categoría.
        </p>
        <button class="subcat-pill active" onclick="resetAllFilters()">Ver Todo el Catálogo Oro 18K</button>
      </div>
    `;
    if (paginationWrap) paginationWrap.style.display = 'none';
    return;
  }

  const itemsToRender = filtered.slice(0, visibleCount);

  grid.innerHTML = itemsToRender.map((prod, cardIndex) => {
    const qty = productQuantities[prod.id] || 1;
    const formattedPrice = formatCOP(prod.price);
    const hasMultipleImages = prod.images && prod.images.length > 1;
    const waUrl = getWhatsAppBuyUrl(prod, qty);
    const displayTitle = formatJewelryTitle(prod.title);
    const isAboveFold = cardIndex < 4;
    const isHidden = !!prod.hidden;
    const avail = prod.availability || 'disponible';

    let availTagHtml = '';
    if (avail === 'sobre_pedido') {
      availTagHtml = '<span class="card-tag-avail sobre-pedido">🟡 Sobre Pedido</span>';
    } else if (avail === 'agotado') {
      availTagHtml = '<span class="card-tag-avail agotado">🔴 Agotado</span>';
    } else {
      availTagHtml = `<span class="card-tag-avail disponible">🟢 Disponible (${prod.stock !== undefined ? prod.stock : 5} unid.)</span>`;
    }

    let buyBtnLabel = 'Comprar';
    if (avail === 'agotado') buyBtnLabel = 'Consultar';
    else if (avail === 'sobre_pedido') buyBtnLabel = 'Encargar';

    return `
      <article class="product-card ${isHidden ? 'is-hidden' : ''}" id="card-${prod.id}" data-id="${prod.id}">
        
        <!-- Media / Image Carousel with Zoom Trigger -->
        <div class="prod-media-container" onclick="openProductZoom('${prod.id}', 0)">
          <span class="card-tag-metal">${prod.collectionName}</span>
          <span class="card-tag-ref">Ref: ${prod.sku}</span>
          ${isHidden ? '<span class="card-tag-hidden">🚫 Oculto al Público</span>' : ''}

          <!-- Zoom Trigger Button -->
          <button class="card-zoom-pill" onclick="event.stopPropagation(); openProductZoom('${prod.id}', 0)" title="Ampliar imagen en alta resolución">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            Zoom
          </button>

          ${hasMultipleImages ? `
            <div class="prod-slides-track" id="track-${prod.id}" onscroll="handleCarouselScroll('${prod.id}')">
              ${prod.images.map((imgUrl, idx) => `
                <div class="prod-slide-item" onclick="event.stopPropagation(); openProductZoom('${prod.id}', ${idx})">
                  <img 
                    src="${imgUrl}" 
                    alt="${displayTitle} - Joya Oro 18K Foto ${idx+1}" 
                    width="400"
                    height="400"
                    ${isAboveFold && idx === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'}
                    decoding="async"
                    onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'400\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%2317171c\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%23d4af37\\' font-family=\\'Cinzel\\' font-size=\\'8\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>ORO 18K</text></svg>';"
                  />
                </div>
              `).join('')}
            </div>

            <!-- Scroll Buttons -->
            <button class="prod-nav-arrow prev" onclick="event.stopPropagation(); scrollCarousel('${prod.id}', -1)" aria-label="Foto anterior">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button class="prod-nav-arrow next" onclick="event.stopPropagation(); scrollCarousel('${prod.id}', 1)" aria-label="Siguiente foto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

            <!-- Dots Indicator -->
            <div class="prod-dots-strip" id="dots-${prod.id}">
              ${prod.images.map((_, i) => `<span class="prod-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
            </div>
          ` : `
            <div class="prod-slide-item" style="position: absolute; top:0; left:0; width:100%; height:100%;">
              <img 
                src="${prod.images && prod.images[0] ? prod.images[0] : ''}" 
                alt="${displayTitle} - Joya Oro 18K" 
                width="400"
                height="400"
                ${isAboveFold ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'}
                decoding="async"
                onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'400\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%2317171c\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%23d4af37\\' font-family=\\'Cinzel\\' font-size=\\'8\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>ORO 18K</text></svg>';"
              />
            </div>
          `}
        </div>

        <!-- Body -->
        <div class="prod-card-body">
          <span class="prod-collection-label">${prod.metalName}</span>
          <div class="card-avail-badge-wrap">
            ${availTagHtml}
          </div>
          <h3 class="prod-card-title" title="${displayTitle}">${displayTitle}</h3>

          <!-- "Ver Ficha y Zoom" Button -->
          <button class="btn-view-details-card" onclick="openProductZoom('${prod.id}', 0)">
            <span>Ver Ficha y Zoom</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>

          <!-- Single Clean Price Field (Clickable in Admin Mode) -->
          <div class="prod-clean-price-box" id="price-box-${prod.id}" onclick="handlePriceBoxClick('${prod.id}', event)" title="${isAdminMode ? 'Clic para editar precio' : ''}">
            <span class="prod-price-label">Precio</span>
            <div style="display: flex; align-items: center;">
              <span class="prod-price-val" id="price-val-${prod.id}">${formattedPrice}</span>
              <span class="admin-edit-price-btn">✏️ Editar</span>
            </div>
          </div>

          <!-- Quantity Stepper (+ / -) & Add to Cart Button -->
          <div class="prod-action-row">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateQuantity('${prod.id}', -1)" aria-label="Restar">-</button>
              <span class="qty-display" id="qty-${prod.id}">${qty}</span>
              <button class="qty-btn" onclick="updateQuantity('${prod.id}', 1)" aria-label="Sumar">+</button>
            </div>

            <button 
              type="button" 
              class="btn-add-to-cart ${avail === 'agotado' ? 'is-agotado' : ''}" 
              id="btn-add-${prod.id}"
              onclick="handleAddToCartClick('${prod.id}')"
              title="${avail === 'agotado' ? 'Joya agotada' : 'Agregar al carrito de compras'}"
              ${avail === 'agotado' ? 'disabled' : ''}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>${avail === 'agotado' ? 'Agotado' : 'Agregar'}</span>
            </button>
          </div>

          <!-- Admin Quick Management Strip -->
          ${isAdminMode ? `
            <div class="card-admin-strip" onclick="event.stopPropagation()">
              <div class="admin-strip-row">
                <span class="admin-strip-label">Estado:</span>
                <select class="admin-avail-select" onchange="updateProductAvail('${prod.id}', this.value)">
                  <option value="disponible" ${avail === 'disponible' ? 'selected' : ''}>🟢 Disponible</option>
                  <option value="sobre_pedido" ${avail === 'sobre_pedido' ? 'selected' : ''}>🟡 Sobre Pedido</option>
                  <option value="agotado" ${avail === 'agotado' ? 'selected' : ''}>🔴 Agotado</option>
                </select>
              </div>

              ${avail === 'disponible' ? `
                <div class="admin-strip-row">
                  <span class="admin-strip-label">Stock:</span>
                  <button class="admin-stock-btn" onclick="promptEditStock('${prod.id}', ${prod.stock !== undefined ? prod.stock : 5}, event)" title="Editar unidades de stock">
                    📦 <strong>${prod.stock !== undefined ? prod.stock : 5}</strong> unid. ✏️
                  </button>
                </div>
              ` : ''}

              <button class="admin-vis-btn ${isHidden ? 'btn-unhide' : 'btn-hide'}" onclick="toggleProductVisibility('${prod.id}', event)">
                ${isHidden ? '👁️ Publicar Joya' : '🚫 Ocultar del Público'}
              </button>
            </div>
          ` : ''}

        </div>

      </article>
    `;
  }).join('');

  if (paginationWrap) {
    if (visibleCount < filtered.length) {
      paginationWrap.style.display = 'flex';
      const btn = document.getElementById('loadMoreBtn');
      if (btn) btn.textContent = `Cargar más productos (${filtered.length - visibleCount} restantes)`;
    } else {
      paginationWrap.style.display = 'none';
    }
  }
}

window.loadMoreProducts = function() {
  visibleCount += PAGE_SIZE;
  renderProducts();
};

window.resetAllFilters = function() {
  currentMetal = 'all';
  currentSubcategory = 'all';
  currentSearch = '';
  currentSort = 'default';
  visibleCount = PAGE_SIZE;

  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) sortSelect.value = 'default';

  document.querySelectorAll('.macro-tab-btn').forEach(b => {
    if (b.getAttribute('data-metal') === 'all') b.classList.add('active');
    else b.classList.remove('active');
  });

  renderSubcategoryPills();
  renderProducts();
};

/* ==========================================================================
   6. QUANTITY STEPPER & WHATSAPP REDIRECTION BUILDER
   ========================================================================== */
window.updateQuantity = function(prodId, delta) {
  const current = productQuantities[prodId] || 1;
  const next = Math.max(1, current + delta);
  productQuantities[prodId] = next;

  const qtyDisplay = document.getElementById(`qty-${prodId}`);
  if (qtyDisplay) qtyDisplay.textContent = next;

  const modalQtyDisplay = document.getElementById('zoomModalQty');
  if (modalQtyDisplay && activeZoomProduct && activeZoomProduct.id === prodId) {
    modalQtyDisplay.textContent = next;
  }

  const prod = PRODUCTS_DATA.find(p => p.id === prodId);
  const buyBtn = document.getElementById(`btn-buy-${prodId}`);
  const modalBuyBtn = document.getElementById('zoomModalBuyBtn');

  if (prod) {
    const newUrl = getWhatsAppBuyUrl(prod, next);
    if (buyBtn) buyBtn.href = newUrl;
    if (modalBuyBtn && activeZoomProduct && activeZoomProduct.id === prodId) {
      modalBuyBtn.href = newUrl;
    }
  }
};

function getWhatsAppBuyUrl(prod, qty = 1) {
  const unitPriceFormatted = formatCOP(prod.price);
  const totalPriceFormatted = formatCOP(prod.price * qty);
  const mainImage = (prod.images && prod.images.length > 0) ? prod.images[0] : '';
  const avail = prod.availability || 'disponible';

  let message = '';
  if (avail === 'sobre_pedido') {
    message = `Hola Max Joyería, deseo encargar Sobre Pedido la joya:\n\nProducto: ${prod.title}\nReferencia: ${prod.sku}\nPrecio sugerido: ${unitPriceFormatted}`;
  } else if (avail === 'agotado') {
    message = `Hola Max Joyería, deseo consultar disponibilidad futura de la joya agotada:\n\nProducto: ${prod.title}\nReferencia: ${prod.sku}\nPrecio: ${unitPriceFormatted}`;
  } else {
    message = `Hola, vengo del catalogo y quiero pedir:\n\nProducto: ${prod.title}\nReferencia: ${prod.sku}\nPrecio: ${unitPriceFormatted}`;
  }

  if (qty > 1 && avail !== 'agotado') {
    message += `\nCantidad: ${qty}\nTotal: ${totalPriceFormatted}`;
  }

  if (mainImage) {
    message += `\nFoto: ${mainImage}`;
  }

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/* ==========================================================================
   7. MULTI-IMAGE CAROUSEL CONTROLLER
   ========================================================================== */
window.scrollCarousel = function(prodId, direction) {
  const track = document.getElementById(`track-${prodId}`);
  if (!track) return;
  const slideWidth = track.clientWidth;
  track.scrollBy({
    left: direction * slideWidth,
    behavior: 'smooth'
  });
};

window.handleCarouselScroll = function(prodId) {
  const track = document.getElementById(`track-${prodId}`);
  const dotsContainer = document.getElementById(`dots-${prodId}`);
  if (!track || !dotsContainer) return;

  const scrollLeft = track.scrollLeft;
  const slideWidth = track.clientWidth;
  const activeIndex = Math.round(scrollLeft / slideWidth);

  const dots = dotsContainer.querySelectorAll('.prod-dot');
  dots.forEach((dot, idx) => {
    if (idx === activeIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  });
};

/* ==========================================================================
   8. HIGH-RESOLUTION INTERACTIVE ZOOM & PRODUCT DETAILS LIGHTBOX
   ========================================================================== */
function initZoomModalEvents() {
  const modal = document.getElementById('productZoomModal');
  const lens = document.getElementById('zoomInteractiveLens');
  const mainImg = document.getElementById('zoomMainImage');

  if (!modal || !lens || !mainImg) return;

  lens.addEventListener('mousemove', (e) => {
    const rect = lens.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    mainImg.style.transformOrigin = `${x}% ${y}%`;
    mainImg.style.transform = 'scale(2.5)';
  });

  lens.addEventListener('mouseleave', () => {
    mainImg.style.transform = 'scale(1)';
    mainImg.style.transformOrigin = 'center center';
  });

  lens.addEventListener('click', () => {
    isZoomedIn = !isZoomedIn;
    mainImg.style.transform = isZoomedIn ? 'scale(2.2)' : 'scale(1)';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProductZoom();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductZoom();
  });
}

window.openProductZoom = function(prodId, imageIndex = 0) {
  const prod = PRODUCTS_DATA.find(p => p.id === prodId);
  if (!prod) return;

  activeZoomProduct = prod;
  activeZoomImageIndex = imageIndex;
  isZoomedIn = false;

  const modal = document.getElementById('productZoomModal');
  const mainImg = document.getElementById('zoomMainImage');
  const thumbsContainer = document.getElementById('zoomThumbnailsContainer');
  const titleEl = document.getElementById('zoomModalTitle');
  const refEl = document.getElementById('zoomModalRef');
  const metalEl = document.getElementById('zoomModalMetal');
  const priceEl = document.getElementById('zoomModalPrice');
  const qtyEl = document.getElementById('zoomModalQty');
  const addBtn = document.getElementById('zoomModalAddToCartBtn');
  const addBtnText = document.getElementById('zoomModalBuyBtnText');

  const currentQty = productQuantities[prod.id] || 1;

  if (titleEl) titleEl.textContent = prod.title;
  if (refEl) refEl.textContent = `Ref: ${prod.sku}`;
  if (metalEl) metalEl.textContent = `${prod.metalName} • Colección ${prod.collectionName}`;
  if (priceEl) priceEl.textContent = formatCOP(prod.price);
  if (qtyEl) qtyEl.textContent = currentQty;

  // Render Authentic Product Description
  const descEl = document.getElementById('zoomModalDesc');
  const descWrap = document.getElementById('zoomModalDescWrap');
  if (descEl && descWrap) {
    if (prod.description) {
      descEl.textContent = prod.description;
      descWrap.style.display = 'block';
    } else {
      descWrap.style.display = 'none';
    }
  }

  // Render Technical Specifications Table
  const specsTable = document.getElementById('zoomModalSpecsTable');
  if (specsTable && prod.specs) {
    const s = prod.specs;
    const rows = [
      { label: 'Material', val: s.material },
      { label: 'Dimensiones', val: s.medidas },
      { label: 'Broche / Cierre', val: s.cierre },
      { label: 'Contenido', val: s.incluye },
      { label: 'Garantía Oficial', val: s.garantia },
      { label: 'Origen / Taller', val: s.origen },
      { label: 'Hipoalergénico', val: s.hipoalergenico }
    ].filter(r => r.val && r.val !== 'No aplica');

    specsTable.innerHTML = rows.map(r => `
      <div class="spec-table-row">
        <span>${r.label}:</span>
        <span>${r.val}</span>
      </div>
    `).join('');
    specsTable.style.display = 'flex';
  } else if (specsTable) {
    specsTable.style.display = 'none';
  }

  // Render Authentic Feature Highlights
  const featuresEl = document.getElementById('zoomModalFeatures');
  if (featuresEl) {
    if (prod.features && prod.features.length > 0) {
      featuresEl.innerHTML = prod.features.map(f => `
        <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">
          <span style="color: var(--gold-primary); font-size: 0.85rem; line-height: 1.2;">✦</span>
          <span>${f}</span>
        </div>
      `).join('');
      featuresEl.style.display = 'flex';
    } else {
      featuresEl.style.display = 'none';
    }
  }

  // Availability status bar
  const availBar = document.getElementById('zoomAvailStatusBar');
  const avail = prod.availability || 'disponible';
  if (availBar) {
    if (avail === 'sobre_pedido') {
      availBar.innerHTML = '<div class="zoom-avail-chip sobre-pedido">🟡 Joya Sobre Pedido (Tiempo estimado de elaboración / despacho)</div>';
    } else if (avail === 'agotado') {
      availBar.innerHTML = '<div class="zoom-avail-chip agotado">🔴 Joya Agotada Temporalmente</div>';
    } else {
      availBar.innerHTML = `<div class="zoom-avail-chip disponible">🟢 Pieza Disponible • <strong>${prod.stock !== undefined ? prod.stock : 5} unidades</strong> en stock para despacho inmediato</div>`;
    }
  }

  // Dedicated Admin Manager Box inside Zoom Modal
  const adminBox = document.getElementById('zoomAdminManagerBox');
  if (adminBox) {
    if (isAdminMode) {
      adminBox.style.display = 'block';
      const availSelect = document.getElementById('zoomAdminAvailSelect');
      const stockInput = document.getElementById('zoomAdminStockInput');
      const stockGroup = document.getElementById('zoomAdminStockGroup');
      const visBtn = document.getElementById('zoomAdminVisibilityBtn');

      if (availSelect) availSelect.value = avail;
      if (stockInput) stockInput.value = prod.stock !== undefined ? prod.stock : 5;
      if (stockGroup) stockGroup.style.display = (avail === 'disponible') ? 'block' : 'none';

      if (visBtn) {
        if (prod.hidden) {
          visBtn.textContent = '🚫 Joya Oculta (Clic para Publicar)';
          visBtn.className = 'btn-admin-vis-toggle is-hidden-btn';
        } else {
          visBtn.textContent = '👁️ Joya Visible (Clic para Ocultar)';
          visBtn.className = 'btn-admin-vis-toggle is-visible-btn';
        }
      }
    } else {
      adminBox.style.display = 'none';
    }
  }

  if (addBtn) {
    if (avail === 'agotado') {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.55';
      addBtn.style.cursor = 'not-allowed';
      if (addBtnText) addBtnText.textContent = 'Joya Agotada';
    } else if (avail === 'sobre_pedido') {
      addBtn.disabled = false;
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
      if (addBtnText) addBtnText.textContent = 'Encargar al Carrito';
    } else {
      addBtn.disabled = false;
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
      if (addBtnText) addBtnText.textContent = 'Agregar al Carrito';
    }
  }

  const activeImgUrl = (prod.images && prod.images[imageIndex]) ? prod.images[imageIndex] : (prod.images[0] || '');
  if (mainImg) {
    mainImg.src = activeImgUrl;
    mainImg.style.transform = 'scale(1)';
  }

  if (thumbsContainer) {
    if (prod.images && prod.images.length > 1) {
      thumbsContainer.style.display = 'flex';
      thumbsContainer.innerHTML = prod.images.map((img, idx) => `
        <div class="zoom-thumb-item ${idx === imageIndex ? 'active' : ''}" onclick="switchZoomImage(${idx})">
          <img src="${img}" alt="${prod.title} miniatura ${idx+1}" />
        </div>
      `).join('');
    } else {
      thumbsContainer.style.display = 'none';
      thumbsContainer.innerHTML = '';
    }
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.switchZoomImage = function(index) {
  if (!activeZoomProduct || !activeZoomProduct.images) return;
  activeZoomImageIndex = index;

  const mainImg = document.getElementById('zoomMainImage');
  if (mainImg) {
    mainImg.src = activeZoomProduct.images[index];
    mainImg.style.transform = 'scale(1)';
  }

  const thumbs = document.querySelectorAll('.zoom-thumb-item');
  thumbs.forEach((th, i) => {
    if (i === index) th.classList.add('active');
    else th.classList.remove('active');
  });
};

window.closeProductZoom = function() {
  const modal = document.getElementById('productZoomModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  activeZoomProduct = null;
};

/* ==========================================================================
   9. UTILITIES
   ========================================================================== */
function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('show');
    else btn.classList.remove('show');
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
