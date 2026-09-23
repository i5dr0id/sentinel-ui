import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft, Blocks, Crosshair, GripVertical, Radar, ShieldAlert, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MitreChips, SeverityBadge } from "@/components/severity"
import { EmptyState, PageHeader } from "@/core/components/shell"
import {
  useAlert,
  useAlertChain,
  useAlertEvents,
  useAlertIOCs,
  useAlerts,
  useContainment,
} from "@/core/hooks/queries"
import { clock, flag, methodColor, statusTone, timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Alert, Chain, IOC } from "@/core/api/types"
import { AlertDetail } from "@/modules/alerts/AlertDetail"

export default function InvestigatePage() {
  const { id } = useParams()
  const { data: alerts } = useAlerts({ limit: 100 })
  const active = useMemo(() => (alerts?.items ?? []).filter((a) => a.status !== "RESOLVED"), [alerts])

  if (!id) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 pb-10">
        <PageHeader
          title="Investigate"
          description="Pick an alert to dig into source intelligence, related events and the response timeline."
        />
        <div className="px-6">
          {active.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No active alerts to investigate" />
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {active.map((a) => (
                <Link
                  key={a.id}
                  to={`/investigate/${a.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-card/40 p-3 transition-colors hover:border-border hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{a.title}</span>
                      <MitreChips mitre={a.mitre} />
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {a.src_ip || a.asset} · {a.count} events
                    </div>
                  </div>
                  <SeverityBadge severity={a.severity} className="shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return <Investigation alertId={id} />
}

function Investigation({ alertId }: { alertId: string }) {
  const { data: alert, isLoading } = useAlert(alertId)
  if (isLoading || !alert) {
    return (
      <div className="px-6 py-20 text-center text-xs text-muted-foreground">
        Loading investigation…{alertId}
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-10">
      <div className="px-6 pt-6">
        <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
          <Link to="/investigate">
            <ArrowLeft className="size-3.5" /> All investigations
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 px-6 pt-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <AlertDetail alert={alert} />
            </CardContent>
          </Card>
          <KillChainCard alert={alert} />
        </div>

        <div className="space-y-4">
          <SourceIntel alert={alert} />
          <IocCard alert={alert} />
          <IncidentPanel alert={alert} />
          <TimelineCard alert={alert} />
        </div>
      </div>
    </div>
  )
}

function SourceIntel({ alert }: { alert: Alert }) {
  const { data: events } = useAlertEvents(alert.id)
  const geo = alert.geo
  const methods = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of events?.items ?? []) {
      const k = e.method || "—"
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [events])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radar className="size-4 text-sky-400" /> Source intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">IP address</div>
          <div className="mt-0.5 font-mono text-base text-sky-400">{alert.src_ip || "—"}</div>
        </div>
        {geo?.org ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">ASN</div>
              <div className="mt-0.5 font-mono text-foreground">AS{geo.asn}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Org</div>
              <div className="mt-0.5 text-foreground">{geo.org}</div>
            </div>
          </div>
        ) : null}
        {geo?.country_code ? (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Geo</div>
            <div className="mt-0.5 text-foreground">
              {flag(geo.country_code)} {geo.country_name}
              {geo.city ? ` · ${geo.city}` : ""}
            </div>
          </div>
        ) : null}
        {methods.length > 0 ? (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Observed methods</div>
            <div className="flex flex-wrap gap-1.5">
              {methods.map(([m, n]) => (
                <span key={m} className="rounded border bg-background/50 px-1.5 py-0.5 font-mono text-[10px]">
                  <span className={methodColor(m)}>{m}</span> <span className="text-muted-foreground">×{n}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function KillChainCard({ alert }: { alert: Alert }) {
  const { data: chain, isLoading } = useAlertChain(alert.id)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Crosshair className="size-4 text-rose-400" /> Kill chain
          </span>
          {chain ? (
            <span className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>{chain.total_alerts} alerts</span>
              <span>
                Reached <span className="text-rose-300">{chain.reached_phase.replaceAll("_", " ")}</span>
              </span>
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !chain ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Building chain…</p>
        ) : (
          <div className="space-y-1.5">
            {chain.phases.map((p) => (
              <ChainPhaseRow key={p.phase} phase={p} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChainPhaseRow({ phase }: { phase: Chain["phases"][number] }) {
  const covered = phase.covered
  const blocked = phase.blocked_count > 0
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-3 py-2",
        covered && "border-border bg-background/40",
        !covered && "border-dashed border-border/40 bg-transparent opacity-60",
        blocked && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
          covered ? "border-rose-500/50 text-rose-300" : "border-border text-muted-foreground",
        )}
      >
        {covered ? "×" : "·"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium capitalize text-foreground">
          {phase.label}
          <span className="ml-1.5 font-mono text-[10px] normal-case text-muted-foreground">{phase.phase}</span>
        </div>
        {covered ? (
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <SeverityBadge severity={phase.severity} className="!text-[9px]" />
            <span>{phase.count} alert{phase.count === 1 ? "" : "s"}</span>
            {blocked ? (
              <span className="flex items-center gap-0.5 text-emerald-400">
                <Zap className="size-3" /> contained
              </span>
            ) : null}
            <span className="ml-auto">{timeAgo(phase.last_seen)}</span>
          </div>
        ) : (
          <div className="mt-0.5 text-[10px] text-muted-foreground">No activity observed</div>
        )}
      </div>
    </div>
  )
}

function IocCard({ alert }: { alert: Alert }) {
  const { data, isLoading } = useAlertIOCs(alert.id)
  const iocs = data?.items ?? []
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Blocks className="size-4 text-violet-400" /> Indicators of compromise
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-2 text-center text-xs text-muted-foreground">Extracting…</p>
        ) : iocs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No indicators extracted.</p>
        ) : (
          <div className="space-y-1.5">
            {iocs.slice(0, 12).map((i) => (
              <IocRow key={i.type + i.value} ioc={i} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IocRow({ ioc }: { ioc: IOC }) {
  const confidence = Math.round((ioc.confidence ?? 0) * 100)
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background/40 px-2.5 py-1.5">
      <div className="min-w-0">
        <div className="truncate font-mono text-[11px] text-foreground">
          {ioc.type === "path" ? <span className="text-muted-foreground">/</span> : null}
          {ioc.value}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          {ioc.type} · ×{ioc.count}
        </div>
      </div>
      <div
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]",
          confidence >= 70 ? "bg-rose-500/15 text-rose-300" : "bg-background text-muted-foreground",
        )}
      >
        {confidence}%
      </div>
    </div>
  )
}

function IncidentPanel({ alert }: { alert: Alert }) {
  const { data: containment } = useContainment(alert.src_ip)
  const active = (containment?.items ?? []).filter((c) => c.status === "ACTIVE")
  const controls = active.map((c) => ({
    id: c.id,
    label: c.type.replaceAll("_", " "),
    target: c.target_ip,
  }))
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GripVertical className="size-4 text-emerald-400" /> Incident status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border bg-background/40 px-2.5 py-2 text-left hover:bg-accent/50"
        >
          <span className="font-medium">{alert.src_ip || "—"}</span>
          {active.length > 0 ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
              {active.length} control{active.length === 1 ? "" : "s"} ACTIVE
            </span>
          ) : (
            <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              not contained
            </span>
          )}
        </button>
        {open &&
          (controls.length === 0 ? (
            <p className="px-1 text-[11px] text-muted-foreground">
              No active containment for this source. Deploy a control from the Respond page.
            </p>
          ) : (
            <div className="space-y-1.5">
              {controls.map((c) => (
                <div key={c.id} className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5">
                  <div className="font-mono text-[11px] text-emerald-300">{c.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{c.target}</div>
                </div>
              ))}
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

function TimelineCard({ alert }: { alert: Alert }) {
  const items: { at: string; label: string; detail?: string }[] = [
    { at: alert.created_at, label: "Detected", detail: `${alert.title} (${alert.rule_id})` },
  ]
  if (alert.assigned_at) {
    items.push({ at: alert.assigned_at, label: "Assigned", detail: alert.assignee })
  }
  if (alert.status_changed_at && alert.status === "IN_PROGRESS") {
    items.push({ at: alert.status_changed_at, label: "Triage started" })
  }
  if (alert.responded_at) {
    items.push({ at: alert.responded_at, label: "Responded" })
  }
  if (alert.resolved_at) {
    items.push({ at: alert.resolved_at, label: "Resolved", detail: alert.resolution })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Response timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {items.map((it, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    it.label === "Detected" ? "bg-critical" : "bg-ring/70",
                  )}
                />
                {i < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
              </div>
              <div className={cn("pb-4", i === items.length - 1 && "pb-0")}>
                <div className="text-xs font-medium text-foreground">{it.label}</div>
                {it.detail ? <div className="text-[11px] text-muted-foreground">{it.detail}</div> : null}
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{clock(it.at)} · {timeAgo(it.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RelatedEventsTable({ alertId }: { alertId: string }) {
  const { data } = useAlertEvents(alertId)
  const events = data?.items ?? []
  if (events.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Raw events</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/90">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-2 py-2 font-medium">Verb</th>
                <th className="px-2 py-2 font-medium">Code</th>
                <th className="px-2 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">Src</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border/50 font-mono">
                  <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{clock(e.timestamp)}</td>
                  <td className={cn("px-2 py-1.5", methodColor(e.method))}>{e.method || "—"}</td>
                  <td className={cn("px-2 py-1.5", statusTone(e.status))}>{e.status || "—"}</td>
                  <td className="max-w-[260px] truncate px-2 py-1.5">{e.path}</td>
                  <td className="px-3 py-1.5 text-sky-400">{e.src_ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
