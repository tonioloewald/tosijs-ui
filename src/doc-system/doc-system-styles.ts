/*
Default theme + page styling for <tosi-doc-system>.

This is the stylesheet the component injects so a generated static page looks like
a finished doc site without depending on any app bootstrap. It uses the legacy
`--brand-color` / `--background` / `--spacing` CSS-variable family that the doc
browser and markdown styles are built on.

Colors are computed from a small set of base colors via tosijs `Color` math, so the
palette can eventually be driven entirely by a few attributes on the element
(accent/background/text) — most of the palette is derived from `accent`.
*/

import {
  XinStyleSheet,
  XinStyleRule,
  vars,
  Color,
  invertLuminance,
} from 'tosijs'
import { icons, svg2DataUrl } from '../icons'

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
}

/** Compute the full set of `:root` color variables from a few base colors. */
export function docSystemColors(theme: DocSystemTheme = {}): XinStyleRule {
  const brandColor = Color.fromCss(theme.accent ?? '#EE257B')
  return {
    _textColor: theme.text ?? '#222',
    _brandColor: brandColor,
    _background: theme.background ?? '#fafafa',
    _buttonBg: theme.buttonBg ?? '#fdfdfd',
    _inputBg: theme.inputBg ?? '#fdfdfd',
    _backgroundShaded: '#f5f5f5',
    _navBg: brandColor.rotate(30).desaturate(0.5).brighten(0.9),
    _barColor: brandColor.opacity(0.4),
    _focusColor: brandColor.opacity(0.7),
    _placeholderColor: brandColor.opacity(0.4),
    _brandTextColor: brandColor.rotate(30).brighten(0.9),
    _insetBg: brandColor.rotate(45).brighten(0.8),
    _codeBg: brandColor.rotate(-15).desaturate(0.5).brighten(0.9),
    _linkColor: brandColor.rotate(-30).darken(0.5),
    _shadowColor: '#0004',
    _menuBg: '#fafafa',
    _menuItemActiveColor: '#000',
    _menuItemIconActiveColor: '#000',
    _menuItemActiveBg: '#aaa',
    _menuItemHoverBg: '#eee',
    _menuItemColor: '#222',
    _menuSeparatorColor: '#2224',
    _menuShadow: '0 4px 8px #0004',
    _scrollThumbColor: '#0006',
    _scrollBarColor: '#0001',
    _inputBorderShadow: 'inset 0 0 2px #0006',
  }
}

/** Build the full doc-system stylesheet for a given base theme. */
export function docSystemStyleSpec(theme: DocSystemTheme = {}): XinStyleSheet {
  const colors = docSystemColors(theme)
  const brandColor = Color.fromCss(theme.accent ?? '#EE257B')
  return {
    '@import':
      'https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,100..900;1,100..900&famiSpline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap',
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
    },
    '.darkmode': {
      ...invertLuminance(colors),
      _shadowColor: brandColor.opacity(0.5),
      _menuShadow: `0 0 0 2px ${brandColor.opacity(0.75)}`,
      _menuSeparatorColor: brandColor.opacity(0.5),
    },
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
      background: vars.background,
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
      padding: '0 1em',
      // Must match doc-browser's inline style EXACTLY, `overflow` included: it
      // establishes a block formatting context, which stops the <h1>'s top margin
      // collapsing out of the box. Without it the static content sits 10px lower
      // than the hydrated content, and the page nudges as it comes alive.
      overflow: 'hidden',
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
    // in it. It's a plain <ul> with native <details> groups, so it navigates and
    // collapses without a line of JavaScript — a no-JS reader gets a working site,
    // and hydration merely upgrades it in place.
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
      'tosi-doc-system:not(:defined) .doc-nav summary': {
        cursor: 'pointer',
      },
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
      background: vars.brandColor,
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
    'header h2': {
      color: vars.brandTextColor,
      whiteSpace: 'nowrap',
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
    blockquote: {
      position: 'relative',
      background: vars.insetBg,
      margin: '0 48px 56px 0',
      borderRadius: vars.spacing,
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
      transition: 'ease-out 0.2s',
      _textColor: vars.brandColor,
      color: vars.textColor,
      textDecoration: 'none',
      background: vars.buttonBg,
      padding: '0 calc(var(--spacing) * 1.25)',
      border: 'none',
      borderRadius: 'calc(var(--spacing) * 0.5)',
    },
    'button, select, .clickable, input': {
      lineHeight: 'calc(var(--line-height) + var(--spacing))',
    },
    'input, textarea': {
      border: 'none',
      outline: 'none',
      borderRadius: 'calc(var(--spacing) * 0.5)',
      boxShadow: vars.inputBorderShadow,
    },
    input: {
      padding: '0 calc(var(--spacing) * 1.5)',
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
      borderRadius: 'calc(var(--spacing) * 0.25)',
      overflow: 'auto',
      fontSize: vars.codeFontSize,
      lineHeight: 'calc(var(--font-size) * 1.2)',
    },
    'pre, code': {
      fontFamily: vars.codeFontFamily,
      _textColor: vars.brandColor,
    },
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
      background: '#0002',
      boxShadow: 'none',
      color: vars.textColor,
    },
    '.transparent:active, .iconic:active': {
      background: '#0004',
      boxShadow: 'none',
      color: vars.textColor,
    },
    '.current, summary:has(.current)': {
      background: vars.background,
    },
    '.doc-link': {
      cursor: 'pointer',
      borderBottom: 'none',
      transition: '0.15s ease-out',
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
    table: {
      borderCollapse: 'collapse',
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
    // comes from left-padding on each section's child list (inside <details>).
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
    '.doc-nav details > ul': {
      paddingLeft: vars.spacing,
    },
    // <summary> is the section header (its triangle toggles; the link navigates).
    '.doc-nav summary': {
      cursor: 'pointer',
      // indent the disclosure marker a bit from the edge
      paddingLeft: 'calc(var(--spacing) * 0.5)',
    },
    '.doc-nav summary::marker': {
      color: vars.brandColor,
    },
    '.doc-nav summary > .doc-link': {
      display: 'inline-block',
      // push the summary text in a bit less than a normal doc-link
      paddingLeft: 'calc(var(--spacing) * 0.5)',
    },
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
