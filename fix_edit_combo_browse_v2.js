import fs from 'fs';
const content = fs.readFileSync('src/App.jsx', 'utf8');

// The block actually starts with '              <div>' followed by line 8313 label
const oldBlock = `              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={comboFormData.image}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="e.g., assets/images/food/combo.png"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                {comboFormData.image && (
                  <div className="mt-2">
                    <img
                      src={comboFormData.image}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>`;

const newBlock = `              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combo Media Assets</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      readOnly
                      value={comboFormData.image || ''}
                      placeholder="No image selected"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-500 font-mono italic"
                    />
                  </div>
                  <label className="shrink-0 cursor-pointer bg-cyan-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-cyan-700 transition-all shadow-md active:scale-95">
                    Browse
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setComboFormData(prev => ({ ...prev, image: file.name }));
                        }
                      }}
                    />
                  </label>
                </div>
                {comboFormData.image && (
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
              </div>`;

// Manual find and replace to avoid invisible char issues
const target = 'label className="block text-sm font-medium text-gray-700 mb-1">Image URL';
if (content.includes(target)) {
    // We replace the outer div containing this label
    const startDiv = content.lastIndexOf('<div>', content.indexOf(target));
    const endDiv = content.indexOf('</div>', content.indexOf('onError', startDiv)) + 12; // Including closing parent div
    
    // Safety check - let's just use a string replace on a larger unique block
    let patched = content.replace(oldBlock, newBlock);
    if (patched === content) {
        // Falling back to a regex if literal match fails
        const regex = /<div>\s+<label[^>]*>Image URL<\/label>[\s\S]*?<\/div>\s+<\/div>/;
        patched = content.replace(regex, newBlock);
    }
    
    fs.writeFileSync('src/App.jsx', patched);
    console.log('Edit Combo Browse system restored successfully!');
} else {
    console.error('Target Edit Combo block label not found in App.jsx');
}
