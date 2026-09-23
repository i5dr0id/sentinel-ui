import { formatDistanceToNowStrict, format } from "date-fns"

import type { Severity, Status } from "@/core/api/types"

export function timeAgo(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
}

export function clock(iso: string): string {
  return format(new Date(iso), "HH:mm:ss")
}

export function clockMin(iso: string): string {
  return format(new Date(iso), "HH:mm")
}

export function mttrLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—"
  if (minutes < 1) return `${Math.round(minutes * 60)}s`
  if (minutes < 60) return `${Math.round(minutes)}m`
  return `${(minutes / 60).toFixed(1)}h`
}

export const severityMeta: Record<Severity, { label: string; className: string; dot: string }> = {
  CRITICAL: {
    label: "CRITICAL",
    className: "bg-critical/15 text-critical border-critical/30",
    dot: "bg-critical",
  },
  HIGH: { label: "HIGH", className: "bg-high/15 text-high border-high/30", dot: "bg-high" },
  MEDIUM: {
    label: "MEDIUM",
    className: "bg-medium/15 text-medium border-medium/30",
    dot: "bg-medium",
  },
  LOW: { label: "LOW", className: "bg-low/15 text-low border-low/30", dot: "bg-low" },
}

export const statusMeta: Record<Status, { label: string; className: string }> = {
  OPEN: { label: "UNASSIGNED", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  ASSIGNED: { label: "ASSIGNED", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  RESOLVED: { label: "RESOLVED", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
}

export function statusColor(status: Status): string {
  return statusMeta[status]?.className ?? statusMeta.OPEN.className
}

export function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-sky-400"
    case "POST":
      return "text-amber-400"
    case "PUT":
    case "PATCH":
      return "text-violet-400"
    case "DELETE":
      return "text-red-400"
    default:
      return "text-zinc-400"
  }
}

export function statusTone(status: number): string {
  if (status >= 500) return "text-red-400"
  if (status === 403 || status === 401) return "text-amber-400"
  if (status >= 400) return "text-orange-300"
  return "text-emerald-400"
}

export function flag(country?: string): string {
  if (!country || country.length !== 2) return "🌐"
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

export function shortIp(ip?: string): string {
  return ip ?? "—"
}

export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const s = Math.floor(ms / 1000)
  const hh = String(Math.floor(s / 3600)).padStart(2, "0")
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}
