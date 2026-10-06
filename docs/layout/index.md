# layout

Thin structural layout components that wrap CSS flexbox and grid.

## tosi-row

A flex row container. Children are laid out horizontally.

```html
<tosi-row gap="12px" align="center">
  <button>One</button>
  <button>Two</button>
  <button>Three</button>
</tosi-row>
```

## tosi-column

A flex column container. Children are laid out vertically.

```html
<tosi-column gap="8px">
  <span>First</span>
  <span>Second</span>
  <span>Third</span>
</tosi-column>
```

## tosi-grid

A CSS grid container.

```html
<tosi-grid columns="1fr 1fr 1fr" gap="8px">
  <div style="background:#eee;padding:8px">A</div>
  <div style="background:#ddd;padding:8px">B</div>
  <div style="background:#ccc;padding:8px">C</div>
  <div style="background:#bbb;padding:8px">D</div>
  <div style="background:#aaa;padding:8px">E</div>
  <div style="background:#999;padding:8px;color:white">F</div>
</tosi-grid>
```
