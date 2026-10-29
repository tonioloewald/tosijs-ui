import { test, expect } from 'bun:test'
import { applyAltText } from './alt-text.js'

const doc = (text: string) => ({
  filename: 'a.md',
  title: 'A',
  path: 'a.md',
  text,
})

test('fills the images the report would flag, and only those', async () => {
  const asked: string[] = []
  const { docs, ...counts } = await applyAltText(
    [
      doc(
        '![](bare.png)\n\n![Has alt](alt.png)\n\n![](shown.png)\n\n*A caption.*\n\n![](bare.png "t")'
      ),
    ],
    ({ src, title }) => {
      asked.push(`${src}${title ? ` (${title})` : ''}`)
      return `A picture of ${src}`
    }
  )
  expect(asked).toEqual(['bare.png', 'bare.png (t)'])
  expect(counts).toEqual({ asked: 2, supplied: 2 })
  expect(docs[0].text).toBe(
    '![A picture of bare.png](bare.png)\n\n![Has alt](alt.png)\n\n![](shown.png)\n\n*A caption.*\n\n![A picture of bare.png](bare.png "t")'
  )
})

test('no answer leaves the image (and the doc object) as it was', async () => {
  const input = [doc('![](bare.png)')]
  const { docs, asked, supplied } = await applyAltText(input, async () => '  ')
  expect(docs[0]).toBe(input[0])
  expect({ asked, supplied }).toEqual({ asked: 1, supplied: 0 })
})

test('one question per distinct image on a page; alt text is escaped onto one line', async () => {
  let calls = 0
  const { docs } = await applyAltText(
    [doc('![](a.png) and again ![](a.png)')],
    () => (calls++, 'A [bracketed]\nline')
  )
  expect(calls).toBe(1)
  expect(docs[0].text).toBe(
    '![A \\[bracketed\\] line](a.png) and again ![A \\[bracketed\\] line](a.png)'
  )
})
