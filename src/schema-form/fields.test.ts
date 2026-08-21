import { test, expect } from 'bun:test'
import { validate } from 'tosijs-schema'
import {
  fieldsFor,
  leafFields,
  itemFields,
  insertAt,
  removeAt,
  moveItem,
  blankFor,
  getByPath,
  setByPath,
  collectErrors,
  errorFor,
  humanise,
  branchFields,
  matchBranch,
  selectBranch,
} from './fields'

const contact: any = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer' },
    score: { type: 'number' },
    active: { type: 'boolean' },
    role: { type: 'string', enum: ['admin', 'user'] },
    kind: { const: 'contact' },
    homepage: { type: 'string', format: 'uri' },
    notes: { type: ['string', 'null'] },
  },
  required: ['name', 'email'],
}

// ── what the form contains ───────────────────────────────────────────────────

test('every declared property becomes a field, in declaration order', () => {
  expect(fieldsFor(contact).map((f) => f.path)).toEqual([
    'name',
    'email',
    'age',
    'score',
    'active',
    'role',
    'kind',
    'homepage',
    'notes',
  ])
})

test('kinds come from the schema, not from the value', () => {
  const byPath = Object.fromEntries(fieldsFor(contact).map((f) => [f.path, f]))
  expect(byPath.name.kind).toBe('string')
  expect(byPath.age.kind).toBe('integer')
  expect(byPath.score.kind).toBe('number')
  expect(byPath.active.kind).toBe('boolean')
  expect(byPath.role.kind).toBe('enum')
  expect(byPath.kind.kind).toBe('const')
})

test('a nullable type uses the non-null control', () => {
  // `type: ['string', 'null']` is how an optional field is usually spelled, and it must not
  // fall through to "no control for type string|null".
  expect(fieldsFor(contact).find((f) => f.path === 'notes')!.kind).toBe(
    'string'
  )
})

test('format picks the input type, and an unknown format stays text', () => {
  const byPath = Object.fromEntries(fieldsFor(contact).map((f) => [f.path, f]))
  expect(byPath.email.inputType).toBe('email')
  expect(byPath.homepage.inputType).toBe('url')
  expect(byPath.name.inputType).toBe('text')
  // A wrong input type silently refuses valid values — `type=date` will not accept
  // "circa 1920" — so an unrecognised format must fall back rather than guess.
  const odd = fieldsFor({
    type: 'object',
    properties: { when: { type: 'string', format: 'fuzzy-era' } },
  } as any)
  expect(odd[0].inputType).toBe('text')
})

test('required comes from the schema, not from presence', () => {
  const byPath = Object.fromEntries(fieldsFor(contact).map((f) => [f.path, f]))
  expect(byPath.name.required).toBe(true)
  expect(byPath.age.required).toBe(false)
})

test('title wins over the humanised key', () => {
  const byPath = Object.fromEntries(fieldsFor(contact).map((f) => [f.path, f]))
  expect(byPath.name.label).toBe('Full name')
  expect(byPath.homepage.label).toBe('homepage')
  expect(humanise('firstName')).toBe('first name')
  expect(humanise('first_name')).toBe('first name')
})

test('REGRESSION: what it cannot render is reported, never skipped', () => {
  /*
  A field that silently vanishes is indistinguishable from a schema that never mentioned it —
  and that is exactly how an editor loses data: the user never sees the field, so they never
  notice it is not being saved.
  */
  const fields = leafFields(
    fieldsFor({
      type: 'object',
      properties: {
        either: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        pair: { type: 'array', prefixItems: [{ type: 'string' }] },
      },
    } as any)
  )
  expect(fields.map((f) => f.path)).toEqual(['either', 'pair'])
  expect(fields.every((f) => f.kind === 'unsupported')).toBe(true)
  expect(fields[0].reason).toBe(
    'a union of string | number is not supported yet'
  )
  expect(fields[1].reason).toContain('tuple')
})

test('a schema with no properties yields no fields rather than throwing', () => {
  expect(fieldsFor({} as any)).toEqual([])
  expect(fieldsFor({ type: 'string' } as any)).toEqual([])
})

// ── the model, which owns the data ───────────────────────────────────────────

