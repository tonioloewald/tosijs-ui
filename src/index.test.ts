import { test, expect, describe } from 'bun:test'

/*
#133: the root barrel must not drag the doc-system cluster into every consumer bundle.

`code-editor` pulls CodeMirror; `live-example` and `doc-system/doc-system` each pull `tjs-lang`
independently. The package has no `sideEffects` field — correctly, since `elementCreator()`
registers custom elements at import time and a blanket `sideEffects: false` shakes a bare
`import 'tosijs-ui'` down to zero registrations — so a bundler must treat every re-exported
module as side-effectful and cannot drop it.

Measured on a real 15MB React bundle (snowfox-app): 1.35 MB / 8.9% saved. Re-measured here on
the barrel alone: 1.68 MB → 0.38 MB, i.e. the cluster was 77% of it.

A SOURCE-level assertion rather than a size budget: a byte threshold would drift with every
dependency bump and fail for reasons that have nothing to do with this, whereas the invariant
is exactly "these four are not re-exported here".
*/
const DOC_SYSTEM_MODULES = [
  './code-editor.js',
  './doc-browser.js',
  './doc-system/doc-system.js',
  './live-example.js',
]

describe('root barrel (#133)', () => {
  test('does not re-export the doc-system cluster', async () => {
    const barrel = await Bun.file(`${import.meta.dir}/index.ts`).text()
    // Ignore the explanatory comment block, which names all four on purpose.
    const code = barrel.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const mod of DOC_SYSTEM_MODULES) {
      expect(
        code.includes(mod),
        `${mod} is re-exported from the root barrel — that puts CodeMirror or tjs-lang in ` +
          `every consumer bundle. Import it by subpath instead.`
      ).toBe(false)
    }
  })

  test('the iife entry DOES pull them, so the doc site and CDN users are unaffected', async () => {
    const iife = await Bun.file(`${import.meta.dir}/index-iife.ts`).text()
    for (const mod of DOC_SYSTEM_MODULES) {
      expect(iife.includes(mod), `${mod} must be in the iife bundle`).toBe(true)
    }
  })

  test('ordinary components are still exported from the barrel', async () => {
    const m = (await import('./index.js')) as Record<string, unknown>
    for (const name of ['tosiTable', 'tosiDialog', 'tosiForm', 'tosiField']) {
      expect(typeof m[name]).toBe('function')
    }
  })
})

