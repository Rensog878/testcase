import { toast } from 'sonner'

// The storefront's toast call: type is 'success' | 'error' | 'warning' | 'info'.
// Returns a function that dismisses the toast.
export function showToast(message, type = 'info', duration) {
  const show = typeof toast[type] === 'function' ? toast[type] : toast
  const id = show(message, duration ? { duration } : {})
  return () => toast.dismiss(id)
}
