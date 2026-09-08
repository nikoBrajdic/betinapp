'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { accent, type Accent } from '@/lib/design'

interface SegmentedContextValue {
  value: string
  onValueChange: (value: string) => void
  accent: Accent
  size: 'sm' | 'md'
}

const SegmentedContext = React.createContext<SegmentedContextValue | null>(null)

/**
 * The app's one segmented control. Replaces the eight hand-rolled
 * `bg-gray-100 p-1` pill rows that had drifted apart.
 */
function Segmented({
  value,
  onValueChange,
  accent: accentName = 'brand',
  size = 'md',
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange'> & {
  value: string
  onValueChange: (value: string) => void
  accent?: Accent
  size?: 'sm' | 'md'
}) {
  const context = React.useMemo(
    () => ({ value, onValueChange, accent: accentName, size }),
    [value, onValueChange, accentName, size],
  )

  return (
    <SegmentedContext.Provider value={context}>
      <div
        data-slot="segmented"
        role="tablist"
        className={cn(
          'inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SegmentedContext.Provider>
  )
}

function SegmentedItem({
  value,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  const context = React.useContext(SegmentedContext)
  if (!context) throw new Error('SegmentedItem must be used inside Segmented')

  const isActive = context.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-slot="segmented-item"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100',
        accent(context.accent).ring,
        context.size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
        isActive
          ? cn(accent(context.accent).solid, 'shadow-sm')
          : 'text-gray-500 hover:text-gray-800',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** Icon-only variant — same track, square items. */
function SegmentedIconItem({
  value,
  className,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  return (
    <SegmentedItem
      value={value}
      className={cn('w-8 px-0 [&_svg]:size-4', className)}
      {...props}
    />
  )
}

export { Segmented, SegmentedItem, SegmentedIconItem }
