import { test, expect } from '@playwright/test'

/*
Every interactive control must have an accessible NAME.

This landed because Lighthouse scored the doc site 91 on accessibility and the cause was
mechanical: the data-table page alone shipped 49 controls a screen reader announced as bare
"button" and "edit text" — 37 icon-only column menus, 12 editable cells — plus one unnamed
search field on every page of every site built with `tosijs-ui/site`.

The assertion is the count, not a snapshot: a name is either there or it is not, and any new
icon-only control added later fails this without anyone having to remember it exists.

Third-party subtrees are excluded deliberately. The haltija dev overlay is not ours and is
never in the built site (this lane runs with HALTIJA_DEV=0 anyway), and Babylon's default
loading screen injects its own logo/spinner images we do not construct.
*/

const PROBE = `(() => {
  const name = (e) =>
    (e.getAttribute('aria-label') ||
     e.getAttribute('title') ||
     e.textContent || '').trim()
  const ours = (e) => !e.closest('haltija-dev')
  const describe = (e) =>
    e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ').join('.') : '')
  return {
    buttons: [...document.querySelectorAll('button')]
      .filter(ours).filter((e) => !name(e)).map(describe),
    fields: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')]
      .filter(ours).filter((e) => !name(e) && !e.closest('label')).map(describe),
  }
})()`

/*
`expect(unnamed).toEqual([])` is trivially true when the page built no controls at all, so
every check here is preceded by a POSITIVE precondition that the things under test exist.

This is not hypothetical caution. The first version of this file waited only for
`buttons.length > 2` — satisfied by the nav chrome alone — and passed with BOTH fixes
reverted. A test that cannot fail is worse than no test, because it reports safety.
*/
async function unnamed(
  page: import('@playwright/test').Page,
  slug: string,
  requires: string,
  atLeast: number
) {
  await page.goto(`/${slug}`)
  await page.waitForFunction(
    ([sel, n]) =>
      document.querySelectorAll(sel as string).length >= (n as number),
    [requires, atLeast] as const,
    { timeout: 15000 }
  )
  return page.evaluate(PROBE) as Promise<{
    buttons: string[]
    fields: string[]
  }>
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

test('the data-table page has no unnamed controls', async ({ page }) => {
  /*
  The worst offender and the reason this file exists: `<tosi-table>` builds an icon-only
  column-options button per column and a bare input per editable cell, and neither carried a
  name. Both ship to every adopter, so this asserts against the component, not the page.
  */
  const found = await unnamed(page, 'data-table/', '.menu-trigger', 10)
  // The field half of this test is only meaningful if editable cells were built.
  expect(
    await page.locator('input.cell-editable').count(),
    'no editable cells on the page — the field assertion below would be vacuous'
  ).toBeGreaterThan(0)
  expect(
    found.buttons,
    `unnamed buttons: ${JSON.stringify(found.buttons)}`
  ).toEqual([])
  expect(
    found.fields,
    `unnamed fields: ${JSON.stringify(found.fields)}`
  ).toEqual([])
})

test('the doc-browser chrome has no unnamed controls', async ({ page }) => {
  // The search field is the only text input in the chrome, and a `placeholder` is not a
  // label — it is unreliable as a name and vanishes as soon as anything is typed.
  const found = await unnamed(page, '', 'input[type=search]', 1)
  expect(
    found.buttons,
    `unnamed buttons: ${JSON.stringify(found.buttons)}`
  ).toEqual([])
  expect(
    found.fields,
    `unnamed fields: ${JSON.stringify(found.fields)}`
  ).toEqual([])
})
