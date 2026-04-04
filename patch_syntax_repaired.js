import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix the syntax error I introduced (missing backticks and double braces)
content = content.replace(
  'h3 className="text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-1"',
  'h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-1`}'
);

// Fix other h3 headers that I missed
const headersToFix = [
  '🎯 Revenue by Category',
  '📑 Profit & Margin Analysis',
  '👥 Customer Insights',
  '🏆 Top Performing Products'
];

headersToFix.forEach(header => {
  const target = `h3 className="text-xl font-bold text-gray-900 mb-1">${header}</h3>`;
  const replacement = `h3 className={\`text-xl font-bold \${isDarkMode ? "text-white" : "text-gray-900"} mb-1\`}>${header}</h3>`;
  content = content.replace(target, replacement);
});

// Also fix the chart ticks color logic which might be slightly off in the previous patch
content = content.replace(
  "labels: { display: false }, ticks: { color: chartTextColor }",
  "labels: { display: false }, ticks: { color: chartTextColor }"
);

fs.writeFileSync('src/App.jsx', content);
console.log('Syntax errors repaired. Lumina Engine is now stabilized!');
