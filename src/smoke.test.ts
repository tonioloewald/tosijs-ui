import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

// Import all component creators
import { tosiFloat } from './float'
import { tosiRating } from './rating'
import { tosiSegmented } from './segmented'
import { svgIcon } from './icons'
import { tosiSelect } from './select'
import { tosiMonth } from './month'
import { tosiSizer } from './sizer'
import { tosiHeader, tosiHeaderLinks } from './header'
import { tosiPasswordStrength } from './password-strength'
import { sizeBreak } from './size-break'
import { tosiRow, tosiColumn, tosiGrid } from './layout'
import { tosiRichText } from './rich-text'
import { abTest } from './ab-test'
import { tosiLocalePicker, tosiLocalized } from './localize'
import { tosiMd } from './markdown-viewer'
import { filterBuilder } from './filter-builder'
import { tosiSidenav } from './side-nav'
import { tosiTag, tosiTagList } from './tag-list'
import { tosiField, tosiForm } from './form'
import { tosiNotification } from './notifications'
import { tosiDialog } from './dialog'
import { tosiCarousel } from './carousel'
import { tosiTabs } from './tab-selector'
import { tosiTable } from './data-table'
import { colorInput } from './color-input'
import { editableRect } from './editable-rect'
import { tosiMenu } from './menu'
import { tosiRouteView } from './router'
import { tosiThemeEditor } from './live-theme'
import { b3d } from './babylon-3d'
import { bodymovinPlayer } from './bodymovin-player'
import { codeEditor } from './code-editor'
import { mapBox } from './mapbox'

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
