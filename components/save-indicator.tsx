"use client"

import { useEffect, useRef, useState } from "react"

type State = "idle" | "saving" | "saved"

export function SaveIndicator() {
  const [state, setState] = useState<State>("idle")
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveCount = useRef(0)

  useEffect(() => {
    const onStart = () => {
      saveCount.current++
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setState("saving")
    }

    const onEnd = () => {
      saveCount.current = Math.max(0, saveCount.current - 1)
      if (saveCount.current > 0) return
      setState("saved")
      hideTimer.current = setTimeout(() => setState("idle"), 1500)
    }

    window.addEventListener("save:start", onStart)
    window.addEventListener("save:end", onEnd)
    return () => {
      window.removeEventListener("save:start", onStart)
      window.removeEventListener("save:end", onEnd)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  if (state === "idle") return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg
          transition-all duration-200
          ${state === "saving"
            ? "bg-gray-800 text-white"
            : "bg-green-600 text-white"
          }
        `}
      >
        {state === "saving" ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Saved
          </>
        )}
      </div>
    </div>
  )
}
