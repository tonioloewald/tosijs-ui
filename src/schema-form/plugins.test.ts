import { test, expect } from 'bun:test'
import {
  registerFieldPlugin,
  fieldPlugin,
  onFieldPluginsChanged,
  schemaUsesFormat,
} from './plugins'

const stub = (tag: string) => ({
  render: () => ({ tag } as any),
  sync: () => {},
})

test('a format is claimed, and the last registration wins', () => {
  expect(fieldPlugin('nope')).toBeUndefined()
  expect(fieldPlugin(undefined)).toBeUndefined()
  registerFieldPlugin('swatch', stub('first'))
  registerFieldPlugin('swatch', stub('second'))
  // Last wins, so an application can override a library's default for its own pages.
  expect((fieldPlugin('swatch') as any).render().tag).toBe('second')
})

test('listeners hear WHICH format was claimed', () => {
  const heard: string[] = []
  onFieldPluginsChanged((format) => heard.push(format))
  registerFieldPlugin('heard-me', stub('x'))
  expect(heard).toEqual(['heard-me'])
})

test('schemaUsesFormat finds a format at any depth', () => {
  /*
  This is what decides whether a live form rebuilds when a plugin registers. Too narrow and a
  form using the format silently misses it; too broad and every unrelated form on the page
  throws away its DOM — including the focus and scroll this component exists to preserve.
  */
  const schema: any = {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            score: { type: 'number', format: 'percent' },
          },
        },
      },
      shape: { anyOf: [{ type: 'string', format: 'colour' }] },
    },
  }
  expect(schemaUsesFormat(schema, 'percent')).toBe(true)
  expect(schemaUsesFormat(schema, 'colour')).toBe(true)
  expect(schemaUsesFormat(schema, 'email')).toBe(false)
  expect(schemaUsesFormat(undefined, 'percent')).toBe(false)
})
