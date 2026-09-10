"use client"

import { Button } from "@/components/ui/button"
import { useT } from "@/lib/language"

export function EditorSaveError({ retry }: { retry: () => Promise<void> }) {
  const t = useT()
  return (
    <div role="alert" className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2 text-sm text-gray-800">
      <span>{t("save.editorFailed")}</span>
      <Button variant="outline" size="sm" onClick={() => { void retry().catch(() => {}) }}>
        {t("save.retry")}
      </Button>
    </div>
  )
}
