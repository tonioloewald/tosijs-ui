export const liveExampleStyleSpec = {
  ':host': {
    '--xin-example-height': '320px',
    '--code-editors-bar-bg': '#777',
    '--code-editors-bar-color': '#fff',
    '--widget-bg': '#fff8',
    '--widget-color': '#000',
    position: 'relative',
    display: 'flex',
    height: 'var(--xin-example-height)',
    background: 'var(--background)',
    boxSizing: 'border-box',
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

  ':host.-maximize .hide-if-maximized, :host:not(.-maximize) .show-if-maximized':
    {
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
    boxShadow: 'inset 0 0 0 2px #8883',
  },

  ':host [part="editors"]': {
    flex: '1 1 200px',
    height: '100%',
    position: 'relative',
  },

  ':host [part="exampleWidgets"]': {
    position: 'absolute',
    left: '5px',
    bottom: '5px',
    '--widget-color': 'var(--brand-color)',
    borderRadius: '5px',
    width: '44px',
    height: '44px',
    lineHeight: '44px',
    zIndex: '100',
  },

  ':host [part="exampleWidgets"] svg': {
    stroke: 'var(--widget-color)',
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

  // Test results styling
  ':host.-test-failed [part="example"]': {
    boxShadow: '0 0 10px 2px rgba(255, 0, 0, 0.5)',
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
    fontSize: '12px',
    maxWidth: '300px',
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
}
