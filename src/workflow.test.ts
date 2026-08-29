import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'

const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8')

test('every Pages build is pinned to the verified active Unified run',()=>{
  assert.match(workflow,/id: unified/)
  assert.match(workflow,/run_id: \$\{\{ steps\.unified\.outputs\.run_id \}\}/)
  assert.match(workflow,/VITE_EXPECTED_RUN_ID: \$\{\{ steps\.unified\.outputs\.run_id \}\}/)
  assert.match(workflow,/EXPECTED_RUN_ID: \$\{\{ needs\.build\.outputs\.run_id \}\}/)
  assert.match(workflow,/grep -F "\$EXPECTED_RUN_ID"/)
  assert.match(workflow,/schedule:\s*\n\s*- cron:/)
  assert.match(workflow,/description: "Optional exact already-deployed Unified run ID"/)
  assert.match(workflow,/required: false/)
  assert.doesNotMatch(workflow,/2026-08-25-reuse-1/)
})
