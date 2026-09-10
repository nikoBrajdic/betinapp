"use client"

import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { createDraftSaveQueue } from "@/lib/draft-save-queue"
import { normalizeBlocks } from "@/lib/image-rows"
import type { Block } from "@/lib/actions/diary"
import { trackSave } from "@/lib/save-events"

type Draft = { title: string; content: Block[] }
const draftSchema = z.object({
  title: z.string(),
  content: z.array(z.discriminatedUnion("type", [
    z.object({ id: z.string(), type: z.literal("heading"), text: z.string() }),
    z.object({ id: z.string(), type: z.literal("paragraph"), text: z.string(), bold: z.boolean() }),
    z.object({ id: z.string(), type: z.literal("image"), images: z.array(z.object({ url: z.string(), caption: z.string() })), breakBefore: z.boolean().optional() }),
  ])),
})

// Keep remounts of the same document behind any write from its previous editor.
const writes = new Map<string, Promise<void>>()
async function serialize(key: string, save: () => Promise<void>) {
  const previous = writes.get(key)
  const next = (previous ?? Promise.resolve()).catch(() => {}).then(save)
  writes.set(key, next)
  try { await next } finally { if (writes.get(key) === next) writes.delete(key) }
}

export function useEditorAutosave(key: string, initial: Draft, save: (value: Draft) => Promise<void>) {
  const storageKey = `betinapp-draft:${key}`
  const [value, setValue] = useState<Draft>(() => ({ ...initial, content: normalizeBlocks(initial.content) }))
  const valueRef = useRef(value)
  const saveRef = useRef(save)
  saveRef.current = save
  const mounted = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [queue] = useState(() => createDraftSaveQueue<Draft>({
    initial: value,
    save: draft => serialize(key, () => trackSave(saveRef.current(draft))),
    onDraft: draft => {
      try { localStorage.setItem(storageKey, JSON.stringify(draft)) } catch {
        // beforeunload still guards edits when browser storage is unavailable.
      }
    },
    onSaved: draft => {
      try {
        if (localStorage.getItem(storageKey) === JSON.stringify(draft)) localStorage.removeItem(storageKey)
      } catch { /* Storage may be disabled. */ }
      if (mounted.current) setSavedAt(new Date())
    },
    onState: state => {
      if (!mounted.current) return
      setSaving(state === "pending")
      setError(state === "error")
    },
  }))

  useEffect(() => {
    mounted.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const draft = draftSchema.parse(JSON.parse(raw))
        const restored = { ...draft, content: normalizeBlocks(draft.content) }
        valueRef.current = restored
        setValue(restored)
        queue.update(restored)
      }
    } catch { /* Ignore invalid drafts; never replace valid server data with them. */ }
    const flush = () => { if (queue.dirty()) void queue.flush().catch(() => {}) }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!queue.dirty()) return
      event.preventDefault()
      event.returnValue = ""
    }
    const onVisibility = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("beforeunload", beforeUnload)
    window.addEventListener("online", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      mounted.current = false
      window.removeEventListener("beforeunload", beforeUnload)
      window.removeEventListener("online", flush)
      document.removeEventListener("visibilitychange", onVisibility)
      // Navigation flushes, rather than cancelling, the trailing edit. A tab
      // close may interrupt the request, so the durable draft remains as well.
      flush()
    }
  }, [queue, storageKey])

  const change = (patch: Partial<Draft>) => {
    const next = { ...valueRef.current, ...patch }
    valueRef.current = next
    setValue(next)
    queue.update(next)
  }
  return {
    title: value.title, blocks: value.content, saving, error, savedAt,
    setTitleAndSave: (title: string) => change({ title }),
    setBlocksAndSave: (content: Block[]) => change({ content }),
    persistNow: queue.flush,
    hasUnsavedChanges: queue.dirty,
    discard: async () => {
      await queue.discard()
      try { localStorage.removeItem(storageKey) } catch { /* Storage may be disabled. */ }
    },
  }
}
