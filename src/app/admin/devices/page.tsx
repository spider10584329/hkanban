'use client';

import { useState, useEffect } from 'react';

interface Device {
  id: number;
  deviceId: string;
  deviceType: string;
  deviceName: string | null;
  firmwareVersion: string | null;
  batteryLevel: number | null;
  isOnline: number;
  lastSyncAt: Date | null;
  lastButtonPress: Date | null;
  currentDisplay: string | null;
  displayMessage: string | null;
  location: string | null;
  installationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Stats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  lowBatteryDevices: number;
  activeToday: number;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    lowBatteryDevices: 0,
    activeToday: 0,
  });
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    deviceType: 'E-ink Display',
    location: '',
    firmwareVersion: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);

  // Get manager_id from authenticated user
  const [managerId, setManagerId] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const id = user.customerId || user.id;
        setManagerId(id);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setError('Failed to load user data');
      }
    } else {
      setError('No user data found. Please sign in again.');
    }
  }, []);

  useEffect(() => {
    if (managerId !== null) {
      fetchDevices();
    }
  }, [managerId]);

  const fetchDevices = async () => {
    if (managerId === null) {
      setError('Manager ID not available');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/devices?manager_id=${managerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch devices');
      }

      setDevices(data.devices);
      setStats(data.stats);
      setLocations(data.locations || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      deviceId: '',
      deviceName: '',
      deviceType: 'E-ink Display',
      location: '',
      firmwareVersion: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      deviceId: device.deviceId,
      deviceName: device.deviceName || '',
      deviceType: device.deviceType,
      location: device.location || '',
      firmwareVersion: device.firmwareVersion || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
    setFormData({
      deviceId: '',
      deviceName: '',
      deviceType: 'E-ink Display',
      location: '',
      firmwareVersion: '',
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deviceId.trim() && !editingDevice) {
      setFormError('Device ID (MAC address) is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const url = '/api/devices';
      const method = editingDevice ? 'PUT' : 'POST';
      const body = editingDevice
        ? {
            id: editingDevice.id,
            deviceName: formData.deviceName,
            deviceType: formData.deviceType,
            location: formData.location,
            firmwareVersion: formData.firmwareVersion,
          }
        : {
            manager_id: managerId,
            deviceId: formData.deviceId,
            deviceName: formData.deviceName,
            deviceType: formData.deviceType,
            location: formData.location,
            firmwareVersion: formData.firmwareVersion,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save device');
      }

      await fetchDevices();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (device: Device) => {
    if (!confirm(`Are you sure you want to delete device "${device.deviceName || device.deviceId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/devices?id=${device.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete device');
      }

      await fetchDevices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete device');
    }
  };

  const handleSyncDevices = async () => {
    if (managerId === null) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/devices/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync devices');
      }

      // Refresh device list after sync
      await fetchDevices();
      
      alert(`Sync complete! ${data.synced} of ${data.total} devices updated.${data.errors ? '\n\nSome errors occurred - check console for details.' : ''}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sync devices');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (device: Device) => {
    try {
      const response = await fetch('/api/devices/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: device.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle device status');
      }

      await fetchDevices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle device status');
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch =
      device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.deviceName && device.deviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (device.location && device.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'online' && device.isOnline === 1) ||
      (statusFilter === 'offline' && device.isOnline === 0);

    const matchesLocation = !locationFilter || device.location === locationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const formatDate = (dateString: Date | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBatteryColor = (level: number | null) => {
    if (level === null) return 'text-gray-400';
    if (level < 20) return 'text-red-600';
    if (level < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading devices...</div>
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
            <h3 className="text-sm font-medium text-red-900">Error Loading Devices</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchDevices}
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">E-ink Devices</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Monitor and manage E-ink display devices</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleSyncDevices}
            disabled={syncing || devices.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{syncing ? 'Syncing...' : 'Sync Status'}</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span>+</span>
            <span>Register Device</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600">Total Devices</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalDevices}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 sm:p-6 border border-green-200">
          <div className="text-xs sm:text-sm text-green-700">Online</div>
          <div className="text-xl sm:text-2xl font-bold text-green-700 mt-1 sm:mt-2">{stats.onlineDevices}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 sm:p-6 border border-red-200">
          <div className="text-xs sm:text-sm text-red-700">Offline</div>
          <div className="text-xl sm:text-2xl font-bold text-red-700 mt-1 sm:mt-2">{stats.offlineDevices}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 sm:p-6 border border-yellow-200">
          <div className="text-xs sm:text-sm text-yellow-700">Low Battery</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-700 mt-1 sm:mt-2">{stats.lowBatteryDevices}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 sm:p-6 border border-blue-200 col-span-2 sm:col-span-1">
          <div className="text-xs sm:text-sm text-blue-700">Active Today</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 sm:mt-2">{stats.activeToday}</div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-3">
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Device Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Display Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Sync</th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 sm:px-6 py-12 text-center text-gray-500 text-sm">
                    {searchTerm || statusFilter || locationFilter
                      ? 'No devices found matching your filters.'
                      : 'No devices registered. Click "Register Device" to add one.'}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-xs sm:text-sm font-mono text-gray-900 break-all">{device.deviceId}</div>
                      <div className="text-xs text-gray-500">{device.deviceType}</div>
                      <div className="md:hidden text-xs text-gray-600 mt-1">{device.deviceName || '-'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {device.deviceName || '-'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell">
                      <div className="text-sm text-gray-600">{device.location || '-'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {device.isOnline === 1 ? (
                        <span 
                          onClick={() => handleToggleStatus(device)}
                          className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors"
                          title="Click to toggle status (for testing)"
                        >
                          Online
                        </span>
                      ) : (
                        <span 
                          onClick={() => handleToggleStatus(device)}
                          className="px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 transition-colors"
                          title="Click to toggle status (for testing)"
                        >
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className={`text-xs sm:text-sm font-medium ${getBatteryColor(device.batteryLevel)}`}>
                        {device.batteryLevel !== null ? `${device.batteryLevel}%` : '-'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 hidden xl:table-cell">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {device.currentDisplay || '-'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-sm text-gray-600">{formatDate(device.lastSyncAt)}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => openEditModal(device)}
                          className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(device)}
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

      {/* Device Management Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="text-blue-600 mt-1 flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">E-ink Device Integration</h3>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              E-ink devices sync automatically with the MinewTag cloud platform. Register devices by their MAC address and assign them to products. Staff can press the button on the display to trigger replenishment requests.
            </p>
            <div className="mt-3 p-3 bg-white rounded border border-blue-200">
              <p className="text-xs sm:text-sm font-medium text-blue-900 mb-2">Device Status Indicators:</p>
              <ul className="text-xs sm:text-sm text-blue-700 space-y-2">
                <li className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800 w-fit">Online</span>
                  <span>Device is connected and communicating with the cloud platform</span>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800 w-fit">Offline</span>
                  <span>Device is newly registered or hasn&apos;t synced yet. Click &quot;Sync Status&quot; to update.</span>
                </li>
              </ul>
              <p className="text-xs text-blue-600 mt-2 italic">
                💡 Tip: Devices show as &quot;Offline&quot; when first registered. They become &quot;Online&quot; after their first sync with the MinewTag platform. Use the &quot;Sync Status&quot; button to fetch the latest status from the cloud.
              </p>
            </div>
          </div>
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
                    <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900">
                        {editingDevice ? 'Edit Device' : 'Register New Device'}
                      </h3>
                      <div className="mt-4 space-y-4">
                        {formError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
                            {formError}
                          </div>
                        )}
                        <div>
                          <label htmlFor="deviceId" className="block text-xs sm:text-sm font-medium text-gray-700">
                            Device ID (MAC Address) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="deviceId"
                            value={formData.deviceId}
                            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 font-mono text-xs sm:text-sm"
                            placeholder="e.g., AC233FC00001"
                            required
                            disabled={!!editingDevice}
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Enter the MAC address from the device label
                          </p>
                        </div>
                        <div>
                          <label htmlFor="deviceName" className="block text-xs sm:text-sm font-medium text-gray-700">
                            Device Name
                          </label>
                          <input
                            type="text"
                            id="deviceName"
                            value={formData.deviceName}
                            onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            placeholder="e.g., Room 101 Display"
                          />
                        </div>
                        <div>
                          <label htmlFor="deviceType" className="block text-xs sm:text-sm font-medium text-gray-700">
                            Device Type
                          </label>
                          <select
                            id="deviceType"
                            value={formData.deviceType}
                            onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                          >
                            <option value="E-ink Display">E-ink Display</option>
                            <option value="E-ink 2.13">E-ink 2.13&quot;</option>
                            <option value="E-ink 2.9">E-ink 2.9&quot;</option>
                            <option value="E-ink 4.2">E-ink 4.2&quot;</option>
                            <option value="E-ink 7.5">E-ink 7.5&quot;</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="location" className="block text-xs sm:text-sm font-medium text-gray-700">
                            Location
                          </label>
                          <input
                            type="text"
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            placeholder="e.g., Storage Room A, Floor 2"
                          />
                        </div>
                        <div>
                          <label htmlFor="firmwareVersion" className="block text-xs sm:text-sm font-medium text-gray-700">
                            Firmware Version
                          </label>
                          <input
                            type="text"
                            id="firmwareVersion"
                            value={formData.firmwareVersion}
                            onChange={(e) => setFormData({ ...formData, firmwareVersion: e.target.value })}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            placeholder="e.g., v1.2.3"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full justify-center rounded-lg bg-gray-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-black disabled:bg-gray-400 sm:w-auto"
                  >
                    {submitting ? 'Saving...' : editingDevice ? 'Save Changes' : 'Register Device'}
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
