'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/components/ui/ToastProvider';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface Product {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  categoryName: string;
  supplierName: string | null;
  location: string;
  reorderThreshold: number | null;
  standardOrderQty: number | null;
  unitPrice: number | null;
  qrCodeUrl: string | null;
  hasEinkDevice: number;
}

interface RecentScan {
  id: string;
  productName: string;
  sku: string | null;
  location: string;
  timestamp: Date;
  status: 'success' | 'pending';
}

export default function ScanPage() {
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Manual entry form
  const [manualCode, setManualCode] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualQuantity, setManualQuantity] = useState('');
  const [manualPriority, setManualPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [manualNotes, setManualNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // User and manager data
  const [userId, setUserId] = useState<number | null>(null);
  const [managerId, setManagerId] = useState<number | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'qr-reader';

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserId(user.id);
        setManagerId(user.customerId);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      
      // Check if browser supports getUserMedia (camera access)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast(
          'error',
          'Camera Not Supported',
          'Your browser does not support camera access. Please use a modern browser or try manual entry.'
        );
        return;
      }

      // Check if device has cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          showToast(
            'warning',
            'No Camera Found',
            'This device does not have a camera. Please use the manual entry form to submit requests.'
          );
          return;
        }
      } catch (enumError) {
        console.error('Error checking for cameras:', enumError);
        // Continue anyway - let the main scanner try
      }

      html5QrCodeRef.current = new Html5Qrcode(scannerElementId);

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      );

      setScanning(true);
      showToast('success', 'Camera Started', 'Point your camera at a QR code to scan.');
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      
      // Handle specific error types
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showToast(
          'error',
          'Camera Permission Denied',
          'Please allow camera access in your browser settings to use the QR scanner.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        showToast(
          'warning',
          'No Camera Available',
          'No camera was detected on this device. Please use the manual entry form instead.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        showToast(
          'error',
          'Camera In Use',
          'The camera is being used by another application. Please close other apps and try again.'
        );
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        showToast(
          'error',
          'Camera Configuration Error',
          'Unable to configure camera with the requested settings. Try using manual entry.'
        );
      } else if (err.name === 'NotSupportedError') {
        showToast(
          'error',
          'Camera Not Supported',
          'Your browser does not support camera access. Please try a different browser or use manual entry.'
        );
      } else {
        // Generic error
        showToast(
          'error',
          'Camera Error',
          err?.message || 'Failed to start camera. Please try manual entry or check your device settings.'
        );
      }
      
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        showToast('info', 'Scanner Stopped', 'Camera has been turned off.');
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log('QR Code detected:', decodedText);
    
    // Stop scanning to prevent multiple scans
    await stopScanning();

    // Lookup product
    await lookupProduct(decodedText);
  };

  const onScanFailure = (errorMessage: string) => {
    // Ignore scan failures (happens continuously while searching for QR code)
  };

  const lookupProduct = async (code: string) => {
    if (!managerId) {
      showToast('error', 'Authentication Error', 'Manager ID not available. Please sign in again.');
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/products/lookup?manager_id=${managerId}&code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Product not found');
      }

      setScannedProduct(data.product);
      setManualCode(data.product.sku || code);
      setManualLocation(data.product.location || '');
      
      showToast('success', 'Product Found!', `${data.product.name} - ${data.product.categoryName}`);
      
      // Automatically submit request for scanned product
      await submitRequest(data.product, 'QR_SCAN');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to lookup product';
      showToast('error', 'Product Not Found', errorMessage);
      setScannedProduct(null);
    }
  };

  const submitRequest = async (product: Product, method: 'QR_SCAN' | 'MANUAL' = 'MANUAL') => {
    if (!userId || !managerId) {
      showToast('error', 'Authentication Required', 'Please sign in to submit requests.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // For QR_SCAN, use the product's standard quantity and NORMAL priority automatically.
    // For MANUAL, use whatever the agent entered in the form fields.
    const qty = method === 'QR_SCAN'
      ? (product.standardOrderQty || null)
      : (manualQuantity ? parseInt(manualQuantity) : product.standardOrderQty);
    const priority = method === 'QR_SCAN' ? 'NORMAL' : manualPriority;
    const location = method === 'QR_SCAN' ? product.location : (manualLocation || product.location);
    const notes = method === 'QR_SCAN' ? null : (manualNotes || null);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
          product_id: product.id,
          requested_by_id: userId,
          request_method: method,
          device_info: method === 'QR_SCAN' ? 'Mobile Scanner' : 'Manual Entry',
          requested_qty: qty,
          location,
          notes,
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      // Add to recent scans
      const newScan: RecentScan = {
        id: data.request.id.toString(),
        productName: product.name,
        sku: product.sku,
        location: manualLocation || product.location,
        timestamp: new Date(),
        status: 'success',
      };
      setRecentScans([newScan, ...recentScans.slice(0, 4)]);

      // Reset form
      setScannedProduct(null);
      setManualCode('');
      setManualLocation('');
      setManualQuantity('');
      setManualNotes('');
      setManualPriority('NORMAL');

      showToast(
        'success',
        'Request Submitted!',
        `${product.name} request created for ${manualLocation || product.location}`
      );
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualCode.trim()) {
      showToast('warning', 'Missing Information', 'Product code is required');
      return;
    }

    if (!manualLocation.trim()) {
      showToast('warning', 'Missing Information', 'Location is required');
      return;
    }

    // Lookup product first
    await lookupProduct(manualCode);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Scan QR Code</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Scan product QR code to request replenishment</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-red-900">Error</p>
              <p className="text-xs sm:text-sm text-red-700 mt-1 break-words">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {scannedProduct && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-green-900">Product Found!</p>
              <p className="text-xs sm:text-sm text-green-700 mt-1 break-words">
                <strong>{scannedProduct.name}</strong> - {scannedProduct.categoryName}
              </p>
              <p className="text-xs text-green-600 mt-1 break-words">
                Location: {scannedProduct.location} | SKU: {scannedProduct.sku || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Scanner */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">QR Code Scanner</h2>

          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4 overflow-hidden">
            {scanning ? (
              <div id={scannerElementId} className="w-full h-full" />
            ) : (
              <div className="text-center p-4 sm:p-6">
                <svg className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-gray-400 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-2">Position QR code within frame to scan</p>
                <button
                  onClick={startScanning}
                  className="px-4 sm:px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors text-sm sm:text-base"
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>

          {scanning && (
            <button
              onClick={stopScanning}
              className="w-full px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
            >
              Stop Scanning
            </button>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="text-blue-600 mt-1 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-blue-900 font-medium">How to scan</p>
                <p className="text-xs sm:text-sm text-blue-700 mt-1">
                  Point your camera at the QR code on the product shelf or storage location. The system will automatically detect the product and create a replenishment request.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Entry */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Manual Entry</h2>

          <form onSubmit={handleManualSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Product SKU or QR Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter product code..."
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="e.g., 2nd Floor Linen Room"
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Quantity Needed (Optional)</label>
              <input
                type="number"
                value={manualQuantity}
                onChange={(e) => setManualQuantity(e.target.value)}
                placeholder="Leave blank for standard quantity"
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 text-sm sm:text-base"
                min="1"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Priority</label>
              <CustomSelect
                value={manualPriority}
                onChange={(v) => setManualPriority(v as 'NORMAL' | 'HIGH' | 'URGENT')}
                options={[
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' },
                ]}
                placeholder="Select Priority"
                searchable={false}
                clearable={false}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Notes (Optional)</label>
              <textarea
                rows={3}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Add any additional information..."
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 resize-none text-sm sm:text-base"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-900 text-white rounded-lg hover:bg-black disabled:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Recent Scans</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentScans.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-gray-500 text-xs sm:text-sm">No recent scans</div>
          ) : (
            recentScans.map((scan) => (
              <div key={scan.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-medium text-gray-900 break-words">{scan.productName}</h3>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                        {scan.status}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                      {scan.sku && <span className="font-mono">SKU: {scan.sku}</span>}
                      {scan.sku && ' • '}
                      <span>{scan.location}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(scan.timestamp)}</p>
                  </div>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
