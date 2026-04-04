import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetStr = `JSON.stringify({ ingredient_id: ingredientId, quantity_change: parseFloat(quantity_change), notes })`;
const newStr = `JSON.stringify({ ingredient_id: ingredientId, quantity_change: parseFloat(quantity_change), notes, invoice_cost: arguments.length > 3 ? parseFloat(arguments[3]) : null })`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Payload updated!');
} else {
  console.log('Could not find exact payload string match.');
}
