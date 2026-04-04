import fs from 'fs';
const content = fs.readFileSync('src/App.jsx', 'utf8');

// The problematic area is the end of the Edit Combo modal where tags were truncated.
// It should end with:
//               </div> {/* Closing the Image section */}
//               {/* Other fields like Items Included, Active checkbox would've been here */}
//             </form>
//           </div>
//         </div>
//       )}

const badPart = `                )}
              </div>
      )}
    </div>`;

const goodRestoration = `                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items Included *</label>
                <div className="space-y-2">
                  {comboFormData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateComboItem(index, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
                      >
                        <option value="">Select product...</option>
                        {regularProducts.map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                      <button onClick={(e) => { e.preventDefault(); removeComboItem(index); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                  ))}
                  <button onClick={(e) => { e.preventDefault(); addComboItem(); }} className="text-cyan-600 text-xs font-bold uppercase tracking-widest">+ Add Item</button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="comboActive"
                  checked={comboFormData.active}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 rounded"
                />
                <label htmlFor="comboActive" className="text-sm font-medium text-gray-700">Active (Show in POS)</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-500 font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-cyan-200"
                >
                  {editingCombo ? 'Update Combo' : 'Create Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}`;

const patched = content.replace(badPart, goodRestoration);
fs.writeFileSync('src/App.jsx', patched);
console.log('JSX Build error fixed and Combo Modal restored!');
