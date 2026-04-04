import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Inject State
if (!content.includes('const [adjustModalData')) {
  content = content.replace(
    'const [showEditIngredientModal, setShowEditIngredientModal] = useState(false);',
    `const [showEditIngredientModal, setShowEditIngredientModal] = useState(false);\n  const [adjustModalData, setAdjustModalData] = useState(null);\n  const [adjustForm, setAdjustForm] = useState({ quantity: '', cost: '', notes: '' });`
  );
}

// 2. Modify updateInventory payload
if (!content.includes('invoice_cost')) {
  const oldUpdateFn = `  const updateInventory = async (ingredientId, quantity_change, notes) => {
    try {
      const res = await fetchWithAuth(\`\${API_URL}/inventory/adjust\`, {
        method: 'POST',
        body: JSON.stringify({ ingredient_id: ingredientId, quantity_change: parseFloat(quantity_change), notes })
      });`;
  
  const newUpdateFn = `  const updateInventory = async (ingredientId, quantity_change, notes, invoice_cost = null) => {
    try {
      const payload = { ingredient_id: ingredientId, quantity_change: parseFloat(quantity_change), notes };
      if (invoice_cost !== null && invoice_cost !== '') {
        payload.invoice_cost = parseFloat(invoice_cost);
      }
      const res = await fetchWithAuth(\`\${API_URL}/inventory/adjust\`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });`;
      
  content = content.replace(oldUpdateFn, newUpdateFn);
}

// 3. Modify Adjust button
const oldAdjustButton = `<button
                                onClick={() => {
                                  const change = prompt(\`Add/remove \${ing.name} (\${ing.unit}):\`);
                                  if (change) {
                                    const notes = prompt('Notes (optional):');
                                    updateInventory(ing.id, change, notes);
                                  }
                                }}
                                className="text-xs px-2 py-0.5 bg-blue-500 text-white hover:bg-blue-600"
                              >
                                Adjust
                              </button>`;

const newAdjustButton = `<button
                                onClick={() => {
                                  setAdjustModalData(ing);
                                  setAdjustForm({ quantity: '', cost: '', notes: '' });
                                }}
                                className="text-xs px-2 py-0.5 bg-blue-500 text-white hover:bg-blue-600"
                              >
                                Adjust
                              </button>`;

content = content.replace(oldAdjustButton, newAdjustButton);

// 4. Inject Modal immediately above the EditIngredientModal
const targetInjectPoint = '{showEditIngredientModal && editingIngredient && (';
const modalHTML = `{adjustModalData && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100]" onClick={(e) => { if (e.target === e.currentTarget) setAdjustModalData(null); }}>
            <div className="bg-white rounded-lg shadow-lg w-96 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Adjust {adjustModalData.name}</h2>
              <p className="text-xs text-gray-500 mb-4 tracking-tight leading-snug">
                Enter a positive quantity for deliveries, or negative for shrinkage. If adding stock, providing a New Unit Cost will instantly auto-calculate a Weighted Average Cost across your entire inventory.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Change ({adjustModalData.unit})</label>
                  <input
                    type="number"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                    placeholder="e.g. 50 or -5"
                    className="w-full px-4 py-2 border border-blue-200 bg-blue-50 focus:bg-white rounded-lg focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                {parseFloat(adjustForm.quantity) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Delivery Cost (Per {adjustModalData.unit})</label>
                    <div className="flex gap-2">
                       <input
                        type="number"
                        step="0.01"
                        value={adjustForm.cost}
                        onChange={(e) => setAdjustForm({ ...adjustForm, cost: e.target.value })}
                        placeholder={\`Current Cost: \${adjustModalData.cost_per_unit || 0}\`}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    placeholder="Delivery #1234 or Spoiled batch"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setAdjustModalData(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const change = parseFloat(adjustForm.quantity);
                    if (!isNaN(change) && change !== 0) {
                      updateInventory(adjustModalData.id, adjustForm.quantity, adjustForm.notes, adjustForm.cost);
                      setAdjustModalData(null);
                    } else {
                      alert('Valid quantity required');
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 shadow"
                >
                  Confirm Adjustment
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditIngredientModal && editingIngredient && (`;

if (!content.includes('adjustModalData.name')) {
  content = content.replace(targetInjectPoint, modalHTML);
}

fs.writeFileSync('src/App.jsx', content);
console.log("React Modal implementation successfully unblocked!");
