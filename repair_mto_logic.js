import fs from 'fs';
const content = fs.readFileSync('src/App.jsx', 'utf8');

// The Goal: Replace the <tbody> content of inventory-stock to include Made to Order logic.

const tableHeader = `<thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b cursor-pointer hover:bg-gray-200"
                  >
                    # Product {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b w-20">SKU ID</th>
                  <th
                    onClick={() => handleSort('category')}
                    className="text-left px-2 py-1.5 font-semibold text-gray-600 border-b cursor-pointer hover:bg-gray-200"
                  >
                    Category {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Price</th>
                  <th
                    onClick={() => handleSort('stock')}
                    className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16 cursor-pointer hover:bg-gray-200"
                  >
                    Qty {sortBy === 'stock' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-14">Low</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-16">Status</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-gray-600 border-b w-20">Action</th>
                </tr>
              </thead>`;

const newBody = `              <tbody>
                {filteredProducts.map((product, idx) => {
                  const hasRecipe = (product.ingredient_count || 0) > 0;
                  const isLow = !hasRecipe && (product.stock_quantity || 0) <= (product.low_stock_threshold || 10);
                  const isExpanded = expandedLedgerId?.id === product.id && expandedLedgerId?.type === 'product';
                  
                  return (
                    <React.Fragment key={product.id}>
                      <tr
                        className={\`border-b hover:bg-blue-50 cursor-pointer \${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} \${isExpanded ? "bg-cyan-50/50 border-cyan-200" : ""}\`}
                        onClick={() => toggleLedger(product.id, "product")}
                      >
                        <td className="px-2 py-1 text-sm font-medium text-gray-800">
                          <span className="mr-1.5 opacity-40">{isExpanded ? "▼" : "▶"}</span>
                          {product.name}
                        </td>
                        <td className="px-2 py-1 text-gray-600 font-mono text-xs">{product.sku || "-"}</td>
                        <td className="px-2 py-1 text-gray-500">{product.category}</td>
                        <td className="px-2 py-1 text-right text-gray-600 font-bold">{formatCurrency(product.price || 0)}</td>
                        <td className={\`px-2 py-1 text-center font-bold \${hasRecipe ? "text-cyan-600 text-[9px]" : isLow ? "text-red-600" : "text-gray-800"}\`}>
                          {hasRecipe ? "MADE TO ORDER" : product.stock_quantity || 0}
                        </td>
                        <td className="px-2 py-1 text-center text-gray-500">{hasRecipe ? "—" : product.low_stock_threshold || 10}</td>
                        <td className="px-2 py-1 text-center">
                          <span className={\`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm \${hasRecipe ? "bg-blue-50 text-blue-600 border border-blue-100" : isLow ? "bg-red-100 text-red-600" : "bg-cyan-100 text-cyan-600"}\`}>
                            {hasRecipe ? "DYNAMIC" : isLow ? "LOW" : "OK"}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center">
                          {!hasRecipe && (
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => adjustStock(product.id, -1)}
                                disabled={!!adjustingStock[product.id]}
                                className="w-6 h-6 bg-red-500 text-white rounded shadow-sm hover:scale-110 active:scale-90 transition-all font-bold"
                              >-</button>
                              <button
                                type="button"
                                onClick={() => adjustStock(product.id, 1)}
                                disabled={!!adjustingStock[product.id]}
                                className="w-6 h-6 bg-cyan-600 text-white rounded shadow-sm hover:scale-110 active:scale-90 transition-all font-bold"
                              >+</button>
                            </div>
                          )}
                          {hasRecipe && <span className="text-[9px] text-gray-400 font-bold uppercase italic">Recipe Active</span>}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" className="p-0 border-b">
                            <InventoryLedger transactions={ledgerTransactions} loading={loadingLedger} unit="pc" />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>`;

const fullTableReplacement = tableHeader + "\n" + newBody;

// Search for the table inside inventory-stock
const startOfHeader = content.indexOf('<thead className="bg-gray-100 sticky top-0">');
const endOfBody = content.indexOf('</table>', startOfHeader);

if (startOfHeader !== -1 && endOfBody !== -1) {
    const beginning = content.substring(0, startOfHeader);
    const end = content.substring(endOfBody);
    const patched = beginning + fullTableReplacement + "\n            " + end;
    fs.writeFileSync('src/App.jsx', patched);
    console.log('Made to Order logic restored safely!');
} else {
    console.error('Failed to locate the table structure in App.jsx');
}
