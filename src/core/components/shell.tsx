import { createContext, useContext, useState } from "react"
import { NavLink, Outlet } from "react-router"
import {
  Activity,
  AlarmClock,
  Crosshair,
  LayoutDashboard,
  Radio,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  Swords,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAssets, useSummary } from "@/core/hooks/queries"

interface AssetCtx {
  asset: string
  setAsset: (a: string) => void
}

const AssetContext = createContext<AssetCtx>({ asset: "", setAsset: () => undefined })

export function useAsset() {
  return useContext(AssetContext)
}

const NAV = [
  { to: "/", label: "Security Hub", icon: LayoutDashboard, end: true },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/investigate", label: "Investigate", icon: Swords },
  { to: "/respond", label: "Respond", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function Shell() {
  const [asset, setAsset] = useState("")
  const { data: assets } = useAssets()
  const { data: summary } = useSummary()

  return (
    <AssetContext.Provider value={{ asset, setAsset }}>
      <div className="flex h-full min-h-0">
        <Sidebar asset={asset} setAsset={setAsset} assets={assets ?? []} summary={summary} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AssetContext.Provider>
  )
}

function Sidebar({
  asset,
  setAsset,
  assets,
  summary,
}: {
  asset: string
  setAsset: (a: string) => void
  assets: string[]
  summary?: ReturnType<typeof useSummary>["data"]
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card/40">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Crosshair className="size-4.5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-none tracking-wide">SENTINEL</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">security hub</div>
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-foreground",
                isActive && "bg-accent text-foreground",
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-4 px-5 py-5">
        <div className="rounded-lg border bg-background/60 p-3">
          <div className="flex items-center gap-2">
            <span className="live-dot size-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Live monitoring
            </span>
          </div>
          <div className="mt-3">
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger className="h-8 font-mono text-xs" aria-label="Asset">
                <SelectValue placeholder="All assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All assets</SelectItem>
                {assets.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5" /> {summary?.events_per_sec.toFixed(1) ?? "—"} ev/s
            </span>
            <span className="font-mono">{summary?.counts.total_active ?? "—"} alerts</span>
          </div>
        </div>
        <div className="text-[10px] leading-relaxed text-muted-foreground/70">
          sentinel-ui · talks to sentinel-api /api/v1
        </div>
      </div>
    </aside>
  )
}

function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card/40 px-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          ops
        </span>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground">Security Hub</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex h-9 w-64 items-center gap-2 rounded-md border bg-background/60 px-3 text-muted-foreground">
          <Search className="size-3.5" />
          <input
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            placeholder="Search alerts, IPs, techniques…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                toast.info("Searching", { description: `Query: ${e.currentTarget.value}` })
              }
            }}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info("Alerts are loaded live", { description: "Auto-refresh is enabled." })}
        >
          <AlarmClock className="size-3.5" /> Now
        </Button>
        <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold">
          SO
        </div>
      </div>
    </header>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({ icon: Icon = ScrollText, title, hint }: { icon?: typeof ScrollText; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon className="size-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {hint ? <p className="text-xs text-muted-foreground/60">{hint}</p> : null}
    </div>
  )
}
