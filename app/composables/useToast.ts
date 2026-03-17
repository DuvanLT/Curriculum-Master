export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export const useToast = () => {
  const toasts = useState<Toast[]>('global-toasts', () => [])

  const show = (message: string, type: ToastType = 'success', duration = 4000) => {
    const id = Date.now()
    toasts.value.push({ id, message, type })

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
  }

  const remove = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const success = (msg: string) => show(msg, 'success')
  const error = (msg: string) => show(msg, 'error')
  const info = (msg: string) => show(msg, 'info')
  const warning = (msg: string) => show(msg, 'warning')

  return {
    toasts: readonly(toasts),
    show,
    remove,
    success,
    error,
    info,
    warning
  }
}
