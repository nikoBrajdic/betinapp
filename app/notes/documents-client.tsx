"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Grid3X3, List, MoreHorizontal, Search, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createNoteDocument, deleteNoteDocument, updateNoteDocumentVersion, type NoteDocument, type DocumentTextKind } from "@/lib/actions/note-documents"
import { trackSave } from "@/lib/save-events"

type ViewMode = "grid" | "details"
type SortKey = "name" | "size" | "modified" | "addedBy" | "lastModifiedBy"
type SortDirection = "asc" | "desc"
type ColumnKey = "type" | "name" | "size" | "modified" | "addedBy"

const ACCEPTED_TYPES = ".txt,.md,.markdown,.xml,.json,.csv,.yml,.yaml,.ini,.conf,.log,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods"
const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  type: 40,
  name: 220,
  size: 100,
  modified: 140,
  addedBy: 150,
}
const COLUMN_KEYS: ColumnKey[] = ["type", "name", "size", "modified", "addedBy"]

function shrinkProportionally(
  widths: Record<ColumnKey, number>,
  keys: ColumnKey[],
  shrinkAmount: number
): { next: Record<ColumnKey, number>; applied: number } {
  const next = { ...widths }
  if (shrinkAmount <= 0 || keys.length === 0) return { next, applied: 0 }

  let remaining = shrinkAmount
  let flexKeys = [...keys]

  while (remaining > 0.01 && flexKeys.length > 0) {
    const flexTotal = flexKeys.reduce((sum, key) => sum + next[key], 0)
    if (flexTotal <= 0) break

    let movedThisRound = 0
    const nextFlexKeys: ColumnKey[] = []

    for (const key of flexKeys) {
      const ratio = next[key] / flexTotal
      const targetTake = remaining * ratio
      const available = next[key] - MIN_COLUMN_WIDTHS[key]
      const taken = Math.min(targetTake, Math.max(0, available))
      next[key] -= taken
      movedThisRound += taken
      if (next[key] - MIN_COLUMN_WIDTHS[key] > 0.01) nextFlexKeys.push(key)
    }

    if (movedThisRound <= 0.01) break
    remaining -= movedThisRound
    flexKeys = nextFlexKeys
  }

  return { next, applied: shrinkAmount - remaining }
}

const plainExtensions = new Set(["txt", "md", "markdown", "xml", "json", "csv", "yml", "yaml", "ini", "conf", "log"])

