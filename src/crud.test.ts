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
  // No title, no name — the table humanises the prop itself rather than being handed a
  // second, competing guess.
  expect(columns[1].name).toBeUndefined()
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
