"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Check, Loader2, Plus, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Pill } from "@/components/ui/pill"
import { PageShell } from "@/components/ui/page-shell"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/empty-state"
import { ImageLightbox } from "@/components/image-lightbox"
import { createClient } from "@/lib/supabase/client"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import {
  addSeasonTask,
  deleteSeasonTask,
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
  const [unit, setUnit] = useState<SeasonUnit>("apartman")
  const [busy, setBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [addingArea, setAddingArea] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")

  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useRealtimeRefresh(["season_closings", "season_tasks"])

  const closing = closings.find(c => c.unit === unit)

  /** Progress per unit, so the tabs show where each one stands. */
  const progressFor = (u: SeasonUnit) => {
    const c = closings.find(x => x.unit === u)
    if (!c) return null
    const done = c.tasks.filter(t => t.done).length
    return { done, total: c.tasks.length }
  }

  const areas = useMemo(() => {
    if (!closing) return []
    const order: string[] = []
    for (const task of closing.tasks) if (!order.includes(task.area)) order.push(task.area)
    return order.map(area => ({ area, tasks: closing.tasks.filter(t => t.area === area) }))
  }, [closing])

  const done = closing?.tasks.filter(t => t.done).length ?? 0
  const total = closing?.tasks.length ?? 0
  const allDone = total > 0 && done === total

  const handleStart = async () => {
    setBusy(true)
    try {
      await trackSave(startSeasonClosing(year, unit))
      router.refresh()
    } catch (error) { console.error(error) }
    setBusy(false)
  }

  const handleToggle = async (task: SeasonTask) => {
    try {
      await trackSave(toggleSeasonTask(task.id, !task.done, currentUserName))
      router.refresh()
    } catch (error) { console.error(error) }
  }

  const handlePhoto = async (fileList: FileList | null) => {
    const file = fileList?.[0]
    const taskId = photoTarget.current
    if (photoInputRef.current) photoInputRef.current.value = ""
    if (!file || !taskId) return

    setUploadingId(taskId)
    try {
      const path = `${year}/${unit}/${taskId}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from("season-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      })
      if (error) throw error
      const { data } = supabase.storage.from("season-photos").getPublicUrl(path)
      await trackSave(updateSeasonTask(taskId, { photo_url: data.publicUrl }))
      router.refresh()
    } catch (error) { console.error(error) }
    setUploadingId(null)
    photoTarget.current = null
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
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handlePhoto(e.target.files)}
      />

      {/* Year */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {years.map(y => (
          <Pill
            key={y}
            label={y}
            state={y === year ? "on" : "off"}
            accent="stays"
            onClick={() => router.push(`/season?year=${y}`)}
          />
        ))}
        <Pill
          label={`+ ${Math.max(...years) + 1}`}
          state="off"
          accent="stays"
          onClick={() => router.push(`/season?year=${Math.max(...years) + 1}`)}
        />
      </div>

      {/* Unit */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented value={unit} onValueChange={v => setUnit(v as SeasonUnit)} accent="stays">
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

        {closing && (
          <div className="flex items-center gap-2">
            <ProgressRing done={done} total={total} />
            <Button
              variant={closing.closed_at ? "outline" : "default"}
              accent="stays"
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
          accent="stays"
        />
      ) : (
        <div className="space-y-4">
          {closing.closed_at && (
            <Card className="shadow-none border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3 gap-0">
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
              <Card key={area} className="shadow-none border-2 overflow-hidden py-0 gap-0">
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
                            ? "border-rose-500 bg-rose-500 text-white"
                            : "border-gray-300 hover:border-rose-400",
                        )}
                      >
                        {task.done && <Check className="size-3.5" strokeWidth={3} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-sm leading-snug",
                          task.done ? "text-gray-400 line-through" : "text-gray-800",
                        )}>
                          {task.title}
                        </p>
                        {task.done && task.done_by_name && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {task.done_by_name}
                            {task.done_at && ` · ${new Date(task.done_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          </p>
                        )}
                      </div>

                      {task.photo_url ? (
                        <button
                          type="button"
                          onClick={() => setLightbox(task.photo_url)}
                          className="size-9 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200"
                          title="View photo"
                        >
                          <img src={task.photo_url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <Button
                          variant="subtle"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          title="Add a photo"
                          onClick={() => { photoTarget.current = task.id; photoInputRef.current?.click() }}
                        >
                          {uploadingId === task.id ? <Loader2 className="animate-spin" /> : <Camera />}
                        </Button>
                      )}

                      <Button
                        variant="subtle"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-600"
                        title="Remove this step"
                        onClick={async () => {
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
                      <Button accent="stays" size="sm" onClick={() => handleAdd(area)} disabled={!newTitle.trim()}>
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

      {lightbox && (
        <ImageLightbox
          urls={[lightbox]}
          index={0}
          onClose={() => setLightbox(null)}
          onNavigate={() => {}}
        />
      )}
    </PageShell>
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
          stroke={pct === 1 ? "#10b981" : "#f43f5e"}
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
