import { getDiaryEntries } from "@/lib/actions/diary"
import { DiaryClient } from "./diary-client"

export default async function DiaryPage() {
  const entries = await getDiaryEntries()
  return <DiaryClient entries={entries} />
}
