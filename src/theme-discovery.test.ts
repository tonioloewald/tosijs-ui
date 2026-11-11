import { test, expect } from 'bun:test'
import {
  groupVariables,
  inferKind,
  namePattern,
  parentsOf,
} from './theme-discovery.js'

test('namePattern matches a glob, with or without the dashes, or a RegExp', () => {
  expect(namePattern('sf-*')('sf-accent')).toBe(true)
  expect(namePattern('--sf-*')('sf-accent')).toBe(true)
  expect(namePattern('sf-*')('tosi-accent')).toBe(false)
  expect(namePattern('md-*-size')('md-sys-typescale-body-size')).toBe(true)
  expect(namePattern(/^glass-/)('glass-tint')).toBe(true)
})

test('parentsOf reads every variable a value refers to, fallbacks included', () => {
  expect(
    parentsOf('color-mix(in oklab, var(--a) 20%, var(--b, var(--c)))')
  ).toEqual(['a', 'b', 'c'])
  expect(parentsOf('#fff')).toEqual([])
})

test('inferKind tells numbers and fonts by value and name', () => {
  expect(inferKind('md-sys-typescale-label-weight', '500')).toBe('number')
  expect(inferKind('glass-saturation', '1.4')).toBe('number')
})

test('groupVariables drops the shared prefix and groups by family', () => {
  const groups = groupVariables([
    'md-sys-color-primary',
    'md-sys-color-on-primary',
    'md-sys-shape-corner-small',
    'md-sys-shape-corner-large',
    'md-sys-elevation-level1',
    'md-ref-typeface-plain',
  ])
  expect(groups.get('md-sys-color-on-primary')).toEqual({
    group: 'Color',
    label: 'on primary',
  })
  expect(groups.get('md-sys-shape-corner-large')).toEqual({
    group: 'Shape',
    label: 'corner large',
  })
  expect(groups.get('md-sys-elevation-level1')).toEqual({
    group: 'General',
    label: 'elevation level1',
  })
  expect(groups.get('md-ref-typeface-plain')!.group).toBe('General')

  const glass = groupVariables(['glass-accent', 'glass-tint', 'glass-blur'])
  expect(glass.get('glass-tint')).toEqual({ group: 'General', label: 'tint' })
})
