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
  test.skip(browserName !== 'chromium', 'one store per server: see above')
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
  await second.locator('textarea').fill('does not work')
  await second.locator('textarea').press('Tab')
  await expect
    .poll(() => checklistResults(DIR).answers['s1-2']?.comment)
    .toBe('does not work')
  expect(checklistResults(DIR)).toMatchObject({ pass: 1, fail: 1, open: 0 })

  // The panel comes back after a reload, with the answers.
  await page.reload()
  await expect(panel).toBeVisible()
  await expect(item.locator('.pass')).toHaveAttribute('aria-pressed', 'true')
  await expect(second.locator('textarea')).toHaveValue('does not work')

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
