export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type Status = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED"

export type Source = "cloudflare" | "api_gateway" | "nginx" | "app" | "ssh" | "audit"

export interface Geo {
  country_code?: string
  country_name?: string
  city?: string
  asn?: string
  org?: string
  isp?: string
}

export interface NormalizedEvent {
  id: string
  timestamp: string
  source: Source
  asset: string
  src_ip: string
  src_port: number
  method: string
  path: string
  status: number
  size?: number
  proto: string
  user_agent: string
  referer: string
  user?: string
  message?: string
  tags?: string[]
  geo?: Geo
  extra?: Record<string, string>
}

export type ActionType =
  | "assign"
  | "unassign"
  | "start"
  | "acknowledge"
  | "respond"
  | "investigate"
  | "block_ip"
  | "whitelist"
  | "resolve"
  | "mitigate"
  | "false_positive"
  | "comment"

export type Resolution = "mitigated" | "false_positive" | "benign" | "no_action"

export interface ActionLog {
  at: string
  actor: string
  action: ActionType
  note?: string
  from_state?: string
  to_state?: string
}

export interface Alert {
  id: string
  rule_id: string
  rule_key: string
  title: string
  severity: Severity
  status: Status
  confidence: number
  mitre: string[]
  description: string
  asset: string
  src_ip: string
  geo?: Geo
  count: number
  blocked_count: number
  unique_paths: number
  distinct_assets: number
  event_ids: string[]
  started_at: string
  last_seen_at: string
  assignee?: string
  assigned_at?: string
  status_changed_at?: string
  responded_at?: string
  resolved_at?: string
  resolution?: Resolution
  actions: ActionLog[]
  extra?: Record<string, unknown>
  created_at: string
}

export interface Counts {
  total_active: number
  open: number
  assigned: number
  in_progress: number
  resolved: number
  unassigned: number
  by_severity: Record<Severity, number>
  critical: number
  high: number
  medium: number
  low: number
}

export interface AssetStatus {
  name: string
  alerts: number
}

export interface AlertTimelinePoint {
  t: string
  total: number
  critical: number
}

export interface Summary {
  assets: AssetStatus[]
  counts: Counts
  mttr_minutes: number
  mttr_sample: number
  active_threats: number
  live: boolean
  events_total: number
  events_per_sec: number
  alert_timeline: AlertTimelinePoint[]
  containment: ContainmentSummary
  started_at: string
}

export interface MetricPoint {
  t: string
  requests: number
  errors: number
  blocked: number
}

export interface Metrics {
  window_minutes: number
  series: MetricPoint[]
}

export type ContainmentType = "block_ip" | "rate_limit" | "waf_rule"
export type ContainmentStatus = "ACTIVE" | "REVOKED" | "EXPIRED"

export interface Containment {
  id: string
  type: ContainmentType
  target_ip: string
  direction: string
  duration: string
  enforcement: string
  status: ContainmentStatus
  alert_ids: string[]
  note?: string
  deployed_at: string
  expires_at?: string
  revoked_at?: string
}

export type ChainPhaseName =
  | "reconnaissance"
  | "initial_access"
  | "execution"
  | "persistence"
  | "defense_evasion"
  | "credential_access"
  | "discovery"
  | "lateral_movement"
  | "collection"
  | "command_and_control"
  | "exfiltration"
  | "impact"

export interface ChainPhase {
  phase: ChainPhaseName
  label: string
  covered: boolean
  count: number
  blocked_count: number
  severity: Severity
  first_seen: string
  last_seen: string
}

export interface Chain {
  src_ip?: string
  asset?: string
  total_alerts: number
  max_severity: Severity
  reached_phase: ChainPhaseName
  started_at: string
  last_seen_at: string
  phases: ChainPhase[]
}

export interface IOC {
  type: "ipv4" | "user_agent" | "path" | "asn"
  value: string
  count: number
  confidence: number
  tags?: string[]
}

export interface SLAMetrics {
  ttr_target: string
  ttm_target: string
  ttr_deadline: string
  ttm_deadline: string
  ttr_assigned: boolean
  ttr_breached: boolean
  ttm_breached: boolean
  contained: boolean
}

export interface Incident {
  id: string
  src_ip?: string
  asset?: string
  severity: Severity
  status: Status
  alert_ids: string[]
  count: number
  assets: string[]
  techniques: string[]
  chain: Chain
  first_seen: string
  last_seen: string
  sla: SLAMetrics
  contained: boolean
}

export interface ContainmentSummary {
  active: number
  blocked: number
  by_reason: Record<string, number>
}

export interface ListResponse<T> {
  items: T[]
  count: number
}
