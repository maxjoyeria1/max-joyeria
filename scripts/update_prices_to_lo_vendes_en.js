const fs = require('fs');
const path = require('path');

async function updatePricesToLoVendesEn() {
  const filePath = path.join(__dirname, '..', 'data', 'products.js');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const jsonMatch = fileContent.match(/const PRODUCTS_DATA = (\[[\s\S]*?\]);/);
  if (!jsonMatch) {
    console.error('Could not match PRODUCTS_DATA');
    process.exit(1);
  }
  const localProducts = JSON.parse(jsonMatch[1]);
  console.log(`Loaded ${localProducts.length} local products.`);

  console.log('Fetching all Shopify products...');
  let shopifyProducts = [];
  for (let page of [1, 2, 3]) {
    try {
      const r = await fetch('https://orolaminado18.com/products.json?limit=250&page=' + page);
      const d = await r.json();
      if (!d.products || d.products.length === 0) break;
      shopifyProducts.push(...d.products);
      if (d.products.length < 250) break;
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }
  console.log(`Fetched ${shopifyProducts.length} Shopify products.`);

  const bySku = new Map();
  const byTitle = new Map();
  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  shopifyProducts.forEach(p => {
    const sku = (p.variants && p.variants[0] && p.variants[0].sku) ? p.variants[0].sku.trim() : '';
    if (sku) bySku.set(sku.toLowerCase(), p);
    byTitle.set(normalize(p.title), p);
  });

  let updatedCount = 0;
  let sampleDiffs = [];

  const updatedProducts = localProducts.map(lp => {
    let match = null;
    if (lp.sku && bySku.has(lp.sku.toLowerCase())) {
      match = bySku.get(lp.sku.toLowerCase());
    } else if (byTitle.has(normalize(lp.title))) {
      match = byTitle.get(normalize(lp.title));
    }

    let newPrice = lp.price;
    if (match && match.variants && match.variants[0]) {
      const v = match.variants[0];
      const comparePrice = v.compare_at_price ? Math.round(parseFloat(v.compare_at_price)) : 0;
      if (comparePrice > 0) {
        newPrice = comparePrice;
        if (newPrice !== lp.price) {
          updatedCount++;
          if (sampleDiffs.length < 10) {
            sampleDiffs.push({
              title: lp.title,
              oldPrice: lp.price,
              newPrice: newPrice
            });
          }
        }
      }
    }

    return {
      ...lp,
      price: newPrice
    };
  });

  console.log(`\nUpdated ${updatedCount} products to "Lo vendes en:" price!`);
  console.log('\nSample price changes:');
  sampleDiffs.forEach(s => {
    console.log(`- ${s.title.substring(0, 36).padEnd(38)}: $${s.oldPrice.toLocaleString('es-CO')} -> $${s.newPrice.toLocaleString('es-CO')}`);
  });

  const newJs = '// Auto-generated catalogue database with 487 products from orolaminado18.com\n' +
                '// Enriched with real authentic descriptions, features, and technical specifications\n' +
                'const PRODUCTS_DATA = ' + JSON.stringify(updatedProducts, null, 2) + ';\n\n' +
                'if (typeof module !== "undefined" && module.exports) {\n' +
                '  module.exports = { PRODUCTS_DATA };\n' +
                '}\n';

  fs.writeFileSync(filePath, newJs, 'utf8');
  console.log('\nSuccessfully saved to data/products.js!');
}

updatePricesToLoVendesEn();
