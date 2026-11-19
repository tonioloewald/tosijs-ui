import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect } from './fixtures'
import {
  checklistResults,
  clearChecklist,
  normalizeChecklist,
  postChecklist,
  type Checklist,
} from '../src/doc-system/site/checklist-store'

/*
Test checklists (#4147): an agent posts a list to the store, the page shows a badge, a reader
answers in the panel, and each verdict is saved with a schematic of the page.

The round trip runs in one engine: the lane has one server and one store, and posting a list
replaces the last, so three engines at once would answer each other's lists. What differs by
engine (CompressionStream, the schematic walk) is checked in all three below, without the store.
*/

const DIR = path.resolve('test-results/e2e-checklist')

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('tosijs-ui-tests-enabled', 'false')
  )
})

test('a reader answers a posted list, and each verdict carries a schematic', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== (process.env.CHECKLIST_ENGINE ?? 'chromium'),
    'one store per server: see above'
  )
  const list = normalizeChecklist({
    title: 'E2E checks',
    id: 'e2e',
    sections: [
      {
        title: 'Desktop',
        items: [
          { id: 'menu', text: 'The menu opens', url: '/menu/' },
          'Second',
        ],
      },
    ],
  }) as Checklist
  postChecklist(DIR, list)
  // Cleared here, not in afterAll: the other engines' workers skip this test and would run
  // an afterAll while this one is still answering.
  try {
    await answerTheList(page)
  } finally {
    clearChecklist(DIR)
  }
})

async function answerTheList(page: import('@playwright/test').Page) {
  await page.goto('/')
  const badge = page.locator('.checklist-badge')
  await expect(badge).toHaveText('2 checks waiting')
  await badge.click()
  const panel = page.locator('.checklist-panel')
  await expect(panel).toBeVisible()
  await expect(badge).toHaveCount(0)

  const item = panel.locator('tosi-checklist [data-id="menu"]')
  const sent = page.waitForResponse('**/__checklist/answer')
  await item.locator('.pass').click()
  const response = await sent
  expect(response.status()).toBe(200)
  await expect
    .poll(() => checklistResults(DIR).answers.menu?.verdict)
    .toBe('pass')
  const answer = checklistResults(DIR).answers.menu
  expect(answer.page).toContain('/')
  const svg = readFileSync(path.join(DIR, answer.schematic!), 'utf8')
  expect(svg).toMatch(/^<svg/)
  expect(Number(/data-nodes="(\d+)"/.exec(svg)![1])).toBeGreaterThan(10)
  // The panel is not the page under test.
  expect(svg).not.toContain('The menu opens')

  const second = panel.locator('tosi-checklist [data-id="s1-2"]')
  await second.locator('.fail').click()
  // Under 16px, iOS zooms the page into the field when it takes focus.
  const fontSize = await second
    .locator('textarea')
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(fontSize).toBeGreaterThanOrEqual(16)
  // Saved as it is typed: the field keeps focus throughout.
  await second.locator('textarea').fill('does not work')
  await expect(second.locator('textarea')).toBeFocused()
  await expect
    .poll(() => checklistResults(DIR).answers['s1-2']?.comment)
    .toBe('does not work')
  // ...and the reader can go on typing at a person's speed, pausing between words long
  // enough for saves to land mid-sentence, without losing the field.
  for (const word of [' at', ' all', ' on', ' my', ' phone']) {
    await page.keyboard.type(word, { delay: 120 })
    await page.waitForTimeout(800)
    await expect(second.locator('textarea')).toBeFocused()
  }
  await expect(second.locator('textarea')).toHaveValue(
    'does not work at all on my phone'
  )
  await expect
    .poll(() => checklistResults(DIR).answers['s1-2']?.comment)
    .toBe('does not work at all on my phone')
  expect(checklistResults(DIR)).toMatchObject({ pass: 1, fail: 1, open: 0 })

  // A poll landing while a comment waits out its pause does not undo it, and a verdict
  // given then carries it.
  const first = item.locator('textarea')
  await first.fill('keep me')
  await first.blur()
  const polled = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/__checklist'
  )
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange'))
  )
  await polled
  await expect(first).toHaveValue('keep me')
  await item.locator('.fail').click()
  await expect
    .poll(() => checklistResults(DIR).answers.menu)
    .toMatchObject({ verdict: 'fail', comment: 'keep me' })

  // The panel comes back after a reload, with the answers.
  await page.reload()
  await expect(panel).toBeVisible()
  await expect(item.locator('.fail')).toHaveAttribute('aria-pressed', 'true')
  await expect(first).toHaveValue('keep me')
  await expect(second.locator('textarea')).toHaveValue(
    'does not work at all on my phone'
  )

  // Closed with nothing left to check, there is no badge.
  await panel.getByRole('button', { name: 'Close the test checklist' }).click()
  await expect(panel).toHaveCount(0)
  await expect(badge).toHaveCount(0)
}

test('every engine can draw the schematic and gzip it', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('tosi-doc-system')).toBeVisible()
  const result = await page.evaluate(async () => {
    const svg: string = (window as any).xinjsui.pageSchematic()
    const zipped = await new Response(
      new Blob([svg]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer()
    const back = await new Response(
      new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip'))
    ).text()
    return { svg, zipped: zipped.byteLength, same: back === svg }
  })
  expect(result.svg).toMatch(/^<svg/)
  expect(result.same).toBe(true)
  expect(result.zipped).toBeLessThan(result.svg.length)
})

test('a comment field grows with what is typed', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('tosi-doc-system')).toBeVisible()
  await page.evaluate(() => {
    const list = (window as any).xinjsui.tosiChecklist({
      id: 'grow-test',
      value: { title: 'Grow', items: [{ id: 'a', text: 'Item' }] },
    })
    document.body.append(list)
  })
  const field = page.locator('#grow-test textarea')
  const height = () => field.evaluate((el) => el.getBoundingClientRect().height)
  await expect(field).toBeVisible()
  const empty = await height()
  await field.fill('one\ntwo\nthree\nfour')
  await expect.poll(height).toBeGreaterThan(empty * 2)
  await page.evaluate(() => document.getElementById('grow-test')!.remove())
})
