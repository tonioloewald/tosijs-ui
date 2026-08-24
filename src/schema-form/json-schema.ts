/*
A local `JSONSchema` type, so nothing we SHIP imports one.

`tosijs-schema` is an **optional peer** — install it and the form validates, omit it and the
form still renders and edits. That promise was in `SCHEMA-FORM-PLAN.md` from the start and it
is broken the moment a shipped `.d.ts` says `import type { JSONSchema } from 'tosijs-schema'`:
TypeScript does not care that npm considers a package optional, so a consumer whose only
import is `tosiTable` gets TS2307 for a library they were told they did not need.

**Declaring the optional peer does not fix this**, and there is proof in our own output:
`dist/code-editor-cm.d.ts` imports a type from `tjs-lang/editors/codemirror`, which IS a
declared optional peer, and still fails to resolve when it is absent. Filed upstream as
tjs-lang#13; the fix on our side is the same either way — do not import a type you do not
require.

So the type is declared here instead. It is **structural**, which is what makes this safe: the
values we hand to `validate()` and receive from `inferSchema()` are the same objects either
way, and a structural type that matches theirs is interchangeable at the boundary without
either package knowing about the other. Keeping it in sync is a real cost, which is why
`json-schema.test.ts` asserts it stays assignable in both directions against the real thing
(a devDependency, so the test always has it).

Mirrors tosijs-schema 1.7.0's `JSONSchema`.
*/

export interface JSONSchema {
  type?: string | string[]
  properties?: Record<string, JSONSchema>
  additionalProperties?: boolean | JSONSchema
  items?: JSONSchema
  /** typed for interop but NOT enforced by their `validate` */
  prefixItems?: JSONSchema[]
  required?: string[]
  enum?: readonly unknown[]
  const?: unknown
  anyOf?: JSONSchema[]
  allOf?: JSONSchema[]
  oneOf?: JSONSchema[]
  not?: JSONSchema
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  minItems?: number
  maxItems?: number
  minProperties?: number
  maxProperties?: number
  title?: string
  description?: string
  default?: unknown
  examples?: unknown[]
  $ref?: string
  $defs?: Record<string, JSONSchema>
  $schema?: string
  /** predicate source; ignored unless an evaluator is registered */
  $predicate?: string
  /** values this schema must REFUSE — a gate that never says no isn't a gate */
  $counterexamples?: unknown[]
  /** marks a schema derived from a sample rather than authored */
  $inferred?: boolean
  /*
  NO index signature, deliberately — it mirrors theirs exactly.

  An `[key: string]: unknown` catch-all looks helpful and breaks assignability against the
  real type in the recursive branches (`additionalProperties?: boolean | JSONSchema`), which
  is precisely the interoperability this file exists to preserve. Extension keywords like
  `x-discriminator` are read through a cast at the one place that wants them, as they were
  before.
  */
}
