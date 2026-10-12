import { test, expect } from 'bun:test'
import { fieldsFor } from './fields'
import {
  curateNodes,
  curatedField,
  findNode,
  hiddenErrors,
  editorPlugin,
} from './curate'
import type { JSONSchema } from './json-schema'

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Full name' },
    thresholds: {
      type: 'object',
      properties: {
        default: { type: 'number', minimum: 0, maximum: 1 },
        byDimension: {
          type: 'object',
          properties: { account: { type: 'number' } },
        },
      },
      required: ['default'],
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
} as unknown as JSONSchema

test('findNode walks object properties by dotted path', () => {
  const nodes = fieldsFor(schema)
  expect(findNode(nodes, 'name')?.label).toBe('Full name')
  expect(findNode(nodes, 'thresholds.byDimension.account')?.path).toBe(
    'thresholds.byDimension.account'
  )
  expect(findNode(nodes, 'thresholds')?.kind).toBe('group')
  expect(findNode(nodes, 'tags')?.kind).toBe('array')
  expect(findNode(nodes, 'thresholds.nope')).toBeUndefined()
  // a path is not a prefix match: `nam` is not `name`, `thresholdsX.default` is not ours
  expect(findNode(nodes, 'nam')).toBeUndefined()
  expect(findNode(nodes, 'thresholdsX.default')).toBeUndefined()
})

test('curateNodes keeps the curation order, captions, and schema facts', () => {
  const { nodes, unknown } = curateNodes(fieldsFor(schema), {
    'thresholds.default': { caption: 'Default threshold' },
    name: true,
    tags: 'Labels',
  })
  expect(unknown).toEqual([])
  expect(nodes.map((n) => n.path)).toEqual([
    'thresholds.default',
    'name',
    'tags',
  ])
  expect(nodes.map((n) => n.label)).toEqual([
    'Default threshold',
    'Full name',
    'Labels',
  ])
  // required comes from the parent's `required`, and the constraints ride along
  expect(nodes[0].required).toBe(true)
  expect(nodes[0].schema.maximum).toBe(1)
})

test('a path the schema does not describe becomes a visible placeholder', () => {
  const { nodes, unknown } = curateNodes(fieldsFor(schema), {
    name: true,
    'routing.mode': { caption: 'Routing' },
  })
  expect(unknown).toEqual(['routing.mode'])
  expect(nodes.length).toBe(2)
  expect(nodes[1].kind).toBe('unsupported')
  expect(nodes[1].label).toBe('Routing')
  expect((nodes[1] as any).reason).toContain('routing.mode')
})

test('curation does not alter the nodes it was given', () => {
  const full = fieldsFor(schema)
  const before = JSON.stringify(full)
  curateNodes(full, { name: 'Renamed' })
  expect(JSON.stringify(full)).toBe(before)
})

test('curatedField normalises the shorthands', () => {
  expect(curatedField(true)).toEqual({})
  expect(curatedField('Caption')).toEqual({ caption: 'Caption' })
  expect(curatedField({ help: 'h' })).toEqual({ help: 'h' })
})

test('hiddenErrors is every error with no field to show it under', () => {
  const errors = [
    { path: 'name', message: 'Expected string' },
    { path: 'thresholds.byDimension.account', message: 'Expected number' },
    { path: '', message: 'Missing email' },
  ]
  expect(hiddenErrors(errors, ['name', 'thresholds.default'])).toEqual([
    errors[1],
    errors[2],
  ])
  expect(hiddenErrors(errors, [])).toEqual(errors)
})

test('a function editor is hosted through value and change', () => {
  const plugin = editorPlugin(() => document.createElement('input'))
  const sets: unknown[] = []
  const el = plugin.render({
    schema: {} as JSONSchema,
    path: 'name',
    label: 'Name',
    required: false,
    value: 'Ada',
    set: (v) => sets.push(v),
    elements: {} as any,
  }) as HTMLInputElement
  expect(el.value).toBe('Ada')

  let leaked = 0
  const host = document.createElement('div')
  host.append(el)
  host.addEventListener('change', () => (leaked += 1))
  host.addEventListener('input', () => (leaked += 1))

  el.value = 'Grace'
  el.dispatchEvent(new Event('input', { bubbles: true }))
  // the blur that follows typing reports the same value: one write, not two
  el.dispatchEvent(new Event('change', { bubbles: true }))
  expect(sets).toEqual(['Grace'])
  expect(leaked).toBe(0)

  plugin.sync(el, undefined)
  expect(el.value).toBe('')
  plugin.sync(el, 'Linus')
  expect(el.value).toBe('Linus')
})

test('a FieldPlugin editor is used as it is', () => {
  const plugin = { render: () => document.createElement('div'), sync() {} }
  expect(editorPlugin(plugin)).toBe(plugin)
})

test('an editor edit back to an earlier value is written after an outside change', () => {
  const plugin = editorPlugin(() => document.createElement('input'))
  const sets: unknown[] = []
  const el = plugin.render({
    schema: {} as JSONSchema,
    path: 'name',
    label: 'Name',
    required: false,
    value: 'a',
    set: (v) => sets.push(v),
    elements: {} as any,
  }) as HTMLInputElement
  const type = (text: string) => {
    el.value = text
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
  type('b')
  // the form's value is set back from outside (another record, a revert)
  plugin.sync(el, 'a')
  type('b')
  expect(sets).toEqual(['b', 'b'])
})

test('an object and one of its properties cannot both be curated', () => {
  const { nodes, overlapping } = curateNodes(fieldsFor(schema), {
    thresholds: true,
    'thresholds.default': 'Default',
    name: true,
  })
  expect(nodes.map((n) => n.path)).toEqual(['thresholds', 'name'])
  expect(overlapping).toEqual(['thresholds.default'])
  // either order: the first one named wins
  const other = curateNodes(fieldsFor(schema), {
    'thresholds.default': 'Default',
    thresholds: true,
  })
  expect(other.nodes.map((n) => n.path)).toEqual(['thresholds.default'])
  expect(other.overlapping).toEqual(['thresholds'])
  // sibling names that merely share a prefix do not overlap
  expect(
    curateNodes(fieldsFor(schema), { name: true, tags: true }).overlapping
  ).toEqual([])
})
