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

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAdminMode();
  initCatalogFilters();
  initSearchAndSort();
  renderProducts();
  initBackToTop();
  initZoomModalEvents();
});

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

window.toggleAdminModal = function() {
  if (isAdminMode) {
    if (confirm('¿Deseas cerrar el modo administrador?')) {
      disableAdminMode();
    }
    return;
  }
  const modal = document.getElementById('adminLoginModal');
  const stepRequest = document.getElementById('otpStepRequest');
  const stepVerify = document.getElementById('otpStepVerify');
  const otpError = document.getElementById('adminOtpError');
  const devBanner = document.getElementById('otpDevBanner');

  if (otpError) otpError.style.display = 'none';
  if (devBanner) devBanner.style.display = 'none';
  if (stepRequest) stepRequest.style.display = 'block';
  if (stepVerify) stepVerify.style.display = 'none';

  if (modal) {
    modal.classList.add('active');
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

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Enviando clave...';
  if (errorEl) errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
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
      alert(data.error || 'No se pudo enviar el código. Intenta nuevamente.');
    }
  } catch (err) {
    alert('Error al conectar con el servidor. Verifica que el servidor local esté activo.');
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
      errorMsg.textContent = 'Error al verificar con el servidor.';
      errorMsg.style.display = 'block';
    }
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

  // Optimistic UI update
  prod.price = newPrice;
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
      if (err) {
        err.textContent = data.error || 'Error al cambiar la clave.';
        err.style.display = 'block';
      }
    }
  } catch (e) {
    if (err) {
      err.textContent = 'Error de conexión con el servidor.';
      err.style.display = 'block';
    }
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
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Error al guardar en servidor:', err);
  }
}

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
          ${availTagHtml}

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

          <!-- Quantity Stepper (+ / -) & Comprar Button -->
          <div class="prod-action-row">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateQuantity('${prod.id}', -1)" aria-label="Restar">-</button>
              <span class="qty-display" id="qty-${prod.id}">${qty}</span>
              <button class="qty-btn" onclick="updateQuantity('${prod.id}', 1)" aria-label="Sumar">+</button>
            </div>

            <a 
              href="${waUrl}" 
              target="_blank" 
              rel="noopener" 
              class="btn-buy-whatsapp" 
              id="btn-buy-${prod.id}"
              title="Pedir este producto por WhatsApp"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <span>${buyBtnLabel}</span>
            </a>
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
  const buyBtn = document.getElementById('zoomModalBuyBtn');

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

  if (buyBtn) {
    buyBtn.href = getWhatsAppBuyUrl(prod, currentQty);
    if (avail === 'agotado') {
      buyBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span>Consultar Disponibilidad</span>
      `;
    } else if (avail === 'sobre_pedido') {
      buyBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span>Encargar Sobre Pedido</span>
      `;
    } else {
      buyBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        <span>Comprar por WhatsApp</span>
      `;
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
