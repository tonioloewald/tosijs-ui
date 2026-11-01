import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { TosiSelect, tosiSelect } from './select.js'

describe('TosiSelect', () => {
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
      const select = tosiSelect()
      container.appendChild(select)
      expect(select).toBeInstanceOf(TosiSelect)
      expect(select.tagName.toLowerCase()).toBe('tosi-select')
    })

    test('initializes with default values', () => {
      const select = tosiSelect()
      container.appendChild(select)
      expect(select.value).toBe('')
      expect(select.editable).toBe(false)
      expect(select.disabled).toBe(false)
      expect(select.placeholder).toBe('')
    })

    test('accepts initial value', () => {
      const select = tosiSelect({ value: 'test-value' })
      container.appendChild(select)
      expect(select.value).toBe('test-value')
    })

    test('accepts options as string', () => {
      const select = tosiSelect({ options: 'one,two,three' })
      container.appendChild(select)
      expect(select.selectOptions).toEqual([
        { value: 'one', caption: 'one' },
        { value: 'two', caption: 'two' },
        { value: 'three', caption: 'three' },
      ])
    })

    test('accepts options as array', () => {
      const options = [
        { caption: 'One', value: '1' },
        { caption: 'Two', value: '2' },
      ]
      const select = tosiSelect()
      select.options = options
      container.appendChild(select)
      expect(select.selectOptions).toEqual(options)
    })

    test('handles separator in options string', () => {
      const select = tosiSelect({ options: 'one,,two' })
      container.appendChild(select)
      expect(select.selectOptions).toEqual([
        { value: 'one', caption: 'one' },
        null,
        { value: 'two', caption: 'two' },
      ])
    })

    test('parses value=caption format', () => {
      const select = tosiSelect({
        options: 'us=United States,uk=United Kingdom',
      })
      container.appendChild(select)
      expect(select.selectOptions).toEqual([
        { value: 'us', caption: 'United States', icon: undefined },
        { value: 'uk', caption: 'United Kingdom', icon: undefined },
      ])
    })

    test('parses value=caption:icon format', () => {
      const select = tosiSelect({
        options: 'yes=Yes:thumbsUp,no=No:thumbsDown',
      })
      container.appendChild(select)
      expect(select.selectOptions).toEqual([
        { value: 'yes', caption: 'Yes', icon: 'thumbsUp' },
        { value: 'no', caption: 'No', icon: 'thumbsDown' },
      ])
    })

    test('an icon may hold a colon (an explicit rule, `check:square`)', () => {
      const select = tosiSelect({ options: 'done=Done:check:square' })
      container.appendChild(select)
      expect(select.selectOptions).toEqual([
        { value: 'done', caption: 'Done', icon: 'check:square' },
      ])
    })
  })

  describe('accessibility', () => {
    test('input has role="combobox"', () => {
      const select = tosiSelect({ options: 'a,b,c' })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('role')).toBe('combobox')
    })

    test('input has aria-haspopup="listbox"', () => {
      const select = tosiSelect({ options: 'a,b,c' })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('aria-haspopup')).toBe('listbox')
    })

    test('input has aria-expanded="false" initially', () => {
      const select = tosiSelect({ options: 'a,b,c' })
      container.appendChild(select)
      const input = select.querySelector('input[part="value"]')
      expect(input?.getAttribute('aria-expanded')).toBe('false')
    })

    test('a select you pick from is its button: one combobox, no input inside it (#3571)', () => {
      const select = tosiSelect({ options: 'a,b,c', value: 'b' })
      container.appendChild(select)
      select.render()
      const button = select.querySelector('button[part="button"]')!
      expect(button.getAttribute('role')).toBe('combobox')
      expect(button.getAttribute('aria-haspopup')).toBe('listbox')
      expect(button.querySelector('input')).toBeNull()
      expect(select.querySelector('[part="caption"]')!.textContent).toBe('b')
      expect(
        (select.querySelector('[part="field"]') as HTMLElement).hidden
      ).toBe(true)
    })

    test('an editable select is its input, outside the button', () => {
      const select = tosiSelect({ options: 'a,b,c', editable: true })
      container.appendChild(select)
      select.render()
      const button = select.querySelector(
        'button[part="button"]'
      ) as HTMLElement
      const field = select.querySelector('[part="field"]') as HTMLElement
      expect(button.hidden).toBe(true)
      expect(field.hidden).toBe(false)
      expect(
        field.querySelector('input')?.getAttribute('aria-autocomplete')
      ).toBe('list')
    })

    test('the combobox is named by title, a wrapping label, or the placeholder', () => {
      const titled = tosiSelect({ options: 'a', title: 'paragraph style' })
      container.appendChild(titled)
      titled.render()
      expect(
        titled
          .querySelector('button[part="button"]')!
          .getAttribute('aria-label')
      ).toBe('paragraph style')

      const label = document.createElement('label')
      label.append('Country ')
      const labelled = tosiSelect({ options: 'a', value: 'a' })
      label.append(labelled)
      container.appendChild(label)
      labelled.render()
      expect(
        labelled
          .querySelector('button[part="button"]')!
          .getAttribute('aria-label')
      ).toBe('Country')

      const placeheld = tosiSelect({
        options: 'a',
        placeholder: 'pick an icon',
      })
      container.appendChild(placeheld)
      placeheld.render()
      expect(
        placeheld
          .querySelector('button[part="button"]')!
          .getAttribute('aria-label')
      ).toBe('pick an icon')
    })
  })

  describe('value handling', () => {
    test('displays value even if not in options', () => {
      const select = tosiSelect({ options: 'a,b,c', value: 'not-an-option' })
      container.appendChild(select)
      expect(select.value).toBe('not-an-option')
    })

    test('findOption returns matching option', () => {
      const select = tosiSelect({ value: 'b' })
      select.options = [
        { caption: 'Alpha', value: 'a' },
        { caption: 'Beta', value: 'b' },
      ]
      container.appendChild(select)
      const option = select.findOption()
      expect(option.caption).toBe('Beta')
      expect(option.value).toBe('b')
    })

    test('findOption returns value as caption when not found', () => {
      const select = tosiSelect({ options: 'a,b,c', value: 'unknown' })
      container.appendChild(select)
      const option = select.findOption()
      expect(option.caption).toBe('unknown')
      expect(option.value).toBe('unknown')
    })

    test('allOptions flattens nested options', () => {
      const select = tosiSelect()
      select.options = [
        { caption: 'A', value: 'a' },
        {
          caption: 'Group',
          options: [
            { caption: 'B', value: 'b' },
            { caption: 'C', value: 'c' },
          ],
        },
      ]
      container.appendChild(select)
      const all = select.allOptions
      expect(all.length).toBe(3)
      expect(all.map((o) => o.value)).toEqual(['a', 'b', 'c'])
    })
  })

  describe('disabled state', () => {
    test('disabled property is set correctly', () => {
      const select = tosiSelect({ options: 'a,b,c', disabled: true })
      container.appendChild(select)
      expect(select.disabled).toBe(true)
    })

    test('disabled defaults to false', () => {
      const select = tosiSelect({ options: 'a,b,c' })
      container.appendChild(select)
      expect(select.disabled).toBe(false)
    })
  })

  describe('editable mode', () => {
    test('editable property is set correctly', () => {
      const select = tosiSelect({ options: 'a,b,c', editable: true })
      container.appendChild(select)
      expect(select.editable).toBe(true)
    })

    test('editable defaults to false', () => {
      const select = tosiSelect({ options: 'a,b,c' })
      container.appendChild(select)
      expect(select.editable).toBe(false)
    })
  })
})

describe('option shortcuts (#188)', () => {
  const press = (key: string) =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true })
    )
  const options = [
    { caption: 'One', value: 'one', shortcut: 'ctrl-1' },
    { caption: 'Two', value: 'two', shortcut: 'ctrl-2' },
  ]

  test('a shortcut picks the option: value set, change fired once, as a click would', async () => {
    const select = tosiSelect({ options, value: 'one' })
    document.body.append(select)
    let changes = 0
    select.addEventListener('change', () => changes++)
    try {
      press('2')
      await new Promise((r) => setTimeout(r, 50))
      expect(select.value).toBe('two')
      expect(changes).toBe(1)
    } finally {
      select.remove()
    }
  })

  test('a disabled select ignores its shortcuts', () => {
    const select = tosiSelect({ options, value: 'one', disabled: true })
    document.body.append(select)
    try {
      press('2')
      expect(select.value).toBe('one')
    } finally {
      select.remove()
    }
  })

  test('a removed select stops listening', () => {
    const select = tosiSelect({ options, value: 'one' })
    document.body.append(select)
    select.remove()
    press('2')
    expect(select.value).toBe('one')
  })
})
