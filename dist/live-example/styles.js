import { vars } from 'tosijs';
export const liveExampleStyleSpec = {
    ':host': {
        '--tosi-example-height': '320px',
        '--code-editors-bar-bg': '#777',
        '--code-editors-bar-color': '#fff',
        '--widget-bg': '#fff8',
        '--widget-color': '#000',
        position: 'relative',
        display: 'flex',
        height: 'var(--tosi-example-height)',
        background: 'var(--background)',
        boxSizing: 'border-box',
        // The bordered, rounded card wraps the whole example (preview + editors).
        // overflow:hidden clips the inner split to the radius; the inset box-shadow
        // (moved here from .preview) draws the border over both panes. CM tooltips
        // escape this clip via tooltips({position:'fixed'}) in code-editor-cm.ts.
        borderRadius: vars.spacing25,
        boxShadow: 'inset 0 0 0 2px #8883',
        overflow: 'hidden',
    },
    // Local-edit indicator: an accent outline on the always-visible `<>` example
    // button (bottom-left) when this example differs from its doc source — visible
    // whether or not the code editor is open (e.g. an auto-restored saved edit).
    ':host.-locally-edited [part="exampleWidgets"]': {
        outline: '2px solid var(--brand-color, #da1167)',
        outlineOffset: '1px',
        borderRadius: '4px',
    },
    ':host.-maximize': {
        position: 'fixed',
        left: '0',
        top: '0',
        height: '100vh',
        width: '100vw',
        margin: '0 !important',
    },
    '.-maximize': {
        zIndex: 101,
    },
    ':host.-vertical': {
        flexDirection: 'column',
    },
    ':host .layout-indicator': {
        transition: '0.5s ease-out',
        transform: 'rotateZ(270deg)',
    },
    ':host.-vertical .layout-indicator': {
        transform: 'rotateZ(180deg)',
    },
    ':host.-maximize .hide-if-maximized, :host:not(.-maximize) .show-if-maximized': {
        display: 'none',
    },
    ':host [part="example"]': {
        flex: '1 1 50%',
        height: '100%',
        position: 'relative',
        overflowX: 'auto',
    },
    ':host .preview': {
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        // Breathing room around rendered example content (border-box so height:100%
        // still fits). The border/radius now live on :host.
        padding: vars.spacing,
    },
    // The first rendered child often carries its own top margin (a heading, a
    // paragraph); drop it so it doesn't stack on top of the new padding.
    ':host .preview > :first-child': {
        marginTop: '0',
    },
    ':host .preview-error': {
        padding: '8px 12px',
        margin: '8px',
        background: '#fee',
        color: '#900',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'system-ui, sans-serif',
        whiteSpace: 'pre-wrap',
    },
    ':host [part="editors"]': {
        flex: '1 1 200px',
        height: '100%',
        position: 'relative',
    },
    // The example toolbar (a <tosi-pocket-bar>), pinned top-right so it never covers
    // the editor in side-by-side mode. Only the collapsed `<>` handle carries the
    // test-status colour — the action buttons stay neutral — via the pocket bar's
    // --tosi-pocket-handle-color (the -test-* rules below drive --widget-color).
    ':host [part="exampleWidgets"]': {
        position: 'absolute',
        top: '5px',
        right: '5px',
        zIndex: '100',
        // Action controls are neutral (text colour); only the handle carries status.
        color: 'var(--text-color)',
        '--widget-color': 'var(--brand-color)',
        '--tosi-pocket-handle-color': 'var(--widget-color)',
    },
    // The doc site brand-colours bare <button>s by overriding --text-color ON the
    // button (a link affordance). Revert it here so the toolbar's icon buttons are
    // neutral, matching the check <label> (which the button rule never touched).
    ':host [part="exampleWidgets"] button': {
        '--text-color': 'inherit',
    },
    // Run-tests toggle: the native checkbox is hidden; its icon is full-colour when
    // tests are on and greyed + monochrome when off. --tests-enabled (0|1, set on
    // <body>) is global, so every example's toggle stays in sync with no JS.
    ':host [part="exampleWidgets"] .tests-toggle input': {
        display: 'none',
    },
    ':host [part="exampleWidgets"] .tests-toggle': {
        opacity: 'calc(0.4 + 0.6 * var(--tests-enabled, 0))',
        filter: 'grayscale(calc(1 - var(--tests-enabled, 0)))',
        transition: 'opacity 0.2s, filter 0.2s',
    },
    ':host .code-editors': {
        overflow: 'hidden',
        background: 'white',
        position: 'relative',
        top: '0',
        right: '0',
        flex: '1 1 50%',
        height: '100%',
        flexDirection: 'column',
        zIndex: '10',
    },
    ':host .code-editors:not([hidden])': {
        display: 'flex',
    },
    ':host .code-editors > h4': {
        padding: '5px',
        margin: '0',
        textAlign: 'center',
        background: 'var(--code-editors-bar-bg)',
        color: 'var(--code-editors-bar-color)',
        cursor: 'move',
    },
    ':host button.transparent, :host .sizer': {
        width: '32px',
        height: '32px',
        lineHeight: '32px',
        textAlign: 'center',
        padding: '0',
        margin: '0',
    },
    ':host .sizer': {
        cursor: 'nwse-resize',
    },
    '@keyframes test-pulse': {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0.4' },
    },
    // Test status colours the `<>` handle (via --widget-color → the pocket bar's
    // --tosi-pocket-handle-color). The handle is translucent at rest, so the colour
    // reads as a subtle tint until you hover.
    ':host.-test-running [part="exampleWidgets"]': {
        '--widget-color': '#fa0',
        animation: 'test-pulse 0.75s ease-in-out infinite',
    },
    ':host.-test-passed [part="exampleWidgets"]': {
        '--widget-color': '#0a0',
    },
    ':host.-test-failed [part="exampleWidgets"]': {
        '--widget-color': '#f00',
    },
    ':host [part="testResults"]': {
        position: 'absolute',
        bottom: '54px',
        left: '5px',
        background: 'var(--widget-bg)',
        borderRadius: '5px',
        padding: '8px',
        fontSize: '14px',
        margin: '0',
        maxWidth: '400px',
        maxHeight: '200px',
        overflow: 'auto',
        zIndex: '100',
    },
    ':host [part="testResults"][hidden]': {
        display: 'none',
    },
    ':host .test-pass': {
        color: '#0a0',
    },
    ':host .test-fail': {
        color: '#f00',
    },
    // Read-only "tjs tests" results tab (inline /*test*/ results).
    ':host .tjs-test-results': {
        padding: '8px 12px',
        fontSize: '14px',
        fontFamily: 'var(--mono-font, monospace)',
        overflow: 'auto',
        lineHeight: '1.6',
    },
    ':host .tjs-test-summary': {
        fontWeight: 'bold',
        marginBottom: '6px',
    },
    ':host .tjs-test-empty': {
        opacity: '0.6',
    },
    ':host .tjs-test-error': {
        opacity: '0.7',
    },
};
