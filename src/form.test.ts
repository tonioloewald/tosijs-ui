import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { TosiForm, tosiForm, TosiField, tosiField } from './form'
import { tosiRating } from './rating'
import { tosiSelect } from './select'
import { tosiSegmented } from './segmented'
import { tosiTagList } from './tag-list'

describe('TosiForm', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  describe('initialization', () => {
    test('creates a custom element', () => {
      const form = tosiForm()
      container.appendChild(form)
      expect(form).toBeInstanceOf(TosiForm)
      expect(form.tagName.toLowerCase()).toBe('tosi-form')
    })

    test('value defaults to empty object', () => {
      const form = tosiForm()
      container.appendChild(form)
      expect(form.value).toEqual({})
    })

    test('accepts initial value as JSON string attribute', () => {
      const form = tosiForm({ value: '{"name": "test"}' })
      container.appendChild(form)
      expect(form.fields.name).toBe('test')
    })
  })

  describe('fields proxy', () => {
    test('fields getter parses JSON value', () => {
      const form = tosiForm({ value: '{"a": 1, "b": "two"}' })
      container.appendChild(form)
      expect(form.fields.a).toBe(1)
      expect(form.fields.b).toBe('two')
    })

    test('fields setter updates field values', () => {
      const form = tosiForm()
      const field = tosiField({ key: 'test' })
      form.appendChild(field)
      container.appendChild(form)

      form.fields = { test: 'hello' }
      expect(field.value).toBe('hello')
    })

    test('setting field value dispatches change event', () => {
      const form = tosiForm()
      container.appendChild(form)

      let changed = false
      form.addEventListener('change', () => {
        changed = true
      })

      form.fields.newKey = 'newValue'
      expect(changed).toBe(true)
    })
  })

  describe('formAssociated component initialization', () => {
    test('initializes tosi-rating from form value', () => {
      const form = tosiForm({ value: '{"rating": 4}' })
      const rating = tosiRating({ name: 'rating' })
      form.appendChild(rating)
      container.appendChild(form)

      expect(rating.value).toBe(4)
    })

    test('initializes tosi-select from form value', () => {
      const form = tosiForm({ value: '{"country": "uk"}' })
      const select = tosiSelect({ name: 'country', options: 'us,uk,ca' })
      form.appendChild(select)
      container.appendChild(form)

      expect(select.value).toBe('uk')
    })

    test('initializes tosi-segmented from form value', () => {
      const form = tosiForm({ value: '{"tier": "pro"}' })
      const segmented = tosiSegmented({
        name: 'tier',
        choices: 'free,pro,enterprise',
      })
      form.appendChild(segmented)
      container.appendChild(form)

      expect(segmented.value).toBe('pro')
    })

    test('initializes tosi-tag-list from form value', () => {
      const form = tosiForm({ value: '{"tags": "a,b"}' })
      const tagList = tosiTagList({ name: 'tags' })
      form.appendChild(tagList)
      container.appendChild(form)

      expect(tagList.value).toBe('a,b')
      expect(tagList.tags).toEqual(['a', 'b'])
    })
  })

  describe('formAssociated component change tracking', () => {
    test('updates form value when tosi-rating changes', async () => {
      const form = tosiForm()
      const rating = tosiRating({ name: 'rating' })
      form.appendChild(rating)
      container.appendChild(form)

      // Wait for components to be ready
      await new Promise((r) => setTimeout(r, 10))

      rating.value = 5
      rating.dispatchEvent(new Event('change', { bubbles: true }))

      expect(form.fields.rating).toBe(5)
    })

    test('updates form value when tosi-select changes', async () => {
      const form = tosiForm()
      const select = tosiSelect({ name: 'choice', options: 'a,b,c' })
      form.appendChild(select)
      container.appendChild(form)

      await new Promise((r) => setTimeout(r, 10))

      select.value = 'b'
      select.dispatchEvent(new Event('change', { bubbles: true }))

      expect(form.fields.choice).toBe('b')
    })

    test('updates form value when tosi-segmented changes', async () => {
      const form = tosiForm()
      const segmented = tosiSegmented({ name: 'option', choices: 'x,y,z' })
      form.appendChild(segmented)
      container.appendChild(form)

      await new Promise((r) => setTimeout(r, 10))

      segmented.value = 'y'
      segmented.dispatchEvent(new Event('change', { bubbles: true }))

      expect(form.fields.option).toBe('y')
    })
  })

  describe('submit handling', () => {
    test('calls submitCallback with value and validity', () => {
      const form = tosiForm({ value: '{"test": "value"}' })
      container.appendChild(form)

      let receivedValue: any
      let receivedValidity: boolean | undefined

      form.submitCallback = (value, isValid) => {
        receivedValue = value
        receivedValidity = isValid
      }

      form.submit()

      expect(receivedValue).toEqual({ test: 'value' })
      expect(receivedValidity).toBe(true)
    })

    test('submit parses JSON string value', () => {
      const form = tosiForm({ value: '{"parsed": true}' })
      container.appendChild(form)

      let receivedValue: any

      form.submitCallback = (value) => {
        receivedValue = value
      }

      form.submit()

      expect(receivedValue).toEqual({ parsed: true })
      expect(typeof receivedValue).toBe('object')
    })
  })
})

