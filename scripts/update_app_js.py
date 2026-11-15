import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove DEFAULT_ADMIN_HASH
text = re.sub(r'const DEFAULT_ADMIN_HASH = [^\n]+;\n?', '', text)

# 2. Locate the block between initAdminMode and enableAdminMode
start_marker = 'let otpExpiresAt = 0;'
if start_marker not in text:
    start_marker = 'let currentDevOtp'

end_marker = 'function enableAdminMode(showToast = true)'

idx_start = text.find('/* ==========================================================================\n   2. ADMIN MODE CONTROLLER')
if idx_start == -1:
    idx_start = text.find('/* ==========================================================================\r\n   2. ADMIN MODE CONTROLLER')
if idx_start == -1:
    idx_start = text.find('function initAdminMode()')

idx_end = text.find(end_marker)

print('idx_start:', idx_start, 'idx_end:', idx_end)

new_admin_block = '''/* ==========================================================================
   2. ADMIN MODE CONTROLLER (STRICT OTP-ONLY VIA maxjoyeria1@gmail.com)
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
const ADMIN_AUTHORIZED_EMAIL = 'maxjoyeria1@gmail.com';

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
  const otpInput = document.getElementById('adminOtpInput');
  const otpError = document.getElementById('adminOtpError');

  if (otpError) otpError.style.display = 'none';
  if (otpInput) otpInput.value = '';

  // Check if there is an active OTP pending in session
  const storedOtpRaw = sessionStorage.getItem('max_admin_active_otp');
  let hasValidActiveOtp = false;
  if (storedOtpRaw) {
    try {
      const stored = JSON.parse(storedOtpRaw);
      if (stored.expiresAt && Date.now() < stored.expiresAt) {
        hasValidActiveOtp = true;
        otpExpiresAt = stored.expiresAt;
      }
    } catch (e) {}
  }

  if (hasValidActiveOtp) {
    if (stepRequest) stepRequest.style.display = 'none';
    if (stepVerify) stepVerify.style.display = 'block';
    startOtpTimer();
  } else {
    if (stepRequest) stepRequest.style.display = 'block';
    if (stepVerify) stepVerify.style.display = 'none';
  }

  if (modal) {
    modal.classList.add('active');
    if (hasValidActiveOtp && otpInput) setTimeout(() => otpInput.focus(), 150);
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
  const otpInput = document.getElementById('adminOtpInput');
  const errorEl = document.getElementById('adminOtpError');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Enviando clave a maxjoyeria1@gmail.com...';
  if (errorEl) errorEl.style.display = 'none';

  // 1. Generate 6-digit random code
  const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // 2. Persist in sessionStorage
  const otpData = {
    code: generatedCode,
    expiresAt: expiresAt,
    attempts: 0
  };
  sessionStorage.setItem('max_admin_active_otp', JSON.stringify(otpData));
  otpExpiresAt = expiresAt;

  // 3. Dispatch to maxjoyeria1@gmail.com via FormSubmit AJAX
  try {
    fetch('https://formsubmit.co/ajax/maxjoyeria1@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        _subject: `🔐 Clave de Acceso Administrador Max Joyería: ${generatedCode}`,
        email: ADMIN_AUTHORIZED_EMAIL,
        _template: 'box',
        'Codigo_de_Seguridad': generatedCode,
        'Validez': '10 Minutos',
        'Fecha_Hora': new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        'Instrucciones': `Tu código exclusivo de acceso al panel administrador de Max Joyería es: ${generatedCode}. Ingresa este código en el sitio web para autenticarte. Es válido por 10 minutos.`
      })
    }).catch(e => console.warn('FormSubmit dispatch status', e));
  } catch (e) {}

  // 4. Also notify local backend server if active
  try {
    fetch('/api/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
  } catch (e) {}

  // 5. Update UI to Step 2
  setTimeout(() => {
    if (stepRequest) stepRequest.style.display = 'none';
    if (stepVerify) stepVerify.style.display = 'block';
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Enviar Clave a mi Correo';

    startOtpTimer();
    showAdminToast('✉️ Clave enviada a maxjoyeria1@gmail.com. Revisa tu bandeja de entrada o spam.');
    if (otpInput) {
      otpInput.value = '';
      setTimeout(() => otpInput.focus(), 150);
    }
  }, 400);
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
  const code = (input ? input.value : '').trim().replace(/\\s+/g, '');

  if (!code || code.length !== 6) {
    if (errorMsg) {
      errorMsg.textContent = 'Por favor ingresa los 6 dígitos de la clave recibida en tu correo.';
      errorMsg.style.display = 'block';
    }
    if (input) input.focus();
    return;
  }

  // Retrieve pending OTP
  const rawOtp = sessionStorage.getItem('max_admin_active_otp');
  let otpData = null;
  try {
    otpData = rawOtp ? JSON.parse(rawOtp) : null;
  } catch (e) {}

  if (!otpData || !otpData.code) {
    if (errorMsg) {
      errorMsg.textContent = 'No hay ninguna clave activa. Haz clic en "Reenviar clave" para recibir una nueva.';
      errorMsg.style.display = 'block';
    }
    return;
  }

  if (Date.now() > otpData.expiresAt) {
    if (errorMsg) {
      errorMsg.textContent = 'Esta clave ha expirado (límite 10 minutos). Haz clic en "Reenviar clave".';
      errorMsg.style.display = 'block';
    }
    return;
  }

  // Increment attempts counter
  otpData.attempts = (otpData.attempts || 0) + 1;
  if (otpData.attempts > 5) {
    sessionStorage.removeItem('max_admin_active_otp');
    if (errorMsg) {
      errorMsg.textContent = 'Demasiados intentos fallidos. Por seguridad, solicita una nueva clave.';
      errorMsg.style.display = 'block';
    }
    return;
  }
  sessionStorage.setItem('max_admin_active_otp', JSON.stringify(otpData));

  // Verify code
  if (code === otpData.code) {
    if (btn) btn.disabled = true;
    sessionStorage.removeItem('max_admin_active_otp');
    sessionStorage.setItem('max_joyeria_admin', 'true');
    sessionStorage.setItem('max_joyeria_admin_token', 'token_otp_' + Date.now());

    // Also notify local server if available
    try {
      fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      }).then(r => r.json()).then(data => {
        if (data && data.token) {
          sessionStorage.setItem('max_joyeria_admin_token', data.token);
        }
      }).catch(() => {});
    } catch (e) {}

    closeAdminModal();
    enableAdminMode(true);
    showAdminToast('🔓 Acceso Autorizado. Modo Administrador Activo.');
    if (btn) btn.disabled = false;
  } else {
    if (errorMsg) {
      errorMsg.textContent = `Código incorrecto. Revisa el correo enviado a maxjoyeria1@gmail.com (Intento ${otpData.attempts} de 5).`;
      errorMsg.style.display = 'block';
    }
    if (input) {
      input.select();
      input.focus();
    }
  }
};

window.submitAdminLogin = window.submitAdminOtp;

'''

text = text[:idx_start] + new_admin_block + text[idx_end:]

# 3. Clean up change password functions later in text if present
text = re.sub(r'/\* Change Password Modal \*/[\s\S]*?function showAdminToast\(', 'function showAdminToast(', text)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated js/app.js successfully')
