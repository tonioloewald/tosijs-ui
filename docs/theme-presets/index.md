# theme presets

A preset is a whole look, given as theme data: a few base colours for the doc theme's generator,
and overrides of the theme's chain (`--tosi-radius`, `--tosi-surface`, `--tosi-elevation-2`, …)
in light and dark. The doc site ships three: **Original** (the stock theme, no overrides),
**Glass** (translucent, blurred surfaces over a gradient backdrop) and **Material** (Material 3
colours, shapes and elevation).

Set `themePresets: true` in the site config and the settings menu gains a **Style** submenu.
Every preset's CSS is in the site's stylesheet, scoped to a class (`tosi-style-glass`) on
`<html>` and `<body>`, and the page's head script sets the class before first paint, so a
reader who picked Glass never sees the original look flash first.

A preset is ordinary theme data, so it is also a starting point: open the theme editor, and what
you tune is saved on top of the site's theme like any other edit.
