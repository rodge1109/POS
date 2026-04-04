import fs from 'fs';
const content = fs.readFileSync('src/App.jsx', 'utf8');

const modalJSX = `        {/* Audit Adjustment Modal (ACTUAL RESTORE) */}
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Active Resource</p>
                  <p className="text-xl font-black text-gray-900">{adjTarget?.name}</p>
                  <p className="text-xs text-cyan-600 font-bold mt-1 tracking-tight">On-hand: {adjTarget?.current_stock} {adjTarget?.unit}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Delta Quantity</label>
                    <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-cyan-600 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Inbound Cost</label>
                    <input type="number" value={adjCost} onChange={e => setAdjCost(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-cyan-700 focus:border-cyan-600 outline-none" />
                  </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Reconciliation Notes</label>
                    <textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Manual Audit Adjustment..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-700 focus:border-cyan-600 outline-none h-24" />
                </div>
                <button onClick={handleSubmitAdjustment} className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">Update Audit Trail</button>
              </div>
            </div>
          </div>
        )}`;

const target = "{currentView === 'inventory-recipes' && (";
const newContent = content.replace(target, modalJSX + "\n\n        " + target);

fs.writeFileSync('src/App.jsx', newContent);
console.log('Audit Modal UI restoration finalized!');