test('setByPath does not mutate the object it was given', () => {
  /*
  The consumer keeps the value they handed in, `diff(original, current)` stays a usable dirty
  check, and a `change` listener that stashes the event's value gets a stable snapshot rather
  than an object that keeps moving underneath it.
  */
  const original = { name: 'a', nested: { x: 1 } }
  const next = setByPath(original, 'name', 'b')
  expect(original.name).toBe('a')
  expect(next.name).toBe('b')
  expect(next.nested).toBe(original.nested) // untouched branches are shared, not cloned
})

test('setByPath writes nested paths, creating what it needs', () => {
  expect(setByPath({}, 'address.city', 'Perth')).toEqual({
    address: { city: 'Perth' },
  })
  expect(getByPath({ address: { city: 'Perth' } }, 'address.city')).toBe(
    'Perth'
  )
})

test('getByPath is total on missing branches', () => {
  expect(getByPath({}, 'a.b.c')).toBeUndefined()
  expect(getByPath(null, 'a')).toBeUndefined()
})

test('REGRESSION: a field the schema does not describe survives an edit', () => {
  /*
  The defect this design exists to prevent (snowfox SF-2): output rebuilt from the rendered
  inputs drops anything the schema does not mention, so editing one field discards timestamps
  and provenance. Here the model IS the data, so unmentioned keys are simply still there.
  */
  const stored = { name: 'a', updatedAt: '2020-01-01', _id: 'xyz' }
  const edited = setByPath(stored, 'name', 'b')
  expect(edited).toEqual({ name: 'b', updatedAt: '2020-01-01', _id: 'xyz' })
})

// ── errors, keyed to fields ──────────────────────────────────────────────────

const paths = () => fieldsFor(contact).map((f) => f.path)

test('REGRESSION: a missing required field is blamed on the FIELD, not the form', () => {
  /*
  The validator reports `path: "root", message: "Missing email"` — right for a validator,
  since the object failed its `required` contract, and wrong for a form: shown at the top,
  the user reads a complaint and has to work out which of fifteen inputs it means.
  */
  const errors = collectErrors(
    (onError) => validate({ name: 'a' }, contact, onError),
    paths()
  )
  expect(errorFor(errors, 'email')).toBeTruthy()
  expect(errors.every((e) => !e.path.startsWith('.'))).toBe(true)
})

test('errors the validator already keyed to a field are left alone', () => {
  const errors = collectErrors(
    (onError) =>
      validate({ name: 'a', email: 'a@b.com', age: 'nope' }, contact, onError),
    paths()
  )
  expect(errorFor(errors, 'age')).toContain('integer')
})

test('a "Missing x" for something we did NOT render stays on the form', () => {
  // Re-keying to a field that is not on screen would hide the error entirely. Better at the
  // top, attributed to nothing, than attached to an input that does not exist.
  const errors = collectErrors(
    (onError) => onError('root', 'Missing somethingElse'),
    paths()
  )
  expect(errors[0].path).toBe('')
})

test('a valid value produces no errors', () => {
  const value = {
    name: 'a',
    email: 'a@b.com',
    age: 3,
    score: 1.5,
    active: true,
    role: 'admin',
    kind: 'contact',
    homepage: 'https://x.com',
    notes: null,
  }
  expect(
    collectErrors((onError) => validate(value, contact, onError), paths())
  ).toEqual([])
})

test('errorFor returns undefined for a clean field', () => {
  const errors = collectErrors(
    (onError) => validate({ name: 'a' }, contact, onError),
    paths()
  )
  expect(errorFor(errors, 'name')).toBeUndefined()
})

// ── nested objects (slice 2) ─────────────────────────────────────────────────

const nested: any = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: {
      type: 'object',
      title: 'Postal address',
      properties: {
        city: { type: 'string' },
        zip: { type: 'integer' },
        geo: {
          type: 'object',
          properties: { lat: { type: 'number' }, lon: { type: 'number' } },
        },
      },
      required: ['city'],
    },
  },
  required: ['name', 'address'],
}

test('a nested object becomes a group, not a field', () => {
  const [, address] = fieldsFor(nested)
  expect('children' in address).toBe(true)
  expect((address as any).label).toBe('Postal address')
})

