import { test, expect } from 'bun:test'
import {
  affixCell,
  affixPosition,
  parsePlacement,
  describePlacement,
  tosiAffix,
} from './affix'

test('affixPosition accepts the twelve edge positions and defaults the rest to nw', () => {
  expect(affixPosition('EN')).toBe('en')
  expect(affixPosition(' s ')).toBe('s')
  expect(affixPosition('side')).toBe('nw')
  expect(affixPosition('')).toBe('nw')
  expect(affixPosition(undefined)).toBe('nw')
})

test('parsePlacement reads a position and an optional inside', () => {
  expect(parsePlacement('s inside')).toEqual({ position: 's', inside: true })
  expect(parsePlacement('inside es')).toEqual({ position: 'es', inside: true })
  expect(parsePlacement('wn')).toEqual({ position: 'wn', inside: false })
  expect(parsePlacement('')).toBe(null)
  expect(describePlacement({ position: 's', inside: true })).toBe('s inside')
  expect(describePlacement({ position: 'en', inside: false })).toBe('en')
})

test('affixCell: the first letter is the edge, the second the alignment along it', () => {
  // outside: the edge's own cell, hugging the content
  expect(affixCell({ position: 'en', inside: false })).toMatchObject({
    row: 2,
    column: 3,
    alignSelf: 'start',
    justifySelf: 'start',
    direction: 'column',
  })
  expect(affixCell({ position: 'ne', inside: false })).toMatchObject({
    row: 1,
    column: 2,
    alignSelf: 'end',
    justifySelf: 'end',
    direction: 'row',
  })
  expect(affixCell({ position: 'ws', inside: false })).toMatchObject({
    row: 2,
    column: 1,
    alignSelf: 'end',
    justifySelf: 'end',
  })
  expect(affixCell({ position: 's', inside: false })).toMatchObject({
    row: 3,
    column: 2,
    alignSelf: 'start',
    justifySelf: 'center',
  })
  // inside: the content's cell, against the edge
  expect(affixCell({ position: 's', inside: true })).toMatchObject({
    row: 2,
    column: 2,
    alignSelf: 'end',
    justifySelf: 'center',
  })
  expect(affixCell({ position: 'en', inside: true })).toMatchObject({
    row: 2,
    column: 2,
    alignSelf: 'start',
    justifySelf: 'end',
  })
})

test('position and inside read back what was set before anything is laid out', () => {
  const affix = tosiAffix({ position: 'es', inside: true })
  document.body.append(affix)
  expect(affix.position).toBe('es')
  expect(affix.inside).toBe(true)
  expect(affix.wanted).toEqual({ position: 'es', inside: true })
  // the attribute is what was asked for; the affix never writes its placement over it
  affix.setAttribute('position', 'wn')
  expect(affix.wanted.position).toBe('wn')
  expect(affix.getAttribute('position')).toBe('wn')
  affix.remove()
})
