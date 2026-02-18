'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface AuthContextType {
  clearStaleTokens: () => void;
  storeId: string | null;
  setStoreId: (id: string | null) => void;
  getStoreId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreIdState] = useState<string | null>(null);

  // Load storeId from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem('minewStoreId');
    if (stored) {
      setStoreIdState(stored);
    }
  }, []);

  const setStoreId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem('minewStoreId', id);
      setStoreIdState(id);
    } else {
      localStorage.removeItem('minewStoreId');
      setStoreIdState(null);
    }
  }, []);

  const getStoreId = useCallback(() => {
    return storeId || localStorage.getItem('minewStoreId');
  }, [storeId]);

  const clearStaleTokens = useCallback(() => {
    // Clear all authentication-related data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('minewStoreId');
    
    // Clear cookies
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Clear storeId state
    setStoreIdState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ clearStaleTokens, storeId, setStoreId, getStoreId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Convenience hook to get storeId
export function useStoreId() {
  const { storeId, getStoreId } = useAuthContext();
  return storeId || getStoreId();
}
