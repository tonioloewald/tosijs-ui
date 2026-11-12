/*
Default theme + page styling for <tosi-doc-system>.

This is the stylesheet the component injects so a generated static page looks like
a finished doc site without depending on any app bootstrap. It uses the legacy
`--brand-color` / `--background` / `--spacing` CSS-variable family that the doc
browser and markdown styles are built on.

Colors are computed from a small set of base colors (accent/background/text and three
surfaces). The derived ones are CSS (`color-mix()`, relative colour syntax) that the browser
computes, so they follow a root wherever it changes; tosijs `Color` math is left only for what
CSS cannot do yet (a colour searched for until it reads on a surface). The aim is to retire the
rest of it as CSS catches up.
*/

import { navSectionStyleSpec } from './nav-styles.js'
import { highlightStyleSpec } from './highlight-styles.js'
import {
  XinStyleSheet,
  XinStyleRule,
  vars,
  Color,
  invertLuminance,
} from 'tosijs'
import { icons, svg2DataUrl } from '../icons.js'
import { DOC_SYSTEM_FONTS_URL } from './doc-fonts.js'
import { formatCssValue } from '../css-value-forms.js'

// The sidebar's geometry, shared by the hydrated layout and the pre-hydration one.
// These mirror what <tosi-sidenav> is given by doc-browser (navSize / minSize): the
// sidebar is `SIDEBAR_WIDTH` wide and collapses behind a toggle below
// `SIDEBAR_BREAKPOINT`. Keep them in step, or the page jumps as it hydrates.
export const SIDEBAR_WIDTH = 200
export const SIDEBAR_BREAKPOINT = 600

export interface DocSystemTheme {
  /** brand / accent color — most of the palette is derived from this */
  accent?: string
  background?: string
  text?: string
  buttonBg?: string
  inputBg?: string
  /** code-editor surface (`--code-bg`); neutral off-white by default, not brand-tinted. */
  /**
   * Background behind code blocks. Default `#fdfdfd` (light) — dark mode inverts it.
   *
   * **The syntax-highlighting palette does not track this.** Those eleven token colours are
   * fixed literals, contrast-checked against the DEFAULT background in both modes; there is
   * no recomputation that keeps hand-chosen colours legible against an arbitrary one. Set a
   * dark `codeBg` for light mode and the worst token measures **1.71:1** against WCAG AA's
   * 4.5. Override it and you own the contrast — retheme the tokens too, via the
   * `--token-*` variables (each is a `varDefault`). Scoped by a test in
   * `doc-system-styles.test.ts`.
   */
  codeBg?: string
}

// The contrast helpers live with the theme, which generates high-contrast modes from them.
export { contrastRatio, readableOn } from '../theme.js'
import { readableOn } from '../theme.js'
import {
  invertedColors,
  ruleValues,
  type ThemeGenerator,
  type ThemeValues,
  type ThemeVariable,
} from '../theme-data.js'

/*
The theme's CHAIN: links that hang from a few roots, written as CSS so that overriding one link
moves everything below it, and resetting it reconnects. A preset (Glass, Material) is a handful
of overrides of these, not a new stylesheet.

- shape: `--tosi-radius` (every corner below hangs from it)
- backdrop: `--tosi-backdrop` (what the page sits on: the background, or a gradient)
- surface: `--tosi-surface` (the fill of menus and other raised surfaces), `--tosi-surface-filter`
  (a backdrop filter for surfaces and bars: `none`, or `blur(16px) saturate(1.4)` for glass),
  `--tosi-rim` (a light edge drawn inside raised surfaces)
- elevation: `--tosi-shadow-color`, and three levels: controls, menus, dialogs
- state: `--tosi-hover-bg`, `--tosi-press-bg` (the layer over a borderless control)
- motion: `--tosi-duration`, `--tosi-easing`, `--tosi-transition`

The colour roots (`--tosi-surface`, `--tosi-shadow-color`, the state layers) are in
`docSystemColors`, so dark mode inverts them with the rest; the links that are expressions live
here and follow them.
*/
export const TOSI_CHAIN: XinStyleRule = {
  _tosiRadius: '5px',
  // What the page sits on: the background colour, or a gradient or image behind glass.
  _tosiBackdrop: vars.background,
  _tosiSurfaceFilter: 'none',
  _tosiRim: 'transparent',
  /*
  Three levels: controls, things that float (menus, tooltips), things that sit over the page
  (dialogs, the palette, notifications). No digits in the names: tosijs reads a trailing
  number as a scale (`vars.tosiElevation2` is `calc(var(--tosi-elevation) * 0.02)`).
  Mid is the doc theme's menu shadow from before the chain. High is left unset, so dialogs,
  the palette and notifications keep the shadows they always had until a theme sets it.
  */
  _tosiElevationLow: `inset 0 0 0 1px ${vars.tosiRim}, 0 1px 2px ${vars.tosiShadowColor}`,
  _tosiElevationMid: `inset 0 0 0 1px ${vars.tosiRim}, 0 4px 8px ${vars.tosiShadowColor}`,
  _tosiDuration: '0.2s',
  _tosiEasing: 'ease-out',
  _tosiTransition: `${vars.tosiDuration} ${vars.tosiEasing}`,
  // The doc site's own variables, as links of the chain.
  _shadowColor: vars.tosiShadowColor,
  _menuBg: vars.tosiSurface,
  _menuShadow: vars.tosiElevationMid,
  _headerBg: vars.brandColor,
  _buttonShadow: 'none',
}

