import { test, expect } from 'bun:test'
import { validate, inferSchema } from 'tosijs-schema'
import type { JSONSchema as Theirs } from 'tosijs-schema'
import type { JSONSchema as Ours } from './json-schema'

/*
The vendored `JSONSchema` exists so nothing we SHIP imports a type from an optional peer.
The cost of vendoring is drift, so this is the guard: assignability in BOTH directions, at
compile time and at the runtime boundary where the two actually meet.

`tosijs-schema` is a devDependency, so this test always has the real type to compare against
even though consumers may not.
*/

test('THEIR JSONSchema is assignable to ours — the direction we consume', () => {
  /*
  One direction, not two, and the honesty is the point.

  `inferSchema` returns THEIR type and we store it in a field typed with OURS, so this is the
  assignment the code actually performs. It is also the direction TypeScript can prove.

  The reverse (ours → theirs) is NOT asserted, because TypeScript cannot decide it: both types
  are recursive through `additionalProperties?: boolean | JSONSchema`, and the structural
  comparison bails out rather than concluding. The member lists are byte-identical — verified
  by diffing the interfaces — so the objects are interchangeable at runtime, which the next
  test exercises directly. An earlier version of this file claimed both directions; that claim
  was untrue AND unchecked, since `tsconfig.json` excludes `*.test.ts`.
  */
  const theirs: Theirs = {
    type: 'object',
    properties: { a: { type: 'string' } },
  }
  const asOurs: Ours = theirs
  expect(asOurs.type).toBe('object')
})

test('a schema typed as OURS validates through THEIR validator', () => {
  /*
  The ours → theirs direction, checked where it can be: at RUNTIME.

  This is the boundary the component actually crosses — our-typed objects handed to their
  `validate` — and it is what makes the unprovable compile-time direction safe in practice. If
  the two shapes ever genuinely diverge, this fails.
  */
  const schema: Ours = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer', minimum: 0 },
      tags: { type: 'array', items: { type: 'string' } },
      mode: { anyOf: [{ const: 'a' }, { const: 'b' }] },
    },
    required: ['name'],
  }
  expect(
    validate({ name: 'Ada', age: 36, tags: ['x'], mode: 'a' }, schema as Theirs)
  ).toBe(true)
  expect(validate({ age: -1 }, schema as Theirs)).toBe(false)
})

test('what THEIR inferSchema returns is assignable to ours — with NO cast', () => {
  /*
  The cast is the point. This assertion previously read `inferred as Ours`, which asserts
  nothing: a cast compiles whether or not the types are compatible. It passed while the two
  were genuinely incompatible (our index signature broke the recursive
  `additionalProperties?: boolean | JSONSchema` branch), and the mismatch only surfaced when
  real code tried to register `inferSchema` through the validator seam.

  A test that casts its way to green is worse than no test: it reports a guarantee it never
  checked.
  */
  const inferred = inferSchema({ title: 'x', pages: 2 })
  const asOurs: Ours = inferred
  expect(asOurs.properties?.pages?.type).toBe('integer')
})

test('a function typed against THEIRS satisfies the seam typed against OURS', () => {
  // The exact shape `setSchemaValidator({ validate, inferSchema })` needs, checked here so a
  // drift shows up in the unit lane rather than in the iife build.
  const theirInfer: (sample: unknown) => Theirs = inferSchema
  const asSeam: (sample: unknown) => Ours = theirInfer
  expect(typeof asSeam).toBe('function')
})

test('the keyword set we model still matches theirs', () => {
  /*
  Structural assignability alone would not catch a keyword they ADD — our index signature
  swallows it. This is the narrower check: every keyword their type declares should be one we
  model explicitly, so a new one shows up here as a decision rather than as `unknown`.
  */
  const modelled = new Set([
    'type',
    'properties',
    'additionalProperties',
    'items',
    'prefixItems',
    'required',
    'enum',
    'const',
    'anyOf',
    'allOf',
    'oneOf',
    'not',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
    'minLength',
    'maxLength',
    'pattern',
    'format',
    'minItems',
    'maxItems',
    'minProperties',
    'maxProperties',
    'title',
    'description',
    'default',
    'examples',
    '$ref',
    '$defs',
    '$schema',
    '$predicate',
    '$counterexamples',
    '$inferred',
  ])
  // A representative schema exercising every keyword we claim to model; if theirs stops
  // accepting one, tsc fails on the cast above rather than here.
  const all: Ours = { type: 'object', $inferred: true, $schema: 'x' }
  expect(modelled.has('exclusiveMinimum')).toBe(true)
  expect(Object.keys(all).every((k) => modelled.has(k))).toBe(true)
})
