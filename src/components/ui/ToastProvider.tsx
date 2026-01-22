'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import Toast, { ToastMessage, ToastType } from './toast'

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void
  toasts: ToastMessage[]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: ToastType, title: string, message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: duration || 5000
    }

    setToasts(prev => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-4 right-4 z-50 flex flex-col items-end"
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