describe('TosiField', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  describe('initialization', () => {
    test('creates a custom element', () => {
      const field = tosiField({ key: 'test' })
      container.appendChild(field)
      expect(field).toBeInstanceOf(TosiField)
      expect(field.tagName.toLowerCase()).toBe('tosi-field')
    })

    test('accepts key property', () => {
      const field = tosiField({ key: 'myKey' })
      container.appendChild(field)
      expect(field.key).toBe('myKey')
    })

    test('accepts caption property', () => {
      const field = tosiField({ caption: 'My Caption' })
      container.appendChild(field)
      expect(field.caption).toBe('My Caption')
    })

    test('fields are required by default', () => {
      const field = tosiField({ key: 'test' })
      container.appendChild(field)
      expect(field.optional).toBe(false)
    })

    test('accepts optional property', () => {
      const field = tosiField({ key: 'test', optional: true })
      container.appendChild(field)
      expect(field.optional).toBe(true)
    })
  })

  describe('input types', () => {
    test('creates text input by default', async () => {
      const field = tosiField({ key: 'test' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      // Empty type means text input
      expect(input.type).toBe('text')
    })

    test('creates checkbox for type="checkbox"', async () => {
      const field = tosiField({ key: 'test', type: 'checkbox' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.type).toBe('checkbox')
    })

    test('creates number input for type="number"', async () => {
      const field = tosiField({ key: 'test', type: 'number' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.type).toBe('number')
    })

    test('creates range input for type="range"', async () => {
      const field = tosiField({ key: 'test', type: 'range' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.type).toBe('range')
    })

    test('creates date input for type="date"', async () => {
      const field = tosiField({ key: 'test', type: 'date' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.type).toBe('date')
    })
  })

  describe('validation attributes', () => {
    test('applies pattern attribute', async () => {
      const field = tosiField({ key: 'test', pattern: '\\d+' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.pattern).toBe('\\d+')
    })

    test('applies placeholder attribute', async () => {
      const field = tosiField({ key: 'test', placeholder: 'Enter value' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.placeholder).toBe('Enter value')
    })

    test('applies min attribute', async () => {
      const field = tosiField({ key: 'test', type: 'number', min: '0' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.min).toBe('0')
    })

    test('applies max attribute', async () => {
      const field = tosiField({ key: 'test', type: 'number', max: '100' })
      container.appendChild(field)
      await new Promise((r) => setTimeout(r, 10))
      const input = field.parts.valueHolder as HTMLInputElement
      expect(input.max).toBe('100')
    })
  })
})
