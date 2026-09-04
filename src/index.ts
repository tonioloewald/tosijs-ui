/*
The DOC-SYSTEM cluster is deliberately NOT re-exported here (tosijs-ui#133).

`code-editor` pulls CodeMirror; `live-example` and `doc-system/doc-system` each pull
`tjs-lang` independently. This package has no `sideEffects` field — correctly, because
`elementCreator()` registers custom elements at import time and a blanket `sideEffects:false`
tree-shakes a bare `import 'tosijs-ui'` down to zero registrations. So a bundler must assume
every re-exported module is side-effectful and cannot drop it, and `export *` made all four
unconditionally eager in any app importing anything from this barrel.

Measured by snowfox-app moving a 15MB React bundle to the bun bundler:

  barrel as shipped                     1.83 MB
  barrel without the four doc modules   0.38 MB   ← the cluster is 79% of the barrel
  real app bundle, before               15.21 MB
  real app bundle, after                13.86 MB  ← 1.35 MB / 8.9% saved

For contrast the 3D, map and lottie components — the ones you would expect to be the heavy
tail — cost about 10kB from the barrel, because they already lazy-load properly.

All four remain importable by subpath (`tosijs-ui/code-editor`, `/live-example`,
`/doc-browser`, and `doc-system/doc-system` via the `./*` wildcard), which is how the doc
system and `index-iife.ts` now reach them. Nothing needed them here to be importable.

A trap worth recording, from the report: stripping `code-editor` + `live-example` +
`doc-browser` measured EXACTLY ZERO change. `doc-system/doc-system` is an independent second
door into `tjs-lang`, and it is the only one of the four not named in the `exports` map, so it
is the easy one to miss. Anyone re-measuring needs all four or they will conclude the problem
is not real.
*/
export * from './ab-test.js'
export * from './babylon-3d.js'
export * from './bodymovin-player.js'
export * from './carousel.js'
export * from './color-input.js'
export * from './crud.js'
export * from './data-table.js'
export * from './diff.js'
export * from './dialog.js'
export * as dragAndDrop from './drag-and-drop.js'
export * from './editable-rect.js'
export * from './filter-builder.js'
export * from './float.js'
export * from './form.js'
export * from './hash-state.js'
export * from './header.js'
export * from './gamepad.js'
export * from './icons.js'
export * from './layout.js'
export * from './live-theme.js'
export * from './localize.js'
export { makeSorter } from './make-sorter.js'
export * from './mapbox.js'
export * from './match-shortcut.js'
export * from './markdown-viewer.js'
export * from './menu.js'
export * from './month.js'
export * from './notifications.js'
export * from './password-strength.js'
export * from './pocket-bar.js'
export * from './pop-float.js'
export * from './rating.js'
export * from './schema-form.js'
export * from './rich-text.js'
export * from './router.js'
export * from './segmented.js'
export * from './select.js'
export * from './side-nav.js'
export * from './size-break.js'
export * from './sizer.js'
export * from './tab-selector.js'
export * from './tag-list.js'
export { trackDrag, bringToFront, findHighestZ } from './track-drag.js'
export { version } from './version.js'
export { scriptTag, styleSheet } from './via-tag.js'
export * from './theme.js'
export * from './tooltip.js'
export * from './value-renderer.js'
export * as tosijs from 'tosijs'
