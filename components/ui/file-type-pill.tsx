import * as React from 'react'
import {
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface FileFamily {
  label: string
  icon: LucideIcon
  /** Tinted pill body. */
  tint: string
  /** Solid leading chip that carries the icon. */
  chip: string
}

const PDF: FileFamily = {
  label: 'PDF',
  icon: FileType2,
  tint: 'bg-red-50 text-red-700 border-red-200',
  chip: 'bg-red-500 text-white',
}

const families: Record<string, FileFamily> = {
  pdf: PDF,

  /* Not a file type — the marker for a written note, so notes and documents
     carry the same shape in the merged list. */
  note: { label: 'NOTE', icon: FileText, tint: 'bg-indigo-50 text-indigo-700 border-indigo-200', chip: 'bg-indigo-500 text-white' },

  doc: { label: 'DOC', icon: FileText, tint: 'bg-blue-50 text-blue-700 border-blue-200', chip: 'bg-blue-500 text-white' },
  docx: { label: 'DOCX', icon: FileText, tint: 'bg-blue-50 text-blue-700 border-blue-200', chip: 'bg-blue-500 text-white' },
  odt: { label: 'ODT', icon: FileText, tint: 'bg-blue-50 text-blue-700 border-blue-200', chip: 'bg-blue-500 text-white' },
  rtf: { label: 'RTF', icon: FileText, tint: 'bg-blue-50 text-blue-700 border-blue-200', chip: 'bg-blue-500 text-white' },

  xls: { label: 'XLS', icon: FileSpreadsheet, tint: 'bg-emerald-50 text-emerald-700 border-emerald-200', chip: 'bg-emerald-500 text-white' },
  xlsx: { label: 'XLSX', icon: FileSpreadsheet, tint: 'bg-emerald-50 text-emerald-700 border-emerald-200', chip: 'bg-emerald-500 text-white' },
  ods: { label: 'ODS', icon: FileSpreadsheet, tint: 'bg-emerald-50 text-emerald-700 border-emerald-200', chip: 'bg-emerald-500 text-white' },
  csv: { label: 'CSV', icon: FileSpreadsheet, tint: 'bg-teal-50 text-teal-700 border-teal-200', chip: 'bg-teal-500 text-white' },

  ppt: { label: 'PPT', icon: Presentation, tint: 'bg-orange-50 text-orange-700 border-orange-200', chip: 'bg-orange-500 text-white' },
  pptx: { label: 'PPTX', icon: Presentation, tint: 'bg-orange-50 text-orange-700 border-orange-200', chip: 'bg-orange-500 text-white' },

  json: { label: 'JSON', icon: FileCode2, tint: 'bg-violet-50 text-violet-700 border-violet-200', chip: 'bg-violet-500 text-white' },
  xml: { label: 'XML', icon: FileCode2, tint: 'bg-violet-50 text-violet-700 border-violet-200', chip: 'bg-violet-500 text-white' },
  yml: { label: 'YML', icon: FileCode2, tint: 'bg-violet-50 text-violet-700 border-violet-200', chip: 'bg-violet-500 text-white' },
  yaml: { label: 'YAML', icon: FileCode2, tint: 'bg-violet-50 text-violet-700 border-violet-200', chip: 'bg-violet-500 text-white' },
  ini: { label: 'INI', icon: FileCode2, tint: 'bg-violet-50 text-violet-700 border-violet-200', chip: 'bg-violet-500 text-white' },
  conf: { label: 'CONF', icon: FileCode2, tint: 'bg-violet-50 text-violet-700 border-violet-200', chip: 'bg-violet-500 text-white' },

  png: { label: 'PNG', icon: FileImage, tint: 'bg-pink-50 text-pink-700 border-pink-200', chip: 'bg-pink-500 text-white' },
  jpg: { label: 'JPG', icon: FileImage, tint: 'bg-pink-50 text-pink-700 border-pink-200', chip: 'bg-pink-500 text-white' },
  jpeg: { label: 'JPEG', icon: FileImage, tint: 'bg-pink-50 text-pink-700 border-pink-200', chip: 'bg-pink-500 text-white' },
  heic: { label: 'HEIC', icon: FileImage, tint: 'bg-pink-50 text-pink-700 border-pink-200', chip: 'bg-pink-500 text-white' },

  zip: { label: 'ZIP', icon: FileArchive, tint: 'bg-amber-50 text-amber-700 border-amber-200', chip: 'bg-amber-500 text-white' },
}

const fallback: FileFamily = {
  label: 'FILE',
  icon: FileText,
  tint: 'bg-gray-100 text-gray-600 border-gray-200',
  chip: 'bg-gray-500 text-white',
}

export function fileFamily(fileType: string): FileFamily {
  const key = fileType.replace(/^\./, '').toLowerCase()
  const known = families[key]
  if (known) return known
  // Unknown extension: keep the real label, use the neutral palette.
  return key ? { ...fallback, label: key.toUpperCase() } : fallback
}

/**
 * Designed badge marking an item as an uploaded document rather than a note.
 * `solid` puts the icon on a filled leading chip — used on cards, where the
 * pill has to read at a glance; `soft` is the quieter inline form.
 */
export function FileTypePill({
  fileType,
  variant = 'solid',
  className,
  ...props
}: React.ComponentProps<'span'> & {
  fileType: string
  variant?: 'solid' | 'soft'
}) {
  const family = fileFamily(fileType)
  const Icon = family.icon

  if (variant === 'soft') {
    return (
      <span
        data-slot="file-type-pill"
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 h-5 text-[10px] font-bold uppercase tracking-wider',
          family.tint,
          className,
        )}
        {...props}
      >
        <Icon className="size-3" />
        {family.label}
      </span>
    )
  }

  return (
    <span
      data-slot="file-type-pill"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border pr-2.5 pl-1 h-6 text-[10px] font-bold uppercase tracking-wider',
        family.tint,
        className,
      )}
      {...props}
    >
      <span className={cn('inline-flex items-center justify-center size-4.5 rounded-full', family.chip)}>
        <Icon className="size-2.5" />
      </span>
      {family.label}
    </span>
  )
}
