import { test, expect } from './fixtures'

/*
The accessibility mode renders in the browser exactly as the build does (#3521).

The static page is covered by unit tests of `generateSite`; what only a browser shows is the
hydrated doc browser rendering a page itself, after client-side navigation. A doc browser on a
bare page that loads only the iife, memory-routed, with the mode on.
*/
test('the hydrated doc browser renders figures and one <h1> in the accessibility mode', async ({
  page,
  baseURL,
}) => {
  await page.goto(`${baseURL}/robots.txt`)
  await page.setContent('<!doctype html><body></body>')
  await page.addScriptTag({ url: `${baseURL}/iife.js` })
  const seen = await page.evaluate(async () => {
    const ui = (window as any).xinjsui
    const docs = [
      {
        filename: 'a.md',
        title: 'Lighting',
        path: 'a.md',
        text: '## Three lights\n\n![](key.png)\n*The key light.*',
      },
      {
        filename: 'b.md',
        title: 'Shadows',
        path: 'b.md',
        text: '# Shadows\n\n#### Soft\n\n# Hard',
      },
    ]
    const browser = ui.createDocBrowser({
      docs,
      routing: 'memory',
      projectName: 'Book',
      accessibility: 'wcag22-aa',
    })
    document.body.append(browser)
    const settle = () => new Promise((resolve) => setTimeout(resolve, 400))
    await settle()
    const content = () => browser.querySelector('.doc-content') as HTMLElement
    const headings = () =>
      [...content().querySelectorAll('h1, h2, h3, h4, h5, h6')].map(
        (h) => `${h.tagName} ${h.textContent}`
      )
    const first = {
      headings: headings(),
      caption: content().querySelector('figure > figcaption')?.textContent,
    }
    browser.navigate('b')
    await settle()
    return {
      first,
      second: headings(),
      headerHeadings: browser.querySelectorAll(
        'header h1, header h2, header h3'
      ).length,
      siteName: browser.querySelector('header .site-name')?.textContent,
    }
  })
  expect(seen.first).toEqual({
    headings: ['H1 Lighting', 'H2 Three lights'],
    caption: 'The key light.',
  })
  expect(seen.second).toEqual(['H1 Shadows', 'H2 Soft', 'H2 Hard'])
  expect(seen.headerHeadings).toBe(0)
  expect(seen.siteName).toBe('Book')
})
