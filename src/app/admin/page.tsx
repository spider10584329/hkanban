'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

interface DashboardData {
  overview: {
    totalProducts: number;
    totalOrders: number;
    totalRequests: number;
    totalSuppliers: number;
    totalUsers: number;
    totalCategories: number;
    thisMonthSpending: number;
  };
  productStats: {
    total: number;
    active: number;
    withQrCode: number;
    withEink: number;
    lowStock: number;
  };
  orderStats: {
    total: number;
    pending: number;
    sent: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
    thisMonthSpending: number;
  };
  requestStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    ordered: number;
    completed: number;
  };
  supplierStats: {
    total: number;
    active: number;
  };
  userStats: {
    total: number;
    active: number;
  };
  alerts: {
    urgentPending: number;
    overdueOrders: number;
    lowStockProducts: number;
    pendingApprovals: number;
  };
  trends: {
    weeklyRequests: number;
    weeklyOrders: number;
  };
  recentActivity: {
    requests: Array<{
      id: number;
      productName: string;
      requestedBy: string;
      status: string;
      priority: string;
      createdAt: string;
    }>;
    orders: Array<{
      id: number;
      orderNumber: string;
      supplierName: string;
      status: string;
      totalAmount: number | null;
      itemCount: number;
      createdAt: string;
    }>;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username?: string } | null>(null);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setManagerId(decodedToken.userId);
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  useEffect(() => {
    if (managerId) {
      fetchDashboardData();
    }
  }, [managerId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard?manager_id=${managerId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
      SENT: 'bg-blue-100 text-blue-800 border-blue-200',
      IN_TRANSIT: 'bg-purple-100 text-purple-800 border-purple-200',
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status.replace('_', ' ')}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
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
            <h3 className="text-sm font-medium text-red-900">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts = data.alerts.urgentPending + data.alerts.overdueOrders + data.alerts.lowStockProducts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back{user?.username ? `, ${user.username}` : ''}! Here&apos;s your inventory overview.
        </p>
      </div>

      {/* Alerts Section */}
      {totalAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-semibold text-red-900">Attention Required</h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm">
            {data.alerts.urgentPending > 0 && (
              <span className="text-red-700">
                <strong>{data.alerts.urgentPending}</strong> urgent request{data.alerts.urgentPending !== 1 ? 's' : ''} pending
              </span>
            )}
            {data.alerts.overdueOrders > 0 && (
              <span className="text-red-700">
                <strong>{data.alerts.overdueOrders}</strong> overdue order{data.alerts.overdueOrders !== 1 ? 's' : ''}
              </span>
            )}
            {data.alerts.lowStockProducts > 0 && (
              <span className="text-red-700">
                <strong>{data.alerts.lowStockProducts}</strong> product{data.alerts.lowStockProducts !== 1 ? 's' : ''} low on stock
              </span>
            )}
          </div>
        </div>
      )}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Products</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{data.overview.totalProducts}</div>
          <div className="text-xs text-gray-500 mt-1">{data.productStats.active} active</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Orders</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{data.overview.totalOrders}</div>
          <div className="text-xs text-gray-500 mt-1">{data.orderStats.delivered} delivered</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Requests</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{data.overview.totalRequests}</div>
          <div className="text-xs text-gray-500 mt-1">{data.requestStats.pending} pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Suppliers</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{data.overview.totalSuppliers}</div>
          <div className="text-xs text-gray-500 mt-1">{data.supplierStats.active} active</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Users</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{data.overview.totalUsers}</div>
          <div className="text-xs text-gray-500 mt-1">{data.userStats.active} active</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">This Month</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.overview.thisMonthSpending)}</div>
          <div className="text-xs text-gray-500 mt-1">spending</div>
        </div>
      </div>

      {/* Status Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Order Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-lg sm:text-xl font-bold text-yellow-700">{data.orderStats.pending}</div>
              <div className="text-xs text-yellow-600 mt-1">Pending</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg sm:text-xl font-bold text-blue-700">{data.orderStats.sent}</div>
              <div className="text-xs text-blue-600 mt-1">Sent</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-lg sm:text-xl font-bold text-purple-700">{data.orderStats.inTransit}</div>
              <div className="text-xs text-purple-600 mt-1">In Transit</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg sm:text-xl font-bold text-green-700">{data.orderStats.delivered}</div>
              <div className="text-xs text-green-600 mt-1">Delivered</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-lg sm:text-xl font-bold text-gray-700">{data.orderStats.cancelled}</div>
              <div className="text-xs text-gray-600 mt-1">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Request Status */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Request Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-lg sm:text-xl font-bold text-yellow-700">{data.requestStats.pending}</div>
              <div className="text-xs text-yellow-600 mt-1">Pending</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg sm:text-xl font-bold text-blue-700">{data.requestStats.approved}</div>
              <div className="text-xs text-blue-600 mt-1">Approved</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-lg sm:text-xl font-bold text-purple-700">{data.requestStats.ordered}</div>
              <div className="text-xs text-purple-600 mt-1">Ordered</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg sm:text-xl font-bold text-green-700">{data.requestStats.completed}</div>
              <div className="text-xs text-green-600 mt-1">Completed</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-lg sm:text-xl font-bold text-red-700">{data.requestStats.rejected}</div>
              <div className="text-xs text-red-600 mt-1">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-100 uppercase tracking-wide">Weekly Requests</div>
              <div className="text-2xl font-bold mt-1">{data.trends.weeklyRequests}</div>
            </div>
            <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-xs text-blue-100 mt-2">Last 7 days</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-100 uppercase tracking-wide">Weekly Orders</div>
              <div className="text-2xl font-bold mt-1">{data.trends.weeklyOrders}</div>
            </div>
            <svg className="w-10 h-10 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div className="text-xs text-green-100 mt-2">Last 7 days</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-100 uppercase tracking-wide">QR Enabled</div>
              <div className="text-2xl font-bold mt-1">{data.productStats.withQrCode}</div>
            </div>
            <svg className="w-10 h-10 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="text-xs text-purple-100 mt-2">Products with QR</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-100 uppercase tracking-wide">E-ink Devices</div>
              <div className="text-2xl font-bold mt-1">{data.productStats.withEink}</div>
            </div>
            <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-xs text-indigo-100 mt-2">Connected devices</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Requests</h3>
            <button
              onClick={() => router.push('/admin/requests')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentActivity.requests.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                No recent requests
              </div>
            ) : (
              data.recentActivity.requests.map((request) => (
                <div key={request.id} className="px-4 sm:px-6 py-3 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{request.productName}</p>
                      <p className="text-xs text-gray-500">
                        by {request.requestedBy} &middot; {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Orders</h3>
            <button
              onClick={() => router.push('/admin/orders')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentActivity.orders.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                No recent orders
              </div>
            ) : (
              data.recentActivity.orders.map((order) => (
                <div key={order.id} className="px-4 sm:px-6 py-3 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        {order.supplierName} &middot; {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} &middot; {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/admin/products')}
            className="flex items-center gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Manage Products</span>
          </button>
          <button
            onClick={() => router.push('/admin/requests')}
            className="flex items-center gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Review Requests</span>
          </button>
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex items-center gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Create Order</span>
          </button>
          <button
            onClick={() => router.push('/admin/suppliers')}
            className="flex items-center gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Add Supplier</span>
          </button>
        </div>
      </div>
    </div>
  );
}
