import { vars, type XinStyleSheet } from 'tosijs'

/*
The doc nav's collapsible sections, in a module of their own because two places need them:
the site stylesheet (`docSystemStyleSpec`), which paints the pre-rendered nav before anything
hydrates, and `createDocBrowser`, which injects them itself. A browser created outside
<tosi-doc-system> (an embedded, memory-routed one) never gets the site stylesheet, and
before #3520 it did not need it: native <details> collapsed with no CSS at all.
*/
export const navSectionStyleSpec: XinStyleSheet = {
  '.doc-nav .nav-branch > ul': {
    paddingLeft: vars.spacing,
  },
  /*
    A section is a toggle button BESIDE its link (#3520). It was <details><summary><a>, a link
    inside a control, which a screen reader announces as one and loses the other (axe
    `nested-interactive`), and its marker was under the 24px target size WCAG 2.2 asks.
    A closed section collapses only when JavaScript is running (`tosi-js` is set on <html>
    before first paint; a nav `createDocBrowser` built is `.-live`): without it nothing
    could open the section, so every one stays expanded.
    */
  'html.tosi-js .doc-nav .nav-branch:not(.-open) > ul, .doc-nav.-live .nav-branch:not(.-open) > ul':
    {
      display: 'none',
    },
  '.doc-nav .nav-branch-head': {
    display: 'flex',
    alignItems: 'flex-start',
  },
  '.doc-nav .nav-toggle': {
    flex: '0 0 auto',
    minWidth: '24px',
    minHeight: '24px',
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'transparent',
    boxShadow: 'none',
    cursor: 'pointer',
    color: vars.brandColor,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    maxHeight: vars.lineHeight,
  },
  // A disclosure triangle, pointing right when closed and down when open.
  '.doc-nav .nav-toggle::before': {
    content: "''",
    borderStyle: 'solid',
    borderColor: 'transparent transparent transparent currentcolor',
    borderWidth: '0.3em 0 0.3em 0.5em',
    transition: 'transform 0.15s ease-out',
  },
  '.doc-nav .nav-branch.-open > .nav-branch-head > .nav-toggle::before': {
    transform: 'rotate(90deg)',
  },
  // Without JavaScript every section is open and nothing could close one, so the toggle is
  // hidden: kept in the layout, out of the tab order and the accessibility tree.
  'html:not(.tosi-js) .doc-nav:not(.-live) .nav-toggle': {
    visibility: 'hidden',
  },
  '.doc-nav .nav-branch-head > .doc-link': {
    flex: '1 1 auto',
    minWidth: 0,
  },
}
