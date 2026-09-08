import * as React from 'react'

import { cn } from '@/lib/utils'
import { spacing } from '@/lib/design'

/**
 * Standard page body. Every route renders its content inside one of these so
 * padding and vertical rhythm are identical across the app.
 *
 * `fill` is for pages that manage their own scrolling (the calendar grid).
 */
function PageShell({
  className,
  fill = false,
  ...props
}: React.ComponentProps<'div'> & { fill?: boolean }) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        spacing.page,
        fill && 'h-full flex flex-col min-h-0',
        className,
      )}
      {...props}
    />
  )
}

/** A titled block within a page. */
function PageSection({
  className,
  title,
  action,
  children,
  ...props
}: React.ComponentProps<'section'> & {
  title?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section data-slot="page-section" className={cn('min-w-0', className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {title && (
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export { PageShell, PageSection }
