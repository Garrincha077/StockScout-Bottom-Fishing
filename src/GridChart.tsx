import { useEffect, useMemo, useRef } from 'react'
import { CandlestickSeries, ColorType, HistogramSeries, createChart } from 'lightweight-charts'
import type { ChartBar } from './data'

export type GridRange = '1Y' | '5Y'

function rangeRows(rows: ChartBar[], range: GridRange) {
  return rows.slice(-(range === '5Y' ? 1260 : 252))
}

export default function GridChart({ bars, range }: { bars: ChartBar[]; range: GridRange }) {
  const ref = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => rangeRows(bars, range), [bars, range])

  useEffect(() => {
    if (!ref.current || !rows.length) return
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#07131e' }, textColor: '#7891a5', attributionLogo: false },
      grid: { vertLines: { color: '#13283b' }, horzLines: { color: '#13283b' } },
      rightPriceScale: { borderColor: '#284158', scaleMargins: { top: 0.08, bottom: 0.24 } },
      timeScale: { borderColor: '#284158', rightOffset: 2, timeVisible: false },
      crosshair: { vertLine: { color: '#46718c' }, horzLine: { color: '#46718c' } },
    })
    const candle = chart.addSeries(CandlestickSeries, { upColor: '#2add8a', downColor: '#f26976', wickUpColor: '#2add8a', wickDownColor: '#f26976', borderVisible: false })
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', priceLineVisible: false, lastValueVisible: false })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    candle.setData(rows.map(row => ({ time: row.time, open: row.open, high: row.high, low: row.low, close: row.close })) as any)
    volume.setData(rows.map(row => ({ time: row.time, value: row.volume, color: row.close >= row.open ? '#2add8a45' : '#f2697645' })) as any)
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [rows])

  return <div className="bf-grid-chart-canvas" ref={ref} aria-label={`${range} candlestick chart`} />
}
