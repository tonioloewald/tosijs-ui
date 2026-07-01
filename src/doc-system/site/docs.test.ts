import { test, expect, describe } from 'bun:test'
import { parseFrontmatter } from './docs'

describe('parseFrontmatter', () => {
  test('parses & strips YAML frontmatter, maps keys, body starts at the H1', () => {
    const src = [
      '---',
      'title: The Silent Coast',
      'order: 20',
      'author: Jane Roe',
      'draft: true',
      '---',
      '',
      '# Chapter One',
      '',
      'Prose.',
    ].join('\n')
    const { data, body } = parseFrontmatter(src)
    expect(data.title).toBe('The Silent Coast')
    expect(data.order).toBe(20)
    expect(data.author).toBe('Jane Roe')
    expect(data.hidden).toBe(true) // draft: true → hidden
    expect(body.split('\n')[0]).toBe('# Chapter One') // leading blank line stripped
  })

  test('a bare leading --- (horizontal rule) is left as content', () => {
    const src = '---\n\nJust a rule, not frontmatter.'
    const { data, body } = parseFrontmatter(src)
    expect(data).toEqual({})
    expect(body).toBe(src)
  })

  test('empty title is dropped (falls back to the H1); other keys keep', () => {
    const { data } = parseFrontmatter('---\ntitle:\norder: 3\n---\n# Real')
    expect(data.title).toBeUndefined()
    expect(data.order).toBe(3)
  })

  test('a doc with no frontmatter is returned untouched', () => {
    const src = '# Heading\n\nBody.'
    const { data, body } = parseFrontmatter(src)
    expect(data).toEqual({})
    expect(body).toBe(src)
  })
})
