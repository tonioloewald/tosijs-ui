/*
Schema → a flat list of fields, and validation errors → the field they belong to.

Pure and DOM-free on purpose. This is the half that decides *what* a form contains and *what
is wrong with it*, and it is worth being able to test that without a browser, a render, or a
rAF. The component (`schema-form.ts`) turns this list into elements and nothing more.

The model owns the data — the DOM never does. Everything here reads and writes a plain
object by path; the component's inputs are a view of it. That is the load-bearing decision
recorded in SCHEMA-FORM-PLAN.md §1, and it is what makes two whole classes of defect
impossible rather than merely fixed:

- there are no DOM path strings to rewrite when an array reorders, so they cannot be
  rewritten wrongly;
- output is never rebuilt from the rendered inputs, so a field the schema does not describe
  cannot be dropped on save.
*/

import type { JSONSchema } from 'tosijs-schema'

/** What kind of control a field wants. The component maps this to elements. */
export type FieldKind =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'enum'
  | 'const'
  | 'unsupported'

/** A nested object: its own label, and the fields inside it. */
export interface FieldGroup {
  kind: 'group'
  path: string
  label: string
  required: boolean
  children: Node[]
}

/** An array property: its item schema, and the fields for each current element. */
export interface FieldArray {
  kind: 'array'
  path: string
  label: string
  required: boolean
  itemSchema: JSONSchema
}

export type Node = Field | FieldGroup | FieldArray

export interface Field {
  /** dotted path into the value object, e.g. `email` or `address.city` */
  path: string
  /** the label a human sees — `title`, else the last path segment, humanised */
  label: string
  kind: FieldKind
  schema: JSONSchema
  required: boolean
  /** `<input type>` for a string field, from `format`; undefined for other kinds */
  inputType?: string
  /** enum choices, already coerced to strings for the DOM */
  options?: Array<{ value: unknown; label: string }>
  /** why this field cannot be rendered — set only when `kind` is 'unsupported' */
  reason?: string
}

/*
`format` → `<input type>`.

Deliberately a small map with a text fallback rather than a guess: an unknown format renders
as text and still round-trips, where a wrong input type silently refuses valid values (a
`type=date` will not accept "circa 1920").
*/
const INPUT_TYPE: Record<string, string> = {
  email: 'email',
  uri: 'url',
  url: 'url',
  'date-time': 'datetime-local',
  date: 'date',
  time: 'time',
  password: 'password',
}

/** `firstName` / `first_name` / `first-name` → `first name`. */
export function humanise(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLocaleLowerCase()
    .trim()
}

function kindOf(schema: JSONSchema): FieldKind {
  if (schema.const !== undefined) return 'const'
  if (schema.enum) return 'enum'
  // `type: ['string', 'null']` is the common optional-field shape; the non-null entry is
  // what the control should be.
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  const type = types.find((t) => t && t !== 'null')
  switch (type) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'integer':
      return 'integer'
    case 'boolean':
      return 'boolean'
    default:
      return 'unsupported'
  }
}

/**
 * The fields a schema describes, in declaration order.
 *
 * Slice 1 handles a flat object of scalars. Anything else — nested objects, arrays, unions —
 * comes back as `kind: 'unsupported'` **with a reason**, rather than being skipped. A field
 * that silently vanishes is indistinguishable from a schema that never mentioned it, and
 * that is precisely how an editor loses data.
 */
