/**
 * Custom hook for displaying toast notifications throughout the application
 * Provides convenient methods for showing different types of notifications
 */

import { useToast } from '@/components/ui/ToastProvider';

export function useNotification() {
  const { showToast } = useToast();

  return {
    /**
     * Show a success notification
     * @param title - The notification title
     * @param message - The notification message
     * @param duration - Optional duration in milliseconds (default: 5000)
     */
    success: (title: string, message: string, duration?: number) => {
      showToast('success', title, message, duration);
    },

    /**
     * Show an error notification
     * @param title - The notification title
     * @param message - The notification message
     * @param duration - Optional duration in milliseconds (default: 5000)
     */
    error: (title: string, message: string, duration?: number) => {
      showToast('error', title, message, duration);
    },

    /**
     * Show a warning notification
     * @param title - The notification title
     * @param message - The notification message
     * @param duration - Optional duration in milliseconds (default: 5000)
     */
    warning: (title: string, message: string, duration?: number) => {
      showToast('warning', title, message, duration);
    },

    /**
     * Show an info notification
     * @param title - The notification title
     * @param message - The notification message
     * @param duration - Optional duration in milliseconds (default: 5000)
     */
    info: (title: string, message: string, duration?: number) => {
      showToast('info', title, message, duration);
    },

    /**
     * Direct access to showToast for custom use cases
     */
    showToast,
  };
}
