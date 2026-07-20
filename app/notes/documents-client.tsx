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

const ACCEPTED_TYPES = ".txt,.md,.markdown,.xml,.json,.csv,.yml,.yaml,.ini,.conf,.log,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods"

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
                  <button type="button" onClick={() => openDocument(doc)} className="font-semibold text-gray-800 truncate text-left hover:text-blue-600">{doc.name}</button>
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
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <button type="button" onClick={() => toggleSort("name")} className="w-[28%] text-left hover:text-gray-600">Name</button>
            <button type="button" onClick={() => toggleSort("size")} className="w-[12%] text-left hover:text-gray-600">Size</button>
            <button type="button" onClick={() => toggleSort("modified")} className="w-[18%] text-left hover:text-gray-600">Date modified</button>
            <button type="button" onClick={() => toggleSort("addedBy")} className="w-[18%] text-left hover:text-gray-600">Added by</button>
            <button type="button" onClick={() => toggleSort("lastModifiedBy")} className="flex-1 text-left hover:text-gray-600">Last modified by</button>
            <div className="w-7 flex-shrink-0" />
          </div>
          <div className="divide-y divide-gray-100">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors">
                <button type="button" onClick={() => openDocument(doc)} className="w-[28%] min-w-0 text-left font-medium text-gray-800 truncate hover:text-blue-600">{doc.name}</button>
                <div className="w-[12%] text-sm text-gray-600">{humanSize(doc.size_bytes)}</div>
                <div className="w-[18%] text-sm text-gray-600">{dateText(doc.updated_at)}</div>
                <div className="w-[18%] text-sm text-gray-600 truncate">{doc.added_by_name}</div>
                <div className="flex-1 text-sm text-gray-600 truncate">{doc.last_modified_by_name}</div>
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