/*
How much of the brand each derived colour takes. They are written as `color-mix(in srgb, …)`,
which the browser computes, and `Color.blend` is the same arithmetic, so the contrast checks
below measure exactly what the page shows.
*/
const NAV_TINT = 8
const INSET_TINT = 12
const LINK_BRAND = 60

const tint = (color: string, percent: number, into: string) =>
  `color-mix(in srgb, ${color} ${percent}%, ${into})`
// `percent` of `color` over nothing: the colour, translucent
const veil = (color: string, percent: number) =>
  tint(color, percent, 'transparent')
// The same mix, in script, for the checks that CSS cannot make yet (readable-on).
const blended = (color: Color, percent: number, into: Color) =>
  color.blend(into, 1 - percent / 100)

// Black or white, whichever reads on `color` (see `css-value-forms`).
const textOn = (color: string) =>
  formatCssValue({ form: 'contrast', of: color })

/*
The colours CSS cannot compute yet, because they are a SEARCH: the brand, darkened or lightened
until it reads on a surface. `contrast-color()` is the CSS for the simple case and is not
baseline; until something like it is, these are worked out here, per mode, from the same
arithmetic as the CSS that draws the surfaces.
*/
function readableColors(
  brandColor: Color,
  { background, inputBg, codeBg }: Record<string, Color>
): XinStyleRule {
  return {
    /*
    Readable, not faint (#3520). This was the brand at 40% opacity, which an axe scan measured
    at 1.88:1 on the input (#eda7c5 on #fdfdfd) where AA asks 4.5:1, and it colours the doc
    header's search trigger, a real label, not just a hint.
    */
    _placeholderColor: readableOn(brandColor, inputBg),
    // The brand, made readable on the inset (blockquote) background, the darker of the two
    // surfaces code sits on. The raw brand measured 3.72:1 there (#3520).
    // Checked against the code background too: a custom `codeBg` can be the darker one.
    _codeColor: readableOn(
      readableOn(brandColor, blended(brandColor, INSET_TINT, background)),
      codeBg
    ),
  }
}

/*
The base colours, as the doc theme computes with them: `theme`'s, or the defaults. Dark mode is
these with their luminance inverted (the brand is lifted instead; see `.darkmode`).
*/
function rootColors(theme: DocSystemTheme) {
  return {
    brand: Color.fromCss(theme.accent ?? '#d92270'),
    text: theme.text ?? '#222',
    background: theme.background ?? '#fafafa',
    buttonBg: theme.buttonBg ?? '#fdfdfd',
    inputBg: theme.inputBg ?? '#fdfdfd',
    codeBg: theme.codeBg ?? '#fdfdfd',
  }
}

/** Compute the full set of `:root` color variables from a few base colors. */
export function docSystemColors(theme: DocSystemTheme = {}): XinStyleRule {
  const roots = rootColors(theme)
  const brandColor = roots.brand
  /*
  Everything but the roots is CSS the browser computes from them, so it follows a root wherever
  it changes: in the theme editor, in dark mode (which inverts the roots and lets these
  re-derive) and in a preset. A theme editor shows each as what it is (a mix of the brand into
  the background) rather than as a colour someone typed.
  */
  return {
    _textColor: roots.text,
    _brandColor: brandColor,
    _background: roots.background,
    _buttonBg: roots.buttonBg,
    _inputBg: roots.inputBg,
    _codeBg: roots.codeBg,
    _backgroundShaded: tint(vars.textColor, 2, vars.background),
    // Tints of the brand, into the page: pale on a light page, deep on a dark one.
    _navBg: tint(vars.brandColor, NAV_TINT, vars.background),
    _insetBg: tint(vars.brandColor, INSET_TINT, vars.background),
    // The brand, toward the text: darker on a light page, lighter on a dark one.
    _linkColor: tint(vars.brandColor, LINK_BRAND, vars.textColor),
    _barColor: veil(vars.brandColor, 40),
    _focusColor: veil(vars.brandColor, 70),
    /*
    Black or white, whichever reads on the brand bar (#3520: a hand-tuned off-white tint
    measured 4.09:1 there). Computed by the browser, so it flips by itself when dark mode lifts
    the brand past the midpoint.
    */
    _brandTextColor: textOn(vars.brandColor),
    ...readableColors(brandColor, {
      background: Color.fromCss(roots.background),
      inputBg: Color.fromCss(roots.inputBg),
      codeBg: Color.fromCss(roots.codeBg),
    }),
    // The surface and elevation roots of the chain (see `--tosi-surface` below).
    _tosiShadowColor: '#0004',
    _tosiSurface: vars.background,
    _tosiHoverBg: veil(vars.textColor, 13),
    _tosiPressBg: veil(vars.textColor, 27),
    _menuItemActiveColor: vars.textColor,
    _menuItemIconActiveColor: vars.textColor,
    _menuItemActiveBg: tint(vars.textColor, 37, vars.background),
    _menuItemHoverBg: tint(vars.textColor, 5, vars.background),
    _menuItemColor: vars.textColor,
    _menuSeparatorColor: veil(vars.textColor, 27),
    _scrollThumbColor: veil(vars.textColor, 40),
    _scrollBarColor: veil(vars.textColor, 7),
    _inputBorderShadow: 'inset 0 0 2px #0006',
  }
}

