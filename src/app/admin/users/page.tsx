'use client';

import { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface User {
  id: number;
  username: string;
  manager_id: number;
  isActive: number;
}

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get actual manager_id from authenticated session
  const managerId = 25; // Temporary hardcoded value - matches current database users

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users?manager_id=${managerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isActive: user.isActive === 1 ? 0 : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      // Update local state with the updated user
      setUsers(users.map(u =>
        u.id === userId ? data.user : u
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user status');
      console.error('Error updating user status:', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' ||
      (statusFilter === 'active' && user.isActive === 1) ||
      (statusFilter === 'inactive' && user.isActive === 0);
    return matchesSearch && matchesStatus;
  });

  const activeCount = users.filter(u => u.isActive === 1).length;
  const inactiveCount = users.filter(u => u.isActive === 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading users...</div>
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
            <h3 className="text-sm font-medium text-red-900">Error Loading Users</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchUsers}
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage agent accounts and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Users</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{users.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 sm:p-6 border border-green-200">
          <div className="text-xs sm:text-sm text-green-700 font-medium">Active</div>
          <div className="text-xl sm:text-2xl font-bold text-green-700 mt-1 sm:mt-2">{activeCount}</div>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4 sm:p-6 border border-gray-200">
          <div className="text-xs sm:text-sm text-gray-700">Inactive/Pending</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-700 mt-1 sm:mt-2">{inactiveCount}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 sm:p-6 border border-blue-200">
          <div className="text-xs sm:text-sm text-blue-700">Active Today</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 sm:mt-2">0</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Search users by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm sm:text-base"
          />
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive/Pending' },
            ]}
            placeholder="All Status"
            searchable={false}
            className="w-full sm:w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: '600px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchTerm || statusFilter !== ''
                      ? 'No users found matching your filters.'
                      : 'No users registered yet. Agents can register from the login page.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">#{user.id}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <svg className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="ml-2 sm:ml-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 break-words">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm text-gray-900">{user.manager_id}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {user.isActive === 1 ? (
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            user.isActive === 1
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                          }`}
                          title={user.isActive === 1 ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-2 sm:px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                          title="Delete user"
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

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="text-blue-600 mt-1 flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-blue-900">User Registration Process</h3>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              Agents register through the main login page. Their email is verified against PulsePoint system, and accounts are created with "Inactive" status by default. As an administrator, you must activate users before they can access the system. Active users can scan QR codes and create replenishment requests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

