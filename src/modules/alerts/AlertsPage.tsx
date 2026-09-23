import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Search, ShieldAlert } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MitreChips, SeverityBadge, StatusBadge } from "@/components/severity"
import { EmptyState, PageHeader, useAsset } from "@/core/components/shell"
import { useAlerts, useAssets } from "@/core/hooks/queries"
import { flag, timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Alert, Severity, Status } from "@/core/api/types"
import { AlertDetail } from "@/modules/alerts/AlertDetail"

export default function AlertsPage() {
  const { asset } = useAsset()
  const { data: assets } = useAssets()
  const [severity, setSeverity] = useState<Severity | "">("")
  const [status, setStatus] = useState<Status | "">("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Alert | null>(null)
  const navigate = useNavigate()

  const { data, isLoading } = useAlerts({
    severity,
    status,
    asset: asset || "",
    q: query || undefined,
    limit: 100,
  })

  const rows = useMemo(() => data?.items ?? [], [data])

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-10">
      <PageHeader
        title="Alerts"
        description={`All detections across the fleet. ${rows.length} shown.`}
        actions={
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "")}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="OPEN">Unassigned</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="flex items-center gap-2 px-6 pb-4">
        <div className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-background/60 px-3">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            placeholder="Search title, IP, asset, technique…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={severity} onValueChange={(v) => setSeverity(v as Severity | "")}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All severities</SelectItem>
            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
          </SelectContent>
        </Select>
        <Select value={asset} disabled>
          <SelectTrigger className="h-9 w-40 font-mono text-xs">
            <SelectValue placeholder="All assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All assets</SelectItem>
            {assets?.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-6">
        <div className="overflow-hidden rounded-lg border bg-card/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Threat</th>
                <th className="px-3 py-3 font-medium">Severity</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Asset</th>
                <th className="px-3 py-3 font-medium">Activity</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Seen</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Loading alerts…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={ShieldAlert}
                      title="No alerts match these filters"
                      hint="Loosen severity/status filters or search again."
                    />
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="cursor-pointer border-t border-border/50 transition-colors hover:bg-accent/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.title}</span>
                        <MitreChips mitre={a.mitre} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <SeverityBadge severity={a.severity} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5 font-mono">
                        {a.src_ip ? (
                          <>
                            <span className="text-sky-400">{a.src_ip}</span>
                            {a.geo?.country_code ? (
                              <span className="text-[10px] text-muted-foreground">{flag(a.geo.country_code)}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{a.asset}</td>
                    <td className={cn("px-3 py-2.5 font-mono text-muted-foreground")}>
                      {a.count}req/{a.blocked_count}blk · {a.unique_paths}p
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {timeAgo(a.last_seen_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className="w-full max-w-xl overflow-y-auto border-l p-0 sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>
              <AlertDetail alert={selected} />
              <div className="border-t p-4">
                <button
                  className="w-full rounded-md border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                  onClick={() => {
                    navigate(`/investigate/${selected.id}`)
                    setSelected(null)
                  }}
                >
                  Open full investigation →
                </button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
