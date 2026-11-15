with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_announcement = '''    <!-- 1. Announcement Bar -->
    <aside class="announcement-bar">
      <div class="container">
        <div class="announcement-msg">
          <span class="highlight">🚚 ENVÍOS MISMO DÍA</span>
          <span>•</span>
          <span>MAX JOYERÍA • GARANTÍA 1 AÑO CERTIFICADA</span>
          <span>•</span>
          <span class="highlight">PEDIDOS DIRECTOS POR WHATSAPP</span>
        </div>
        <div class="announcement-links">
          <button onclick="toggleAdminModal()" class="admin-trigger-btn" title="Ingreso Administrador para cambiar precios (Ctrl+Shift+A)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Admin Precios</span>
          </button>

          <a href="https://wa.me/573188178457" target="_blank" rel="noopener" class="announcement-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            Línea Directa: 318 817 8457
          </a>
        </div>
      </div>
    </aside>'''

new_announcement = '''    <!-- 1. Announcement Bar -->
    <aside class="announcement-bar">
      <div class="container">
        <div class="announcement-msg">
          <span class="highlight">🚚 ENVÍOS MISMO DÍA</span>
          <span>•</span>
          <span>GARANTÍA 1 AÑO CERTIFICADA</span>
          <span class="announcement-desktop-only">•</span>
          <span class="highlight announcement-desktop-only">PEDIDOS DIRECTOS POR WHATSAPP</span>
        </div>
        <div class="announcement-links">
          <button onclick="toggleAdminModal()" class="admin-trigger-btn" title="Ingreso Administrador para cambiar precios (Ctrl+Shift+A)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Admin Precios</span>
          </button>

          <a href="https://wa.me/573188178457" target="_blank" rel="noopener" class="announcement-link announcement-desktop-only">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            Línea Directa: 318 817 8457
          </a>
        </div>
      </div>
    </aside>'''

if old_announcement in html:
    html = html.replace(old_announcement, new_announcement)
    print("Replaced announcement in index.html (exact match)")
else:
    # Try with normalized newlines
    old_norm = '\n'.join([line.strip() for line in old_announcement.splitlines() if line.strip()])
    print("Exact match not found, checking lines...")
    idx_bar = html.find('class="announcement-bar"')
    idx_header = html.find('<header class="site-header"')
    if idx_bar != -1 and idx_header != -1:
        # replace from <aside to </aside>
        start_aside = html.rfind('<aside', 0, idx_bar)
        end_aside = html.find('</aside>', idx_bar) + 8
        html = html[:start_aside] + new_announcement.strip() + html[end_aside:]
        print("Replaced announcement in index.html via boundary slice")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html successfully")
