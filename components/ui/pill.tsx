import * as React from 'react'

import { cn } from '@/lib/utils'
import { accent as accentTokens, type Accent } from '@/lib/design'

/**
 * The app's chip.
 *
 * `on` / `off` are the two halves of a toggle — used for bill splits and for
 * every filter row. `fixed` is a read-only label. `count` is the neutral
 * tally chip. Everything that reads as "filter" or "label" is one of these;
 * navigation is never a pill (that's `Segmented`).
 */
export type PillState = 'on' | 'off' | 'fixed' | 'count'

function Pill({
  label,
  meta,
  state = 'fixed',
  accent = 'brand',
  dot,
  icon,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'label'> & {
  label: React.ReactNode
  /** Trailing detail — `12n`, `€4.50`. Rendered dimmed after a separator. */
  meta?: React.ReactNode
  state?: PillState
  accent?: Accent
  /** Status colour swatch, e.g. the stay status dot. */
  dot?: string
  icon?: React.ReactNode
}) {
  const tokens = accentTokens(accent)
  const isInteractive = Boolean(props.onClick)

  const content = (
    <>
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full flex-shrink-0"
          style={{ background: dot }}
        />
      )}
      {icon && <span className="flex-shrink-0 [&_svg]:size-3">{icon}</span>}
      <span className="truncate">{label}</span>
      {meta != null && meta !== '' && (
        <span className={cn('tabular-nums', state === 'on' ? 'opacity-80' : 'opacity-70')}>
          · {meta}
        </span>
      )}
    </>
  )

  const classes = cn(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all',
    state === 'on' && cn(tokens.solid, 'border-transparent'),
    state === 'off' &&
      'bg-white text-gray-500 border-gray-200 hover:text-gray-900 hover:border-gray-300',
    state === 'fixed' && tokens.soft,
    state === 'count' && 'bg-gray-100 text-gray-600 border-gray-200',
    isInteractive && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
    isInteractive && tokens.ring,
    className,
  )

  if (!isInteractive) {
    return (
      <span data-slot="pill" className={classes}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-slot="pill"
      aria-pressed={state === 'on'}
      className={classes}
      {...props}
    >
      {content}
    </button>
  )
}

/** Convenience wrapper for the person chips on bills and readings. */
function PersonPill({
  name,
  ...props
}: Omit<React.ComponentProps<typeof Pill>, 'label'> & { name: string }) {
  return <Pill label={name} {...props} />
}

export { Pill, PersonPill }
