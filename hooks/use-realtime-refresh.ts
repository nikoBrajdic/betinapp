"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribes to Supabase Realtime changes on the given tables.
 * Calls router.refresh() when any change is detected, debounced 400ms
 * so rapid multi-row saves don't trigger multiple refreshes.
 */
export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const refresh = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 400)
    }

    const channels = tables.map(table =>
      supabase
        .channel(`rt:${table}:${Math.random()}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, refresh)
        .subscribe()
    )

    return () => {
      if (timer.current) clearTimeout(timer.current)
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
