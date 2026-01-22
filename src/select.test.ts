import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { XinSelect, xinSelect } from './select'

describe('XinSelect', () => {
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
      const select = xinSelect()
      container.appendChild(select)
      expect(select).toBeInstanceOf(XinSelect)
      expect(select.tagName.toLowerCase()).toBe('xin-select')
    })

    test('initializes with default values', () => {
      const select = xinSelect()
      container.appendChild(select)
      expect(select.value).toBe('')
      expect(select.editable).toBe(false)
      expect(select.disabled).toBe(false)
      expect(select.placeholder).toBe('')
    })

    test('accepts initial value', () => {
      const select = xinSelect({ value: 'test-value' })
      container.appendChild(select)
      expect(select.value).toBe('test-value')
    })

    test('accepts options as string', () => {
      const select = xinSelect({ options: 'one,two,three' })
      container.appendChild(select)
      expect(select.selectOptions).toEqual(['one', 'two', 'three'])
    })

    test('accepts options as array', () => {
      const options = [
        { caption: 'One', value: '1' },
        { caption: 'Two', value: '2' },
      ]
      const select = xinSelect({ options })
      container.appendChild(select)
      expect(select.options).toEqual(options)
    })

    test('handles separator in options string', () => {
      const select = xinSelect({ options: 'one,,two' })
      container.appendChild(select)
      expect(select.selectOptions).toEqual(['one', null, 'two'])
    })
  })

  describe('accessibility', () => {
    test('input has role="combobox"', () => {
      const select = xinSelect({ options: 'a,b,c' })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('role')).toBe('combobox')
    })

    test('input has aria-haspopup="listbox"', () => {
      const select = xinSelect({ options: 'a,b,c' })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('aria-haspopup')).toBe('listbox')
    })

    test('input has aria-expanded="false" initially', () => {
      const select = xinSelect({ options: 'a,b,c' })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('aria-expanded')).toBe('false')
    })

    test('aria-autocomplete is "none" when not editable', () => {
      const select = xinSelect({ options: 'a,b,c', editable: false })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('aria-autocomplete')).toBe('none')
    })
  })

  describe('value handling', () => {
    test('displays value even if not in options', () => {
      const select = xinSelect({ options: 'a,b,c', value: 'not-an-option' })
      container.appendChild(select)
      expect(select.value).toBe('not-an-option')
    })

    test('findOption returns matching option', () => {
      const select = xinSelect({
        options: [
          { caption: 'Alpha', value: 'a' },
          { caption: 'Beta', value: 'b' },
        ],
        value: 'b',
      })
      container.appendChild(select)
      const option = select.findOption()
      expect(option.caption).toBe('Beta')
      expect(option.value).toBe('b')
    })

    test('findOption returns value as caption when not found', () => {
      const select = xinSelect({ options: 'a,b,c', value: 'unknown' })
      container.appendChild(select)
      const option = select.findOption()
      expect(option.caption).toBe('unknown')
      expect(option.value).toBe('unknown')
    })

    test('allOptions flattens nested options', () => {
      const select = xinSelect({
        options: [
          { caption: 'A', value: 'a' },
          {
            caption: 'Group',
            options: [
              { caption: 'B', value: 'b' },
              { caption: 'C', value: 'c' },
            ],
          },
        ],
      })
      container.appendChild(select)
      const all = select.allOptions
      expect(all.length).toBe(3)
      expect(all.map((o) => o.value)).toEqual(['a', 'b', 'c'])
    })
  })

  describe('disabled state', () => {
    test('disabled property is set correctly', () => {
      const select = xinSelect({ options: 'a,b,c', disabled: true })
      container.appendChild(select)
      expect(select.disabled).toBe(true)
    })

    test('disabled defaults to false', () => {
      const select = xinSelect({ options: 'a,b,c' })
      container.appendChild(select)
      expect(select.disabled).toBe(false)
    })
  })

  describe('editable mode', () => {
    test('editable property is set correctly', () => {
      const select = xinSelect({ options: 'a,b,c', editable: true })
      container.appendChild(select)
      expect(select.editable).toBe(true)
    })

    test('editable defaults to false', () => {
      const select = xinSelect({ options: 'a,b,c' })
      container.appendChild(select)
      expect(select.editable).toBe(false)
    })
  })
})
