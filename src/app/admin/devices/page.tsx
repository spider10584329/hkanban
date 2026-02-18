'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';

interface Device {
  id: number;
  manager_id: number;
  mac_address: string;
  status: string;
  // Legacy fields for backward compatibility (optional)
  deviceId?: string;
  deviceType?: string;
  deviceName?: string | null;
  firmwareVersion?: string | null;
  batteryLevel?: number | null;
  isOnline?: number;
  lastSyncAt?: Date | null;
  lastButtonPress?: Date | null;
  currentDisplay?: string | null;
  displayMessage?: string | null;
  location?: string | null;
  installationDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Stats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  lowBatteryDevices: number;
  activeToday: number;
}

export default function DevicesPage() {
  const notification = useNotification();
  const [activeTab, setActiveTab] = useState<'store' | 'template' | 'gateway' | 'esl'>('esl');
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
  
  // Minew sync state
  const [minewSyncing, setMinewSyncing] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [minewStores, setMinewStores] = useState<Array<{ storeId: string; name: string; number?: string }>>([]);

  // Templates state
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    storeId: string;
    screenSize: string;
    color: string;
  }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  
  // Stores loading state
  const [storesLoading, setStoresLoading] = useState(false);

  // Gateway state (Minew cloud gateways matched with local DB)
  const [minewGateways, setMinewGateways] = useState<Array<{
    id: string;
    name: string;
    mac: string;
    storeId: string;
    mode: number; // 1 = online, 0 = offline
    version?: string;
    updateTime?: string;
    localId?: number; // Local DB id for deletion
    localCreatedAt?: string;
    // Additional fields from Minew cloud
    model?: string;
    wifiVersion?: string;
    bleVersion?: string;
    ip?: string;
  }>>([]);
  const [minewGatewaysLoading, setMinewGatewaysLoading] = useState(false);
  
  // Local database gateways
  const [gateways, setGateways] = useState<Array<{
    id: number;
    name: string;
    mac_address: string;
    manager_id: number;
    created_at: string;
  }>>([]);
  const [gatewaysLoading, setGatewaysLoading] = useState(false);
  
  // ESL Tags state
  const [eslTags, setEslTags] = useState<Array<{
    id: string;
    mac: string;
    storeId: string;
    screenSize: string;
    screenInfo: {
      inch: number;
      width: number;
      height: number;
      color: string;
    };
    isOnline: string; // '1' = offline, '2' = online
    battery: number;
    bind: string; // '0' = unbound, '1' = bound
    updateTime?: string;
    // Local database fields
    localId?: number;
    localDeviceName?: string;
  }>>([]);
  const [eslTagsLoading, setEslTagsLoading] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayFormData, setGatewayFormData] = useState({
    name: '',
    macAddress: '',
  });
  const [gatewaySubmitting, setGatewaySubmitting] = useState(false);
  const [gatewayFormError, setGatewayFormError] = useState<string | null>(null);

  // ESL Label modal state
  const [isESLLabelModalOpen, setIsESLLabelModalOpen] = useState(false);
  const [eslLabelFormData, setEslLabelFormData] = useState({
    macAddress: '',
  });
  const [eslLabelSubmitting, setEslLabelSubmitting] = useState(false);
  const [eslLabelFormError, setEslLabelFormError] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
      fetchMinewStores();
    }
  }, [managerId]);

  const fetchMinewStores = async () => {
    setStoresLoading(true);
    try {      
      const response = await fetch('/api/minew/stores');    
      const data = await response.json();  
      
      if (response.ok && data.stores) {
        // Ensure each store has a storeId property
        const normalizedStores = data.stores.map((store: any) => ({
          storeId: store.storeId || store.id,
          name: store.name,
          number: store.number,
        }));
        
        setMinewStores(normalizedStores);
        
        if (normalizedStores.length > 0 && !selectedStoreId) {
          setSelectedStoreId(normalizedStores[0].storeId);
        }
      } else {
        setMinewStores([]);
      }
    } catch (err) {
      setMinewStores([]);
    } finally {
      setStoresLoading(false);
    }
  };

  const fetchTemplates = async (storeId: string) => {
    if (!storeId) {
      setTemplatesError('Please select a store first');
      setTemplates([]);
      return;
    }

    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const response = await fetch(`/api/minew/templates?storeId=${storeId}&page=1&size=50`);
      const data = await response.json();

      if (response.ok && data.templates) {
        setTemplates(data.templates);
        setTemplatesError(null);
      } else {
        const errorMsg = data.error || 'Unknown error';
        const fullError = `${errorMsg}${data.details ? ': ' + data.details : ''}`;
        setTemplatesError(fullError);
        setTemplates([]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setTemplatesError(errorMsg);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchMinewGateways = async (storeId: string) => {
    if (!storeId || !managerId) return;

    setMinewGatewaysLoading(true);
    try {
      // Fetch gateways from both sources in parallel
      const [minewResponse, localResponse] = await Promise.all([
        fetch(`/api/minew/gateways?storeId=${storeId}`),
        fetch(`/api/gateway?manager_id=${managerId}`)
      ]);

      const minewData = await minewResponse.json();
      const localData = await localResponse.json();

      if (minewResponse.ok && minewData.gateways && localResponse.ok && localData.gateways) {
        const minewGatewaysFromCloud = minewData.gateways;
        const localGateways = localData.gateways;

        // Match gateways by MAC address (only show gateways owned by this manager)
        const matchedGateways = minewGatewaysFromCloud
          .map((minewGw: any) => {
            const normalizedMinewMac = minewGw.mac.replace(/[:-]/g, '').toUpperCase();

            // Find matching local gateway
            const localMatch = localGateways.find((localGw: any) => {
              const normalizedLocalMac = localGw.mac_address.replace(/[:-]/g, '').toUpperCase();
              return normalizedLocalMac === normalizedMinewMac;
            });

            // Only include if there's a local match (i.e., belongs to this manager)
            if (localMatch) {
              return {
                id: minewGw.id,
                name: minewGw.name,
                mac: minewGw.mac,
                storeId: minewGw.storeId,
                mode: minewGw.mode,
                version: minewGw.version,
                updateTime: minewGw.updateTime,
                localId: localMatch.id,
                localCreatedAt: localMatch.created_at,
                // Map additional fields from Minew cloud (handle various possible field names)
                model: minewGw.model || minewGw.modelNo || minewGw.deviceModel || null,
                wifiVersion: minewGw.wifiVersion || minewGw.wifiFirmwareVersion || minewGw.wifi_version || null,
                bleVersion: minewGw.bleVersion || minewGw.bluetoothVersion || minewGw.bleFirmwareVersion || minewGw.ble_version || null,
                ip: minewGw.ip || minewGw.ipAddress || minewGw.ip_address || null,
              };
            }
            return null;
          })
          .filter((gw: any) => gw !== null);

        setMinewGateways(matchedGateways);
      } else {
        console.error('Failed to fetch gateways:', minewData.error || localData.error);
        setMinewGateways([]);
      }
    } catch (err) {
      console.error('Error fetching gateways:', err);
      setMinewGateways([]);
    } finally {
      setMinewGatewaysLoading(false);
    }
  };

  const fetchESLTags = async (storeId: string) => {
    if (!storeId || !managerId) return;

    setEslTagsLoading(true);
    try {
      // Fetch ESL tags from both Minew cloud and local database in parallel
      const [minewResponse, localResponse] = await Promise.all([
        fetch(`/api/minew/tags?storeId=${storeId}&page=1&size=100`),
        fetch(`/api/devices?manager_id=${managerId}&minewSynced=1`)
      ]);

      const minewData = await minewResponse.json();
      const localData = await localResponse.json();

      if (minewResponse.ok && minewData.tags && localResponse.ok && localData.devices) {
        const minewTags = minewData.tags;
        const localDevices = localData.devices;

        // Match tags by MAC address (only show tags owned by this manager)
        const matchedTags = minewTags
          .map((tag: any) => {
            const normalizedMinewMac = tag.mac.replace(/[:-]/g, '').toLowerCase();

            // Find matching local device
            const localMatch = localDevices.find((device: any) => {
              // Use mac_address from new device table schema
              const macAddress = device.mac_address || device.deviceId;
              if (!macAddress) return false;
              const normalizedLocalMac = macAddress.replace(/[:-]/g, '').toLowerCase();
              return normalizedLocalMac === normalizedMinewMac;
            });

            // Only include if there's a local match (i.e., belongs to this manager)
            if (localMatch) {
              return {
                ...tag,
                localId: localMatch.id,
                localDeviceName: localMatch.deviceName,
              };
            }
            return null;
          })
          .filter((tag: any) => tag !== null);

        setEslTags(matchedTags);
      } else {
        setEslTags([]);
      }
    } catch (err) {
      console.error('Error fetching ESL tags:', err);
      setEslTags([]);
    } finally {
      setEslTagsLoading(false);
    }
  };

  // Fetch templates when store selection changes
  useEffect(() => {
    if (selectedStoreId) {
      fetchTemplates(selectedStoreId);
      fetchGateways();
    }
  }, [selectedStoreId]);

  const fetchGateways = async () => {
    if (!managerId) return;

    setGatewaysLoading(true);
    try {
      const response = await fetch(`/api/gateway?manager_id=${managerId}`);
      const data = await response.json();

      if (response.ok && data.gateways) {
        setGateways(data.gateways);
      } else {
        console.error('Failed to fetch gateways:', data.error);
      }
    } catch (err) {
      console.error('Error fetching gateways:', err);
    } finally {
      setGatewaysLoading(false);
    }
  };

  const openGatewayModal = () => {
    setGatewayFormData({
      name: '',
      macAddress: '',
    });
    setGatewayFormError(null);
    setIsGatewayModalOpen(true);
  };

  const closeGatewayModal = () => {
    setIsGatewayModalOpen(false);
    setGatewayFormData({
      name: '',
      macAddress: '',
    });
    setGatewayFormError(null);
  };

  const openESLLabelModal = () => {
    setEslLabelFormData({
      macAddress: '',
    });
    setEslLabelFormError(null);
    setIsESLLabelModalOpen(true);
  };

  const closeESLLabelModal = () => {
    setIsESLLabelModalOpen(false);
    setEslLabelFormData({
      macAddress: '',
    });
    setEslLabelFormError(null);
  };

  const handleESLLabelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eslLabelFormData.macAddress.trim()) {
      setEslLabelFormError('MAC Address is required');
      return;
    }

    if (!selectedStoreId) {
      setEslLabelFormError('Please select a store first');
      return;
    }

    if (!managerId) {
      setEslLabelFormError('Manager ID not found. Please refresh the page and try again.');
      return;
    }

    setEslLabelSubmitting(true);
    setEslLabelFormError(null);

    try {
      // Call the API to add ESL label to Minew cloud and local database
      const response = await fetch('/api/minew/tags/batchAdd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: selectedStoreId,
          macArray: [eslLabelFormData.macAddress.trim()],
          type: 1,
          manager_id: managerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add ESL label');
      }

      // Success - close modal and show notification
      closeESLLabelModal();
      notification.success(
        'Label Added',
        `ESL Label with MAC address ${eslLabelFormData.macAddress} has been successfully added to Minew cloud and local database`
      );

      // Refresh the ESL tags list
      await fetchESLTags(selectedStoreId);
    } catch (err) {
      setEslLabelFormError(err instanceof Error ? err.message : 'Failed to add label');
    } finally {
      setEslLabelSubmitting(false);
    }
  };

  const handleGatewaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gatewayFormData.name.trim() || !gatewayFormData.macAddress.trim()) {
      setGatewayFormError('Name and MAC address are required');
      return;
    }

    if (!selectedStoreId) {
      setGatewayFormError('Please select a store first');
      return;
    }

    setGatewaySubmitting(true);
    setGatewayFormError(null);

    try {
      const response = await fetch('/api/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gatewayFormData.name,
          mac: gatewayFormData.macAddress,
          manager_id: managerId,
          storeId: selectedStoreId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add gateway');
      }

      // Success
      await fetchGateways();
      closeGatewayModal();
      notification.success(
        'Gateway Registered',
        `Gateway "${gatewayFormData.name}" has been successfully registered with MAC address ${gatewayFormData.macAddress}`
      );
    } catch (err) {
      setGatewayFormError(err instanceof Error ? err.message : 'Failed to add gateway');
    } finally {
      setGatewaySubmitting(false);
    }
  };

  const handleDeleteGateway = async (gatewayId: number) => {
    const gateway = gateways.find(g => g.id === gatewayId);
    
    if (!selectedStoreId) {
      notification.warning('Store Required', 'Please select a Minew store first');
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Gateway',
      message: `Are you sure you want to delete the gateway "${gateway?.name || 'this gateway'}"? This will remove it from both the local database and Minew cloud. This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/gateway?id=${gatewayId}&storeId=${selectedStoreId}`, {
            method: 'DELETE',
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete gateway');
          }

          await fetchGateways();
          notification.success('Gateway Deleted', 'The gateway has been successfully removed from both local database and Minew cloud');
        } catch (err) {
          notification.error('Delete Failed', err instanceof Error ? err.message : 'Failed to delete gateway');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteESLTag = async (tag: { mac: string; localId?: number }) => {
    if (!selectedStoreId) {
      notification.warning('Store Required', 'Please select a Minew store first');
      return;
    }

    if (!managerId) {
      notification.warning('Authentication Required', 'Please log in again');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete ESL Tag',
      message: `Are you sure you want to delete the ESL tag with MAC address "${tag.mac}"? This will remove it from both the Minew cloud and local database. This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/minew/tags', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId: selectedStoreId,
              macAddresses: [tag.mac],
              manager_id: managerId,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete ESL tag');
          }

          // Refresh the ESL tags list
          await fetchESLTags(selectedStoreId);
          notification.success(
            'ESL Tag Deleted',
            `ESL tag "${tag.mac}" has been successfully removed from Minew cloud and local database`
          );
        } catch (err) {
          notification.error('Delete Failed', err instanceof Error ? err.message : 'Failed to delete ESL tag');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleMinewSync = async (action: string) => {
    if (!managerId || !selectedStoreId) {
      notification.warning('Store Required', 'Please select a Minew store first');
      return;
    }

    setMinewSyncing(true);
    try {
      const response = await fetch('/api/minew/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
          storeId: selectedStoreId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Minew sync failed');
      }

      await fetchDevices();
      notification.success('Sync Complete', data.message || 'Sync completed successfully!');
    } catch (err) {
      notification.error('Sync Failed', err instanceof Error ? err.message : 'Minew sync failed');
    } finally {
      setMinewSyncing(false);
    }
  };

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
      deviceId: device.mac_address || device.deviceId || '',
      deviceName: device.deviceName || '',
      deviceType: device.deviceType || 'E-ink Display',
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
    const displayName = device.deviceName || device.mac_address || device.deviceId || 'this device';
    setConfirmModal({
      isOpen: true,
      title: 'Delete Device',
      message: `Are you sure you want to delete device "${displayName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/devices?id=${device.id}`, {
            method: 'DELETE',
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete device');
          }

          await fetchDevices();
          notification.success('Device Deleted', `Device "${displayName}" has been removed`);
        } catch (err) {
          notification.error('Delete Failed', err instanceof Error ? err.message : 'Failed to delete device');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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
      
      const message = `${data.synced} of ${data.total} devices updated successfully`;
      if (data.errors) {
        notification.warning('Sync Complete with Warnings', message + '. Some errors occurred - check console for details.');
      } else {
        notification.success('Sync Complete', message);
      }
    } catch (err) {
      notification.error('Sync Failed', err instanceof Error ? err.message : 'Failed to sync devices');
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
      notification.error('Toggle Failed', err instanceof Error ? err.message : 'Failed to toggle device status');
    }
  };

  const filteredDevices = devices.filter(device => {
    // Use mac_address from new device table schema
    const deviceId = (device as any).mac_address || (device as any).deviceId || '';
    const deviceName = (device as any).deviceName || '';
    const location = (device as any).location || '';
    
    const matchesSearch =
      deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deviceName && deviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (location && location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'online' && (device as any).isOnline === 1) ||
      (statusFilter === 'offline' && (device as any).isOnline === 0);

    const matchesLocation = !locationFilter || location === locationFilter;

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
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Minew ESL Devices</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('store');
              fetchMinewStores();
            }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'store'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Store
          </button>
          <button
            onClick={() => {
              setActiveTab('template');
              if (selectedStoreId) fetchTemplates(selectedStoreId);
            }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'template'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Template
          </button>
          <button
            onClick={() => {
              setActiveTab('gateway');
              if (selectedStoreId) fetchMinewGateways(selectedStoreId);
              fetchGateways();
            }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'gateway'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Gateway
          </button>
          <button
            onClick={() => {
              setActiveTab('esl');
              if (selectedStoreId) fetchESLTags(selectedStoreId);
            }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'esl'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ESL Label
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'store' && (
        <>
          {/* Store Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">id</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">coding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">PartNo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">specification</th>
                   
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {storesLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500 text-sm">
                        Loading stores from Minew cloud...
                      </td>
                    </tr>
                  ) : minewStores.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500 text-sm">
                        No stores found.
                      </td>
                    </tr>
                  ) : (
                    minewStores.map((store, index) => (
                      <tr key={store.storeId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{store.storeId}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{store.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{store.number || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">-</td>
                        <td className="px-4 py-3 text-sm text-gray-700">-</td>                        
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium">
                1
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option>10/page</option>
                  <option>20/page</option>
                  <option>50/page</option>
                  <option>100/page</option>
                </select>
                <span>1 pages in total</span>
                <span>Go to</span>
                <input
                  type="number"
                  defaultValue="1"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span>page</span>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'template' && (
        <>
          {/* Store Selector for Templates */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center gap-4">
              <label htmlFor="template-store-select" className="text-sm font-medium text-gray-700">
                Select Store:
              </label>
              <select
                id="template-store-select"
                value={selectedStoreId}
                onChange={(e) => {
                  const newStoreId = e.target.value;
                  setSelectedStoreId(newStoreId);
                  if (newStoreId) {
                    fetchTemplates(newStoreId);
                  }
                }}
                className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a store --</option>
                {minewStores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.name} ({store.storeId})
                  </option>
                ))}
              </select>
              {selectedStoreId && (
                <button
                  onClick={() => fetchTemplates(selectedStoreId)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Template Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">template id</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">display size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">color</th>                  
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templatesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                        Loading templates from Minew cloud...
                      </td>
                    </tr>
                  ) : templatesError ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="text-red-600 text-sm">
                          <p className="font-medium">Error loading templates</p>
                          <p className="mt-1 text-xs">{templatesError}</p>
                          {!selectedStoreId && (
                            <p className="mt-2 text-gray-600">Please select a store from the Store tab first.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : !selectedStoreId ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                        <p>Please select a store to view templates.</p>
                        <p className="mt-2 text-xs">Go to the Store tab and select a store first.</p>
                      </td>
                    </tr>
                  ) : templates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                        No templates found for this store.
                      </td>
                    </tr>
                  ) : (
                    templates.map((template, index) => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{template.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{template.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{template.screenSize}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            template.color === 'black' ? 'bg-gray-100 text-gray-800' :
                            template.color === 'red' ? 'bg-red-100 text-red-800' :
                            template.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            template.color === 'bwry' ? 'bg-blue-100 text-blue-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {template.color}
                          </span>
                        </td>                       
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium">
                1
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option>10/page</option>
                  <option>20/page</option>
                  <option>50/page</option>
                  <option>100/page</option>
                </select>
                <span>1 pages in total</span>
                <span>Go to</span>
                <input
                  type="number"
                  defaultValue="1"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span>page</span>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'gateway' && (
        <>
          {/* Store Selector for Gateways */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center gap-4">
              <label htmlFor="gateway-store-select" className="text-sm font-medium text-gray-700">
                Select Store:
              </label>
              <select
                id="gateway-store-select"
                value={selectedStoreId}
                onChange={(e) => {
                  const newStoreId = e.target.value;
                  setSelectedStoreId(newStoreId);
                  if (newStoreId) {
                    fetchMinewGateways(newStoreId);
                  }
                }}
                className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a store --</option>
                {minewStores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.name} ({store.storeId})
                  </option>
                ))}
              </select>
              {selectedStoreId && (
                <button
                  onClick={() => {
                    fetchMinewGateways(selectedStoreId);
                    fetchGateways();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Gateway Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg shadow">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option>Select</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={openGatewayModal}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add
              </button>
              
            </div>
          </div>

          {/* Gateway Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Gateway name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Mac address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Updating time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Model No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">WiFi firmware version</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Bluetooth firmware version</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">IP address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Operate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {minewGatewaysLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500 text-sm">
                        Loading gateways from Minew cloud...
                      </td>
                    </tr>
                  ) : !selectedStoreId ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500 text-sm">
                        Please select a store to view gateways.
                      </td>
                    </tr>
                  ) : minewGateways.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500 text-sm">
                        No gateways found in Minew cloud.
                      </td>
                    </tr>
                  ) : (
                    minewGateways.map((gateway, index) => (
                      <tr key={gateway.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{gateway.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-mono">{gateway.mac}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            gateway.mode === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {gateway.mode === 1 ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {gateway.updateTime ? new Date(gateway.updateTime).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{gateway.model || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{gateway.wifiVersion || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{gateway.bleVersion || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{gateway.ip || '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              // Find matching local gateway by MAC address
                              const localGateway = gateways.find(g => 
                                g.mac_address.replace(/[:-]/g, '').toUpperCase() === 
                                gateway.mac.replace(/[:-]/g, '').toUpperCase()
                              );
                              if (localGateway) {
                                handleDeleteGateway(localGateway.id);
                              } else {
                                notification.error('Error', 'Gateway not found in local database');
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium">
                1
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option>10/page</option>
                  <option>20/page</option>
                  <option>50/page</option>
                  <option>100/page</option>
                </select>
                <span>1 pages in total</span>
                <span>Go to</span>
                <input
                  type="number"
                  defaultValue="1"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span>page</span>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'esl' && (
        <>
          {/* Store Selector for ESL Tags */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center gap-4">
              <label htmlFor="esl-store-select" className="text-sm font-medium text-gray-700">
                Select Store:
              </label>
              <select
                id="esl-store-select"
                value={selectedStoreId}
                onChange={(e) => {
                  const newStoreId = e.target.value;
                  setSelectedStoreId(newStoreId);
                  if (newStoreId) {
                    fetchESLTags(newStoreId);
                  }
                }}
                className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a store --</option>
                {minewStores.map((store) => (
                  <option key={store.storeId} value={store.storeId}>
                    {store.name} ({store.storeId})
                  </option>
                ))}
              </select>
              {selectedStoreId && (
                <button
                  onClick={() => fetchESLTags(selectedStoreId)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg shadow">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={openESLLabelModal}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add
              </button>
            </div>
          </div>

          {/* Devices Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">MAC address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Size(")</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">RSSI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Battery level(%)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Online status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Data ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Operate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eslTagsLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                        Loading ESL tags from Minew cloud...
                      </td>
                    </tr>
                  ) : !selectedStoreId ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                        Please select a store to view ESL tags.
                      </td>
                    </tr>
                  ) : eslTags.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                        No ESL tags found in Minew cloud.
                      </td>
                    </tr>
                  ) : (
                    eslTags.map((tag, index) => (
                      <tr key={tag.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-mono text-blue-600">{tag.mac}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {tag.screenInfo ? `${tag.screenInfo.inch}"` : tag.screenSize}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[1, 2, 3, 4].map((bar) => (
                                <div
                                  key={bar}
                                  className={`w-1 h-3 mx-0.5 ${
                                    tag.isOnline === '2' ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                  style={{ height: `${bar * 3 + 3}px` }}
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {tag.battery !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                                tag.battery >= 80 ? 'bg-green-100 text-green-700 border border-green-300' :
                                tag.battery >= 50 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                'bg-red-100 text-red-700 border border-red-300'
                              }`}>
                                {tag.battery}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tag.isOnline === '2' ? (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Online</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-600">Offline</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {tag.bind === '1' ? 'Bound' : 'Unbound'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteESLTag({ mac: tag.mac, localId: tag.localId })}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium">
                1
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option>10/page</option>
                  <option>20/page</option>
                  <option>50/page</option>
                  <option>100/page</option>
                </select>
                <span>1 pages in total</span>
                <span>Go to</span>
                <input
                  type="number"
                  defaultValue="1"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span>page</span>
                <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Confirm
                </button>
              </div>
            </div>
          </div>

        </>
      )}

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

      {/* Gateway Modal */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full  items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeGatewayModal} />
            <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md">
              <form onSubmit={handleGatewaySubmit}>
                <div className="bg-white px-6 pt-5 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Add</h3>
                    <button
                      type="button"
                      onClick={closeGatewayModal}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {gatewayFormError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {gatewayFormError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="gatewayName" className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="text-red-500">*</span> Name
                      </label>
                      <input
                        type="text"
                        id="gatewayName"
                        value={gatewayFormData.name}
                        onChange={(e) => setGatewayFormData({ ...gatewayFormData, name: e.target.value })}
                        className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="macAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="text-red-500">*</span> Mac address
                      </label>
                      <input
                        type="text"
                        id="macAddress"
                        value={gatewayFormData.macAddress}
                        onChange={(e) => setGatewayFormData({ ...gatewayFormData, macAddress: e.target.value })}
                        className="block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeGatewayModal}
                    disabled={gatewaySubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={gatewaySubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {gatewaySubmitting ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ESL Label Modal */}
      {isESLLabelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity" 
            onClick={closeESLLabelModal}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-200 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900">Add Label</h3>
              <button
                onClick={closeESLLabelModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              <form onSubmit={handleESLLabelSubmit}>
                {eslLabelFormError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {eslLabelFormError}
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={eslLabelFormData.macAddress}
                    onChange={(e) => setEslLabelFormData({ ...eslLabelFormData, macAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter MAC address"
                    disabled={eslLabelSubmitting}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeESLLabelModal}
                    disabled={eslLabelSubmitting}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eslLabelSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {eslLabelSubmitting ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity" 
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {confirmModal.message}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmModal.onConfirm()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    confirmModal.confirmColor === 'red'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
