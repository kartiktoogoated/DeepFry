/* eslint-disable react-hooks/exhaustive-deps */
// src/components/validators/validator-map.tsx
import { useEffect, useRef, useState } from 'react'

const regionCoords: Record<string, { xFrac: number; yFrac: number }> = {
  'north-america':   { xFrac: 0.25, yFrac: 0.35 },
  'europe':          { xFrac: 0.50, yFrac: 0.25 },
  'asia-pacific':    { xFrac: 0.80, yFrac: 0.40 },
  'south-america':   { xFrac: 0.30, yFrac: 0.70 },
  'africa':          { xFrac: 0.60, yFrac: 0.60 },
  // add more as needed
}

const ValidatorMap = () => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [pulsingRegions, setPulsingRegions] = useState<Set<string>>(new Set())

  // redraw whenever pulsingRegions changes or on mount
  const drawMap = () => {
    const container = mapRef.current
    if (!container) return
    const W = container.clientWidth
    const H = container.clientHeight

    // clear
    container.innerHTML = ''

    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg')
    svg.setAttribute('width','100%')
    svg.setAttribute('height','100%')
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`)
    container.appendChild(svg)

    // helper for left text
    const makeText = (
      x:number, y:number, txt:string,
      size:number, fill:string, weight='normal'
    ) => {
      const t = document.createElementNS(svg.namespaceURI,'text')
      t.setAttribute('x',x.toString())
      t.setAttribute('y',y.toString())
      t.setAttribute('font-size',size.toString())
      t.setAttribute('fill',fill)
      t.setAttribute('font-weight',weight)
      t.setAttribute('text-anchor','start')
      t.textContent = txt
      svg.appendChild(t)
    }

    // draw region dots + labels
    Object.entries(regionCoords).forEach(([region, {xFrac,yFrac}]) => {
      const x = W * xFrac
      const y = H * yFrac

      // if this region is pulsing, draw a larger animate-ping circle
      if (pulsingRegions.has(region)) {
        const pulse = document.createElementNS(svg.namespaceURI,'circle')
        pulse.setAttribute('cx',x.toString())
        pulse.setAttribute('cy',y.toString())
        pulse.setAttribute('r','15')
        pulse.setAttribute('fill','#fff')
        pulse.setAttribute('opacity','0.2')
        pulse.classList.add('animate-ping')
        svg.appendChild(pulse)
      }

      // main dot
      const dot = document.createElementNS(svg.namespaceURI,'circle')
      dot.setAttribute('cx',x.toString())
      dot.setAttribute('cy',y.toString())
      dot.setAttribute('r','5')
      dot.setAttribute('fill','#fff')
      svg.appendChild(dot)

      // label
      makeText(x + 8, y + 4, region.replace('-', ' '), 12, '#ccc')
    })
  }

  useEffect(() => {
    drawMap()
  }, [pulsingRegions])

  useEffect(() => {
    // open WS
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://api.deepfry.tech/ws`)

    ws.onmessage = (ev) => {
      try {
        const { votes } = JSON.parse(ev.data) as {
          votes: Array<{ location: string }>
        }
        const regions = new Set(votes.map(v => v.location))
        setPulsingRegions(regions)
        // clear pulses after 1s
        setTimeout(() => setPulsingRegions(new Set()), 1000)
      } catch {
        // ignore non‐gossip messages
      }
    }
    return () => ws.close()
  }, [])

  return (
    <div
      ref={mapRef}
      className="w-full h-[300px] rounded-md overflow-hidden"
    />
  )
}

export default ValidatorMap
