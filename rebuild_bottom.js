import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Rebuild the Product Performance Section (Top/Low Products)
const prodStartMarker = '{/* Product Performance Section */}';
const targetStart = content.indexOf(prodStartMarker);
const targetEnd = content.indexOf('return (', targetStart + 100); // This won't work easily

// I'll use a known large block for replacement
const bigBlockTarget = `            {/* Product Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2.5">`;

const bigBlockReplace = `            {/* Product Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2.5">
              {/* Top Products */}
              <div className={\`\${cardClass} p-8\`}>
                <div className="mb-6">
                  <h3 className={headingClass}>🏆 Top Performing Products</h3>
                  <p className="text-cyan-600 text-sm font-bold">🌟 Our Best Sellers</p>
                </div>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((prod, idx) => (
                      <div key={idx} className={\`p-4 \${isDarkMode ? "bg-white/5 border-white/10" : "bg-gradient-to-r from-gray-50 to-white border-gray-200"} rounded-lg hover:border-cyan-600 hover:shadow-md transition-all\`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className={\`text-sm font-bold \${isDarkMode ? "text-slate-500" : "text-gray-600"}\`}>#{idx + 1}</div>
                            <p className={\`font-bold \${isDarkMode ? "text-white" : "text-gray-900"} text-lg\`}>{prod.name}</p>
                            <p className={\`text-sm \${subtextClass}\`}>{prod.quantity} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-cyan-600">{formatCurrency(prod.revenue)}</p>
                          </div>
                        </div>
                        <div className={\`w-full \${isDarkMode ? "bg-white/10" : "bg-gray-200"} rounded-full h-2.5 overflow-hidden\`}>
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2.5 rounded-full"
                            style={{ width: \`\${(prod.revenue / (topProducts[0]?.revenue || 1)) * 100}%\` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={\`text-center py-8 \${isDarkMode ? "bg-white/5" : "bg-gray-50"} rounded-lg \${subtextClass}\`}>📊 No sales data available</p>
                )}
              </div>

              {/* Low Performing Products */}
              <div className={\`\${cardClass} p-8\`}>
                <div className="mb-6">
                  <h3 className={headingClass}>⚠️ Low Performing Products</h3>
                  <p className="text-orange-600 text-sm font-bold">📉 Items needing attention</p>
                </div>
                {lowProducts.length > 0 ? (
                  <div className="space-y-4">
                    {lowProducts.map((prod, idx) => (
                      <div key={idx} className={\`p-4 \${isDarkMode ? "bg-white/5 border-white/10" : "bg-gradient-to-r from-gray-50 to-white border-gray-200"} rounded-lg hover:border-orange-600 hover:shadow-md transition-all\`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className={\`text-sm font-bold text-orange-600\`}>Bottom #{lowProducts.length - idx}</div>
                            <p className={\`font-bold \${isDarkMode ? "text-white" : "text-gray-900"} text-lg\`}>{prod.name}</p>
                            <p className={\`text-sm \${subtextClass}\`}>{prod.quantity} units sold</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-400">{formatCurrency(prod.revenue)}</p>
                          </div>
                        </div>
                        <div className={\`w-full \${isDarkMode ? "bg-white/10" : "bg-gray-200"} rounded-full h-2.5 overflow-hidden\`}>
                          <div
                            className="bg-gradient-to-r from-orange-400 to-orange-500 h-2.5 rounded-full"
                            style={{ width: \`\${(prod.revenue / (topProducts[0]?.revenue || 1)) * 100}%\` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={\`text-center py-8 \${isDarkMode ? "bg-white/5" : "bg-gray-50"} rounded-lg \${subtextClass}\`}>✅ All items performing well or no data</p>
                )}
              </div>
            </div>

            {/* Smart Recommendations */}
            <div className={\`mt-8 \${isDarkMode ? 'bg-slate-900/60 backdrop-blur-xl border-white/10 border' : 'bg-gradient-to-br from-blue-50 via-green-50 to-emerald-50 border-2 border-cyan-200'} rounded-xl shadow-lg p-8\`}>
              <h3 className={headingClass}>💡 Smart Recommendations</h3>
              <p className={\`\${subtextClass} text-sm mb-6\`}>AI-powered business insights</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: '✅ Inventory Alert', content: lowProducts.length > 0 ? \`⚠️ Consider reviewing "\${lowProducts[0].name}" menu placement.\` : '📊 All items healthy.', border: 'border-l-cyan-600' },
                  { title: '💰 Yield Target', content: metrics?.totalRevenue > 10000 ? '🚀 High performance period detected!' : '📈 Consider weekend promo.', border: 'border-l-purple-500' },
                  { title: '👥 Loyalty Peak', content: customerMetrics?.retention > 50 ? '🌟 Exceptional retention this period!' : '🔄 Engagement needed.', border: 'border-l-emerald-500' },
                  { title: '🚀 Fast Moving', content: topProducts.length > 0 ? \`🏆 "\${topProducts[0].name}" is dominating.\` : '📊 Waiting for data.', border: 'border-l-orange-500' }
                ].map((rec, i) => (
                  <div key={i} className={\`p-4 \${isDarkMode ? "bg-white/5 border-white/5" : "bg-white border-white"} border-l-4 \${rec.border} rounded-lg shadow-sm hover:shadow-md transition-all\`}>
                    <p className={\`font-bold \${isDarkMode ? "text-white" : "text-gray-900"}\`}>{rec.title}</p>
                    <p className={\`text-sm \${subtextClass} mt-1\`}>{rec.content}</p>
                  </div>
                ))}
              </div>
            </div>`;

// Use a more targeted regex or just replace the big block
const findSection = content.indexOf('{/* Product Performance Section */}');
const endMarker = '</div>\n\n          </div>\n        )}'; // Approx end of DashboardPage
const findEnd = content.indexOf('</div>\n\n          </div>', findSection);

if (findSection !== -1 && findEnd !== -1) {
  content = content.substring(0, findSection) + bigBlockReplace + content.substring(findEnd);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Dashboard bottom sections architecturally rebuilt!');
} else {
  console.log('Markers for bottom rebuild not found.');
}