function extOf(filename: string) {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

function inferTextKind(ext: string): DocumentTextKind {
  return plainExtensions.has(ext) ? "plain" : "rich"
}

function humanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function dateText(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function DocumentsClient({ documents }: { documents: NoteDocument[] }) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("modified")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [wrongTypeOpen, setWrongTypeOpen] = useState(false)
  const [wrongTypeText, setWrongTypeText] = useState("")
  const [deleteDoc, setDeleteDoc] = useState<NoteDocument | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>({
    type: 40,
    name: 320,
    size: 110,
    modified: 170,
    addedBy: 170,
  })
  const addInputRef = useRef<HTMLInputElement | null>(null)
  const updateInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const supabase = useMemo(() => createClient(), [])

  const filteredDocs = useMemo(() => {
    const query = search.trim().toLowerCase()
    const base = query
      ? documents.filter(doc =>
          doc.name.toLowerCase().includes(query) ||
          doc.file_type.toLowerCase().includes(query) ||
          doc.added_by_name.toLowerCase().includes(query) ||
          doc.last_modified_by_name.toLowerCase().includes(query)
        )
      : documents

    return [...base].sort((a, b) => {
      const sign = sortDirection === "asc" ? 1 : -1
      switch (sortKey) {
        case "name":
          return sign * a.name.localeCompare(b.name)
        case "size":
          return sign * (a.size_bytes - b.size_bytes)
        case "addedBy":
          return sign * a.added_by_name.localeCompare(b.added_by_name)
        case "lastModifiedBy":
          return sign * a.last_modified_by_name.localeCompare(b.last_modified_by_name)
        case "modified":
        default:
          return sign * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      }
    })
  }, [documents, search, sortKey, sortDirection])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection(current => (current === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDirection(key === "modified" ? "desc" : "asc")
    }
  }

  const startResize = (key: ColumnKey, startX: number) => {
    const startWidths = { ...columnWidths }
    const dividerIndex = COLUMN_KEYS.indexOf(key)
    const leftKeys = COLUMN_KEYS.slice(0, dividerIndex)
    const rightKeys = COLUMN_KEYS.slice(dividerIndex + 1)

    const onMove = (event: MouseEvent) => {
      const delta = event.clientX - startX
      const nextWidths: Record<ColumnKey, number> = { ...startWidths }

      if (delta >= 0) {
        // Rule 1 (drag right): resized column grows linearly;
        // columns to the right shrink proportionally; columns to the left stay fixed.
        if (rightKeys.length === 0) {
          nextWidths[key] = startWidths[key] + delta
        } else {
          const { next: shrunkRight, applied } = shrinkProportionally(nextWidths, rightKeys, delta)
          Object.assign(nextWidths, shrunkRight)
          nextWidths[key] = startWidths[key] + applied
        }
        setColumnWidths(nextWidths)
        return
      }

      // Drag left: first shrink immediate left column linearly until min.
      const desiredKey = startWidths[key] + delta
      const clampedKey = Math.max(MIN_COLUMN_WIDTHS[key], desiredKey)
      const primaryShrink = startWidths[key] - clampedKey
      const overshoot = -delta - primaryShrink // extra left drag past this column's minimum

      nextWidths[key] = clampedKey

      // Expansion amount that must be absorbed by columns to the right of divider.
      let totalRightExpansion = primaryShrink

      // Rule 2: once immediate left column reaches min, continue by shrinking columns to its left
      // (same proportional-min-guard behavior), and send that width to the right side.
      if (overshoot > 0 && leftKeys.length > 0) {
        const { next: shrunkLeft, applied } = shrinkProportionally(nextWidths, leftKeys, overshoot)
        Object.assign(nextWidths, shrunkLeft)
        totalRightExpansion += applied
      }

      if (totalRightExpansion > 0 && rightKeys.length > 0) {
        const rightStartTotal = rightKeys.reduce((sum, columnKey) => sum + startWidths[columnKey], 0)
        if (rightStartTotal > 0) {
          for (const columnKey of rightKeys) {
            const ratio = startWidths[columnKey] / rightStartTotal
            nextWidths[columnKey] = startWidths[columnKey] + totalRightExpansion * ratio
          }
        }
      }

      setColumnWidths(nextWidths)
    }

    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const uploadToStorage = async (file: File) => {
    const extension = extOf(file.name)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from("notes-documents").upload(path, file, { upsert: false, contentType: file.type || undefined })
    if (error) throw error
    return { path, extension }
  }

  const handleCreate = async (file?: File) => {
    if (!file) return
    try {
      const { path, extension } = await uploadToStorage(file)
      await trackSave(createNoteDocument({
        name: file.name.replace(/\.[^/.]+$/, ""),
        fileType: extension || "unknown",
        textKind: inferTextKind(extension),
        sizeBytes: file.size,
        storagePath: path,
      }))
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      if (addInputRef.current) addInputRef.current.value = ""
    }
  }

  const handleUpdate = async (doc: NoteDocument, file?: File) => {
    if (!file) return
    const nextExt = extOf(file.name)
    if (nextExt !== doc.file_type) {
      setWrongTypeText(`Expected .${doc.file_type} but got .${nextExt || "unknown"}.`)
      setWrongTypeOpen(true)
      const input = updateInputRefs.current[doc.id]
      if (input) input.value = ""
      return
    }
    try {
      const { path } = await uploadToStorage(file)
      await trackSave(updateNoteDocumentVersion(doc.id, { sizeBytes: file.size, storagePath: path }))
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      const input = updateInputRefs.current[doc.id]
      if (input) input.value = ""
    }
  }

  const openDocument = (doc: NoteDocument) => {
    const { data } = supabase.storage.from("notes-documents").getPublicUrl(doc.storage_path)
    if (data.publicUrl) window.open(data.publicUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <Input className="pl-8" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100">
            <button type="button" onClick={() => setViewMode("grid")} className={`h-8 w-8 inline-flex items-center justify-center rounded-lg ${viewMode === "grid" ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700"}`}><Grid3X3 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode("details")} className={`h-8 w-8 inline-flex items-center justify-center rounded-lg ${viewMode === "details" ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700"}`}><List className="h-4 w-4" /></button>
          </div>
          <input ref={addInputRef} className="hidden" type="file" accept={ACCEPTED_TYPES} onChange={e => handleCreate(e.target.files?.[0])} />
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => addInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Add Document
          </Button>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="py-20 text-center text-gray-400">No documents found.</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="p-4 border-2 shadow-none">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <button type="button" onClick={() => openDocument(doc)} className="font-semibold text-gray-800 text-left hover:text-blue-600 whitespace-normal break-words leading-tight">{doc.name}</button>
                  <p className="text-xs text-gray-400 uppercase">{doc.file_type}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => updateInputRefs.current[doc.id]?.click()}>Update version</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteDoc(doc)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <p>{humanSize(doc.size_bytes)}</p>
                <p>Modified {dateText(doc.updated_at)}</p>
                <p>Added by {doc.added_by_name}</p>
                <p>Last modified by {doc.last_modified_by_name}</p>
              </div>
              <input ref={el => { updateInputRefs.current[doc.id] = el }} className="hidden" type="file" accept={ACCEPTED_TYPES} onChange={e => handleUpdate(doc, e.target.files?.[0])} />
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-none border-2 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <div className="relative flex-shrink-0" style={{ width: columnWidths.type }}>
                  <span className="w-full text-left normal-case">Type</span>
                  <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-end" onMouseDown={e => { e.preventDefault(); startResize("type", e.clientX) }}>
                    <span className="h-4 w-px bg-gray-300" />
                  </div>
                </div>
                <div className="relative flex-shrink-0" style={{ width: columnWidths.name }}>
                  <button type="button" onClick={() => toggleSort("name")} className="w-full text-left hover:text-gray-600">Name</button>
                  <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-end" onMouseDown={e => { e.preventDefault(); startResize("name", e.clientX) }}>
                    <span className="h-4 w-px bg-gray-300" />
                  </div>
                </div>
                <div className="relative flex-shrink-0" style={{ width: columnWidths.size }}>
                  <button type="button" onClick={() => toggleSort("size")} className="w-full text-left hover:text-gray-600">Size</button>
                  <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-end" onMouseDown={e => { e.preventDefault(); startResize("size", e.clientX) }}>
                    <span className="h-4 w-px bg-gray-300" />
                  </div>
                </div>
                <div className="relative flex-shrink-0" style={{ width: columnWidths.modified }}>
                  <button type="button" onClick={() => toggleSort("modified")} className="w-full text-left hover:text-gray-600">Date modified</button>
                  <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-end" onMouseDown={e => { e.preventDefault(); startResize("modified", e.clientX) }}>
                    <span className="h-4 w-px bg-gray-300" />
                  </div>
                </div>
                <div className="relative flex-shrink-0" style={{ width: columnWidths.addedBy }}>
                  <button type="button" onClick={() => toggleSort("addedBy")} className="w-full text-left hover:text-gray-600">Added by</button>
                  <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-end" onMouseDown={e => { e.preventDefault(); startResize("addedBy", e.clientX) }}>
                    <span className="h-4 w-px bg-gray-300" />
                  </div>
                </div>
                <div className="flex-1 min-w-[170px]">
                  <button type="button" onClick={() => toggleSort("lastModifiedBy")} className="w-full text-left hover:text-gray-600">Last modified by</button>
                </div>
                <div className="w-7 flex-shrink-0" />
              </div>
              <div className="divide-y divide-gray-100">
                {filteredDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors">
                    <div
                      className="flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide truncate"
                      style={{ width: columnWidths.type }}
                      title={doc.file_type.toUpperCase()}
                    >
                      {doc.file_type.toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="min-w-0 text-left font-medium text-gray-800 truncate hover:text-blue-600"
                      style={{ width: columnWidths.name }}
                      title={doc.name}
                      aria-label={doc.name}
                    >
                      {doc.name}
                    </button>
                    <div className="text-sm text-gray-600 flex-shrink-0" style={{ width: columnWidths.size }}>{humanSize(doc.size_bytes)}</div>
                    <div className="text-sm text-gray-600 flex-shrink-0" style={{ width: columnWidths.modified }}>{dateText(doc.updated_at)}</div>
                    <div className="text-sm text-gray-600 truncate flex-shrink-0" style={{ width: columnWidths.addedBy }} title={doc.added_by_name}>{doc.added_by_name}</div>
                    <div className="text-sm text-gray-600 truncate flex-1 min-w-[170px]" title={doc.last_modified_by_name}>{doc.last_modified_by_name}</div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => updateInputRefs.current[doc.id]?.click()}>Update version</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteDoc(doc)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <input ref={el => { updateInputRefs.current[doc.id] = el }} className="hidden" type="file" accept={ACCEPTED_TYPES} onChange={e => handleUpdate(doc, e.target.files?.[0])} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={wrongTypeOpen} onOpenChange={setWrongTypeOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Type mismatch</DialogTitle>
            <DialogDescription>The new version must keep the same file type. {wrongTypeText}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setWrongTypeOpen(false)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteDoc)}
        onOpenChange={open => { if (!open) setDeleteDoc(null) }}
        itemName={deleteDoc?.name}
        onConfirm={async () => {
          if (!deleteDoc) return
          await trackSave(deleteNoteDocument(deleteDoc.id))
          setDeleteDoc(null)
          router.refresh()
        }}
      />
    </div>
  )
}
