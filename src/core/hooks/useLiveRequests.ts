import { useEffect, useRef, useState } from "react"

import { subscribeRequests } from "@/core/api/client"
import type { NormalizedEvent } from "@/core/api/types"

const MAX_BUFFER = 250

export function useLiveRequests(asset?: string) {
  const [events, setEvents] = useState<NormalizedEvent[]>([])
  const [connected, setConnected] = useState(false)
  const bufferRef = useRef<NormalizedEvent[]>([])

  useEffect(() => {
    const close = subscribeRequests(asset, (ev) => {
      bufferRef.current = [ev, ...bufferRef.current].slice(0, MAX_BUFFER)
      setEvents(bufferRef.current)
      setConnected(true)
    })
    return close
  }, [asset])

  return { events, connected }
}
