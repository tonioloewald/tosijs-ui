import { test, expect } from 'bun:test'
import { accessibilityFindings, findingLine } from './a11y-report.js'

const messages = (text: string, title?: string) =>
  accessibilityFindings(text, title).map((f) => f.message)

test('an image with no alt and no caption is reported; a captioned one is not', () => {
  expect(
    messages(
      '![](bare.png)\n\n![](shown.png)\n\n*Its caption.*\n\n![Alt](ok.png)'
    )
  ).toEqual(['![](bare.png) has no alt text and no caption'])
})

test('images are found in lists, tables and blockquotes', () => {
  expect(
    messages('- ![](a.png)\n\n| x |\n| - |\n| ![](b.png) |\n\n> ![](c.png)')
  ).toEqual([
    '![](a.png) has no alt text and no caption',
    '![](b.png) has no alt text and no caption',
    '![](c.png) has no alt text and no caption',
  ])
})

test('a linked image with no alt leaves the link with no name; reported once', () => {
  expect(messages('[![](logo.png)](/home/)')).toEqual([
    'a linked image (to /home/) has no alt text, so the link has no name',
  ])
  // beside link text, the image is decorative: empty alt is correct
  expect(messages('[![](logo.png) Home](/home/)')).toEqual([])
})

test('raw <img> with no alt attribute; alt="" counts as deliberate', () => {
  expect(messages('<img src="a.png">\n\n<img src="b.png" alt="">')).toEqual([
    '<img src="a.png"> has no alt attribute',
  ])
})

test('a skipped heading level is reported against the rendered levels', () => {
  // ### shifts to ## under the title, so only the #### → (rendered) h4 under h2 skips
  expect(messages('# T\n\n### A\n\n##### B', 'T')).toEqual([
    '"B" is an <h4> directly under an <h2>',
  ])
  expect(messages('## A\n\n### B', 'T')).toEqual([])
})

test('ambiguous link text is reported, whole-text only', () => {
  expect(
    messages(
      'Read [here](/a/). [Click here!](/b/) [the lighting chapter](/c/) [here and there](/d/)'
    )
  ).toEqual([
    'a link named "here" (to /a/) says nothing out of context',
    'a link named "click here" (to /b/) says nothing out of context',
  ])
})

test('findingLine locates a block in its source file', () => {
  const source = '/*#\n# T\n\nIntro.\n\n![](bare.png)\n*/\n'
  const [finding] = accessibilityFindings('# T\n\nIntro.\n\n![](bare.png)\n')
  expect(findingLine(source, finding.raw)).toBe(6)
  expect(findingLine(source, 'not there')).toBeUndefined()
})
