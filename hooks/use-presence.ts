"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface PresenceUser {
  name: string
  email: string
  initials: string
  avatarUrl?: string
}

export function usePresence(me: PresenceUser) {
  const [online, setOnline] = useState<PresenceUser[]>([])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel("presence:betinapp", {
      config: { presence: { key: me.email } },
    })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>()
        const users = Object.values(state)
          .flat()
          .filter((u, i, arr) => arr.findIndex(x => x.email === u.email) === i)
        setOnline(users)
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track(me)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [me.email])

  return online
}