/** The dark mode's overrides: the roots inverted, the brand lifted, and what reads on them. */
function darkColors(theme: DocSystemTheme): XinStyleRule {
  const roots = rootColors(theme)
  /*
  Lift the brand color for dark backgrounds.

  Inverting the luminance flips the neutrals but would leave a saturated brand hue roughly
  where it was, so one accent would have to serve both a near-white and a near-black page,
  and a pink dark enough to clear AA on `#fafafa` (4.56:1) lands at 4.4:1 on `#050505`, just
  under. Brightening it in dark mode is the standard resolution: the hue is the brand, the
  luminance belongs to the background it sits on.
  */
  const brandColor = roots.brand.brighten(0.18)
  const inverted = (color: string) => Color.fromCss(color).inverseLuminance
  return {
    // Only the roots are colours here; everything computed from them re-derives.
    ...invertLuminance(docSystemColors(theme)),
    _brandColor: brandColor,
    ...readableColors(brandColor, {
      background: inverted(roots.background),
      inputBg: inverted(roots.inputBg),
      codeBg: inverted(roots.codeBg),
    }),
    _tosiShadowColor: veil(vars.brandColor, 50),
    _tosiElevationMid: `0 0 0 2px ${veil(vars.brandColor, 75)}`,
    _menuSeparatorColor: veil(vars.brandColor, 50),
  }
}

/**
 * Build the full doc-system stylesheet for a given base theme.
 *
 * `fontImport: false` leaves out the web fonts' `@import`. The static site does that and links
 * the fonts from `<head>` instead: an `@import` cannot start until the stylesheet holding it
 * has arrived, so it chained a second blocking request behind the first (#3631).
 */
