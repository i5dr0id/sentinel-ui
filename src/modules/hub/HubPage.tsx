import { useMemo, useState } from "react"
import { Link } from "react-router"
import { ArrowUpRight, Blocks, Check, Radio, ShieldAlert, ShieldCheck, Timer, UserPlus } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfidenceBar, MitreChips, SeverityBadge, StatusBadge } from "@/components/severity"
import { EmptyState, PageHeader, useAsset } from "@/core/components/shell"
import { useLiveRequests } from "@/core/hooks/useLiveRequests"
import {
  useAssignAlert,
  useAlerts,
  useAssets,
  useIncidents,
  useMetrics,
  useSetAlertStatus,
  useSummary,
} from "@/core/hooks/queries"
import {
  clock,
  flag,
  methodColor,
  mttrLabel,
  statusTone,
  timeAgo,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Alert, Incident, Severity } from "@/core/api/types"

const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export default function HubPage() {
  const { asset } = useAsset()
  return <HubBody key={asset} asset={asset} />
}

function HubBody({ asset }: { asset: string }) {
  const { setAsset } = useAsset()
  const { data: summary } = useSummary()
  const { data: assets } = useAssets()
  const { data: alerts } = useAlerts({ limit: 8 })
  const { data: metrics } = useMetrics(asset || undefined, 30)
  const { data: incidents } = useIncidents()
  const live = useLiveRequests(asset || undefined)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const assign = useAssignAlert()
  const status = useSetAlertStatus()

  const active = useMemo(
    () => (alerts?.items ?? []).filter((a) => a.status !== "RESOLVED"),
    [alerts],
  )
  const priority = useMemo(
    () =>
      [...active].sort(
        (a, b) =>
          (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0) ||
          new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
      )[0],
    [active],
  )
  const queue = useMemo(() => active.slice(0, 6), [active])
  const stream = useMemo(() => live.events.slice(0, 40), [live.events])
  const topIncidents = useMemo(() => (incidents?.items ?? []).slice(0, 4), [incidents])

  const counts = summary?.counts
  const containment = summary?.containment

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function bulk(action: "assign" | "ack") {
    for (const id of selected) {
      if (action === "assign") assign.mutate({ id, assignee: "@me", actor: "hub" })
      else status.mutate({ id, status: "IN_PROGRESS", actor: "hub" })
    }
    setSelected(new Set())
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-10">
      <PageHeader
        title="Security Hub"
        description="Live monitoring across all assets. Detection, triage and response in one view."
        actions={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest",
                live.connected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400",
              )}
            >
              <span className={cn("size-1.5 rounded-full", live.connected ? "live-dot bg-emerald-400" : "bg-amber-400")} />
              {live.connected ? "Live" : "Connecting…"}
            </span>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger className="h-8 w-44 font-mono text-xs" aria-label="Asset">
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
        }
      />

      <div className="grid grid-cols-4 gap-3 px-6 pb-6 lg:grid-cols-7">
        <StatCard
          label="Alerts"
          value={counts?.total_active ?? "—"}
          icon={ShieldAlert}
          delta={counts ? `+${Math.max(0, counts.total_active - counts.resolved)}` : undefined}
        />
        <StatCard
          label="Investigate"
          value={counts?.in_progress ?? "—"}
          icon={Radio}
          delta={counts ? `+${counts.assigned}` : undefined}
        />
        <StatCard label="Active threats" value={counts?.total_active ?? "—"} icon={ArrowUpRight} />
        <StatCard
          label="Critical"
          value={counts?.critical ?? "—"}
          icon={ShieldAlert}
          accent="critical"
          delta={timelineDelta(summary?.alert_timeline)}
        />
        <StatCard label="Unassigned" value={counts?.unassigned ?? "—"} icon={UserPlus} accent="high" />
        <StatCard
          label="Blocked"
          value={containment?.blocked ?? "—"}
          icon={ShieldCheck}
          delta={containment && containment.blocked > 0 ? `${containment.active} active` : undefined}
        />
        <StatCard
          label="MTTR"
          value={mttrLabel(summary?.mttr_minutes ?? 0)}
          icon={Timer}
          delta={summary?.mttr_minutes ? "target <30m" : undefined}
          deltaTone="muted"
        />
      </div>

      <div className="grid gap-4 px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {priority ? <PriorityThreat alert={priority} /> : <EmptyState title="No active threats" />}
        </div>
        <div>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Triage queue</CardTitle>
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 ? `${selected.size} selected` : `${active.length} open`}
              </span>
            </CardHeader>
            {selected.size > 0 ? (
              <div className="flex items-center gap-2 border-b px-3 pb-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => bulk("assign")}
                  disabled={assign.isPending}
                >
                  <UserPlus className="size-3" /> Assign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={() => bulk("ack")}
                  disabled={status.isPending}
                >
                  <Check className="size-3" /> Ack
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px]"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </div>
            ) : null}
            <CardContent className="space-y-2">
              {queue.length === 0 ? (
                <EmptyState title="Queue is clear" hint="New detections land here first." />
              ) : (
                queue.map((a) => (
                  <QueueItem key={a.id} alert={a} selected={selected.has(a.id)} onToggle={() => toggle(a.id)} />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Blocks className="size-4 text-violet-400" /> Incidents
                <span className="font-mono text-[10px] font-normal text-muted-foreground">
                  {incidents?.items.length ?? "—"} grouped
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topIncidents.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">No grouped incidents yet.</p>
              ) : (
                topIncidents.map((inc) => <IncidentItem key={inc.id} incident={inc} />)
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 px-6">
        <TrafficChart data={metrics?.series ?? []} />
      </div>

      <div className="mt-4 px-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm">Live request stream</CardTitle>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="live-dot size-1.5 rounded-full bg-emerald-400" />
              api-gw-01 · streaming
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <RequestStream events={stream} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  accent,
  deltaTone,
}: {
  label: string
  value: string | number
  icon: typeof ShieldAlert
  delta?: string
  accent?: "critical" | "high"
  deltaTone?: "muted"
}) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={cn("size-3.5", accent === "critical" && "text-critical", accent === "high" && "text-high")} />
          <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tracking-tight">{value}</span>
          {delta ? (
            <span
              className={cn(
                "font-mono text-[11px]",
                deltaTone === "muted" ? "text-muted-foreground" : "text-emerald-400",
              )}
            >
              {delta}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function timelineDelta(timeline?: { total: number }[]) {
  if (!timeline?.length) return undefined
  const recent = timeline.slice(-10).reduce((sum, p) => sum + p.total, 0)
  return recent > 0 ? `+${recent}` : undefined
}

function PriorityThreat({ alert }: { alert: Alert }) {
  const geo = alert.geo
  return (
    <Card className="overflow-hidden border-critical/25 bg-gradient-to-br from-card to-card/40">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-critical">
            Priority threat
          </span>
        </div>
        <SeverityBadge severity={alert.severity} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{alert.title}</h2>
            <MitreChips mitre={alert.mitre} />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-muted-foreground">
          <ConfidenceBar confidence={alert.confidence} />
          <span>
            asset:<span className="text-foreground">{alert.asset}</span>
          </span>
          <span>
            {alert.count}req/{alert.blocked_count}blk
          </span>
          <span className="flex items-center gap-1.5">
            src<span className="text-sky-400">{alert.src_ip}</span>
          </span>
          {geo?.org ? (
            <span>
              <span className="text-zinc-500">AS{geo.asn}</span> {geo.org}
            </span>
          ) : null}
          {geo?.country_code ? (
            <span>
              {flag(geo.country_code)} geo:{geo.country_code}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <Button asChild size="sm" variant="default">
            <Link to={`/investigate/${alert.id}`}>Investigate</Link>
          </Button>
          <AssignButton alert={alert} />
        </div>
      </CardContent>
    </Card>
  )
}

function AssignButton({ alert }: { alert: Alert }) {
  const assign = useAssignAlert()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={assign.isPending}
      onClick={() => assign.mutate({ id: alert.id, assignee: "@me", actor: "hub" })}
    >
      <UserPlus className="size-3.5" /> Assign to me
    </Button>
  )
}

function QueueItem({
  alert,
  selected,
  onToggle,
}: {
  alert: Alert
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background/40 transition-colors",
        selected ? "border-sky-500/40 bg-sky-500/5" : "hover:border-border hover:bg-accent/60",
      )}
    >
      <Link to={`/investigate/${alert.id}`} className="block p-2.5 pb-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium">{alert.title}</span>
          <SeverityBadge severity={alert.severity} className="shrink-0" />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            <span className="font-mono text-sky-400">{alert.src_ip || alert.asset}</span>
            {alert.asset !== alert.src_ip ? ` · ${alert.asset}` : ""}
          </span>
          <span className="shrink-0 font-mono">{timeAgo(alert.last_seen_at)}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <StatusBadge status={alert.status} className="text-[9px]" />
          {alert.assignee ? (
            <span className="text-[10px] text-muted-foreground">@{alert.assignee.replace("@", "")}</span>
          ) : null}
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Select ${alert.title}`}
        onClick={onToggle}
        className={cn(
          "mx-2.5 mb-2 flex h-4 w-4 items-center justify-center rounded border transition-colors",
          selected ? "border-sky-500 bg-sky-500/30" : "border-border bg-background hover:border-sky-500/50",
        )}
      >
        {selected ? <Check className="size-2.5 text-sky-300" /> : null}
      </button>
    </div>
  )
}

function IncidentItem({ incident }: { incident: Incident }) {
  const firstAlert = incident.alert_ids[0]
  const breached = incident.sla.ttr_breached || incident.sla.ttm_breached
  return (
    <Link
      to={firstAlert ? `/investigate/${firstAlert}` : "/investigate"}
      className="block rounded-md border bg-background/40 p-2.5 transition-colors hover:border-border hover:bg-accent/60"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-sky-300">{incident.id}</span>
        <div className="flex items-center gap-1.5">
          {incident.contained ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-emerald-400">
              contained
            </span>
          ) : null}
          {breached ? (
            <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-rose-400">
              SLA
            </span>
          ) : null}
          <SeverityBadge severity={incident.severity} className="shrink-0 !text-[9px]" />
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">
          <span className="font-mono text-sky-400">{incident.src_ip || incident.asset || "—"}</span>
          {" · "}
          {incident.count} alert{incident.count === 1 ? "" : "s"}
        </span>
        <span className="shrink-0 font-mono">{incident.techniques.slice(0, 2).join(", ") || "n/a"}</span>
      </div>
      {breached ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[9px] text-muted-foreground">
          {incident.sla.ttr_breached ? <span className="text-rose-400">ttr breached</span> : null}
          {incident.sla.ttm_breached ? <span className="text-rose-400">ttm breached</span> : null}
        </div>
      ) : null}
    </Link>
  )
}

function TrafficChart({ data }: { data: { t: string; requests: number; errors: number; blocked: number }[] }) {
  const chart = useMemo(() => data.map((d) => ({ ...d, requests: d.requests, errors: d.errors, blocked: d.blocked })), [data])
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Traffic</CardTitle>
        <span className="text-[11px] text-muted-foreground">requests · errors · blocked · last 30m</span>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id="req" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ring)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--ring)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="err" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--critical)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--critical)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="requests" stroke="var(--ring)" strokeWidth={1.5} fill="url(#req)" name="requests" />
              <Area type="monotone" dataKey="errors" stroke="var(--critical)" strokeWidth={1.2} fill="url(#err)" name="errors" />
              <Area type="monotone" dataKey="blocked" stroke="var(--high)" strokeWidth={1.2} fill="none" name="blocked" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function RequestStream({ events }: { events: { id: string; timestamp: string; method: string; status: number; path: string; tags?: string[]; src_ip: string }[] }) {
  return (
    <div className="max-h-[340px] overflow-y-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-card/95 backdrop-blur">
          <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-medium">Time</th>
            <th className="px-2 py-2 font-medium">Verb</th>
            <th className="px-2 py-2 font-medium">Code</th>
            <th className="px-2 py-2 font-medium">Path</th>
            <th className="px-4 py-2 text-right font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                Waiting for traffic…
              </td>
            </tr>
          ) : (
            events.map((ev) => (
              <tr key={ev.id} className="border-b border-border/50 font-mono transition-colors hover:bg-accent/40">
                <td className="whitespace-nowrap px-4 py-1.5 text-muted-foreground">{clock(ev.timestamp)}</td>
                <td className={cn("px-2 py-1.5", methodColor(ev.method))}>{ev.method || "—"}</td>
                <td className={cn("px-2 py-1.5 font-semibold", statusTone(ev.status))}>{ev.status || "—"}</td>
                <td className="max-w-[420px] truncate px-2 py-1.5 text-zinc-300">{ev.path}</td>
                <td className={cn("px-4 py-1.5 text-right text-[10px]", streamNoteTone(ev.status, ev.tags))}>
                  {streamNote(ev)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function streamNote(ev: { tags?: string[]; status: number; path: string }): string {
  const tags = ev.tags ?? []
  if (tags.includes("waf_block")) return "waf:blocked"
  if (tags.includes("sqli")) return "sqli:detected"
  if (tags.includes("auth_failure")) return "auth:failed"
  if (tags.includes("webshell")) return "shell:probe"
  if (tags.includes("scan")) return "scan:tool"
  if (ev.status >= 500) return "upstream-error"
  if (ev.status === 403) return "denied"
  if (ev.status === 401) return "auth:required"
  if (ev.status === 404) return "soft-404"
  if (ev.status >= 200 && ev.status < 300) return "allowed"
  return "ok"
}

function streamNoteTone(status: number, tags?: string[]): string {
  if ((tags ?? []).some((t) => ["waf_block", "sqli", "webshell", "auth_failure"].includes(t))) return "text-amber-300"
  if (status >= 400) return "text-orange-300"
  return "text-emerald-400/80"
}
