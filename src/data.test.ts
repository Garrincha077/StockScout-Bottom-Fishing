import test from'node:test'
import assert from'node:assert/strict'
import{UNIFIED_ROOT}from'./data.ts'
test('Bottom PWA consumes the canonical Unified Pages data source',()=>assert.equal(UNIFIED_ROOT,'https://garrincha077.github.io/StockScout-Unified'))
