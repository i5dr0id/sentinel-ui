import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { severityMeta, statusColor } from "@/lib/format"
import type { Severity, Status } from "@/core/api/types"

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const meta = severityMeta[severity] ?? severityMeta.LOW
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] tracking-wider", meta.className, className)}>
      {meta.label}
    </Badge>
  )
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-[11px] tracking-wider", statusColor(status), className)}>
      {status.toUpperCase()}
    </Badge>
  )
}

export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(Math.min(confidence, 0.99) * 100)
  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className="h-1 w-16" />
      <span className="font-mono text-[11px] text-muted-foreground">conf:{pct}%</span>
    </div>
  )
}

export function MitreChips({ mitre }: { mitre?: string[] }) {
  if (!mitre?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      {mitre.map((m) => (
        <Badge key={m} variant="outline" className="font-mono text-[10px] text-sky-300 border-sky-500/30 bg-sky-500/10">
          {m}
        </Badge>
      ))}
    </div>
  )
}
