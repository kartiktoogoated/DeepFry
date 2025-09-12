/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface HistoryLog {
  latency: number
  timestamp: string
  status: 'UP' | 'DOWN'
  url: string
  validatorId?: number
}

interface MinuteBucket {
  formattedTime: string
  latency: number | null
  isDown: boolean
}

const historyCache: Record<number, HistoryLog[]> = {}
const historyCacheTime: Record<number, number> = {}

function formatLabel(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload as MinuteBucket
  if (entry.isDown) {
    return (
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm font-semibold text-red-500">Down</p>
        </CardContent>
      </Card>
    )
  }
  const ms = entry.latency!
  let quality = 'Poor'
  let color = 'text-red-500'
  if (ms < 60) {
    quality = 'Excellent'
    color = 'text-green-500'
  } else if (ms < 100) {
    quality = 'Good'
    color = 'text-blue-500'
  } else if (ms < 150) {
    quality = 'Fair'
    color = 'text-yellow-500'
  }
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm">
          Response Time: <span className="font-semibold">{ms} ms</span>
        </p>
        <div className="flex items-center gap-1">
          <div className={color}>●</div>
          <span className="text-xs">{quality}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface Props {
  siteId: number
  siteUrl: string
}

export default function ResponseTimeChart({ siteId, siteUrl }: Props) {
  const [data, setData] = useState<MinuteBucket[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  // const token = useMemo(() => localStorage.getItem('token')!, [])

  async function loadHistory() {
    const now = Date.now()
    if (
      historyCache[siteId] &&
      now - (historyCacheTime[siteId] || 0) < 60_000
    ) {
      const slice = historyCache[siteId]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-60)
        .map(log => ({
          formattedTime: formatLabel(log.timestamp),
          latency: log.status === 'UP' ? log.latency : null,
          isDown: log.status === 'DOWN',
        }))
      setData(slice)
      return
    }

    const res = await fetch(
      `/api/websites/${siteId}/history?limit=60`,
      { credentials: 'include' }
    )
    if (!res.ok) return
    const json = await res.json() as { logs: HistoryLog[] }
    historyCache[siteId] = json.logs
    historyCacheTime[siteId] = now

    const slice = json.logs
      .filter(log =>
        log.status === 'UP' &&
        typeof log.latency === 'number' &&
        log.latency > 0 &&
        log.validatorId !== 0
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-60)
      .map(log => ({
        formattedTime: formatLabel(log.timestamp),
        latency: log.latency,
        isDown: false,
      }))
    setData(slice)
  }

  useEffect(() => {
    loadHistory()

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${proto}://${window.location.host}/api/ws`)
    wsRef.current = socket

    socket.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data) as {
          url: string
          timeStamp: string
          responseTime: number
          consensus: 'UP' | 'DOWN'
        }
        if (msg.url !== siteUrl) return

          setData(prev => [
            ...prev.slice(-59),
            {
              formattedTime: formatLabel(msg.timeStamp),
              latency: msg.consensus === 'UP' ? msg.responseTime : null,
              isDown: msg.consensus === 'DOWN',
            },
          ])
      } catch {
        // ignore
      }
    }

    const id = setInterval(loadHistory, 60_000)
    return () => {
      clearInterval(id)
      socket.close()
    }
  }, [siteId, siteUrl])

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="formattedTime"
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            domain={[0, 'dataMax + 10']}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => `${v} ms`}
          />
          <Tooltip content={<CustomTooltip />} />
          <defs>
            <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="latency"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#respGrad)"
            activeDot={{
              r: 6,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
