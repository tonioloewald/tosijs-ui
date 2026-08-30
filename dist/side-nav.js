/*#
# sidebar

The default layout for iOS / iPadOS apps is to hide the sidebar when displaying content on small
screens, and display the sidebar when space is available (with the user able to explicitly hide
the sidebar if so desired). `<tosi-sidenav>` provides this functionality.

`<tosi-sidenav>` is used to handle the layout of the documentation tab panel.

`<tosi-sidenav>`'s behavior is controlled by two attributes, `minSize` is the point at which it will toggle between showing the navigation
sidebar and content, while `navSize` is the width of the sidebar. You can interrogate its `compact` property to find out if it's
currently in `compact` form.

`navVisible` is the control you want for a "show me the navigation" button: read it, flip it.
It resolves what hiding the nav actually means at the current width — forcing compact mode on a
wide screen, simply showing the content on a narrow one — so a caller never has to. A toggle
button is one line:

```javascript
sidenav.navVisible = !sidenav.navVisible
```

Underneath it, `alwaysCompact` keeps the sidenav compact at any width: nav and content take
turns regardless of how much room there is, and `contentVisible` picks which you see. That is
how the doc-system's `layout: "full-screen"` pages give the content the whole viewport. It is a
named state rather than a `minSize` no viewport can reach, because the second one works and
reads as a bug.
*/
/*{ "parent": "Components" }*/
import { Component, elements, varDefault } from 'tosijs';
const { slot } = elements;
export class TosiSidenav extends Component {
    static preferredTagName = 'tosi-sidenav';
    static initAttributes = {
        minSize: 800,
        navSize: 200,
        compact: false,
        contentVisible: false,
        /*
        Stay compact at ANY width, instead of below `minSize`.
    
        Compact mode already does what a full-screen page wants — nav and content take turns, and
        `contentVisible` picks which — so this just removes the width test rather than adding a
        layout. It exists as a named state because the alternative is setting `minSize` to a number
        no viewport can reach, which works and reads as a bug to the next person.
        */
        alwaysCompact: false,
    };
    value = 'normal';
    /**
     * Is the navigation on screen — and set it to put it there, or take it away.
     *
     * The one control a "show me the navigation" button needs: read it, flip it, done. No caller
     * should have to know that hiding the nav on a wide screen means forcing compact mode while
     * on a narrow one it only means showing the content, which is exactly the kind of knowledge
     * that ends up copy-pasted into every consumer and then drifts.
     */
    get navVisible() {
        // In normal mode both are on screen; only compact mode makes them take turns.
        return !this.compact || !this.contentVisible;
    }
    set navVisible(visible) {
        if (visible) {
            this.alwaysCompact = false;
            this.contentVisible = false;
            return;
        }
        /*
        Only FORCE compact when the WIDTH would not have produced it anyway.
    
        Setting `alwaysCompact` unconditionally would quietly make a narrow-screen "show me the
        content" tap permanent: the nav would stay away after the window was widened, because
        nothing would ever clear the flag. Honouring the request without outstaying it means a
        narrow viewport keeps its responsive behaviour.
    
        Measured from the parent rather than read off `this.compact`, and that distinction is not
        academic — `compact` is written during render, so immediately after a caller flips this
        property it still describes the PREVIOUS layout. Trusting it meant that hiding the nav right
        after showing it did nothing at all: the stale flag said "already compact", so nothing forced
        it, and the nav stayed. Every engine, consistently.
        */
        const parent = this.offsetParent;
        const widthAloneWouldCompact = parent
            ? parent.offsetWidth < this.minSize
            : false;
        if (!widthAloneWouldCompact)
            this.alwaysCompact = true;
        this.contentVisible = true;
    }
    content = [slot({ name: 'nav', part: 'nav' }), slot({ part: 'content' })];
    static shadowStyleSpec = {
        ':host': {
            display: 'grid',
            gridTemplateColumns: `${varDefault.navWidth('50%')} ${varDefault.contentWidth('50%')}`,
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
    };
    handleResize = () => {
        const { content } = this.parts;
        const parent = this.offsetParent;
        if (parent === null) {
            return;
        }
        let navState;
        this.compact = this.alwaysCompact || parent.offsetWidth < this.minSize;
        const empty = [...this.childNodes].find((node) => node instanceof Element ? node.getAttribute('slot') !== 'nav' : true) === undefined;
        if (empty) {
            navState = 'compact/nav';
            this.style.setProperty('--nav-width', '100%');
            this.style.setProperty('--content-width', '0%');
        }
        else if (!this.compact) {
            navState = 'normal';
            content.classList.add('-tosi-sidenav-visible');
            this.style.setProperty('--nav-width', `${this.navSize}px`);
            this.style.setProperty('--content-width', `calc(100% - ${this.navSize}px)`);
            this.style.setProperty('--margin', '0');
        }
        else {
            content.classList.remove('-tosi-sidenav-visible');
            this.style.setProperty('--nav-width', '50%');
            this.style.setProperty('--content-width', '50%');
            if (this.contentVisible) {
                navState = 'compact/content';
                this.style.setProperty('--margin', '0 0 0 -100%');
            }
            else {
                navState = 'compact/nav';
                this.style.setProperty('--margin', '0 -100% 0 0');
            }
        }
        if (this.value !== navState) {
            this.value = navState;
        }
        this.releaseTransition();
    };
    observer;
    connectedCallback() {
        super.connectedCallback();
        this.contentVisible = this.parts.content.childNodes.length === 0;
        globalThis.addEventListener('resize', this.handleResize);
        this.observer = new MutationObserver(this.handleResize);
        this.observer.observe(this, { childList: true });
        /*
        Suppress the transition until the layout is RIGHT, not for a fixed 250ms.
    
        The element's own defaults are the compact arrangement (50/50 columns, margin -100%), so the
        first `handleResize` moves it to wherever it actually belongs. With a transition live, that
        move animates — the sidebar visibly slides into place on load.
    
        This was a `setTimeout(…, 250)`, which is a race rather than a rule: it assumes the first
        successful layout pass happens within 250ms of the element upgrading. Measured on this
        machine it lands ~70ms after, so the window has ~175ms to spare and the bug does not appear.
        On a bigger corpus, a cold cache or a slower device that margin is not guaranteed, and losing
        it produces exactly the reported "it animates into its state" — intermittent, load-dependent,
        and very hard to pin down, which matches how long it resisted being fixed.
    
        `handleResize` returns early when `offsetParent` is null, so the first pass can be deferred
        arbitrarily; there is no duration that is correct for every page. Releasing on the first pass
        that actually computed something is a rule and needs no number.
        */
        this.style.setProperty('--side-nav-transition', '0s');
    }
    /**
     * Let transitions run again, once the layout has been settled at least once.
     *
     * Deferred a frame so the correcting values are painted BEFORE the transition property comes
     * back — releasing in the same task would let that first correction animate, which is the
     * thing being prevented.
     */
    releaseTransition = () => {
        if (!this.transitionSuppressed)
            return;
        this.transitionSuppressed = false;
        requestAnimationFrame(() => {
            this.style.removeProperty('--side-nav-transition');
        });
    };
    transitionSuppressed = true;
    disconnectedCallback() {
        super.disconnectedCallback();
        this.observer.disconnect();
    }
    render() {
        super.render();
        this.handleResize();
    }
}
/** @deprecated Use TosiSidenav instead */
export const SideNav = TosiSidenav;
export const tosiSidenav = TosiSidenav.elementCreator();
/** @deprecated Use tosiSidenav instead */
export const sideNav = tosiSidenav;
/** @deprecated Use tosiSidenav instead */
export const xinSidenav = tosiSidenav;
