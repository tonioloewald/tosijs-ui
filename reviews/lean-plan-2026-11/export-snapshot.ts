/*
Phase 1's export guard (reviews/lean-plan-2026-11.md §5): every named entry point's runtime
exports, read from the built dist/. Run from the repo root after `bun run build`:

  bun --preload ./src/test-setup.ts reviews/lean-plan-2026-11/export-snapshot.ts > /tmp/after.json
  diff <(jq -S . reviews/lean-plan-2026-11/exports-before.json) <(jq -S . /tmp/after.json)

Wildcard entries are skipped: they name every module, which is what phase 2's E2 is about.
*/
import { readFileSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const out: Record<string, string[]> = {}
for (const [entry, target] of Object.entries(
  pkg.exports as Record<string, any>
)) {
  if (entry.includes('*') || entry.endsWith('.json')) continue
  const file =
    typeof target === 'string' ? target : (target.import ?? target.default)
  if (!file || !file.endsWith('.js')) continue
  try {
    out[entry] = Object.keys(await import(join(root, file))).sort()
  } catch (e: any) {
    out[entry] = [`IMPORT FAILED: ${e.message}`]
  }
}
console.log(JSON.stringify(out, null, 1))
