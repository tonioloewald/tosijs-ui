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

import type { JSONSchema } from './json-schema.js'
import { unenforcedKeywords } from './unenforced.js'

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
  schema: JSONSchema
  children: Node[]
}

/** An array property: its item schema, and the fields for each current element. */
export interface FieldArray {
  kind: 'array'
  path: string
  label: string
  required: boolean
  schema: JSONSchema
  itemSchema: JSONSchema
}

/** One branch of a variant union — a shape the value may take. */
export interface UnionBranch {
  label: string
  schema: JSONSchema
  /** the `const`-valued properties that identify this branch, e.g. `{kind: 'circle'}` */
  marks: Record<string, unknown>
}

/** A property whose value may take one of several object shapes. */
export interface FieldUnion {
  kind: 'union'
  path: string
  label: string
  required: boolean
  schema: JSONSchema
  branches: UnionBranch[]
  /** the property whose `const` distinguishes the branches, when there is one */
  discriminator?: string
  /** keywords in this property's schema that the validator ignores — see `unenforced.ts` */
  unvalidated?: string[]
}

export type Node = Field | FieldGroup | FieldArray | FieldUnion

export interface Field {
  /** dotted path into the value object, e.g. `email` or `address.city` */
  path: string
  /** keywords in this field's schema that the validator ignores — see `unenforced.ts` */
  unvalidated?: string[]
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

/** Build the leaf field for a scalar / enum / const schema. Shared by objects and array items. */
export function scalarField(
  schema: JSONSchema,
  path: string,
  label: string,
  required: boolean
): Field {
  const kind = kindOf(schema)
  const field: Field = { path, label, kind, schema, required }
  const unvalidated = unenforcedKeywords(schema)
  if (unvalidated.length) field.unvalidated = unvalidated
  if (kind === 'string') {
    field.inputType = INPUT_TYPE[schema.format ?? ''] ?? 'text'
  }
  if (kind === 'enum') {
    field.options = (schema.enum ?? []).map((value) => ({
      value,
      label: String(value),
    }))
  }
  if (kind === 'unsupported') {
    const t = Array.isArray(schema.type) ? schema.type.join('|') : schema.type
    field.reason = schema.prefixItems
      ? 'tuple arrays (prefixItems) are not supported yet'
      : `no control for type ${t ?? 'unknown'}`
  }
  return field
}

/** Is this branch the `{type: 'null'}` half of a nullable union? */
const isNullBranch = (branch: any): boolean =>
  branch?.type === 'null' ||
  (Array.isArray(branch?.type) &&
    branch.type.length === 1 &&
    branch.type[0] === 'null')

/**
 * Turn a union property into something renderable.
 *
 * Four outcomes, in the order they are tried — a union is a shape *description*, and most of
 * the shapes real schemas use are not "pick a variant" at all:
 *
 * - **nullable** (`[X, null]`, which is what `s.optional` emits) — one real branch, so it is
 *   simply that field, not required;
 * - **all-`const`** — an enum in disguise, so a `<select>`, not a variant picker;
 * - **all-object** — a genuine variant union;
 * - anything else — unsupported *with a reason*, never dropped.
 */
function resolveUnion(
  schema: JSONSchema
):
  | { kind: 'single'; schema: JSONSchema; nullable: boolean }
  | { kind: 'consts'; options: Array<{ value: unknown; label: string }> }
  | { kind: 'variants'; branches: UnionBranch[]; discriminator?: string }
  | { kind: 'unsupported'; reason: string } {
  const raw = ((schema as any).anyOf ?? (schema as any).oneOf) as JSONSchema[]
  const branches = raw.filter((b) => !isNullBranch(b))
  const nullable = branches.length < raw.length
  if (branches.length === 0)
    return { kind: 'single', schema: { type: 'null' } as JSONSchema, nullable }
  if (branches.length === 1)
    return { kind: 'single', schema: branches[0], nullable }
  if (branches.every((b) => b.const !== undefined)) {
    return {
      kind: 'consts',
      options: branches.map((b) => ({
        value: b.const,
        label: (b as any).title || String(b.const),
      })),
    }
  }
  if (branches.every((b) => b.properties)) {
    /*
    The discriminator is the property that every branch pins to a different `const` — `kind`,
    `type`, `@type`, whatever the schema calls it. An OpenAPI-style
    `discriminator: {propertyName}` wins when given; otherwise it is derived, so ordinary
    JSON Schema works without extra ceremony.
    */
    /*
    `x-discriminator` first, bare `discriminator` as a deprecated alias.

    `discriminator` is an OpenAPI keyword, not a JSON Schema one — and tosijs-schema's own
    `agentContract` REFUSES a schema that uses it, on the grounds that a gate must not accept
    keywords its validator ignores. So a schema written to pass their contract check spells it
    `x-discriminator` (the `x-` prefix is explicitly allowed), and we read only the spelling
    they reject: the declared property was silently ignored and branches got mislabelled.
    */
    const declared =
      (schema as any)['x-discriminator']?.propertyName ??
      (schema as any).discriminator?.propertyName
    const candidates = Object.keys(branches[0].properties ?? {}).filter((key) =>
      branches.every((b) => (b.properties as any)?.[key]?.const !== undefined)
    )
    const discriminator = candidates.includes(declared)
      ? declared
      : candidates[0]
    return {
      kind: 'variants',
      discriminator,
      branches: branches.map((b, i) => {
        const marks: Record<string, unknown> = {}
        for (const [key, prop] of Object.entries(b.properties ?? {})) {
          if ((prop as JSONSchema).const !== undefined)
            marks[key] = (prop as JSONSchema).const
        }
        const mark = discriminator ? marks[discriminator] : undefined
        return {
          label:
            (b as any).title ||
            (mark !== undefined ? String(mark) : `option ${i + 1}`),
          schema: b,
          marks,
        }
      }),
    }
  }
  /*
  Everything else: a union of unlike scalars, or scalars mixed with objects. Naming the
  shapes matters — "unsupported" tells a schema author nothing, `a union of string | object`
  tells them exactly which property to go and look at.
  */
  const describe = (b: JSONSchema): string =>
    b.const !== undefined
      ? 'const'
      : b.properties
      ? 'object'
      : Array.isArray(b.type)
      ? b.type.join('|')
      : b.type ?? 'unknown'
  const shapes = [...new Set(branches.map(describe))].join(' | ')
  return {
    kind: 'unsupported',
    reason: `a union of ${shapes} is not supported yet`,
  }
}

/**
 * Which branch does `value` currently look like? `-1` when nothing matches.
 *
 * Marks first: a discriminator is an exact answer, and it is the reason schemas carry one.
 * Otherwise score by how many of the branch's own required keys are present — the component
 * this design learned from demanded that **every** key match (its SF-10), so a
 * half-filled object matched no branch at all and the editor showed the user nothing.
 */
export function matchBranch(branches: UnionBranch[], value: any): number {
  if (value == null || typeof value !== 'object') return -1
  const marked = branches.findIndex(
    (b) =>
      Object.keys(b.marks).length > 0 &&
      Object.entries(b.marks).every(([key, mark]) => value[key] === mark)
  )
  if (marked !== -1) return marked
  let best = -1
  let bestScore = 0
  branches.forEach((b, i) => {
    const keys = b.schema.required ?? Object.keys(b.schema.properties ?? {})
    const score = keys.filter((k) => value[k] !== undefined).length
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
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
  return Object.entries(schema.properties).map(([key, rawSchema]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const label = (rawSchema as any).title || humanise(key)
    let propSchema = rawSchema
    let isRequired = required.has(key)
    /*
    A union is resolved FIRST, because most unions are not variant pickers: `[X, null]` is
    just an optional X, and an all-`const` union is an enum wearing a hat. Only what is left
    after those becomes a variant control.
    */
    if ((rawSchema as any).anyOf || (rawSchema as any).oneOf) {
      const union = resolveUnion(rawSchema)
      if (union.kind === 'variants') {
        const node: FieldUnion = {
          kind: 'union',
          path,
          label,
          required: isRequired,
          schema: rawSchema,
          branches: union.branches,
        }
        if (union.discriminator) node.discriminator = union.discriminator
        const unvalidated = unenforcedKeywords(rawSchema)
        if (unvalidated.length) node.unvalidated = unvalidated
        return node
      }
      if (union.kind === 'consts') {
        const field = scalarField(rawSchema, path, label, isRequired)
        field.kind = 'enum'
        field.options = union.options
        delete field.reason
        return field
      }
      if (union.kind === 'unsupported') {
        const field = scalarField(rawSchema, path, label, isRequired)
        field.kind = 'unsupported'
        field.reason = union.reason
        return field
      }
      // A single real branch: render THAT, carrying the property's own title, and treat a
      // nullable union as optional however the parent's `required` list reads.
      propSchema = { ...union.schema, title: (rawSchema as any).title }
      if (union.nullable) isRequired = false
    }
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
        label,
        required: isRequired,
        schema: propSchema,
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
        label,
        required: isRequired,
        schema: propSchema,
        itemSchema: propSchema.items as JSONSchema,
      }
    }
    return scalarField(propSchema, path, label, isRequired)
  })
}

/** Every leaf field in a tree, depth-first — what the component syncs values and errors for. */
export function leafFields(nodes: Node[]): Field[] {
  return nodes.flatMap((node) => {
    if ('children' in node) return leafFields(node.children)
    // An array's leaves depend on how many elements the VALUE has, and a union's on which
    // branch it currently matches, so the component contributes those per render rather than
    // this function inventing them.
    if (node.kind === 'array' || node.kind === 'union') return []
    return [node]
  })
}

/**
 * The fields of the branch `value` currently matches, at the union's own path.
 *
 * The discriminator is dropped: the variant `<select>` **is** that control, and rendering it
 * twice invites the user to set them to different things.
 */
export function branchFields(node: FieldUnion, value: any): Node[] {
  const index = matchBranch(node.branches, getByPath(value, node.path))
  if (index === -1) return []
  const fields = fieldsFor(node.branches[index].schema, node.path)
  return node.discriminator
    ? fields.filter((f) => f.path !== `${node.path}.${node.discriminator}`)
    : fields
}

/**
 * Switch a union to another branch, keeping what the two shapes have in common.
 *
 * Only the branch marks are written. Nothing is deleted — a key the new branch does not
 * describe stays in the model, for the same reason output is never rebuilt from the inputs:
 * the form is an editor, not a filter, and `filter()` is what strips a value to a schema.
 */
export function selectBranch(value: any, node: FieldUnion, index: number): any {
  const branch = node.branches[index]
  if (!branch) return value
  const current = getByPath(value, node.path)
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? current
      : {}
  return setByPath(value, node.path, { ...base, ...branch.marks })
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
  return [scalarField(itemSchema, base, `${index + 1}`, false)]
}

/**
 * The field for ONE property of an object schema — what an editable table cell needs.
 *
 * Same function the form uses per property, so a cell and a field agree about what a
 * property is: same input type from `format`, same enum options, same `unsupported` verdict
 * with the same reason. Two surfaces, one answer — which is the whole point of keeping the
 * model DOM-free.
 */
export function fieldForProperty(
  schema: JSONSchema | null | undefined,
  prop: string
): Field | undefined {
  const propSchema = schema?.properties?.[prop]
  if (!propSchema) return undefined
  const nodes = fieldsFor(
    {
      type: 'object',
      properties: { [prop]: propSchema },
      required: schema?.required,
    },
    ''
  )
  const node = nodes[0]
  // A group, array or union has no single control, so a cell cannot render it — the caller
  // falls back to read-only rather than guessing.
  return node &&
    !('children' in node) &&
    node.kind !== 'array' &&
    node.kind !== 'union'
    ? node
    : undefined
}

/**
 * Turn what a control holds back into what the schema asked for. ONE implementation.
 *
 * This existed twice — once in the form, once in the table — and had already drifted: the
 * table's copy inferred from `el.type` when it had no field, the form's did not, and neither
 * knew what the other did about `const`. Two surfaces disagreeing about what a property IS is
 * the specific failure the DOM-free model exists to prevent, so the answer belongs here with
 * the rest of it.
 *
 * An emptied numeric field becomes `undefined`, not `0` and not `NaN`: "the user cleared it"
 * and "the user typed zero" are different facts, and writing one for the other puts a number
 * in the data that nobody entered.
 */
export function coerceToSchema(
  field: Field | undefined,
  raw: string,
  checked: boolean,
  domType?: string
): unknown {
  if (field?.kind === 'boolean' || domType === 'checkbox') return checked
  if (field?.kind === 'integer')
    return raw === '' ? undefined : parseInt(raw, 10)
  if (field?.kind === 'number') return raw === '' ? undefined : Number(raw)
  if (field?.kind === 'enum') {
    // The DOM only holds strings; recover the schema's own value by identity.
    const hit = field.options?.find((o) => String(o.value) === raw)
    return hit ? hit.value : raw
  }
  // No field to go on — trust the control the browser gave us rather than guessing text.
  if (!field && domType === 'number')
    return raw === '' ? undefined : Number(raw)
  return raw
}

/**
 * Is this field one a user may edit? `const` is not.
 *
 * A `const` is a value the schema FIXES. The form rendered it readonly and the table rendered
 * it as a freely editable text box, so the same column was editable or not depending on which
 * component you happened to be looking at.
 */
export function fieldEditable(field: Field): boolean {
  return field.kind !== 'const' && field.kind !== 'unsupported'
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

/**
 * Strip `required` from a schema derived from a sample.
 *
 * `inferSchema` marks every key it saw as required, which is correct for describing a sample
 * and wrong for editing one: it says *this data had these keys*, not *this data must have
 * them*. Left in, every field in an inferred form is required because one example happened to
 * fill it in — the same "a sample's extremes are not the domain's" error that keeps
 * `minimum`/`maxLength` out of inference upstream.
 *
 * A consumer who does want required fields has the inferred schema in hand (`form.schema`),
 * and can add them and set it back.
 */
export function relaxInferred(schema: JSONSchema): JSONSchema {
  if (!schema || typeof schema !== 'object') return schema
  const { required: _required, ...rest } = schema as any
  if (rest.properties) {
    rest.properties = Object.fromEntries(
      Object.entries(rest.properties).map(([key, value]) => [
        key,
        relaxInferred(value as JSONSchema),
      ])
    )
  }
  if (rest.items) rest.items = relaxInferred(rest.items)
  return rest
}