export function fieldsFor(schema: JSONSchema, prefix = ''): Node[] {
  if (!schema?.properties) return []
  const required = new Set(schema.required ?? [])
  return Object.entries(schema.properties).map(([key, propSchema]) => {
    const path = prefix ? `${prefix}.${key}` : key
    /*
    A nested object becomes a GROUP, and its own `required` list governs its children —
    `required` is scoped to the object that declares it, so a required `city` inside an
    optional `address` means "if you give an address, it needs a city".
    */
    if (
      propSchema.properties &&
      !propSchema.enum &&
      propSchema.const === undefined
    ) {
      return {
        kind: 'group' as const,
        path,
        label: (propSchema as any).title || humanise(key),
        required: required.has(key),
        children: fieldsFor(propSchema, path),
      }
    }
    /*
    An array becomes an ARRAY node. Its per-item fields are not built here: how many there
    are is a fact about the VALUE, not the schema, and this function only sees the schema.
    The component expands each element against `itemSchema` when it renders.
    */
    if (
      propSchema.items &&
      !propSchema.enum &&
      propSchema.const === undefined
    ) {
      return {
        kind: 'array' as const,
        path,
        label: (propSchema as any).title || humanise(key),
        required: required.has(key),
        itemSchema: propSchema.items as JSONSchema,
      }
    }
    const kind = kindOf(propSchema)
    const field: Field = {
      path,
      label: (propSchema as any).title || humanise(key),
      kind,
      schema: propSchema,
      required: required.has(key),
    }
    if (kind === 'string') {
      field.inputType = INPUT_TYPE[propSchema.format ?? ''] ?? 'text'
    }
    if (kind === 'enum') {
      field.options = (propSchema.enum ?? []).map((value) => ({
        value,
        label: String(value),
      }))
    }
    if (kind === 'unsupported') {
      const t = Array.isArray(propSchema.type)
        ? propSchema.type.join('|')
        : propSchema.type
      field.reason = propSchema.prefixItems
        ? 'tuple arrays (prefixItems) are not supported yet'
        : propSchema.anyOf || propSchema.oneOf
        ? 'unions are not supported yet'
        : `no control for type ${t ?? 'unknown'}`
    }
    return field
  })
}

/** Every leaf field in a tree, depth-first — what the component syncs values and errors for. */
export function leafFields(nodes: Node[]): Field[] {
  return nodes.flatMap((node) => {
    if ('children' in node) return leafFields(node.children)
    // An array's leaves depend on how many elements the VALUE has, so the component
    // contributes them per render rather than this function inventing them.
    if (node.kind === 'array') return []
    return [node]
  })
}

/**
 * The fields for one array element, at `path.<index>`.
 *
 * A scalar item is a single field at the index itself (`tags.0`); an object item expands to
 * its properties (`items.0.sku`). Either way the paths are ordinary dotted paths, so value
 * sync, error keying and `setByPath` need no array-specific handling.
 */
export function itemFields(
  itemSchema: JSONSchema,
  path: string,
  index: number
): Node[] {
  const base = `${path}.${index}`
  if (itemSchema?.properties) return fieldsFor(itemSchema, base)
  const kind = kindOf(itemSchema)
  const field: Field = {
    path: base,
    label: `${index + 1}`,
    kind,
    schema: itemSchema,
    required: false,
  }
  if (kind === 'string') {
    field.inputType = INPUT_TYPE[itemSchema.format ?? ''] ?? 'text'
  }
  if (kind === 'enum') {
    field.options = (itemSchema.enum ?? []).map((value) => ({
      value,
      label: String(value),
    }))
  }
  return [field]
}

/** Read a dotted path out of a value object. */
export function getByPath(value: any, path: string): unknown {
  return path
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), value)
}

/**
 * Write a dotted path, returning a NEW object — the old one is never mutated.
 *
 * Immutability is what makes `diff(original, current)` a usable dirty check and what lets a
 * consumer keep the value they handed in. It also means a `change` listener that stashes the
 * event's value gets a stable snapshot rather than an object that keeps moving underneath it.
 */
export function setByPath(value: any, path: string, next: unknown): any {
  const [head, ...rest] = path.split('.')
  /*
  A numeric segment means an ARRAY, not an object with a "0" key.

  Without this, `setByPath({}, 'items.0.sku', 'x')` produced `{items: {0: {sku: 'x'}}}` —
  which looks right in a debugger, serialises to the wrong JSON, and fails validation against
  any `type: 'array'` schema. Measured before the array work went in.
  */
  const isIndex = /^\d+$/.test(head)
  if (isIndex) {
    const base: any[] = Array.isArray(value) ? value.slice() : []
    base[Number(head)] = rest.length
      ? setByPath(base[Number(head)], rest.join('.'), next)
      : next
    return base
  }
  const base =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    ...base,
    [head]: rest.length ? setByPath(base[head], rest.join('.'), next) : next,
  }
}

