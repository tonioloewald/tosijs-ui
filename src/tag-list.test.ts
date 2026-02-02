import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { TosiTag, tosiTag, TosiTagList, tosiTagList } from './tag-list'

describe('TosiTag', () => {
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
      const tag = tosiTag({ caption: 'test' })
      container.appendChild(tag)
      expect(tag).toBeInstanceOf(TosiTag)
      expect(tag.tagName.toLowerCase()).toBe('tosi-tag')
    })

    test('displays caption', () => {
      const tag = tosiTag({ caption: 'Hello' })
      container.appendChild(tag)
      expect(tag.caption).toBe('Hello')
    })

    test('removeable defaults to false', () => {
      const tag = tosiTag({ caption: 'test' })
      container.appendChild(tag)
      expect(tag.removeable).toBe(false)
    })

    test('accepts removeable property', () => {
      const tag = tosiTag({ caption: 'test', removeable: true })
      container.appendChild(tag)
      expect(tag.removeable).toBe(true)
    })
  })

  describe('structure', () => {
    test('has caption span', () => {
      const tag = tosiTag({ caption: 'Test Caption' })
      container.appendChild(tag)
      const caption = tag.querySelector('span[part="caption"]')
      expect(caption).not.toBeNull()
      expect(caption?.textContent).toBe('Test Caption')
    })

    test('has remove button', () => {
      const tag = tosiTag({ caption: 'test', removeable: true })
      container.appendChild(tag)
      const removeBtn = tag.querySelector('button[part="remove"]')
      expect(removeBtn).not.toBeNull()
    })

    test('remove button has aria-label', () => {
      const tag = tosiTag({ caption: 'MyTag', removeable: true })
      container.appendChild(tag)
      const removeBtn = tag.querySelector('button[part="remove"]')
      expect(removeBtn?.getAttribute('aria-label')).toBe('Remove MyTag')
    })
  })

  describe('removeCallback', () => {
    test('calls removeCallback when set', () => {
      let called = false
      const tag = tosiTag({
        caption: 'test',
        removeable: true,
        removeCallback: () => {
          called = true
        },
      })
      container.appendChild(tag)
      tag.removeCallback(new Event('click'))
      expect(called).toBe(true)
    })
  })
})

