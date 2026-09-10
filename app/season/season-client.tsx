"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useNavigate } from "@/lib/navigation"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pill } from "@/components/ui/pill"
import { PageShell } from "@/components/ui/page-shell"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/empty-state"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import {
  addSeasonTask,
  deleteSeasonTask,
  saveSeasonTasks,
  setSeasonClosed,
  startSeasonClosing,
  toggleSeasonTask,
  updateSeasonTask,
} from "@/lib/actions/season"
import {
  SEASON_UNITS,
  type SeasonClosing,
  type SeasonTask,
  type SeasonUnit,
} from "@/lib/season"

export function SeasonClient({
  year, years, closings, currentUserName,
}: {
  year: number
  years: number[]
  closings: SeasonClosing[]
  currentUserName: string
}) {
  const router = useRouter()
  const { navigate } = useNavigate()
  const [unit, setUnit] = useState<SeasonUnit>("apartman")
  const [busy, setBusy] = useState(false)
  const [addingArea, setAddingArea] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  // The list is read-only by default — you tick things while closing the house.
  // Unlocking turns every line into a text field for reworking the list itself.
  const [editing, setEditing] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [caret, setCaret] = useState<number | null>(null)
  // While editing, the list lives here and nothing waits on the network —
  // pressing Enter has to feel instant. Done writes the whole shape back.
  const originalIds = useRef<string[]>([])
  const [draft, setDraft] = useState<SeasonTask[] | null>(null)
  const [saving, setSaving] = useState(false)


  useRealtimeRefresh(["season_closings", "season_tasks"])

  const closing = closings.find(c => c.unit === unit)

  /** Progress per unit, so the tabs show where each one stands. */
  const progressFor = (u: SeasonUnit) => {
    const c = closings.find(x => x.unit === u)
    if (!c) return null
    const done = c.tasks.filter(t => t.done).length
    return { done, total: c.tasks.length }
  }

  const tasks = editing && draft ? draft : (closing?.tasks ?? [])

  const areas = useMemo(() => {
    const order: string[] = []
    for (const task of tasks) if (!order.includes(task.area)) order.push(task.area)
    return order.map(area => ({ area, tasks: tasks.filter(t => t.area === area) }))
  }, [tasks])

  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const allDone = total > 0 && done === total

  const handleStart = async () => {
    setBusy(true)
    try {
      await trackSave(startSeasonClosing(year, unit))
      router.refresh()
    } catch (error) { console.error(error) }
    setBusy(false)
  }

  /** Enter: keep the text before the caret, carry the rest into a new row. */
  const splitLocal = (taskId: string, before: string, after: string) => {
    if (!draft) return
    const index = draft.findIndex(t => t.id === taskId)
    if (index === -1) return
    const source = draft[index]
    const created: SeasonTask = {
      ...source,
      id: `tmp-${Math.random().toString(36).slice(2, 10)}`,
      title: after,
      done: false,
      done_at: null,
      done_by_name: null,
    }
    const next = [...draft]
    next[index] = { ...source, title: before }
    next.splice(index + 1, 0, created)
    setDraft(next)
    setFocusId(created.id)
    setCaret(0)
  }

  /** Backspace at position 0: fold this row into the one above. */
  const mergeLocal = (taskId: string) => {
    if (!draft) return
    const index = draft.findIndex(t => t.id === taskId)
    if (index <= 0) return
    const previous = draft[index - 1]
    const next = [...draft]
    next[index - 1] = { ...previous, title: `${previous.title}${draft[index].title}` }
    next.splice(index, 1)
    setDraft(next)
    setFocusId(previous.id)
    setCaret(previous.title.length)
  }

  const setTitleLocal = (taskId: string, title: string) => {
    setDraft(current => current?.map(t => (t.id === taskId ? { ...t, title } : t)) ?? current)
  }

  const removeLocal = (taskId: string) => {
    setDraft(current => current?.filter(t => t.id !== taskId) ?? current)
  }

  const startEditing = () => {
    if (!closing) return
    originalIds.current = closing.tasks.map(task => task.id)
    setDraft(closing.tasks.map(t => ({ ...t })))
    setEditing(true)
  }

  const finishEditing = async () => {
    if (!closing || !draft) { setEditing(false); return }
    setSaving(true)
    try {
      await trackSave(saveSeasonTasks(
        closing.id,
        draft
          .filter(t => t.title.trim() !== "")
          .map(t => ({ id: t.id, area: t.area, title: t.title.trim() })),
        originalIds.current,
      ))
      router.refresh()
      setEditing(false)
      setDraft(null)
      setFocusId(null)
    } catch (error) { console.error(error) }
    finally { setSaving(false) }
  }

  const handleToggle = async (task: SeasonTask) => {
    try {
      await trackSave(toggleSeasonTask(task.id, !task.done, currentUserName))
      router.refresh()
    } catch (error) { console.error(error) }
  }

  const handleAdd = async (area: string) => {
    if (!closing || !newTitle.trim()) return
    try {
      await trackSave(addSeasonTask(closing.id, area, newTitle.trim()))
      setNewTitle("")
      setAddingArea(null)
      router.refresh()
    } catch (error) { console.error(error) }
  }

  return (
    <PageShell>
      {/* Year */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {years.map(y => (
          <Pill
            key={y}
            label={y}
            state={y === year ? "on" : "off"}
            accent="season"
            onClick={() => navigate(`/season?year=${y}`)}
          />
        ))}
        <Pill
          label={`+ ${Math.max(...years) + 1}`}
          state="off"
          accent="season"
          onClick={() => navigate(`/season?year=${Math.max(...years) + 1}`)}
        />
      </div>

      {/* Unit */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Four units do not fit a phone. The strip scrolls on its own —
            bleeding to the screen edge so it reads as scrollable — while the
            page itself stays put. */}
        <div className="w-full min-w-0 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 md:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Segmented
          value={unit}
          onValueChange={v => setUnit(v as SeasonUnit)}
          accent="season"
          className="flex-nowrap"
        >
          {SEASON_UNITS.map(u => {
            const p = progressFor(u.key)
            return (
              <SegmentedItem key={u.key} value={u.key}>
                {u.label}
                {p && (
                  <span className="opacity-70 tabular-nums">
                    {p.done}/{p.total}
                  </span>
                )}
              </SegmentedItem>
            )
          })}
        </Segmented>
        </div>

        {closing && (
          <div className="flex items-center gap-4">
            <Button
              variant={editing ? "default" : "outline"}
              accent={editing ? "stays" : undefined}
              size="sm"
              aria-pressed={editing}
              disabled={saving}
              onClick={() => (editing ? finishEditing() : startEditing())}
            >
              {editing
                ? saving ? <><Loader2 className="animate-spin" /> Saving…</> : <><Check /> Done</>
                : <><Pencil /> Edit</>}
            </Button>
            <ProgressRing done={done} total={total} />
            <Button
              variant={closing.closed_at ? "outline" : "default"}
              accent="season"
              size="sm"
              disabled={!allDone && !closing.closed_at}
              title={!allDone && !closing.closed_at ? "Finish every step first" : undefined}
              onClick={async () => {
                await trackSave(setSeasonClosed(closing.id, !closing.closed_at))
                router.refresh()
              }}
            >
              {closing.closed_at ? "Reopen" : "Mark closed"}
            </Button>
          </div>
        )}
      </div>

      {!closing ? (
        <EmptyState
          message={`No ${SEASON_UNITS.find(u => u.key === unit)?.label} list for ${year} yet`}
          action={busy ? "Starting…" : <><Plus /> Start the list</>}
          onAction={handleStart}
          accent="season"
        />
      ) : (
        <div className="space-y-4">
          {closing.closed_at && (
            <Card className="shadow-none border border-emerald-200 bg-emerald-50/50 px-4 py-3 gap-0">
              <p className="text-sm font-medium text-emerald-800">
                Closed on {new Date(closing.closed_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </Card>
          )}

          {areas.map(({ area, tasks }) => {
            const areaDone = tasks.filter(t => t.done).length
            return (
              <Card key={area} className="shadow-none border overflow-hidden py-0 gap-0">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-800">{area}</h2>
                    <Pill label={`${areaDone} / ${tasks.length}`} state="count" />
                  </div>
                  <Button
                    variant="subtle"
                    size="icon-xs"
                    title={`Add a step to ${area}`}
                    onClick={() => { setAddingArea(area); setNewTitle("") }}
                  >
                    <Plus />
                  </Button>
                </div>

                <div className="divide-y divide-gray-100">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggle(task)}
                        aria-pressed={task.done}
                        className={cn(
                          "mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                          task.done
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-gray-300 hover:border-teal-500",
                        )}
                      >
                        {task.done && <Check className="size-3.5" strokeWidth={3} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        {editing ? (
                          <TaskTitleInput
                            task={task}
                            autoFocus={focusId === task.id}
                            caret={focusId === task.id ? caret : null}
                            onCommit={title => setTitleLocal(task.id, title)}
                            onSplit={(before, after) => splitLocal(task.id, before, after)}
                            onMergeUp={() => mergeLocal(task.id)}
                          />
                        ) : (
                          <p className={cn(
                            "text-sm leading-snug",
                            task.done ? "text-gray-400 line-through" : "text-gray-800",
                          )}>
                            {task.title}
                          </p>
                        )}
                        {task.done && task.done_by_name && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {task.done_by_name}
                            {task.done_at && ` · ${new Date(task.done_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="subtle"
                        size="icon-xs"
                        className={cn(
                          "hover:text-red-600",
                          editing ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                        )}
                        title="Remove this step"
                        onClick={async () => {
                          if (editing) { removeLocal(task.id); return }
                          await trackSave(deleteSeasonTask(task.id))
                          router.refresh()
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}

                  {addingArea === area && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/60">
                      <Input
                        autoFocus
                        value={newTitle}
                        placeholder={`New step in ${area}…`}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleAdd(area)
                          if (e.key === "Escape") { setAddingArea(null); setNewTitle("") }
                        }}
                        className="h-8"
                      />
                      <Button accent="season" size="sm" onClick={() => handleAdd(area)} disabled={!newTitle.trim()}>
                        Add
                      </Button>
                      <Button variant="subtle" size="icon-xs" onClick={() => { setAddingArea(null); setNewTitle("") }}>
                        <X />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

    </PageShell>
  )
}

/**
 * An editable checkbox line.
 *
 * Enter splits at the caret: text before it stays, text after it becomes the
 * next row. At the end of a line that tail is empty, which is just "add a row"
 * — the same gesture either way, so there is nothing extra to learn.
 * Backspace at position 0 merges back into the row above.
 */
function TaskTitleInput({
  task, autoFocus, caret, onCommit, onSplit, onMergeUp,
}: {
  task: SeasonTask
  autoFocus: boolean
  caret: number | null
  onCommit: (title: string) => void
  onSplit: (before: string, after: string) => void
  onMergeUp: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const value = task.title

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(resize, [value])

  useEffect(() => {
    if (!autoFocus || !ref.current) return
    ref.current.focus()
    const at = caret ?? ref.current.value.length
    ref.current.setSelectionRange(at, at)
  }, [autoFocus, caret])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onCommit(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          const at = e.currentTarget.selectionStart ?? value.length
          onSplit(value.slice(0, at), value.slice(e.currentTarget.selectionEnd ?? at))
          return
        }
        if (e.key === "Backspace") {
          const start = e.currentTarget.selectionStart ?? 0
          if (start === 0 && (e.currentTarget.selectionEnd ?? 0) === 0) {
            e.preventDefault()
            onMergeUp()
          }
        }
      }}
      className={cn(
        "w-full resize-none overflow-hidden border-none bg-transparent p-0 text-sm leading-snug outline-none",
        "text-gray-800 focus:ring-0",
      )}
    />
  )
}

/** Small dial so progress reads at a glance from across the room. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : done / total
  const r = 14
  const c = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-2">
      <svg width="34" height="34" viewBox="0 0 34 34" className="flex-shrink-0 -rotate-90">
        <circle cx="17" cy="17" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="17" cy="17" r={r} fill="none"
          stroke={pct === 1 ? "#10b981" : "#0d9488"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="text-sm font-semibold text-gray-700 tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}
