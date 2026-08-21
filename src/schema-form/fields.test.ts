import { test, expect } from 'bun:test'
import { validate } from 'tosijs-schema'
import {
  fieldsFor,
  leafFields,
  getByPath,
  setByPath,
  collectErrors,
  errorFor,
  humanise,
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

test('REGRESSION: what slice 1 cannot render is reported, never skipped', () => {
  /*
  A field that silently vanishes is indistinguishable from a schema that never mentioned it —
  and that is exactly how an editor loses data: the user never sees the field, so they never
  notice it is not being saved.
  */
  const fields = leafFields(
    fieldsFor({
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        either: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      },
    } as any)
  )
  expect(fields.map((f) => f.path)).toEqual(['tags', 'either'])
  expect(fields.every((f) => f.kind === 'unsupported')).toBe(true)
  expect(fields[0].reason).toContain('arrays')
  expect(fields[1].reason).toContain('unions')
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
