<!--{ "layout": "full-screen", "parent": "Appendices", "order": 900, "title": "Full-screen layout", "description": "A page using layout: full-screen — no reading measure, no nav, the content is the viewport." }-->

# Full-screen layout

This page sets `layout: "full-screen"` in its metadata, so it has **no reading measure and no
navigation chrome** — the content area is the whole viewport. Navigate away and the nav comes
straight back.

That is what makes an *apps-and-manuals* site one site: prose pages keep the measure that makes
them readable, and a demo, a canvas or an embedded app gets the room it needs.

```html
<div style="height:60vh;display:grid;place-items:center;background:linear-gradient(135deg,#0064d233,#00d2a033);border-radius:8px">
  <p style="font:600 clamp(1rem,4vw,2rem)/1.4 system-ui;text-align:center;margin:0;padding:1rem">
    This box is as wide as your window.<br>
    <small style="font-weight:400;opacity:.75">No 44em column, no sidebar.</small>
  </p>
</div>
```

## How it works

`full-screen` puts `<tosi-sidenav>` into `alwaysCompact` with the content showing. Compact mode
already shows the nav *or* the content and takes turns between them — which is exactly what a
full-screen page wants — so this reuses that rather than adding a second layout.

Before the page hydrates there is no sidenav yet, just static markup, so a stylesheet rule
handles the same effect for the first paint. Two rules for two genuinely different DOMs.

See [the doc-site system](/doc-site-system/) for the metadata reference.
