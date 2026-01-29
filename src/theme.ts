/*#
# theme

The theme system provides consistent CSS variables across all tosijs-ui components,
with support for automatic dark mode via tosijs's `Color` class and `invertLuminance`.

## Base Variables

All components use these foundational CSS variables with the `--tosi-` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `--tosi-spacing-xs` | 4px | Extra small spacing |
| `--tosi-spacing-sm` | 8px | Small spacing |
| `--tosi-spacing` | 12px | Default spacing |
| `--tosi-spacing-lg` | 16px | Large spacing |
| `--tosi-spacing-xl` | 24px | Extra large spacing |
| `--tosi-bg` | #fafafa | Background color |
| `--tosi-bg-inset` | derived | Inset/recessed background |
| `--tosi-text` | #222 | Text color |
| `--tosi-accent` | #EE257B | Accent/brand color |
| `--tosi-accent-text` | derived | Text on accent background |
| `--tosi-font-family` | system-ui | Font family |
| `--tosi-font-size` | 16px | Base font size |
| `--tosi-line-height` | 1.5 | Line height |
| `--tosi-touch-size` | 44px | Minimum touch target |
| `--tosi-focus-ring` | derived | Focus outline style |

## Creating Themes

```js
import { Color } from 'tosijs'
import { createTheme, applyTheme } from 'tosijs-ui'

const myTheme = createTheme({
  accent: Color.fromCss('#007AFF'),
  background: Color.fromCss('#ffffff'),
  text: Color.fromCss('#1a1a1a'),
})

applyTheme(myTheme, 'my-theme')
```

## Dark Mode

Dark mode is automatic when using `createDarkTheme`:

```js
import { createTheme, createDarkTheme, applyTheme } from 'tosijs-ui'

const colors = {
  accent: Color.fromCss('#007AFF'),
  background: Color.fromCss('#ffffff'),
  text: Color.fromCss('#1a1a1a'),
}

// Apply based on user preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
applyTheme(prefersDark ? createDarkTheme(colors) : createTheme(colors))
```

## Component Variables

Each component defines its own variables that derive from base variables.
For example, xin-select derives from base:

    --tosi-select-gap: var(--tosi-spacing-sm, 8px);
    --tosi-select-touch-size: var(--tosi-touch-size, 44px);

This allows fine-grained customization while maintaining consistency.
*/

import {
  Color,
  invertLuminance,
  StyleSheet,
  vars,
  XinStyleSheet,
  XinStyleRule,
} from 'tosijs'

// ============================================================================
// Theme Colors Interface
// ============================================================================

export interface ThemeColors {
  accent: Color
  background: Color
  text: Color
  // Optional overrides (derived automatically if not provided)
  accentText?: Color
  backgroundInset?: Color
  border?: Color
  shadow?: Color
  focus?: Color
}

// ============================================================================
// Default Colors
// ============================================================================

export const defaultColors: ThemeColors = {
  accent: Color.fromCss('#EE257B'),
  background: Color.fromCss('#fafafa'),
  text: Color.fromCss('#222222'),
}

// ============================================================================
// Base Variables (shared across all components)
// ============================================================================

export const baseVariables: XinStyleRule = {
  // Spacing scale
  _tosiSpacingXs: '4px',
  _tosiSpacingSm: '8px',
  _tosiSpacing: '12px',
  _tosiSpacingLg: '16px',
  _tosiSpacingXl: '24px',

  // Typography
  _tosiFontFamily: 'system-ui, -apple-system, sans-serif',
  _tosiFontSize: '16px',
  _tosiLineHeight: '1.5',
  _tosiCodeFontFamily: 'ui-monospace, monospace',
  _tosiCodeFontSize: '14px',

  // Interactive
  _tosiTouchSize: '44px',
  _tosiBorderRadius: '4px',
  _tosiBorderRadiusLg: '8px',
  _tosiTransition: '0.15s ease-out',
}

// ============================================================================
// Theme Creation Functions
// ============================================================================

/**
 * Creates color variables from ThemeColors
 */
