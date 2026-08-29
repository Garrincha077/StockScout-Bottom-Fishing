import { useEffect, useMemo, useRef } from 'react'
import { CandlestickSeries, ColorType, HistogramSeries, LineSeries, createChart } from 'lightweight-charts'
import type { ChartBar } from './data'

export type GridRange = '1Y' | '5Y'

function weekly(rows: ChartBar[]) {
  const result: ChartBar[] = []
  for (const row of rows) {
    const date = new Date(`${row.time}T00:00:00Z`)
    const day = (date.getUTCDay() + 6) % 7
    date.setUTCDate(date.getUTCDate() - day)
    const time = date.toISOString().slice(0, 10)
    const last = result.at(-1)
    if (!last || last.time !== time) result.push({ ...row, time })
    else {
      last.high = Math.max(last.high, row.high)
      last.low = Math.min(last.low, row.low)
      last.close = row.close
      last.volume += row.volume
      last.rs = row.rs
    }
  }
  return result
}

function movingAverage(rows: ChartBar[], period: number) {
  return rows.map((row, index) => {
    if (index + 1 < period) return null
    const window = rows.slice(index + 1 - period, index + 1)
    return { time: row.time, value: window.reduce((sum, item) => sum + item.close, 0) / period }
  }).filter((item): item is { time: string; value: number } => item !== null)
}

function rangeRows(rows: ChartBar[], range: GridRange) {
  const source = range === '5Y' ? weekly(rows) : rows
  return { source, visible: source.slice(-(range === '5Y' ? 260 : 252)), period: range === '5Y' ? 30 : 50 }
}

export default function GridChart({ bars, range }: { bars: ChartBar[]; range: GridRange }) {
  const ref = useRef<HTMLDivElement>(null)
  const { source, visible: rows, period } = useMemo(() => rangeRows(bars, range), [bars, range])
  const average = useMemo(() => {
    const visibleTimes = new Set(rows.map(row => row.time))
    return movingAverage(source, period).filter(item => visibleTimes.has(item.time))
  }, [source, rows, period])

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
    const ma = chart.addSeries(LineSeries, { color: '#f0c75c', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: range === '5Y' ? '30W MA' : '50D MA' })
    ma.setData(average as any)
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [rows, average, range])

  return <div className="bf-grid-chart-canvas" ref={ref} aria-label={`${range} candlestick chart`} />
}
