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

/*
#4391 (1.20.0): a bare createDocBrowser() is an embed. Its default was 'query', which reads and
rewrites the host page's URL.
*/
test("createDocBrowser defaults to 'memory' routing, leaving the page's URL alone", () => {
  // test-setup has no `history` global (lean plan H1), so through window
  const { history } = window
  const before = window.location.href
  const pushes: unknown[] = []
  const realPush = history.pushState.bind(history)
  history.pushState = (...args: any[]) => void pushes.push(args)
  try {
    const browser: any = createDocBrowser({
      docs: [
        {
          filename: 'README.md',
          title: 'Home',
          path: 'README.md',
          text: '# Home\n',
        },
        { filename: 'b.md', title: 'B', path: 'b.md', text: '# B\n' },
      ] as any,
    })
    document.body.append(browser)
    expect(typeof browser.navigate).toBe('function')
    browser.navigate('b')
    expect(pushes).toEqual([])
    expect(window.location.href).toBe(before)
    browser.remove()
  } finally {
    history.pushState = realPush
  }
})

/*
1.20.0 review, M3: memory routing leaves more than the URL alone, and the docs now say so. These
pin the list: no `__docTestResults` and no `role="main"`, where query routing sets both.
*/
test('a memory-routed browser leaves the page its test global and its main landmark', () => {
  const docs = [
    {
      filename: 'README.md',
      title: 'Home',
      path: 'README.md',
      text: '# Home\n',
    },
  ] as any
  const w = window as any
  delete w.__docTestResults
  const memory: any = createDocBrowser({ docs })
  document.body.append(memory)
  expect(w.__docTestResults).toBeUndefined()
  expect(memory.querySelector('[role="main"]')).toBeNull()
  memory.remove()
  // The control: the same browser owning the page sets both. Query routing reads the bare
  // `location` global, which test-setup does not provide (lean plan H1).
  const g = globalThis as any
  const hadLocation = 'location' in g
  if (!hadLocation) g.location = window.location
  try {
    const query: any = createDocBrowser({ docs, routing: 'query' })
    document.body.append(query)
    expect(w.__docTestResults).toBeInstanceOf(Promise)
    expect(query.querySelector('[role="main"]')).not.toBeNull()
    query.remove()
  } finally {
    if (!hadLocation) delete g.location
    delete w.__docTestResults
  }
})
