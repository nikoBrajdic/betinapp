/** Debounce edits and serialize writes, including edits made during a save. */
export function createDraftSaveQueue<T>(options: {
  initial: T
  save: (value: T) => Promise<void>
  onDraft: (value: T) => void
  onSaved: (value: T) => void
  onState: (state: "pending" | "saved" | "error") => void
  delay?: number
}) {
  let latest = options.initial
  let revision = 0
  let savedRevision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let discarded = false
  let running: Promise<void> | undefined

  const flush = (): Promise<void> => {
    clearTimeout(timer)
    if (running) return running
    running = (async () => {
      while (savedRevision !== revision && !discarded) {
        const value = latest
        const savingRevision = revision
        options.onState("pending")
        try {
          await options.save(value)
        } catch (error) {
          options.onState("error")
          throw error
        }
        savedRevision = savingRevision
        options.onSaved(value)
      }
      options.onState("saved")
    })().finally(() => { running = undefined })
    return running
  }

  return {
    update(value: T) {
      discarded = false
      latest = value
      revision++
      options.onDraft(value)
      options.onState("pending")
      clearTimeout(timer)
      timer = setTimeout(() => { void flush().catch(() => {}) }, options.delay ?? 1200)
    },
    flush,
    dirty: () => savedRevision !== revision,
    async discard() {
      clearTimeout(timer)
      // An already-sent write cannot be cancelled. Wait before deleting drafts
      // or a document so a late response cannot resurrect or clear newer data.
      discarded = true
      await running?.catch(() => {})
      savedRevision = revision
    },
  }
}
