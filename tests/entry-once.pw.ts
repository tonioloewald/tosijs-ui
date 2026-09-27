import { test, expect } from '@playwright/test'

/*
The ESM entry is requested ONCE per page, by one URL (#191).

The page loaded `hydrate.js?v=<hash>` and chunks imported `../hydrate.js`: two URLs, so two module
instances, and a prototype patch in a shared chunk ran twice (Babylon threw, and its shaders
failed to compile). The reporter's own measurement was the entry's requests, so that is what
this asserts: in a real browser, over a page that pulls in code-split chunks.
*/
test('a doc page requests its ESM entry exactly once', async ({ page }) => {
  const entryRequests: string[] = []
  page.on('request', (req) => {
    const { pathname } = new URL(req.url())
    if (/\/hydrate[^/]*\.js$/.test(pathname)) entryRequests.push(req.url())
  })
  await page.goto('/dialog/')
  await page.waitForFunction(() => !!customElements.get('tosi-doc-system'))
  // let lazily imported chunks (which import the entry back) load too
  await page.waitForLoadState('networkidle')
  expect(entryRequests.length).toBe(1)
  expect(new URL(entryRequests[0]).search).toBe('')
})
