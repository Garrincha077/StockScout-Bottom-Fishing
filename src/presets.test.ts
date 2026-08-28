import assert from'node:assert/strict'
import test from'node:test'
import{bottomPresets}from'./presets.ts'

test('the standalone PWA exposes all 19 original Bottom presets',()=>{
  assert.equal(bottomPresets.length,19)
  assert.equal(new Set(bottomPresets.map(preset=>preset.name)).size,19)
})
