with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = '<span class="btn-whatsapp-text">Quiero Emprender</span>'
if target not in html:
    target = '<span>Quiero Emprender</span>'

replacement = '''<span class="btn-emprender-text">
                <span class="btn-emprender-desktop">Quiero Emprender</span>
                <span class="btn-emprender-mobile">Emprender</span>
              </span>'''

if target in html:
    html = html.replace(target, replacement)
    print("Replaced Quiero Emprender with responsive span in index.html")
else:
    print("Could not find target, searching...")
    idx = html.find('Quiero Emprender')
    if idx != -1:
        start_span = html.rfind('<span', 0, idx)
        end_span = html.find('</span>', idx) + 7
        html = html[:start_span] + replacement + html[end_span:]
        print("Replaced via index search")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html")
