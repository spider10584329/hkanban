'use client';

import { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  product: {
    id: number;
    name: string;
    sku: string | null;
    unitPrice: number | null;
  };
  replenishmentRequest: {
    id: number;
    priority: string;
    requestedBy: {
      username: string;
    };
  } | null;
}

interface Order {
  id: number;
  manager_id: number;
  orderNumber: string;
  supplierId: number;
  status: string;
  orderDate: string;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  totalAmount: number | null;
  createdAt: string;
  supplier: {
    id: number;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
  };
  orderItems: OrderItem[];
  receivedBy: {
    id: number;
    username: string;
  } | null;
}

interface Supplier {
  id: number;
  name: string;
}

interface ApprovedRequest {
  id: number;
  productId: number;
  requestedQty: number | null;
  location: string;
  priority: string;
  createdAt: string;
  product: {
    id: number;
    name: string;
    sku: string | null;
    supplierId: number | null;
    supplierName: string | null;
    unitPrice: number | null;
    standardOrderQty: number | null;
  };
  requestedBy: {
    username: string;
  };
}

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  sentOrders: number;
  inTransitOrders: number;
  deliveredOrders: number;
  thisMonthSpending: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    sentOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    thisMonthSpending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // TODO: Get actual manager_id from authenticated session
  const managerId = 25;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders?manager_id=${managerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(data.orders);
      setSuppliers(data.suppliers);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedRequests = async () => {
    try {
      const response = await fetch(`/api/requests?manager_id=${managerId}&status=APPROVED`);
      const data = await response.json();

      if (response.ok) {
        // Transform the data to include supplier info from product
        const requestsWithSupplier = await Promise.all(
          data.requests.map(async (req: any) => {
            // Fetch product details with supplier
            const productRes = await fetch(`/api/products?manager_id=${managerId}`);
            const productData = await productRes.json();
            const product = productData.products.find((p: any) => p.id === req.product.id);

            return {
              ...req,
              product: {
                ...req.product,
                supplierId: product?.supplierId || null,
                supplierName: product?.supplierName || null,
                unitPrice: product?.unitPrice || null,
                standardOrderQty: product?.standardOrderQty || null,
              },
            };
          })
        );
        setApprovedRequests(requestsWithSupplier);
      }
    } catch (err) {
      console.error('Error fetching approved requests:', err);
    }
  };

  const openCreateModal = async () => {
    await fetchApprovedRequests();
    setSelectedSupplier('');
    setSelectedRequests([]);
    setExpectedDelivery('');
    setIsCreateModalOpen(true);
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplier || selectedRequests.length === 0) {
      alert('Please select a supplier and at least one request');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
          supplierId: parseInt(selectedSupplier),
          requestIds: selectedRequests,
          expectedDelivery: expectedDelivery || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const body: any = {
        id: orderId,
        status: newStatus,
      };

      if (newStatus === 'DELIVERED') {
        body.receivedById = 1; // TODO: Get from session
      }

      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  const handleDelete = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order? Linked requests will be restored to APPROVED status.')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete order');
      }

      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    const matchesSupplier = supplierFilter === '' || order.supplierId === parseInt(supplierFilter);
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Filter approved requests by selected supplier
  const filteredApprovedRequests = selectedSupplier
    ? approvedRequests.filter(r => r.product.supplierId === parseInt(selectedSupplier))
    : approvedRequests;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
            Pending
          </span>
        );
      case 'SENT':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Sent
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
            Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading orders...</div>
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
            <h3 className="text-sm font-medium text-red-900">Error Loading Orders</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchOrders}
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage purchase orders and deliveries</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span>+</span>
          <span>Create Order</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Orders</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalOrders}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 sm:p-6 border border-yellow-200">
          <div className="text-xs sm:text-sm text-yellow-700">Pending</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-700 mt-1 sm:mt-2">{stats.pendingOrders}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 sm:p-6 border border-blue-200">
          <div className="text-xs sm:text-sm text-blue-700">Sent</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 sm:mt-2">{stats.sentOrders}</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4 sm:p-6 border border-purple-200">
          <div className="text-xs sm:text-sm text-purple-700">In Transit</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-700 mt-1 sm:mt-2">{stats.inTransitOrders}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 sm:p-6 border border-green-200">
          <div className="text-xs sm:text-sm text-green-700">Delivered</div>
          <div className="text-xl sm:text-2xl font-bold text-green-700 mt-1 sm:mt-2">{stats.deliveredOrders}</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4 sm:p-6 border border-gray-200 col-span-2 sm:col-span-1">
          <div className="text-xs sm:text-sm text-gray-700">This Month</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{formatCurrency(stats.thisMonthSpending)}</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'SENT', label: 'Sent' },
                { value: 'IN_TRANSIT', label: 'In Transit' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              placeholder="All Status"
              searchable={false}
              className="flex-1"
            />
            <CustomSelect
              value={supplierFilter}
              onChange={setSupplierFilter}
              options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder="All Suppliers"
              className="flex-1"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Items</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Order Date</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Expected Delivery</th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchTerm || statusFilter || supplierFilter
                      ? 'No orders found matching your filters.'
                      : 'No orders found. Click "Create Order" to create one from approved requests.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 break-words max-w-[150px] sm:max-w-xs">{order.supplier.name}</div>
                      {order.supplier.contactName && (
                        <div className="text-xs text-gray-500">{order.supplier.contactName}</div>
                      )}
                      <div className="lg:hidden text-xs text-gray-500 mt-1">{order.orderItems.length} items</div>
                      <div className="md:hidden text-xs text-gray-500 mt-0.5">{formatDate(order.orderDate)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{order.orderItems.length} items</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{formatDate(order.orderDate)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{formatDate(order.expectedDelivery)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right text-sm font-medium">
                      <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'SENT')}
                            className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            Mark Sent
                          </button>
                        )}
                        {order.status === 'SENT' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'IN_TRANSIT')}
                            className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            In Transit
                          </button>
                        )}
                        {order.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            Delivered
                          </button>
                        )}
                        {order.status !== 'DELIVERED' && (
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsCreateModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-2xl mx-4 sm:mx-0 max-h-[90vh] flex flex-col">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 overflow-y-auto flex-1">
                <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900 mb-4">
                  Create Order from Approved Requests
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Select Supplier <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={selectedSupplier}
                      onChange={(v) => {
                        setSelectedSupplier(v);
                        setSelectedRequests([]);
                      }}
                      options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
                      placeholder="Select a supplier"
                      clearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Select Approved Requests <span className="text-red-500">*</span>
                    </label>
                    {filteredApprovedRequests.length === 0 ? (
                      <div className="text-xs sm:text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                        {selectedSupplier
                          ? 'No approved requests found for this supplier. Make sure products are assigned to this supplier.'
                          : 'Select a supplier to see approved requests.'}
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredApprovedRequests.map((request) => (
                          <label
                            key={request.id}
                            className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRequests.includes(request.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequests([...selectedRequests, request.id]);
                                } else {
                                  setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                                }
                              }}
                              className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 break-words">{request.product.name}</div>
                              <div className="text-xs text-gray-500 break-words">
                                Qty: {request.requestedQty || request.product.standardOrderQty || 1} |
                                Price: {formatCurrency(request.product.unitPrice)} |
                                Requested by: {request.requestedBy.username}
                              </div>
                            </div>
                            {request.priority === 'URGENT' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                                Urgent
                              </span>
                            )}
                            {request.priority === 'HIGH' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 whitespace-nowrap">
                                High
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedRequests.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs sm:text-sm text-gray-700">
                        <strong>Selected:</strong> {selectedRequests.length} request(s)
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={submitting || !selectedSupplier || selectedRequests.length === 0}
                  className="inline-flex w-full justify-center rounded-lg bg-gray-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-black disabled:bg-gray-400 sm:w-auto"
                >
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="mt-2 sm:mt-0 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsDetailModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-2xl mx-4 sm:mx-0 max-h-[90vh] flex flex-col">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 overflow-y-auto flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900">
                      Order {selectedOrder.orderNumber}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Supplier: {selectedOrder.supplier.name}
                    </p>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Order Date:</span>
                    <span className="ml-2 text-gray-900">{formatDate(selectedOrder.orderDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expected Delivery:</span>
                    <span className="ml-2 text-gray-900">{formatDate(selectedOrder.expectedDelivery)}</span>
                  </div>
                  {selectedOrder.actualDelivery && (
                    <div>
                      <span className="text-gray-500">Actual Delivery:</span>
                      <span className="ml-2 text-gray-900">{formatDate(selectedOrder.actualDelivery)}</span>
                    </div>
                  )}
                  {selectedOrder.trackingNumber && (
                    <div>
                      <span className="text-gray-500">Tracking:</span>
                      <span className="ml-2 text-gray-900">{selectedOrder.trackingNumber}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Order Items</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                          <th className="px-2 sm:px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                          <th className="px-2 sm:px-3 py-2 text-right text-xs font-medium text-gray-500 hidden sm:table-cell">Unit Price</th>
                          <th className="px-2 sm:px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedOrder.orderItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 sm:px-3 py-2">
                              <div className="font-medium text-gray-900 break-words">{item.product.name}</div>
                              {item.product.sku && (
                                <div className="text-xs text-gray-500">{item.product.sku}</div>
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-right text-gray-900 whitespace-nowrap">{item.quantity}</td>
                            <td className="px-2 sm:px-3 py-2 text-right text-gray-900 whitespace-nowrap hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-2 sm:px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-2 sm:px-3 py-2 text-right font-medium text-gray-900">Total:</td>
                          <td className="px-2 sm:px-3 py-2 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(selectedOrder.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