/*
Array edits operate on the MODEL, and that is the whole point.

The component this design learned from rewrote DOM path strings to reindex after a move, with
`currentPath.replace(/\[\d+\]/, ...)` — unanchored and non-global, so it rewrote the
OUTERMOST index. `items[2].variants[1].sku` moving to index 0 became
`items[0].variants[1].sku`: the parent index clobbered, the child index untouched, and it
corrupted on every pass even when nothing had moved (its SF-1).

Splicing an array cannot do that. There are no path strings; the indices are wherever the
elements now are, because the array IS the order.
*/
export function insertAt(
  value: any,
  path: string,
  index: number,
  item: unknown
): any {
  const list = (getByPath(value, path) as unknown[]) ?? []
  const next = list.slice()
  next.splice(index, 0, item)
  return setByPath(value, path, next)
}

export function removeAt(value: any, path: string, index: number): any {
  const list = (getByPath(value, path) as unknown[]) ?? []
  const next = list.slice()
  next.splice(index, 1)
  return setByPath(value, path, next)
}

/** Move an item. A no-op when either end is out of range, rather than creating holes. */
export function moveItem(
  value: any,
  path: string,
  from: number,
  to: number
): any {
  const list = (getByPath(value, path) as unknown[]) ?? []
  if (from < 0 || to < 0 || from >= list.length || to >= list.length)
    return value
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return setByPath(value, path, next)
}

/** A sensible empty item for an `items` schema — what "Add" inserts. */
export function blankFor(schema: JSONSchema): unknown {
  if (schema?.properties) return {}
  const types = Array.isArray(schema?.type) ? schema.type : [schema?.type]
  const type = types.find((t) => t && t !== 'null')
  if (type === 'boolean') return false
  if (type === 'number' || type === 'integer') return undefined
  return ''
}

export interface FieldError {
  path: string
  message: string
}

/*
A missing required property is reported against the OBJECT, not the field.

Measured against tosijs-schema 1.7.0:

    missing required   →  path "root",         message "Missing email"
    wrong type         →  path "age",          message "Expected integer"
    bad format         →  path "email",        message "Format invalid"
    nested wrong type  →  path "address.zip",  message "Expected integer"
    nested missing     →  path "address",      message "Missing city"

That is reasonable for a validator — the object is what failed its `required` contract — and
wrong for a form, where "Missing email" belongs on the email input. Shown at the top instead,
the user reads a complaint and has to work out which of fifteen fields it means.

So the consumer translates at the boundary. Kept narrow and evidence-shaped: only the exact
`Missing <key>` form is re-keyed, and only when that key is a field we rendered. Anything
else stays where the validator put it rather than being guessed at.
*/
const MISSING = /^Missing ([A-Za-z_$][\w$]*)$/

/**
 * Normalise a validator's `(path, message)` callbacks into per-field errors.
 *
 * `known` is the set of field paths the form rendered; a re-keyed error must land on one of
 * them, or it would attach to a field that is not on screen. Errors about the object as a
 * whole end up under `''`, so a form can show them without blaming a field.
 */
export function collectErrors(
  validateFn: (onError: (path: string, message: string) => void) => void,
  known: Iterable<string> = []
): FieldError[] {
  const fields = new Set(known)
  const errors: FieldError[] = []
  validateFn((rawPath, message) => {
    const path = rawPath === 'root' ? '' : rawPath.replace(/^\./, '')
    /*
    A `Missing x` is reported against the OBJECT that required it, at whatever depth — `root`
    for a top-level key, `address` for one inside `address`. So the field it belongs to is
    that path plus the key.
    */
    const missing = MISSING.exec(message)
    const candidate = missing
      ? path
        ? `${path}.${missing[1]}`
        : missing[1]
      : ''
    const target = candidate && fields.has(candidate) ? candidate : path
    errors.push({ path: target, message })
  })
  return errors
}

/** The first error for a path, or undefined. */
export function errorFor(
  errors: FieldError[],
  path: string
): string | undefined {
  return errors.find((e) => e.path === path)?.message
}
