with open('css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove any existing extra small query at the end if present
idx_extra = css.find('/* ==========================================================================\n   EXTRA SMALL MOBILE SCREENS')
if idx_extra == -1:
    idx_extra = css.find('/* ==========================================================================\r\n   EXTRA SMALL MOBILE SCREENS')
if idx_extra != -1:
    css = css[:idx_extra].rstrip()

master_block = '''

/* ==========================================================================
   MASTER RESPONSIVE MOBILE NAVIGATION & HEADER CONTROLS (<= 768px)
   ========================================================================== */

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
  /* 2. Site Header & Inner Container */
  .site-header {
    background: var(--bg-surface) !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  .header-inner {
    height: 60px !important;
    min-height: 60px !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    overflow: visible !important;
  }

  /* 3. Brand Link: Logo image + brand title & subtitle are ALWAYS 100% visible */
  .brand-link {
    display: inline-flex !important;
    align-items: center !important;
    gap: 8px !important;
    flex-shrink: 0 !important;
    min-width: 0 !important;
    text-decoration: none !important;
  }

  .brand-logo-img {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
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
    font-size: 1.02rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    color: var(--text-primary) !important;
  }

  .brand-subtitle {
    font-size: 0.48rem !important;
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
    gap: 6px !important;
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
    padding: 0 8px !important;
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
    padding: 0 10px !important;
    font-size: 0.72rem !important;
    font-weight: 700 !important;
    gap: 5px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
    border-radius: var(--radius-full) !important;
    flex-shrink: 0 !important;
  }
}

/* Extra small mobile screens (<= 380px, e.g. iPhone SE, 360px Androids) */
@media (max-width: 380px) {
  .header-inner {
    height: 56px !important;
    min-height: 56px !important;
    gap: 4px !important;
  }

  .brand-logo-img {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
  }

  .brand-title {
    font-size: 0.92rem !important;
    letter-spacing: 0.05em !important;
  }

  .brand-subtitle {
    font-size: 0.44rem !important;
    letter-spacing: 0.06em !important;
  }

  .header-actions {
    gap: 4px !important;
  }

  .theme-toggle-btn {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
  }

  .btn-cart-header {
    height: 32px !important;
    padding: 0 6px !important;
  }

  .btn-whatsapp-header {
    height: 32px !important;
    padding: 0 8px !important;
    font-size: 0.68rem !important;
    gap: 4px !important;
  }
}
'''

css = css + master_block

with open('css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Applied master responsive mobile header styles to styles.css")
