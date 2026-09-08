"use client"

import * as React from "react"
import { Heading2, ImageIcon, Type, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type SlashCommandId = "paragraph" | "heading" | "image"

export interface SlashCommand {
  id: SlashCommandId
  label: string
  hint: string
  icon: LucideIcon
  /** Extra words the query can match on. */
  keywords: string[]
}

export function slashCommands(labels: {
  text: string
  heading: string
  image: string
}): SlashCommand[] {
  return [
    { id: "paragraph", label: labels.text, hint: "Plain paragraph", icon: Type, keywords: ["text", "paragraph", "p", "tekst"] },
    { id: "heading", label: labels.heading, hint: "Section title", icon: Heading2, keywords: ["heading", "title", "h2", "naslov"] },
    { id: "image", label: labels.image, hint: "Up to 3 per row", icon: ImageIcon, keywords: ["image", "photo", "picture", "slika", "foto"] },
  ]
}

export function filterSlashCommands(commands: SlashCommand[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return commands
  return commands.filter(
    command =>
      command.label.toLowerCase().includes(q) ||
      command.keywords.some(keyword => keyword.startsWith(q)),
  )
}

/**
 * The `/` command palette. Opens when a text block's content starts with a
 * slash, the pattern every current block editor uses (Notion, Craft, Bear),
 * and replaces the old "add block" toolbar pinned to the bottom of the page.
 */
export function SlashMenu({
  commands,
  activeIndex,
  onSelect,
  onHover,
  className,
}: {
  commands: SlashCommand[]
  activeIndex: number
  onSelect: (command: SlashCommand) => void
  onHover: (index: number) => void
  className?: string
}) {
  if (commands.length === 0) return null

  return (
    <div
      role="listbox"
      className={cn(
        "absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg",
        className,
      )}
      // Keep focus in the textarea so typing keeps filtering.
      onMouseDown={e => e.preventDefault()}
    >
      {commands.map((command, index) => {
        const Icon = command.icon
        const active = index === activeIndex
        return (
          <button
            key={command.id}
            type="button"
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(command)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
              active ? "bg-gray-100" : "hover:bg-gray-50",
            )}
          >
            <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-800">{command.label}</span>
              <span className="block truncate text-xs text-gray-400">{command.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
