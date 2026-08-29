import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

test('screener exposes persistent table/card/chart-grid views', () => {
  assert.match(app, /type ScreenerLayout='table'\|'card'\|'grid'/)
  assert.match(app, /bottom-screener-layout-v2/)
  assert.match(app, /type GridRange='1Y'\|'5Y'/)
  assert.match(app, /aria-label="Grid chart range"/)
  assert.match(app, /aria-label="Screener display"/)
  assert.match(app, /className="bf-screener-grid"/)
  assert.match(app, /function MiniChart/)
  assert.match(app, /function GridChartCard/)
  assert.match(app, /function GridChartLoader/)
  assert.match(app, /IntersectionObserver/)
  assert.match(styles, /\.bf-screener-grid\{display:grid/)
  assert.match(styles, /\.bf-chart-grid\{display:grid/)
  assert.match(styles, /\.bf-mini-chart\{/)
})
