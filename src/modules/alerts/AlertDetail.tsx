import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, Check, ShieldOff, ShieldX, Timer, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { MitreChips, SeverityBadge, StatusBadge } from "@/components/severity"
import { useAlertAction, useAlertEvents, useAssignAlert, useSetAlertStatus } from "@/core/hooks/queries"
import { clock, flag, fmtDuration, methodColor, statusTone } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActionType, Alert, NormalizedEvent } from "@/core/api/types"

export function AlertDetail({ alert }: { alert: Alert }) {
  const geo = alert.geo
  const { data: events } = useAlertEvents(alert.id)
  const [note, setNote] = useState("")
  const navigate = useNavigate()

  const list = useMemo(() => events?.items ?? [], [events])
  const requestLog = useMemo(() => list.slice(0, 6), [list])
  const counts4 = useMemo(
    () => list.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {} as Record<number, number>),
    [list],
  )
  const tool = useMemo(() => toolFromUA(topUA(list)), [list])
  const windowMs = Math.max(0, new Date(alert.last_seen_at).getTime() - new Date(alert.started_at).getTime())
  const rate = windowMs > 0 ? Math.round((alert.count / windowMs) * 1000) : alert.count

  const assign = useAssignAlert()
  const status = useSetAlertStatus()
  const action = useAlertAction()

  const run = (a: ActionType, n?: string) =>
    action.mutate(
      { id: alert.id, action: a, note: n ?? note },
      { onSuccess: () => toast.success(`Action applied: ${a}`, { description: alert.title }) },
    )

  const busy = assign.isPending || status.isPending || action.isPending

  const proceed = () => {
    if (alert.src_ip) {
      navigate(`/respond?ip=${encodeURIComponent(alert.src_ip)}`)
    } else {
      navigate("/respond")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <StatusBadge status={alert.status} />
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            Case {caseId(alert.id)} · {alert.id}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{alert.title}</h2>
          <MitreChips mitre={alert.mitre} />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{alert.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Src</div>
            <div className="mt-0.5 font-mono text-sm text-sky-400">{alert.src_ip || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Host</div>
            <div className="mt-0.5 font-mono text-sm text-foreground">{alert.asset}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Case</div>
            <div className="mt-0.5 font-mono text-sm text-foreground">{caseId(alert.id)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border/60">
          {(
            [
              ["Requests", `${alert.count} / ${alert.unique_paths} uniq`],
              ["Window", fmtDuration(windowMs)],
              ["403/404", `${counts4[403] ?? 0}/${counts4[404] ?? 0}`],
              ["Tool", tool],
              ["Rate", `${rate} req/s`],
              ["Confidence", alert.confidence.toFixed(2)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="bg-card/70 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
              <div className="mt-0.5 font-mono text-xs text-foreground">{v}</div>
            </div>
          ))}
        </div>

        {geo?.org ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-background/50 p-3 font-mono text-[11px] text-muted-foreground">
            <span>
              AS{geo.asn} {geo.org}
            </span>
            {geo.country_code ? (
              <span>
                {flag(geo.country_code)} {geo.country_name}
                {geo.city ? ` · ${geo.city}` : ""}
              </span>
            ) : null}
            {alert.assignee ? <span>assignee: <span className="text-foreground">{alert.assignee}</span></span> : null}
          </div>
        ) : null}
      </div>

      <div className="border-y bg-muted/40 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={proceed}>
            Proceed to Respond <ArrowRight className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !!alert.assignee}
            onClick={() => assign.mutate({ id: alert.id, assignee: "@me", actor: "console" })}
          >
            <UserPlus className="size-3.5" /> Assign to me
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || alert.status === "IN_PROGRESS"}
            onClick={() => status.mutate({ id: alert.id, status: "IN_PROGRESS" })}
          >
            <Timer className="size-3.5" /> Start triage
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run("acknowledge")}>
            <Check className="size-3.5" /> Ack
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" disabled={busy} onClick={() => run("block_ip", "blocked source at edge")}>
            <ShieldX className="size-3.5" /> Block IP
          </Button>
          <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400" disabled={busy} onClick={() => run("mitigate")}>
            <ShieldOff className="size-3.5" /> Mitigate
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => run("false_positive")}>
            False positive
          </Button>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note to the action…"
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" disabled={busy || !note.trim()} onClick={() => run("comment", note.trim())}>
            Note
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <Section title={`Request log · most recent first · ${requestLog.length} of ${alert.count}`}>
          {requestLog.length > 0 ? (
            <RequestLogTable events={requestLog} />
          ) : (
            <p className="text-xs text-muted-foreground">No related events retained in the ring buffer.</p>
          )}
        </Section>

        <Section title="Action log">
          {alert.actions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No actions taken yet.</p>
          ) : (
            <div className="space-y-2">
              {alert.actions
                .slice()
                .reverse()
                .map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-md border bg-background/40 px-3 py-2 text-xs">
                    <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-ring/60" />
                    <div className="min-w-0">
                      <div className="font-medium">
                        {a.action} <span className="text-muted-foreground">by {a.actor}</span>
                      </div>
                      {a.note ? <div className="mt-0.5 text-muted-foreground">{a.note}</div> : null}
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                      {clock(a.at)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
      <Separator className="mt-5" />
    </div>
  )
}

function RequestLogTable({ events }: { events: NormalizedEvent[] }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-muted/90">
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-2 py-2 font-medium">Verb</th>
            <th className="px-2 py-2 font-medium">Code</th>
            <th className="px-2 py-2 font-medium">Path</th>
            <th className="px-3 py-2 text-right font-medium">Size</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-border/50 font-mono">
              <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{clock(e.timestamp)}</td>
              <td className={cn("px-2 py-1.5", methodColor(e.method))}>{e.method || "—"}</td>
              <td className={cn("px-2 py-1.5", statusTone(e.status))}>{e.status || "—"}</td>
              <td className="max-w-[280px] truncate px-2 py-1.5">{e.path}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right text-muted-foreground">
                {e.size ? `${e.size}b` : "—"}
                {eventNote(e) ? <span className="text-muted-foreground/60"> · {eventNote(e)}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function topUA(events: NormalizedEvent[]): string {
  const counts = new Map<string, number>()
  for (const e of events) {
    if (!e.user_agent) continue
    counts.set(e.user_agent, (counts.get(e.user_agent) ?? 0) + 1)
  }
  let best = ""
  let n = 0
  for (const [ua, c] of counts) {
    if (c > n) {
      best = ua
      n = c
    }
  }
  return best
}

function toolFromUA(ua: string): string {
  if (!ua) return "—"
  const compat = ua.match(/\(compatible;\s*([^)]+)\)/i)
  if (compat) return compat[1].trim()
  const named = ua.match(/\b(DirBuster|GoBuster|Nikto|zgrab|sqlmap|curl|Nmap)[^;)\s]*/i)
  if (named) return named[1]
  return ua.split(" ")[0] || "—"
}

function caseId(id: string): string {
  const m = id.match(/[0-9a-f]{4}$/i)
  return `INC-${m ? m[0].toUpperCase() : id.slice(-4)}`
}

function eventNote(e: NormalizedEvent): string {
  if (e.tags?.includes("waf_block") || e.status === 403) return "restricted"
  if (e.status === 200) return "allowed"
  if (e.status === 404) {
    if (/\.(env|git|log|json|bak|zip)$/i.test(e.path) || /backup|phpmyadmin|config/i.test(e.path)) return "probe"
    return "soft-404"
  }
  if (e.status >= 500) return "upstream-error"
  return ""
}
