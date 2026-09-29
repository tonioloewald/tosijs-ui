import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import {
  tosiSearchField,
  TosiSearchField,
  SearchHintRule,
} from './search-field.js'

const textRule: SearchHintRule = (text) => ({
  caption: `Text “${text}”`,
  tag: { caption: text, kind: 'text', value: text },
})
const kindRule: SearchHintRule = (text) =>
  'documents'.startsWith(text)
    ? [{ caption: 'Documents', tag: { caption: 'Documents', kind: 'type' } }]
    : null

const key = (field: TosiSearchField, name: string) =>
  field
    .querySelector('input')!
    .dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }))

const options = () => [
  ...document.querySelectorAll('.tosi-search-hints [role="option"]'),
]

describe('TosiSearchField', () => {
  let field: TosiSearchField

  beforeEach(async () => {
    field = tosiSearchField({ hints: [textRule, kindRule] })
    document.body.append(field)
    await field.whenHydrated
  })

  afterEach(() => {
    field.remove()
  })

  test('rules run on the text and their hints are listed in rule order', () => {
    field.typeText('doc')
    expect(field.hintCount).toBe(2)
    expect(options().map((o) => o.textContent)).toEqual([
      'Text “doc”',
      'Documents',
    ])
    field.typeText('zzz')
    expect(field.hintCount).toBe(1)
  })

  test('rules are not called for empty or blank text, and the list closes', () => {
    let calls = 0
    field.hints = [() => (calls += 1) && null]
    field.typeText('   ')
    expect(calls).toBe(0)
    field.hints = [textRule]
    field.typeText('a')
    expect(field.hintCount).toBe(1)
    field.typeText('')
    expect(field.hintCount).toBe(0)
    expect(options().length).toBe(0)
  })

  test('arrow keys drive aria-activedescendant; Enter picks the highlighted hint', () => {
    const input = field.querySelector('input')!
    field.typeText('doc')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    key(field, 'ArrowDown')
    key(field, 'ArrowDown')
    key(field, 'ArrowDown') // clamps at the last hint
    const active = input.getAttribute('aria-activedescendant')!
    expect(document.getElementById(active)?.textContent).toBe('Documents')
    key(field, 'ArrowUp')
    key(field, 'ArrowUp') // back to the text: nothing highlighted
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    key(field, 'ArrowDown')
    key(field, 'Enter')
    expect(field.value).toEqual({
      tags: [{ caption: 'doc', kind: 'text', value: 'doc' }],
      text: '',
    })
    expect(input.value).toBe('')
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  test('picking fires change; typing does not', () => {
    let changes = 0
    field.addEventListener('change', () => (changes += 1))
    field.typeText('doc')
    expect(changes).toBe(0)
    key(field, 'ArrowDown')
    key(field, 'Enter')
    expect(changes).toBe(1)
  })

  test('picking the same tag twice keeps one', () => {
    for (let i = 0; i < 2; i += 1) {
      field.typeText('doc')
      key(field, 'ArrowDown')
      key(field, 'Enter')
    }
    expect(field.value.tags.length).toBe(1)
  })

  test('clicking a hint picks it', () => {
    field.typeText('doc')
    ;(options()[1] as HTMLElement).click()
    expect(field.value.tags.map((t) => t.caption)).toEqual(['Documents'])
  })

  test('Enter with nothing highlighted fires action and keeps the text', () => {
    let actions = 0
    field.addEventListener('action', () => (actions += 1))
    field.typeText('report')
    key(field, 'Enter')
    expect(actions).toBe(1)
    expect(field.value).toEqual({ tags: [], text: 'report' })
    expect(field.hintCount).toBe(0)
  })

  test('Escape closes the hints, then clears the text', () => {
    field.typeText('doc')
    key(field, 'Escape')
    expect(field.hintCount).toBe(0)
    expect(field.value.text).toBe('doc')
    key(field, 'Escape')
    expect(field.value.text).toBe('')
  })

  test('Backspace in an empty field removes the last tag, not otherwise', () => {
    field.value = {
      tags: [{ caption: 'a' }, { caption: 'b' }],
      text: '',
    }
    field.render()
    const input = field.querySelector('input')!
    input.value = 'x'
    input.setSelectionRange(1, 1)
    key(field, 'Backspace')
    expect(field.value.tags.length).toBe(2)
    input.value = ''
    input.setSelectionRange(0, 0)
    key(field, 'Backspace')
    expect(field.value.tags.map((t) => t.caption)).toEqual(['a'])
  })

  test('chips render with tag colours and remove their own tag', () => {
    field.value = {
      tags: [{ caption: 'red', background: '#ff0000' }, { caption: 'plain' }],
      text: '',
    }
    field.render()
    const chips = [...field.querySelectorAll('tosi-tag')] as HTMLElement[]
    expect(chips.length).toBe(2)
    expect(chips[0].style.getPropertyValue('--tag-bg')).toBe('#ff0000')
    expect(chips[0].style.getPropertyValue('--tag-text-color')).toBe('#000000')
    ;(chips[0] as any).removeCallback({
      target: chips[0],
      stopPropagation() {},
      preventDefault() {},
    })
    expect(field.value.tags.map((t) => t.caption)).toEqual(['plain'])
  })

  test('the placeholder shows only while there are no tags', () => {
    field.placeholder = 'Find'
    field.render()
    const input = field.querySelector('input')!
    expect(input.placeholder).toBe('Find')
    field.value = { tags: [{ caption: 'x' }], text: '' }
    field.render()
    expect(input.placeholder).toBe('')
  })

  test('removing the element closes its hint list', () => {
    field.typeText('doc')
    expect(options().length).toBe(2)
    field.remove()
    expect(options().length).toBe(0)
  })
})