test('leaf paths are fully qualified, at any depth', () => {
  expect(leafFields(fieldsFor(nested)).map((f) => f.path)).toEqual([
    'name',
    'address.city',
    'address.zip',
    'address.geo.lat',
    'address.geo.lon',
  ])
})

test('required is scoped to the object that declares it', () => {
  // `required: ['city']` inside an optional address means "if you give an address, it needs
  // a city" — not that every form must have one.
  const byPath = Object.fromEntries(
    leafFields(fieldsFor(nested)).map((f) => [f.path, f])
  )
  expect(byPath['address.city'].required).toBe(true)
  expect(byPath['address.zip'].required).toBe(false)
})

test('values round-trip through nested paths', () => {
  const written = setByPath({}, 'address.geo.lat', 51.5)
  expect(getByPath(written, 'address.geo.lat')).toBe(51.5)
  expect(written).toEqual({ address: { geo: { lat: 51.5 } } })
})

test('REGRESSION: a nested missing-required error lands on the nested FIELD', () => {
  // Measured: the validator reports `path: "address", message: "Missing city"` — the object
  // that owns the `required` list, at whatever depth. The field it belongs to is that path
  // plus the key, or the user sees "Missing city" attached to the address section as a whole.
  const paths = leafFields(fieldsFor(nested)).map((f) => f.path)
  const errors = collectErrors(
    (onError) => validate({ name: 'a', address: {} }, nested, onError),
    paths
  )
  expect(errorFor(errors, 'address.city')).toBeTruthy()
})

test('a nested type error keeps the path the validator gave it', () => {
  const paths = leafFields(fieldsFor(nested)).map((f) => f.path)
  const errors = collectErrors(
    (onError) =>
      validate(
        { name: 'a', address: { city: 'X', zip: 'nope' } },
        nested,
        onError
      ),
    paths
  )
  expect(errorFor(errors, 'address.zip')).toContain('integer')
})

// ── arrays (slice 3) ─────────────────────────────────────────────────────────

const order: any = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          variants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                size: { type: 'string' },
                qty: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
}

test('REGRESSION: setByPath creates an ARRAY for a numeric segment', () => {
  // It built `{items: {0: {...}}}` — looks right in a debugger, serialises to the wrong JSON,
  // and fails validation against any `type: "array"` schema. Found by probing before writing
  // the array code.
  const written = setByPath({}, 'items.0.sku', 'x')
  expect(Array.isArray(written.items)).toBe(true)
  expect(written).toEqual({ items: [{ sku: 'x' }] })
})

test('array items expand against the VALUE, not the schema', () => {
  // The schema says nothing about how many elements there are, so `leafFields` must not
  // invent any — the component expands them per render.
  expect(leafFields(fieldsFor(order))).toEqual([])
  expect(
    itemFields(order.properties.items.items, 'items', 1).map(
      (n: any) => n.path ?? n
    )
  ).toBeTruthy()
})

test('a scalar item is one field at the index; an object item expands', () => {
  const scalars = itemFields({ type: 'string' } as any, 'tags', 2) as any[]
  expect(scalars[0].path).toBe('tags.2')
  const objects = itemFields(order.properties.items.items, 'items', 0) as any[]
  expect(objects.map((n) => n.path)).toEqual([
    'items.0.sku',
    'items.0.variants',
  ])
})

test('REGRESSION: reordering a NESTED array cannot corrupt its parent index', () => {
  /*
  This is snowfox SF-1, reproduced as data rather than as paths. Their reindexer ran
  `currentPath.replace(/\[\d+\]/, '[' + index + ']')` — unanchored and non-global — so moving
  `items[2].variants[1]` to index 0 produced `items[0].variants[1]`: the PARENT index
  clobbered with the child's position, the child index never updated, corrupting on every
  pass even when nothing had moved.

  Splicing the model has nowhere to put that bug. There are no path strings; the indices are
  wherever the elements now are.
  */
  const value = {
    items: [
      { sku: 'a', variants: [] },
      { sku: 'b', variants: [] },
      { sku: 'c', variants: [{ size: 'S' }, { size: 'M' }] },
    ],
  }
  const moved = moveItem(value, 'items.2.variants', 1, 0)
  // The child moved…
  expect(moved.items[2].variants.map((v: any) => v.size)).toEqual(['M', 'S'])
  // …and every parent is exactly where it was.
  expect(moved.items.map((i: any) => i.sku)).toEqual(['a', 'b', 'c'])
  expect(moved.items[0].variants).toEqual([])
})

