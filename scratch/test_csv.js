import fs from 'fs';

const parseCsvLine = (line) => {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur.trim());
  return result;
};

const parseSafeFloat = (val, defaultVal = 0) => {
  if (!val) return defaultVal;
  const clean = String(val).replace(/[^\d.-]/g, '');
  const n = parseFloat(clean);
  return isFinite(n) ? n : defaultVal;
};

try {
  const content = fs.readFileSync('C:/Users/ADMIN/Desktop/sanrem.csv', 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  const cleanHeader = (h) => h.toLowerCase().trim().replace(/^\uFEFF/, '');
  const headers = parseCsvLine(lines[0]).map(cleanHeader);
  
  const nameIdx = headers.indexOf('name');
  const catIdx = headers.indexOf('category');
  const priceIdx = headers.indexOf('price');
  const skuIdx = headers.indexOf('sku');
  const costIdx = headers.indexOf('cost');
  const stockIdx = headers.indexOf('stock_quantity');
  const lowIdx = headers.indexOf('low_stock_threshold');

  console.log('Headers:', headers);
  console.log('Indices:', { nameIdx, catIdx, priceIdx, skuIdx, costIdx, stockIdx, lowIdx });

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length < 2) {
        console.log(`Skipping line ${i+1}: too few parts`, parts);
        continue;
    }

    const name = parts[nameIdx];
    const category = parts[catIdx];
    if (!name || !category) {
        console.log(`Skipping line ${i+1}: missing name/cat`, { name, category });
        continue;
    }

    rows.push({
      name: name.trim(),
      category: category.trim(),
      price: priceIdx !== -1 ? parseSafeFloat(parts[priceIdx]) : 0,
      sku: skuIdx !== -1 ? (parts[skuIdx] ? parts[skuIdx].trim() : null) : null,
      cost: costIdx !== -1 ? parseSafeFloat(parts[costIdx]) : 0,
      stock_quantity: stockIdx !== -1 ? parseSafeFloat(parts[stockIdx]) : 0,
      low_stock_threshold: lowIdx !== -1 ? parseSafeFloat(parts[lowIdx], 10) : 10
    });
  }

  console.log('Successfully parsed rows:', rows.length);
  console.log('Sample row 24 (Advocate):', rows.find(r => r.name.includes('Advocate')));
  console.log('Sample row 51 (Amlodipine):', rows.find(r => r.name === 'Amlodipine'));

} catch (err) {
  console.error('Error:', err);
}
