import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Service Speed & Peak Times Cards
content = content.replace(
  'className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100"',
  'className={`${cardClass} p-8`}'
); // This might hit multiple, which is good.

// 2. Customer Insights Card (Primary Container)
content = content.replace(
  'className="mt-2.5 bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100"',
  'className={`mt-2.5 ${cardClass} p-8`}'
);

// 3. Customer Insights - Inner Detailed Cards
const customerInnerCards = [
  { target: 'bg-gradient-to-br from-purple-50 to-white border border-purple-100', color: 'purple' },
  { target: 'bg-gradient-to-br from-blue-50 to-white border border-blue-100', color: 'blue' },
  { target: 'bg-gradient-to-br from-emerald-50 to-white border border-emerald-100', color: 'emerald' },
  { target: 'bg-gradient-to-br from-orange-50 to-white border border-orange-100', color: 'orange' }
];

customerInnerCards.forEach(card => {
  const replacement = `\${\`p-6 rounded-xl \${isDarkMode ? 'bg-\${card.color}-900/10 border-\${card.color}-500/20' : 'bg-gradient-to-br from-\${card.color}-50 to-white border-\${card.color}-100'}\`}`;
  content = content.replace(`className="p-6 rounded-xl ${card.target}"`, `className={${replacement}}`);
});

// 4. Product Performance Section (Outer Containers)
content = content.replace(
  'className="bg-white rounded-xl shadow-lg p-8 border border-gray-100"',
  'className={`${cardClass} p-8`}'
); 

// 5. Product List Items (The individual product rows)
const listItemTarget = 'className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-cyan-600 hover:shadow-md transition-all"';
const listItemReplace = 'className={`p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-gradient-to-r from-gray-50 to-white border-gray-200"} rounded-lg hover:border-cyan-600 hover:shadow-md transition-all`}';
content = content.replace(listItemTarget, listItemReplace);

const lowItemTarget = 'className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-orange-600 hover:shadow-md transition-all"';
const lowItemReplace = 'className={`p-4 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-gradient-to-r from-gray-50 to-white border-gray-200"} rounded-lg hover:border-orange-600 hover:shadow-md transition-all`}';
content = content.replace(lowItemTarget, lowItemReplace);

// 6. Fix Text Colors inside cards for Dark Mode (gray-900, gray-600, etc.)
content = content.replace(/text-gray-900/g, (match, offset) => {
  // Only replace inside the DashboardPage bounds (approx)
  if (offset > content.indexOf('const DashboardPage')) {
    return '${isDarkMode ? "text-white" : "text-gray-900"}';
  }
  return match;
});

// Fix some specific subtexts
content = content.replace(/text-gray-600/g, (match, offset) => {
  if (offset > content.indexOf('const DashboardPage')) {
    return '${isDarkMode ? "text-slate-400" : "text-gray-600"}';
  }
  return match;
});

content = content.replace(/text-gray-500/g, (match, offset) => {
  if (offset > content.indexOf('const DashboardPage')) {
    return '${isDarkMode ? "text-slate-500" : "text-gray-500"}';
  }
  return match;
});

// 7. Fix the remaining h3 Syntax
const finalHeaders = ['⏱️ Service Speed Trend', '🔥 Order Peak Times', '⚠️ Low Performing Products'];
finalHeaders.forEach(header => {
  const target = `h3 className="text-xl font-bold text-gray-900 mb-1">${header}</h3>`;
  const replacement = `h3 className={\`text-xl font-bold \${isDarkMode ? "text-white" : "text-gray-900"} mb-1\`}>${header}</h3>`;
  content = content.replace(target, replacement);
});

// Final check for Profit Analysis row
content = content.replace(
  'className="mt-8 bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100"',
  'className={`mt-8 ${cardClass} p-8`}'
);

fs.writeFileSync('src/App.jsx', content);
console.log('Lumina 100% Dark Transformation complete!');
