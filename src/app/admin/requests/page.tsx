'use client';

import { useState, useEffect, useCallback } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Decode JWT without a library
function decodeToken(token: string) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch { return null; }
}

interface Request {
  id: number;
  manager_id: number;
  productId: number;
  requestedById: number;
  requestMethod: string;
  deviceInfo: string | null;
  requestedQty: number | null;
  location: string;
  notes: string | null;
  status: string;
  priority: string;
  approvedById: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: number;
    name: string;
    sku: string | null;
    location: string;
    standardOrderQty: number | null;
    category: {
      name: string;
    };
  };
  requestedBy: {
    id: number;
    username: string;
  };
  approvedBy: {
    id: number;
    username: string;
  } | null;
}

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  completedRequests: number;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    completedRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [managerId, setManagerId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Read auth from localStorage (same pattern as agent pages)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const decoded = decodeToken(token || '');
    if (decoded?.userId) setCurrentUserId(decoded.userId);
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setManagerId(parsed.customerId || parsed.manager_id || 25);
      } catch { setManagerId(25); }
    } else {
      setManagerId(25);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!managerId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?manager_id=${managerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests');
      }

      setRequests(data.requests);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  // Initial fetch when managerId is ready
  useEffect(() => {
    if (managerId) fetchRequests();
  }, [managerId, fetchRequests]);

  // Auto-refresh every 30 seconds to pick up webhook-created requests
  useEffect(() => {
    if (!managerId) return;
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [managerId, fetchRequests]);

  const handleUpdateStatus = async (requestId: number, newStatus: string, rejectionReason?: string) => {
    try {
      const body: any = {
        id: requestId,
        status: newStatus,
      };

      if (newStatus === 'APPROVED') {
        body.approved_by_id = currentUserId || 1;
      }

      if (newStatus === 'REJECTED' && rejectionReason) {
        body.rejection_reason = rejectionReason;
      }

      const response = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      // Refresh requests after update
      fetchRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update request');
    }
  };

  const handleDelete = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      const response = await fetch(`/api/requests?id=${requestId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete request');
      }

      fetchRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete request');
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.product.sku && request.product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      request.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestedBy.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || request.status === statusFilter;
    const matchesPriority = priorityFilter === '' || request.priority === priorityFilter;
    const matchesMethod =
      methodFilter === '' ||
      (methodFilter === 'QR' && request.requestMethod === 'QR_SCAN') ||
      (methodFilter === 'EINK' && request.requestMethod === 'EINK_BUTTON') ||
      (methodFilter === 'MANUAL' && request.requestMethod === 'MANUAL');
    return matchesSearch && matchesStatus && matchesPriority && matchesMethod;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
            Rejected
          </span>
        );
      case 'ORDERED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            Ordered
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
            Completed
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 border border-orange-200">
            High
          </span>
        );
      case 'NORMAL':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            Normal
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            {priority}
          </span>
        );
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'QR_SCAN':
        return 'QR Scan';
      case 'EINK_BUTTON':
        return 'E-ink Button';
      case 'MANUAL':
        return 'Manual';
      default:
        return method;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Count urgent requests and ordered requests
  const urgentCount = requests.filter(r => r.priority === 'URGENT' && r.status === 'PENDING').length;
  const orderedCount = requests.filter(r => r.status === 'ORDERED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading requests...</div>
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
            <h3 className="text-sm font-medium text-red-900">Error Loading Requests</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchRequests}
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Replenishment Requests</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Approve and manage stock replenishment requests</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Requests</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalRequests}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 sm:p-6 border border-yellow-200">
          <div className="text-xs sm:text-sm text-yellow-700 font-medium">Pending</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-700 mt-1 sm:mt-2">{stats.pendingRequests}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 sm:p-6 border border-blue-200">
          <div className="text-xs sm:text-sm text-blue-700">Approved</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 sm:mt-2">{stats.approvedRequests}</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4 sm:p-6 border border-purple-200">
          <div className="text-xs sm:text-sm text-purple-700">Ordered</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-700 mt-1 sm:mt-2">{orderedCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 sm:p-6 border border-green-200">
          <div className="text-xs sm:text-sm text-green-700">Completed</div>
          <div className="text-xl sm:text-2xl font-bold text-green-700 mt-1 sm:mt-2">{stats.completedRequests}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 sm:p-6 border border-red-200">
          <div className="text-xs sm:text-sm text-red-700">Urgent</div>
          <div className="text-xl sm:text-2xl font-bold text-red-700 mt-1 sm:mt-2">{urgentCount}</div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'ORDERED', label: 'Ordered' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
              placeholder="All Status"
              searchable={false}
            />
            <CustomSelect
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
              placeholder="All Priorities"
              searchable={false}
            />
            <CustomSelect
              value={methodFilter}
              onChange={setMethodFilter}
              options={[
                { value: 'QR', label: 'QR Scan' },
                { value: 'EINK', label: 'E-ink Button' },
                { value: 'MANUAL', label: 'Manual' },
              ]}
              placeholder="All Methods"
              searchable={false}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Method</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Requested By</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Qty</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchTerm || statusFilter || priorityFilter || methodFilter
                      ? 'No requests found matching your filters.'
                      : 'No replenishment requests found. Requests will appear here when staff scans QR codes or presses E-ink buttons.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">#{request.id}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 break-words max-w-[150px] sm:max-w-xs">{request.product.name}</div>
                      {request.product.sku && (
                        <div className="text-xs text-gray-500">{request.product.sku}</div>
                      )}
                      <div className="lg:hidden text-xs text-gray-500 mt-1">{request.location}</div>
                      <div className="md:hidden text-xs text-gray-500 mt-0.5">{request.requestedBy.username}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{request.location}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{getMethodLabel(request.requestMethod)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{request.requestedBy.username}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        {request.requestedQty != null ? request.requestedQty : <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(request.priority)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{formatDate(request.createdAt)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right text-sm font-medium">
                      <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                        {request.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(request.id, 'APPROVED')}
                              className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Enter rejection reason (optional):');
                                handleUpdateStatus(request.id, 'REJECTED', reason || undefined);
                              }}
                              className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'APPROVED' && (
                          <span className="px-2 sm:px-3 py-1 text-xs text-gray-500 text-left sm:text-right">
                            Go to Orders to create order
                          </span>
                        )}
                        {request.status === 'ORDERED' && (
                          <span className="px-2 sm:px-3 py-1 text-xs text-purple-600 text-left sm:text-right">
                            Waiting for delivery
                          </span>
                        )}
                        {request.status !== 'ORDERED' && request.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleDelete(request.id)}
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
    </div>
  );
}