describe('TosiTagList', () => {
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
      const tagList = tosiTagList()
      container.appendChild(tagList)
      expect(tagList).toBeInstanceOf(TosiTagList)
      expect(tagList.tagName.toLowerCase()).toBe('tosi-tag-list')
    })

    test('value defaults to empty', () => {
      const tagList = tosiTagList()
      container.appendChild(tagList)
      expect(tagList.value).toEqual([])
    })

    test('editable defaults to false', () => {
      const tagList = tosiTagList()
      container.appendChild(tagList)
      expect(tagList.editable).toBe(false)
    })

    test('textEntry defaults to false', () => {
      const tagList = tosiTagList()
      container.appendChild(tagList)
      expect(tagList.textEntry).toBe(false)
    })

    test('disabled defaults to false', () => {
      const tagList = tosiTagList()
      container.appendChild(tagList)
      expect(tagList.disabled).toBe(false)
    })
  })

  describe('value handling', () => {
    test('accepts value as string', () => {
      const tagList = tosiTagList({ value: 'one,two,three' })
      container.appendChild(tagList)
      expect(tagList.tags).toEqual(['one', 'two', 'three'])
    })

    test('accepts value as array', () => {
      const tagList = tosiTagList({ value: ['a', 'b', 'c'] })
      container.appendChild(tagList)
      expect(tagList.tags).toEqual(['a', 'b', 'c'])
    })

    test('tags getter parses comma-separated string', () => {
      const tagList = tosiTagList({ value: 'alpha, beta, gamma' })
      container.appendChild(tagList)
      expect(tagList.tags).toEqual(['alpha', 'beta', 'gamma'])
    })

    test('tags getter filters empty strings', () => {
      const tagList = tosiTagList({ value: 'one,,two,,,three' })
      container.appendChild(tagList)
      expect(tagList.tags).toEqual(['one', 'two', 'three'])
    })
  })

  describe('addTag', () => {
    test('adds new tag to value', () => {
      const tagList = tosiTagList({ value: ['existing'] })
      container.appendChild(tagList)
      tagList.addTag('new')
      expect(tagList.tags).toContain('new')
    })

    test('does not add duplicate tags', () => {
      const tagList = tosiTagList({ value: ['existing'] })
      container.appendChild(tagList)
      tagList.addTag('existing')
      expect(tagList.tags.filter((t) => t === 'existing').length).toBe(1)
    })

    test('does not add empty tags', () => {
      const tagList = tosiTagList({ value: ['a'] })
      container.appendChild(tagList)
      tagList.addTag('')
      tagList.addTag('   ')
      expect(tagList.tags).toEqual(['a'])
    })
  })

  describe('toggleTag', () => {
    test('removes existing tag', () => {
      const tagList = tosiTagList({ value: ['a', 'b', 'c'] })
      container.appendChild(tagList)
      tagList.toggleTag('b')
      expect(tagList.tags).toEqual(['a', 'c'])
    })

    test('adds non-existing tag', () => {
      const tagList = tosiTagList({ value: ['a'] })
      container.appendChild(tagList)
      tagList.toggleTag('b')
      expect(tagList.tags).toContain('b')
    })
  })

  describe('properties', () => {
    test('accepts editable property', () => {
      const tagList = tosiTagList({ editable: true })
      container.appendChild(tagList)
      expect(tagList.editable).toBe(true)
    })

    test('accepts textEntry property', () => {
      const tagList = tosiTagList({ textEntry: true })
      container.appendChild(tagList)
      expect(tagList.textEntry).toBe(true)
    })

    test('accepts placeholder property', () => {
      const tagList = tosiTagList({ placeholder: 'Custom placeholder' })
      container.appendChild(tagList)
      expect(tagList.placeholder).toBe('Custom placeholder')
    })

    test('accepts availableTags as string', () => {
      const tagList = tosiTagList({ availableTags: 'x,y,z' })
      container.appendChild(tagList)
      expect(tagList.availableTags).toBe('x,y,z')
    })

    test('accepts availableTags as array', () => {
      const tagList = tosiTagList()
      tagList.availableTags = ['x', 'y', 'z']
      container.appendChild(tagList)
      expect(tagList.availableTags).toEqual(['x', 'y', 'z'])
    })

    test('accepts disabled property', () => {
      const tagList = tosiTagList({ disabled: true })
      container.appendChild(tagList)
      expect(tagList.disabled).toBe(true)
    })
  })

  describe('accessibility', () => {
    test('tag container has role="list"', () => {
      const tagList = tosiTagList({ value: ['test'] })
      container.appendChild(tagList)
      const tagContainer = tagList.querySelector('[part="tagContainer"]')
      expect(tagContainer?.getAttribute('role')).toBe('list')
    })

    test('tag container has aria-label', () => {
      const tagList = tosiTagList({ value: ['test'] })
      container.appendChild(tagList)
      const tagContainer = tagList.querySelector('[part="tagContainer"]')
      expect(tagContainer?.getAttribute('aria-label')).toBe('Selected tags')
    })

    test('input has aria-label', () => {
      const tagList = tosiTagList({ editable: true, textEntry: true })
      container.appendChild(tagList)
      const input = tagList.querySelector('[part="tagInput"]')
      expect(input?.getAttribute('aria-label')).toBe('Enter new tag')
    })

    test('menu button has aria-haspopup', () => {
      const tagList = tosiTagList({ editable: true })
      container.appendChild(tagList)
      const menuBtn = tagList.querySelector('[part="tagMenu"]')
      expect(menuBtn?.getAttribute('aria-haspopup')).toBe('listbox')
    })

    test('menu button has aria-label', () => {
      const tagList = tosiTagList({ editable: true })
      container.appendChild(tagList)
      const menuBtn = tagList.querySelector('[part="tagMenu"]')
      expect(menuBtn?.getAttribute('aria-label')).toBe('Select tags from list')
    })
  })
})
