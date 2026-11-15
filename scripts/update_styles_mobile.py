with open('css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the beginning of @media (max-width: 639px)
target_start = '@media (max-width: 639px) {'
idx_media = css.find(target_start)

if idx_media != -1:
    # Find the end of the header styling within this media query
    # It starts at target_start and goes to /* Catalog Top Centered Zone */ or .catalog-hero-top
    idx_hero = css.find('/* Catalog Top Centered Zone */', idx_media)
    if idx_hero == -1:
        idx_hero = css.find('.catalog-hero-top', idx_media)
    
    if idx_hero != -1:
        old_block = css[idx_media:idx_hero]
        
        new_block = '''/* Announcement Bar - Mobile */
@media (max-width: 768px) {
  .announcement-bar {
    padding: 6px 0;
    font-size: 0.68rem;
    min-height: 32px;
  }

  .announcement-bar .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-left: 10px;
    padding-right: 10px;
  }

  .announcement-msg {
    gap: 6px;
    font-size: 0.68rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .announcement-desktop-only {
    display: none !important;
  }

  .announcement-links {
    gap: 6px;
    flex-shrink: 0;
  }

  .admin-trigger-btn {
    padding: 3px 8px;
    font-size: 0.66rem;
    gap: 4px;
    white-space: nowrap;
  }
}

@media (max-width: 639px) {
  .container {
    padding-left: 10px;
    padding-right: 10px;
  }
  
  .site-header {
    padding: 0;
    background: var(--bg-surface);
  }

  .header-inner {
    height: 58px;
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  /* Brand Link: Logo + Name Always Fully Visible and Centered Vertically */
  .brand-link {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    min-width: 0;
    text-decoration: none;
  }

  .brand-logo-img {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(184, 138, 68, 0.25);
  }

  .brand-text-wrap {
    display: flex;
    flex-direction: column;
    justify-content: center;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .brand-title {
    font-size: 1.02rem;
    letter-spacing: 0.08em;
    line-height: 1.1;
    white-space: nowrap;
  }

  .brand-subtitle {
    font-size: 0.50rem;
    letter-spacing: 0.12em;
    line-height: 1.2;
    white-space: nowrap;
  }

  /* Header Actions on Mobile: Clean Row Without Overflow */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  /* Theme Toggle: Compact Circular Icon Button */
  .theme-toggle-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
  }

  .theme-toggle-btn #themeLabel {
    display: none !important;
  }

  /* Header Cart: Compact Icon + Badge */
  .btn-cart-header {
    height: 34px;
    padding: 0 8px;
    gap: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
  }

  .btn-cart-header .cart-header-text {
    display: none !important;
  }

  .btn-cart-header .cart-badge {
    position: static;
    font-size: 0.68rem;
    padding: 1px 5px;
    min-width: 17px;
    height: 17px;
    line-height: 15px;
  }

  /* WhatsApp "Quiero Emprender" Button on Mobile */
  .btn-whatsapp-header {
    height: 34px;
    padding: 0 11px;
    font-size: 0.72rem;
    gap: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  '''
        css = css[:idx_media] + new_block + css[idx_hero:]
        print("Updated mobile header CSS in styles.css")

# Append extra-small screen media query at the end
extra_small_css = '''
/* ==========================================================================
   EXTRA SMALL MOBILE SCREENS (< 380px, e.g. iPhone SE, compact Androids)
   ========================================================================== */
@media (max-width: 380px) {
  .header-inner {
    height: 56px;
    gap: 4px;
  }

  .brand-logo-img {
    width: 38px;
    height: 38px;
    min-width: 38px;
  }

  .brand-title {
    font-size: 0.94rem;
    letter-spacing: 0.05em;
  }

  .brand-subtitle {
    font-size: 0.45rem;
    letter-spacing: 0.06em;
  }

  .header-actions {
    gap: 4px;
  }

  .theme-toggle-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }

  .btn-cart-header {
    height: 32px;
    padding: 0 6px;
  }

  .btn-whatsapp-header {
    height: 32px;
    padding: 0 8px;
    font-size: 0.68rem;
    gap: 4px;
  }
}
'''

if '@media (max-width: 380px)' not in css:
    css = css + '\n' + extra_small_css
    print("Added @media (max-width: 380px) to styles.css")

with open('css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated css/styles.css successfully")
