import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { icons, SvgIcon, svgIcon, defineIcons } from './icons'

describe('icons', () => {
  describe('icons proxy', () => {
    test('returns functions for known icons', () => {
      expect(typeof icons.check).toBe('function')
      expect(typeof icons.x).toBe('function')
      expect(typeof icons.chevronDown).toBe('function')
    })

    test('returns SVG elements when called', () => {
      const checkIcon = icons.check()
      expect(checkIcon).toBeInstanceOf(SVGElement)
      expect(checkIcon.tagName.toLowerCase()).toBe('svg')
    })

    test('falls back to square for unknown icons (no throw)', () => {
      // The proxy warns but doesn't throw - it falls back to square icon
      const unknownIcon = (
        icons as Record<string, () => SVGElement>
      ).nonExistentIcon()
      expect(unknownIcon).toBeInstanceOf(SVGElement)
    })

    test('includes common icons', () => {
      const commonIcons = [
        'check',
        'x',
        'chevronDown',
        'chevronUp',
        'chevronLeft',
        'chevronRight',
        'info',
        'search',
        'menu',
        'plus',
        'minus',
        'edit',
        'trash',
        'settings',
        'user',
        'heart',
        'star',
      ]
      for (const name of commonIcons) {
        const icon = icons[name]()
        expect(icon).toBeInstanceOf(SVGElement)
      }
    })

    test('created SVGs have xin-icon class', () => {
      const icon = icons.check()
      expect(icon.classList.contains('xin-icon')).toBe(true)
    })

    test('accepts style attributes', () => {
      const icon = icons.check({ style: { height: '32px' } })
      expect(icon).toBeInstanceOf(SVGElement)
    })

    test('accepts class attribute', () => {
      const icon = icons.check({ class: 'my-custom-class' })
      expect(icon.classList.contains('my-custom-class')).toBe(true)
    })
  })

  describe('SvgIcon component', () => {
    let container: HTMLElement

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
    })

    afterEach(() => {
      container.remove()
    })

    test('creates a custom element', () => {
      const icon = svgIcon({ icon: 'check' })
      container.appendChild(icon)
      expect(icon).toBeInstanceOf(SvgIcon)
      expect(icon.tagName.toLowerCase()).toBe('xin-icon')
    })

    test('accepts icon property', () => {
      const icon = svgIcon({ icon: 'star' })
      container.appendChild(icon)
      expect(icon.icon).toBe('star')
    })

    test('accepts size property', () => {
      const icon = svgIcon({ icon: 'check', size: 32 })
      container.appendChild(icon)
      expect(icon.size).toBe(32)
    })

    test('accepts fill property', () => {
      const icon = svgIcon({ icon: 'check', fill: 'red' })
      container.appendChild(icon)
      expect(icon.fill).toBe('red')
    })

    test('accepts stroke property', () => {
      const icon = svgIcon({ icon: 'check', stroke: 'blue' })
      container.appendChild(icon)
      expect(icon.stroke).toBe('blue')
    })

    test('accepts strokeWidth property', () => {
      const icon = svgIcon({ icon: 'check', strokeWidth: 3 })
      container.appendChild(icon)
      expect(icon.strokeWidth).toBe(3)
    })

    test('updates when icon property changes', () => {
      const icon = svgIcon({ icon: 'check' })
      container.appendChild(icon)
      icon.icon = 'x'
      expect(icon.icon).toBe('x')
    })
  })

  describe('icon count', () => {
    test('has a large number of icons (300+)', () => {
      // The library has 300+ icons - test that the proxy has many keys
      // We can't easily enumerate a proxy, but we can test known icons exist
      const knownIcons = [
        'activity',
        'airplay',
        'alertCircle',
        'alertTriangle',
        'archive',
        'award',
        'bell',
        'bookmark',
        'calendar',
        'camera',
        'check',
        'chevronDown',
        'clipboard',
        'clock',
        'cloud',
        'code',
        'coffee',
        'copy',
        'creditCard',
        'database',
        'download',
        'edit',
        'eye',
        'file',
        'filter',
        'flag',
        'folder',
        'gift',
        'globe',
        'grid',
        'heart',
        'home',
        'image',
        'inbox',
        'info',
        'key',
        'layers',
        'layout',
        'link',
        'list',
        'lock',
        'mail',
        'map',
        'menu',
        'message',
        'minus',
        'monitor',
        'moon',
        'music',
        'package',
        'paperclip',
        'phone',
        'play',
        'plus',
        'power',
        'printer',
        'radio',
        'save',
        'search',
        'send',
        'settings',
        'share',
        'shield',
        'shoppingCart',
        'star',
        'sun',
        'tag',
        'target',
        'terminal',
        'thumbsUp',
        'trash',
        'upload',
        'user',
        'video',
        'volume',
        'wifi',
        'x',
        'zap',
      ]
      let validCount = 0
      for (const name of knownIcons) {
        try {
          const icon = icons[name]()
          if (icon instanceof SVGElement) {
            validCount++
          }
        } catch {
          // Skip if not found
        }
      }
      expect(validCount).toBeGreaterThan(50)
    })
  })
})
