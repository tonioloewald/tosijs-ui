/*#
# theme presets

A preset is a whole look, given as theme data: a few base colours for the doc theme's generator,
and overrides of the theme's chain (`--tosi-radius`, `--tosi-surface`, `--tosi-elevation-mid`, …)
in light and dark. The doc site ships three: **Original** (the stock theme, no overrides),
**Glass** (translucent, blurred surfaces over a gradient backdrop) and **Material** (Material 3
colours, shapes and elevation).

Set `themePresets: true` in the site config and the settings menu gains a **Style** submenu.
Every preset's CSS is in the site's stylesheet, scoped to a class (`tosi-style-glass`) on
`<html>` and `<body>`, and the page's head script sets the class before first paint, so a
reader who picked Glass never sees the original look flash first.

A preset is ordinary theme data, so it is also a starting point: open the theme editor, and what
you tune is saved on top of the site's theme like any other edit.
*/

/*{ "parent": "Helper Libraries", "description": "Theme presets: Original, Glass and Material as theme data over the doc theme's chain, switchable from the settings menu with no flash on load." }*/

import type { XinStyleSheet } from 'tosijs'
import {
  resolveTheme,
  themeStyleSheet,
  THEME_MODE_SPECS,
  type ThemeData,
} from '../theme-data.js'
import {
  docSystemThemeGenerator,
  type DocSystemTheme,
} from './doc-system-styles.js'

export interface ThemePreset {
  /** what it is stored under, and its class: `glass` → `tosi-style-glass` */
  name: string
  /** what the menu calls it */
  label: string
  /** the overrides; null for the theme as it stands */
  theme: ThemeData | null
}

const GLASS: ThemeData = {
  base: { accent: '#3355dd', background: '#eef2f8', text: '#1d1d1f' },
  modes: {
    light: {
      'tosi-backdrop': 'linear-gradient(160deg, #6087ba, #b7cdea)',
      background: '#ffffff40',
      'background-shaded': '#ffffff26',
      'nav-bg': '#ffffff33',
      'header-bg': 'color-mix(in srgb, var(--brand-color) 72%, transparent)',
      'inset-bg': '#ffffff59',
      'code-bg': '#ffffff8c',
      'button-bg': '#ffffff59',
      'input-bg': '#ffffff73',
      'tosi-surface': '#ffffffb3',
      'tosi-surface-filter': 'blur(16px) saturate(1.4)',
      'tosi-rim': '#ffffffcc',
      'tosi-shadow-color': '#00000033',
      'tosi-elevation-high':
        'inset 0 0 0 1px var(--tosi-rim), 0 12px 32px var(--tosi-shadow-color)',
      'tosi-radius': '10px',
      'button-radius': '999px',
      'button-shadow':
        'inset 1px 1.5px 1px 0 #ffffffb3, inset -1px -1.5px 1px 0 #ffffff66, 0 2px 6px #0002',
      'input-border-shadow': 'inset 0 0 0 1px #ffffff99',
      'font-family': "system-ui, -apple-system, 'Helvetica Neue', sans-serif",
    },
    dark: {
      'tosi-backdrop': 'linear-gradient(160deg, #10182c, #2b3a5a)',
      background: '#00000040',
      'background-shaded': '#ffffff0a',
      'nav-bg': '#0000004d',
      'inset-bg': '#ffffff14',
      'code-bg': '#00000066',
      'button-bg': '#ffffff1a',
      'input-bg': '#0000004d',
      'tosi-surface': '#1c1c1ecc',
      'tosi-rim': '#ffffff33',
      'tosi-shadow-color': '#00000099',
      'tosi-elevation-mid': `inset 0 0 0 1px var(--tosi-rim), 0 8px 24px var(--tosi-shadow-color)`,
      'tosi-elevation-high': `inset 0 0 0 1px var(--tosi-rim), 0 12px 32px var(--tosi-shadow-color)`,
      'button-shadow':
        'inset 1px 1.5px 1px 0 #ffffff33, inset -1px -1.5px 1px 0 #ffffff1a, 0 2px 6px #0006',
      'input-border-shadow': 'inset 0 0 0 1px #ffffff26',
    },
  },
}

const MATERIAL: ThemeData = {
  base: {
    accent: '#6750a4',
    background: '#fef7ff',
    text: '#1d1b20',
    buttonBg: '#f3edf7',
    inputBg: '#fef7ff',
    codeBg: '#f7f2fa',
  },
  modes: {
    light: {
      'font-family': "'Roboto', system-ui, sans-serif",
      'nav-bg': '#f7f2fa',
      'tosi-surface': '#f3edf7',
      'tosi-radius': '12px',
      'button-radius': '20px',
      'input-radius': '4px',
      'quote-radius': '16px',
      'code-radius': '8px',
      'tosi-shadow-color': '#0000004d',
      'tosi-elevation-low':
        '0 1px 2px var(--tosi-shadow-color), 0 1px 3px 1px #00000026',
      'tosi-elevation-mid':
        '0 1px 2px var(--tosi-shadow-color), 0 2px 6px 2px #00000026',
      'tosi-elevation-high':
        '0 4px 4px var(--tosi-shadow-color), 0 8px 12px 6px #00000026',
      'input-border-shadow': 'inset 0 0 0 1px #79747e',
      'tosi-hover-bg': 'color-mix(in srgb, var(--brand-color) 8%, transparent)',
      'tosi-press-bg':
        'color-mix(in srgb, var(--brand-color) 12%, transparent)',
      'tosi-easing': 'cubic-bezier(0.2, 0, 0, 1)',
    },
    dark: {
      'input-border-shadow': 'inset 0 0 0 1px #938f99',
    },
  },
  fonts: [
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  ],
}

/** The presets the doc site offers. */
export const DOC_THEME_PRESETS: ThemePreset[] = [
  { name: 'original', label: 'Original', theme: null },
  { name: 'glass', label: 'Glass', theme: GLASS },
  { name: 'material', label: 'Material', theme: MATERIAL },
]

/** The class that selects a preset, on `<html>` and `<body>`. */
export const presetClass = (name: string): string => `tosi-style-${name}`

/** A mode's selector, narrowed to a preset: `.darkmode` → `.darkmode.tosi-style-glass`. */
const presetSelector = (selector: string, name: string): string =>
  `${selector === ':root' ? '' : selector}.${presetClass(name)}`

/**
 * Every preset's CSS, each scoped to its class. A preset's base colours start from the site's
 * `theme`, as an edited theme's do.
 */
export function presetStyleSheet(
  presets: ThemePreset[] = DOC_THEME_PRESETS,
  base: DocSystemTheme = {}
): XinStyleSheet {
  const sheet: XinStyleSheet = {}
  for (const { name, theme } of presets) {
    if (!theme) continue
    const resolved = resolveTheme(
      {
        ...theme,
        base: { ...(base as Record<string, string>), ...theme.base },
      },
      docSystemThemeGenerator
    )
    const selectors = Object.fromEntries(
      THEME_MODE_SPECS.map((spec) => [
        spec.name,
        presetSelector(spec.selector, name),
      ])
    )
    Object.assign(sheet, themeStyleSheet(resolved, selectors))
  }
  return sheet
}
