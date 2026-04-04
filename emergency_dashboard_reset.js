import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Identify the start and end of the DashboardPage component to replace its return statement entirely
const dashboardStart = content.indexOf('const DashboardPage =');
const dashboardReturn = content.indexOf('return (', dashboardStart);
const dashboardComponentEnd = content.indexOf('export default App;', dashboardReturn); // Approximate

// A safer way is to replace the content between known markers if possible, 
// but since it's messy, I'll just rewrite the whole component return.

const cleanDashboardReturn = `  return (
    <div className={\`min-h-screen pt-4 pb-20 transition-colors duration-700 \${isDarkMode ? 'bg-[#020617] text-slate-100' : 'bg-gray-100 text-gray-900'}\`}>
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-cyan-600 font-bold animate-pulse">Initializing Lumina Engine...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Header with Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">📊 Business Dashboard</h1>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={\`p-2.5 rounded-2xl transition-all duration-500 \${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-200 text-gray-600 border border-gray-300'}\`}
                  >
                    {isDarkMode ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} />}
                  </button>
                </div>
                <p className={isDarkMode ? "text-slate-400" : "text-gray-600"}>Real-time sales metrics, analytics & business intelligence</p>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide whitespace-nowrap">
              {['today', 'week', 'month', 'year'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={\`px-4 py-2.5 rounded-lg font-semibold transition-all inline-block \${timeframe === tf
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg transform scale-105'
                    : (isDarkMode ? 'bg-slate-800 text-slate-300 border-white/5 hover:border-cyan-500' : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-600 hover:text-cyan-600')
                    }\`}
                >
                  {tf === 'today' ? '🕒 Today' : tf === 'week' ? '📅 Week' : tf === 'month' ? '📆 Month' : '📊 Year'}
                </button>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Financial Volume', title: 'Total Sales', value: formatCurrency(metrics?.totalRevenue || 0), icon: '💰', trend: metrics?.trends?.revenue, sub: 'Total Sales (Tax Incl.)', accent: 'cyan' },
                { label: 'Traffic Volume', title: 'Transactions', value: metrics?.totalOrders || 0, icon: '📦', trend: metrics?.trends?.orders, sub: 'Total Transactions', accent: 'blue' },
                { label: 'Basket Depth (AOV)', title: 'Avg Order Value', value: formatCurrency(metrics?.avgOrderValue || 0), icon: '💵', trend: metrics?.trends?.aov, sub: 'Avg. Revenue Per Sale', accent: 'purple' },
                { label: 'Item Velocity', title: 'Avg Items', value: metrics?.avgOrderSize || 0, icon: '🛒', trend: metrics?.trends?.size, sub: 'Avg. Items Per Order', accent: 'orange' }
              ].map((card, i) => (
                <div key={i} className={\`p-6 \${cardClass} relative overflow-hidden group\`}>
                  <div className="flex justify-between items-start mb-4">
                    <p className={\`text-[10px] font-bold text-\${card.accent}-600 uppercase tracking-widest\`}>{card.label}</p>
                    {card.trend && (
                      <div className={\`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold \${card.trend.direction === 'up' ? 'bg-green-100 text-green-700' : card.trend.direction === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}\`}>
                        {card.trend.direction === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : card.trend.direction === 'down' ? <TrendingDown className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5 opacity-50" />}
                        {card.trend.percent}%
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={\`text-3xl font-black \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{card.value}</h3>
                    <span className="text-xl opacity-80">{card.icon}</span>
                  </div>
                  <p className={\`text-xs \${mutedClass} font-bold\`}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className={\`lg:col-span-2 \${cardClass} p-8\`}>
                <h3 className={headingClass}>📈 Sales Trend</h3>
                <p className="text-cyan-600 text-sm font-bold mb-1">🚀 Are we growing?</p>
                <p className={\`\${mutedClass} text-xs mb-6\`}>Daily revenue analysis ({currency})</p>
                {salesData && <Line data={salesData} options={{ responsive: true, plugins: { legend: { labels: { color: chartTextColor } } }, scales: { y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } }, x: { grid: { display: false }, ticks: { color: chartTextColor } } } }} />}
              </div>
              <div className={\`\${cardClass} p-8\`}>
                <h3 className={headingClass}>🎯 Revenue by Category</h3>
                <p className="text-blue-600 text-sm font-bold mb-1">📊 What's driving sales?</p>
                {revenueByCategory && <Doughnut data={revenueByCategory} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { color: chartTextColor } } } }} />}
              </div>
            </div>

            {/* Profitability Row */}
            <div className={\`mb-8 \${cardClass} p-8\`}>
              <h3 className={headingClass}>📑 Profit & Margin Analysis</h3>
              <p className="text-emerald-600 text-sm font-bold mb-1">💰 Revenue vs Cost</p>
              <div className="h-80">
                {profitData && <Bar data={profitData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: chartTextColor } }, x: { ticks: { color: chartTextColor } } } }} />}
              </div>
            </div>

            {/* Row 3: Speed & Peaks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className={\`\${cardClass} p-8\`}>
                <h3 className={headingClass}>⏱️ Service Speed Trend</h3>
                {serviceTimeData && <Line data={serviceTimeData} options={{ responsive: true, scales: { y: { ticks: { color: chartTextColor } }, x: { ticks: { color: chartTextColor } } } }} />}
              </div>
              <div className={\`\${cardClass} p-8\`}>
                <h3 className={headingClass}>🔥 Order Peak Times</h3>
                {peakTimeData && <Bar data={peakTimeData} options={{ responsive: true, scales: { y: { ticks: { color: chartTextColor } }, x: { ticks: { color: chartTextColor } } } }} />}
              </div>
            </div>

            {/* Customer Insights */}
            <div className={\`\${cardClass} p-8 mb-8\`}>
              <h3 className={headingClass}>👥 Customer Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {[
                  { name: 'Acquisition', color: 'purple', value: customerMetrics?.newCustomers || 0 },
                  { name: 'CAC', color: 'blue', value: formatCurrency(customerMetrics?.cac || 0) },
                  { name: 'LTV', color: 'emerald', value: formatCurrency(customerMetrics?.ltv || 0) },
                  { name: 'Retention', color: 'orange', value: \`\${customerMetrics?.retention || 0}%\` }
                ].map((card, i) => (
                  <div key={i} className={\`p-6 rounded-xl \${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gradient-to-br from-white to-gray-50 border-gray-100'} border\`}>
                    <p className={\`text-[10px] font-bold text-\${card.color}-600 uppercase mb-4\`}>{card.name}</p>
                    <p className={\`text-3xl font-black \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{card.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className={\`\${cardClass} p-8\`}>
                <h3 className={headingClass}>🏆 Top Products</h3>
                <div className="space-y-4 mt-6">
                  {topProducts.slice(0, 5).map((prod, i) => (
                    <div key={i} className={\`p-4 \${isDarkMode ? "bg-white/5" : "bg-gray-50"} rounded-lg flex justify-between\`}>
                      <span className={isDarkMode ? "text-white" : "text-gray-900"}>{prod.name}</span>
                      <span className="font-bold text-cyan-600">{formatCurrency(prod.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={\`\${cardClass} p-8\`}>
                <h3 className={headingClass}>⚠️ Low Performers</h3>
                <div className="space-y-4 mt-6">
                  {lowProducts.slice(0, 5).map((prod, i) => (
                    <div key={i} className={\`p-4 \${isDarkMode ? "bg-white/5" : "bg-gray-50"} rounded-lg flex justify-between\`}>
                      <span className={isDarkMode ? "text-white" : "text-gray-900"}>{prod.name}</span>
                      <span className="font-bold text-orange-600">{formatCurrency(prod.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className={\`\${cardClass} p-8\`}>
              <h3 className={headingClass}>💡 Smart Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                {['Inventory Alert', 'Yield Target', 'Loyalty Peak', 'Fast Moving'].map((title, i) => (
                  <div key={i} className={\`p-4 \${isDarkMode ? "bg-white/5" : "bg-white"} border-l-4 border-cyan-500 rounded-lg\`}>
                    <p className={\`font-bold \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{title}</p>
                    <p className={\`text-sm \${subtextClass} mt-1\`}>Check detailed analytics for insights.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
`;

// Find everything from return ( to the end of the DashboardPage component
// We know DashboardPage is defined as: const DashboardPage = () => { ... return ( ... ) };
const startOfReturn = content.indexOf('return (', dashboardStart);
// Find the matching end of return. We'll search for the last }; before the next component.
const endOfReturn = content.indexOf('};', startOfReturn + 1000);

if (startOfReturn !== -1 && endOfReturn !== -1) {
    content = content.substring(0, startOfReturn) + cleanDashboardReturn + content.substring(endOfReturn);
    fs.writeFileSync('src/App.jsx', content);
    console.log('DashboardPage component return logic has been REBUILT and THEMED from scratch!');
} else {
    console.log('Could not find dashboard return block to rebuild.');
}
