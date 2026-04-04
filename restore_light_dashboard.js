import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Re-implement the Trend Logic inside DashboardPage's useEffect
const trendLogic = `
          // TREND ANALYSIS: Period-over-Period (PoP)
          // Split orders into Current and Previous buckets
          const now = new Date();
          let currentOrders = [];
          let previousOrders = [];

          if (timeframe === 'today') {
            const today = now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            currentOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
            previousOrders = orders.filter(o => new Date(o.created_at).toDateString() === yesterdayStr);
          } else if (timeframe === 'week') {
            const oneWeekAgo = new Date(now);
            oneWeekAgo.setDate(now.getDate() - 7);
            const twoWeeksAgo = new Date(now);
            twoWeeksAgo.setDate(now.getDate() - 14);

            currentOrders = orders.filter(o => new Date(o.created_at) >= oneWeekAgo);
            previousOrders = orders.filter(o => new Date(o.created_at) >= twoWeeksAgo && new Date(o.created_at) < oneWeekAgo);
          } else if (timeframe === 'month') {
            const oneMonthAgo = new Date(now);
            oneMonthAgo.setMonth(now.getMonth() - 1);
            const twoMonthsAgo = new Date(now);
            twoMonthsAgo.setMonth(now.getMonth() - 2);

            currentOrders = orders.filter(o => new Date(o.created_at) >= oneMonthAgo);
            previousOrders = orders.filter(o => new Date(o.created_at) >= twoMonthsAgo && new Date(o.created_at) < oneMonthAgo);
          } else {
            // Year
            const oneYearAgo = new Date(now);
            oneYearAgo.setFullYear(now.getFullYear() - 1);
            const twoYearsAgo = new Date(now);
            twoYearsAgo.setFullYear(now.getFullYear() - 2);

            currentOrders = orders.filter(o => new Date(o.created_at) >= oneYearAgo);
            previousOrders = orders.filter(o => new Date(o.created_at) >= twoYearsAgo && new Date(o.created_at) < oneYearAgo);
          }

          const calcMetric = (ordersToCalc) => {
            const rev = ordersToCalc.reduce((sum, o) => sum + (o.total || 0), 0);
            const count = ordersToCalc.length;
            const aov = count > 0 ? rev / count : 0;
            const size = count > 0 ? (ordersToCalc.reduce((sum, o) => sum + (o.items?.length || 0), 0) / count) : 0;
            return { rev, count, aov, size };
          };

          const curr = calcMetric(currentOrders);
          const prev = calcMetric(previousOrders);

          const getTrend = (c, p) => {
            if (p === 0) return c > 0 ? { percent: 100, direction: 'up' } : { percent: 0, direction: 'steady' };
            const diff = ((c - p) / p) * 100;
            if (Math.abs(diff) < 0.01) return { percent: 0, direction: 'steady' };
            return { percent: Math.abs(diff).toFixed(1), direction: diff > 0 ? 'up' : 'down' };
          };

          const trends = {
            revenue: getTrend(curr.rev, prev.rev),
            orders: getTrend(curr.count, prev.count),
            aov: getTrend(curr.aov, prev.aov),
            size: getTrend(curr.size, prev.size)
          };
`;

// Insert trends into the metrics setter
content = content.replace('totalRevenue: 0,', 'totalRevenue: 0, trends: null,');
content = content.replace('setMetrics(newMetrics);', trendLogic + '\n          setMetrics({ ...newMetrics, trends });');

// 2. Re-implement the CUSTOMER INSIGHTS logic
const customerMetricLogic = `
          // Customer Insights Simulation (based on order frequency)
          const customerOrders = {};
          orders.forEach(o => {
            const cid = o.customer_id || o.contact_number || 'guest';
            if (!customerOrders[cid]) customerOrders[cid] = 0;
            customerOrders[cid]++;
          });
          const totalBase = Object.keys(customerOrders).length;
          const returning = Object.values(customerOrders).filter(v => v > 1).length;
          const newC = totalBase - returning;
          
          setCustomerMetrics({
            newCustomers: newC,
            returningCustomers: returning,
            retention: totalBase > 0 ? ((returning / totalBase) * 100).toFixed(1) : 0,
            ltv: totalBase > 0 ? (orders.reduce((sum, o) => sum + (o.total || 0), 0) / totalBase) : 0,
            cac: newC > 0 ? (orders.filter(o => o.discount > 0).reduce((sum, o) => sum + (o.discount || 0), 0) / newC) : 0
          });
`;
content = content.replace('// Customer Insights Placeholder', customerMetricLogic);

// 3. Re-implement the PREMIUM UI for DashboardPage
// Specifically the Revenue Cards and Customer Insights sections.
// I'll replace the existing generic cards with the themed ones.

const cleanUICards = `            {/* Key Metrics - Professional Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2.5">
              {[
                { label: 'Financial Volume', title: 'Total Sales', value: formatCurrency(metrics?.totalRevenue || 0), icon: '💰', trend: metrics?.trends?.revenue, sub: 'Total Sales (Tax Incl.)', accent: 'cyan' },
                { label: 'Traffic Volume', title: 'Transactions', value: metrics?.totalOrders || 0, icon: '📦', trend: metrics?.trends?.orders, sub: 'Total Transactions', accent: 'blue' },
                { label: 'Basket Depth (AOV)', title: 'Avg Order Value', value: formatCurrency(metrics?.avgOrderValue || 0), icon: '💵', trend: metrics?.trends?.aov, sub: 'Avg. Revenue Per Sale', accent: 'purple' },
                { label: 'Item Velocity', title: 'Avg Items', value: metrics?.avgOrderSize || 0, icon: '🛒', trend: metrics?.trends?.size, sub: 'Avg. Items Per Order', accent: 'orange' }
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100 flex flex-col justify-between">
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
                    <h3 className="text-3xl font-black text-gray-900">{card.value}</h3>
                    <span className="text-xl opacity-80">{card.icon}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-bold">{card.sub}</p>
                </div>
              ))}
            </div>`;

content = content.replace(/\{(\/\*.*\*\/)?\s*Key Metrics - Professional Cards\s*[\s\S]*?(<\/div>\s*<\/div>)/, cleanUICards);

// 4. Re-implement Customer Insights Section
const insightsSection = `            {/* Customer Insights Row */}
            <div className="mt-2.5 bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">👥 Customer Insights</h3>
                <p className="text-purple-600 text-sm font-bold mb-1">🔍 Who are we serving?</p>
                <p className="text-gray-500 text-xs mb-6">Audience acquisition & loyalty metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-4">Acquisition</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black text-gray-900">{customerMetrics?.newCustomers || 0}</p>
                      <p className="text-xs text-gray-500 font-bold">New Customers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">{customerMetrics?.returningCustomers || 0}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Returning</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">Unit Acquisition Proxy (CAC)</p>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(customerMetrics?.cac || 0)}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">Discount cost per new user</p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4">Lifetime Value (LTV)</p>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(customerMetrics?.ltv || 0)}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">Avg. spend per customer</p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-100">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4">Retention Rate</p>
                  <p className="text-3xl font-black text-gray-900">{customerMetrics?.retention || 0}%</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">Returning base percentage</p>
                </div>
              </div>
            </div>`;

// Insert the insights section before Product Performance
content = content.replace('{/* Top Products & Recommendations */}', insightsSection + '\n\n            {/* Product Performance Section */}');

// 5. Finalize the 10px Gap
content = content.replace('mt-8 bg-white', 'mt-2.5 bg-white');

fs.writeFileSync('src/App.jsx', content);
console.log('Restructured High-Fidelity Light Dashboard fully restored!');
