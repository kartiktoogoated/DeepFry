/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
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
import { format } from 'date-fns'

interface DayData {
  date: string
  up: number
  total: number
  uptime: number
}

interface HistoryLog {
  timestamp: string
  status: 'UP' | 'DOWN'
  url: string
}

interface UptimeChartProps {
  siteId: number
  siteUrl: string
}

export default function UptimeChart({ siteId, siteUrl }: UptimeChartProps) {
  const [data, setData] = useState<DayData[]>([])
  // const token = useMemo(() => localStorage.getItem('token')!, [])

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/websites/${siteId}/history?limit=1000`, {
        credentials: 'include',
      })
      if (!res.ok) return
      const json = await res.json()
      const logs: HistoryLog[] = json.logs

      // group by day
      const byDay: Record<string, { up: number; total: number }> = {}
      logs.forEach(l => {
        const day = format(new Date(l.timestamp), 'MMM dd')
        byDay[day] = byDay[day] || { up: 0, total: 0 }
        byDay[day].total++
        if (l.status === 'UP') byDay[day].up++
      })

      const chart = Object.entries(byDay)
        .map(([date, { up, total }]) => ({
          date,
          up,
          total,
          uptime: total > 0 ? Math.round((up / total) * 100) : 0,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setData(chart)
    }

    fetchHistory()

    // live WS updates
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${proto}://${window.location.host}/api/ws`)

    socket.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data) as {
          url: string
          consensus: 'UP' | 'DOWN'
          timeStamp: string
        }
        // Only process messages for the selected site
        if (msg.url !== siteUrl) return

        const day = format(new Date(msg.timeStamp), 'MMM dd')
        setData(prev => {
          const idx = prev.findIndex(d => d.date === day)
          if (idx === -1) {
            const up = msg.consensus === 'UP' ? 1 : 0
            return [
              ...prev,
              { date: day, up, total: 1, uptime: up * 100 },
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          }

          const updatedDay = { ...prev[idx] }
          updatedDay.total++
          if (msg.consensus === 'UP') updatedDay.up++
          updatedDay.uptime = Math.round((updatedDay.up / updatedDay.total) * 100)
          
          return prev
            .slice(0, idx)
            .concat(updatedDay, prev.slice(idx + 1))
        })
      } catch {
        // ignore
      }
    }

    return () => { socket.close() }
  }, [siteId, siteUrl])

  const TooltipContent = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const entry = payload[0].payload as DayData
    return (
      <Card>
        <CardContent className="p-2 bg-card border border-border">
          <p className="text-sm">{label}</p>
          <p className="text-base font-semibold">{entry.uptime}% uptime</p>
          <p className="text-xs text-muted-foreground">
            {entry.up} up / {entry.total} total checks
          </p>
        </CardContent>
      </Card>
    )
  }

  // If no data, use mock data for demo/empty state
  const chartData = data.length > 0 ? data : [
    { date: 'Today', up: 1, total: 1, uptime: 100 },
    { date: 'Yesterday', up: 1, total: 1, uptime: 100 },
    { date: '2 days ago', up: 1, total: 1, uptime: 100 },
  ];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={TooltipContent} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }} />
          <Line
            type="monotone"
            dataKey="uptime"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 6,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
