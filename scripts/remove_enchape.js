const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'products.js');
const content = fs.readFileSync(filePath, 'utf8');

const match = content.match(/const PRODUCTS_DATA = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not find PRODUCTS_DATA');
  process.exit(1);
}

const products = JSON.parse(match[1]);
console.log('Total products to process:', products.length);

function cleanPhrase(s) {
  if (!s) return s;
  let res = s.trim();

  // 1. Warranty variations
  if (/1\s*año.*enchape.*cambio.*tono/i.test(res)) {
    return '1 Año de Garantía Oficial por cambio de tono';
  }
  if (/^1\s*año\s*de\s*garant[ií]a\s*en\s*el\s*enchape$/i.test(res)) {
    return '1 Año de Garantía Oficial por cambio de tono';
  }
  if (/5\s*años.*enchape/i.test(res) || /Garantía de 5 Años.*enchape/i.test(res)) {
    return '5 Años de Garantía Certificada (No cambia de color)';
  }
  if (/1\s*año.*enchape/i.test(res) || /Garantía de 1 Año.*enchape/i.test(res)) {
    return '1 Año de Garantía Oficial por cambio de tono';
  }

  // 2. Material variations
  if (/con\s*enchape\s*oro\s*18k/i.test(res)) {
    res = res.replace(/con\s*enchape\s*oro\s*18k/gi, 'en Oro 18K');
  }

  // 3. General remove of 'en el enchape' or 'en su enchape'
  res = res.replace(/\s*en\s+(el|su)\s+enchape\s*/gi, ' ')
           .replace(/\s*enchape\s*/gi, ' ')
           .replace(/\s+/g, ' ')
           .trim();

  return res;
}

let modifiedCount = 0;

products.forEach(p => {
  let changed = false;

  // Specs
  if (p.specs) {
    if (p.specs.garantia && /enchape/i.test(p.specs.garantia)) {
      p.specs.garantia = cleanPhrase(p.specs.garantia);
      changed = true;
    }
    if (p.specs.material && /enchape/i.test(p.specs.material)) {
      p.specs.material = cleanPhrase(p.specs.material);
      changed = true;
    }
  }

  // Features
  if (p.features && Array.isArray(p.features)) {
    p.features = p.features.map(f => {
      if (/enchape/i.test(f)) {
        changed = true;
        return cleanPhrase(f);
      }
      return f;
    });
  }

  // Description
  if (p.description && /enchape/i.test(p.description)) {
    p.description = cleanPhrase(p.description);
    changed = true;
  }

  if (changed) modifiedCount++;
});

console.log(`Cleaned 'enchape' from ${modifiedCount} products!`);

const newJs = '// Auto-generated catalogue database with 487 products from orolaminado18.com\n' +
              '// Enriched with real authentic descriptions, features, and technical specifications\n' +
              'const PRODUCTS_DATA = ' + JSON.stringify(products, null, 2) + ';\n\n' +
              'if (typeof module !== "undefined" && module.exports) {\n' +
              '  module.exports = { PRODUCTS_DATA };\n' +
              '}\n';

fs.writeFileSync(filePath, newJs, 'utf8');
console.log('Successfully saved to data/products.js!');
