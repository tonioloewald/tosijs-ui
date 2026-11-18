import { test, expect } from 'bun:test'
import { tosiChecklist, checklistSections, linkableUrl } from './checklist'
import { pageSchematic } from './page-schematic'

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 20))

test('items get the ids the store gives them', () => {
  expect(
    checklistSections({
      title: 't',
      sections: [{ items: ['a', { id: 'b', text: 'b' }] }, { items: ['c'] }],
    }).map((s) => s.items.map((i) => i.id))
  ).toEqual([['s1-1', 'b'], ['s2-1']])
  expect(checklistSections({ title: 't', items: ['a'] })[0].items[0].id).toBe(
    's1-1'
  )
  expect(checklistSections(null)).toEqual([])
})

test('only site paths and http(s) URLs are linked', () => {
  expect(linkableUrl('/menu/')).toBe(true)
  expect(linkableUrl('https://example.com/')).toBe(true)
  expect(linkableUrl('//example.com/')).toBe(false)
  expect(linkableUrl('javascript:alert(1)')).toBe(false)
})

test('verdicts toggle and fire change; comments fire change', async () => {
  const list = tosiChecklist({
    value: {
      title: 'Checks',
      items: [
        { id: 'tap', text: 'Menu opens', url: 'javascript:alert(1)' },
        { id: 'go', text: 'Link', url: '/menu/', steps: ['one', 'two'] },
      ],
    },
    answers: { go: { verdict: 'fail', comment: 'broken' } },
  })
  document.body.append(list)
  await nextFrame()
  const root = list.shadowRoot!
  expect(root.querySelector('[part="title"]')!.textContent).toBe('Checks')
  expect(root.querySelector('[part="summary"]')!.textContent).toBe(
    '0 passed · 1 failed · 1 to check'
  )
  // An unsafe url is shown, not linked.
  expect(root.querySelector('[data-id="tap"] a')).toBeNull()
  expect(root.querySelector('[data-id="go"] a')!.getAttribute('href')).toBe(
    '/menu/'
  )
  expect(root.querySelectorAll('[data-id="go"] .steps li').length).toBe(2)
  expect(
    (root.querySelector('[data-id="go"] textarea') as HTMLTextAreaElement).value
  ).toBe('broken')

  const events: any[] = []
  list.addEventListener('change', (e) => events.push((e as CustomEvent).detail))
  const pass = root.querySelector('[data-id="tap"] .pass') as HTMLButtonElement
  pass.click()
  expect(events.at(-1)).toEqual({
    itemId: 'tap',
    verdict: 'pass',
    comment: '',
    changed: 'verdict',
  })
  expect(pass.getAttribute('aria-pressed')).toBe('true')
  pass.click()
  expect(list.answers.tap.verdict).toBe(null)

  const comment = root.querySelector(
    '[data-id="tap"] textarea'
  ) as HTMLTextAreaElement
  comment.value = 'fine'
  comment.dispatchEvent(new Event('change', { bubbles: true }))
  expect(events.at(-1)).toMatchObject({
    itemId: 'tap',
    comment: 'fine',
    changed: 'comment',
  })

  list.disabled = true
  await nextFrame()
  ;(root.querySelector('[data-id="tap"] .fail') as HTMLButtonElement).click()
  expect(list.answers.tap.verdict).toBe(null)
  list.remove()
})

test('the schematic draws visible boxes, skips what it is told to, and keeps form values out', () => {
  const host = document.createElement('div')
  host.innerHTML = `
    <button id="save" aria-label="Save it">Save &amp; close</button>
    <input type="password" value="hunter2">
    <div data-schematic-skip><button>panel</button></div>
    <span style="display:none">hidden</span>`
  document.body.append(host)
  const boxes = new Map<Element, DOMRect>()
  for (const el of host.querySelectorAll('*'))
    boxes.set(el, {
      left: 10,
      top: 10,
      right: 110,
      bottom: 40,
      width: 100,
      height: 30,
    } as DOMRect)
  boxes.set(host, {
    left: 0,
    top: 0,
    right: 300,
    bottom: 200,
    width: 300,
    height: 200,
  } as DOMRect)
  const original = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    return (
      boxes.get(this) ?? ({ left: 0, top: 0, right: 0, bottom: 0 } as DOMRect)
    )
  }
  try {
    const svg = pageSchematic({ root: host, skip: '[data-schematic-skip]' })
    expect(svg).toStartWith('<svg')
    expect(svg).toContain('button#save &quot;Save it&quot;')
    expect(svg).toContain('Save &amp; close')
    expect(svg).toContain('input[type=password]')
    expect(svg).not.toContain('hunter2')
    expect(svg).not.toContain('panel')
    expect(svg).not.toContain('hidden')
    expect(svg).not.toContain('data-truncated')

    // Over budget: simplified, and it says so.
    const small = pageSchematic({ root: host, maxNodes: 1 })
    expect(small).toContain('data-truncated="nodes"')
    expect(small).toContain('data-nodes="1"')
    expect(small).toContain('schematic truncated')
    const full = pageSchematic({ root: host }).length
    // Just over: the text goes first (the stamp itself costs bytes, so a box may follow).
    const textless = pageSchematic({ root: host, maxBytes: full - 1 })
    expect(textless).toContain('data-truncated="text')
    expect(textless).not.toContain('>Save &amp; close<')
    expect(textless.length).toBeLessThan(full)
    // Far over: the deepest boxes go next.
    const tight = pageSchematic({ root: host, maxBytes: 700 })
    expect(tight).toContain('data-truncated="text,nodes"')
    expect(tight.length).toBeLessThanOrEqual(700)
  } finally {
    Element.prototype.getBoundingClientRect = original
    host.remove()
  }
})
