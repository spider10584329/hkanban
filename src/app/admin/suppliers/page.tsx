'use client';

import { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface Supplier {
  id: number;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  orderCount: number;
}

interface Stats {
  totalSuppliers: number;
  activeSuppliers: number;
  pendingOrders: number;
  totalProducts: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    pendingOrders: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // TODO: Get actual manager_id from authenticated session
  const managerId = 25;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/suppliers?manager_id=${managerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suppliers');
      }

      setSuppliers(data.suppliers);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const url = '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';
      const body = editingSupplier
        ? {
            id: editingSupplier.id,
            name: formData.name,
            contactName: formData.contactName,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
          }
        : {
            manager_id: managerId,
            name: formData.name,
            contactName: formData.contactName,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save supplier');
      }

      if (editingSupplier) {
        setSuppliers(suppliers.map(s =>
          s.id === data.supplier.id ? data.supplier : s
        ));
      } else {
        setSuppliers([data.supplier, ...suppliers]);
        setStats(prev => ({
          ...prev,
          totalSuppliers: prev.totalSuppliers + 1,
          activeSuppliers: prev.activeSuppliers + 1,
        }));
      }

      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: supplier.id,
          isActive: supplier.isActive === 1 ? 0 : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update supplier status');
      }

      setSuppliers(suppliers.map(s =>
        s.id === data.supplier.id ? data.supplier : s
      ));

      // Update stats
      const newActiveCount = supplier.isActive === 1
        ? stats.activeSuppliers - 1
        : stats.activeSuppliers + 1;
      setStats(prev => ({ ...prev, activeSuppliers: newActiveCount }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update supplier status');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (supplier.productCount > 0) {
      alert(`Cannot delete "${supplier.name}" because it has ${supplier.productCount} product(s). Please reassign or delete the products first.`);
      return;
    }

    if (supplier.orderCount > 0) {
      alert(`Cannot delete "${supplier.name}" because it has ${supplier.orderCount} order(s). Please delete the orders first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/suppliers?id=${supplier.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete supplier');
      }

      setSuppliers(suppliers.filter(s => s.id !== supplier.id));
      setStats(prev => ({
        ...prev,
        totalSuppliers: prev.totalSuppliers - 1,
        activeSuppliers: supplier.isActive === 1 ? prev.activeSuppliers - 1 : prev.activeSuppliers,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contactName && supplier.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'active' && supplier.isActive === 1) ||
      (statusFilter === 'inactive' && supplier.isActive === 0);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading suppliers...</div>
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
            <h3 className="text-sm font-medium text-red-900">Error Loading Suppliers</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchSuppliers}
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-sm text-gray-600 mt-1">Manage supplier information and contacts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span>+</span>
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Suppliers</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalSuppliers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Active</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1 sm:mt-2">{stats.activeSuppliers}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Pending Orders</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1 sm:mt-2">{stats.pendingOrders}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Products</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalProducts}</div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="All Status"
            searchable={false}
            className="w-full sm:w-48"
          />
        </div>

        {/* Mobile View - Cards */}
        <div className="block lg:hidden divide-y divide-gray-200">
          {filteredSuppliers.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 text-sm">
              {searchTerm || statusFilter
                ? 'No suppliers found matching your filters.'
                : 'No suppliers found. Click "Add Supplier" to create one.'}
            </div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-xs text-gray-500">{supplier.productCount} products</div>
                      </div>
                      {supplier.isActive === 1 ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-200 whitespace-nowrap ml-2">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap ml-2">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 mb-3">
                      {supplier.contactName && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{supplier.contactName}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(supplier)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          supplier.isActive === 1
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                        }`}
                      >
                        {supplier.isActive === 1 ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(supplier)}
                        className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 rounded text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || statusFilter
                      ? 'No suppliers found matching your filters.'
                      : 'No suppliers found. Click "Add Supplier" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                          <div className="text-xs text-gray-500">{supplier.productCount} products</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.contactName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {supplier.isActive === 1 ? (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(supplier)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            supplier.isActive === 1
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                          }`}
                        >
                          {supplier.isActive === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 rounded-lg text-xs font-medium transition-colors"
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
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg mx-4 sm:mx-0">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900">
                        {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                      </h3>
                      <div className="mt-4 space-y-4">
                        {formError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {formError}
                          </div>
                        )}
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Supplier Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            placeholder="e.g., ABC Medical Supplies"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            id="contactName"
                            value={formData.contactName}
                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            placeholder="e.g., John Smith"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                              Phone
                            </label>
                            <input
                              type="tel"
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                              placeholder="e.g., +1 234 567 890"
                            />
                          </div>
                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                              Email
                            </label>
                            <input
                              type="email"
                              id="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                              placeholder="e.g., contact@supplier.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                            Address
                          </label>
                          <textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={2}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:text-base shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            placeholder="Full address"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:bg-gray-400 sm:w-auto"
                  >
                    {submitting ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Create Supplier'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
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
