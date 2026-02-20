'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Helper function to decode JWT token
function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

interface RequestData {
  id: number;
  status: string;
  priority: string;
  requestMethod: string;
  location: string;
  requestedQty: number | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  product: {
    id: number;
    name: string;
    sku: string;
    location: string;
    standardOrderQty: number | null;
    category: {
      name: string;
    } | null;
  };
  approvedBy: {
    id: number;
    username: string;
  } | null;
}

interface RequestsData {
  requests: RequestData[];
  stats: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    completedRequests: number;
  };
}

export default function MyRequestsPage() {
  const router = useRouter();
  const [agentId, setAgentId] = useState<number | null>(null);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [data, setData] = useState<RequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedRequest, setExpandedRequest] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setAgentId(decodedToken.userId);
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      // managerId is stored as customerId in user data for agents
      if (parsedUser.customerId) {
        setManagerId(parsedUser.customerId);
      }
    }
  }, []);

  useEffect(() => {
    if (agentId && managerId) {
      fetchRequests();
    }
  }, [agentId, managerId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?manager_id=${managerId}&user_id=${agentId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch requests');
      }

      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      ORDERED: 'bg-purple-100 text-purple-800 border-purple-200',
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      URGENT: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      NORMAL: 'bg-gray-100 text-gray-800',
      LOW: 'bg-slate-100 text-slate-600',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[priority] || 'bg-gray-100 text-gray-800'}`}>
        {priority}
      </span>
    );
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      QR_SCAN: 'QR Scan',
      MANUAL: 'Manual',
      EINK_BUTTON: 'E-ink Button',
    };
    return labels[method] || method;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'QR_SCAN':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        );
      case 'EINK_BUTTON':
        return (
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
    }
  };

  // Filter requests based on search and status
  const filteredRequests = data?.requests?.filter((request) => {
    const matchesSearch =
      searchQuery === '' ||
      request.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

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

  const stats = data?.stats || {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    completedRequests: 0,
  };

  const orderedRequests = data?.requests?.filter(r => r.status === 'ORDERED').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Track your replenishment requests</p>
        </div>
        <button
          onClick={() => router.push('/agent/scan')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          New Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRequests}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="text-xs text-yellow-700 uppercase tracking-wide">Pending</div>
          <div className="text-2xl font-bold text-yellow-700 mt-1">{stats.pendingRequests}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <div className="text-xs text-blue-700 uppercase tracking-wide">Approved</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{stats.approvedRequests}</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
          <div className="text-xs text-purple-700 uppercase tracking-wide">Ordered</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{orderedRequests}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-xs text-green-700 uppercase tracking-wide">Completed</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{stats.completedRequests}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="text-xs text-red-700 uppercase tracking-wide">Rejected</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{stats.rejectedRequests}</div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by product name, SKU, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <CustomSelect
                value={statusFilter === 'ALL' ? '' : statusFilter}
                onChange={(v) => setStatusFilter(v === '' ? 'ALL' : v)}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'ORDERED', label: 'Ordered' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                placeholder="All Status"
                searchable={false}
                className="w-full sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>No requests found</p>
                    <p className="text-xs mt-1">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try adjusting your filters'
                        : 'Scan a QR code to create a replenishment request'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.product.name}</div>
                        <div className="text-xs text-gray-500">SKU: {request.product.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.location}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {getMethodIcon(request.requestMethod)}
                          <span className="text-sm text-gray-600">{getMethodLabel(request.requestMethod)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(request.priority)}</td>
                      <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(request.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {expandedRequest === request.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedRequest === request.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Quantity:</span>
                              <span className="ml-2 text-gray-900">{request.requestedQty || request.product.standardOrderQty || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Category:</span>
                              <span className="ml-2 text-gray-900">{request.product.category?.name || 'N/A'}</span>
                            </div>
                            {request.approvedBy && (
                              <div>
                                <span className="text-gray-500">Approved by:</span>
                                <span className="ml-2 text-gray-900">{request.approvedBy.username}</span>
                              </div>
                            )}
                            {request.approvedAt && (
                              <div>
                                <span className="text-gray-500">Approved at:</span>
                                <span className="ml-2 text-gray-900">{formatDate(request.approvedAt)}</span>
                              </div>
                            )}
                            {request.completedAt && (
                              <div>
                                <span className="text-gray-500">Completed at:</span>
                                <span className="ml-2 text-gray-900">{formatDate(request.completedAt)}</span>
                              </div>
                            )}
                            {request.notes && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Notes:</span>
                                <span className="ml-2 text-gray-900">{request.notes}</span>
                              </div>
                            )}
                            {request.status === 'REJECTED' && request.rejectionReason && (
                              <div className="col-span-2 md:col-span-4">
                                <span className="text-red-600 font-medium">Rejection Reason:</span>
                                <span className="ml-2 text-red-700">{request.rejectionReason}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredRequests.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No requests found</p>
              <p className="text-xs mt-1">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Scan a QR code to create a replenishment request'}
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getMethodIcon(request.requestMethod)}
                      <h3 className="text-sm font-medium text-gray-900 truncate">{request.product.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">SKU: {request.product.sku}</p>
                    <p className="text-xs text-gray-500">{request.location}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(request.createdAt)}</span>
                  <button
                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    {expandedRequest === request.id ? 'Hide details' : 'View details'}
                  </button>
                </div>
                {expandedRequest === request.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="text-gray-900">{request.requestedQty || request.product.standardOrderQty || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="text-gray-900">{request.product.category?.name || 'N/A'}</span>
                    </div>
                    {request.approvedBy && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Approved by:</span>
                        <span className="text-gray-900">{request.approvedBy.username}</span>
                      </div>
                    )}
                    {request.notes && (
                      <div>
                        <span className="text-gray-500">Notes:</span>
                        <p className="text-gray-900 mt-1">{request.notes}</p>
                      </div>
                    )}
                    {request.status === 'REJECTED' && request.rejectionReason && (
                      <div className="bg-red-50 p-2 rounded">
                        <span className="text-red-600 font-medium">Rejection Reason:</span>
                        <p className="text-red-700 mt-1">{request.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
