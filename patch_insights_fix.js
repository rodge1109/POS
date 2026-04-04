import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Fix the mangled Customer Insights cards
const innerCards = [
  { name: 'Acquisition', color: 'purple' },
  { name: 'Unit Acquisition Proxy (CAC)', color: 'blue' },
  { name: 'Lifetime Value (LTV)', color: 'emerald' },
  { name: 'Retention Rate', color: 'orange' }
];

innerCards.forEach(card => {
  // Find the mangled block using a fuzzy regex
  const mangledRegex = new RegExp(`<div className=\\{\\$\\{\\`p-6 rounded-xl \\$\\{isDarkMode \\? 'bg-\\$\\{card\\.color\\}-900\\/10 border-\\$\\{card\\.color\\}-500\\/20' : 'bg-gradient-to-br from-\\$\\{card\\.color\\}-50 to-white border-\\$\\{card\\.color\\}-100'\\}'\\}\\}\\}>\\s+<p[^>]+>${card.name.replace('(', '\\(').replace(')', '\\)')}</p>`);
  
  const correctReplacement = `<div className={\`p-6 rounded-xl \${isDarkMode ? 'bg-${card.color}-900/10 border-${card.color}-500/20' : 'bg-gradient-to-br from-${card.color}-50 to-white border-${card.color}-100'}\`}>
                  <p className="text-[10px] font-bold text-${card.color}-600 uppercase tracking-widest mb-4">${card.name}</p>`;
  
  content = content.replace(mangledRegex, correctReplacement);
});

// 2. Final check for any leftover ${mutedClass} text-xs mb-6" (missing opening quote)
content = content.replace('className={`${mutedClass} text-xs mb-6"`}', 'className={`${mutedClass} text-xs mb-6`}');

fs.writeFileSync('src/App.jsx', content);
console.log('Customer Insights cards surgically repaired!');
