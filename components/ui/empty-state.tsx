import * as React from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Accent } from '@/lib/design'

/**
 * The "nothing here yet" block. Was copy-pasted across seven pages, each with
 * its own bespoke CTA button.
 */
function EmptyState({
  message,
  action,
  onAction,
  accent = 'brand',
  icon,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  message: React.ReactNode
  /** Label for the primary action. Omit for a message-only empty state. */
  action?: React.ReactNode
  onAction?: () => void
  accent?: Accent
  icon?: React.ReactNode
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center py-20 gap-4 text-center',
        className,
      )}
      {...props}
    >
      {icon && <div className="text-gray-300 [&_svg]:size-8">{icon}</div>}
      <p className="text-gray-400 text-sm">{message}</p>
      {action && onAction && (
        <Button accent={accent} onClick={onAction}>
          {action}
        </Button>
      )}
      {children}
    </div>
  )
}

export { EmptyState }
