import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Fix the Peak Times card container (it was stuck in bg-white)
content = content.replace(
  '{/* Peak Times Bar Chart */}\n              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">',
  '{/* Peak Times Bar Chart */}\n              <div className={`${cardClass} p-8`}>'
);

// 2. Fix Peak Times h3 heading
content = content.replace(
  'className="text-xl font-bold text-gray-900 mb-1">🔥 Order Peak Times</h3>',
  'className={headingClass}>🔥 Order Peak Times</h3>'
);

// 3. Fix invisible Service Speed title (Heading text color)
content = content.replace(
  'h3 className="text-xl font-bold text-gray-900 mb-1">⏱️ Service Speed Trend</h3>',
  'h3 className={headingClass}>⏱️ Service Speed Trend</h3>'
);

// 4. Update the chart axes/ticks for ALL charts in Dashboard
// We'll look for ticks: { and inject the color if missing or fix it
content = content.replace(/ticks: \{\s+precision: 0\s+\}/g, 'ticks: { precision: 0, color: chartTextColor }');
content = content.replace(/ticks: \{\s+callback: v =>/g, 'ticks: { color: chartTextColor, callback: v =>');
content = content.replace(/y: \{\s+beginAtZero: true,\s+ticks: \{/g, 'y: { beginAtZero: true, ticks: { color: chartTextColor, ');
content = content.replace(/x: \{\s+grid: \{ display: false \}\s+\}/g, 'x: { grid: { display: false }, ticks: { color: chartTextColor } }');

// 5. Update chart titles (Profitability)
content = content.replace(
  'h3 className="text-xl font-bold text-gray-900 mb-1">📑 Profit & Margin Analysis</h3>',
  'h3 className={headingClass}>📑 Profit & Margin Analysis</h3>'
);

// 6. Update Customer Insights title (again, to be safe)
content = content.replace(
  'h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-1`}>👥 Customer Insights</h3>',
  'h3 className={headingClass}>👥 Customer Insights</h3>'
);

fs.writeFileSync('src/App.jsx', content);
console.log('Final Lumina Polish complete. Dashboard is now perfectly balanced!');
