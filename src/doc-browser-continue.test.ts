import { test, expect } from 'bun:test'
import { createDocBrowser } from './doc-browser.js'

/*
The client half of #255 and #256: a page rendered on navigation (not adopted from the static
HTML) ends with the same Continue link the build emits, and following it opens the next page
at its top. Memory routing, so nothing here touches the test runner's history.
*/
const docs = [
  { filename: 'README.md', title: 'Home', path: 'README.md', text: '# Home' },
  {
    filename: 'learn.md',
    title: 'Learn',
    path: 'learn.md',
    continue: true,
    text: '# Learn',
  },
  {
    filename: 'one.md',
    title: 'One',
    path: 'one.md',
    parent: 'Learn',
    order: 1,
    text: '# One',
  },
  {
    filename: 'two.md',
    title: 'Two',
    path: 'two.md',
    parent: 'Learn',
    order: 2,
    text: '# Two',
  },
]

test('a page in a sequence ends with Continue; following it opens the next page at its top', () => {
  // happy-dom starts at about:blank, against which no relative link resolves.
  const happyDOM = (window as any).happyDOM
  const before = document.location.href
  happyDOM.setURL('https://docs.test/learn/')
  const routes: string[] = []
  const browser = createDocBrowser({
    docs: docs as any,
    routing: 'memory',
    initialRoute: 'learn',
    onRouteChange: (slug: string) => routes.push(slug),
  })
  document.body.append(browser)
  try {
    const link = () =>
      browser.querySelector('.doc-content .doc-continue a') as HTMLAnchorElement
    expect(link().textContent).toContain('One')
    const pane = browser.querySelector('[tabindex="0"]') as HTMLElement
    expect(pane.contains(link())).toBe(true)
    pane.scrollTop = 500

    link().click()
    expect(routes).toEqual(['one'])
    expect(browser.querySelector('.doc-content h1')?.textContent).toBe('One')
    expect(pane.scrollTop).toBe(0)
    expect(link().textContent).toContain('Two')

    link().click()
    expect(browser.querySelector('.doc-content .doc-continue')).toBeNull()

    // A host's navigate() also starts the page at its top.
    pane.scrollTop = 500
    ;(browser as any).navigate('one')
    expect(pane.scrollTop).toBe(0)
  } finally {
    browser.remove()
    happyDOM.setURL(before)
  }
})
