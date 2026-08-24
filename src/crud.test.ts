import { test, expect } from 'bun:test'
import { columnsFromSchema } from './crud'

/*
The DOM half of `<tosi-crud>` is covered by the inline doc tests, which run in a real browser
against real store adapters. This is the pure part: one description of a shape driving both
the form and the table's columns.
*/

test('columns come from the schema, in declaration order, with titles', () => {
  const columns = columnsFromSchema({
    type: 'object',
    properties: {
      sku: { type: 'string', title: 'SKU' },
      qty: { type: 'integer' },
      active: { type: 'boolean' },
    },
  } as any)
  expect(columns.map((c) => c.prop)).toEqual(['sku', 'qty', 'active'])
  expect(columns[0].name).toBe('SKU')
  /*
  A title-less property gets a HUMANISED name, not the raw key.

  This assertion previously required `undefined`, on the theory that the table would humanise
  it. It does not — `data-table.ts:2232` renders `typeof col.name === 'string' ? col.name :
  col.prop` — so a supplied `columns` array produced headers reading `firstName` and
  `createdAt` while the form beside it showed "first name". The test was pinning the bug.
  */
  expect(columns[1].name).toBe('qty')
})

test('a camelCase property is humanised for the header', () => {
  const columns = columnsFromSchema({
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      createdAt: { type: 'string' },
    },
  } as any)
  expect(columns.map((c) => c.name)).toEqual(['first name', 'created at'])
})

test('a nullable union column keeps its type', () => {
  // `{anyOf: [{type:'boolean'}, {type:'null'}]}` is the common optional spelling, and reading
  // `propSchema.type` directly missed it: a wide text column rendering raw true/false.
  const columns = columnsFromSchema({
    type: 'object',
    properties: { active: { anyOf: [{ type: 'boolean' }, { type: 'null' }] } },
  } as any)
  expect(columns[0].type).toContain('boolean')
  expect(columns[0].width).toBe(80)
})

test('a schema knows about a property no row has filled in', () => {
  /*
  This is the reason to prefer a schema over the table's own inference, which reads
  `Object.keys(array[0])` — a key missing from the FIRST row silently loses its column.
  */
  const columns = columnsFromSchema({
    type: 'object',
    properties: {
      id: { type: 'integer' },
      archivedAt: { type: 'string', format: 'date-time' },
    },
  } as any)
  expect(columns.map((c) => c.prop)).toEqual(['id', 'archivedAt'])
})

test('widths are typed, and booleans render as a check', () => {
  const columns = columnsFromSchema({
    type: 'object',
    properties: {
      note: { type: 'string' },
      count: { type: 'number' },
      done: { type: 'boolean' },
    },
  } as any)
  expect(columns[0].width).toBeGreaterThan(columns[1].width)
  expect(columns[2].type).toContain('boolean')
})

test('a nullable property takes the type of its non-null half', () => {
  const columns = columnsFromSchema({
    type: 'object',
    properties: { done: { type: ['boolean', 'null'] } },
  } as any)
  expect(columns[0].type).toContain('boolean')
})

test('a schema with no properties yields no columns rather than throwing', () => {
  expect(columnsFromSchema({ type: 'object' } as any)).toEqual([])
  expect(columnsFromSchema(undefined as any)).toEqual([])
})
