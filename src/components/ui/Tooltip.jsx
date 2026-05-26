import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export function TooltipProvider({ children, delayDuration = 200, ...props }) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

export function Tooltip({ children, content, side = 'top', align = 'center', className }) {
  if (!content) return children

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[60] overflow-hidden rounded-md bg-text-primary px-2.5 py-1.5',
            'text-xs text-background font-medium',
            'shadow-md shadow-black/20',
            'data-[state=delayed-open]:animate-fade-in',
            'data-[state=closed]:animate-fade-out',
            'select-none',
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-text-primary" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
