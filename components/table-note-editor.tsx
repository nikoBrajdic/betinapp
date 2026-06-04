"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TableData {
  columns: string[]
  rows: string[][]
}

export function emptyTable(): TableData {
  return {
    columns: ["Column 1", "Column 2", "Column 3"],
    rows: [["", "", ""], ["", "", ""]],
  }
}

export function parseTableContent(content: string): TableData {
  try {
    const parsed = JSON.parse(content)
    if (parsed.columns && parsed.rows) return parsed
  } catch {}
  return emptyTable()
}

export function stringifyTable(data: TableData): string {
  return JSON.stringify(data)
}

interface CellProps {
  value: string
  onChange: (v: string) => void
  isHeader?: boolean
  onTab?: () => void
}

function Cell({ value, onChange, isHeader, onTab }: CellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => { onChange(draft); setEditing(false) }

  return (
    <td
      className={cn(
        "border border-gray-200 px-3 py-1.5 min-w-[100px] max-w-[220px] text-sm",
        isHeader && "bg-gray-50 font-semibold text-gray-700",
        !isHeader && "text-gray-600",
        !editing && "cursor-pointer hover:bg-blue-50/50"
      )}
      onClick={() => !editing && setEditing(true)}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") { commit(); onTab?.() }
            if (e.key === "Tab") { e.preventDefault(); commit(); onTab?.() }
            if (e.key === "Escape") { setDraft(value); setEditing(false) }
          }}
          className="w-full outline-none bg-transparent border-b border-blue-400"
        />
      ) : (
        <span className={cn("block truncate", !value && "text-gray-300 italic")}>
          {value || (isHeader ? "Column" : "Empty")}
        </span>
      )}
    </td>
  )
}

interface TableNoteEditorProps {
  value: TableData
  onChange: (data: TableData) => void
}

export function TableNoteEditor({ value, onChange }: TableNoteEditorProps) {
  const update = (next: TableData) => onChange(next)

  const setColumn = (ci: number, v: string) => {
    const cols = [...value.columns]
    cols[ci] = v
    update({ ...value, columns: cols })
  }

  const setCell = (ri: number, ci: number, v: string) => {
    const rows = value.rows.map(r => [...r])
    rows[ri][ci] = v
    update({ ...value, rows })
  }

  const addColumn = () => {
    update({
      columns: [...value.columns, `Column ${value.columns.length + 1}`],
      rows: value.rows.map(r => [...r, ""]),
    })
  }

  const removeColumn = (ci: number) => {
    if (value.columns.length <= 1) return
    update({
      columns: value.columns.filter((_, i) => i !== ci),
      rows: value.rows.map(r => r.filter((_, i) => i !== ci)),
    })
  }

  const addRow = () => {
    update({ ...value, rows: [...value.rows, value.columns.map(() => "")] })
  }

  const removeRow = (ri: number) => {
    if (value.rows.length <= 1) return
    update({ ...value, rows: value.rows.filter((_, i) => i !== ri) })
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="border-collapse w-full text-sm">
        <thead>
          <tr>
            {value.columns.map((col, ci) => (
              <th key={ci} className="relative group border border-gray-200 bg-gray-50 p-0">
                <div className="flex items-center">
                  <Cell
                    value={col}
                    onChange={v => setColumn(ci, v)}
                    isHeader
                  />
                  {value.columns.length > 1 && (
                    <button
                      onClick={() => removeColumn(ci)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </th>
            ))}
            <th className="border border-gray-200 bg-gray-50 w-8">
              <button
                onClick={addColumn}
                className="w-full h-full flex items-center justify-center p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Add column"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {value.rows.map((row, ri) => (
            <tr key={ri} className="group/row">
              {row.map((cell, ci) => (
                <Cell key={ci} value={cell} onChange={v => setCell(ri, ci, v)} />
              ))}
              <td className="border border-gray-200 w-8">
                {value.rows.length > 1 && (
                  <button
                    onClick={() => removeRow(ri)}
                    className="opacity-0 group-hover/row:opacity-100 w-full h-full flex items-center justify-center p-2 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer"
                    title="Remove row"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={value.columns.length + 1} className="border border-gray-200">
              <button
                onClick={addRow}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// Mini read-only preview for the note card
export function TableNotePreview({ content }: { content: string }) {
  const data = parseTableContent(content)
  const previewCols = data.columns.slice(0, 4)
  const previewRows = data.rows.slice(0, 3)

  return (
    <div className="overflow-hidden rounded border border-gray-200 text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {previewCols.map((col, i) => (
              <th key={i} className="border-b border-gray-200 bg-gray-50 px-2 py-1 text-left font-medium text-gray-500 truncate max-w-[80px]">
                {col || "—"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, ri) => (
            <tr key={ri}>
              {row.slice(0, 4).map((cell, ci) => (
                <td key={ci} className="border-b border-gray-100 px-2 py-1 text-gray-500 truncate max-w-[80px]">
                  {cell || <span className="text-gray-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length > 3 && (
        <div className="px-2 py-1 text-gray-400 text-[10px]">+{data.rows.length - 3} more rows</div>
      )}
    </div>
  )
}
