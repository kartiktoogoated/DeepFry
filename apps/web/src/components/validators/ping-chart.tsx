/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface LogEntry {
  timestamp: string
  latency: number
  site?: string
  validatorId?: string
  location?: string
}

interface MinuteBucket {
  formattedTime: string
  pingTime: number | null
  isDown?: boolean
  site?: string
  validatorId?: string
  location?: string
}

const formatLabel = (iso: string) => {
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
  if (active && payload && payload.length) {
    const entry = payload[0].payload as MinuteBucket
    if (entry.isDown) {
      return (
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm font-medium">{label}</p>
            {entry.site && (
              <p className="text-xs text-muted-foreground">{entry.site}</p>
            )}
            <p className="text-sm font-semibold text-red-500">Down</p>
          </CardContent>
        </Card>
      )
    }

    const pingTime = entry.pingTime!
    let quality: string, qualityColor: string
    if (pingTime < 60) {
      quality = 'Excellent'
      qualityColor = 'text-green-500'
    } else if (pingTime < 100) {
      quality = 'Good'
      qualityColor = 'text-blue-500'
    } else if (pingTime < 150) {
      quality = 'Fair'
      qualityColor = 'text-yellow-500'
    } else {
      quality = 'Poor'
      qualityColor = 'text-red-500'
    }

    return (
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-sm font-medium">{label}</p>
          {entry.site && (
            <p className="text-xs text-muted-foreground">{entry.site}</p>
          )}
          <p className="text-sm">
            Ping Time: <span className="font-semibold">{pingTime} ms</span>
          </p>
          <div className="flex items-center gap-1">
            <div className={qualityColor}>●</div>
            <span className="text-xs">{quality}</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  return null
}

export interface PingChartProps {
  isStarted: boolean
  validatorId: number | null
}

const PingChart: React.FC<PingChartProps> = ({ isStarted, validatorId }) => {
  const [data, setData] = useState<MinuteBucket[]>([])
  const wsRef = useRef<WebSocket>()
  const historyCacheRef = useRef<{logs: LogEntry[], time: number} | null>(null)

  // 1) initial load once:
  useEffect(() => {
    const loadHistory = async () => {
      if (!validatorId) return;
      const now = Date.now();
      if (historyCacheRef.current && now - historyCacheRef.current.time < 5_000) {
        const slice = historyCacheRef.current.logs
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-60)
          .map((log: any) => ({
            formattedTime: formatLabel(log.timestamp),
            pingTime: log.latency === 0 ? null : log.latency,
            isDown: log.latency === 0,
            site: log.site,
            validatorId: log.validatorId,
          }))
        setData(slice)
        return
      }
      try {
        const res = await fetch(`/api/logs?validatorId=${validatorId}`);
        if (res.status === 429) return;
        const data = await res.json();
        const allLogs = data.success ? data.logs : [];
        historyCacheRef.current = { logs: allLogs, time: now };
        // Deduplicate logs
        const seen = new Set<string>();
        const uniqueLogs = allLogs.filter((log: any) => {
          if (log.validatorId === 0) return false;
          const key = `${log.site}-${log.timestamp}-${log.validatorId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const slice = uniqueLogs
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-60)
          .map((log: any) => ({
            formattedTime: formatLabel(log.timestamp),
            pingTime: log.latency === 0 ? null : log.latency,
            isDown: log.latency === 0,
            site: log.site,
            validatorId: log.validatorId,
          }))
        setData(slice)
      } catch (e) {
        console.error('Failed to load logs for chart', e)
      }
    }

    loadHistory()
  }, [validatorId])

  // 2) polling only when started
  useEffect(() => {
    if (!isStarted || !validatorId) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/logs?validatorId=${validatorId}`);
        if (res.status === 429) return;
        const data = await res.json();
        const allLogs = data.success ? data.logs : [];
        historyCacheRef.current = { logs: allLogs, time: Date.now() };
        // Deduplicate logs
        const seen = new Set<string>();
        const uniqueLogs = allLogs.filter((log: any) => {
          if (log.validatorId === 0) return false;
          const key = `${log.site}-${log.timestamp}-${log.validatorId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const slice = uniqueLogs
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-60)
          .map((log: any) => ({
            formattedTime: formatLabel(log.timestamp),
            pingTime: log.latency === 0 ? null : log.latency,
            isDown: log.latency === 0,
            site: log.site,
            validatorId: log.validatorId,
          }))
        setData(slice)
      } catch (e) {
        console.error('Failed to load logs', e)
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [isStarted, validatorId])

  // 3) websocket only updates UI when started
  useEffect(() => {
    if (!isStarted) return;
    
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(`${proto}://api.deepfry.tech/ws`)
    wsRef.current = socket

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          timeStamp: string
          consensus: 'UP' | 'DOWN'
          responseTime?: number
          url?: string
        }
        const isDown = msg.consensus === 'DOWN'
        const pingTime = isDown ? null : msg.responseTime ?? null
        setData((prev) => [
          ...prev.slice(-59),
          {
            formattedTime: formatLabel(msg.timeStamp),
            pingTime,
            isDown,
            site: msg.url,
          },
        ])
      } catch {
        // ignore
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = undefined
      }
    }
  }, [isStarted])

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            domain={[0, 'dataMax + 10']}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickFormatter={(v) => `${v} ms`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="pingTime"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{
              r: 4,
              stroke: 'hsl(var(--primary))',
              strokeWidth: 2,
              fill: 'hsl(var(--background))',
            }}
            activeDot={{
              r: 6,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PingChart