export function docSystemStyleSpec(
  theme: DocSystemTheme = {},
  { fontImport = true }: { fontImport?: boolean } = {}
): XinStyleSheet {
  const colors = docSystemColors(theme)
  return {
    ...(fontImport ? { '@import': DOC_SYSTEM_FONTS_URL } : {}),
    ':root': {
      _fontFamily: "'Aleo', sans-serif",
      _codeFontFamily: "'Spline Sans Mono', monospace",
      _fontSize: '16px',
      _codeFontSize: '14px',
      ...colors,
      // Bridge the tosijs component palette (`--tosi-*`) onto the doc-system's color
      // family. Defined as REFERENCES, so a component reading `var(--tosi-bg)` follows
      // the site theme automatically — including dark mode, where `invertLuminance()`
      // flips the referenced `--background`/`--text-color`/… in `.darkmode`. Without
      // this the doc-system never set `--tosi-*`, so components fell back to their
      // baked-in light defaults (e.g. `var(--tosi-bg, #fff)` → white <tosi-table> in
      // dark mode). Colors only — component metrics keep their own defaults.
      _tosiAccent: vars.brandColor,
      _tosiBg: vars.background,
      _tosiText: vars.textColor,
      _tosiBgInset: vars.insetBg,
      _spacing: '10px',
      _lineHeight: 'calc(var(--font-size) * 1.6)',
      _h1Scale: '2',
      _h2Scale: '1.5',
      _h3Scale: '1.25',
      _touchSize: '32px',
      _headerHeight:
        'calc( var(--line-height) * var(--h2-scale) + var(--spacing) * 2 )',
      // The content column's width. ONE definition, read by both the hydrated
      // doc-browser (doc-browser.ts) and the pre-hydration `:not(:defined)` layout
      // below — if these two ever disagree, the page jumps on hydration.
      _docContentMaxWidth: '44em',
      /*
      Corner radii, as variables so a theme can change them, all hanging from `--tosi-radius`
      (5px): set that and every corner follows, or set one of these to cut it loose. The
      defaults are what the rules computed before (halves and quarters of the default 10px
      spacing), so a site that sets none looks the same.
      */
      _buttonRadius: vars.tosiRadius,
      _inputRadius: vars.tosiRadius,
      _quoteRadius: 'calc(var(--tosi-radius) * 2)',
      _codeRadius: 'calc(var(--tosi-radius) / 2)',
      // The components' own radii (theme.ts defaults), here so a doc theme can edit them.
      _tosiBorderRadius: 'calc(var(--tosi-radius) * 0.8)',
      _tosiBorderRadiusLg: 'calc(var(--tosi-radius) * 1.6)',
      ...TOSI_CHAIN,
    },
    /*
    Per-page layout, driven by `layout:` in a doc's metadata (see `Doc.layout`).

    Both are variable overrides rather than new layout rules, which is what keeps them cheap
    and non-invasive: the measure is already `--doc-content-max-width`, so a page opts out by
    changing one value. Nothing here runs for a corpus that never sets `layout`.
    */
    'tosi-doc-system[data-layout="full-width"]': {
      _docContentMaxWidth: 'none',
    },
    /*
    `full-screen` — no measure, and no chrome.

    These rules are for the PRE-HYDRATION page, whose markup is a plain `<nav class="doc-nav">`
    with no inline styles, so hiding it here works and works on first paint. Once the bundle
    loads, the nav becomes a slotted node inside `<tosi-sidenav>` carrying its own inline
    `display`, and CSS can no longer touch it — the doc-browser sets `sidenav.navHidden`
    instead. Different DOM before and after hydration, so genuinely two rules rather than a
    belt-and-braces duplicate.
    */
    'tosi-doc-system[data-layout="full-screen"]': {
      _docContentMaxWidth: 'none',
    },
    'tosi-doc-system[data-layout="full-screen"] .doc-content': {
      /*
      A definite height, so a child asking for `height: 100%` gets one.

      "The content is the viewport" is the promise this layout makes, and a demo, a canvas or an
      embedded app is the reason to use it — all of which want to FILL, not to sit in a tall
      box. Without a height here `100%` on a child resolves against `auto` and collapses to its
      content.
      */
      height: '100%',
      /*
      The gutter and the scroller both go through VARIABLES, because `.doc-content`'s `padding`
      and `overflow` are INLINE styles set by the doc-browser — declared here they would simply
      lose.

      `overflow` used to be declared directly, so this layout's scroller never existed: the
      `height: 100%` landed and the `overflow: auto` did not, giving a full-screen page whose
      content is taller than the box a clipped, unscrollable article rather than the scroll
      container the layout promises (tosijs-ui#119). `padding` had the note and `overflow` did
      not, one line apart.
      */
      _docContentPadding: '0',
      _docContentOverflow: 'auto',
    },
    /*
    `.doc-nav.doc-nav` — the class twice, on purpose.

    `tosi-doc-system:not(:defined) .doc-nav` (the pre-hydration layout, further down this same
    sheet) has IDENTICAL specificity to the single-class form, so which one wins is decided by
    source order, and it sits later. Winning on position works until someone reorders the spec,
    at which point the nav quietly comes back on full-screen pages with nothing to point at.
    Repeating the class costs one selector token and settles it on specificity, wherever these
    rules end up living.
    */
    'tosi-doc-system[data-layout="full-screen"] > .doc-nav.doc-nav, tosi-doc-system[data-layout="full-screen"] > .doc-navbar.doc-navbar':
      {
        display: 'none',
      },
    /*
    `header: false` — no header bar on this page (#226). One variable takes the bar's space
    away everywhere it is reserved (the pre-hydration inset, the nav's top, the hydrated
    column), and the bar itself is hidden before hydration (`::before`) and after (`header`).
    */
    'tosi-doc-system[data-no-header]': {
      _headerHeight: '0px',
    },
    'tosi-doc-system[data-no-header]::before, tosi-doc-system[data-no-header] header':
      {
        display: 'none',
      },
    '.darkmode': darkColors(theme),
    '.high-contrast': {
      filter: 'contrast(2)',
    },
    '*': {
      boxSizing: 'border-box',
      scrollbarColor: `${vars.scrollThumbColor} ${vars.scrollBarColor}`,
      scrollbarWidth: 'thin',
    },
    body: {
      fontFamily: vars.fontFamily,
      fontSize: vars.fontSize,
      margin: '0',
      lineHeight: vars.lineHeight,
      background: vars.tosiBackdrop,
      backgroundAttachment: 'fixed',
      _tosiTabsSelectedColor: vars.brandColor,
      _tosiTabsBarColor: vars.brandTextColor,
      _menuItemIconColor: vars.brandColor,
      color: vars.textColor,
    },
    // <tosi-doc-system> is a light-DOM block that fills the viewport; the doc
    // browser container inside it provides the flex column + 100vh.
    'tosi-doc-system': {
      display: 'block',
    },
    'tosi-doc-system tosi-sidenav::part(nav)': {
      background: vars.navBg,
      backdropFilter: vars.tosiSurfaceFilter,
    },

    // ── Pre-hydration layout (`:not(:defined)`) ──────────────────────────────
    //
    // An UNDEFINED custom element is `display: inline`, so before the bundle loads
    // the pre-rendered page — which already contains the nav tree, the content and
    // the code blocks — stacks as bare text with no chrome. That reflow-on-hydrate
    // is why the page used to hide its own body (`body{opacity:0}`) until the
    // bundle arrived: on a cheap phone that's ~4.5s of blank screen for content
    // that was in the HTML at ~300ms.
    //
    // Instead, lay the static page out AS THOUGH the chrome were already there:
    // the content sits in a scrolling rectangle inset by the header, and by the
    // sidebar once the viewport is wide enough. Hydration then only ADDS the
    // chrome — and `doc-browser` ADOPTS this very `.doc-content` node rather than
    // re-rendering it, so with the same box metrics below, nothing moves at all.
    //
    // These rules evaporate by themselves the moment the element upgrades.
    'tosi-doc-system:not(:defined)': {
      display: 'block',
      position: 'fixed',
      inset: `${vars.headerHeight} 0 0 0`,
      overflow: 'auto',
    },
    // The header bar: painted, not populated — its contents (brand, links) arrive
    // with hydration, in this exact space.
    'tosi-doc-system:not(:defined)::before': {
      content: '""',
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: vars.headerHeight,
      background: vars.brandColor,
    },
    // Same box the hydrated doc-browser gives this node (see doc-browser.ts), so
    // adoption is a no-op geometrically.
    'tosi-doc-system:not(:defined) .doc-content': {
      display: 'block',
      maxWidth: vars.docContentMaxWidth,
      margin: 'auto',
      padding: 'var(--doc-content-padding, 0 1em)',
      // Must match doc-browser's inline style EXACTLY, `overflow` included: it
      // establishes a block formatting context, which stops the <h1>'s top margin
      // collapsing out of the box. Without it the static content sits 10px lower
      // than the hydrated content, and the page nudges as it comes alive.
      // Same variable as the inline style, so a page that overrides one overrides
      // both — otherwise the override would land only after hydration and the page
      // would visibly change shape (#119).
      overflow: 'var(--doc-content-overflow, hidden)',
    },
    // The header-bar links are icon links; without the icon font they'd render as
    // stray text in the bar. They arrive with hydration.
    'tosi-doc-system:not(:defined) .doc-navbar': {
      display: 'none',
    },
    // A `test` block is an example's ASSERTIONS. The live example keeps them behind
    // a tab — a reader is never shown them — so rendering them statically both
    // misrepresents the page and adds height that disappears the moment the example
    // mounts. (`:has()` is a progressive enhancement: where it isn't supported the
    // block simply stays visible, which is what happens today anyway.)
    'tosi-doc-system:not(:defined) pre:has(> code.language-test)': {
      display: 'none',
    },
    // Below the sidebar breakpoint (side-nav goes compact under
    // `doc-browser`'s minSize) the nav is behind a toggle, so it isn't shown.
    'tosi-doc-system:not(:defined) .doc-nav': {
      display: 'none',
    },
    // Wide enough for the sidebar: reserve its column, and show the REAL nav tree
    // in it. It's a plain <ul> of real links, every section expanded when there is no
    // JavaScript to collapse one (no `tosi-js` on <html>) — a no-JS reader gets a
    // working site, and hydration merely upgrades it in place.
    [`@media (min-width: ${SIDEBAR_BREAKPOINT}px)`]: {
      'tosi-doc-system:not(:defined)': {
        left: `${SIDEBAR_WIDTH}px`,
      },
      'tosi-doc-system:not(:defined) .doc-nav': {
        display: 'block',
        position: 'fixed',
        left: '0',
        top: vars.headerHeight,
        bottom: '0',
        width: `${SIDEBAR_WIDTH}px`,
        overflow: 'auto',
        background: vars.navBg,
        // NO padding. The hydrated nav sits in a <tosi-sidenav> whose own padding is 0 —
        // the visual inset comes from `.doc-link`'s padding, which both states share. A
        // `padding: spacing` here shifted every static nav link 10px right, so the whole
        // column jumped left the instant the bundle loaded. Whatever this block sets, the
        // upgraded component must already set too, or hydration is not "purely additive".
        padding: '0',
      },
      // NOTE: no `a` / `ul` rules here on purpose. There used to be a second,
      // hand-authored copy of the nav's link styling under `:not(:defined)`, because
      // the static generator emitted a bare <a> while the hydrated nav emits
      // <a class="doc-link">. It drifted (2.5px vs 5px/15px padding, a brand-coloured
      // underline that only the static copy had), so every page painted one nav and
      // then reflowed into a different one. The generator now emits `doc-link` too, so
      // the SHARED rules below style both states and nothing moves on hydration.
      //
      // Only genuinely pre-hydration-specific rules belong in this block — the fixed
      // positioning above, which the upgraded component takes over itself.
    },
    '.center': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    'input, button, select, textarea': {
      fontFamily: vars.fontFamily,
      fontSize: vars.fontSize,
      color: 'currentColor',
      background: vars.inputBg,
    },
    select: {
      WebkitAppearance: 'none',
      appearance: 'none',
    },
    header: {
      background: vars.headerBg,
      backdropFilter: vars.tosiSurfaceFilter,
      color: vars.brandTextColor,
      _textColor: vars.brandTextColor,
      _linkColor: vars.brandTextColor,
      display: 'flex',
      alignItems: 'center',
      padding: '0 var(--spacing)',
      lineHeight: 'calc(var(--line-height) * var(--h1-scale))',
      height: vars.headerHeight,
      whiteSpace: 'nowrap',
    },
    h1: {
      color: vars.brandColor,
      fontSize: 'calc(var(--font-size) * var(--h1-scale))',
      lineHeight: 'calc(var(--line-height) * var(--h1-scale))',
      fontWeight: '400',
      borderBottom: `4px solid ${vars.barColor}`,
      margin: `${vars.spacing} 0 ${vars.spacing200}`,
      padding: 0,
    },
    'header .site-name': {
      color: vars.brandTextColor,
      whiteSpace: 'nowrap',
      fontWeight: '700',
      fontSize: 'calc(var(--font-size) * var(--h2-scale))',
      lineHeight: 'calc(var(--line-height) * var(--h2-scale))',
      margin: 'calc(var(--spacing) * var(--h2-scale)) 0',
    },
    h2: {
      color: vars.brandColor,
      fontSize: 'calc(var(--font-size) * var(--h2-scale))',
      lineHeight: 'calc(var(--line-height) * var(--h2-scale))',
      margin: 'calc(var(--spacing) * var(--h2-scale)) 0',
    },
    h3: {
      fontSize: 'calc(var(--font-size) * var(--h3-scale))',
      lineHeight: 'calc(var(--line-height) * var(--h3-scale))',
      margin: 'calc(var(--spacing) * var(--h3-scale)) 0',
    },
    'input[type=search]': {
      borderRadius: 99,
    },
    // The link to the next page of a section read in order (continue-link.ts, #255).
    '.doc-continue': {
      marginTop: vars.spacing200,
      paddingTop: vars.spacing,
      boxShadow: `inset 0 1px 0 ${vars.shadowColor}`,
      fontWeight: '700',
    },
    blockquote: {
      position: 'relative',
      background: vars.insetBg,
      margin: '0 48px 56px 0',
      borderRadius: vars.quoteRadius,
      padding: 'var(--spacing) calc(var(--spacing) * 2)',
      filter: `drop-shadow(0px 1px 1px ${vars.shadowColor})`,
    },
    'blockquote > :first-child': {
      marginTop: '0',
    },
    'blockquote > :last-child': {
      marginBottom: '0',
    },
    'blockquote::before': {
      content: '" "',
      display: 'block',
      width: 1,
      height: 1,
      border: '10px solid transparent',
      borderTopColor: vars.insetBg,
      borderRightColor: vars.insetBg,
      position: 'absolute',
      bottom: -20,
      right: 24,
    },
    'blockquote::after': {
      content: '" "',
      width: 48,
      height: 48,
      display: 'block',
      bottom: -48,
      right: -24,
      position: 'absolute',
      background: svg2DataUrl(icons.tosi(), undefined, undefined, 2),
    },
    a: {
      textDecoration: 'none',
      color: vars.linkColor,
      opacity: '0.9',
      borderBottom: '1px solid var(--brand-color)',
    },
    'button, select, .clickable': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: vars.tosiTransition,
      /*
      Set the COLOUR, do not redefine the palette token (#150).

      This was `--text-color: var(--brand-color); color: var(--text-color)`, which redefines a
      GLOBAL theme token on an element selector. `--text-color` is what the whole palette is
      built from (`--tosi-text: var(--text-color)`), so from any `<button>` downward it stopped
      meaning "the theme's text colour" and meant the brand colour instead.

      That reaches into anything embedded. An editor deriving its chrome from the page
      (`--editor-text: var(--tosi-text)`) resolved correctly in the document and to the brand
      colour on its own slotted toolbar buttons — measured at oklab L≈0.27 against an L 0.16
      bar in dark mode, unreadable, with correct body text beside it.

      Redefining an inherited token on an element selector poisons the subtree for every
      consumer of that token, not just for this rule. Setting `color` says the same thing and
      says only it.
      */
      color: vars.brandColor,
      textDecoration: 'none',
      background: vars.buttonBg,
      boxShadow: vars.buttonShadow,
      padding: '0 calc(var(--spacing) * 1.25)',
      border: 'none',
      borderRadius: vars.buttonRadius,
    },
    'button, select, .clickable, input': {
      lineHeight: 'calc(var(--line-height) + var(--spacing))',
    },
    /*
    Text fields. Not a checkbox, radio, range or colour well: the field's padding and inset
    border drew a box around a slider's track.
    */
    'input:where(:not([type=checkbox], [type=radio], [type=range], [type=color])), textarea':
      {
        border: 'none',
        outline: 'none',
        borderRadius: vars.inputRadius,
        boxShadow: vars.inputBorderShadow,
        padding: '0 calc(var(--spacing) * 1.5)',
      },
    // A textarea's lines are the text's, with the same inset as a field's single line.
    textarea: {
      padding: 'calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.5)',
      lineHeight: vars.lineHeight,
    },
    /*
    A segmented control is as tall as the fields and buttons beside it, and its corners follow
    the buttons' (8px on the stock 5px, a pill where buttons are pills).
    */
    'tosi-segmented': {
      _segmentedOptionPadding:
        'calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.25)',
      _segmentedOptionsBorderRadius: 'calc(var(--button-radius) * 1.6)',
    },
    '::placeholder': {
      color: vars.placeholderColor,
    },
    img: {
      verticalAlign: 'middle',
    },
    'button:hover, .clickable:hover': {
      boxShadow: 'inset 0 0 0 2px var(--brand-color)',
    },
    'button:active, .clickable:active': {
      background: vars.brandColor,
      color: vars.brandTextColor,
    },
    label: {
      display: 'inline-flex',
      gap: 'calc(var(--spacing) * 0.5)',
      alignItems: 'center',
    },
    '.elastic': {
      flex: '1 1 auto',
      overflow: 'hidden',
      position: 'relative',
    },
    // Scope the icon styling (currentColor fill, click-through) to actual icons
    // and SVGs inside buttons — a blanket `svg` rule sets pointer-events:none on
    // every SVG, which breaks interactive SVG-based UIs (maps, charts, diagrams).
    'svg.tosi-icon, button svg': {
      fill: 'currentColor',
      pointerEvents: 'none',
    },
    '[aria-selected]': {
      background: '#08835820',
    },
    ':disabled': {
      opacity: '0.5',
      filter: 'saturate(0)',
      pointerEvents: 'none',
    },
    pre: {
      background: vars.codeBg,
      padding: vars.spacing,
      borderRadius: vars.codeRadius,
      overflow: 'auto',
      fontSize: vars.codeFontSize,
      lineHeight: 'calc(var(--font-size) * 1.2)',
    },
    'pre, code': {
      fontFamily: vars.codeFontFamily,
      // Same defect as the button rule above (#150): this redefined the global
      // `--text-color` token rather than setting a colour, so everything inside a `<pre>`
      // — including every syntax-highlighting token span — inherited a palette where the
      // theme's text colour had been replaced by the brand colour.
      color: vars.codeColor,
    },
    /*
    Prism token colours for STATIC code blocks — TWO palettes, because there are two
    backgrounds (blocker B2 of the 1.15.0 review).

    The rules themselves now live in `highlight-styles.ts` — see there for the palette and
    the measured contrast figures. What is worth keeping HERE is why it shipped broken.

    The first version applied VSCode **Dark+** literals unconditionally. `--code-bg` is
    `#fdfdfd` in light mode, which is the DEFAULT — the pre-paint script adds `darkmode` only
    on an explicit or system preference — so every token type failed WCAG AA on the page most
    readers see: function/class-name at 1.39:1, operator 1.46:1, property 1.47:1. Four were
    effectively invisible.

    What let it ship is worse than the mistake. The BOOK palette in `book-html.ts` was
    contrast-checked against `#f6f8fa`; for the site I wrote "the site's code sits on a dark
    code background" and treated that sentence as the check. It was false, and it appeared in
    four places including the CHANGELOG — a justification standing in for a measurement.
    */
    /*
    ONE copy, in `highlight-styles.ts`. It used to live inline here, which meant the token
    palette was reachable only by importing the entire doc-site chrome — so a standalone
    `<tosi-highlight>` rendered correct token markup in flat black. Spread, not duplicated.
    */
    ...highlightStyleSpec,
    '.transparent, .iconic': {
      background: 'none',
    },
    '.iconic': {
      padding: '0',
      fontSize: '150%',
      height: 'calc(var(--line-height) + var(--spacing))',
      lineHeight: 'calc(var(--line-height) + var(--spacing))',
      width: 'calc(var(--line-height) + var(--spacing))',
      textAlign: 'center',
    },
    '.transparent:hover, .iconic:hover': {
      background: vars.tosiHoverBg,
      boxShadow: 'none',
      color: vars.textColor,
    },
    '.transparent:active, .iconic:active': {
      background: vars.tosiPressBg,
      boxShadow: 'none',
      color: vars.textColor,
    },
    '.current, .nav-branch-head:has(.current)': {
      background: vars.background,
    },
    '.doc-link': {
      cursor: 'pointer',
      borderBottom: 'none',
      transition: `calc(${vars.tosiDuration} * 0.75) ${vars.tosiEasing}`,
      marginLeft: '10px',
      padding: 'calc(var(--spacing) * 0.5) calc(var(--spacing) * 1.5)',
    },
    '.doc-link:not(.current):hover': {
      background: vars.background,
    },
    '.doc-link:not(.current)': {
      opacity: '0.8',
      marginLeft: 0,
    },
    'tosi-example': {
      margin: 'var(--spacing) 0',
    },
    'tosi-example [part=editors]': {
      background: vars.insetBg,
    },
    "[class*='icon-'], tosi-icon": {
      color: 'currentcolor',
      pointerEvents: 'none',
    },
    "[class*='icon-']": {
      verticalAlign: 'middle',
    },
    // Every other block element brings its own margin; without one a table sat flush
    // against a following blockquote, whose top margin is 0 by design (#3553).
    table: {
      borderCollapse: 'collapse',
      margin: `${vars.spacing} 0 ${vars.spacing200} 0`,
    },
    thead: {
      background: vars.brandColor,
      color: vars.brandTextColor,
    },
    tbody: {
      background: vars.background,
    },
    'tr:nth-child(2n)': {
      background: vars.backgroundShaded,
    },
    'th, td': {
      padding: 'calc(var(--spacing) * 0.5) var(--spacing)',
    },
    // Nav lists carry semantics only — no list styling. Hierarchy indentation
    // comes from left-padding on each section's child list.
    '.doc-nav ul, .doc-nav li': {
      listStyle: 'none',
      margin: 0,
      padding: 0,
    },
    '.doc-nav li': {
      display: 'flex',
      flexDirection: 'column',
    },
    '.doc-nav': {
      display: 'flex',
      flexDirection: 'column',
    },
    ...navSectionStyleSpec,
    // Declarative header link list — shown for no-JS, removed on hydration.
    '.doc-navbar': {
      listStyle: 'none',
      display: 'flex',
      flexWrap: 'wrap',
      gap: vars.spacing,
      margin: 0,
      padding: vars.spacing,
    },
  }
}