test('insert, remove and move do not mutate the value they were given', () => {
  const value = { items: [{ sku: 'a' }, { sku: 'b' }] }
  const snapshot = JSON.stringify(value)
  insertAt(value, 'items', 1, { sku: 'x' })
  removeAt(value, 'items', 0)
  moveItem(value, 'items', 0, 1)
  expect(JSON.stringify(value)).toBe(snapshot)
})

test('insert and remove land where they say', () => {
  const value = { items: [{ sku: 'a' }, { sku: 'b' }] }
  expect(
    insertAt(value, 'items', 1, { sku: 'x' }).items.map((i: any) => i.sku)
  ).toEqual(['a', 'x', 'b'])
  expect(removeAt(value, 'items', 0).items.map((i: any) => i.sku)).toEqual([
    'b',
  ])
  expect(insertAt({}, 'tags', 0, 'first').tags).toEqual(['first'])
})

test('moving out of range is a no-op rather than a hole', () => {
  const value = { items: [{ sku: 'a' }] }
  expect(moveItem(value, 'items', 0, 5)).toBe(value)
  expect(moveItem(value, 'items', -1, 0)).toBe(value)
})

test('blankFor gives an item the right empty shape', () => {
  expect(blankFor({ type: 'object', properties: {} } as any)).toEqual({})
  expect(blankFor({ type: 'string' } as any)).toBe('')
  expect(blankFor({ type: 'boolean' } as any)).toBe(false)
  // A number starts EMPTY, not 0 — "not filled in" and "zero" are different states.
  expect(blankFor({ type: 'integer' } as any)).toBeUndefined()
})

test('array errors key to the element field the validator named', () => {
  const paths = ['items.1.sku', 'items.1.qty']
  const errors = collectErrors(
    (onError) => onError('items.1.qty', 'Expected integer'),
    paths
  )
  expect(errorFor(errors, 'items.1.qty')).toBe('Expected integer')
})

test('a missing required inside an array element lands on that element field', () => {
  // Measured: the validator reports `path: "items.0", message: "Missing sku"`.
  const errors = collectErrors(
    (onError) => onError('items.0', 'Missing sku'),
    ['items.0.sku']
  )
  expect(errorFor(errors, 'items.0.sku')).toBe('Missing sku')
})

/*
Unions. The measured behaviour that shapes these: tosijs-schema 1.7.0 enforces `anyOf` and
**silently ignores `oneOf`** (upstream #8), so a `oneOf` schema must still render — refusing
it would refuse most real-world variant schemas — while saying that it is not validated.
*/
const shapes: any = {
  type: 'object',
  properties: {
    shape: {
      oneOf: [
        {
          type: 'object',
          title: 'Circle',
          properties: { kind: { const: 'circle' }, r: { type: 'number' } },
          required: ['kind', 'r'],
        },
        {
          type: 'object',
          properties: {
            kind: { const: 'rect' },
            w: { type: 'number' },
            h: { type: 'number' },
          },
          required: ['kind', 'w', 'h'],
        },
      ],
    },
  },
}

test('a nullable union is just the field, and not required', () => {
  const [field]: any = fieldsFor({
    type: 'object',
    properties: {
      nickname: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    },
    required: ['nickname'],
  } as any)
  expect(field.kind).toBe('string')
  // `required` in the parent plus a null branch means "you may leave it empty".
  expect(field.required).toBe(false)
})

test('a union of consts collapses to a select, with branch titles as labels', () => {
  const [field]: any = fieldsFor({
    type: 'object',
    properties: {
      mode: {
        title: 'Mode',
        anyOf: [{ const: 'a', title: 'Alpha' }, { const: 'b' }],
      },
    },
  } as any)
  expect(field.kind).toBe('enum')
  expect(field.label).toBe('Mode')
  expect(field.options).toEqual([
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'b' },
  ])
})

