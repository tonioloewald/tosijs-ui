import { test, expect } from 'bun:test'
import fs from 'fs'
import path from 'path'
import {
  contextParamNames,
  contextVarName,
  rewriteImports,
} from './code-transform.js'

test('#111: a slashed context key produces a usable parameter name', () => {
  /*
  `test-harness.ts` carried its own `key.replace(/-/g,'')`, which stripped hyphens and left
  slashes and `@` — so `'tosijs-3d/demo-utils'` became the PARAMETER NAME
  `tosijs3d/demoutils`, and every test in that file died before one of them ran, with V8's
  "Arg string terminates parameters early". The examples on the same page were fine, because
  they used the shared sanitiser. Two copies of one rule.
  */
  const names = contextParamNames(['tosijs-3d/demo-utils', '@babylonjs/core'])
  for (const n of names) {
    expect(
      () => new Function(n, 'return 1'),
      `${n} must be a legal parameter`
    ).not.toThrow()
  }
})

test('#111: the parameter name and the rewritten import binding agree', () => {
  // The two sides must derive from one rule, or the import binds a name the parameter never has.
  const key = 'tosijs-3d/demo-utils'
  const [param] = contextParamNames([key])
  const rewritten = rewriteImports(`import { thing } from '${key}'`, [key])
  expect(rewritten).toContain(param)
  expect(param).toBe(contextVarName(key))
})

test('#111: leading digits and reserved words are still legal parameters', () => {
  for (const key of ['3d-tools', 'class', '@/', 'new']) {
    const [n] = contextParamNames([key])
    expect(() => new Function(n, 'return 1'), `${key} -> ${n}`).not.toThrow()
  }
})

test('#112: an ambiguous pair is named, not silently renamed', () => {
  /*
  Suffixing the collision would leave one module bound to a name no rewritten import references
  — undefined at runtime with nothing to read. The message replaces "Arg string terminates
  parameters early", which was the entire complaint.
  */
  expect(() => contextParamNames(['tosijs-3d', 'tosijs/3d'])).toThrow(
    /both reduce to the identifier/
  )
})

test('#111: nothing sanitises context keys except code-transform', () => {
  /*
  The structural guard, and the one that would actually have caught this.

  The unit tests above all pass with the harness's private copy restored, because they exercise
  the shared helper rather than the call site. That is precisely how the bug survived: the rule
  was implemented twice, the tested copy was correct, and the untested copy ran the doc tests.

  So this asserts the property that matters — ONE implementation. Any file under live-example
  that reduces a key to an identifier on its own is the defect, whatever it happens to produce
  today.
  */
  const dir = path.join(import.meta.dir)
  const offenders: string[] = []
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.includes('.test.')) continue
    if (file === 'code-transform.ts') continue // the one legitimate home
    const raw = fs.readFileSync(path.join(dir, file), 'utf8')
    /*
    Comments stripped first, or the guard reads prose as code. It flagged the comment in
    `test-harness.ts` that QUOTES the removed line to explain it — which would have forced
    whoever hit it to either delete the explanation or weaken the check, and the explanation is
    the more valuable of the two. Newlines are preserved so the reported line numbers stay true.
    */
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))
    // A `.replace(...)` producing an identifier from a key — the shape of the divergent copy.
    for (const m of src.matchAll(
      /\.replace\(\s*\/[^/\n]*\/[gimsuy]*\s*,\s*['"`]['"`]\s*\)/g
    )) {
      const line = src.slice(0, m.index).split('\n').length
      const context = raw.split('\n')[line - 1] ?? ''
      // Only flag ones near a context/key/param — a `.replace` elsewhere is nobody's business.
      if (/key|context|param|ident/i.test(context)) {
        offenders.push(`${file}:${line}  ${context.trim()}`)
      }
    }
  }
  expect(
    offenders,
    `these files sanitise context keys themselves instead of using contextVarName / ` +
      `contextParamNames:\n  ${offenders.join('\n  ')}`
  ).toEqual([])
})