/*
The doc site's theme as theme data (`theme-data.ts`): the generator reads the same
`docSystemStyleSpec` the site is styled with, so an edited theme and the stock one cannot
disagree about what a base colour produces.
*/
const DOC_THEME_DEFAULTS = {
  accent: '#d92270',
  background: '#fafafa',
  text: '#222222',
  codeBg: '#fdfdfd',
  inputBg: '#fdfdfd',
  buttonBg: '#fdfdfd',
}

const docThemeVariables = (rule: unknown): ThemeValues =>
  ruleValues(rule as XinStyleRule)

export const docSystemThemeGenerator: ThemeGenerator = {
  base: [
    { name: 'accent', kind: 'color', label: 'Accent' },
    { name: 'background', kind: 'color', label: 'Background' },
    { name: 'text', kind: 'color', label: 'Text' },
    { name: 'codeBg', kind: 'color', label: 'Code background' },
    { name: 'inputBg', kind: 'color', label: 'Input background' },
    { name: 'buttonBg', kind: 'color', label: 'Button background' },
  ],
  defaults: DOC_THEME_DEFAULTS,
  light: (base) =>
    docThemeVariables(docSystemStyleSpec(base, { fontImport: false })[':root']),
  dark: (base, light) => {
    const spec = docSystemStyleSpec(base, { fontImport: false })
    const generated = docThemeVariables(spec[':root'])
    // Colours tuned by hand in light carry into dark, inverted like the generated ones.
    const tuned = Object.fromEntries(
      Object.entries(light).filter(([name, value]) => generated[name] !== value)
    )
    return {
      ...docThemeVariables(spec['.darkmode']),
      ...invertedColors(tuned),
    }
  },
}