/*
The literal-string check above catches a DIRECT re-export being added back. It cannot see the
regression that would realistically happen (the 1.14.0 review's F9): the barrel exports
`schema-form/fields.ts`, `value-renderer.ts` and `crud.ts`, any of which could grow a
`<tosi-code>` import — a code-editor field type, a code preview, a reused editor. CodeMirror is
then back in every consumer bundle and `src/index.ts` still mentions none of the four names, so
the guard stays green while the 1.35MB win is gone.

Bundle it and read the SOURCEMAP instead — the technique CLAUDE.md already mandates for "what
is actually in this bundle", because minification erases the package paths a grep would look
for. Asserts on the source LIST, not on a byte count: a threshold drifts and needs maintaining,
"zero @codemirror sources" does not.
*/
test('#133/F9: no heavy source reaches a bundle built from the barrel', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const dir = await mkdtemp(join(tmpdir(), 'barrel-guard-'))
  try {
    const entry = join(dir, 'entry.ts')
    // Four ordinary components — the shape of an app that imports a button, which is
    // exactly the consumer #133 was about.
    await writeFile(
      entry,
      `import { tosiRating, tosiSelect, tosiTable, tosiCarousel } from ${JSON.stringify(
        join(import.meta.dir, '../dist/index.js')
      )}\nconsole.log(tosiRating, tosiSelect, tosiTable, tosiCarousel)\n`
    )
    /*
    Shelled out, not `Bun.build()` — CLAUDE.md's rule (its native arena is never returned,
    ~30MB a call). A test process is short-lived enough that it would not bite, but the
    recorded methodology in `src/index.ts` IS a command line, so running that exact command
    keeps the guard and the published figure describing the same thing.
    */
    const out = join(dir, 'out')
    const proc = Bun.spawn(
      [
        'bun',
        'build',
        entry,
        '--minify',
        '--target',
        'browser',
        '--sourcemap=linked',
        '--outdir',
        out,
        '--external',
        'tosijs',
        '--external',
        'marked',
        '--external',
        'tjs-lang',
      ],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    const stderr = await new Response(proc.stderr).text()
    expect(await proc.exited, `bun build failed:\n${stderr}`).toBe(0)

    const map = JSON.parse(await readFile(join(out, 'entry.js.map'), 'utf8'))
    /*
    `prismjs` joined this list in 1.15.0 — after `<tosi-highlight>` was added to the barrel
    and a bundler emitted 15 grammar chunks / 357kb for an app that imported a rating and a
    select. That is #133 reintroduced by the author of the #133 fix, inside the same release,
    which is the argument for a PATTERN here rather than a fixed list of the four modules
    that were heavy in 1.14.
    */
    const HEAVY =
      /@codemirror\/|@lezer\/|tjs-lang|prismjs|code-editor|live-example|doc-browser|doc-system\/doc-system|highlight-block/
    const heavy = (map.sources as string[]).filter((s) => HEAVY.test(s))

    expect(
      map.sources.length,
      'sourcemap should list real inputs'
    ).toBeGreaterThan(10)
    expect(
      heavy,
      `these reached a plain component bundle through the root barrel, which is the ~1.3MB ` +
        `regression #133 removed. Find the transitive import and move it behind a subpath.`
    ).toEqual([])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}, 60_000)

/*
Prism must stay LAZY. `<tosi-highlight>` is in the barrel, and its highlighter dynamically
imports `prismjs` plus a grammar per language — so an app that imports a button must not pay
for a syntax highlighter it never renders.

Built WITH `--splitting`, which is what every real bundler does with a dynamic import (bun
without it inlines them, and that build does show prism in the entry — the difference is the
whole point of the assertion).
*/
test('#133: the barrel pulls NO prism at all, and the subpath keeps it lazy', async () => {
  /*
  Two properties, because they failed in sequence.

  `<tosi-highlight>` was added to the root barrel in 1.15.0, and its import chain reaches the
  static grammar map — so a bundler emitted **15 grammar chunks / 357kb** for an app that
  imported a rating and a select. Measured before and after: 30 chunks / 373kb → 1 chunk /
  287kb. That is #133 reintroduced by the author of the #133 fix, in the same release.

  So: the barrel must contain no prism (it is excluded), and importing the component BY
  SUBPATH must still keep prism out of the entry (lazy chunks, not inlined).
  */
  const { mkdtemp, writeFile, readFile, rm, readdir } = await import(
    'fs/promises'
  )
  const { tmpdir } = await import('os')
  const { join } = await import('path')

  const build = async (entrySrc: string, label: string) => {
    const dir = await mkdtemp(join(tmpdir(), `barrel-${label}-`))
    const entry = join(dir, 'entry.ts')
    await writeFile(entry, entrySrc)
    const out = join(dir, 'out')
    const proc = Bun.spawn(
      [
        'bun',
        'build',
        entry,
        '--minify',
        '--target',
        'browser',
        '--splitting',
        '--format=esm',
        '--sourcemap=linked',
        '--outdir',
        out,
        '--external',
        'tosijs',
        '--external',
        'marked',
        '--external',
        'tjs-lang',
      ],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    const stderr = await new Response(proc.stderr).text()
    expect(await proc.exited, `bun build failed:\n${stderr}`).toBe(0)
    const files = (await readdir(out)).filter((f) => f.endsWith('.js'))
    const entryFile = files.find((f) => f.startsWith('entry'))!
    const entryMap = JSON.parse(
      await readFile(join(out, entryFile + '.map'), 'utf8')
    )
    return { dir, out, files, entrySources: entryMap.sources as string[], rm }
  }

  // 1. Ordinary components: no prism anywhere in the output.
  {
    const r = await build(
      `import { tosiRating, tosiSelect } from ${JSON.stringify(
        join(import.meta.dir, '../dist/index.js')
      )}\nconsole.log(tosiRating, tosiSelect)\n`,
      'plain'
    )
    try {
      let prismBytes = 0
      for (const f of r.files) {
        const t = await readFile(join(r.out, f), 'utf8')
        if (/Prism|prismjs/.test(t)) prismBytes += t.length
      }
      expect(
        prismBytes,
        'an app importing a button must not ship a syntax highlighter — #133'
      ).toBe(0)
    } finally {
      await rm(r.dir, { recursive: true, force: true })
    }
  }

  // 2. The component BY SUBPATH: prism present, but split out of the entry.
  {
    const r = await build(
      `import { tosiHighlight } from ${JSON.stringify(
        join(import.meta.dir, '../dist/highlight-block.js')
      )}\nconsole.log(tosiHighlight)\n`,
      'subpath'
    )
    try {
      /*
      Laziness is a SOURCE property, checked at the source.

      Two post-bundle assertions were tried and both were decorative: an eager
      `import 'prismjs/components/prism-rust.js'` did not change the entry's sourcemap
      sources (splitting moves it to a chunk either way) and did not add a static chunk
      import the entry actually kept. Mutation testing caught both. The invariant is simply
      that every grammar import sits inside a thunk — assert that, where it is unambiguous.
      */
      const src = await readFile(
        join(import.meta.dir, 'doc-system/highlight.ts'),
        'utf8'
      )
      const topLevel = src
        .split('\n')
        .filter((l) => /^\s*import\s+['"]prismjs/.test(l))
      expect(
        topLevel,
        'a prismjs grammar is imported at MODULE TOP LEVEL — it must live inside a thunk, ' +
          'or every consumer of this module loads it eagerly'
      ).toEqual([])
      expect(
        r.files.length,
        'grammars should be split into chunks'
      ).toBeGreaterThan(1)
    } finally {
      await rm(r.dir, { recursive: true, force: true })
    }
  }
}, 120_000)
