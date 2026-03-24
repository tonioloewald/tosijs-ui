/* eslint-disable */
import { test, expect, describe } from 'bun:test'

/**
 * Tests that deprecated class aliases export both a type and a value,
 * so consumers can use them interchangeably with the new names.
 *
 * The "as a type" tests use TypeScript's type system at compile time —
 * if these imports fail to compile, the aliases are broken.
 */

import {
  // Class aliases (deprecated names → new names)
  DataTable,
  XinCarousel,
  XinFloat,
  XinField,
  XinForm,
  XinMenu,
  XinNotification,
  XinPasswordStrength,
  XinRating,
  XinSegmented,
  XinSelect,
  XinSizer,
  XinTag,
  XinTagList,
  XinWord,
  LocalePicker,
  MarkdownViewer,
  SideNav,
  TabSelector,
  XinLocalized,

  // Canonical names
  TosiTable,
  TosiCarousel,
  TosiFloat,
  TosiField,
  TosiForm,
  TosiMenu,
  TosiNotification,
  TosiPasswordStrength,
  TosiRating,
  TosiSegmented,
  TosiSelect,
  TosiSizer,
  TosiTag,
  TosiTagList,
  RichText,
  TosiLocalePicker,
  TosiMd,
  TosiSidenav,
  TosiTabs,
  TosiLocalized,
} from './index'

// Type-level tests: these lines verify that each alias works as a type.
// If the export is only `const Foo = Bar` without a matching `type Foo = Bar`,
// these would fail to compile.
type _t01 = DataTable
type _t02 = XinCarousel
type _t03 = XinFloat
type _t04 = XinField
type _t05 = XinForm
type _t06 = XinMenu
type _t07 = XinNotification
type _t08 = XinPasswordStrength
type _t09 = XinRating
type _t10 = XinSegmented
type _t11 = XinSelect
type _t12 = XinSizer
type _t13 = XinTag
type _t14 = XinTagList
type _t15 = XinWord
type _t16 = LocalePicker
type _t17 = MarkdownViewer
type _t18 = SideNav
type _t19 = TabSelector
type _t20 = XinLocalized

// Type assignability: alias type === canonical type
type _a01 = DataTable extends TosiTable ? true : never
type _a02 = TosiTable extends DataTable ? true : never
type _a03 = XinSelect extends TosiSelect ? true : never
type _a04 = TosiSelect extends XinSelect ? true : never

const aliases: [string, unknown, unknown][] = [
  ['DataTable', DataTable, TosiTable],
  ['XinCarousel', XinCarousel, TosiCarousel],
  ['XinFloat', XinFloat, TosiFloat],
  ['XinField', XinField, TosiField],
  ['XinForm', XinForm, TosiForm],
  ['XinMenu', XinMenu, TosiMenu],
  ['XinNotification', XinNotification, TosiNotification],
  ['XinPasswordStrength', XinPasswordStrength, TosiPasswordStrength],
  ['XinRating', XinRating, TosiRating],
  ['XinSegmented', XinSegmented, TosiSegmented],
  ['XinSelect', XinSelect, TosiSelect],
  ['XinSizer', XinSizer, TosiSizer],
  ['XinTag', XinTag, TosiTag],
  ['XinTagList', XinTagList, TosiTagList],
  ['XinWord', XinWord, RichText],
  ['LocalePicker', LocalePicker, TosiLocalePicker],
  ['MarkdownViewer', MarkdownViewer, TosiMd],
  ['SideNav', SideNav, TosiSidenav],
  ['TabSelector', TabSelector, TosiTabs],
  ['XinLocalized', XinLocalized, TosiLocalized],
]

describe('deprecated class aliases', () => {
  test.each(aliases)(
    '%s is the same class as its canonical name',
    (name, alias, canonical) => {
      expect(alias).toBe(canonical)
    }
  )
})
