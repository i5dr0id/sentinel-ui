import { useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { BookOpen, Check, ChevronRight, Clock, Play, ShieldCheck, ShieldOff, Zap } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { MitreChips, SeverityBadge } from "@/components/severity"
import { PageHeader } from "@/core/components/shell"
import { useAlertAction, useAlerts, useAssets, useContainment, useDeployContainment, useRevokeContainment } from "@/core/hooks/queries"
import { clock, timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ActionType, Alert, ContainmentType } from "@/core/api/types"

const RUNBOOKS = [
  {
    technique: "T1595.001",
    title: "Wordlist / directory scanning",
    tactic: "Reconnaissance",
    severity: "MEDIUM" as const,
    steps: [
      "Confirm bursts: 30+ unique paths from a single IP in <60s",
      "Block the source IP at the edge (WAF / nginx deny)",
      "Rate-limit same-source requests and 4xx flood",
      "Ignore if the IP belongs to a known scanner (ASN/ORG)",
    ],
    oneClick: "block_ip" as ActionType,
  },
  {
    technique: "T1046",
    title: "Port / service scanning",
    tactic: "Discovery",
    severity: "HIGH" as const,
    steps: [
      "Review probe pattern in host firewall + nginx logs",
      "Restrict exposed ports for the affected asset",
      "Confirm service versions are patched; rotate exposed keys",
    ],
    oneClick: "block_ip" as ActionType,
  },
  {
    technique: "T1110",
    title: "Brute-force / credential stuffing",
    tactic: "Credential Access",
    severity: "HIGH" as const,
    steps: [
      "Enumerate affected users from auth-svc logs",
      "Force password reset for the targeted accounts",
      "Enable MFA and rate-limit login endpoints",
      "Hunt for successful logins from the same source",
    ],
    oneClick: "block_ip" as ActionType,
  },
  {
    technique: "T1190",
    title: "Exploit of public-facing app (SQLi)",
    tactic: "Initial Access",
    severity: "CRITICAL" as const,
    steps: [
      "Check WAF for the original payload (encoded variants)",
      "Verify DB access — look for out-of-band/beacon traffic",
      "Restrict database user privileges immediately",
      "Review audit log for data-exfil from the target schema",
    ],
    oneClick: "mitigate" as ActionType,
  },
  {
    technique: "T1505.003",
    title: "Web shell",
    tactic: "Persistence",
    severity: "CRITICAL" as const,
    steps: [
      "Locate the dropped file; snapshot it for forensics",
      "Take the host out of the load-balancer rotation",
      "Scan sibling hosts for the same indicator",
      "Rotate all credentials reachable from the host",
    ],
    oneClick: "mitigate" as ActionType,
  },
]

const CONTROLS: { id: ContainmentType; name: string; desc: string; note: string }[] = [
  {
    id: "block_ip",
    name: "Block source IP",
    desc: "Drop all traffic from the attacking host at the edge firewall.",
    note: "deployed: block source IP",
  },
  {
    id: "rate_limit",
    name: "Rate limit",
    desc: "Throttle same-source requests to prevent resource exhaustion.",
    note: "deployed: rate limit",
  },
  {
    id: "waf_rule",
    name: "WAF rule",
    desc: "Activate the managed ruleset for the target host.",
    note: "deployed: WAF rule",
  },
]

export default function RespondPage() {
  const [params] = useSearchParams()
  const { data: alerts } = useAlerts({ limit: 50 })
  const { data: assets } = useAssets()

  const active = useMemo(() => (alerts?.items ?? []).filter((a) => a.status !== "RESOLVED"), [alerts])
  const top = active.slice(0, 5)

  const targets = useMemo(() => {
    const seen = new Set<string>()
    return active
      .filter((a) => a.src_ip && !seen.has(a.src_ip))
      .map((a) => {
        seen.add(a.src_ip)
        return a
      })
  }, [active])

  const fromParam = params.get("ip") ?? ""
  const [control, setControl] = useState<ContainmentType>("block_ip")
  const [target, setTarget] = useState<string>(fromParam)
  const [direction, setDirection] = useState<string>("Inbound")
  const [duration, setDuration] = useState<string>("24h")
  const [enforcement, setEnforcement] = useState<string>(assets?.[0] ? `Edge firewall (${assets[0]})` : "Edge firewall")

  const action = useAlertAction()
  const deploy = useDeployContainment()
  const revoke = useRevokeContainment()
  const { data: containment } = useContainment()
  const activeControls = (containment?.items ?? []).filter((c) => c.status === "ACTIVE")

  const targetAlert = useMemo(
    () => active.find((a) => a.src_ip === target),
    [active, target],
  )

  function run(alert: Alert, kind: ActionType, note: string) {
    action.mutate(
      { id: alert.id, action: kind, actor: "ops-console", note },
      {
        onSuccess: () =>
          toast.success(`${kind.replaceAll("_", " ")} → ${alert.title}`, {
            description: `Alert ${alert.id.slice(0, 8)}… updated`,
          }),
        onError: () => toast.error(`Action failed on ${alert.title}`),
      },
    )
  }

  function deployControl() {
    if (!target) {
      toast.error("Select a target IP first")
      return
    }
    const c = CONTROLS.find((x) => x.id === control)!
    deploy.mutate(
      {
        type: control,
        target_ip: target,
        direction,
        duration,
        enforcement,
        note: c.note,
        alert_ids: targetAlert ? [targetAlert.id] : [],
      },
      {
        onSuccess: (ctr) =>
          toast.success(`${c.name} → ${target}`, {
            description: `Control ${ctr.id} ACTIVE · ${direction} · ${duration} · ${enforcement}`,
          }),
        onError: (err) => toast.error(`Deploy failed: ${(err as Error).message ?? "unknown error"}`),
      },
    )
  }

  function revokeControl(id: string, label: string) {
    revoke.mutate(id, {
      onSuccess: () => toast.success(`Control revoked`, { description: label }),
      onError: (err) => toast.error(`Revoke failed: ${(err as Error).message ?? "unknown error"}`),
    })
  }

  function oneClickBlock(a: Alert) {
    deploy.mutate(
      { type: "block_ip", target_ip: a.src_ip!, duration: "24h", direction: "Inbound", note: "one-click block", alert_ids: [a.id] },
      { onError: (err) => toast.error(`Block failed: ${(err as Error).message ?? "unknown error"}`) },
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-10">
      <PageHeader
        title="Respond"
        description="Deploy edge controls and follow runbooks for the techniques we detect."
      />

      <div className="px-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-red-400" /> Response control
              <span className="font-mono text-[11px] font-normal text-muted-foreground">
                {activeControls.length > 0
                  ? `${activeControls.length} active · ${activeControls.map((c) => c.target_ip).join(", ")}`
                  : "nothing armed yet"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-3">
              {CONTROLS.map((c) => {
                const armed = activeControls.some((x) => x.type === c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => setControl(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      control === c.id
                        ? "border-red-500/40 bg-red-500/5"
                        : "border-border bg-background/40 hover:bg-accent/40",
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-wider">{c.name}</span>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest",
                            armed
                              ? "border-emerald-500/40 text-emerald-400"
                              : control === c.id
                                ? "border-red-500/40 text-red-400"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          {armed ? "ACTIVE" : "READY"}
                        </span>
                        {control === c.id ? (
                          <span className="ml-auto font-mono text-[10px] text-red-400">SELECTED</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                    {control === c.id ? <ChevronRight className="mt-1 size-4 shrink-0 text-red-400" /> : null}
                  </button>
                )
              })}
            </div>

            <div className="space-y-3 rounded-lg border bg-background/40 p-4 lg:col-span-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Target IP</div>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 font-mono text-xs outline-none"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">Select target ip…</option>
                  {targets.map((a) => (
                    <option key={a.src_ip} value={a.src_ip}>
                      {a.src_ip} · {a.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Direction</div>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs outline-none"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                  >
                    <option>Inbound</option>
                    <option>Outbound</option>
                    <option>Both</option>
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Duration</div>
                  <select
                    className="mt-1 h-9 w-full rounded-md border bg-background px-2 font-mono text-xs outline-none"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option>24h</option>
                    <option>48h</option>
                    <option>7d</option>
                    <option>30d</option>
                    <option>permanent</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Enforcement</div>
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs outline-none"
                  value={enforcement}
                  onChange={(e) => setEnforcement(e.target.value)}
                >
                  {assets && assets.length > 0 ? (
                    assets.map((a) => (
                      <option key={a} value={`Edge firewall (${a})`}>
                        Edge firewall ({a})
                      </option>
                    ))
                  ) : (
                    <option>Edge firewall</option>
                  )}
                </select>
              </div>
              <Button className="w-full gap-1.5" variant="destructive" onClick={deployControl} disabled={deploy.isPending}>
                <Zap className="size-3.5" /> Deploy control
              </Button>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Deploys the control into the edge engine, drops/throttles matching traffic immediately, and stamps the
                alert timeline for the target IP.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-6 pt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldOff className="size-4 text-emerald-400" /> Containment lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {containment && containment.items.length === 0 ? (
              <p className="px-4 pb-4 text-xs text-muted-foreground">No containment controls deployed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/90">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Control</th>
                      <th className="px-2 py-2 font-medium">Target</th>
                      <th className="px-2 py-2 font-medium">Enforcement</th>
                      <th className="px-2 py-2 font-medium">Duration</th>
                      <th className="px-2 py-2 font-medium">Deployed</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {containment?.items.map((c) => (
                      <tr key={c.id} className="border-t border-border/50 font-mono">
                        <td className="px-3 py-2 capitalize">{c.type.replaceAll("_", " ")}</td>
                        <td className="px-2 py-2 text-sky-400">{c.target_ip}</td>
                        <td className="px-2 py-2 text-muted-foreground">{c.enforcement}</td>
                        <td className="px-2 py-2 text-muted-foreground">{c.duration}</td>
                        <td className="px-2 py-2 text-muted-foreground" title={clock(c.deployed_at)}>
                          {timeAgo(c.deployed_at)}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest",
                              c.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : c.status === "EXPIRED"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-background text-muted-foreground",
                            )}
                          >
                            {c.status}
                          </span>
                          {c.expires_at ? (
                            <span className="ml-1.5 text-[9px] text-muted-foreground">
                              <Clock className="mr-0.5 inline size-2.5" />
                              {timeAgo(c.expires_at)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {c.status === "ACTIVE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() => revokeControl(c.id, `${c.type} on ${c.target_ip}`)}
                              disabled={revoke.isPending}
                            >
                              <ShieldOff className="size-3" /> Revoke
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-6 pt-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Runbooks</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {RUNBOOKS.map((r) => (
              <Card key={r.technique} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{r.title}</span>
                    <span className="font-mono text-[11px] text-sky-300">{r.technique}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={r.severity} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.tactic}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ol className="flex-1 space-y-2">
                    {r.steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px] text-foreground">
                          {i + 1}
                        </span>
                        <span className="text-foreground/80">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3">
                    {top.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Apply to</span>
                        <select
                          className="h-8 flex-1 rounded-md border bg-background px-2 font-mono text-[11px] outline-none"
                          onChange={(e) => {
                            const alert = top.find((a) => a.id === e.target.value)
                            if (alert) run(alert, r.oneClick, `runbook: ${r.technique}`)
                          }}
                          defaultValue=""
                        >
                          <option value="">Choose alert…</option>
                          {top.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title.slice(0, 44)} · {a.asset}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" asChild>
                          <span>
                            <Play className="size-3.5" /> Run
                          </span>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No active threats to apply this to.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-amber-400" /> One-click response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {top.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active threats right now.</p>
              ) : (
                top.map((a) => (
                  <div key={a.id} className="rounded-md border bg-background/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium">{a.title}</span>
                          <MitreChips mitre={a.mitre} />
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {a.src_ip || a.asset} · {a.asset}
                        </div>
                      </div>
                      <SeverityBadge severity={a.severity} className="shrink-0" />
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => oneClickBlock(a)}
                        disabled={!a.src_ip || deploy.isPending}
                      >
                        <ShieldCheck className="size-3.5" /> Block IP
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => run(a, "acknowledge", "one-click ack")}>
                        <Check className="size-3.5" /> Ack
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SOP</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">
              <p>
                Confirm before <span className="text-foreground">blocking IPs</span> on shared egress proxies. Every
                action is written to the alert timeline and attributed to the actor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
