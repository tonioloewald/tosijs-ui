import { test, expect, describe } from 'bun:test'
import { filterPart } from './filter-builder.js'

/*
`getSelectText` returned the empty string on every call.

It read `select.options[select.selectedIndex]`, and `selectedIndex` has never existed on
`TosiSelect` — that component selects by VALUE. So the expression was `options[undefined]` →
`undefined` → `?.caption` → `''`, and the filter description came out as ` "needle"`: two
blanks where the field and the condition belong.

Invisible for as long as it existed because `Component` carried a `[key: string]: any` index
signature, so `select.anythingAtAll` type-checked as `any`. tosijs 1.10.0 removes it and the
compiler named this immediately.

Tested through the component rather than by exporting the helper: the defect is in what a user
reads off the chip, and widening the public surface to reach a private function would be
testing the fix rather than the behaviour.
*/
describe('filter description (tosijs#36 fallout)', () => {
  const mount = () => {
    const part = filterPart({
      fields: [{ prop: 'colour' }, { prop: 'size' }],
    }) as any
    document.body.append(part)
    part.render()
    return part
  }

  test('names the field and the condition, not two blanks', () => {
    const part = mount()
    const { haystack, condition } = part.parts
    haystack.value = 'colour'
    condition.value = 'contains'
    part.parts.needle.value = 'red'
    part.buildFilter()

    const description = part.filter.description
    expect(description).toContain('colour')
    expect(description).toContain('contains')
    // The exact failure: the description began with the space that separated two empty names.
    expect(description.startsWith(' ')).toBe(false)
    part.remove()
  })

  test('a bare-string option resolves to itself', () => {
    // `fields` become plain string options; only the "any field" entry is a SelectOption.
    const part = mount()
    part.parts.haystack.value = 'size'
    part.parts.condition.value = 'contains'
    part.buildFilter()
    expect(part.filter.description).toContain('size')
    part.remove()
  })

  test('the "any field" SelectOption resolves to its caption', () => {
    const part = mount()
    part.parts.haystack.value = '*'
    part.parts.condition.value = 'contains'
    part.buildFilter()
    expect(part.filter.description).toContain('any field')
    part.remove()
  })
})
