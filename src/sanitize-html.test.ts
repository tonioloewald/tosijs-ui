import { test, expect, describe } from 'bun:test'
import { sanitizedFragment } from './sanitize-html'
import { dragAndDrop } from './index'
import { scriptJson } from './doc-system/script-json'

const html = (fragment: DocumentFragment) => {
  const div = document.createElement('div')
  div.append(fragment)
  return div.innerHTML
}

describe('sanitizedFragment (#4342)', () => {
  test('strips event handlers and script', () => {
    const out = html(
      sanitizedFragment(
        '<img src="x" onerror="alert(1)"><script>alert(2)</script>ok'
      )
    )
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('<script')
    expect(out).toContain('ok')
  })

  test('unwraps custom elements unless allowed, and always unwraps the code-running ones', () => {
    const source =
      '<tosi-icon icon="x">a</tosi-icon><tosi-md sanitize="off">b</tosi-md>'
    expect(html(sanitizedFragment(source))).toBe('ab')
    const allowed = html(sanitizedFragment(source, 'tosi-icon tosi-md'))
    expect(allowed).toContain('<tosi-icon')
    expect(allowed).not.toContain('<tosi-md')
  })

  test('a link never keeps a data: URL', () => {
    const out = html(sanitizedFragment('<a href="data:text/html,hi">x</a>'))
    expect(out).not.toContain('data:')
  })
})

describe('the default drop (#4342)', () => {
  const dropOn = (zone: HTMLElement, data: Record<string, string>) => {
    const dataTransfer = {
      types: Object.keys(data),
      getData: (type: string) => data[type] ?? '',
    }
    const event = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
    zone.dispatchEvent(event)
  }

  test('dropped HTML is sanitized', () => {
    dragAndDrop.init()
    const zone = document.createElement('div')
    zone.dataset.drop = 'text/html'
    zone.classList.add('drag-target')
    document.body.append(zone)
    dropOn(zone, { 'text/html': '<img src="x" onerror="alert(1)"><b>bold</b>' })
    expect(zone.innerHTML).not.toContain('onerror')
    expect(zone.querySelector('b')?.textContent).toBe('bold')
    zone.remove()
  })

  test('a wildcard zone receives the dragged type', () => {
    dragAndDrop.init()
    const zone = document.createElement('div')
    zone.dataset.drop = 'text/*'
    zone.classList.add('drag-target')
    document.body.append(zone)
    dropOn(zone, { 'text/plain': 'hello' })
    expect(zone.textContent).toBe('hello')
    zone.remove()
  })
})

describe('scriptJson (#4342)', () => {
  test('a </script> in the data cannot end the element, and the value round-trips', () => {
    const value = { detail: 'error: </script><script>alert(1)</script>' }
    const json = scriptJson(value)
    expect(json).not.toContain('</script')
    expect(JSON.parse(json)).toEqual(value)
  })
})
