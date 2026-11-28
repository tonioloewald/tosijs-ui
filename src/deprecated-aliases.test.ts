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
} from './index.js'

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

/*
Since 1.20.0 the `Xin*` names warn when used (#4389), so each is a Proxy of its class rather
than the class itself: the same class in every way a caller can use it, but not `===`. The
other names here are still plain aliases. `deprecated-alias.test.ts` checks the warning.
*/
const quietly = <T>(read: () => T): T => {
  const { warn, error } = console
  console.warn = console.error = () => {}
  try {
    return read()
  } finally {
    console.warn = warn
    console.error = error
  }
}

describe('deprecated class aliases', () => {
  test.each(aliases)('%s is its canonical class', (name, alias, canonical) => {
    if (name.startsWith('Xin')) {
      expect(quietly(() => (alias as any).prototype)).toBe(
        (canonical as any).prototype
      )
    } else {
      expect(alias).toBe(canonical)
    }
  })
})
