const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'products.js');
const content = fs.readFileSync(filePath, 'utf8');

const match = content.match(/const PRODUCTS_DATA = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not parse PRODUCTS_DATA');
  process.exit(1);
}

const allProducts = JSON.parse(match[1]);
console.log(`Initial total products: ${allProducts.length}`);

// Keep strictly Oro Laminado 18K products
const oroProducts = allProducts.filter(p => p.metal === 'oro-laminado');
console.log(`Filtered Oro Laminado 18K products count: ${oroProducts.length}`);

const newJs = '// Auto-generated catalogue database - Max Joyería Oro Laminado 18K\n' +
              '// Enriched with real authentic descriptions, features, and technical specifications\n' +
              'const PRODUCTS_DATA = ' + JSON.stringify(oroProducts, null, 2) + ';\n\n' +
              'if (typeof module !== "undefined" && module.exports) {\n' +
              '  module.exports = { PRODUCTS_DATA };\n' +
              '}\n';

fs.writeFileSync(filePath, newJs, 'utf8');
console.log('Successfully saved filtered database to data/products.js!');
