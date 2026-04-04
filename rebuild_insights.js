import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// I'll take the entire Customer Insights Section from Row start to Row end and replace it with a clean one
const startMarker = '{/* Customer Insights Row */}';
const targetStart = content.indexOf(startMarker);
const targetEnd = content.indexOf('{/* Product Performance Section */}');

if (targetStart !== -1 && targetEnd !== -1) {
  const cleanSection = `${startMarker}
            <div className={\`mt-2.5 \${cardClass} p-8\`}>
              <div className="mb-6">
                <h3 className={\`text-xl font-bold \${isDarkMode ? "text-white" : "text-gray-900"} mb-1\`}>👥 Customer Insights</h3>
                <p className="text-purple-600 text-sm font-bold mb-1">🔍 Who are we serving?</p>
                <p className={\`\${mutedClass} text-xs mb-6\`}>Audience acquisition & loyalty metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Acquisition Card */}
                <div className={\`p-6 rounded-xl \${isDarkMode ? 'bg-purple-900/10 border-purple-500/20' : 'bg-gradient-to-br from-purple-50 to-white border-purple-100'}\`}>
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-4">Acquisition</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={\`text-3xl font-black \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{customerMetrics?.newCustomers || 0}</p>
                      <p className={\`text-xs \${mutedClass} font-bold\`}>New Customers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">{customerMetrics?.returningCustomers || 0}</p>
                      <p className={\`text-[10px] \${mutedClass} font-bold uppercase\`}>Returning</p>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                    <div className="bg-purple-600 h-full" style={{ width: \`\${(customerMetrics?.newCustomers / ((customerMetrics?.newCustomers + customerMetrics?.returningCustomers) || 1)) * 100}%\` }}></div>
                    <div className="bg-purple-300 h-full flex-1"></div>
                  </div>
                </div>

                {/* CAC Card */}
                <div className={\`p-6 rounded-xl \${isDarkMode ? 'bg-blue-900/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-white border-blue-100'}\`}>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">Unit Acquisition Proxy (CAC)</p>
                  <p className={\`text-3xl font-black \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{formatCurrency(customerMetrics?.cac || 0)}</p>
                  <p className={\`text-xs \${mutedClass} font-bold mt-1\`}>Discount cost per new user</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-600">
                    <span>🎯 Target: {currency === 'PHP' ? '₱' : '$'}0.00</span>
                  </div>
                </div>

                {/* LTV Card */}
                <div className={\`p-6 rounded-xl \${isDarkMode ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100'}\`}>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4">Lifetime Value (LTV)</p>
                  <p className={\`text-3xl font-black \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{formatCurrency(customerMetrics?.ltv || 0)}</p>
                  <p className={\`text-xs \${mutedClass} font-bold mt-1\`}>Avg. spend per customer</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                    <span className="animate-pulse">💎 High Value Audience</span>
                  </div>
                </div>

                {/* Retention Card */}
                <div className={\`p-6 rounded-xl \${isDarkMode ? 'bg-orange-900/10 border-orange-500/20' : 'bg-gradient-to-br from-orange-50 to-white border-orange-100'}\`}>
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-4">Retention Rate</p>
                  <p className={\`text-3xl font-black \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{customerMetrics?.retention || 0}%</p>
                  <p className={\`text-xs \${mutedClass} font-bold mt-1\`}>Returning base percentage</p>
                  <div className="mt-4 w-full bg-orange-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: \`\${customerMetrics?.retention || 0}%\` }}></div>
                  </div>
                </div>
              </div>
            </div>\n\n            `;
  
  content = content.substring(0, targetStart) + cleanSection + content.substring(targetEnd);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Customer Insights section surgically rebuilt!');
} else {
  console.log('Markers not found.');
}
