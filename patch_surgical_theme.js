import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add color helpers to DashboardPage for surgical use
const colorHelpers = `
  const headingClass = \`text-xl font-bold \${isDarkMode ? "text-white" : "text-gray-900"} mb-1\`;
  const subtextClass = isDarkMode ? "text-slate-400" : "text-gray-600";
  const mutedClass = isDarkMode ? "text-slate-500" : "text-gray-500";
`;

if (!content.includes('const headingClass =')) {
  content = content.replace(
    'const chartGridColor = isDarkMode ? \'rgba(255, 255, 255, 0.05)\' : \'rgba(0, 0, 0, 0.05)\';',
    'const chartGridColor = isDarkMode ? \'rgba(255, 255, 255, 0.05)\' : \'rgba(0, 0, 0, 0.05)\';' + colorHelpers
  );
}

// 2. Surgically replace Dashboard-specific headers with help of headingClass
const dashHeaders = [
  '📈 Sales Trend',
  '🎯 Revenue by Category',
  '⏱️ Service Speed Trend',
  '🔥 Order Peak Times',
  '👥 Customer Insights',
  '🏆 Top Performing Products',
  '⚠️ Low Performing Products',
  '📑 Profit & Margin Analysis'
];

dashHeaders.forEach(header => {
  // Use a targeted regex that looks for the header text and a standard text-gray-900 class
  const regex = new RegExp(`h3[^>]+className=["' \`${{}}a-zA-Z0-9-?:]+>${header}</h3>`);
  content = content.replace(regex, `h3 className={headingClass}>${header}</h3>`);
});

// 3. Update the subtexts and labels in Dashboard only (after the Dashboard return)
const dashboardStart = content.indexOf('return ('); // Find the first return inside DashboardPage (approx)
const posStart = content.indexOf('const POSPage'); // Bounds check

// Manually replace some more specific Dashboard containers
content = content.replace('p className="text-gray-600">Real-time sales metrics', 'p className={subtextClass}>Real-time sales metrics');
content = content.replace('p className="text-gray-500 text-xs text-xs mb-6"', 'p className={`${mutedClass} text-xs mb-6"`}');
content = content.replace('p className="text-gray-500 text-xs mb-6"', 'p className={`${mutedClass} text-xs mb-6"`}');

fs.writeFileSync('src/App.jsx', content);
console.log('Surgical dashboard theme-refresh complete!');
