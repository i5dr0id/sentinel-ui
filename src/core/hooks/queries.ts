import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  alertAction,
  assignAlert,
  assignIncident,
  containIncident,
  deployContainment,
  getAlert,
  getAlertChain,
  getAlertEvents,
  getAlertIOCs,
  getAlerts,
  getAssets,
  getContainment,
  getIncident,
  getIncidents,
  getMetrics,
  getRequests,
  getSummary,
  revokeContainment,
  setAlertStatus,
  type AlertFilters,
  type ContainIncidentPayload,
} from "@/core/api/client"
import type { ActionType, Status } from "@/core/api/types"

export const summaryKey = ["summary"] as const

export function useSummary() {
  return useQuery({ queryKey: summaryKey, queryFn: getSummary, refetchInterval: 5_000 })
}

export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: getAssets, staleTime: 60_000 })
}

export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => getAlerts(filters),
    refetchInterval: 10_000,
  })
}

export function useAlert(id: string | undefined) {
  return useQuery({
    queryKey: ["alert", id],
    queryFn: () => getAlert(id!),
    enabled: Boolean(id),
    refetchInterval: 10_000,
  })
}

export function useAlertEvents(id: string | undefined) {
  return useQuery({
    queryKey: ["alert-events", id],
    queryFn: () => getAlertEvents(id!),
    enabled: Boolean(id),
    refetchInterval: 10_000,
  })
}

export function useRequests(asset?: string, limit = 50) {
  return useQuery({
    queryKey: ["requests", asset],
    queryFn: () => getRequests(asset, limit),
    refetchInterval: 10_000,
  })
}

export function useMetrics(asset?: string, window = 30) {
  return useQuery({
    queryKey: ["metrics", asset, window],
    queryFn: () => getMetrics(asset, window),
    refetchInterval: 15_000,
  })
}

function useInvalidateAlerts() {
  const qc = useQueryClient()
  return (alertId?: string) => {
    qc.invalidateQueries({ queryKey: summaryKey })
    qc.invalidateQueries({ queryKey: ["alerts"] })
    if (alertId) {
      qc.invalidateQueries({ queryKey: ["alert", alertId] })
      qc.invalidateQueries({ queryKey: ["alert-events", alertId] })
    }
  }
}

export function useAssignAlert() {
  const invalidate = useInvalidateAlerts()
  return useMutation({
    mutationFn: ({ id, assignee, actor }: { id: string; assignee: string; actor?: string }) =>
      assignAlert(id, assignee, actor),
    onSuccess: (a) => invalidate(a.id),
  })
}

export function useSetAlertStatus() {
  const invalidate = useInvalidateAlerts()
  return useMutation({
    mutationFn: ({ id, status, actor }: { id: string; status: Status; actor?: string }) =>
      setAlertStatus(id, status, actor),
    onSuccess: (a) => invalidate(a.id),
  })
}

export function useAlertAction() {
  const invalidate = useInvalidateAlerts()
  return useMutation({
    mutationFn: ({
      id,
      action,
      note,
      actor,
    }: {
      id: string
      action: ActionType
      note?: string
      actor?: string
    }) => alertAction(id, action, note, actor),
    onSuccess: (a) => invalidate(a.id),
  })
}

export function useAlertChain(id: string | undefined) {
  return useQuery({
    queryKey: ["chain", id],
    queryFn: () => getAlertChain(id!),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  })
}

export function useAlertIOCs(id: string | undefined) {
  return useQuery({
    queryKey: ["iocs", id],
    queryFn: () => getAlertIOCs(id!),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  })
}

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: getIncidents,
    refetchInterval: 10_000,
  })
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id!),
    enabled: Boolean(id),
    refetchInterval: 10_000,
  })
}

export function useContainment(targetIp?: string) {
  return useQuery({
    queryKey: ["containment", targetIp],
    queryFn: () => getContainment(targetIp),
    refetchInterval: 10_000,
  })
}

function useInvalidateIncidents() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["incidents"] })
    qc.invalidateQueries({ queryKey: ["containment"] })
    qc.invalidateQueries({ queryKey: summaryKey })
    qc.invalidateQueries({ queryKey: ["alerts"] })
  }
}

export function useAssignIncident() {
  const invalidate = useInvalidateIncidents()
  return useMutation({
    mutationFn: ({ id, assignee }: { id: string; assignee: string }) => assignIncident(id, assignee),
    onSuccess: () => invalidate(),
  })
}

export function useContainIncident() {
  const invalidate = useInvalidateIncidents()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ContainIncidentPayload }) =>
      containIncident(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useDeployContainment() {
  const invalidate = useInvalidateIncidents()
  return useMutation({
    mutationFn: (payload: ContainIncidentPayload & { target_ip: string; alert_ids?: string[] }) =>
      deployContainment(payload),
    onSuccess: () => invalidate(),
  })
}

export function useRevokeContainment() {
  const invalidate = useInvalidateIncidents()
  return useMutation({
    mutationFn: (id: string) => revokeContainment(id),
    onSuccess: () => invalidate(),
  })
}
