import { test, expect } from 'bun:test'
import { splitCaptionIcon } from './caption-icon.js'
import { tosiSegmented } from './segmented.js'

test('caption:icon splits at the first colon, so an icon may hold one', () => {
  expect(splitCaptionIcon('Done')).toEqual(['Done', ''])
  expect(splitCaptionIcon(' Done : check ')).toEqual(['Done', 'check'])
  expect(splitCaptionIcon('Done:check:square')).toEqual([
    'Done',
    'check:square',
  ])
  expect(splitCaptionIcon(':lock')).toEqual(['', 'lock'])
})

test('segmented choices and other keep an explicit rule name whole', () => {
  const segmented = tosiSegmented({
    choices: 'done=Done:check:square',
    other: 'Other:un:lock',
  })
  document.body.append(segmented)
  try {
    const choices = (segmented as any)._choicesWithOther
    expect(choices[0].caption).toBe('Done')
    // A rule draws a composite: two svgs. The prefix alone would be one.
    expect(choices[0].icon.querySelectorAll('svg').length).toBe(2)
    expect(choices[1]).toEqual({ value: '', caption: 'Other', icon: 'un:lock' })
  } finally {
    segmented.remove()
  }
})
