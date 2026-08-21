/*
Which parts of a schema the validator does not actually check.

`tosijs-schema`'s `validate` enforces a documented subset of JSON Schema and **silently
ignores the rest** — `validate(0, {type: 'number', exclusiveMinimum: 0})` is `true`, and so is
`validate(42, {oneOf: [{type: 'string'}]})`. That is a deliberate small-surface design and the
subset is exported as `ENFORCED_KEYWORDS`; what is missing is any way for a consumer to notice
it has stepped outside.

A form must notice. Rendering a green, error-free field over a value the schema forbids is
worse than saying "this constraint is not checked here" — the user believes the form.

Filed upstream as tosijs-schema#8, asking for `oneOf` and `exclusiveMin/Max` to be enforced
and for this walker to be exported (`agentContract` already computes it internally, but only
by throwing). **Delete this file when that lands.**
*/

import type { JSONSchema } from 'tosijs-schema'

/*
Mirrors `ENFORCED_KEYWORDS` from tosijs-schema 1.7.0.

Copied rather than imported because `tosijs-schema` is an OPTIONAL peer — the form renders
without it — and this note is most useful precisely when validation is absent. `unenforced.test.ts`
asserts this list still matches the upstream export, so the two cannot drift silently.
*/
export const ENFORCED = new Set([
  'type',
  'properties',
  'required',
  'items',
  'enum',
  'const',
  'anyOf',
  'minimum',
  'maximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
  'additionalProperties',
  '$predicate',
  'x-tjs-undefined',
])

/** Annotations that describe rather than constrain — never a validation gap. */
const ANNOTATIONS = new Set([
  'title',
  'description',
  'default',
  'examples',
  '$counterexamples',
  '$inferred',
  '$schema',
  '$id',
  '$comment',
  'deprecated',
  'readOnly',
  'writeOnly',
  'discriminator',
])

/**
 * The constraining keywords in `schema` that `validate` ignores, deduped and sorted.
 *
 * Shallow **on purpose**: each field asks about its own schema, so a nested gap is reported
 * against the nested field that owns it rather than being blamed on its ancestor.
 */
export function unenforcedKeywords(schema: JSONSchema | undefined): string[] {
  if (!schema || typeof schema !== 'object') return []
  const found = Object.keys(schema).filter(
    (key) =>
      !ENFORCED.has(key) && !ANNOTATIONS.has(key) && !key.startsWith('x-')
  )
  return [...new Set(found)].sort()
}

/** e.g. `oneOf and exclusiveMinimum are not validated` — the note a field shows. */
export function unenforcedNote(keywords: string[]): string {
  if (keywords.length === 0) return ''
  const list =
    keywords.length === 1
      ? keywords[0]
      : `${keywords.slice(0, -1).join(', ')} and ${
          keywords[keywords.length - 1]
        }`
  return `${list} ${keywords.length === 1 ? 'is' : 'are'} not validated`
}
