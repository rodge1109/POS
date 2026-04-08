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
              onMouseDown={handleProductModalMouseDown}
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
                    {productCategories.map(cat => (
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
                        setFormData(prev => ({ ...prev, sizes: [{ name: 'Small', price: '' }, { name: 'Medium', price: '' }, { name: 'Large', price: '' }] }));
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
