'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface RequestData {
  id: number;
  itemName: string;
  sku: string;
  category: string;
  location: string;
  status: string;
  priority: string;
  requestedQty: number;
  requestMethod: string;
  requestedBy: string;
  approvedBy: string;
  notes: string;
  qrCodeUrl: string;
  eslMacAddress: string;
  createdAt: string;
  updatedAt: string;
}

export default function ApiKeyPage() {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [managerId, setManagerId] = useState('');
  const [completeUrl, setCompleteUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonData, setJsonData] = useState<RequestData[] | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    // Get manager ID from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const id = user.customerId || '';
        setManagerId(id);
        if (id) {
          fetchApiKey(id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const fetchApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/apikey?manager_id=${id}`);
      const data = await response.json();

      if (response.ok && data.apiKey) {
        setApiKey(data.apiKey);
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/hkanban?manager_id=${id}&apikey=${data.apiKey}`;
        setCompleteUrl(url);
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      showToast('error', 'Error', 'Failed to fetch API key.');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!managerId) {
      showToast('error', 'Error', 'Manager ID not found. Please log in again.');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/apikey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manager_id: managerId }),
      });

      const data = await response.json();

      if (response.ok && data.apiKey) {
        setApiKey(data.apiKey);
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/hkanban?manager_id=${managerId}&apikey=${data.apiKey}`;
        setCompleteUrl(url);
        showToast('success', 'API Key Generated', 'Your new API key has been created successfully.');
      } else {
        showToast('error', 'Error', data.error || 'Failed to generate API key.');
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      showToast('error', 'Error', 'Failed to generate API key.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('success', 'Copied!', `${label} copied to clipboard.`);
    }).catch(() => {
      showToast('error', 'Copy Failed', 'Failed to copy to clipboard.');
    });
  };

  const fetchRequestsData = async (showError: boolean = true): Promise<RequestData[] | null> => {
    if (!managerId || !apiKey) {
      if (showError) {
        showToast('error', 'Error', 'Please generate an API key first.');
      }
      return null;
    }

    try {
      const response = await fetch(`/api/hkanban?manager_id=${managerId}&apikey=${apiKey}`);
      const data = await response.json();

      if (response.ok && data.requests) {
        return data.requests;
      } else {
        if (showError) {
          showToast('error', 'Error', data.error || 'Failed to fetch data.');
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (showError) {
        showToast('error', 'Error', 'Failed to fetch data.');
      }
      return null;
    }
  };

  const downloadCSV = async () => {
    if (!managerId || !apiKey) {
      showToast('error', 'Error', 'Please generate an API key first.');
      return;
    }

    setFetchingData(true);
    try {
      const requests = await fetchRequestsData(true);
      if (!requests) {
        return;
      }

      // Create CSV content
      const csvHeaders = 'Item Name,SKU,Category,Location,Status,Priority,Requested Qty,Request Method,Requested By,Approved By,Notes,QR Code URL,ESL MAC Address,Created At';
      const csvRows = requests.map((req) =>
        `"${req.itemName}","${req.sku}","${req.category}","${req.location}","${req.status}","${req.priority}","${req.requestedQty}","${req.requestMethod}","${req.requestedBy}","${req.approvedBy}","${req.notes?.replace(/"/g, '""') || ''}","${req.qrCodeUrl || ''}","${req.eslMacAddress || ''}","${req.createdAt}"`
      );
      const csvContent = [csvHeaders, ...csvRows].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'replenishment_requests.csv';
      link.click();
      URL.revokeObjectURL(link.href);

      showToast('success', 'Downloaded', 'CSV file has been downloaded successfully.');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      showToast('error', 'Error', 'Failed to download CSV.');
    } finally {
      setFetchingData(false);
    }
  };

  const viewJSON = async () => {
    if (!managerId || !apiKey) {
      showToast('error', 'Error', 'Please generate an API key first.');
      return;
    }

    setFetchingData(true);
    try {
      const requests = await fetchRequestsData(true);
      if (requests) {
        setJsonData(requests);
        setShowJsonModal(true);
      }
    } catch (error) {
      console.error('Error viewing JSON:', error);
      showToast('error', 'Error', 'Failed to load JSON data.');
    } finally {
      setFetchingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">API Key</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Generate API Key Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mx-4 sm:mx-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Generate API Key</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
            Create a new API key for accessing the inventory system.
          </p>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Generated API Key
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  placeholder="Click 'Generate Key'"
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm font-mono overflow-hidden text-ellipsis"
                />
                <button
                  onClick={() => copyToClipboard(apiKey, 'API Key')}
                  disabled={!apiKey}
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Complete API URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={completeUrl}
                  readOnly
                  placeholder="URL will appear here"
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm font-mono overflow-hidden text-ellipsis"
                />
                <button
                  onClick={() => copyToClipboard(completeUrl, 'API URL')}
                  disabled={!completeUrl}
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <button
              onClick={generateApiKey}
              disabled={generating}
              className="w-full px-4 py-2.5 sm:py-3 bg-gray-900 text-white rounded-lg hover:bg-black disabled:bg-gray-400 transition-colors font-medium text-sm sm:text-base flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Generate Key</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Export to External File Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mx-4 sm:mx-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Export to external file</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
            Download inventory data in various formats for external use.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">Export to CSV file</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              CSV files are plaintext data files separated by commas, so they can be opened directly as Excel sheets and are a very useful file format for exporting and importing data from other programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={viewJSON}
                disabled={fetchingData || !apiKey}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
              >
                {fetchingData ? (
                  <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
                <span>View JSON</span>
              </button>
              <button
                onClick={downloadCSV}
                disabled={fetchingData || !apiKey}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
              >
                {fetchingData ? (
                  <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">CSV Structure</h4>
            <p className="text-xs text-gray-600 mb-2">
              The CSV file will contain all subscription fields with resolved names:
            </p>
            <div className="bg-yellow-100 rounded px-2 sm:px-3 py-2 font-mono text-xs break-all overflow-x-auto">
              Item Name,Tag,Category,Location,Status
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="text-blue-600 mt-1 flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-blue-900">API Key Usage</h3>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              The generated API key can be used to access inventory data programmatically. Include the API key in your requests to authenticate and retrieve data. Keep your API key secure and do not share it publicly. You can regenerate a new key at any time, which will invalidate the previous key.
            </p>
          </div>
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">JSON Data - Unfinished Requests</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
                    showToast('success', 'Copied!', 'JSON data copied to clipboard.');
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <p className="text-xs text-gray-500">
                Total records: {jsonData?.length || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
