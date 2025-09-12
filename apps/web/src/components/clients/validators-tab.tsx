/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/components/ui/table'
import { format, parseISO } from 'date-fns'

interface ValidatorMeta {
  validatorId: number
  region: string
  correctVotes: number
  totalVotes: number
  accuracy: string
  averageLatency: string
  uptime: string
  weight: string
  lastUpdated: string
}

export default function ValidatorsTab({ siteId }: { siteId: number }) {
  const [metaList, setMetaList] = useState<ValidatorMeta[]>([])

  useEffect(() => {
    (async () => {
      // history → unique IDs
      const hr = await fetch(`/api/websites/${siteId}/history?limit=100`, {
        credentials: 'include',
      })
      if (!hr.ok) return
      const { logs } = await hr.json() as { logs: Array<{ validatorId: number }> }
      const ids = Array.from(new Set(logs.map(l => l.validatorId)))

      // fetch meta for each
      const metas = await Promise.all(ids.map(async id => {
        const r = await fetch(`/api/validators/${id}/meta`, {
          credentials: 'include',
        })
        return r.ok ? await r.json() as ValidatorMeta : null
      }))
      setMetaList(metas.filter(Boolean) as ValidatorMeta[])
    })()
  }, [siteId])

  return (
    <div className="overflow-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Validator</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Accuracy</TableHead>
            <TableHead>Avg Latency</TableHead>
            <TableHead>Uptime</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Last Seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metaList.map(m => (
            <TableRow key={m.validatorId}>
              <TableCell>{m.validatorId}</TableCell>
              <TableCell>{m.region}</TableCell>
              <TableCell>{(parseFloat(m.accuracy)*100).toFixed(1)}%</TableCell>
              <TableCell>{parseFloat(m.averageLatency).toFixed(0)} ms</TableCell>
              <TableCell>{parseFloat(m.uptime).toFixed(1)}%</TableCell>
              <TableCell>{parseFloat(m.weight).toFixed(3)}</TableCell>
              <TableCell>{format(parseISO(m.lastUpdated), 'MMM dd, HH:mm')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
