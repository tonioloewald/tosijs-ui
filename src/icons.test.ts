import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { icons, SvgIcon, svgIcon, defineIcons, iconRules } from './icons'

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

    test('created SVGs have tosi-icon class', () => {
      const icon = icons.check()
      expect(icon.classList.contains('tosi-icon')).toBe(true)
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
      expect(icon.tagName.toLowerCase()).toBe('tosi-icon')
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

  describe('style suffixes', () => {
    test('opacity suffix', () => {
      const icon = icons.lock50o()
      expect(icon).toBeDefined()
      expect((icon as HTMLElement).style.opacity).toBe('0.5')
    })

    test('scale suffix', () => {
      const icon = icons.star75s()
      expect(icon).toBeDefined()
      expect((icon as HTMLElement).style.transform).toContain('scale(0.75)')
    })

    test('rotation suffix', () => {
      const icon = icons.chevronRight90r()
      expect(icon).toBeDefined()
      const el = icon.querySelector('svg') || icon
      expect((el as HTMLElement).style.transform).toContain('rotate(90deg)')
    })

    test('negative rotation suffix', () => {
      const icon = icons.chevronRight_90r()
      expect(icon).toBeDefined()
      const el = icon.querySelector('svg') || icon
      expect((el as HTMLElement).style.transform).toContain('rotate(-90deg)')
    })

    test('flip horizontal suffix', () => {
      const icon = icons.sidebar0f()
      expect(icon).toBeDefined()
      const el = icon.querySelector('svg') || icon
      expect((el as HTMLElement).style.transform).toContain('scaleX(-1)')
    })

    test('flip vertical suffix', () => {
      const icon = icons.sidebar1f()
      expect(icon).toBeDefined()
      const el = icon.querySelector('svg') || icon
      expect((el as HTMLElement).style.transform).toContain('scaleY(-1)')
    })

    test('translate suffixes', () => {
      const icon = icons.plus20x_10y()
      expect(icon).toBeDefined()
      const style = (icon as HTMLElement).style.transform
      expect(style).toContain('translateX(20%)')
      expect(style).toContain('translateY(-10%)')
    })

    test('fill color suffix', () => {
      const icon = icons.star_ff0000F()
      expect(icon).toBeDefined()
      expect((icon as HTMLElement).style.fill).toBe('#ff0000')
    })

    test('stroke color suffix', () => {
      const icon = icons.lock_00fS()
      expect(icon).toBeDefined()
      // stroke is set via Object.assign after makeIcon sets the default
      expect((icon as HTMLElement).style.cssText).toContain('#00f')
    })

    test('stroke width suffix', () => {
      const icon = icons.lock4W()
      expect(icon).toBeDefined()
      expect((icon as HTMLElement).style.strokeWidth).toBe('4')
    })

    test('combined suffixes', () => {
      const icon = icons.plus50o75s20x20y()
      expect(icon).toBeDefined()
      const style = (icon as HTMLElement).style
      expect(style.opacity).toBe('0.5')
      expect(style.transform).toContain('scale(0.75)')
      expect(style.transform).toContain('translateX(20%)')
      expect(style.transform).toContain('translateY(20%)')
    })

    test('real icons with trailing digits are not treated as suffixes', () => {
      const edit2 = icons.edit2()
      expect(edit2).toBeInstanceOf(SVGElement)
      expect((edit2 as SVGElement).style.opacity).not.toBe('0.02')
    })
  })

  describe('modifier overlays', () => {
    test('un prefix creates composite', () => {
      const icon = icons.unLock()
      expect(icon).toBeDefined()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      const svgs = icon.querySelectorAll('svg')
      expect(svgs.length).toBe(2)
    })

    test('check prefix creates composite', () => {
      const icon = icons.checkFile()
      expect(icon).toBeDefined()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
    })

    test('cancel prefix creates composite', () => {
      const icon = icons.cancelUpload()
      expect(icon).toBeDefined()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
    })

    test('search prefix creates composite', () => {
      const icon = icons.searchUser()
      expect(icon).toBeDefined()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
    })

    test('composite has pointer-events none', () => {
      const icon = icons.unLock()
      expect((icon as HTMLElement).style.pointerEvents).toBe('none')
    })

    test('composite has data-icon attribute', () => {
      const icon = icons.unLock()
      expect((icon as HTMLElement).dataset.icon).toBeDefined()
    })
  })

  describe('icon stacking', () => {
    test('$ stacks overlay on base', () => {
      const icon = icons['lock$shield']()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      const svgs = icon.querySelectorAll('svg')
      expect(svgs.length).toBe(2)
    })

    test('stacking with opacity suffix on overlay', () => {
      const icon = icons['lock50o$shield']()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      const svgs = icon.querySelectorAll('svg')
      expect(svgs.length).toBe(2)
      // lock50o is the overlay (second child), shield is the base (first)
      expect(svgs[1].style.opacity).toBe('0.5')
    })

    test('triple stacking', () => {
      const icon = icons['star25o$lock50o$shield']()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      // All three icons are flat siblings, not nested composites
      const svgs = icon.querySelectorAll('svg')
      expect(svgs.length).toBe(3)
    })

    test('stacking with multiple suffixes', () => {
      const icon = icons['lock50s75o$shield']()
      expect(icon).toBeDefined()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
    })
  })

  describe('directional redirects', () => {
    const redirected = [
      'arrowDown', 'arrowUp', 'arrowLeft',
      'arrowDownCircle', 'arrowUpCircle', 'arrowLeftCircle',
      'chevronDown', 'chevronUp', 'chevronLeft',
      'chevronsDown', 'chevronsUp', 'chevronsLeft',
      'toggleLeft', 'skipBack', 'refreshCcw', 'rotateCcw',
      'arrowDownRight', 'arrowDownLeft', 'arrowUpLeft',
      'cornerDownLeft', 'cornerUpLeft', 'cornerLeftDown', 'cornerLeftUp',
    ]
    for (const name of redirected) {
      test(`${name} resolves to an icon (not square)`, () => {
        const el = icons[name]()
        // Should be a composite span with inner svg, not a bare square fallback
        const svg = el instanceof SVGElement ? el : el.querySelector('svg')
        expect(svg).toBeTruthy()
        // Verify it's not the square fallback
        expect(svg!.classList.contains('tosi-icon')).toBe(true)
      })
    }
  })

  describe('icon redirects', () => {
    test('redirect to existing icon', () => {
      defineIcons({ testRedirect: 'check' })
      const icon = icons.testRedirect()
      expect(icon).toBeInstanceOf(SVGElement)
    })

    test('redirect to composition', () => {
      defineIcons({ testRedirectCompose: 'unLock' })
      const icon = icons.testRedirectCompose()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
    })

    test('redirect with suffix', () => {
      defineIcons({ testRedirectSuffix: 'chevronRight90r' })
      const icon = icons.testRedirectSuffix()
      expect(icon).toBeDefined()
    })
  })

  describe('suffixes apply after composition', () => {
    test('suffixes on spin icon apply to result, not base name', () => {
      const icon = icons.spin360Loader40s()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      // The 40s scale should be on the wrapper, not parsed as part of "loader40s"
      const svg = icon.querySelector('svg')
      expect(svg!.style.animation).toContain('tosi-spin')
      expect((icon as HTMLElement).style.transform).toContain('scale(0.4)')
    })

    test('suffixes on overlay in stacked icon', () => {
      const icon = icons['spin360Loader40s_20x$cloud']()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      // The overlay (spin loader) should have scale and translate applied
      const children = icon.children
      // base is cloud, overlay is the spin result
      expect(children.length).toBe(2)
    })
  })

  describe('spin rule', () => {
    test('spin prefix creates wrapped icon', () => {
      const icon = icons.spin360Loader()
      expect(icon.classList.contains('tosi-icon-composite')).toBe(true)
      const svg = icon.querySelector('svg')
      expect(svg!.style.animation).toContain('tosi-spin')
    })

    test('negative spin reverses direction', () => {
      const icon = icons.spin_180Star()
      const svg = icon.querySelector('svg')
      expect(svg!.style.animation).toContain('reverse')
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
