# size-break

`<tosi-sizebreak>` shows different content at different sizes, for example a row of buttons
that becomes a menu when there is no room for it. [Container
queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries)
can restyle content by size; this swaps the content itself, without CSS.

Note that the sizes referred to are of the `<tosi-sizebreak>`'s `.offsetParent`, and it watches for
the window's `resize` events and its own (via `ResizeObserver`).

```html
<div class="container">
  <tosi-sizebreak min-width="300" min-height="150">
    <h1>BIG!</h1>
    <i slot="small">little</i>
  </tosi-sizebreak>
  <tosi-sizer></tosi-sizer>
</div>
```
```css
.preview {
  touch-action: none;
}

.preview tosi-sizebreak {
  width: 100%;
  height: 100%;
  background: #fff8;
  border: 1px solid #aaa;
}

.preview tosi-sizebreak * {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
}

.preview .container {
  position: relative;
  min-width: 100px;
  min-height: 40px;
  max-height: 100%;
  width: 400px;
  height: 100px;
}

.preview .sizer {
  position: absolute;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #0002;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  opacity: 0.5;
}

.preview .sizer:hover {
  opacity: 1.0;
}
```

`<tosi-sizebreak>` supports both `min-width` and/or `min-height`, and you can of course target only one
of the slots if you like. The demo site uses them to hide the
[jsdelivr](https://www.jsdelivr.com/) badge when space is tight.
