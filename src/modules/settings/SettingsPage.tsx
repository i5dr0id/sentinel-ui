import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  CloudCog,
  Database,
  Globe,
  HardDrive,
  KeyRound,
  ServerCog,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/core/components/shell"
import { cn } from "@/lib/utils"

type ConnectorId = "cloudflare" | "nginx" | "api_gateway" | "app" | "ssh"

const CONNECTORS: {
  id: ConnectorId
  name: string
  icon: LucideIcon
  desc: string
  badge: string
}[] = [
  { id: "cloudflare", name: "Cloudflare WAF", icon: CloudCog, desc: "Blocked / challenged requests, bot scores.", badge: "edge" },
  { id: "nginx", name: "Web server (nginx)", icon: Globe, desc: "Access logs, status codes, user agents.", badge: "edge" },
  { id: "api_gateway", name: "API gateway", icon: ServerCog, desc: "Versioned routes, auth failures, rate limits.", badge: "edge" },
  { id: "app", name: "Application logs", icon: Activity, desc: "SQL errors, framework traces, exceptions.", badge: "app" },
  { id: "ssh", name: "Host / SSH auth", icon: KeyRound, desc: "Failed logins, su/sudo activity, SSH handshakes.", badge: "host" },
]

const RULES = [
  { id: "dir-enum", name: "Directory enumeration", severity: "MEDIUM", mitre: "T1595.001 / T1083" },
  { id: "port-scan", name: "Port / service scanning", severity: "HIGH", mitre: "T1046" },
  { id: "sqli", name: "SQL injection (SQLi)", severity: "CRITICAL", mitre: "T1190" },
  { id: "auth-brute", name: "Credential brute force", severity: "HIGH", mitre: "T1110" },
  { id: "waf-block-spike", name: "WAF block spike", severity: "MEDIUM", mitre: "T1190" },
  { id: "db-anomaly", name: "Database anomaly", severity: "CRITICAL", mitre: "T1190" },
  { id: "webshell", name: "Web shell upload", severity: "CRITICAL", mitre: "T1505.003" },
]

const DEFAULT_CONNECTORS: Record<ConnectorId, boolean> = {
  cloudflare: true,
  nginx: true,
  api_gateway: true,
  app: true,
  ssh: true,
}

const DEFAULT_RULES = RULES.reduce<Record<string, boolean>>((acc, r) => {
  acc[r.id] = true
  return acc
}, {})

function useLocalFlag<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-emerald-500/80" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: LucideIcon
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{desc}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [connectors, setConnectors] = useLocalFlag<Record<ConnectorId, boolean>>(
    "sentinel.connectors",
    DEFAULT_CONNECTORS,
  )
  const [rules, setRules] = useLocalFlag<Record<string, boolean>>("sentinel.rules", DEFAULT_RULES)
  const [refresh, setRefresh] = useLocalFlag<number>("sentinel.refresh", 5)

  return (
    <div className="mx-auto max-w-3xl px-6 pb-10">
      <PageHeader
        title="Settings"
        description="Connector sources, detection rules and dashboard preferences. Stored locally for now."
      />

      <div className="space-y-4 px-6">
        <Section icon={HardDrive} title="Data connectors" desc="Which log sources feed the detection pipeline.">
          <div className="divide-y divide-border/50">
            {CONNECTORS.map((c) => {
              const enabled = connectors[c.id]
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <c.icon className="size-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.desc}</div>
                    </div>
                    <span
                      className={cn(
                        "ml-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        enabled ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground",
                      )}
                    >
                      {c.badge}
                    </span>
                  </div>
                  <Toggle
                    on={enabled}
                    onClick={() => setConnectors((s) => ({ ...s, [c.id]: !s[c.id] }))}
                  />
                </div>
              )
            })}
          </div>
        </Section>

        <Section icon={Database} title="Detection rules" desc="Toggle individual MITRE-mapped rules.">
          <div className="divide-y divide-border/50">
            {RULES.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm">
                    {r.name}{" "}
                    <span
                      className={cn(
                        "ml-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        r.severity === "CRITICAL"
                          ? "bg-critical/10 text-red-400"
                          : r.severity === "HIGH"
                            ? "bg-high/10 text-amber-400"
                            : "bg-medium/10 text-yellow-300",
                      )}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">{r.mitre}</div>
                </div>
                <Toggle on={rules[r.id]} onClick={() => setRules((s) => ({ ...s, [r.id]: !s[r.id] }))} />
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Activity} title="Dashboard" desc="Polling interval used by the live views.">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm">Live refresh interval</span>
            <select
              className="h-9 rounded-md border bg-background px-2 font-mono text-xs outline-none"
              value={refresh}
              onChange={(e) => setRefresh(Number(e.target.value))}
            >
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </div>
        </Section>
      </div>
    </div>
  )
}
