import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8')

test('screener exposes a persistent table/grid switch', () => {
  assert.match(app, /type ScreenerLayout='table'\|'grid'/)
  assert.match(app, /bottom-screener-layout-v1/)
  assert.match(app, /aria-label="Screener display"/)
  assert.match(app, /className="bf-screener-grid"/)
  assert.match(styles, /\.bf-screener-grid\{display:grid/)
})
