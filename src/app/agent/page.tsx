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
    category: {
      name: string;
    } | null;
  };
}

interface DashboardData {
  requests: RequestData[];
  stats: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    completedRequests: number;
  };
}

export default function AgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username?: string; manager_id?: number } | null>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setAgentId(decodedToken.userId);
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // managerId is stored as customerId in user data for agents
      if (parsedUser.customerId) {
        setManagerId(parsedUser.customerId);
      }
    }
  }, [router]);

  useEffect(() => {
    if (agentId && managerId) {
      fetchDashboardData();
    }
  }, [agentId, managerId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?manager_id=${managerId}&user_id=${agentId}`);
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

  const stats = data?.stats || {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    completedRequests: 0,
  };

  const recentRequests = data?.requests?.slice(0, 5) || [];
  const orderedRequests = data?.requests?.filter(r => r.status === 'ORDERED').length || 0;

  // Calculate this week's requests
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekRequests = data?.requests?.filter(r => new Date(r.createdAt) >= oneWeekAgo).length || 0;

  // Get urgent/high priority pending requests
  const urgentPending = data?.requests?.filter(
    r => r.status === 'PENDING' && (r.priority === 'URGENT' || r.priority === 'HIGH')
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome back{user?.username ? `, ${user.username}` : ''}! Here&apos;s your request overview.
        </p>
      </div>

      {/* Alert for pending high priority requests */}
      {urgentPending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-700">
              You have <strong>{urgentPending}</strong> high priority request{urgentPending !== 1 ? 's' : ''} awaiting approval
            </span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRequests}</div>
          <div className="text-xs text-gray-500 mt-1">all requests</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingRequests}</div>
          <div className="text-xs text-gray-500 mt-1">awaiting review</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Approved</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.approvedRequests}</div>
          <div className="text-xs text-gray-500 mt-1">ready to order</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Ordered</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{orderedRequests}</div>
          <div className="text-xs text-gray-500 mt-1">in progress</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.completedRequests}</div>
          <div className="text-xs text-gray-500 mt-1">fulfilled</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Rejected</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.rejectedRequests}</div>
          <div className="text-xs text-gray-500 mt-1">declined</div>
        </div>
      </div>

      {/* Status Overview & Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Status Distribution */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Request Status Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-lg sm:text-xl font-bold text-yellow-700">{stats.pendingRequests}</div>
              <div className="text-xs text-yellow-600 mt-1">Pending</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg sm:text-xl font-bold text-blue-700">{stats.approvedRequests}</div>
              <div className="text-xs text-blue-600 mt-1">Approved</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-lg sm:text-xl font-bold text-purple-700">{orderedRequests}</div>
              <div className="text-xs text-purple-600 mt-1">Ordered</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg sm:text-xl font-bold text-green-700">{stats.completedRequests}</div>
              <div className="text-xs text-green-600 mt-1">Completed</div>
            </div>
            <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-lg sm:text-xl font-bold text-red-700">{stats.rejectedRequests}</div>
              <div className="text-xs text-red-600 mt-1">Rejected</div>
            </div>
          </div>
        </div>

        {/* This Week Stats */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-100 uppercase tracking-wide">This Week</div>
              <div className="text-3xl font-bold mt-1">{thisWeekRequests}</div>
              <div className="text-sm text-blue-100 mt-2">requests submitted</div>
            </div>
            <svg className="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Recent Requests & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Requests</h3>
            <button
              onClick={() => router.push('/agent/my-requests')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRequests.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No requests yet</p>
                <p className="text-xs mt-1">Scan a QR code to submit your first request</p>
              </div>
            ) : (
              recentRequests.map((request) => (
                <div key={request.id} className="px-4 sm:px-6 py-3 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getMethodIcon(request.requestMethod)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{request.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {request.location} &middot; {formatDate(request.createdAt)}
                        </p>
                        {request.status === 'REJECTED' && request.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">
                            Reason: {request.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-7 sm:ml-0">
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/agent/scan')}
              className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Scan QR Code</span>
                <p className="text-xs text-gray-500">Submit a new replenishment request</p>
              </div>
            </button>
            <button
              onClick={() => router.push('/agent/my-requests')}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-gray-700">View All Requests</span>
                <p className="text-xs text-gray-500">Track your submission history</p>
              </div>
            </button>
          </div>

          {/* Success Rate */}
          {stats.totalRequests > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-medium text-gray-900">
                  {Math.round(((stats.completedRequests + stats.approvedRequests + orderedRequests) / stats.totalRequests) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(((stats.completedRequests + stats.approvedRequests + orderedRequests) / stats.totalRequests) * 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.completedRequests + stats.approvedRequests + orderedRequests} of {stats.totalRequests} requests approved or completed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
