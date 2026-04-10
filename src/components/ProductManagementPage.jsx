import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Trash2, Upload, X, UtensilsCrossed } from 'lucide-react';
import { API_URL, fetchWithAuth } from '../App';

// Product Management Page
function ProductManagementPage({ menuData, refreshProducts, currentView, categories }) {
  const [activeTab, setActiveTab] = useState('products'); // products | combos | categories | modifiers | pricing
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pizza',
    price: '',
    description: '',
    image: '',
    popular: false,
    sku: '',
    barcode: '',
    sizes: [],
    active: true,
    stock_quantity: 0,
    low_stock_threshold: 10,
    send_to_kitchen: true,
    cost: ''
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [hasSizes, setHasSizes] = useState(false);
  const [selectedModifierIds, setSelectedModifierIds] = useState([]);
  const productModalRef = useRef(null);
  const productModalDragRef = useRef({ offsetX: 0, offsetY: 0 });
  const csvInputRef = useRef(null);
  const [productModalPos, setProductModalPos] = useState({ x: 24, y: 24 });
  const [isDraggingProductModal, setIsDraggingProductModal] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [modifiers, setModifiers] = useState([]);
  const [modifierForm, setModifierForm] = useState({ name: '', type: 'addon', price: '', active: true });
  const [pricingCategory, setPricingCategory] = useState('All');
  const [priceAdjustType, setPriceAdjustType] = useState('percent');
  const [priceAdjustValue, setPriceAdjustValue] = useState('');
  const [pricingSaving, setPricingSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [bulkDeleteState, setBulkDeleteState] = useState({ running: false, total: 0, done: 0, current: '' });

  const handlePhotoUpload = async (file, type = 'product') => {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Max 5MB allowed.');
      return;
    }

    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const response = await fetchWithAuth(`${API_URL}/upload`, {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64data,
            contentType: file.type
          })
        });

        const result = await response.json();
        if (result.success) {
          if (type === 'combo') {
            setComboFormData(prev => ({ ...prev, image: result.url }));
          } else {
            setFormData(prev => ({ ...prev, image: result.url }));
          }
        } else {
          alert('Upload failed: ' + result.error);
        }
        setImageUploading(false);
      };
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload image. Please check your connection.');
      setImageUploading(false);
    }
  };


  // Combo states
  const [combos, setCombos] = useState([]);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboFormData, setComboFormData] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    active: true,
    items: []
  });

  // Fetch combos (with ?all=true to include inactive for management)
  const fetchCombos = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/combos?all=true`);
      const data = await response.json();
      if (data.success) {
        setCombos(data.combos);
      }
    } catch (error) {
      console.error('Error fetching combos:', error);
    }
  };

  const fetchModifiers = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/modifiers?all=true`);
      const data = await response.json();
      if (response.ok && data.success) {
        setModifiers(data.modifiers || []);
      } else {
        throw new Error(data.error || 'Failed to load modifiers');
      }
    } catch (error) {
      console.error('Error fetching modifiers:', error);
      alert('Unable to load modifiers from server.');
    }
  };

  useEffect(() => {
    fetchCombos();
    fetchModifiers();
  }, []);

  useEffect(() => {
    if (currentView === 'menu-categories') setActiveTab('categories');
    else if (currentView === 'menu-modifiers') setActiveTab('modifiers');
    else if (currentView === 'menu-pricing') setActiveTab('pricing');
    else if (currentView === 'products') setActiveTab('products');
  }, [currentView]);


  useEffect(() => {
    if (activeTab === 'modifiers') {
      fetchModifiers();
    }
  }, [activeTab]);

  useEffect(() => {
    const validIds = new Set(regularProducts.map(p => String(p.id)));
    setSelectedProductIds(prev => prev.filter(id => validIds.has(String(id))));
  }, [menuData]);

  // Calculate low stock count from products
  useEffect(() => {
    const count = menuData.filter(p => !p.isCombo && p.stock_quantity <= p.low_stock_threshold).length;
    setLowStockCount(count);
  }, [menuData]);

  // Get only regular products (not combos)
  const regularProducts = menuData.filter(item => !item.isCombo);

  const filteredProducts = regularProducts.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const isAllFilteredSelected = filteredProducts.length > 0 &&
    filteredProducts.every(p => selectedProductIds.includes(String(p.id)));

  // Combo handlers
  const openAddComboModal = () => {
    setEditingCombo(null);
    setComboFormData({
      name: '',
      description: '',
      price: '',
      image: '',
      active: true,
      items: [{ product_id: '', quantity: 1, size_name: '' }]
    });
    setShowComboModal(true);
  };

  const openEditComboModal = (combo) => {
    setEditingCombo(combo);
    setComboFormData({
      name: combo.name,
      description: combo.description || '',
      price: combo.price,
      image: combo.image || '',
      active: combo.active !== false,
      items: combo.items.length > 0 ? combo.items : [{ product_id: '', quantity: 1, size_name: '' }]
    });
    setShowComboModal(true);
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: comboFormData.name,
      description: comboFormData.description,
      price: parseFloat(comboFormData.price),
      image: comboFormData.image,
      active: comboFormData.active,
      items: comboFormData.items.filter(item => item.product_id)
    };

    if (payload.items.length === 0) {
      alert('Please add at least one item to the combo');
      return;
    }

    try {
      const url = editingCombo
        ? `${API_URL}/combos/${editingCombo.id}`
        : `${API_URL}/combos`;

      const response = await fetchWithAuth(url, {
        method: editingCombo ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingCombo ? 'Combo updated!' : 'Combo created!');
        setShowComboModal(false);
        fetchCombos();
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving combo:', error);
      alert('Error saving combo');
    }
  };

  const handleDeleteCombo = async (combo) => {
    if (!confirm(`Delete combo "${combo.name}"?`)) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/combos/${combo.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('Combo deleted');
        fetchCombos();
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting combo:', error);
      alert('Error deleting combo');
    }
  };

  const addComboItem = () => {
    setComboFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, size_name: '' }]
    }));
  };

  const updateComboItem = (index, field, value) => {
    setComboFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: field === 'quantity' ? parseInt(value) || 1 : value } : item
      )
    }));
  };

  const removeComboItem = (index) => {
    setComboFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getDefaultProductModalPos = () => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const modalWidth = Math.min(512, window.innerWidth - 32);
    const estimatedModalHeight = 720;
    const centeredX = Math.max(8, (window.innerWidth - modalWidth) / 2);
    const centeredY = Math.max(8, (window.innerHeight - estimatedModalHeight) / 2 - 150);
    return { x: centeredX, y: centeredY };
  };

  const startProductModalDrag = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button,input,select,textarea,label,a')) return;
    productModalDragRef.current = {
      offsetX: e.clientX - productModalPos.x,
      offsetY: e.clientY - productModalPos.y
    };
    setIsDraggingProductModal(true);
  };

  useEffect(() => {
    if (!isDraggingProductModal) return;

    const onMouseMove = (e) => {
      const modalRect = productModalRef.current?.getBoundingClientRect();
      const modalWidth = modalRect?.width || 512;
      const modalHeight = modalRect?.height || 720;
      const minX = 8;
      const minY = 8;
      const maxX = Math.max(minX, window.innerWidth - modalWidth - 8);
      const maxY = Math.max(minY, window.innerHeight - modalHeight - 8);

      const nextX = Math.min(maxX, Math.max(minX, e.clientX - productModalDragRef.current.offsetX));
      const nextY = Math.min(maxY, Math.max(minY, e.clientY - productModalDragRef.current.offsetY));
      setProductModalPos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => setIsDraggingProductModal(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingProductModal]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Pizza',
      price: '',
      description: '',
      image: '',
      popular: false,
      sku: '',
      barcode: '',
      sizes: [],
      active: true,
      stock_quantity: 0,
      low_stock_threshold: 10,
      send_to_kitchen: true,
      cost: ''
    });
    setHasSizes(false);
    setSelectedModifierIds([]);
    setProductModalPos(getDefaultProductModalPos());
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price || '',
      description: product.description || '',
      image: product.image || '',
      popular: product.popular || false,
      sku: product.sku || '',
      barcode: product.barcode || '',
      active: product.active !== false,
      stock_quantity: product.stock_quantity || 0,
      low_stock_threshold: product.low_stock_threshold || 10,
      send_to_kitchen: product.send_to_kitchen !== false,
      cost: product.cost || '',
      sizes: product.sizes ? product.sizes.map(s => ({ ...s, cost: s.cost || 0 })) : []
    });
    setHasSizes(product.sizes && product.sizes.length > 0);
    setSelectedModifierIds(product.modifier_ids || []);
    setProductModalPos(getDefaultProductModalPos());
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (productSaving) return;

    // Filter out incomplete size rows (missing name or price) and coerce to numbers
    const validSizes = hasSizes
      ? formData.sizes
          .filter(s => s.name?.trim() && s.price !== '' && s.price !== null && s.price !== undefined && !isNaN(parseFloat(s.price)))
          .map(s => ({
            name: s.name.trim(),
            price: parseFloat(s.price),
            cost: parseFloat(s.cost) || 0
          }))
      : null;

    if (hasSizes && (!validSizes || validSizes.length === 0)) {
      alert('Please enter at least one size with a valid name and price.');
      return;
    }

    const payload = {
      name: formData.name,
      category: formData.category,
      price: hasSizes ? null : parseFloat(formData.price) || null,
      modifier_ids: selectedModifierIds,
      description: formData.description,
      image: formData.image,
      popular: formData.popular,
      sku: formData.sku?.trim() || null,
      barcode: formData.barcode || null,
      sizes: validSizes,
      active: formData.active,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
      send_to_kitchen: formData.send_to_kitchen,
      cost: parseFloat(formData.cost) || 0
    };

    setProductSaving(true);
    try {
      const url = editingProduct
        ? `${API_URL}/products/${editingProduct.id}`
        : `${API_URL}/products`;

      const response = await fetchWithAuth(url, {
        method: editingProduct ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingProduct ? 'Product updated!' : 'Product created!');
        setShowModal(false);
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    } finally {
      setProductSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/products/${product.id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('Product deleted');
        refreshProducts();
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const toggleProductSelection = (productId) => {
    const id = String(productId);
    setSelectedProductIds(prev => (
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    ));
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredProducts.map(p => String(p.id)));
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
      return;
    }
    const filteredIds = filteredProducts.map(p => String(p.id));
    setSelectedProductIds(prev => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleBulkDelete = async () => {
    const targets = regularProducts.filter(p => selectedProductIds.includes(String(p.id)));
    if (targets.length === 0) {
      alert('No products selected.');
      return;
    }
    if (!confirm(`Delete ${targets.length} selected product(s)? This cannot be undone.`)) return;

    setBulkDeleteState({ running: true, total: targets.length, done: 0, current: '' });
    let success = 0;
    const failures = [];

    for (let i = 0; i < targets.length; i++) {
      const product = targets[i];
      setBulkDeleteState({ running: true, total: targets.length, done: i, current: product.name });
      try {
        const response = await fetchWithAuth(`${API_URL}/products/${product.id}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
          success += 1;
        } else {
          failures.push(`${product.name}: ${result.error || 'delete failed'}`);
        }
      } catch (error) {
        failures.push(`${product.name}: ${error.message}`);
      }
    }

    setBulkDeleteState({ running: true, total: targets.length, done: targets.length, current: '' });
    await refreshProducts();
    setSelectedProductIds([]);
    setBulkDeleteState({ running: false, total: 0, done: 0, current: '' });

    if (failures.length > 0) {
      const preview = failures.slice(0, 5).join('\n');
      alert(`Bulk delete done.\nDeleted: ${success}\nFailed: ${failures.length}\n\n${preview}`);
    } else {
      alert(`Bulk delete complete. Deleted ${success} product(s).`);
    }
  };

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', price: '', cost: '' }]
    }));
  };

  const updateSize = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) =>
        i === index ? { ...size, [field]: (field === 'price' || field === 'cost') ? parseFloat(value) || '' : value } : size
      )
    }));
  };

  const removeSize = (index) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    
    // Check if category already exists in the global categories list
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert('Category already exists.');
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewCategoryName('');
        await refreshProducts(); // This will trigger fetchCategories in App
      } else {
        throw new Error(data.error || 'Failed to add category');
      }
    } catch (e) {
      console.error('Error adding category:', e);
      alert(e.message || 'Failed to add category');
    }
  };

  const renameCategory = async () => {
    if (!renameFrom || !renameTo.trim()) return;
    const to = renameTo.trim();
    if (renameFrom.toLowerCase() === to.toLowerCase()) return;

    setCategorySaving(true);
    try {
      // Use the optimized backend endpoint for renaming categories and updating products
      const res = await fetchWithAuth(`${API_URL}/categories/rename`, {
        method: 'PUT',
        body: JSON.stringify({ from: renameFrom, to })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to rename category');
      }

      await refreshProducts();
      alert(`Category renamed successfully. ${data.updatedProducts || 0} products moved.`);
      setRenameFrom('');
      setRenameTo('');
    } catch (e) {
      console.error('Error renaming category:', e);
      alert(e.message || 'Failed to rename category');
    } finally {
      setCategorySaving(false);
    }
  };

  const addModifier = async () => {
    const name = modifierForm.name.trim();
    const price = Number(modifierForm.price || 0);
    if (!name) return;
    if (!Number.isFinite(price)) {
      alert('Modifier price is invalid.');
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/modifiers`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          type: modifierForm.type,
          price,
          active: !!modifierForm.active
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create modifier');
      }
      await fetchModifiers();
      setModifierForm({ name: '', type: 'addon', price: '', active: true });
    } catch (e) {
      console.error('Error creating modifier:', e);
      alert(e.message || 'Failed to create modifier');
    }
  };

  const removeModifier = async (id) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/modifiers/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete modifier');
      }
      await fetchModifiers();
    } catch (e) {
      console.error('Error deleting modifier:', e);
      alert(e.message || 'Failed to delete modifier');
    }
  };

  const toggleModifier = async (id) => {
    const mod = modifiers.find(m => m.id === id);
    if (!mod) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/modifiers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !mod.active })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update modifier');
      }
      await fetchModifiers();
    } catch (e) {
      console.error('Error updating modifier:', e);
      alert(e.message || 'Failed to update modifier');
    }
  };

  const applyPricingAdjustment = async () => {
    const raw = Number(priceAdjustValue);
    if (!Number.isFinite(raw) || raw === 0) {
      alert('Enter a valid price adjustment value.');
      return;
    }

    const targets = regularProducts.filter(p => pricingCategory === 'All' || p.category === pricingCategory);
    if (targets.length === 0) {
      alert('No products matched the selected category.');
      return;
    }

    setPricingSaving(true);
    try {
      let updated = 0;
      for (const product of targets) {
        const scale = priceAdjustType === 'percent' ? (1 + raw / 100) : null;
        const adjust = (v) => {
          const n = Number(v || 0);
          if (!Number.isFinite(n)) return 0;
          const next = priceAdjustType === 'percent' ? n * scale : n + raw;
          return Math.max(0, Number(next.toFixed(2)));
        };

        const nextSizes = Array.isArray(product.sizes) && product.sizes.length > 0
          ? product.sizes.map(s => ({ ...s, price: adjust(s.price) }))
          : null;

        const nextPrice = nextSizes ? null : adjust(product.price);

        const payload = {
          name: product.name,
          category: product.category,
          price: nextPrice,
          description: product.description || '',
          image: product.image || '',
          popular: !!product.popular,
          sku: product.sku || null,
          barcode: product.barcode || null,
          sizes: nextSizes,
          active: product.active !== false,
          stock_quantity: parseInt(product.stock_quantity || 0, 10),
          low_stock_threshold: parseInt(product.low_stock_threshold || 10, 10),
          send_to_kitchen: product.send_to_kitchen !== false,
          cost: product.cost || 0
        };

        const res = await fetchWithAuth(`${API_URL}/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) updated++;
      }

      await refreshProducts();
      alert(`Pricing updated for ${updated}/${targets.length} products.`);
      setPriceAdjustValue('');
    } catch (e) {
      console.error('Error applying pricing:', e);
      alert('Failed to apply pricing update.');
    } finally {
      setPricingSaving(false);
    }
  };

  const parseCsvLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const normalizeCsvBoolean = (v, fallback) => {
    if (v === undefined || v === null || String(v).trim() === '') return fallback;
    const raw = String(v).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(raw)) return true;
    if (['false', '0', 'no', 'n'].includes(raw)) return false;
    return fallback;
  };

  const downloadCsvTemplate = () => {
    const header = [
      'name',
      'category',
      'price',
      'sku',
      'barcode',
      'stock_quantity',
      'low_stock_threshold',
      'description',
      'image',
      'active',
      'popular',
      'send_to_kitchen',
      'cost'
    ];
    const sampleRow = [
      'Classic Burger',
      'Burgers',
      '159.00',
      'BRG-001',
      '1234567890123',
      '25',
      '10',
      'Beef patty with lettuce and tomato',
      'assets/images/food/burger.jpg',
      'true',
      'false',
      'true',
      '85.00'
    ];
    const csv = `${header.join(',')}\n${sampleRow.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProductsFromCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    try {
      const raw = await file.text();
      const lines = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert('CSV file has no data rows.');
        return;
      }

      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      const requiredHeaders = ['name', 'category', 'price'];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        alert(`Missing required column(s): ${missing.join(', ')}`);
        return;
      }

      let successCount = 0;
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (row.length === 1 && !row[0]) continue;

        const getVal = (key) => {
          const idx = headers.indexOf(key);
          return idx >= 0 ? (row[idx] ?? '') : '';
        };

        const name = getVal('name');
        const category = getVal('category');
        const price = parseFloat(getVal('price'));

        if (!name || !category || !Number.isFinite(price)) {
          errors.push(`Row ${i + 1}: invalid name/category/price`);
          continue;
        }

        const payload = {
          name,
          category,
          price,
          sku: getVal('sku') || null,
          barcode: getVal('barcode') || null,
          stock_quantity: parseInt(getVal('stock_quantity'), 10) || 0,
          low_stock_threshold: parseInt(getVal('low_stock_threshold'), 10) || 10,
          description: getVal('description') || '',
          image: getVal('image') || '',
          active: normalizeCsvBoolean(getVal('active'), true),
          popular: normalizeCsvBoolean(getVal('popular'), false),
          send_to_kitchen: normalizeCsvBoolean(getVal('send_to_kitchen'), true),
          cost: parseFloat(getVal('cost')) || 0,
          sizes: null
        };

        try {
          const response = await fetchWithAuth(`${API_URL}/products`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.success) {
            successCount++;
          } else {
            errors.push(`Row ${i + 1}: ${result.error || 'failed to create product'}`);
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      await refreshProducts();

      if (errors.length > 0) {
        const preview = errors.slice(0, 5).join('\n');
        alert(`CSV import done.\nSuccess: ${successCount}\nFailed: ${errors.length}\n\n${preview}`);
      } else {
        alert(`CSV import complete. ${successCount} products added.`);
      }
    } catch (error) {
      console.error('CSV import error:', error);
      alert(`Failed to import CSV: ${error.message}`);
    } finally {
      setCsvImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen pt-10 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Product Management</h1>
              {lowStockCount > 0 && (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  ⚠️ {lowStockCount} Low Stock
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {activeTab === 'products' && (
                <>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={importProductsFromCsv}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    Download CSV Template
                  </button>
                  <button
                    type="button"
                    disabled={csvImporting}
                    onClick={() => csvInputRef.current?.click()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {csvImporting ? 'Importing...' : 'Upload CSV'}
                  </button>
                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteState.running}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {bulkDeleteState.running
                        ? `Deleting ${bulkDeleteState.done}/${bulkDeleteState.total}...`
                        : `Delete Selected (${selectedProductIds.length})`}
                    </button>
                  )}
                </>
              )}
              {activeTab === 'products' && (
                <button
                  onClick={openAddModal}
                  className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </button>
              )}
              {activeTab === 'combos' && (
                <button
                  onClick={openAddComboModal}
                  className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Combo
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'products', label: 'Products' },
              { id: 'combos', label: 'Combos' },
              { id: 'categories', label: 'Categories' },
              { id: 'modifiers', label: 'Modifiers' },
              { id: 'pricing', label: 'Pricing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'products' && (
          <>
            {bulkDeleteState.running && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-cyan-100">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="font-medium text-cyan-700">
                    Deleting products... {bulkDeleteState.done}/{bulkDeleteState.total}
                  </span>
                  <span className="text-gray-500 truncate ml-3 max-w-[60%]">{bulkDeleteState.current}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 transition-all"
                    style={{ width: `${bulkDeleteState.total ? (bulkDeleteState.done / bulkDeleteState.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full font-data-table">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-center px-3 py-3 text-sm font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="w-4 h-4 accent-cyan-600 cursor-pointer"
                          title="Select all in current filter"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Price</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Barcode</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Stock</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(String(product.id))}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-4 h-4 accent-cyan-600 cursor-pointer"
                            title={`Select ${product.name}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
                              {product.image && (product.image.startsWith('http') || product.image.startsWith('assets/') || product.image.startsWith('/')) ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                  {product.image && product.image.length < 5 ? (
                                    <span className="text-lg">{product.image}</span>
                                  ) : (
                                    <UtensilsCrossed className="w-5 h-5 opacity-40" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{product.name}</p>
                              {product.popular && (
                                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Popular</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{product.category}</td>
                        <td className="px-4 py-3">
                          {product.sizes ? (
                            <span className="text-gray-600 text-sm">
                              Php {Math.min(...product.sizes.map(s => s.price)).toFixed(2)} - {Math.max(...product.sizes.map(s => s.price)).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-800 font-medium">Php {product.price?.toFixed(2) || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${product.barcode ? 'text-gray-800' : 'text-gray-400'}`}>
                            {product.barcode || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {product.ingredient_count > 0 ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Composite
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.stock_quantity <= product.low_stock_threshold
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                              }`}>
                              {product.stock_quantity}
                              {product.stock_quantity <= product.low_stock_threshold && ' ⚠️'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${product.active !== false ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                            {product.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              disabled={bulkDeleteState.running}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Combos Tab */}
        {activeTab === 'combos' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Combo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Items Included</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Price</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {combos.map(combo => (
                    <tr key={combo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {combo.image ? (
                            <img
                              src={combo.image}
                              alt={combo.name}
                              className="w-12 h-12 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                                e.target.parentElement.innerHTML = `<div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center"><span class="text-cyan-600 font-bold text-sm">C${combo.id}</span></div>`;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                              <span className="text-cyan-600 font-bold text-sm">C{combo.id}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{combo.name}</p>
                            {combo.description && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">{combo.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {combo.items.map((item, idx) => (
                          <span key={idx}>
                            {item.quantity}x {item.product_name}{item.size_name ? ` (${item.size_name})` : ''}
                            {idx < combo.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-cyan-600 font-bold">Php {combo.price.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${combo.active !== false ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                          {combo.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditComboModal(combo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCombo(combo)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {combos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No combos yet. Click "Add Combo" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Category</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Rename Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={renameFrom}
                  onChange={(e) => setRenameFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select category</option>
                  {categories.filter(c => c !== 'All' && c !== 'Combos').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={renameTo}
                  onChange={(e) => setRenameTo(e.target.value)}
                  placeholder="New category name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  disabled={categorySaving}
                  onClick={renameCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {categorySaving ? 'Saving...' : 'Apply Rename'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Current Categories</h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {categories.filter(c => c !== 'All' && c !== 'Combos').map(cat => (
                  <span key={cat} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modifiers Tab */}
        {activeTab === 'modifiers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Modifier</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={modifierForm.name}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Modifier name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={modifierForm.type}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, type: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="addon">Add-on</option>
                  <option value="option">Option</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={modifierForm.price}
                  onChange={(e) => setModifierForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Price"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addModifier}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Save Modifier
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Modifiers are stored in database.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Type</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Price</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modifiers.map(mod => (
                    <tr key={mod.id}>
                      <td className="px-4 py-3 text-gray-800">{mod.name}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{mod.type}</td>
                      <td className="px-4 py-3 text-right text-gray-700">Php {Number(mod.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${mod.active ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                          {mod.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => toggleModifier(mod.id)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            Toggle
                          </button>
                          <button type="button" onClick={() => removeModifier(mod.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {modifiers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No modifiers yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Bulk Pricing Update</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  value={pricingCategory}
                  onChange={(e) => setPricingCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="All">All Categories</option>
                  {categories.filter(c => c !== 'All' && c !== 'Combos').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={priceAdjustType}
                  onChange={(e) => setPriceAdjustType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed Amount (Php)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={priceAdjustValue}
                  onChange={(e) => setPriceAdjustValue(e.target.value)}
                  placeholder={priceAdjustType === 'percent' ? 'e.g. 5 or -5' : 'e.g. 10 or -10'}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  disabled={pricingSaving}
                  onClick={applyPricingAdjustment}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-60"
                >
                  {pricingSaving ? 'Applying...' : 'Apply Pricing'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Updates regular prices and size prices for matched products.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full font-data-table">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Product</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Current Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {regularProducts
                    .filter(p => pricingCategory === 'All' || p.category === pricingCategory)
                    .slice(0, 100)
                    .map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600">{p.category}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {Array.isArray(p.sizes) && p.sizes.length > 0
                            ? `Php ${Math.min(...p.sizes.map(s => Number(s.price || 0))).toFixed(2)} - ${Math.max(...p.sizes.map(s => Number(s.price || 0))).toFixed(2)}`
                            : `Php ${Number(p.price || 0).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[90]">
          <div
            ref={productModalRef}
            className={`absolute bg-white rounded-xl shadow-2xl w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-16px)] overflow-hidden flex flex-col ${isDraggingProductModal ? 'cursor-grabbing' : ''}`}
            style={{ left: `${productModalPos.x}px`, top: `${productModalPos.y}px` }}
          >
            <div 
              className="p-6 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10 cursor-grab active:cursor-grabbing"
              onMouseDown={startProductModalDrag}
            >
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Product Information & Inventory</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {productSaving && (
              <div className="px-6 py-2 bg-cyan-50 border-b border-cyan-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-cyan-700 font-medium">Saving product...</span>
                  <span className="text-cyan-600">Please wait</span>
                </div>
                <div className="w-full h-1.5 bg-cyan-100 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-cyan-600 animate-pulse"></div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto scrollbar-hide min-h-0 bg-white">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  >
                    {categories.filter(c => c !== 'All' && c !== 'Combos').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    placeholder="Scan or enter barcode"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 col-span-2">
                  <input
                    type="checkbox"
                    id="hasSizes"
                    checked={hasSizes}
                    onChange={(e) => {
                      setHasSizes(e.target.checked);
                      if (e.target.checked && formData.sizes.length === 0) {
                        setFormData(prev => ({ ...prev, sizes: [{ name: 'Small', price: '', cost: '' }, { name: 'Medium', price: '', cost: '' }, { name: 'Large', price: '', cost: '' }] }));
                      }
                    }}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <label htmlFor="hasSizes" className="text-sm font-medium text-gray-700">
                    Has multiple sizes (e.g., Small/Medium/Large)
                  </label>
                </div>

                {hasSizes ? (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sizes & Prices *</label>
                    <div className="space-y-2">
                      {formData.sizes.map((size, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Size name"
                            value={size.name}
                            onChange={(e) => updateSize(index, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={size.price}
                            onChange={(e) => updateSize(index, 'price', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cost"
                            value={size.cost}
                            onChange={(e) => updateSize(index, 'cost', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeSize(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addSize}
                      className="mt-2 text-cyan-600 text-sm font-medium hover:text-cyan-700"
                    >
                      + Add Size
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      required={!hasSizes}
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (Php)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Foundational for profit tracking</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Photo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="assets/images/food/..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                    />
                    <label className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-cyan-50 border border-gray-200 cursor-pointer transition-all group" title="Browse Photo">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handlePhotoUpload(e.target.files[0], 'product')}
                        disabled={imageUploading}
                      />
                      {imageUploading ? (
                        <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500 group-hover:text-cyan-600" />
                      )}
                    </label>
                  </div>
                  {formData.image && (
                    <div className="mt-2 relative inline-block group">
                      <img src={formData.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-100 shadow-sm transition-transform group-hover:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                      {editingProduct && editingProduct.ingredient_count > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded tracking-wider uppercase font-bold">Menu Composite</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      disabled={editingProduct && editingProduct.ingredient_count > 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    {editingProduct && editingProduct.ingredient_count > 0 && (
                      <p className="text-[11px] text-gray-500 mt-1 italic">Calculated automatically via recipes. Check Raw Materials.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      disabled={editingProduct && editingProduct.ingredient_count > 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="popular"
                      checked={formData.popular}
                      onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <label htmlFor="popular" className="text-sm font-medium text-gray-700">
                      Mark as Popular
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700">
                      Active (Show in POS)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="send_to_kitchen"
                      checked={formData.send_to_kitchen}
                      onChange={(e) => setFormData(prev => ({ ...prev, send_to_kitchen: e.target.checked }))}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                    />
                    <label htmlFor="send_to_kitchen" className="text-sm font-medium text-gray-700">
                      Send to Kitchen (KDS)
                    </label>
                  </div>
                </div>
              </div>

              {/* Modifier Assignment */}
              {modifiers.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">Add-ons &amp; Options</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Select which modifiers apply to this product in the POS</p>
                      </div>
                      {selectedModifierIds.length > 0 && (
                        <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                          {selectedModifierIds.length} selected
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {modifiers.filter(m => m.active !== false).map(mod => {
                        const isSelected = selectedModifierIds.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => setSelectedModifierIds(prev =>
                              isSelected ? prev.filter(id => id !== mod.id) : [...prev, mod.id]
                            )}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              mod.type === 'addon' ? 'bg-emerald-400' : 'bg-amber-400'
                            } ${isSelected ? 'opacity-80' : ''}`} />
                            {mod.name}
                            {parseFloat(mod.price) > 0 && (
                              <span className={isSelected ? 'text-violet-200' : 'text-gray-400'}>
                                +{parseFloat(mod.price).toFixed(0)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedModifierIds.length === 0 && (
                      <p className="text-xs text-gray-400 mt-2 italic">No add-ons — modifier picker will be skipped in POS</p>
                    )}
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 z-10 flex gap-3 p-6 pt-4 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={productSaving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSaving}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {productSaving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Combo Modal */}
      {showComboModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCombo ? 'Edit Combo' : 'Add New Combo'}
              </h2>
              <button
                onClick={() => setShowComboModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleComboSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combo Name *</label>
                <input
                  type="text"
                  required
                  value={comboFormData.name}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Family Meal Deal"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combo Price *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={comboFormData.price}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Total combo price"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={comboFormData.description}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL / Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comboFormData.image}
                    onChange={(e) => setComboFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="e.g., assets/images/food/combo.png"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                  <label className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-cyan-50 border border-gray-200 cursor-pointer transition-all group" title="Browse Photo">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e.target.files[0], 'combo')}
                      disabled={imageUploading}
                    />
                    {imageUploading ? (
                      <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Upload className="w-5 h-5 text-gray-500 group-hover:text-cyan-600" />
                    )}
                  </label>
                </div>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items Included *</label>
                <div className="space-y-2">
                  {comboFormData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateComboItem(index, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">Select product...</option>
                        {regularProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.sizes ? '(has sizes)' : `- Php ${product.price?.toFixed(2)}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateComboItem(index, 'quantity', e.target.value)}
                        className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 text-center"
                        title="Quantity"
                      />
                      <input
                        type="text"
                        value={item.size_name || ''}
                        onChange={(e) => updateComboItem(index, 'size_name', e.target.value)}
                        placeholder="Size"
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
                        title="Size (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => removeComboItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        disabled={comboFormData.items.length === 1}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addComboItem}
                  className="mt-2 text-cyan-600 text-sm font-medium hover:text-cyan-700"
                >
                  + Add Item
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="comboActive"
                  checked={comboFormData.active}
                  onChange={(e) => setComboFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="comboActive" className="text-sm font-medium text-gray-700">
                  Active (Show in POS)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                >
                  {editingCombo ? 'Update Combo' : 'Create Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductManagementPage;
