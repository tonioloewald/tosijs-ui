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
