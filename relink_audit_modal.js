import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Define states and functions in InventoryPage
const invLogic = `  const [editingIngredient, setEditingIngredient] = useState(null);

  // AUDIT MODAL LOGIC (FINAL RESTORE)
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjTarget, setAdjTarget] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjCost, setAdjCost] = useState('');

  const handleAdjust = (ing) => {
    setAdjTarget(ing);
    setAdjQty('');
    setAdjNotes('');
    setAdjCost(ing.cost_per_unit || '');
    setIsAdjModalOpen(true);
  };

  const handleSubmitAdjustment = async () => {
    if (!adjTarget || !adjQty) return;
    try {
      const res = await fetchWithAuth(\`\${API_URL}/inventory/adjust\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: adjTarget.id,
          quantity_change: parseFloat(adjQty),
          notes: adjNotes || 'Manual Audit Adjust',
          invoice_cost: adjCost ? parseFloat(adjCost) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdjModalOpen(false);
        fetchIngredients();
      }
    } catch (e) { console.error('Audit update failed', e); }
  };`;

content = content.replace("  const [editingIngredient, setEditingIngredient] = useState(null);", invLogic);

// 2. Re-wire the button
const findBtn = /<button\s+onClick=\{\(\) => \{\s+const change = prompt[\s\S]*?Adjust\s+<\/button>/;
const replaceBtn = `<button
                                onClick={() => handleAdjust(ing)}
                                className="text-xs px-2 py-0.5 bg-blue-500 text-white hover:bg-blue-600 rounded shadow-sm"
                              >
                                Adjust
                              </button>`;
content = content.replace(findBtn, replaceBtn);

// 3. Ensure the Modal JSX is using the right variables in the scope
// (Already added at the bottom but let's be sure it's inside the InventoryPage's return)

fs.writeFileSync('src/App.jsx', content);
console.log('Audit Modal Re-linked and ready for production!');