function createColorVariables(colors: ThemeColors): XinStyleRule {
  const { accent, background, text } = colors

  // Derive colors if not provided
  const accentText = colors.accentText ?? accent.contrasting()
  const backgroundInset = colors.backgroundInset ?? background.darken(0.03)
  const border = colors.border ?? text.opacity(0.15)
  const shadow = colors.shadow ?? text.opacity(0.1)
  const focus = colors.focus ?? accent.opacity(0.5)

  return {
    // Core colors
    _tosiAccent: accent,
    _tosiAccentLight: accent.brighten(0.15),
    _tosiAccentDark: accent.darken(0.15),
    _tosiAccentText: accentText,

    // Backgrounds
    _tosiBg: background,
    _tosiBgInset: backgroundInset,
    _tosiBgHover: background.darken(0.05),
    _tosiBgActive: background.darken(0.1),

    // Text
    _tosiText: text,
    _tosiTextMuted: text.opacity(0.6),
    _tosiTextDisabled: text.opacity(0.4),

    // Borders and shadows
    _tosiBorder: border,
    _tosiBorderFocus: accent,
    _tosiShadow: shadow,
    _tosiShadowColor: shadow,

    // Focus ring
    _tosiFocusRing: `0 0 0 2px ${focus}`,

    // Input styling
    _tosiInputBg: background,
    _tosiInputBorder: border,
    _tosiInputBorderFocus: accent,

    // Button styling
    _tosiButtonBg: background,
    _tosiButtonText: text,
    _tosiButtonBorder: border,
    _tosiButtonHoverBg: background.darken(0.05),
    _tosiButtonActiveBg: accent,
    _tosiButtonActiveText: accentText,
  }
}

/**
 * Creates a complete theme stylesheet from colors
 */
export function createTheme(colors: ThemeColors): XinStyleSheet {
  return {
    ':root': {
      ...baseVariables,
      ...createColorVariables(colors),
    },
  }
}

/**
 * Creates a dark theme by inverting luminance of all color values
 */
export function createDarkTheme(colors: ThemeColors): XinStyleSheet {
  const lightTheme = createTheme(colors)
  const rootStyles = lightTheme[':root'] as XinStyleRule

  return {
    ':root': invertLuminance(rootStyles),
  }
}

/**
 * Applies a theme to the document
 * @param theme - The theme stylesheet to apply
 * @param id - Optional ID for the style element (default: 'tosi-theme')
 */
export function applyTheme(theme: XinStyleSheet, id = 'tosi-theme'): void {
  StyleSheet(id, theme)
}

// ============================================================================
// Pre-built Themes
// ============================================================================

export const baseTheme = createTheme(defaultColors)
export const baseDarkTheme = createDarkTheme(defaultColors)

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * Creates CSS variable aliases for backward compatibility with --xin- prefix
 * Add this to your theme if migrating from older xinjs-ui versions
 */
export const legacyAliases: XinStyleRule = {
  // Icon variables
  '--xin-icon-size': vars.tosiIconSize,
  '--xin-icon-fill': vars.tosiIconFill,
  '--xin-icon-stroke': vars.tosiIconStroke,

  // Tab variables
  '--xin-tabs-bar-color': vars.tosiTabsBarColor,
  '--xin-tabs-bar-height': vars.tosiTabsBarHeight,
  '--xin-tabs-selected-color': vars.tosiTabsSelectedColor,

  // Generic variables that some components used
  '--spacing': vars.tosiSpacing,
  '--gap': vars.tosiSpacingSm,
  '--touch-size': vars.tosiTouchSize,
  '--background': vars.tosiBg,
  '--text-color': vars.tosiText,
  '--brand-color': vars.tosiAccent,
  '--brand-text-color': vars.tosiAccentText,
}

/**
 * Creates a theme with legacy aliases included
 */
export function createThemeWithLegacy(colors: ThemeColors): XinStyleSheet {
  const theme = createTheme(colors)
  return {
    ':root': {
      ...(theme[':root'] as XinStyleRule),
      ...legacyAliases,
    },
  }
}

// ============================================================================
// Component Variable Helpers
// ============================================================================

/**
 * Helper to create component-specific variables that derive from base variables
 *
 * Example usage in a component:
 * ```typescript
 * const selectVars = componentVars('select', {
 *   gap: varDefault.tosiSpacingSm('8px'),
 *   touchSize: varDefault.tosiTouchSize('44px'),
 * })
 * ```
 */
export function componentVars<T extends Record<string, string>>(
  componentName: string,
  defaults: T
): { [K in keyof T]: string } {
  const result = {} as { [K in keyof T]: string }
  for (const [key, value] of Object.entries(defaults)) {
    const varName = `--tosi-${componentName}-${key
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()}`
    result[key as keyof T] = `var(${varName}, ${value})`
  }
  return result
}
