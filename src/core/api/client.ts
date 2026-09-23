import axios from "axios"

import type {
  ActionType,
  Alert,
  Chain,
  Containment,
  ContainmentType,
  Incident,
  IOC,
  ListResponse,
  Metrics,
  NormalizedEvent,
  Status,
  Summary,
} from "@/core/api/types"

export const API_BASE = import.meta.env.VITE_SENTINEL_API_BASE ?? ""

export const client = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15_000,
})

export interface AlertFilters {
  status?: Status | ""
  severity?: string | ""
  asset?: string | ""
  assignee?: string | ""
  rule?: string | ""
  q?: string
  limit?: number
}

export async function getSummary(): Promise<Summary> {
  const { data } = await client.get<Summary>("/summary")
  return data
}

export async function getAssets(): Promise<string[]> {
  const { data } = await client.get<string[]>("/assets")
  return data
}

export async function getAlerts(filters: AlertFilters = {}): Promise<ListResponse<Alert>> {
  const { data } = await client.get<ListResponse<Alert>>("/alerts", {
    params: { ...filters, limit: filters.limit ?? 50 },
  })
  return data
}

export async function getAlert(id: string): Promise<Alert> {
  const { data } = await client.get<Alert>(`/alerts/${id}`)
  return data
}

export async function getAlertEvents(id: string): Promise<ListResponse<NormalizedEvent>> {
  const { data } = await client.get<ListResponse<NormalizedEvent>>(`/alerts/${id}/events`)
  return data
}

export async function getAlertChain(id: string): Promise<Chain> {
  const { data } = await client.get<Chain>(`/alerts/${id}/chain`)
  return data
}

export async function getAlertIOCs(id: string): Promise<ListResponse<IOC>> {
  const { data } = await client.get<ListResponse<IOC>>(`/alerts/${id}/iocs`)
  return data
}

export async function getIncidents(): Promise<ListResponse<Incident>> {
  const { data } = await client.get<ListResponse<Incident>>("/incidents")
  return data
}

export async function getIncident(id: string): Promise<Incident> {
  const { data } = await client.get<Incident>(`/incidents/${id}`)
  return data
}

export async function assignIncident(id: string, assignee: string): Promise<Incident> {
  const { data } = await client.post<Incident>(`/incidents/${id}/assign`, { assignee })
  return data
}

export interface ContainIncidentPayload {
  type: ContainmentType
  direction?: string
  duration: string
  enforcement?: string
  note?: string
}

export async function containIncident(id: string, payload: ContainIncidentPayload): Promise<Incident> {
  const { data } = await client.post<Incident>(`/incidents/${id}/contain`, payload)
  return data
}

export async function getContainment(targetIp?: string): Promise<ListResponse<Containment>> {
  const { data } = await client.get<ListResponse<Containment>>("/containment", {
    params: targetIp ? { target_ip: targetIp } : undefined,
  })
  return data
}

export async function deployContainment(
  payload: ContainIncidentPayload & { target_ip: string; alert_ids?: string[] },
): Promise<Containment> {
  const { data } = await client.post<Containment>("/containment", payload)
  return data
}

export async function revokeContainment(id: string): Promise<Containment> {
  const { data } = await client.post<Containment>(`/containment/${id}/revoke`)
  return data
}

export async function getRequests(asset?: string, limit = 50): Promise<ListResponse<NormalizedEvent>> {
  const { data } = await client.get<ListResponse<NormalizedEvent>>("/requests", {
    params: { asset, limit },
  })
  return data
}

export async function getMetrics(asset?: string, window = 30): Promise<Metrics> {
  const { data } = await client.get<Metrics>("/metrics", { params: { asset, window } })
  return data
}

export async function assignAlert(id: string, assignee: string, actor = "console"): Promise<Alert> {
  const { data } = await client.patch<Alert>(`/alerts/${id}/assign`, { assignee, actor })
  return data
}

export async function setAlertStatus(id: string, status: Status, actor = "console"): Promise<Alert> {
  const { data } = await client.patch<Alert>(`/alerts/${id}/status`, { status, actor })
  return data
}

export async function alertAction(
  id: string,
  action: ActionType,
  note = "",
  actor = "console",
): Promise<Alert> {
  const { data } = await client.post<Alert>(`/alerts/${id}/actions`, { action, note, actor })
  return data
}

function parseEvent(data: string): NormalizedEvent | null {
  try {
    return JSON.parse(data) as NormalizedEvent
  } catch {
    return null
  }
}

export function subscribeRequests(asset: string | undefined, onEvent: (e: NormalizedEvent) => void): () => void {
  const url = `${API_BASE}/api/v1/requests/stream${asset ? `?asset=${encodeURIComponent(asset)}` : ""}`
  const es = new EventSource(url)
  es.addEventListener("request", (ev) => {
    const parsed = parseEvent((ev as MessageEvent).data)
    if (parsed) onEvent(parsed)
  })
  return () => es.close()
}
