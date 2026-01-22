'use client'

import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

const Toast = ({ toast, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10)
    
    // Auto-hide after duration
    const timer = setTimeout(() => {
      handleClose()
    }, toast.duration || 10000)

    return () => clearTimeout(timer)
  }, [toast.duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 300)
  }

  const getToastStyles = () => {
    const baseStyles = "relative flex items-start p-4 mb-3 rounded-lg shadow-lg "
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-[#157538] border-green-500 text-green-800`
      case 'error':
        return `${baseStyles} bg-[#e93333] border-red-500 text-red-800`
      case 'warning':
        return `${baseStyles} bg-[#f59e0b] border-yellow-500 text-yellow-800`
      case 'info':
        return `${baseStyles} bg-[#3b82f6] border-blue-500 text-blue-800`
      default:
        return `${baseStyles} bg-gray-50/90 border-gray-500 text-gray-800`
    }
  }

  const getIconStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'text-white'
      case 'error':
        return 'text-white'
      case 'warning':
        return 'text-white'
      case 'info':
        return 'text-white'
      default:
        return 'text-gray-500'
    }
  }

 const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <img 
            src="/svg/success.svg" 
            alt="Success" 
            className="w-8 h-8"
            style={{ width: '32px', height: '32px', filter: 'brightness(0) invert(1)' }}
          />
        )
      default :
        return (
          <img 
            src="/svg/warning.svg" 
            alt="Error" 
            className="w-8 h-8"
            style={{ width: '32px', height: '32px', filter: 'brightness(0) invert(1)' }}
          />
        )
    
    }
  }

  return (
    <div 
      className={`
        transform transition-all duration-300 ease-out max-w-md w-full
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{
        maxWidth: '448px',
        width: '100%',
        minWidth: '320px',
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transition: 'all 300ms ease-out',
        pointerEvents: 'auto'
      }}
    >
      <div 
        className={getToastStyles()}
        style={{
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'flex-start'
        }}
      >
        <div 
          className={`flex-shrink-0 ${getIconStyles()}`}
          style={{ 
            flexShrink: 0, 
            color: '#ffffff',
            alignSelf: 'center',
            marginRight: '4px'
          }}
        >
          {getIcon()}
        </div>
        <div 
          className="ml-3 flex-1"
          style={{ marginLeft: '12px', flex: 1 }}
        >
          <h4 
            className="font-semibold text-sm"
            style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}
          >
            {toast.title}
          </h4>
          <p 
            className="text-sm mt-1 opacity-100"
            style={{ 
              fontSize: '14px', 
              marginTop: '4px', 
              opacity: 1, 
              color: '#ffffff',
              lineHeight: '1.5',
              wordBreak: 'keep-all'
            }}
          >
            {toast.message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          style={{ 
            marginLeft: '16px', 
            flexShrink: 0, 
            color: '#ffffff',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <svg 
            className="w-4 h-4" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            style={{ width: '16px', height: '16px' }}
          >
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Toast
