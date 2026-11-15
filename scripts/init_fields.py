import json, re

with open('data/products.js', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'const PRODUCTS_DATA\s*=\s*(\[[\s\S]*?\]);', content)
if not match:
    print('Error: Pattern not found')
    exit(1)

products = json.loads(match.group(1))
for p in products:
    if 'availability' not in p:
        p['availability'] = 'disponible'
    if 'stock' not in p:
        p['stock'] = 5
    if 'hidden' not in p:
        p['hidden'] = False

with open('data/products.js', 'w', encoding='utf-8') as f:
    f.write('// Auto-generated catalogue database with 407 products from orolaminado18.com\n')
    f.write('// Enriched with real authentic descriptions, features, and technical specifications\n')
    f.write('const PRODUCTS_DATA = ')
    json.dump(products, f, ensure_ascii=False, indent=2)
    f.write(';\n\nif (typeof module !== "undefined" && module.exports) {\n  module.exports = { PRODUCTS_DATA };\n}\n')

print(f'Successfully initialized {len(products)} products with availability, stock and hidden fields.')