/** The doc site's variables a theme editor offers, beyond the base colours. */
export const DOC_SYSTEM_THEME_VARIABLES: ThemeVariable[] = [
  { name: 'brand-color', kind: 'color', label: 'Brand', group: 'Colours' },
  { name: 'background', kind: 'color', label: 'Background', group: 'Colours' },
  { name: 'text-color', kind: 'color', label: 'Text', group: 'Colours' },
  { name: 'link-color', kind: 'color', label: 'Links', group: 'Colours' },
  { name: 'nav-bg', kind: 'color', label: 'Navigation', group: 'Colours' },
  {
    name: 'inset-bg',
    kind: 'color',
    label: 'Inset (quotes)',
    group: 'Colours',
  },
  {
    name: 'code-bg',
    kind: 'color',
    label: 'Code background',
    group: 'Colours',
  },
  { name: 'code-color', kind: 'color', label: 'Inline code', group: 'Colours' },
  { name: 'input-bg', kind: 'color', label: 'Inputs', group: 'Colours' },
  { name: 'button-bg', kind: 'color', label: 'Buttons', group: 'Colours' },
  { name: 'menu-bg', kind: 'color', label: 'Menus', group: 'Colours' },
  {
    name: 'font-family',
    kind: 'font-family',
    label: 'Text font',
    group: 'Type',
  },
  {
    name: 'code-font-family',
    kind: 'font-family',
    label: 'Code font',
    group: 'Type',
  },
  { name: 'font-size', kind: 'length', label: 'Text size', group: 'Type' },
  { name: 'code-font-size', kind: 'length', label: 'Code size', group: 'Type' },
  { name: 'h1-scale', kind: 'number', label: 'Heading 1 scale', group: 'Type' },
  { name: 'h2-scale', kind: 'number', label: 'Heading 2 scale', group: 'Type' },
  { name: 'h3-scale', kind: 'number', label: 'Heading 3 scale', group: 'Type' },
  { name: 'spacing', kind: 'length', label: 'Spacing', group: 'Layout' },
  { name: 'tosi-radius', kind: 'length', label: 'Corners', group: 'Corners' },
  {
    name: 'button-radius',
    kind: 'length',
    label: 'Button corners',
    group: 'Corners',
  },
  {
    name: 'input-radius',
    kind: 'length',
    label: 'Input corners',
    group: 'Corners',
  },
  {
    name: 'quote-radius',
    kind: 'length',
    label: 'Quote corners',
    group: 'Corners',
  },
  {
    name: 'code-radius',
    kind: 'length',
    label: 'Code corners',
    group: 'Corners',
  },
  {
    name: 'tosi-border-radius',
    kind: 'length',
    label: 'Components',
    group: 'Corners',
  },
  {
    name: 'tosi-border-radius-lg',
    kind: 'length',
    label: 'Large components',
    group: 'Corners',
  },
  {
    name: 'tosi-backdrop',
    kind: 'image',
    label: 'Backdrop',
    group: 'Surfaces',
  },
  { name: 'tosi-surface', kind: 'color', label: 'Fill', group: 'Surfaces' },
  {
    name: 'tosi-surface-filter',
    kind: 'text',
    label: 'Backdrop filter',
    group: 'Surfaces',
  },
  { name: 'tosi-rim', kind: 'color', label: 'Rim', group: 'Surfaces' },
  { name: 'header-bg', kind: 'color', label: 'Header', group: 'Surfaces' },
  {
    name: 'tosi-shadow-color',
    kind: 'color',
    label: 'Shadow colour',
    group: 'Elevation',
  },
  {
    name: 'tosi-elevation-low',
    kind: 'shadow',
    label: 'Controls',
    group: 'Elevation',
  },
  {
    name: 'tosi-elevation-mid',
    kind: 'shadow',
    label: 'Menus',
    group: 'Elevation',
  },
  {
    name: 'tosi-elevation-high',
    kind: 'shadow',
    label: 'Dialogs',
    group: 'Elevation',
  },
  {
    name: 'button-shadow',
    kind: 'shadow',
    label: 'Buttons',
    group: 'Elevation',
  },
  { name: 'tosi-hover-bg', kind: 'color', label: 'Hover', group: 'States' },
  { name: 'tosi-press-bg', kind: 'color', label: 'Pressed', group: 'States' },
  { name: 'tosi-duration', kind: 'text', label: 'Duration', group: 'Motion' },
  { name: 'tosi-easing', kind: 'text', label: 'Easing', group: 'Motion' },
  {
    name: 'touch-size',
    kind: 'length',
    label: 'Touch target',
    group: 'Layout',
  },
  {
    name: 'doc-content-max-width',
    kind: 'length',
    label: 'Text column',
    group: 'Layout',
  },
]
