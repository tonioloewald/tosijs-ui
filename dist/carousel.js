/*#
# carousel

```html
<tosi-carousel arrows dots max-visible-items=2 auto=2 snap-delay=4 snap-duration=0.5 loop>
  <tosi-icon icon="tosiFavicon" class="thing"></tosi-icon>
  <tosi-icon icon="tosi" class="thing"></tosi-icon>
  <tosi-icon icon="tosiUi" class="thing"></tosi-icon>
  <tosi-icon icon="tosiPlatform" class="thing"></tosi-icon>
  <tosi-icon icon="tosiXr" class="thing"></tosi-icon>
  <tosi-icon icon="blueprint" class="thing"></tosi-icon>
  <tosi-icon icon="cmy" class="thing"></tosi-icon>
  <tosi-icon icon="rgb" class="thing"></tosi-icon>
</tosi-carousel>
```
```css
.thing {
  --tosi-icon-size: 160px;
  height: 160px;
  margin: 30px 0 70px;
  position: relative;
}

.thing::after {
  content: attr(icon);
  color: white;
  position: absolute;
  bottom: -50px;
  left: 50%;
  padding: 5px 15px;
  transform: translateX(-50%);
  filter: drop-shadow(0 1px 1px #0008);
  background: #0004;
  border-radius: 5px;
}

.preview tosi-carousel {
  background: #8883;
  margin: 10px;
  border-radius: 10px;
}
```

This is a minimalist carousel component that supports the usual stuff.

## Attributes

- `arrows` (boolean, false by default) shows/hides the arrow paging controls
- `dots` (boolean, false by default) shows/hides the dot progress indicators
- `max-visible-items` (number, 1 by default) determines how many items are shown at once.
- `snap-duration` (number, 0.25 [seconds] by default) determines the time taken to scroll / snap scroll.
- `snap-delay` (number, 0.1 [seconds] by default)
- `loop` (boolean, false by default) causes next/previous buttons to loop
- `auto` (number, 0 [seconds] by default) if > 0, automatically advances after that many seconds (always loops!)

## Behaviour

- **`auto` holds still while someone is looking:** while a mouse hovers over it, while keyboard
  focus is inside it, and always when the reader asks for reduced motion
  (`prefers-reduced-motion: reduce`, which also makes paging jump instead of animating). A swipe
  or a chosen slide restarts the countdown. A touch is never treated as a hover, since nothing
  would ever end it.
- **The dots are tappable:** each draws a `--carousel-dot-size` dot (8px) but answers taps across
  its whole slot and `--carousel-dot-hit-size` (44px) tall, so a tap that just misses a dot
  doesn't open the slide underneath.
- **Resizing keeps the current slide in place** (rotation, a window resize) instead of leaving
  it partway into the next one.

<tosi-css-var-editor element-selector="tosi-carousel"></tosi-css-var-editor>
*/
/*{ "parent": "Components" }*/
import { elements, vars, withAttributes } from 'tosijs';
import { icons } from './icons.js';
import { prefersReducedMotion } from './reduced-motion.js';
const { button, slot, div } = elements;
export class TosiCarousel extends withAttributes({
    dots: false,
    arrows: false,
    maxVisibleItems: 1,
    snapDuration: 0.25,
    snapDelay: 0.1,
    loop: false,
    auto: 0,
}) {
    static preferredTagName = 'tosi-carousel';
    lastAutoAdvance = Date.now();
    interval;
    hovered = false;
    focusedVisibly = false;
    resizeObserver;
    /*
    `auto` holds still while someone is looking at it (#204): under a mouse hover, while keyboard
    focus is inside it, and always under `prefers-reduced-motion: reduce`. A swipe already
    restarts the countdown (every scroll resets `lastAutoAdvance`), so a slide someone just chose
    stays up for a full `auto` interval.
    */
    get autoPaused() {
        return this.hovered || this.focusedVisibly || prefersReducedMotion();
    }
    autoAdvance = () => {
        if (this.auto <= 0)
            return;
        if (this.autoPaused) {
            this.lastAutoAdvance = Date.now();
            return;
        }
        if (this.auto > 0 && this.auto * 1000 < Date.now() - this.lastAutoAdvance) {
            this.forward();
        }
    };
    // Mouse only. A phone's tap also sends pointerenter (and focus), and nothing ever sends the
    // matching leave, so treating a touch as "hover" would stop the carousel for good.
    handlePointerEnter = (event) => {
        if (event.pointerType === 'mouse')
            this.hovered = true;
    };
    handlePointerLeave = (event) => {
        if (event.pointerType === 'mouse')
            this.hovered = false;
    };
    // Keyboard focus only (`:focus-visible`), for the same reason: a tap focuses too.
    handleFocusIn = (event) => {
        const target = event.composedPath()[0];
        this.focusedVisibly = target?.matches?.(':focus-visible') === true;
    };
    handleFocusOut = (event) => {
        const next = event.relatedTarget;
        if (!next || !this.contains(next))
            this.focusedVisibly = false;
    };
    // A resize (rotation, a window drag) changes the slide width, so re-seat the current page
    // without animating; otherwise it rests partway into the next slide until it next moves.
    realign = () => {
        if (!this.hydrated)
            return;
        const { scroller } = this.parts;
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
        scroller.scrollLeft = this.page * scroller.offsetWidth;
    };
    _page = 0;
    get page() {
        return this._page;
    }
    set page(p) {
        const { scroller, back, forward } = this.parts;
        if (this.lastPage <= 0) {
            forward.disabled = back.disabled = true;
            p = 0;
        }
        else {
            p = Math.max(0, Math.min(this.lastPage, p));
            p = isNaN(p) ? 0 : p;
        }
        if (this._page !== p) {
            this._page = isNaN(p) ? 0 : p;
            this.animateScroll(this._page * scroller.offsetWidth);
            back.disabled = this.page <= 0 && !this.loop;
            forward.disabled = this.page >= this.lastPage && !this.loop;
        }
    }
    get visibleItems() {
        return [...this.children].filter((element) => getComputedStyle(element).display !== 'none');
    }
    get lastPage() {
        return Math.max(Math.ceil(this.visibleItems.length / (this.maxVisibleItems || 1)) - 1, 0);
    }
    static shadowStyleSpec = {
        ':host': {
            _carouselIconSize: 24,
            _carouselButtonColor: '#0004',
            _carouselButtonHoverColor: '#0006',
            _carouselButtonActiveColor: '#000c',
            _carouseButtonWidth: 48,
            _carouselDotCurrentColor: '#0008',
            _carouselDotSize: 8,
            _carouselDotSpacing: vars.carouselDotSize,
            // The tappable area around each dot; the dot itself stays --carousel-dot-size (#204).
            _carouselDotHitSize: 44,
            _carouselProgressPadding: 12,
            _carouselDotTransition: '0.125s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        },
        ':host:focus': {
            outline: 'none',
            boxShadow: 'none',
        },
        ':host svg': {
            height: vars.carouselIconSize,
        },
        ':host button': {
            outline: 'none',
            border: 'none',
            boxShadow: 'none',
            background: 'transparent',
            color: vars.carouselButtonColor,
            padding: 0,
        },
        ':host::part(back), :host::part(forward)': {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: vars.carouseButtonWidth,
            zIndex: 2,
        },
        ':host::part(back)': {
            left: 0,
        },
        ':host::part(forward)': {
            right: 0,
        },
        ':host button:disabled': {
            opacity: 0.5,
            pointerEvents: 'none',
        },
        ':host button:hover': {
            color: vars.carouselButtonHoverColor,
        },
        ':host button:active': {
            color: vars.carouselButtonActiveColor,
        },
        ':host::part(pager)': {
            position: 'relative',
        },
        ':host::part(scroller)': {
            overflow: 'auto hidden',
            position: 'relative',
        },
        ':host::part(grid)': {
            display: 'grid',
            justifyItems: 'center',
        },
        ':host *::-webkit-scrollbar, *::-webkit-scrollbar-thumb': {
            display: 'none',
        },
        /*
        Each dot is a button drawing a --carousel-dot-size dot (#204). Its hit area is the dot's
        whole PITCH across (dot + spacing, so the strip has no gaps and no two dots overlap) and
        --carousel-dot-hit-size (44px, a touch target) tall. A negative vertical margin gives the
        extra height back to the layout, so the strip is sized as before and the hit area reaches
        past it — over the slide, where an overlaid dot strip sits, which is exactly where a tap
        that just missed a dot used to open the slide instead.
    
        Not 44px across: the first cut did that, and with dots 16px apart each dot's hit area
        covered its neighbour's centre, so a tap dead on one dot selected the next.
        */
        ':host .dot': {
            position: 'relative',
            zIndex: 3,
            display: 'grid',
            placeItems: 'center',
            flex: `0 0 calc(${vars.carouselDotSize} + ${vars.carouselDotSpacing})`,
            width: `calc(${vars.carouselDotSize} + ${vars.carouselDotSpacing})`,
            height: vars.carouselDotHitSize,
            margin: `calc((${vars.carouselDotSize} - ${vars.carouselDotHitSize}) / 2) 0`,
            background: 'transparent',
        },
        ':host .dot::before': {
            content: '""',
            display: 'block',
            background: vars.carouselButtonColor,
            borderRadius: vars.carouselDotSize,
            height: vars.carouselDotSize,
            width: vars.carouselDotSize,
            transition: vars.carouselDotTransition,
        },
        ':host .dot:not(.current):hover::before': {
            background: vars.carouselButtonHoverColor,
            height: vars.carouselDotSize150,
            width: vars.carouselDotSize150,
        },
        ':host .dot:not(.current):active::before': {
            background: vars.carouselButtonActiveColor,
        },
        ':host .dot.current::before': {
            background: vars.carouselDotCurrentColor,
        },
        ':host .dot:focus-visible::before': {
            boxShadow: `0 0 0 2px ${vars.carouselButtonActiveColor}`,
        },
        ':host::part(progress)': {
            display: 'flex',
            // the spacing is inside each dot's hit area (see .dot), so no gap between them
            gap: 0,
            justifyContent: 'center',
            padding: vars.carouselProgressPadding,
        },
    };
    easing = (t) => {
        return Math.sin(t * Math.PI * 0.5);
    };
    indicateCurrent = () => {
        const { scroller, progress } = this.parts;
        const page = scroller.scrollLeft / scroller.offsetWidth;
        [...progress.children].forEach((dot, index) => {
            dot.classList.toggle('current', Math.floor(index / this.maxVisibleItems - page) === 0);
        });
        this.lastAutoAdvance = Date.now();
        clearTimeout(this.snapTimer);
        this.snapTimer = setTimeout(this.snapPosition, this.snapDelay * 1000);
    };
    snapPosition = () => {
        const { scroller } = this.parts;
        const currentPosition = Math.round(scroller.scrollLeft / scroller.offsetWidth);
        if (currentPosition !== this.page) {
            this.page =
                currentPosition > this.page
                    ? Math.ceil(currentPosition)
                    : Math.floor(currentPosition);
        }
        this.lastAutoAdvance = Date.now();
    };
    back = () => {
        this.page = this.page > 0 ? this.page - 1 : this.lastPage;
    };
    forward = () => {
        this.page = this.page < this.lastPage ? this.page + 1 : 0;
    };
    handleDotClick = (event) => {
        const { progress } = this.parts;
        const index = [...progress.children].indexOf(event.target);
        if (index > -1) {
            this.page = Math.floor(index / this.maxVisibleItems);
        }
    };
    snapTimer;
    animationFrame;
    animateScroll(position, startingPosition = -1, timestamp = 0) {
        cancelAnimationFrame(this.animationFrame);
        const { scroller } = this.parts;
        if (startingPosition === -1) {
            startingPosition = scroller.scrollLeft;
            timestamp = Date.now();
            this.animationFrame = requestAnimationFrame(() => {
                this.animateScroll(position, startingPosition, timestamp);
            });
            return;
        }
        const elapsed = (Date.now() - timestamp) / 1000;
        if (prefersReducedMotion() ||
            elapsed >= this.snapDuration ||
            Math.abs(scroller.scrollLeft - position) < 2) {
            scroller.scrollLeft = position;
            this.animationFrame = null;
        }
        else {
            scroller.scrollLeft =
                startingPosition +
                    this.easing(elapsed / this.snapDuration) * (position - startingPosition);
            this.animationFrame = requestAnimationFrame(() => {
                this.animateScroll(position, startingPosition, timestamp);
            });
        }
    }
    content = () => [
        div({ part: 'pager' }, button({ title: 'previous slide', part: 'back' }, icons.chevronLeft()), div({ title: 'slides', role: 'group', part: 'scroller' }, div({ part: 'grid' }, slot())), button({ title: 'next slide', part: 'forward' }, icons.chevronRight())),
        div({ title: 'choose slide to display', role: 'group', part: 'progress' }),
    ];
    connectedCallback() {
        super.connectedCallback();
        this.ariaRoleDescription = 'carousel';
        this.ariaOrientation = 'horizontal';
        this.ariaReadOnly = 'true';
        const { back, forward, scroller, progress } = this.parts;
        back.addEventListener('click', this.back);
        forward.addEventListener('click', this.forward);
        scroller.addEventListener('scroll', this.indicateCurrent);
        progress.addEventListener('click', this.handleDotClick);
        this.addEventListener('pointerenter', this.handlePointerEnter);
        this.addEventListener('pointerleave', this.handlePointerLeave);
        this.addEventListener('focusin', this.handleFocusIn);
        this.addEventListener('focusout', this.handleFocusOut);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver ??= new ResizeObserver(this.realign);
            this.resizeObserver.observe(scroller);
        }
        this.lastAutoAdvance = Date.now();
        clearInterval(this.interval);
        this.interval = setInterval(this.autoAdvance, 100);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        clearInterval(this.interval);
        this.resizeObserver?.disconnect();
        this.hovered = this.focusedVisibly = false;
    }
    render() {
        super.render();
        const { dots, arrows, visibleItems, lastPage } = this;
        const { progress, back, forward, grid } = this.parts;
        visibleItems.forEach((item) => {
            item.role = 'group';
        });
        grid.style.gridTemplateColumns = `${100 / this.maxVisibleItems / (1 + this.lastPage)}% `
            .repeat(visibleItems.length)
            .trim();
        grid.style.width = (1 + this.lastPage) * 100 + '%';
        progress.textContent = '';
        progress.append(...visibleItems.map((_, index) => button({ title: `item ${index + 1}`, class: 'dot' })));
        this.indicateCurrent();
        progress.style.display = dots && lastPage > 0 ? '' : 'none';
        back.hidden = forward.hidden = !(arrows && lastPage > 0);
    }
}
/** @deprecated Use TosiCarousel instead */
export const XinCarousel = TosiCarousel;
export const tosiCarousel = TosiCarousel.elementCreator();
/** @deprecated Use tosiCarousel instead */
export const xinCarousel = tosiCarousel;
