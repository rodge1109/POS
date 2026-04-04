import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add isDarkMode state and helpers
if (!content.includes('const [isDarkMode')) {
  content = content.replace(
    "const [timeframe, setTimeframe] = useState('today');",
    "const [timeframe, setTimeframe] = useState('today');\n  const [isDarkMode, setIsDarkMode] = useState(false);"
  );
}

// 2. Define style helpers
const styleHelpers = `
  const cardClass = isDarkMode 
    ? "rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-cyan-500/40 transition-all duration-500" 
    : "rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-100";
    
  const chartTextColor = isDarkMode ? '#cbd5e1' : '#64748b';
  const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
`;

if (!content.includes('const cardClass = isDarkMode')) {
  content = content.replace(
    "const formatCurrency = (amount) => {",
    styleHelpers + "\n  const formatCurrency = (amount) => {"
  );
}

// 3. Transform the main return container
content = content.replace(
  '<div className="bg-gray-100 min-h-screen pt-4 pb-20">',
  '<div className={`min-h-screen pt-4 pb-20 transition-colors duration-700 ${isDarkMode ? \'bg-[#020617] text-slate-100\' : \'bg-gray-100 text-gray-900\'}`}>'
);

// 4. Inject theme toggle in header
const headerTarget = '<h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">📊 Business Dashboard</h1>';
const headerReplace = `
                <div className="flex items-center justify-between gap-4">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">📊 Business Dashboard</h1>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={\`p-2.5 rounded-2xl transition-all duration-500 \${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-200 text-gray-600 border border-gray-300'}\`}
                  >
                    {isDarkMode ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} />}
                  </button>
                </div>
`;
content = content.replace(headerTarget, headerReplace);

// Update description text color
content = content.replace('<p className="text-gray-600">', `<p className={isDarkMode ? "text-slate-400" : "text-gray-600"}>`);

// 5. Update Timeframe Selector buttons for Dark Mode
content = content.replace(
  ": 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-600 hover:text-cyan-600'",
  `: (isDarkMode ? 'bg-slate-800 text-slate-300 border-white/5 hover:border-cyan-500' : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-600 hover:text-cyan-600')`
);

// 6. Update REVENUE CARDS to use cardClass
// First clean up the old class strings
content = content.replace('className="p-6 rounded-xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 shadow-lg hover:shadow-xl transition-shadow"', 'className={`p-6 ${cardClass} relative overflow-hidden group`}');
content = content.replace('className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-lg hover:shadow-xl transition-shadow"', 'className={`p-6 ${cardClass} relative overflow-hidden group`}');
content = content.replace('className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 shadow-lg hover:shadow-xl transition-shadow"', 'className={`p-6 ${cardClass} relative overflow-hidden group`}');
content = content.replace('className="p-6 rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-100 shadow-lg hover:shadow-xl transition-shadow"', 'className={`p-6 ${cardClass} relative overflow-hidden group`}');

// Update Main Titles in Cards to white in dark mode
content = content.replace('h3 className="text-3xl font-black text-gray-900"', 'h3 className={`text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}');

// 7. Update Sales Trend Chart Card
content = content.replace(
  'className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100"',
  'className={`lg:col-span-2 ${cardClass} p-8`}'
);
// Update inner text colors
content = content.replace('text-xl font-bold text-gray-900 mb-1">📈 Sales Trend', 'text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"} mb-1">📈 Sales Trend');

// 8. Apply similar cardClass to Top Products & Categories
content = content.replace(
  'className="bg-white rounded-xl shadow-lg p-8 border border-gray-100"',
  'className={`${cardClass} p-8`}'
);
content = content.replace(
  'className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100"',
  'className={`${cardClass} p-8`}'
);

// 9. Final Fix: Ensure chart options use dynamic colors
content = content.replace("grid: { color: 'rgba(0, 0, 0, 0.05)' }", "grid: { color: chartGridColor }");
content = content.replace("labels: { display: false }", "labels: { display: false }, ticks: { color: chartTextColor }");

fs.writeFileSync('src/App.jsx', content);
console.log('LUMINA Dark Mode (Glassmorphism) deployed successfully!');
