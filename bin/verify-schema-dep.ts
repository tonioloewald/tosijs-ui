#!/usr/bin/env bun
/*
Acceptance probe for the `tosijs-schema` version we intend to floor on.

Run it against a candidate release BEFORE taking the floor:

    bun bin/verify-schema-dep.ts            # whatever is installed
    bun bin/verify-schema-dep.ts --version=1.7.0

Why this exists rather than trusting the release notes: the defect that produced
tosijs-schema#7 slipped past a guarantee that was *self-referential* — "a sniffed format
never rejects its own sample" is true from inside the library and still let
`format: 'date-time'` out for `2020-01-01`, which any third-party validator rejects. A
consumer checking at the boundary is the only place that is visible, so the consumer keeps
the probe.

Exits non-zero on any failure, and says which. No output beyond the results.
*/

const args = process.argv.slice(2)
const wanted = args.find((a) => a.startsWith('--version='))?.slice(10)

if (wanted) {
  const proc = Bun.spawn(['bun', 'add', `tosijs-schema@${wanted}`], {
    stdout: 'ignore',
    stderr: 'inherit',
  })
  if ((await proc.exited) !== 0) {
    console.error(`\ncould not install tosijs-schema@${wanted}\n`)
    process.exit(1)
  }
}

const { inferSchema, validate } = (await import('tosijs-schema')) as any
const installed = (
  await Bun.file('node_modules/tosijs-schema/package.json').json()
).version

const results: Array<[string, boolean, string]> = []
const check = (name: string, pass: boolean, detail = '') =>
  results.push([name, pass, detail])

const fmt = (rows: any[], key: string) =>
  (inferSchema(rows, { formats: true }) as any).items?.properties?.[key]?.format

// ── tosijs-schema#7: date vs date-time ───────────────────────────────────────
check(
  '#7 date-only string → format "date"',
  fmt([{ d: '2020-01-01' }, { d: '2021-05-05' }], 'd') === 'date',
  `got ${fmt([{ d: '2020-01-01' }], 'd')}`
)
check(
  '#7 timestamp still → format "date-time"',
  fmt([{ d: '2020-01-01T10:00:00Z' }], 'd') === 'date-time',
  `got ${fmt([{ d: '2020-01-01T10:00:00Z' }], 'd')}`
)

// ── tosijs-schema#6: the twelve requirements, as a regression guard ──────────
const rows = [
  { id: 1, name: 'a' },
  { id: 2, name: 'b', note: 'only here' },
]
const s1: any = inferSchema(rows)
check('R1 unifies across ALL rows, not row 0', 'note' in s1.items.properties)
check(
  'R2 presence decides required',
  s1.items.required?.includes('id') && !s1.items.required?.includes('note')
)
const vt = (inferSchema([{ v: 'x' }, { v: 3 }, { v: null }]) as any).items
  .properties.v.type
check(
  'R3 union type includes null',
  Array.isArray(vt) && vt.includes('string') && vt.includes('null'),
  JSON.stringify(vt)
)
check(
  'R4 no constraints inferred from the sample',
  !/minimum|maximum|minLength|maxLength|maxItems/.test(
    JSON.stringify(
      inferSchema([
        { n: 5, s: 'abc' },
        { n: 9, s: 'defgh' },
      ])
    )
  )
)
check(
  'R5 formats OFF by default',
  !JSON.stringify(inferSchema([{ d: '2020-01-01' }])).includes('format')
)
check(
  'R5 no format on a near-miss',
  fmt([{ d: '2020-01-01' }, { d: 'nope' }], 'd') === undefined
)
check(
  'R6 enums OFF by default',
  !JSON.stringify(inferSchema([{ k: 'a' }, { k: 'b' }])).includes('enum')
)
check(
  'R6 no enum for all-distinct values',
  !JSON.stringify(
    inferSchema([{ k: 'a1' }, { k: 'b2' }, { k: 'c3' }], { enums: true })
  ).includes('enum')
)
check(
  'R7 recurses objects and arrays',
  (inferSchema([{ a: { b: [{ c: 1 }] } }]) as any).items.properties.a.properties
    .b.items.properties.c.type === 'integer'
)
let threw = ''
for (const bad of [[], [null, null], undefined, {}, 'str']) {
  try {
    inferSchema(bad as any)
  } catch {
    threw += `${JSON.stringify(bad)} `
  }
}
check('R8 total on degenerate input', threw === '', threw)
check(
  'R9 deterministic',
  JSON.stringify(inferSchema(rows)) === JSON.stringify(inferSchema(rows))
)
check(
  'R10 objects are OPEN (filter must not strip unseen fields)',
  s1.items.additionalProperties === true
)
let told: any = null
inferSchema(
  Array.from({ length: 50 }, (_, i) => ({ i })),
  { sampleSize: 10, onTruncate: (x: any) => (told = x) }
)
check('R11 truncation is surfaced, not silent', told?.total === 50)
check(
  'R12 validate(sample, inferSchema(sample))',
  [rows, [{ v: 'x' }, { v: 3 }], [{ a: { b: [{ c: 1 }] } }], []].every((f) =>
    validate(f, inferSchema(f))
  )
)
check(
  'the $inferred marker distinguishes observed from authored',
  (inferSchema(rows) as any).$inferred === true &&
    (inferSchema(rows, { marker: false }) as any).$inferred === undefined
)

const failed = results.filter(([, ok]) => !ok)
console.log(`\ntosijs-schema@${installed}\n`)
for (const [name, ok, detail] of results) {
  console.log(
    `  ${ok ? '✅' : '❌'} ${name}${!ok && detail ? ` — ${detail}` : ''}`
  )
}
console.log(
  failed.length
    ? `\n🛑 ${failed.length} of ${results.length} failed — do NOT take this floor.\n`
    : `\n✅ all ${results.length} checks passed — safe to floor on ${installed}.\n`
)
process.exit(failed.length ? 1 : 0)
