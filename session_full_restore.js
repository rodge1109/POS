import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Re-implement the Inventory Adjustment Modal Logic in InventoryPage
// Find the states in InventoryPage
const invStates = `  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjTarget, setAdjTarget] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjCost, setAdjCost] = useState('');`;

if (!content.includes('const [isAdjModalOpen')) {
  content = content.replace(
    "const [ingredients, setIngredients] = useState([]);",
    "const [ingredients, setIngredients] = useState([]);\n" + invStates
  );
}

// 2. Re-implement the handleAdjust with the Modal instead of prompt
const handleAdjustNew = `  const handleAdjust = (ing) => {
    setAdjTarget(ing);
    setAdjQty('');
    setAdjNotes('');
    setAdjCost(ing.unit_cost || '');
    setIsAdjModalOpen(true);
  };`;

content = content.replace(/const handleAdjust = \(ing\) => \{[\s\S]*?\};/, handleAdjustNew);

// 3. Add the handleSubmitAdjustment function
const handleSubmitAdj = `  const handleSubmitAdjustment = async () => {
    if (!adjTarget || !adjQty) return;
    try {
      const resp = await fetch(\`\${API_BASE}/inventory/adjust\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: adjTarget.id,
          quantity_change: parseFloat(adjQty),
          notes: adjNotes || 'Manual Adjustment',
          invoice_cost: adjCost ? parseFloat(adjCost) : null
        })
      });
      if (resp.ok) {
        setIsAdjModalOpen(false);
        fetchInventory();
      }
    } catch (e) { console.error('Adj failed', e); }
  };`;

if (!content.includes('const handleSubmitAdjustment')) {
  content = content.replace(handleAdjustNew, handleAdjustNew + '\n\n' + handleSubmitAdj);
}

// 4. Add the Adjustment Modal UI at the bottom of InventoryPage
const adjModalJSX = `        {/* Adjustment Modal */}
        {isAdjModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-6 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black italic tracking-widest uppercase mb-1">Audit Ledger</h2>
                  <button onClick={() => setIsAdjModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-cyan-100 text-xs font-bold font-inter tracking-[0.1em] opacity-90 uppercase">Stock reconciliation & weighted cost blending</p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Active Resource</p>
                  <p className="text-xl font-black text-gray-900 font-inter">{adjTarget?.name}</p>
                  <p className="text-xs text-cyan-600 font-bold mt-1 tracking-tight">On-hand: {adjTarget?.quantity} {adjTarget?.unit}</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] text-amber-700 font-black uppercase mb-1">Strategic Note</p>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed font-inter">Enter positive for deliveries, negative for shrinkage. New unit costs will instantly blending into Weighted Average Cost.</p>
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
                    <textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="e.g. New delivery from supplier..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-700 focus:border-cyan-600 outline-none h-24" />
                </div>
                <button onClick={handleSubmitAdjustment} className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm">Update Audit Trail</button>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace('{/* Legend Section - Professional Bottom */}', adjModalJSX + '\n        {/* Legend Section - Professional Bottom */}');

fs.writeFileSync('src/App.jsx', content);
console.log('Core Session Features (Modal, WAC logic) fully restored!');
