'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  categoryId: number;
  categoryName: string;
  supplierId: number | null;
  supplierName: string | null;
  location: string;
  storageRequirements: string | null;
  reorderThreshold: number | null;
  standardOrderQty: number | null;
  unitPrice: number | null;
  qrCodeUrl: string | null;
  einkDeviceId: string | null;
  hasEinkDevice: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface Device {
  id: number;
  deviceId: string;
  deviceName: string | null;
  location: string | null;
  isOnline: number;
}

interface Stats {
  totalProducts: number;
  activeProducts: number;
  withQrCode: number;
  withEink: number;
  lowStock: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    activeProducts: 0,
    withQrCode: 0,
    withEink: 0,
    lowStock: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    qrCodeUrl: '',
    einkDeviceId: '',
    categoryId: '',
    supplierId: '',
    location: '',
    storageRequirements: '',
    reorderThreshold: '',
    standardOrderQty: '',
    unitPrice: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // TODO: Get actual manager_id from authenticated session
  const managerId = 25;

  useEffect(() => {
    fetchProducts();
    fetchDevices();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?manager_id=${managerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.products);
      setCategories(data.categories);
      setSuppliers(data.suppliers);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch(`/api/devices?manager_id=${managerId}`);
      const data = await response.json();

      if (response.ok) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      sku: '',
      qrCodeUrl: '',
      einkDeviceId: '',
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      supplierId: '',
      location: '',
      storageRequirements: '',
      reorderThreshold: '',
      standardOrderQty: '',
      unitPrice: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      qrCodeUrl: product.qrCodeUrl || '',
      einkDeviceId: product.einkDeviceId || '',
      categoryId: String(product.categoryId),
      supplierId: product.supplierId ? String(product.supplierId) : '',
      location: product.location,
      storageRequirements: product.storageRequirements || '',
      reorderThreshold: product.reorderThreshold ? String(product.reorderThreshold) : '',
      standardOrderQty: product.standardOrderQty ? String(product.standardOrderQty) : '',
      unitPrice: product.unitPrice ? String(product.unitPrice) : '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      sku: '',
      qrCodeUrl: '',
      einkDeviceId: '',
      categoryId: '',
      supplierId: '',
      location: '',
      storageRequirements: '',
      reorderThreshold: '',
      standardOrderQty: '',
      unitPrice: '',
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError('Product name is required');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Category is required');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Location is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const url = '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const body = editingProduct
        ? {
            id: editingProduct.id,
            name: formData.name,
            description: formData.description,
            sku: formData.sku,
            qrCodeUrl: formData.qrCodeUrl || null,
            einkDeviceId: formData.einkDeviceId || null,
            categoryId: formData.categoryId,
            supplierId: formData.supplierId || null,
            location: formData.location,
            storageRequirements: formData.storageRequirements,
            reorderThreshold: formData.reorderThreshold,
            standardOrderQty: formData.standardOrderQty,
            unitPrice: formData.unitPrice,
          }
        : {
            manager_id: managerId,
            name: formData.name,
            description: formData.description,
            sku: formData.sku,
            qrCodeUrl: formData.qrCodeUrl || null,
            einkDeviceId: formData.einkDeviceId || null,
            categoryId: formData.categoryId,
            supplierId: formData.supplierId || null,
            location: formData.location,
            storageRequirements: formData.storageRequirements,
            reorderThreshold: formData.reorderThreshold,
            standardOrderQty: formData.standardOrderQty,
            unitPrice: formData.unitPrice,
            createdById: 1, // TODO: Get from session
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      if (editingProduct) {
        setProducts(products.map(p =>
          p.id === data.product.id ? data.product : p
        ));
      } else {
        setProducts([data.product, ...products]);
        setStats(prev => ({
          ...prev,
          totalProducts: prev.totalProducts + 1,
          activeProducts: prev.activeProducts + 1,
        }));
      }

      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          isActive: product.isActive === 1 ? 0 : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product status');
      }

      setProducts(products.map(p =>
        p.id === data.product.id ? data.product : p
      ));

      const newActiveCount = product.isActive === 1
        ? stats.activeProducts - 1
        : stats.activeProducts + 1;
      setStats(prev => ({ ...prev, activeProducts: newActiveCount }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update product status');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setProducts(products.filter(p => p.id !== product.id));
      setStats(prev => ({
        ...prev,
        totalProducts: prev.totalProducts - 1,
        activeProducts: product.isActive === 1 ? prev.activeProducts - 1 : prev.activeProducts,
        withQrCode: product.qrCodeUrl ? prev.withQrCode - 1 : prev.withQrCode,
        withEink: product.hasEinkDevice === 1 ? prev.withEink - 1 : prev.withEink,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      product.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === '' || product.categoryId === parseInt(categoryFilter);
    const matchesMethod =
      methodFilter === '' ||
      (methodFilter === 'qr' && product.qrCodeUrl && !product.hasEinkDevice) ||
      (methodFilter === 'eink' && product.hasEinkDevice === 1 && !product.qrCodeUrl) ||
      (methodFilter === 'both' && product.qrCodeUrl && product.hasEinkDevice === 1);
    return matchesSearch && matchesCategory && matchesMethod;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-red-600 mt-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-900">Error Loading Products</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage products with QR codes and E-ink devices</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span>+</span>
          <span>Add Product</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Products</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalProducts}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Active</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1 sm:mt-2">{stats.activeProducts}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">With QR Code</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1 sm:mt-2">{stats.withQrCode}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">With E-ink</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600 mt-1 sm:mt-2">{stats.withEink}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 col-span-2 sm:col-span-1">
          <div className="text-xs sm:text-sm text-gray-600">Low Stock</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1 sm:mt-2">{stats.lowStock}</div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
            >
              <option value="">All Methods</option>
              <option value="qr">QR Code Only</option>
              <option value="eink">E-ink Only</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">QR Code</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">ESL Device</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchTerm || categoryFilter || methodFilter
                      ? 'No products found matching your filters.'
                      : 'No products found. Click "Add Product" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 break-words">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-xs mt-0.5">{product.description}</div>
                          )}
                          <div className="md:hidden text-xs text-gray-500 mt-1">{product.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900 break-all">{product.qrCodeUrl || '-'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 hidden xl:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900 break-all">{product.einkDeviceId || '-'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                        {product.categoryName}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{product.location}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {product.isActive === 1 ? (
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            product.isActive === 1
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                          }`}
                        >
                          {product.isActive === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-2xl mx-4 sm:mx-0 max-h-[90vh] flex flex-col">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 overflow-y-auto flex-1">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      <div className="mt-4 space-y-4">
                        {formError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
                            {formError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="e.g., Bath Towels - White"
                              required
                            />
                          </div>

                          <div>
                            <label htmlFor="sku" className="block text-xs sm:text-sm font-medium text-gray-700">
                              SKU
                            </label>
                            <input
                              type="text"
                              id="sku"
                              value={formData.sku}
                              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="e.g., TWL-WHT-001"
                            />
                          </div>

                          <div>
                            <label htmlFor="categoryId" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              id="categoryId"
                              value={formData.categoryId}
                              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              required
                            >
                              <option value="">Select Category</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="qrCodeUrl" className="block text-xs sm:text-sm font-medium text-gray-700">
                              QR Code Value
                            </label>
                            <input
                              type="text"
                              id="qrCodeUrl"
                              value={formData.qrCodeUrl}
                              onChange={(e) => setFormData({ ...formData, qrCodeUrl: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="e.g., QR-PROD-12345"
                            />
                            <p className="mt-1 text-xs text-gray-500">Value encoded in the product's QR code sticker</p>
                          </div>

                          <div>
                            <label htmlFor="einkDeviceId" className="block text-xs sm:text-sm font-medium text-gray-700">
                              ESL Device ID
                            </label>
                            <select
                              id="einkDeviceId"
                              value={formData.einkDeviceId}
                              onChange={(e) => {
                                const selectedDeviceId = e.target.value;
                                const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
                                setFormData({
                                  ...formData,
                                  einkDeviceId: selectedDeviceId,
                                  location: selectedDevice?.location || formData.location
                                });
                              }}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            >
                              <option value="">No ESL Device</option>
                              {devices.map((device) => (
                                <option key={device.id} value={device.deviceId}>
                                  {device.deviceName ? `${device.deviceName} (${device.deviceId})` : device.deviceId}
                                  {device.isOnline === 0 ? ' - Offline' : ''}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Select a registered E-ink tag from Devices</p>
                          </div>

                          <div>
                            <label htmlFor="supplierId" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Supplier
                            </label>
                            <select
                              id="supplierId"
                              value={formData.supplierId}
                              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            >
                              <option value="">No Supplier</option>
                              {suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="location" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Location <span className="text-red-500">*</span>
                            </label>
                            <select
                              id="location"
                              value={formData.location}
                              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              required
                            >
                              <option value="">Select Location</option>
                              {[...new Set(devices.map(d => d.location).filter(Boolean))].map((location) => (
                                <option key={location} value={location!}>
                                  {location}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Locations from registered devices</p>
                          </div>

                          <div className="sm:col-span-2">
                            <label htmlFor="description" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              rows={2}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="Product description"
                            />
                          </div>

                          <div>
                            <label htmlFor="unitPrice" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Unit Price
                            </label>
                            <input
                              type="number"
                              id="unitPrice"
                              value={formData.unitPrice}
                              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                              step="0.01"
                              min="0"
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label htmlFor="reorderThreshold" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Reorder Threshold
                            </label>
                            <input
                              type="number"
                              id="reorderThreshold"
                              value={formData.reorderThreshold}
                              onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                              min="0"
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="e.g., 10"
                            />
                          </div>

                          <div>
                            <label htmlFor="standardOrderQty" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Standard Order Qty
                            </label>
                            <input
                              type="number"
                              id="standardOrderQty"
                              value={formData.standardOrderQty}
                              onChange={(e) => setFormData({ ...formData, standardOrderQty: e.target.value })}
                              min="0"
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="e.g., 50"
                            />
                          </div>

                          <div>
                            <label htmlFor="storageRequirements" className="block text-xs sm:text-sm font-medium text-gray-700">
                              Storage Requirements
                            </label>
                            <input
                              type="text"
                              id="storageRequirements"
                              value={formData.storageRequirements}
                              onChange={(e) => setFormData({ ...formData, storageRequirements: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                              placeholder="e.g., Cool, dry place"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2 sm:gap-3 flex-shrink-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full justify-center rounded-lg bg-gray-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-black disabled:bg-gray-400 sm:w-auto"
                  >
                    {submitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="mt-2 sm:mt-0 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
