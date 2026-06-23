# TODO

## Doc-System Roadmap

See [doc-system-roadmap.md](doc-system-roadmap.md) for the full plan. North star:
each library is a web-accessible doc-system endpoint (library-as-ESM + docs +
authoring), with **tjs-lang** as the live-example transpiler, the **tosijs-ui doc
system** as build/docs/front-end, and an **AJS-VM universal endpoint** as the
back end. Sequence: `./docs` subpath refactor → #6 tjs+CodeMirror → #5 haltija
widget → #4 edit source → #3 save/load examples → #1 ePub → #2 PDF. Phase-2:
importmap example resolution, versioned endpoints, AJS RestStore.

## High Priority

- **JSON Schema-driven form editor** - Integrate schema-based form generation

## Medium Priority

- **Vector similarity search for doc-browser** - Replace current search with vector-based approach
- **Focus management and focus-visible styling** - Improve keyboard navigation and focus indicators

## Localization

- Adding automatic localization where appropriate:
  - `<tosi-password-strength>`
  - `<tosi-tag-list>`
  - `<tosi-filter>`

## Components

### `<tosi-b3d>`
- Converting this to a blueprint

### `<tosi-filter>`
- Leverage `<tosi-select>` for picking fields etc.
- Leverage `<tosi-tag-list>` for displaying filters compactly
- Leverage `popFloat` for disclosing filter-editor

### `<tosi-editable>`
- Add support for disabling / enabling options
- Hide lock icons while resizing
- Maybe show lines under locks indicating the parent
- Support snapping to sibling boundaries and centers

## Build System

- **Built-in custom icon generation for `tosijs-ui/site`** — currently a consumer
  generates an icon module with the shipped `tosijs-make-icons` CLI and registers
  it via `defineIcons` in their bundle entry. Make it first-class: export
  `generateIconData({ input, output })` from `tosijs-ui/site` (refactor
  make-icon-data's core into an importable function, CLI as a thin wrapper) so it
  can run from a doc-site `prebuild` hook with no shelling out. Possibly a config
  field (`icons: { input, output }`) that the orchestrator runs automatically.
- ~~Better leveraging of tree-shaking~~ (unbundled ESM output, sucrase as peer dep)
- **Migrate CDN-loaded libraries to peer deps** — now that ESM output is unbundled, these can be normal imports (tree-shaken when unused):
  - `<tosi-code>` — replace ace editor with CodeMirror (peer dep)
  - `<tosi-b3d>` — `@babylonjs/core` as optional peer dep (currently loads via `scriptTag` from CDN)
  - `<tosi-lottie>` — `lottie-web` as optional peer dep (currently loads via `scriptTag` from CDN)
  - `<tosi-map>` — `mapbox-gl` as optional peer dep (currently loads via `scriptTag`/`styleSheet` from CDN)

## Completed

- ~~Add unit tests for components~~
- ~~Add accessibility (ARIA) attributes to components~~
- ~~xin → tosi rename (all exports, classes, tags, interfaces)~~
- ~~Drop menu support (`popDropMenu`, `hideDisabled`, dynamic `menuItems`)~~
- ~~Drag-and-drop MutationObserver for dynamic drop targets~~
- ~~Agent-based QA using Haltija~~ (`bun run test-browser`)
