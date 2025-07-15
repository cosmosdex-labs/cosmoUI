"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props} 
            className="bg-white border-gray-200 text-gray-900 shadow-xl"
            style={{ 
              zIndex: 9999,
              backgroundColor: 'white',
              borderColor: '#e5e7eb',
              color: '#111827'
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle className="text-gray-900 font-semibold" style={{ color: '#111827' }}>{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-gray-600" style={{ color: '#4b5563' }}>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-gray-500 hover:text-gray-700" style={{ color: '#6b7280' }} />
          </Toast>
        )
      })}
      <ToastViewport 
        className="fixed top-0 z-[9999] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
        style={{ zIndex: 9999 }}
      />
    </ToastProvider>
  )
}
