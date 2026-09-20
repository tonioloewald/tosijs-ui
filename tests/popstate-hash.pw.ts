import { test, expect } from '@playwright/test'

/*
#152: a hash-only history change must NOT re-render the document.

`popstate` fires before `hashchange`, so any component keeping state in the hash used to
re-mount the whole article on every write. `navigateTo` ends at
`docContent.innerHTML = renderDocMarkdown(...)`, which destroys and re-creates every live
example on the page — an editor loses focus and its buffer mid-keystroke.

WHY THIS TEST IS SHAPED THE WAY IT IS. The guard is one `String()` coercion:

    if (next === String(app.currentDoc.filename)) { scrollToHashExample(); return }

`app.currentDoc.filename` is a BoxedScalar, so dropping the coercion compares a proxy to a
string, is never equal, and the guard silently does nothing — falling straight through to the
re-render it exists to prevent. Nothing throws and the page still looks right afterwards,
because a re-rendered article is indistinguishable from an un-rendered one *if you re-query
for it*. Every existing `goBack()` assertion in this suite does exactly that, which is why the
defect had no coverage at any tier.

So: take a HANDLE to a node inside `.doc-content` first, and afterwards ask that node whether
it is still attached. A fresh re-render satisfies a selector; it cannot satisfy an old handle.
*/

const setup = async (page: any) => {
  // A doc page under test is also a page running tests — the background runner mutates the
  // hash asynchronously and would race the history manipulation here.
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
  await page.goto('/hash-state/')
  await page.waitForSelector('.doc-content')
}

test('a hash-only back does not re-render the article (#152)', async ({
  page,
}) => {
  await setup(page)

  // Hold a live reference to a node the re-render would destroy.
  const node = await page.evaluateHandle(() => {
    const el = document.querySelector('.doc-content')!.firstElementChild!
    // Tag it too, so a failure message can say which node went away.
    ;(el as HTMLElement).dataset.popstateProbe = 'yes'
    return el
  })

  const pathBefore = await page.evaluate(() => location.pathname)

  // A hash-only change, then back. Same document either way.
  await page.evaluate(() => {
    history.pushState({}, '', `${location.pathname}#some-anchor`)
  })
  await page.goBack()
  await page.waitForFunction(() => !location.hash)

  const stillAttached = await page.evaluate(
    (el) => (el as Element).isConnected,
    node
  )
  expect(
    stillAttached,
    'the article was re-rendered on a hash-only popstate — the #152 guard is not firing. ' +
      'A live example would have lost focus and its edit buffer here.'
  ).toBe(true)

  // Sanity: we really did stay on the same document, so the assertion above means something.
  expect(await page.evaluate(() => location.pathname)).toBe(pathBefore)
})

test('a real cross-document back DOES re-render', async ({ page }) => {
  /*
  The negative control. Without it the test above passes just as happily against a guard that
  returns early for everything — which would break navigation entirely while looking green.
  */
  await setup(page)
  const node = await page.evaluateHandle(
    () => document.querySelector('.doc-content')!.firstElementChild!
  )

  await page.click('.doc-nav a:not([href*="hash-state"])')
  await page.waitForFunction(() => !location.pathname.includes('hash-state'))
  await page.goBack()
  await page.waitForSelector('.doc-content')

  expect(
    await page.evaluate((el) => (el as Element).isConnected, node),
    'a cross-document back should have re-rendered the article'
  ).toBe(false)
})
