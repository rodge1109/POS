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

try {
  const content = fs.readFileSync('C:/Users/ADMIN/Desktop/sanrem.csv', 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
  const skuIdx = headers.indexOf('sku');

  const skus = {};
  let dupSkus = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const sku = skuIdx !== -1 ? parts[skuIdx].trim() : '';
    if (sku) {
        if (skus[sku]) {
            console.log(`Duplicate SKU found: ${sku} at line ${i+1}`);
            dupSkus++;
        }
        skus[sku] = true;
    }
  }

  console.log('Total non-empty SKUs:', Object.keys(skus).length);
  console.log('Total duplicate SKUs:', dupSkus);

} catch (err) {
  console.error('Error:', err);
}
