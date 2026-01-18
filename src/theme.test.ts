import { test, expect, describe } from 'bun:test'
import { Color } from 'tosijs'
import {
  createTheme,
  createDarkTheme,
  createThemeWithLegacy,
  defaultColors,
  baseVariables,
  ThemeColors,
} from './theme'

describe('theme', () => {
  describe('defaultColors', () => {
    test('has required color properties', () => {
      expect(defaultColors.accent).toBeInstanceOf(Color)
      expect(defaultColors.background).toBeInstanceOf(Color)
      expect(defaultColors.text).toBeInstanceOf(Color)
    })
  })

  describe('baseVariables', () => {
    test('includes spacing scale', () => {
      expect(baseVariables._tosiSpacingXs).toBe('4px')
      expect(baseVariables._tosiSpacingSm).toBe('8px')
      expect(baseVariables._tosiSpacing).toBe('12px')
      expect(baseVariables._tosiSpacingLg).toBe('16px')
      expect(baseVariables._tosiSpacingXl).toBe('24px')
    })

    test('includes typography variables', () => {
      expect(baseVariables._tosiFontSize).toBe('16px')
      expect(baseVariables._tosiLineHeight).toBe('1.5')
    })

    test('includes interactive variables', () => {
      expect(baseVariables._tosiTouchSize).toBe('44px')
      expect(baseVariables._tosiBorderRadius).toBe('4px')
    })
  })

  describe('createTheme', () => {
    test('creates theme with :root selector', () => {
      const theme = createTheme(defaultColors)
      expect(theme[':root']).toBeDefined()
    })

    test('includes base variables', () => {
      const theme = createTheme(defaultColors)
      const root = theme[':root'] as Record<string, unknown>
      expect(root._tosiSpacing).toBe('12px')
      expect(root._tosiFontSize).toBe('16px')
    })

    test('includes color variables', () => {
      const theme = createTheme(defaultColors)
      const root = theme[':root'] as Record<string, unknown>
      expect(root._tosiAccent).toBeDefined()
      expect(root._tosiBg).toBeDefined()
      expect(root._tosiText).toBeDefined()
    })

    test('derives accent text color automatically', () => {
      const theme = createTheme(defaultColors)
      const root = theme[':root'] as Record<string, unknown>
      expect(root._tosiAccentText).toBeDefined()
    })

    test('derives background inset color', () => {
      const theme = createTheme(defaultColors)
      const root = theme[':root'] as Record<string, unknown>
      expect(root._tosiBgInset).toBeDefined()
    })

    test('accepts custom colors', () => {
      const customColors: ThemeColors = {
        accent: Color.fromCss('#007AFF'),
        background: Color.fromCss('#ffffff'),
        text: Color.fromCss('#000000'),
      }
      const theme = createTheme(customColors)
      const root = theme[':root'] as Record<string, unknown>
      // The accent color should be set (Color objects convert to CSS strings)
      expect(root._tosiAccent).toBeDefined()
    })
  })

  describe('createDarkTheme', () => {
    test('creates theme with :root selector', () => {
      const theme = createDarkTheme(defaultColors)
      expect(theme[':root']).toBeDefined()
    })

    test('inverts luminance of colors', () => {
      const lightTheme = createTheme(defaultColors)
      const darkTheme = createDarkTheme(defaultColors)

      const lightRoot = lightTheme[':root'] as Record<string, unknown>
      const darkRoot = darkTheme[':root'] as Record<string, unknown>

      // Background should be inverted (light -> dark)
      expect(lightRoot._tosiBg).not.toEqual(darkRoot._tosiBg)
    })
  })

  describe('createThemeWithLegacy', () => {
    test('includes legacy aliases', () => {
      const theme = createThemeWithLegacy(defaultColors)
      const root = theme[':root'] as Record<string, unknown>

      // Check for legacy variable aliases
      expect(root['--spacing']).toBeDefined()
      expect(root['--touch-size']).toBeDefined()
      expect(root['--background']).toBeDefined()
    })

    test('includes new tosi variables', () => {
      const theme = createThemeWithLegacy(defaultColors)
      const root = theme[':root'] as Record<string, unknown>

      expect(root._tosiSpacing).toBe('12px')
      expect(root._tosiAccent).toBeDefined()
    })
  })
})
