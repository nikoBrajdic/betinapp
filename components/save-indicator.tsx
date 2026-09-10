"use client"

import { useEffect, useRef, useState } from "react"
import { useT } from "@/lib/language"

type State = "idle" | "saving" | "saved" | "error"

export function SaveIndicator() {
  const t = useT()
  const [state, setState] = useState<State>("idle")
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveCount = useRef(0)
  const failed = useRef(false)

  useEffect(() => {
    const onStart = () => {
      if (saveCount.current === 0) failed.current = false
      saveCount.current++
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setState("saving")
    }

    const onEnd = () => {
      saveCount.current = Math.max(0, saveCount.current - 1)
      if (saveCount.current > 0) return
      setState(failed.current ? "error" : "saved")
      if (!failed.current) hideTimer.current = setTimeout(() => setState("idle"), 1500)
    }

    const onError = () => {
      failed.current = true
      onEnd()
    }

    window.addEventListener("save:start", onStart)
    window.addEventListener("save:end", onEnd)
    window.addEventListener("save:error", onError)
    return () => {
      window.removeEventListener("save:start", onStart)
      window.removeEventListener("save:end", onEnd)
      window.removeEventListener("save:error", onError)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  if (state === "idle") return null

  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg
          transition-colors duration-200
          ${state !== "saved"
            ? "bg-gray-800 text-white"
            : "bg-green-600 text-white"
          }
        `}
      >
        {state === "error" ? t("save.failed") : state === "saving" ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            {t("save.saving")}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {t("save.saved")}
          </>
        )}
      </div>
    </div>
  )
}
