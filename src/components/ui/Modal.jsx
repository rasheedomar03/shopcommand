import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
  full: 'sm:max-w-5xl',
}

/**
 * Drop-in replacement for the old Modal.
 * Same API: <Modal open onClose title subtitle size>{children}</Modal>
 *
 * Now uses Radix Dialog for:
 *  - focus trapping
 *  - proper aria attributes
 *  - scroll-lock without layout shift
 *  - portal rendering (avoids z-index issues)
 *  - animated open/close via CSS data attributes
 */
export function Modal({ open, onClose, title, subtitle, children, size = 'md', className }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50',
            // Mobile: sheet from bottom
            'inset-x-0 bottom-0 sm:bottom-auto sm:inset-auto',
            'sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
            'w-full bg-surface border border-border shadow-2xl',
            'rounded-t-2xl sm:rounded-xl',
            'flex flex-col',
            'max-h-[92dvh] sm:max-h-[85vh]',
            'data-[state=open]:animate-slide-in data-[state=closed]:animate-fade-out',
            sizes[size],
            className
          )}
        >
          {/* Drag handle on mobile */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-text-primary truncate">
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <DialogPrimitive.Description className="text-xs text-text-muted mt-0.5">
                  {subtitle}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="ml-4 shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border transition-colors duration-150"
              aria-label="Close"
            >
              <X size={15} />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
