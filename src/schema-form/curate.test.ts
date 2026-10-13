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

test('an entry with `fields` curates what is inside an object, by relative path', () => {
  const { nodes, entries, unknown } = curateNodes(fieldsFor(schema), {
    thresholds: {
      caption: 'Limits',
      fields: { 'byDimension.account': 'Account', default: true, nope: true },
    },
  })
  const group = nodes[0] as any
  expect(group.label).toBe('Limits')
  expect(group.children.map((n: any) => n.path)).toEqual([
    'thresholds.byDimension.account',
    'thresholds.default',
    'thresholds.nope',
  ])
  expect(group.children[0].label).toBe('Account')
  expect(unknown).toEqual(['thresholds.nope'])
  // entries are keyed by absolute path, which is how the form finds them
  expect(entries.get('thresholds.byDimension.account')).toEqual({
    caption: 'Account',
  })
  expect(entries.has('thresholds')).toBe(true)
})

test('`base` makes paths relative, as for one array item', () => {
  const itemNodes = fieldsFor(
    {
      type: 'object',
      properties: {
        value: { type: 'number' },
        when: { type: 'object', properties: { company: { type: 'string' } } },
      },
    } as unknown as JSONSchema,
    'list.3'
  )
  const { nodes, entries } = curateNodes(
    itemNodes,
    { 'when.company': 'Company', value: true },
    'list.3'
  )
  expect(nodes.map((n) => n.path)).toEqual([
    'list.3.when.company',
    'list.3.value',
  ])
  expect(entries.get('list.3.when.company')?.caption).toBe('Company')
})

test('a section is a titled panel of curated fields, and shares the one-control rule', () => {
  const { nodes, overlapping, entries } = curateNodes(fieldsFor(schema), {
    name: true,
    more: {
      section: 'More',
      collapsed: true,
      fields: { 'thresholds.default': 'Default', name: true },
    },
    later: { section: 'Later', fields: { thresholds: true } },
  })
  expect(nodes.map((n) => n.path)).toEqual(['name', '', ''])
  const more = nodes[1] as any
  expect(more.kind).toBe('group')
  expect(more.section).toBe('more')
  expect(more.label).toBe('More')
  expect(more.collapsed).toBe(true)
  expect(more.children.map((n: any) => n.path)).toEqual(['thresholds.default'])
  expect((nodes[2] as any).children).toEqual([])
  // shown above, and inside something shown in an earlier section
  expect(overlapping).toEqual(['name', 'thresholds'])
  // a section's id is not a path and gets no entry
  expect(entries.has('more')).toBe(false)
})

test('`elsewhere` leaves out a path without a placeholder', () => {
  const { nodes, unknown } = curateNodes(
    fieldsFor(schema),
    { name: true, rate: true, bogus: true },
    '',
    (path) => path === 'rate'
  )
  expect(nodes.map((n) => n.path)).toEqual(['name', 'bogus'])
  expect(unknown).toEqual(['bogus'])
})

test('keys a curation does not have are reported', () => {
  const { badKeys } = curateNodes(fieldsFor(schema), {
    name: { caption: 'Name', label: 'nope' } as any,
    s: { section: 'S', fields: {}, open: true } as any,
  })
  expect(badKeys).toEqual([
    { path: 'name', keys: ['label'] },
    { path: 's', keys: ['open'] },
  ])
})

test('an unknown path keeps its help and loses its editor', () => {
  const { entries } = curateNodes(fieldsFor(schema), {
    ghost: { help: 'h', editor: () => document.createElement('input') },
  })
  expect(entries.get('ghost')).toEqual({ help: 'h' })
})

test('one editor function is one plugin', () => {
  const editor = () => document.createElement('input')
  expect(editorPlugin(editor)).toBe(editorPlugin(editor))
})
