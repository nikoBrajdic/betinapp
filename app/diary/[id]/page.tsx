import { getDiaryEntry } from "@/lib/actions/diary"
import { DiaryEditorClient } from "./diary-editor-client"
import { notFound } from "next/navigation"

export default async function DiaryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const entry = await getDiaryEntry(id)
    return <DiaryEditorClient entry={entry} />
  } catch {
    notFound()
  }
}
