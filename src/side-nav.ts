/*#
# sidebar

The default layout for iOS / iPadOS apps is to hide the sidebar when displaying content on small
screens, and display the sidebar when space is available (with the user able to explicitly hide
the sidebar if so desired). `<xin-sidenav>` provides this functionality.

`<xin-sidenav>` is used to handle the layout of the documentation tab panel.

`<xin-sidenav>`'s behavior is controlled by two attributes, `minSize` is the point at which it will toggle between showing the navigation
sidebar and content, while `navSize` is the width of the sidebar. You can interrogate its `compact` property to find out if it's
currently in `compact` form.
*/

import { Component, ElementCreator, elements, varDefault } from 'xinjs'

const { slot } = elements

type NavState = 'normal' | 'compact/nav' | 'compact/content'

export class SideNav extends Component {
  minSize = 800
  navSize = 200
  compact = false
  contentVisible = false
  value: NavState = 'normal'

  content = [slot({ name: 'nav', part: 'nav' }), slot({ part: 'content' })]

  static styleSpec = {
    ':host': {
      display: 'grid',
      gridTemplateColumns: `${varDefault.navWidth(
        '50%'
      )} ${varDefault.contentWidth('50%')}`,
      gridTemplateRows: '100%',
      position: 'relative',
      margin: varDefault.margin('0 0 0 -100%'),
      transition: varDefault.sideNavTransition('0.25s ease-out'),
    },
    ':host slot': {
      position: 'relative',
    },
    ':host slot:not([name])': {
      display: 'block',
    },
    ':host slot[name="nav"]': {
      display: 'block',
    },
  }

  onResize = () => {
    const { content } = this.parts
    const parent = this.offsetParent as HTMLElement | null
    if (parent === null) {
      return
    }
    
    let navState = this.value

    this.compact = parent.offsetWidth < this.minSize

    const empty =
      [...this.childNodes].find((node) =>
        node instanceof Element ? node.getAttribute('slot') !== 'nav' : true
      ) === undefined
    if (empty) {
      navState = 'compact/nav'
      this.style.setProperty('--nav-width', '100%')
      this.style.setProperty('--content-width', '0%')
    } else if (!this.compact) {
      navState = 'normal'
      content.classList.add('-xin-sidenav-visible')
      this.style.setProperty('--nav-width', `${this.navSize}px`)
      this.style.setProperty(
        '--content-width',
        `calc(100% - ${this.navSize}px)`
      )
      this.style.setProperty('--margin', '0')
    } else {
      content.classList.remove('-xin-sidenav-visible')
      this.style.setProperty('--nav-width', '50%')
      this.style.setProperty('--content-width', '50%')

      if (this.contentVisible) {
        navState = 'compact/content'
        this.style.setProperty('--margin', '0 0 0 -100%')
      } else {
        navState = 'compact/nav'
        this.style.setProperty('--margin', '0 -100% 0 0')
      }
    }
    
    if (this.value !== navState) {
      this.value = navState
    }
  }

  private observer: any
  connectedCallback(): void {
    super.connectedCallback()
    this.contentVisible = this.parts.content.childNodes.length === 0
    globalThis.addEventListener('resize', this.onResize)

    this.observer = new MutationObserver(this.onResize)
    this.observer.observe(this, { childList: true })
    this.style.setProperty('--side-nav-transition', '0s')
    setTimeout(() => {
      this.style.removeProperty('--side-nav-transition')
    }, 250)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.observer.disconnect()
  }

  constructor() {
    super()
    this.initAttributes('minSize', 'navSize', 'compact', 'contentVisible')
  }

  render(): void {
    super.render()
    this.onResize()
  }
}

export const sideNav = SideNav.elementCreator({
  tag: 'xin-sidenav',
}) as ElementCreator<SideNav>
