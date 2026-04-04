import fs from 'fs';
const content = fs.readFileSync('src/App.jsx', 'utf8');

// The restoration block
const modalRestoration = `                {comboFormData.image && (
                  <div className="mt-3 flex items-center gap-3 p-1.5 bg-gray-50 rounded-xl border border-gray-100 animate-fadeIn">
                    <img
                      src={comboFormData.image.startsWith('http') || comboFormData.image.startsWith('assets') || comboFormData.image.startsWith('/') 
                        ? comboFormData.image 
                        : \`/assets/images/food/\${comboFormData.image}\`}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="flex flex-col">
                      <p className="text-[10px] text-cyan-600 font-black uppercase tracking-widest">Asset Ready</p>
                      <p className="text-[9px] text-gray-400 font-bold max-w-[150px] truncate">{comboFormData.image}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-bold uppercase tracking-tight text-[11px]">Items Included *</label>
                <div className="space-y-2">
                  {comboFormData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateComboItem(index, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm bg-white"
                      >
                        <option value="">Select product...</option>
                        {regularProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.sizes ? '(Multi-size)' : \`- Php \${product.price?.toFixed(2)}\`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateComboItem(index, 'quantity', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm text-center"
                      />
                      <button 
                        type="button"
                        onClick={() => removeComboItem(index)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addComboItem}
                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-[10px] font-black uppercase tracking-widest hover:border-cyan-400 hover:text-cyan-600 transition-all"
                  >
                    + Add Product To Package
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="comboActive"
                  checked={comboFormData.active}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="comboActive" className="text-sm font-medium text-gray-700">Active (Show in POS)</label>
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-black text-xs text-gray-500 uppercase tracking-widest hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-cyan-700 shadow-lg shadow-cyan-200 active:scale-95 transition-all"
                >
                  {editingCombo ? 'Save Changes' : 'Create Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}`;

// Robust search for the truncated area
const problemLine = 'src={comboFormData.image.startsWith';
const startIdx = content.lastIndexOf('                {comboFormData.image && (', content.indexOf(problemLine));
const endIdx = content.indexOf('</div>', content.indexOf(')}', startIdx)) + 26; // Covers the } )} </div> </div> closing

const targetSubstr = content.substring(startIdx, endIdx);
const patched = content.replace(targetSubstr, modalRestoration);

if (patched !== content) {
    fs.writeFileSync('src/App.jsx', patched);
    console.log('RECOVERY SUCCESSFUL');
} else {
    console.error('FAILED TO RECOVER');
}
