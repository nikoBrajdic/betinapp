"use client"

import { useCallback, useEffect, useId, useSyncExternalStore, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLinkStatus } from "next/link"

/**
 * One app-wide "a page is on its way" flag, so the top bar can show a spinner
 * beside the title — whatever started the navigation.
 *
 * Why it exists: the only `loading.tsx` is at the root, and a navigation that
 * keeps a shared parent (`/diary` → `/diary/[id]`) never reaches it. The old
 * page just sat there until the new one was ready, which read as a dead tap.
 *
 * Any number of sources can be pending at once (a Link and a router push, say),
 * so this is a set of ids rather than a single boolean one caller could clear
 * out from under another.
 */

const pending = new Set<string>()
const listeners = new Set<() => void>()

function report(id: string, isPending: boolean) {
  if (isPending === pending.has(id)) return
  if (isPending) pending.add(id)
  else pending.delete(id)
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useNavigationPending(): boolean {
  return useSyncExternalStore(subscribe, () => pending.size > 0, () => false)
}

function useReport(isPending: boolean) {
  const id = useId()
  useEffect(() => {
    report(id, isPending)
    return () => report(id, false)
  }, [id, isPending])
}

/**
 * Full prefetch. Next 16's `router.prefetch()` defaults to `"auto"`, which for
 * a dynamic page with no `loading.tsx` of its own fetches almost nothing — and
 * the page's data is exactly what we want warm. The `PrefetchKind` enum is
 * internal to Next; `"full"` is its value.
 */
const FULL = { kind: "full" } as unknown as Parameters<ReturnType<typeof useRouter>["prefetch"]>[1]

/**
 * Use instead of `router.push` for anything the user taps. Wrapping the push in
 * a transition is what makes "pending" last until the new page has actually
 * rendered, not just until the click handler returns.
 */
export function useNavigate() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  useReport(isPending)

  const navigate = useCallback(
    (href: string) => startTransition(() => router.push(href)),
    [router],
  )
  const prefetch = useCallback((href: string) => router.prefetch(href, FULL), [router])

  return { navigate, prefetch }
}

/**
 * Warm the first `limit` pages in a list as soon as it renders, so opening one
 * is usually instant and the spinner rarely has to appear. Capped because each
 * prefetch is a full server render. Prefetching is a no-op in `next dev`.
 */
export function usePrefetch(hrefs: string[], limit = 12) {
  const router = useRouter()
  const key = hrefs.slice(0, limit).join("|")
  useEffect(() => {
    if (!key) return
    for (const href of key.split("|")) router.prefetch(href, FULL)
  }, [key, router])
}

/** Drop inside a `<Link>` so sidebar and dashboard taps light the spinner too. */
export function LinkPendingReporter() {
  const { pending: isPending } = useLinkStatus()
  useReport(isPending)
  return null
}
