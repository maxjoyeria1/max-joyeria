with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

pattern = r'  if \(buyBtn\) \{[\s\S]*?buyBtn\.innerHTML = `[\s\S]*?`[\s\S]*?\}\s*\}'

replacement = '''  if (addBtn) {
    if (avail === 'agotado') {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.55';
      addBtn.style.cursor = 'not-allowed';
      if (addBtnText) addBtnText.textContent = 'Joya Agotada';
    } else if (avail === 'sobre_pedido') {
      addBtn.disabled = false;
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
      if (addBtnText) addBtnText.textContent = 'Encargar al Carrito';
    } else {
      addBtn.disabled = false;
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
      if (addBtnText) addBtnText.textContent = 'Agregar al Carrito';
    }
  }'''

new_content, count = re.subn(pattern, replacement, content)
print(f"Replaced {count} occurrences")
if count > 0:
    with open('js/app.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated js/app.js successfully")
