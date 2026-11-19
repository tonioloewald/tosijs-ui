import { test, expect } from 'bun:test'
import { readFileSync } from 'fs'
import * as root from './index'

/*
A doc example may import from `tosijs-ui` a name the root barrel does not export: doc pages run
against the iife, which has everything. But a reader copies the example into an app, where that
import fails. So a page that does it must say where the name really comes from (1.19.0 review:
the theme editor's pages kept teaching the root import after the root stopped exporting it).

Live fences only: `:static` fences and other languages are not run, and are not this check's.
*/
const FENCE = /^```(js|ts|tjs)(?![:\w])[^\n]*\n([\s\S]*?)^```/gm
const IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]tosijs-ui['"]/g

test('a doc example importing a non-root name from tosijs-ui names the subpath', () => {
  const docs = JSON.parse(
    readFileSync(`${import.meta.dir}/../demo/docs.json`, 'utf8')
  ) as { text: string; filename: string }[]
  const exported = new Set(Object.keys(root))
  const problems: string[] = []
  for (const doc of docs) {
    for (const [, , code] of doc.text.matchAll(FENCE)) {
      for (const [, names] of code.matchAll(IMPORT)) {
        for (const spec of names.split(',')) {
          const name = spec
            .trim()
            .split(/\s+as\s+/)[0]
            .trim()
          if (!name || exported.has(name)) continue
          if (!/`tosijs-ui\/[\w/-]+`/.test(doc.text)) {
            problems.push(`${doc.filename}: ${name}`)
          }
        }
      }
    }
  }
  expect(
    problems,
    'these examples import from tosijs-ui a name its root does not export, and the page never ' +
      'says which subpath to import it from in an app'
  ).toEqual([])
})
