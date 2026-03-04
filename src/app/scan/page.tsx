'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface ProductInfo {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  categoryName: string;
  supplierName: string | null;
  location: string;
  standardOrderQty: number | null;
  reorderThreshold: number | null;
  unitPrice: number | null;
}

type PageState = 'loading' | 'ready' | 'submitting' | 'done' | 'error' | 'already';

function ScanContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const mac = searchParams.get('mac');
  const storeId = searchParams.get('storeId');

  const [state, setState] = useState<PageState>('loading');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderDate, setOrderDate] = useState('');

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setState('error');
      setErrorMsg('Invalid QR code – no product ID.');
      return;
    }
    try {
      const res = await fetch(`/api/esl/scan?productId=${productId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Product not found');
      setProduct(data.product);
      setState('ready');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Failed to load product information.');
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleConfirm = async () => {
    if (!productId || !mac || !storeId) return;
    setState('submitting');
    try {
      const res = await fetch('/api/esl/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: parseInt(productId), mac, storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      setOrderDate(data.orderDate);
      setState(data.duplicate ? 'already' : 'done');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Failed to submit request. Please try again.');
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading product information…</p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ─── Already submitted (duplicate within 60 s) ────────────────────────────
  if (state === 'already') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Already Requested</h1>
          <p className="text-gray-600 text-sm">
            A replenishment request for <strong>{product?.name}</strong> was already submitted recently.
          </p>
        </div>
      </div>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (state === 'done') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Request Submitted</h1>
          <p className="text-gray-600 text-sm mb-4">
            Replenishment request for <strong>{product?.name}</strong> has been accepted.
          </p>
          {orderDate && (
            <p className="text-xs text-gray-400">
              {new Date(orderDate).toLocaleString()}
            </p>
          )}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-left text-xs text-gray-500 space-y-1">
            <p><span className="font-medium">Location:</span> {product?.location}</p>
            {product?.standardOrderQty && (
              <p><span className="font-medium">Qty:</span> {product.standardOrderQty}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Ready — confirmation screen ──────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Replenishment Request</h1>
          <p className="text-xs text-gray-500 mt-1">Scan confirmed — review and submit</p>
        </div>

        {/* Product info */}
        {product && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
            <div>
              <p className="text-xs text-gray-500">Product</p>
              <p className="text-sm font-semibold text-gray-900">{product.name}</p>
            </div>
            {product.description && (
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-700">{product.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm text-gray-700">{product.categoryName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm text-gray-700">{product.location}</p>
              </div>
              {product.sku && (
                <div>
                  <p className="text-xs text-gray-500">SKU</p>
                  <p className="text-sm font-mono text-gray-700">{product.sku}</p>
                </div>
              )}
              {product.standardOrderQty && (
                <div>
                  <p className="text-xs text-gray-500">Order Qty</p>
                  <p className="text-sm text-gray-700">{product.standardOrderQty}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={state === 'submitting'}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm
                     hover:bg-black active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting…
            </span>
          ) : (
            'Confirm Replenishment Request'
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          h.kanban · warehouse replenishment system
        </p>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
