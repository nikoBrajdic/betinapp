"use client"

import { useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface ImageLightboxProps {
  urls: string[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function ImageLightbox({ urls, index, onClose, onNavigate }: ImageLightboxProps) {
  const prev = useCallback(() => onNavigate((index - 1 + urls.length) % urls.length), [index, urls.length, onNavigate])
  const next = useCallback(() => onNavigate((index + 1) % urls.length), [index, urls.length, onNavigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft")  prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, prev, next])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22><line x1=%2218%22 y1=%226%22 x2=%226%22 y2=%2218%22 stroke=%22white%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/><line x1=%226%22 y1=%226%22 x2=%2218%22 y2=%2218%22 stroke=%22white%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/></svg>')_12_12,auto]"
      onClick={onClose}
    >
      {/* Image */}
      <img
        src={urls[index]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl cursor-default"
        onClick={e => e.stopPropagation()}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev */}
      {urls.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-3 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next */}
      {urls.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-3 transition-colors cursor-pointer"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Counter */}
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm bg-black/30 px-3 py-1 rounded-full">
          {index + 1} / {urls.length}
        </div>
      )}
    </div>
  )
}
