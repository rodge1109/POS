import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Define the High-Fidelity Audit Modal JSX
const auditModalJSX = \`        {/* Audit Adjustment Modal (RESTORED) */}
        {isAdjModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-6 text-white text-center">
                <h2 className="text-xl font-black italic tracking-widest uppercase mb-1">Audit Ledger</h2>
                <p className="text-cyan-100 text-[10px] font-bold tracking-[0.1em] opacity-90 uppercase">Stock reconciliation & cost blending</p>
                <button onClick={() => setIsAdjModalOpen(false)} className="absolute top-4 right-4 hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest font-inter">Active Resource</p>
                  <p className="text-xl font-black text-gray-900 font-inter">{adjTarget?.name}</p>
                  <p className="text-xs text-cyan-600 font-bold mt-1 tracking-tight">On-hand: {adjTarget?.current_stock} {adjTarget?.unit}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest font-inter">Delta Quantity</label>
                    <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-cyan-600 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest font-inter">Inbound Cost</label>
                    <input type="number" value={adjCost} onChange={e => setAdjCost(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-cyan-700 focus:border-cyan-600 outline-none" />
                  </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest font-inter">Reconciliation Notes</label>
                    <textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Manual Audit Adjustment..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-700 focus:border-cyan-600 outline-none h-24" />
                </div>
                <button onClick={handleSubmitAdjustment} className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">Update Audit Trail</button>
              </div>
            </div>
          </div>
        )}\`;

// 2. Inject it before the last </div> of InventoryPage's return
// I'll search for the 'staff-permissions' dropdown or the end of the return statement
const endOfReturn = content.lastIndexOf('      </div>\\n    </div>\\n  );\\n}');
// Adjusting for potentially different whitespace
const pattern = /<\\/div>\\s+<\\/div>\\s+\\);\\s+\}/;
const match = content.match(pattern);
if (match) {
    // I want to inject it BEFORE the penultimate closing </div>
    const parts = content.split('      </div>\\n    </div>\\n  );\\n}');
    // This is risky for a 14k line file.
}

// Safer approach: Search for a specific place near the end of InventoryPage output
if (!content.includes('Audit Ledger')) {
  // Use a string replace on a unique area
  content = content.replace('{currentView === \\'inventory-recipes\\' && (', auditModalJSX + '\\n        {currentView === \\'inventory-recipes\\' && (');
}

fs.writeFileSync('src/App.jsx', content);
console.log('Final Audit Modal UI restoration complete.');
