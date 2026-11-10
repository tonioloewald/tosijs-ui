import { test, expect } from 'bun:test'
import { css } from 'tosijs'
import { testIndicatorStyleSpec } from './doc-browser.js'

/*
#3642: the test badge's label blended into the header behind it. The pulse dimmed the badge to
0.7 opacity and a settled pass faded to 0.55, and axe measured 2.45-2.9:1. Its colours are
contrast-checked solid, so nothing may make them translucent.
*/
test('no test-badge rule or animation makes the badge translucent', () => {
  const sheet = css(testIndicatorStyleSpec)
  // Only the floating badge's fade-out, which ends hidden and unclickable, may touch opacity.
  const withoutFade = sheet.replace(
    /@keyframes test-fade\s*\{[\s\S]*?\}\s*\}/,
    ''
  )
  expect(withoutFade).not.toMatch(/opacity\s*[:(]\s*0?\.\d/)
  expect(withoutFade).toContain('@keyframes test-pulse')
})
