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
import { vars, Color, invertLuminance } from 'tosijs';
import { icons, svg2DataUrl } from '../icons';
/** Compute the full set of `:root` color variables from a few base colors. */
export function docSystemColors(theme = {}) {
    const brandColor = Color.fromCss(theme.accent ?? '#EE257B');
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
    };
}
/** Build the full doc-system stylesheet for a given base theme. */
export function docSystemStyleSpec(theme = {}) {
    const colors = docSystemColors(theme);
    const brandColor = Color.fromCss(theme.accent ?? '#EE257B');
    return {
        '@import': 'https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,100..900;1,100..900&famiSpline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap',
        ':root': {
            _fontFamily: "'Aleo', sans-serif",
            _codeFontFamily: "'Spline Sans Mono', monospace",
            _fontSize: '16px',
            _codeFontSize: '14px',
            ...colors,
            _spacing: '10px',
            _lineHeight: 'calc(var(--font-size) * 1.6)',
            _h1Scale: '2',
            _h2Scale: '1.5',
            _h3Scale: '1.25',
            _touchSize: '32px',
            _headerHeight: 'calc( var(--line-height) * var(--h2-scale) + var(--spacing) * 2 )',
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
        svg: {
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
        '.current': {
            background: vars.background,
        },
        '.doc-link': {
            cursor: 'pointer',
            borderBottom: 'none',
            transition: '0.15s ease-out',
            marginLeft: '20px',
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
        // The pre-rendered nav list in static HTML (visible before hydration replaces it).
        '.doc-nav ul': {
            listStyle: 'none',
            margin: 0,
            padding: vars.spacing,
        },
        // Hierarchical sections: nested lists indent; the <summary> is the section
        // header (its triangle toggles; clicking the link navigates).
        '.doc-nav ul ul': {
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: vars.spacing,
        },
        '.doc-nav summary': {
            cursor: 'pointer',
        },
        '.doc-nav summary > .doc-link': {
            display: 'inline-block',
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
    };
}
