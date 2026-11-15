with open('css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace master responsive block at the end
idx_master = css.find('/* ==========================================================================\n   MASTER RESPONSIVE MOBILE NAVIGATION')
if idx_master == -1:
    idx_master = css.find('/* ==========================================================================\r\n   MASTER RESPONSIVE MOBILE NAVIGATION')

if idx_master != -1:
    css = css[:idx_master].rstrip()

new_master_block = '''

/* ==========================================================================
   MASTER RESPONSIVE MOBILE NAVIGATION & HEADER CONTROLS
   ========================================================================== */

/* Brand Subtitle Desktop vs Mobile Switching */
.brand-sub-desktop {
  display: inline;
}
.brand-sub-mobile {
  display: none;
}

@media (max-width: 768px) {
  /* 1. Announcement Bar: Slim, single-line, luxury black & gold bar */
  .announcement-bar {
    padding: 6px 0 !important;
    min-height: 32px !important;
    height: auto !important;
    background-color: #0b0b0d !important;
  }

  .announcement-bar .container {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
    gap: 8px !important;
  }

  .announcement-msg {
    font-size: 0.68rem !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    gap: 6px !important;
  }

  .announcement-desktop-only {
    display: none !important;
  }

  .announcement-links {
    gap: 6px !important;
    flex-shrink: 0 !important;
  }

  .admin-trigger-btn {
    padding: 3px 8px !important;
    font-size: 0.66rem !important;
    gap: 4px !important;
    white-space: nowrap !important;
  }
}

@media (max-width: 639px) {
  .brand-sub-desktop {
    display: none !important;
  }
  .brand-sub-mobile {
    display: inline !important;
  }

  /* 2. Site Header & Inner Container */
  .site-header {
    background: var(--bg-surface) !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .header-inner {
    height: 58px !important;
    min-height: 58px !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 6px !important;
    overflow: hidden !important;
  }

  /* 3. Brand Link: Logo image + brand title & subtitle are ALWAYS 100% visible */
  .brand-link {
    display: inline-flex !important;
    align-items: center !important;
    gap: 7px !important;
    flex-shrink: 0 !important;
    min-width: 0 !important;
    text-decoration: none !important;
  }

  .brand-logo-img {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    border-radius: 50% !important;
    object-fit: cover !important;
    flex-shrink: 0 !important;
    border: 1.5px solid var(--gold-primary) !important;
    box-shadow: 0 2px 8px rgba(184, 138, 68, 0.25) !important;
  }

  .brand-text-wrap {
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  .brand-title {
    font-size: 1.0rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.06em !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    color: var(--text-primary) !important;
  }

  .brand-subtitle {
    font-size: 0.50rem !important;
    letter-spacing: 0.12em !important;
    line-height: 1.2 !important;
    white-space: nowrap !important;
    color: var(--gold-primary) !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
  }

  /* 4. Header Actions: Sleek, compact, zero horizontal overflow */
  .header-actions {
    display: flex !important;
    align-items: center !important;
    gap: 5px !important;
    flex-shrink: 0 !important;
  }

  /* Theme Toggle: Compact 34px icon circle */
  .theme-toggle-btn {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    flex-shrink: 0 !important;
  }

  .theme-toggle-btn #themeLabel {
    display: none !important;
  }

  /* Header Cart: Compact 34px icon + badge pill */
  .btn-cart-header {
    height: 34px !important;
    padding: 0 7px !important;
    gap: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: var(--radius-full) !important;
    flex-shrink: 0 !important;
    background: var(--bg-surface) !important;
    border: 1px solid var(--border-medium) !important;
  }

  .btn-cart-header .cart-header-text {
    display: none !important;
  }

  .btn-cart-header .cart-badge {
    position: static !important;
    font-size: 0.68rem !important;
    padding: 1px 5px !important;
    min-width: 17px !important;
    height: 17px !important;
    line-height: 15px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 10px !important;
  }

  /* WhatsApp "Quiero Emprender": High-converting luxury pill */
  .btn-whatsapp-header {
    height: 34px !important;
    padding: 0 9px !important;
    font-size: 0.70rem !important;
    font-weight: 700 !important;
    gap: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
    border-radius: var(--radius-full) !important;
    flex-shrink: 0 !important;
  }
}

/* Extra small mobile screens (<= 375px, e.g. iPhone SE, 360px Androids) */
@media (max-width: 375px) {
  .header-inner {
    height: 56px !important;
    min-height: 56px !important;
    gap: 4px !important;
  }

  .brand-logo-img {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
  }

  .brand-title {
    font-size: 0.90rem !important;
    letter-spacing: 0.04em !important;
  }

  .brand-subtitle {
    font-size: 0.44rem !important;
    letter-spacing: 0.06em !important;
  }

  .header-actions {
    gap: 3px !important;
  }

  .theme-toggle-btn {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
  }

  .btn-cart-header {
    height: 30px !important;
    padding: 0 5px !important;
  }

  .btn-whatsapp-header {
    height: 30px !important;
    padding: 0 7px !important;
    font-size: 0.66rem !important;
    gap: 3px !important;
  }
}
'''

css = css + new_master_block

with open('css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated css/styles.css with final responsive rules")
