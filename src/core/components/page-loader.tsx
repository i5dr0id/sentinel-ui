import { Loader2 } from "lucide-react"

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-xs">Loading…</span>
    </div>
  )
}
