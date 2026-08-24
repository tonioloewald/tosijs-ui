/*
The validator seam: two functions, supplied by you.

`<tosi-schema-form>`, `<tosi-crud>` and an editable `<tosi-table>` all want to know whether a
value conforms to a schema. None of them names a library to ask, and that is deliberate.

WHY THERE IS NO `import('tosijs-schema')` HERE. A bare specifier in a dynamic import has
exactly two fates in a bundler and no third:

  resolved      → the module is bundled in, and the build FAILS for a consumer who did not
                  install it — including consumers of `<tosi-table>`, who never asked for a
                  schema library at all;
  externalized  → the build passes, and the browser cannot resolve a bare specifier at
                  runtime, so validation dies silently for EVERYONE, including consumers who
                  did install it.

Both were measured (the second emptied our own doc site's validator and turned two lanes
red). No comment or flag gets both columns green, so the component asks for the functions
instead of the package.

WHAT THAT BUYS BEYOND PACKAGING. The surface is `validate` and `inferSchema` — not "the
tosijs-schema module". Anything that can answer those two questions works: an Ajv wrapper, a
house validator, a stub in a test. `tosijs-schema` is the implementation we ship support and
docs for, not a requirement.

Registered automatically in the iife and in the doc-site hydrate bundle, because those are
bundles we build. ESM consumers write one line — see the schema-form docs.
*/

import type { JSONSchema } from './json-schema.js'

export type SchemaErrorCallback = (path: string, message: string) => void

export interface SchemaValidator {
  /**
   * `true` when `value` conforms. `onError` is called per problem with a dotted path.
   *
   * Matches `tosijs-schema`'s `validate(value, schema, onError | options)`.
   */
  validate: (
    value: unknown,
    schema: JSONSchema,
    onError?:
      | SchemaErrorCallback
      | { onError?: SchemaErrorCallback; strict?: boolean }
  ) => boolean
  /** Derive a schema from a sample. Optional — without it, a form with no schema stays empty. */
  inferSchema?: (sample: unknown) => JSONSchema
}

let current: SchemaValidator | null = null
let warned = false

/**
 * Supply the validator. Pass `null` to remove it.
 *
 *     import { setSchemaValidator } from 'tosijs-ui'
 *     import { validate, inferSchema } from 'tosijs-schema'
 *     setSchemaValidator({ validate, inferSchema })
 */
export function setSchemaValidator(validator: SchemaValidator | null): void {
  current = validator
  if (validator) warned = false
  for (const listener of listeners) listener()
}

export function getSchemaValidator(): SchemaValidator | null {
  return current
}

/**
 * Is validation actually available?
 *
 * Readable on purpose. Without it, `form.validate() === true` is ambiguous between "this
 * conforms" and "nobody checked", and a Save handler cannot tell the difference — which is
 * the failure mode a silent optional dependency produces.
 */
export function schemaValidationAvailable(): boolean {
  return current !== null
}

/*
Say something, once, the first time validation is asked for and cannot be given.

A silent degrade is the worst version of an optional dependency: the form renders, reports no
errors, and looks like it validated. One warning naming the package and the seam turns that
into a five-second fix.
*/
export function warnNoValidator(what: string): void {
  if (warned || current) return
  warned = true
  console.warn(
    `tosijs-ui: ${what} needs a schema validator and none is registered — nothing is being ` +
      `validated.\n  import { setSchemaValidator } from 'tosijs-ui'\n` +
      `  import { validate, inferSchema } from 'tosijs-schema' // ^1.7.0\n` +
      `  setSchemaValidator({ validate, inferSchema })`
  )
}

const listeners = new Set<() => void>()

/** Called when the validator changes, so a live form can pick up a late registration. */
export function onSchemaValidatorChanged(listener: () => void): void {
  listeners.add(listener)
}
