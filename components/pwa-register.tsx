"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-blocking: app still works without service worker registration.
    })
  }, [])

  return null
}
