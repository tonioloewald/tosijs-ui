import { test, expect } from './fixtures'

/*
A memory-routed doc browser follows `/slug/` links in memory (tosijs-ui#243).

`/slug/` is the form the site build's pages link with, and the browser rewrites every internal
link into it; memory routing did not resolve it, so every doc-to-doc link in an embedded
browser did a full page load of a path the host usually does not have.
*/
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

test('a memory-routed browser follows /slug/ and ?filename links in memory', async ({
  page,
}) => {
  await page.goto('/readme/')
  await page.waitForFunction(() => (window as any).xinjsui?.createDocBrowser)
  const before = page.url()
  const result = await page.evaluate(async () => {
    const ui: any = (window as any).xinjsui
    const docs = [
      {
        filename: 'a.md',
        title: 'Alpha',
        path: 'a.md',
        text: '# Alpha\n\n[slug](/beta/) [query](?gamma.md) [heading](/beta/#second)',
      },
      { filename: 'beta.md', title: 'Beta', path: 'beta.md', text: '# Beta' },
      {
        filename: 'gamma.md',
        title: 'Gamma',
        path: 'gamma.md',
        text: '# Gamma',
      },
    ]
    docs[1].text +=
      '\n\n' + 'filler\n\n'.repeat(80) + '## Second\n\n' + 'more\n\n'.repeat(80)
    const settle = () => new Promise((r) => setTimeout(r, 600))
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff'
    document.body.append(box)
    const routes: string[] = []
    const browser = ui.createDocBrowser({
      docs,
      projectName: 'probe',
      routing: 'memory',
      initialRoute: 'a',
      onRouteChange: (slug: string) => routes.push(slug),
    })
    box.append(browser)
    await settle()
    const h1 = () => browser.querySelector('.doc-content h1')?.textContent
    const click = async (text: string) => {
      ;[...browser.querySelectorAll('.doc-content a')]
        .find((a: any) => a.textContent === text)
        ?.click()
      await settle()
    }
    const shown: string[] = [h1()]
    await click('slug')
    shown.push(h1())
    browser.navigate('a')
    await settle()
    await click('query')
    shown.push(h1())
    browser.navigate('a')
    await settle()
    await click('heading')
    shown.push(h1())
    const second = browser.querySelector('#second') as HTMLElement
    let scroller: HTMLElement | null = second.parentElement
    while (scroller && scroller.scrollHeight <= scroller.clientHeight + 5)
      scroller = scroller.parentElement
    const offset =
      second.getBoundingClientRect().top -
      (scroller as HTMLElement).getBoundingClientRect().top
    return { shown, routes, headingAtTop: Math.abs(offset) < 80 }
  })
  expect(result.shown).toEqual(['Alpha', 'Beta', 'Gamma', 'Beta'])
  expect(result.routes).toEqual(['beta', 'gamma', 'beta'])
  // The heading link lands on the heading, not the top of the page.
  expect(result.headingAtTop).toBe(true)
  // Memory routing never touches the page URL.
  expect(page.url()).toBe(before)
})
