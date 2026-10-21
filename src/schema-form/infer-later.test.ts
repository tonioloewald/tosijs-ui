import { test, expect, afterEach } from 'bun:test'
import { setSchemaValidator, getSchemaValidator } from './validator.js'
import { tosiSchemaForm } from '../schema-form.js'

/*
A schema inferred from an EMPTY value must not stick (found through <tosi-crud>'s New, which
hands a schema-less form a record with fields after it first rendered with `{}`).
*/
const previous = getSchemaValidator()
afterEach(() => setSchemaValidator(previous))

test('a form that inferred nothing from {} infers again once it has a value with fields', () => {
  setSchemaValidator({
    validate: () => ({ valid: true, errors: [] } as any),
    inferSchema: (value: any) => ({
      type: 'object',
      properties: Object.fromEntries(
        Object.keys(value ?? {}).map((k) => [k, { type: 'string' }])
      ),
    }),
  } as any)
  const form = tosiSchemaForm() as any
  document.body.append(form)
  form.value = {}
  form.render()
  expect(Object.keys(form.schema.properties ?? {})).toEqual([])
  form.value = { name: '' }
  form.render()
  expect(Object.keys(form.schema.properties)).toEqual(['name'])
  form.remove()
})
