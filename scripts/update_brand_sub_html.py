with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = '''          <!-- Official Logo & Title -->
          <a href="#catalogo" class="brand-link" title="Max Joyería - Inicio">
            <img src="assets/logo.png" alt="Logo Oficial Max Joyería" class="brand-logo-img" width="58" height="58" loading="eager" decoding="async" />
            <div class="brand-text-wrap">
              <span class="brand-title">MAX JOYERÍA</span>
              <span class="brand-subtitle">ORO 18K Y ORO LAMINADO</span>
            </div>
          </a>'''

replacement = '''          <!-- Official Logo & Title -->
          <a href="#catalogo" class="brand-link" title="Max Joyería - Inicio">
            <img src="assets/logo.png" alt="Logo Oficial Max Joyería" class="brand-logo-img" width="58" height="58" loading="eager" decoding="async" />
            <div class="brand-text-wrap">
              <span class="brand-title">MAX JOYERÍA</span>
              <span class="brand-subtitle">
                <span class="brand-sub-desktop">ORO 18K Y ORO LAMINADO</span>
                <span class="brand-sub-mobile">ORO 18K</span>
              </span>
            </div>
          </a>'''

if target in html:
    html = html.replace(target, replacement)
    print("Replaced brand subtitle in index.html")
else:
    print("Target not found, checking with normalize...")
    idx = html.find('ORO 18K Y ORO LAMINADO')
    if idx != -1:
        start_sub = html.rfind('<span class="brand-subtitle">', 0, idx)
        end_sub = html.find('</span>', idx) + 7
        html = html[:start_sub] + '''<span class="brand-subtitle">
                <span class="brand-sub-desktop">ORO 18K Y ORO LAMINADO</span>
                <span class="brand-sub-mobile">ORO 18K</span>
              </span>''' + html[end_sub:]
        print("Replaced via boundary slice")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html successfully")