test('a union of objects becomes a variant node with a derived discriminator', () => {
  const [node]: any = fieldsFor(shapes)
  expect(node.kind).toBe('union')
  expect(node.discriminator).toBe('kind')
  // A branch with no title is named for its discriminator value, not "option 2".
  expect(node.branches.map((b: any) => b.label)).toEqual(['Circle', 'rect'])
  expect(node.branches[0].marks).toEqual({ kind: 'circle' })
  // oneOf is not enforced by the validator, and the field says so rather than implying a
  // green form means a conforming value.
  expect(node.unvalidated).toEqual(['oneOf'])
})

test('an explicit discriminator wins over the derived one', () => {
  const [node]: any = fieldsFor({
    type: 'object',
    properties: {
      thing: {
        discriminator: { propertyName: 'flavour' },
        anyOf: [
          {
            type: 'object',
            properties: { kind: { const: 'x' }, flavour: { const: 'sweet' } },
          },
          {
            type: 'object',
            properties: { kind: { const: 'x' }, flavour: { const: 'sour' } },
          },
        ],
      },
    },
  } as any)
  expect(node.discriminator).toBe('flavour')
})

test('a union of mixed shapes is unsupported WITH a reason, never dropped', () => {
  const [field]: any = fieldsFor({
    type: 'object',
    properties: {
      id: { anyOf: [{ type: 'string' }, { type: 'object', properties: {} }] },
    },
  } as any)
  expect(field.kind).toBe('unsupported')
  expect(field.reason).toMatch(/union/)
})

test('matchBranch identifies a branch by its marks', () => {
  const [node]: any = fieldsFor(shapes)
  expect(matchBranch(node.branches, { kind: 'rect', w: 1, h: 2 })).toBe(1)
  expect(matchBranch(node.branches, { kind: 'circle' })).toBe(0)
  expect(matchBranch(node.branches, undefined)).toBe(-1)
})

test('matchBranch scores a partly-filled object rather than demanding every key', () => {
  // The component this design learned from required EVERY key to be present (its SF-10), so
  // a half-filled variant matched nothing and the editor showed the user an empty box.
  const branches = [
    {
      label: 'a',
      marks: {},
      schema: {
        type: 'object',
        properties: { p: {}, q: {} },
        required: ['p', 'q'],
      },
    },
    {
      label: 'b',
      marks: {},
      schema: { type: 'object', properties: { z: {} }, required: ['z'] },
    },
  ] as any
  expect(matchBranch(branches, { p: 1 })).toBe(0)
  expect(matchBranch(branches, { z: 1 })).toBe(1)
  expect(matchBranch(branches, {})).toBe(-1)
})

test('branchFields renders the matched branch and hides the discriminator', () => {
  const [node]: any = fieldsFor(shapes)
  const fields = branchFields(node, { shape: { kind: 'rect' } })
  expect(fields.map((f: any) => f.path)).toEqual(['shape.w', 'shape.h'])
})

test('switching branch writes the new marks and keeps overlapping data', () => {
  const [node]: any = fieldsFor(shapes)
  const before = { shape: { kind: 'circle', r: 3 }, _id: 'keep' }
  const after = selectBranch(before, node, 1)
  expect(after.shape.kind).toBe('rect')
  // Nothing is deleted: the form is an editor, not a filter. `r` is still there if the user
  // switches back, and `_id` was never the form's business.
  expect(after.shape.r).toBe(3)
  expect(after._id).toBe('keep')
  expect(before.shape.kind).toBe('circle')
})

test('leafFields leaves union leaves to the component, like array leaves', () => {
  // They depend on the VALUE (which branch matches), which this function never sees.
  expect(leafFields(fieldsFor(shapes))).toEqual([])
})

test('anyOf variants ARE validated, and errors key to the branch field', () => {
  const anyOfShapes = {
    ...shapes,
    properties: { shape: { anyOf: shapes.properties.shape.oneOf } },
  }
  const [node]: any = fieldsFor(anyOfShapes as any)
  expect(node.unvalidated).toBeUndefined()
  const paths = branchFields(node, { shape: { kind: 'circle' } }).map(
    (f: any) => f.path
  )
  const errors = collectErrors(
    (onError) => validate({ shape: { kind: 'circle' } }, anyOfShapes, onError),
    paths
  )
  // The validator collapses a branch failure to "Union mismatch" at the union's own path —
  // measured, not assumed — so that is where the form shows it.
  expect(errors.map((e) => e.path)).toEqual(['shape'])
})
