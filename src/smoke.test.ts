import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

// Import all component creators
import { tosiFloat } from './float.js'
import { tosiRating } from './rating.js'
import { tosiSegmented } from './segmented.js'
import { svgIcon } from './icons.js'
import { tosiSelect } from './select.js'
import { tosiMonth } from './month.js'
import { tosiSizer } from './sizer.js'
import { tosiHeader, tosiHeaderLinks } from './header.js'
import { tosiPasswordStrength } from './password-strength.js'
import { sizeBreak } from './size-break.js'
import { tosiRow, tosiColumn, tosiGrid } from './layout.js'
import { tosiRichText } from './rich-text.js'
import { abTest } from './ab-test.js'
import { tosiLocalePicker, tosiLocalized } from './localize.js'
import { tosiMd } from './markdown-viewer.js'
import { filterBuilder } from './filter-builder.js'
import { tosiSidenav } from './side-nav.js'
import { tosiTag, tosiTagList } from './tag-list.js'
import { tosiField, tosiForm } from './form.js'
import { tosiNotification } from './notifications.js'
import { tosiDialog } from './dialog.js'
import { tosiCarousel } from './carousel.js'
import { tosiTabs } from './tab-selector.js'
import { tosiTable } from './data-table.js'
import { colorInput } from './color-input.js'
import { editableRect } from './editable-rect.js'
import { tosiMenu } from './menu.js'
import { tosiRouteView } from './router.js'
import { tosiThemeEditor } from './live-theme.js'
import { b3d } from './babylon-3d.js'
import { bodymovinPlayer } from './bodymovin-player.js'
import { codeEditor } from './code-editor.js'
import { mapBox } from './mapbox.js'

describe('component smoke tests', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  const smoke = (name: string, create: () => HTMLElement) => {
    test(`${name} creates without error`, () => {
      const el = create()
      expect(el).toBeDefined()
      expect(el).toBeInstanceOf(HTMLElement)
      container.appendChild(el)
      expect(el.isConnected).toBe(true)
    })
  }

  smoke('tosi-float', () => tosiFloat())
  smoke('tosi-rating', () => tosiRating())
  smoke('tosi-segmented', () =>
    tosiSegmented({ options: ['a', 'b', 'c'], value: 'a' })
  )
  smoke('tosi-icon', () => svgIcon({ icon: 'check' }))
  smoke('tosi-select', () => tosiSelect({ options: ['one', 'two'] }))
  smoke('tosi-month', () => tosiMonth())
  smoke('tosi-sizer', () => tosiSizer())
  smoke('tosi-header', () => tosiHeader())
  smoke('tosi-header-links', () => tosiHeaderLinks())
  smoke('tosi-password-strength', () => tosiPasswordStrength())
  smoke('tosi-sizebreak', () => sizeBreak())
  smoke('tosi-row', () => tosiRow())
  smoke('tosi-column', () => tosiColumn())
  smoke('tosi-grid', () => tosiGrid())
  smoke('tosi-rich-text', () => tosiRichText())
  smoke('tosi-ab', () => abTest())
  smoke('tosi-locale-picker', () => tosiLocalePicker())
  smoke('tosi-localized', () => tosiLocalized())
  smoke('tosi-md', () => tosiMd({ value: '# Hello' }))
  smoke('tosi-filter', () => filterBuilder())
  smoke('tosi-sidenav', () => tosiSidenav())
  smoke('tosi-tag', () => tosiTag({ value: 'test' }))
  smoke('tosi-tag-list', () => tosiTagList({ value: ['a', 'b'] }))
  smoke('tosi-field', () => tosiField({ key: 'test', caption: 'Test' }))
  smoke('tosi-form', () => tosiForm())
  smoke('tosi-notification', () => tosiNotification())
  smoke('tosi-dialog', () => tosiDialog())
  smoke('tosi-carousel', () => tosiCarousel())
  smoke('tosi-tabs', () => tosiTabs())
  smoke('tosi-table', () => tosiTable({ array: [{ a: 1, b: 2 }] }))
  smoke('tosi-color', () => colorInput())
  smoke('tosi-editable', () => editableRect())
  smoke('tosi-menu', () => tosiMenu())
  smoke('tosi-route-view', () => tosiRouteView())
  smoke('tosi-theme-editor', () => tosiThemeEditor())
  smoke('tosi-3d', () => b3d())
  smoke('tosi-lottie', () => bodymovinPlayer())
  smoke('tosi-code', () => codeEditor())
  smoke('tosi-map', () => mapBox())
})
