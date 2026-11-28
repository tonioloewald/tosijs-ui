# Lean-plan review: icons-theme

Basis: `af13cd1ee`. Scope: the icon modules (`icon-core`, `icons`, `icon-svg`, `icon-rules`, `icon-store`,
`icon-suffixes`, `icon-types`, `caption-icon`), `src/icons/` (generated), `bin/make-icon-data.js`, the theme
modules (`theme`, `theme-data`, `theme-chain`, `theme-discovery`, `theme-fonts`, `theme-editor`, `live-theme`),
`palette`, `css-value`, `css-value-forms`, `color-input` and `localize`.

**What I read and what I ran.** I read every non-generated module in scope line by line, plus
`bin/make-icon-data.js` and `icons/icon-composition.md`. From the 641 generated files I sampled
`icons/x.ts`, `icons/chevronDown.ts`, `icons/delete.ts`, `icons/data/chevronDown.ts`, `icons/data/delete.ts`
and the head and tail of `icons/data/index.ts`, then checked all 320 data modules with grep. For the tests I
read the test names in all 12 unit files in the area, all of `svg-data-url.test.ts`, the first 40 lines of
`icon-creators.test.ts` and parts of `icons.test.ts`. I did **not** read the full bodies of
`localize.test.ts`, `palette.test.ts` or `theme-data.test.ts`, or any `tests/*.pw.ts`.

The throwaway scripts are in `…/scratchpad/lean/icons-theme/`. Each ✔ check below ran from the repo root with
`bun --preload ./src/test-setup.ts …/lean/icons-theme/<script>.ts` (abbreviated below as `hd <script>`). One
caveat: happy-dom has no canvas, and its `Color.fromCss` falls back where a browser's would not.

Baseline ✔ `bun test` over the 12 unit files in this area: 266 pass, 0 fail. None of those tests catches the
defects below, because the icon tests check what a property **stores**, not what it **draws**
(`icons.test.ts:160-196`).

---

## A. Defects

### A1. Cause: `makeIcon` applies the caller's parts first, then overwrites them with its defaults (`icon-core.ts:274-307`)

- **Caller parts are lost.** `icons.check({ style: { stroke, fill, strokeWidth, height } })` keeps none of
  the four. `<tosi-icon stroke="red" fill="blue" stroke-width="5">` draws the default icon, because
  `SvgIcon.render` passes those values as a style part (`icon-core.ts:592-599`). `size` works only because
  `render` also sets `--tosi-icon-size` on the element (`:588`).
  - ✔ `hd icon-style-parts.ts` prints `var(--tosi-icon-stroke, currentColor) | var(--tosi-icon-fill, none) |
    var(--tosi-icon-stroke-width, 2px) | var(--tosi-icon-size, 16px)` both for the creator and for `<tosi-icon>`.
- **A `class` part replaces the classes `makeIcon` set.** `icons.check({ class: 'x' })` has class `x` only,
  so `tosi-icon` and `stroked` are gone.
  - ✔ Same script, which prints `class part: x`.
  - Who it reaches: the rule `svg.tosi-icon` (`doc-system/doc-system-styles.ts:720`) and the live-example
    icons `icons.maximize({ class: 'hide-if-maximized' })` (`live-example/component.ts:2678`).
- **The two copies disagree.** `wrapIcon` (`icon-core.ts:329-340`) merges parts: it adds the classes and
  assigns the styles. `makeIcon` replaces them.
- Tests pass because `icons.test.ts:111` ("accepts style attributes") checks only `instanceof SVGElement`,
  and `:135` checks only that the new class is present.
- **Worth a patch on its own: yes.** Fix: set the defaults first and apply the parts last, merging classes
  as `wrapIcon` does.

### A2. Cause: `<tosi-icon>` re-declares the variables it should inherit (`icon-core.ts:559-568`)

- **What happens.** The light-DOM `:host` rule becomes `tosi-icon { --tosi-icon-size: var(--xin-icon-size,
  16px); --tosi-icon-fill: var(--xin-icon-fill, var(--icon-fill, none)); …stroke-width, -linejoin, -linecap }`.
  A `--tosi-icon-*` value set on any ancestor, `:root` included, therefore never reaches a `<tosi-icon>`.
  The same value does reach `icons.x()`. The icons page tells readers to theme icons with exactly these
  variables (`icons.ts:205-209`).
- ✔ `hd icons-check.ts`: an ancestor has `--tosi-icon-size: 40px; --tosi-icon-fill: red`; the
  `<tosi-icon>` inside it computes `16px` and `none`, while the ancestor computes `40px`. The cascade
  happy-dom applies here is the one the spec defines.
- Inside the repo, every page sets the variable on the `<tosi-icon>` itself (`carousel.ts:18`,
  `icons.ts:6`), so nothing in the repo shows it.
- The same pattern outside my scope: `select.ts:303-304` declares `--tosi-select-gap` and `-touch-size`
  on its own element.
- **Worth a patch on its own: yes**, but the fix decides the legacy `--xin-icon-*` and `--icon-*` fallbacks.
  Move them into the property values (`height: var(--tosi-icon-size, var(--xin-icon-size, 16px))`), or
  drop them (see C2).

### A3. Cause: the placeholder `square` is assumed to be registered (`icon-core.ts:443, 467, 514`)

- **What happens.** On a page that has loaded only the per-icon modules (the #3885 path), two calls throw
  `TypeError: null is not an object (evaluating 'sourceSvg.querySelectorAll')`:
  - `resolveIcon('')`, which is what `<tosi-icon>` asks for before its `icon` is set;
  - any redirect cycle.

  The cause is that `makeIcon(iconData.square)` gets `undefined`.
- ✔ `hd core-only.ts` (imports only `icon-core` and `icons/x`): `"" threw`, `"loopA" threw`. An empty
  `<tosi-icon>` rendered 0 children; whether it also throws could not be observed under happy-dom.
- **Worth a patch on its own: yes**, and it is small. Give the placeholder its own inline spec, or send `''`
  down the `lateIcon` path.

### A4. Cause: `svg2DataUrl` bakes only the descendants' inline styles, and works on the caller's element (`icon-core.ts:75-144`)

- **a. The root's styling is dropped.** That is where every stroked icon keeps it. `svg2DataUrl(icons.check())`
  with no arguments comes out as `<svg class="stroked tosi-icon" … stroke-linecap="round"
  stroke-linejoin="round"><polyline …/></svg>`: no stroke, so the SVG default (a black fill) draws a black
  wedge. The 2px default stroke width is lost even when a stroke colour is given.
  - ✔ `hd icons-check.ts`, check 2.
  - The docs half-warn about this (`icons.ts:356-357`).
  - Worth a patch: low priority. Bake the root's fallbacks (`2px`, `none`, `currentColor` → the stroke
    argument) the way linecap and linejoin already are (`:120-122`).
- **b. The argument is mutated.** An icon already on the page loses its `style` and has its paths
  recoloured.
  - ✔ `bun --preload ./src/test-setup.ts -e "…svg2DataUrl(icon,'gold','orange',4)…"` prints `after: style
    attr = null | path fill attr = gold`.
  - Every caller in the repo passes a fresh icon, so nothing breaks today. Fix: `cloneNode(true)` first.

### A5. Cause: `tosijs-make-icons` (`bin/make-icon-data.js`) diverges from the renderer and the grammar

- **a. #4319, locale-dependent icon names.** `:264` uses `char.toLocaleUpperCase()`. On a runtime whose
  default locale is Turkish or Azeri, `font-italic`, `log-in`, `phone-incoming` and `zoom-in` would become
  `fontİtalic`, `logİn`, `phoneİncoming` and `zoomİn`.
  - ✔ The mapping: `bun -e` with `toLocaleUpperCase('tr')` prints exactly those four.
  - Not reproduced from the environment on this machine. `LANG=tr_TR.UTF-8 bun` resolves the locale as
    en-US. `LANG=tr_TR.UTF-8 node` resolves it as tr-TR, but V8's argument-less `toLocaleUpperCase()` still
    returned `I`.
  - Fix: `toUpperCase()`. Every other case conversion is listed in **F**.
- **b. Every `id` is stripped, but `url(#…)` references are kept** (`:304`). Gradients, clip paths and masks
  in a generated icon then point at nothing. The renderer has code to make exactly these ids unique
  (`icon-core.ts:248-270`), but generated icons never reach it with an id.
  - ✔ The scratch icon `grad-app/icons/color/swatch.svg` generates
    `<linearGradient>…<rect fill="url(#g)"/>` with the `id` gone.
  - **This is live for an adopter:** tosijs-3d's generated `fog`, `clothTexture` and `colorPicker` reference
    `url(#am2)`, `#am5`, `#am6` and `#am7`, and their ids were stripped (✔ read with a python regex over
    `tosijs-3d/src/icon-data.ts`).
  - No built-in tosijs-ui icon uses `url(#`.
  - **Worth a patch: yes.**
  - Follow-up: `iconSvg` does not make ids unique, so two such icons inlined into one page would collide.
- **c. Folder classes are decided by substring over the whole path** (`:276, 314, 336, 340`,
  `dir.includes('color' | 'stroked' | 'filled')`). Every icon in a project at `…/watercolor-app/icons/…`
  gets class `color` and keeps its baked colours.
  - ✔ The same SVG gives `class="color stroked" … style="stroke:#ff0000;"` under `watercolor-app/` and
    `class="stroked"` under `plain-app/`.
  - **Worth a patch: yes.** Test the folder names below `--input` instead.
- **d. A directional redirect for a name ending in a digit has no `_` separator** (`:231, 367`).
  `chevron-right-2.svg` in `up-down-right-left/` generates `chevronDown2: "chevronRight290r"`, which the
  grammar reads as `chevronRight` turned 290°.
  - ✔ The generator output, plus `splitSuffixes('chevronRight290r')` →
    `{"baseName":"chevronRight","tokens":["290r"]}`.
  - The renderer has `safeIconSuffix` (`icon-core.ts:147`) for exactly this case.
  - No built-in or tosijs-3d icon is affected (✔ `find`). Ship it with b and c.
- Already filed: #1600 (a bare `catch {}`, and `\r`/`\t` in `quote()`) and #3980 (`stroke:none` is lost).

### A6. Cause: `theme-data`'s `ruleKey` round-trips variable names through camelCase (`theme-data.ts:285-290`, used at `:323` and `:654`)

- **What happens.** A theme variable with `-<digit>` or a capital letter in its name is written to a
  **different custom property**. `themeStyleSheet` writes every theme the editor or `applyThemeData`
  produces.
  - ✔ `hd theme-check.ts`: `tosi-spacing-2x` → `--tosi-spacing2x`, `md-sys-elevation-level-1` →
    `--md-sys-elevation-level1`, `Brand-Color` → `---brand--color`.
  - Dark inversion is affected too: `invertedColors` returns the key `tosi-shade1` for input `tosi-shade-1`.
- **Why it matters.** `SAFE_NAME` (`:598`) accepts these names, and pattern discovery
  (`theme-discovery.ts:109`) finds them in the page's own CSS. Tailwind-style (`--color-red-500`) and Open
  Props-style (`--size-1`) variables are therefore edited, and then written to a name nothing reads.
- **Worth a patch: yes.** Write `--${name}` keys directly. tosijs `css()` passes them through, and
  `theme.ts:342` already relies on that. `ruleKey` then has no other use.

### A7. Cause: the text colour on the accent is picked by BT.601 luma, not WCAG contrast (`theme.ts:226`, also `:212`)

- **What happens.** `createTheme` sets `--tosi-accent-text` from `accent.contrasting()`. tosijs uses luma
  over 0.5 (`tosijs/src/color.ts:234, 384`), which picks white on mid-luminance teals, greens and reds where
  black passes AA.
  - ✔ `hd contrast-check.ts`:

    | accent | text picked | contrast | the other choice |
    | --- | --- | --- | --- |
    | `#009688` | white | 3.67:1 | black 5.72:1 |
    | `#00a0a0` | white | 3.21:1 | black 6.54 |
    | `#2e9e2e` | white | 3.47 | black 6.05 |
    | `#e05050` | white | 3.87 | black 5.43 |

    The default `#d92270` and `#0064d2` are fine.
- **The same repo already fixed this once.** `tag-colors.ts:7-19` documents the same failure ("white on pure
  red at 4.0:1") and picks the better of the two by WCAG.
- **Other copies.** `readableOn`'s last-resort fallback (`theme.ts:212`) uses the same `contrasting()`.
  `css-value-forms.ts:77` (`textOn`) uses WCAG luminance, so the `contrast` form and the generated variable
  can disagree for the same colour.
- **Worth a patch: yes, the owner's call.** It changes the derived colour for some accents, always toward
  AA, which is the 1.16.15 ground.

### A8. Cause: two dark-mode derivations of the component theme, and a tosijs `Color` cache

- **What happens.** `createDarkTheme(defaultColors)` (`theme.ts:289`, which inverts `Color` objects) and
  `componentThemeGenerator.dark` (`theme-data.ts:702`, which inverts their hex strings, as
  `applyThemeData` and the editor do) disagree.
  - ✔ `hd contrast-check.ts`: `tosi-accent-dark` is `#cb5e8d` from one and `#e04989` from the other;
    `tosi-accent-light` and `tosi-bg-inset` differ by one step.
- **Root cause, upstream.** `Color.fromCss('#d92270').darken(0.15)` is `#b61f60`, but its cached `_hsl`
  has `s = 0.707`, where the hex parses to `s = 0.508`.
  - ✔ `bun --preload … -e` prints `inverse from object #e04989 from hex #cb5e8d`.
- **Patch here: no.** File it with tosijs, with this evidence, and keep one dark derivation here
  afterwards (B2).

### A9. Cause: "is this a colour?" has four answers (`theme-data.ts:308-317, 352`; `css-value-forms.ts:101-102`; `theme-discovery.ts:64`)

- **What happens.** Derived modes (`invert`, `contrast`, `monochrome`, `tint`) leave `oklch()`, `oklab()`,
  `lab()`, `lch()` and `hwb()` literals untouched. Discovery calls the same values colours
  (`CSS.supports`), and css-value-forms parses them as colour literals.
  - ✔ `hd theme-check.ts`: a light `oklch(0.98 0 0)` stays `oklch(0.98 0 0)` in derived dark, while a hex
    is inverted.
- **Underlying limit.** tosijs `Color.fromCss` parses only sRGB syntaxes. ✔ It gives `#00000000` for
  oklch, hwb and lab under happy-dom, and `tosijs/src/color.ts:25` documents the limit. So the narrow
  predicate is a guard rather than an oversight, but the docs promise "colour literals are transformed"
  (`theme-data.ts:71`).
- (The `hsl()` result in that script, `#000064`, is a happy-dom artefact. A browser normalises `hsl()`
  first.)
- **Patch:** document the limit now. A real fix needs colour-space conversion (the canvas in
  `resolveColor`), which build-time code does not have.

### A10. Cause: copies in the CSS-value/editor family disagree

- **a. Two `splitLength` copies.** `css-value.ts:137-142` reads a unitless `16` as `16px`, and editing the
  amount writes `17px`. `theme-editor.ts:227-234` returns `null` for it; only `0` may be unitless.
  - ✔ `hd misc-check.ts`, check 3 (css-value shows `16 px`, then `"17px"`), and `hd theme-check.ts`, check 4.
  - Low priority; merge per B2.
- **b. Two `resolveColor` copies.** The one in `theme-discovery.ts:179-202` lacks css-value's guard against
  an invalid value (`css-value.ts:565`). A half-typed value therefore resolves to the scope's inherited
  text colour instead of `null`, and the editor's colour well shows that colour (`theme-editor.ts:1086`).
  Read only: it needs a canvas, so a browser lane.

### A11. Lifecycle and contract defects, each with its own cause

- **a. `<tosi-color>` never fires `change`** (`color-input.ts:96-118`). Its inputs' `change` events are not
  composed, so they stop at the shadow root. Its own doc example (`color-input.ts:7-14`) listens for
  `change`. This breaks the library's value + change contract.
  - ✔ `hd color-input-check.ts`: `host saw change: 0  host saw input: 1`.
  - **Worth a patch: yes.**
- **b. `groupVariables` throws on a name containing `--`** (`theme-discovery.ts:243`), so a theme editor
  given such a pattern renders nothing. WordPress block themes (`--wp--preset--color--*`) are an example.
  - ✔ `bun -e` with `groupVariables(['md--x','md--y','md-b'])` throws `tail[0][0].toUpperCase`.
  - Worth a patch: yes, small.
- **c. Menu shortcuts throw on a keydown with no `key`** (Chrome's autofill sends one). `matchShortcut`
  (`match-shortcut.ts:81`, used by `menu.ts:1668`) throws; the palette's copy guards against it
  (`palette.ts:230-231`).
  - ✔ `hd misc-check.ts`: `match-shortcut matchShortcut threw: undefined is not an object (evaluating
    'event.key.toLowerCase')`, while the palette's returns `false`.
  - Worth a patch: yes, one line. The file is in the menu area.
- **d. Following the documented localization protocol breaks localization.** The docs say to implement
  `updateLocale` (`localize.ts:401-430`), but `updateLocalized` calls `localeChanged()` (`:481`). The first
  instance that follows the docs throws, and every later instance and `applyLocalizedEverywhere()` are then
  skipped. The sample also contains `connectecCallback`, and a `disconnectecCallback` that calls
  `super.connectedCallback()`.
  - ✔ `hd misc-check.ts`: `updateLocalized threw "TypeError: localized.localeChanged is not a function"`.
  - Patch: fix the docs. Optionally skip instances that lack `localeChanged`.
- **e. `enableLiveTheme()` after `disableLiveTheme()` adds four more observers.** Three cycles leave four
  theme applications per change (`live-theme.ts:172-189`).
  - ✔ `hd misc-check.ts`: `applications … for ONE accent change after 3 disable/enable cycles: 4`.
  - Low priority: the API is vestigial (E).
- **Read, low priority:**
  - `<tosi-theme-editor>`'s default `applyId` is `'tosi-live-theme'` (`theme-editor.ts:248`), the same
    `<style>` id `liveTheme` writes (`live-theme.ts:166`), so each replaces the other's sheet.
  - The editor replaces an explicit `mode: 'light'` with the page's mode (`theme-editor.ts:1198`, which
    cannot tell an explicit value from the default).
  - `TosiLocalePicker`'s title is localized once (`localize.ts:776`).
  - `lateIcon` has no `.catch` (`icon-core.ts:528`). Offline, that is an unhandled rejection and an icon that
    stays empty.
  - The palette's own spinner ignores `prefers-reduced-motion` (`palette.ts:609-616`); icon spin honours it
    (`icon-core.ts:180`).
  - The palette does not abort running sources when it disconnects (`palette.ts:848-853`).
  - Outside my scope: `filter-builder.ts:334` has the invalid selector `':host .tosi-icon:'`.

---

## B. Phase 1 (no functionality removed)

### Dead code (internal only)

- `TosiLocalized.contents` (`localize.ts:817`) is a misspelling of `content`. tosijs never reads it
  (✔ grep of `tosijs/src/component.ts`), so the default `slot()` applies. Delete it.
- `select.ts:233, 717, 728` use the deprecated alias `XinLocalized`. Switch them to `TosiLocalized`; this is
  what keeps the alias needed internally.
- `src/icon-data.ts` (97,950 bytes, ✔ `wc -c`) is imported only as a **type** (`icon-types.ts:2`) and by
  `icon-creators.test.ts:11`. At runtime everything reads `icons/data/index.ts`, which the test asserts is
  identical. Derive `IconName` from `typeof import('./icons/data/index.js').default`, and have `bin/dev.ts:105`
  stop writing it. The generator keeps `--output` for adopters. Removing `dist/icon-data.js` is a public
  change: C1.
- The theme editor's own `length`, `number` and `enum` controls, `showLength`, `lengthStep` and its
  `.length-*` CSS (`theme-editor.ts:237-242, 834-866, 1111-1129, 629-640`) run only for a **non-colour base
  variable**. Both shipped generators have colour-only bases (`theme-data.ts:688-692`,
  `doc-system-styles.ts:889-894`). They are not dead, since a custom generator could use them, but they
  should go in the B2 merge.

### One implementation each

1. **Regex escaping: 15 copies repo-wide** (✔ grep), 5 of them in scope.
   - In scope: `css-value-forms.ts:80`, `icon-core.ts:262`, `palette.ts:289`, `theme-editor.ts:376`, and the
     deliberate `*`-less variant at `theme-discovery.ts:41`.
   - Elsewhere: `router.ts:234`, `doc-search.ts:169`, `release-notes.ts:247`, `doc-title.ts:67`,
     `orchestrator.ts:212`, `bundle-guard.ts:61`, `restamp.ts:43`, `code-transform.ts:193, 237`,
     `bin/tunnel.ts:232`.
   - Merge into one DOM-free `escapeRegExp`. `theme-discovery`'s variant still works with it, because it
     escapes the parts after splitting on `*`. `RegExp.escape` exists in this Bun (✔ `typeof RegExp.escape`
     → `function`); whether the browser targets allow it is the owner's call.
2. **Probing a value in the page.**
   - Copies: `theme-discovery.ts:179-202, 251-260` (`resolveColor`, `resolveLength`) and `css-value.ts:561-587`
     (`probe`, `resolveColor`, `resolveLength`).
   - The merged version keeps discovery's cached context, `willReadFrequently` and `clearRect`. It keeps
     css-value's invalid-value guard (fixing A10b) and takes a scope parameter.
   - css-value then stops creating a canvas on every call.
3. **Lengths.**
   - Copies: `LENGTH_UNITS` (`theme-editor.ts:224`, `css-value.ts:130`), the unit alternation in the regex at
     `css-value-forms.ts:100`, and `splitLength` (`theme-editor.ts:227`, `css-value.ts:137`).
   - Home: `css-value-forms.ts` (DOM-free). Keep the rule that only `0` may be unitless (A10a) and the numeric
     amount. `theme-editor` re-exports both names, which are public.
4. **The colour well's alpha sync** is copied verbatim at `theme-editor.ts:620-627` and `css-value.ts:553-559`.
   - The editor's base colour field could become a `tosiCssValue` like every other field (`:816-825`).
   - That needs a literal-only option, because a generator reads base values with `Color.fromCss`. A
     generator cannot use `ref`, `mix` or `adjust`.
5. **The `CSS.supports` guard:** `theme-data.ts:312-315`, `theme-discovery.ts:52-55`, `css-value.ts:132-135`.
   Keep one `supports()`.
6. **`isMac`.**
   - Copies: `palette.ts:189-191` (platform, falling back to the user agent, checked on every call) and
     `match-shortcut.ts:10-12` (platform only, also matches `iPod`, evaluated once at import).
   - The merged version keeps the user-agent fallback and `iPod`.
7. **Text on a colour: 4 rules.**
   - `Color.contrasting()` (`theme.ts:212, 226`, `tag-colors.ts:17`), best-of-two by WCAG
     (`tag-colors.ts:13-19`), `readableOn` (`theme.ts:203`) and CSS `textOn` (`css-value-forms.ts:72-79`).
   - Merge into one WCAG `textOn(bg)` in `theme.ts` (this fixes A7). CSS `textOn` stays, since it is the
     same rule computed by the browser.
8. **"Is a colour": 4 predicates** (A9).
   - `isColor` and `COLOR_TOKEN` (`theme-data.ts:308, 352`), `hexOrName` (`css-value-forms.ts:101`) and
     `inferKind` (`theme-discovery.ts:64`).
   - The merged version keeps:
     - only browser-confirmed named colours (`theme-data`'s guard against `serif`);
     - the `url(` exclusion;
     - one explicit list of the syntaxes `Color` can transform, which the docs then cite.
9. **Spinners.** The palette defines its own keyframes (`palette.ts:609-616`) instead of using the icon
   `spin` rule. Using the rule picks up reduced motion (A11, read).
10. **Applying parts to an icon:** `makeIcon` against `wrapIcon`. Keep `wrapIcon`'s rule: add the classes,
    assign the styles last (A1).
11. **Dark derivation of the component theme:** `createDarkTheme` and `componentThemeGenerator.dark`. Make
    one call the other once tosijs fixes A8.
- **Router check.** Merge the two shortcut grammars (C) into **one** parser that accepts `+`, `-` and glyphs,
  and the union of their guards: `mod`, the warning for an unknown modifier, the guard for a missing key. A
  `grammar: 'menu' | 'palette'` flag would be a router in disguise.

### Declarations written twice

- `componentThemeGenerator.defaults` (`theme-data.ts:693`) equals `defaultColors` (`theme.ts:145-149`).
  ✔ `hd theme-check.ts`, check 3. Derive it from `defaultColors.*.html`.
- `VALUE_KINDS` (`theme-editor.ts:203-210`), `CssValueKind` (`css-value-forms.ts:13-14`) and the keys of
  `CSS_VALUE_FORMS` and `LITERAL_LABELS` list the same six kinds. Use `Object.keys(CSS_VALUE_FORMS)`.
- `PaletteTrigger` and `TRIGGERS` (`palette.ts:202-203`): make the array `as const` and derive the type.
- `MODIFIERS` and `MODIFIER_ALIASES`, plus the name tables at `palette.ts:248-254` and `:273-277`: one
  table per modifier.
- `IconName` is typed from a generated 98 KB duplicate (B1). `IconData` is declared twice
  (`icon-types.ts:4` and the generator's `icon-data.ts:1`), and the `icon-types.ts` one has no user.
- `ThemeColors`' required keys (`theme.ts:129-132`) and `componentThemeGenerator.base` (`theme-data.ts:688-692`).

### Teardown and caches

- `liveTheme`'s observers pile up (A11e).
- `<tosi-palette>`: disconnecting does not abort `searching`, so sources and their timeout timers run on
  against a detached list (`palette.ts:848-853`). Call `this.searching?.abort()` there.
- `<tosi-css-value>` builds a fresh canvas each time it resolves a colour (`css-value.ts:576`), up to two
  per render while a well is dragged. That is garbage, not a leak; it is fixed by B2.
- By design, recorded here so nobody "fixes" them:
  - localize's single page-lifetime `MutationObserver` (`localize.ts:534-575`);
  - the theme editor's applied `<style>` outliving it;
  - the module `WeakSet` and the single adopted sheet for icon spin.

### Structure (no behaviour change, one file per change)

1. `icon-types.ts`: derive `IconName` from the index (B1).
2. Break the `localize.ts:437` ↔ `select.ts:233` import cycle. `localize` imports `tosiSelect` only for
   `<tosi-locale-picker>`, which is also why every page that localizes carries `<tosi-select>`
   (`palette.ts:98-100` says so).
3. `theme-editor.update` derives the theme twice per edit: once inside `applyThemeData` → `resolveTheme` →
   `deriveTheme`, and again at `:1169`. It also calls `editable()` four times. Pass the result through. #4151
   asks for this to be measured first.
4. `css-value-forms.ts` becomes the home of the lengths and the "is a colour" list (B2 items 3 and 8).
5. Put each token's meaning in `icon-suffixes.ts` (rotate or flip, with a value). Today two interpreters
   agree on it: `parseStyleSuffixes` (`icon-core.ts:370-428`) and `transformed` (`icon-svg.ts:138-163`), plus
   `isGeometry` (`icon-svg.ts:56`).
   - ✔ They agree today: `chevronRight0f` gives `scaleX(-1)` and `scale(-1 1)`.
   - Low value; this is the last restatement of the grammar's token shapes.

### Tests and build

- Repeated harness code: the "wait until the shadow part exists" loop (doc tests at `theme-editor.ts:79`
  and `css-value.ts:56`), and data-URL decoding (`svg-data-url.test.ts:14`, my scripts).
- Tests the merges need:
  - icon parts as **rendered**, both through the creator and through `<tosi-icon>` attributes (A1, A2);
  - `resolveIcon('')` on a component-only page (A3);
  - theme names containing `-<digit>` and capitals, through `themeStyleSheet` and `invertedColors` (A6);
  - accent text against WCAG for a teal (A7);
  - a unitless length in both callers (A10a);
  - `resolveColor('garbage')` returning `null`, in the browser lane (A10b);
  - `<tosi-color>` dispatching `change` (A11a);
  - `groupVariables` with `--` in a name (A11b);
  - both shortcut grammars, and a key-less event (A11c);
  - the generator on ids, on a path containing `color`, and on a digit-ending directional name (A5).
- Uncovered by unit tests: `<tosi-css-value>` as an element, `<tosi-color>`, `live-theme`, `theme-chain`,
  and `theme-discovery`'s `resolveColor`, `resolveLength` and `discoverThemeVariables`. I did not read the
  `.pw.ts` specs to see whether they cover these.

### Docs, with no API change

Advice that is wrong today:

- `icons.ts:301-308`, on `<tosi-icon>`:
  - it says "four attributes" and lists five;
  - a `color` attribute does not exist (it is `fill`);
  - the `stroke-width` text ("1024 units … multiplied by 32") is stale;
  - `stroke`, `fill` and `stroke-width` currently do nothing (A1).
- `icons.ts:310-312` and `:621-622`: "scales the viewBox to 1024 and rounds to integers". The generator rounds
  by viewBox size and keeps feather's `0 0 24 24` (✔ `iconSvg('chevronDown')` output; `make-icon-data.js:156-169`).
- `icons.ts:236-237`: "`tosijs-ui/icons/data/<name>` exports the icon's SVG source". **28 of 320** hold a
  redirect token instead.
  - ✔ `bun -e "import { chevronDown } from './dist/icons/data/chevronDown.js'"` prints `"chevronRight90r"`.
  - ✔ `grep -L '<svg' src/icons/data/*.ts` finds 28.
- `localize.ts:399-430`: the `updateLocale` protocol and its typos (A11d).
- `localize.ts:254-259`: "`xin.i18n` … in the console". tosijs defines no `xin` global (✔ grep for
  `window`/`globalThis` assignments).
- `localize.ts:37-41` misstates the lowercase rule. Output is lowercased only when the reference string is
  all lowercase (`:714`), as `:206-208` says correctly.
- `color-input.ts:7-14`: the example listens for `change`, which never fires (A11a).
- Already filed: #4152 (theme-editor examples import from the root, and its kinds table omits `shadow` and
  `image`).

Teaching order:

- `icons.ts:21` uses `const { tosi, elements } = tosijs`, and `localize.ts:105` uses
  `import { button, p } from 'tosijs'.elements`. Both work only inside the live-example runner, and an adopter
  who copies either gets a broken line. The second spelling appears in 10 files repo-wide (✔ grep). Teach
  `import { elements } from 'tosijs'`.
- `theme.ts` teaches `createTheme`/`applyTheme`, with a hand-rolled dark toggle, and never mentions
  `theme-data`. `applyThemeData` writes every mode under its selector, and its light-only output is
  identical (C4). Make theme data the first spelling, or cross-link the two.

---

## C. Phase 2 (one way to do each thing)

### Redundant public spellings

| Task | Redundant spelling | Same as | Consumer uses | Notes |
| --- | --- | --- | --- | --- |
| Every icon as one map | `tosijs-ui/icon-data` (via `./*`; `dist/icon-data.js` 97,573 B + `.d.ts` 7,054 B, ✔ `wc -c`) | `tosijs-ui/icons/data` default | 0 | ✔ `icon-creators.test.ts:23-31` asserts identity. C1: stop shipping it in 1.20 (B1 first). |
| Component variables | `componentVars('select', { touchSize: '44px' })` (`theme.ts:389`) | tosijs `varDefault.tosiSelectTouchSize('44px')` | 0, and 0 internal | ✔ identical output (`bun -e`, `true true`). Remove. |
| Legacy theme | `createThemeWithLegacy(c)`, `legacyAliases` (`theme.ts:340-372`) | `{ ':root': { ...createTheme(c)[':root'], ...legacyAliases } }`; the `--xin-*` names | 0 (kith-email's `legacyAliases` is its own variable) | From the xinjs-ui era. C2: retire together with `<tosi-icon>`'s `--xin-icon-*`/`--icon-*` fallbacks (A2) and `SvgIcon`'s `--xin-icon-size` write (`icon-core.ts:590`). |
| Match a shortcut | `matchesShortcut` / `describeShortcut` (`palette.ts:207, 266`) and `matchShortcut` / `displayShortcut` / `parseShortcut` / `canonicalShortcut` (`match-shortcut.ts`) | Neither: two **grammars** (`mod+k` against `⌘⇧K`/`ctrl-x`) | 0 by name | Menus use one grammar, the palette the other. The mac display order differs (as written, against ⌃⌥⇧⌘), and so does the separator (space against `+`). Keep one grammar (B2 router check). `ariaShortcut` is a capability only the palette has. |
| Apply a theme | `applyTheme(createTheme(c))` | `applyThemeData({ base: c }, componentThemeGenerator)`, light mode only | 0 | ✔ Same CSS except the outrank selector. **Not redundant:** theme data writes all modes. C4 is a teaching decision, not a removal. |
| Dark theme | `createDarkTheme(c)` | theme data's dark mode | 0 | ✗ They differ on 3 variables (A8). Merge after the tosijs fix. |
| Contrast | tosijs-ui `contrastRatio(Color, Color)` (`theme.ts:186`) | tosijs `contrastRatio(string, string)` (`tosijs/src/audit.ts:126`) | 0 | **Not redundant.** tosijs-ui's throws on a translucent colour, tosijs's ignores alpha (the bug `theme.ts:181-184` describes). Ask tosijs to adopt the guard. `tag-colors.ts:5` uses tosijs's. |
| Draw an icon | `resolveIcon(name, parts[])` | `icons[name](...parts)` (`icon-core.ts:545-549`) | 0 | Documented for authors of custom rules (`icons.ts:542-558`). Keep unless C trims the rule-author API. |
| Live theme | `liveTheme` + `enableLiveTheme` / `disableLiveTheme` | `applyTheme` from your own observer, or the theme editor | 0, and 0 internal | No longer driven by the editor (`live-theme.ts:7-10`), buggy teardown (A11e), and it shares a style id with the editor. Retire (E). |
| Edit a colour | `<tosi-color>` (`colorInput`) | `<tosi-css-value kind="color">` | 1 repo (`colorInput`) | **Not redundant.** Only `<tosi-color>` has an opacity control. #4054 plans to retire that control. |

### The existing `@deprecated` inventory in scope (all in `localize.ts`)

| Line | Name | Still needed? | Warns at runtime? | Docs teach only the survivor? |
| --- | --- | --- | --- | --- |
| 789/791 | `LocalePicker` (type + const) | No consumer (✔ grep of sibling repos) | No, it is a plain alias | Yes (✔ grep) |
| 796 | `localePicker` | No consumer | No | Yes |
| 845/847 | `XinLocalized` (type + const) | Only `select.ts:233, 717, 728` internally (B1) | No | Yes |
| 852 | `xinLocalized` | No consumer | No | Yes |

That is 6 declarations and 4 runtime names. Every one names its replacement in JSDoc, and none warns once at
runtime. Remove them in 1.20.

What the inventory misses (legacy, but not marked):

- `legacyAliases` and `createThemeWithLegacy`;
- `<tosi-icon>`'s `--xin-icon-size`, `--xin-icon-stroke-width`, `--icon-stroke-width`, `--icon-stroke-linejoin`,
  `--icon-stroke-linecap`, `--xin-icon-fill` and `--icon-fill` fallbacks (`icon-core.ts:562-567`), plus the
  `--xin-icon-size` write (`:590`);
- the `xin.i18n` sentence in the docs;
- `SvgIcon`'s `strokeWidth: 1` default, documented as a 1024-unit scale.

---

## D. Not proposing

- **Collapsing the 641 generated per-icon modules.** They are the tree-shaking path (#3885; CLAUDE.md
  "Subpath Exports & Tree-Shaking"). #1427 (a frozen snapshot) looks **done**: the modules are regenerated
  every build (`bin/dev.ts:105`) and `icon-creators.test.ts:23` asserts they match the data. Only its "document
  them" part remains, and that is the B docs item about redirect tokens.
- **Resolving redirects inside the data modules.** Decided at `make-icon-data.js:516-517` ("A redirect's module
  holds the redirect"). Fix the docs instead.
- **Merging `icon-svg.ts` into `icons.ts`.** It is DOM-free by design (`icon-svg.ts:38-42`); ✔ it runs with no
  DOM (`bun -e "import … './dist/icon-svg.js'"`, where `typeof document` is `undefined`).
- **The suffix grammar's single owner.** Settled (CLAUDE.md, `icon-suffixes.ts`). No other copy survives in
  tosijs-ui (✔ grep for `osxyr`, `[01]f`, `[FS]`). The rule-before-suffix order now has one owner too,
  `suffixedIcon` (#3332 N2, done). tosijs-3d keeps verbatim copies of `SUFFIX_RE` and `SUFFIX_TOKEN_RE`
  (`tosijs-3d/src/icon-name.ts:51-52`) and of `makeIcon` (`svg-icons.ts`). That is another repo; if it is
  wanted, the owner can tell them `splitSuffixes` is importable as `tosijs-ui/icon-suffixes`.
- **Requiring a camelCase boundary on string rule prefixes.** #3332 records it as the maintainer's call,
  because it changes what is drawn.
- **`iconRules` as a mutable array, and `iconCreator` as a public export.** The first is the documented
  extension point. The second is what an adopter's `--creators --core tosijs-ui/icon-core` modules import.
- **The theme editor out of the root barrel, and its fixed colours.** Both settled (1.19.0;
  `theme-editor.ts:162-163`).
- **`theme-fonts.ts` importing nothing.** A build constraint (`theme-fonts.ts:1-3`).
- **localize's `#` annotation grammar, and `localizePhrase`.** Settled (#55), and `localizePhrase` does a
  different job.
- **Renaming `SvgIcon`/`svgIcon` and `colorInput`/`ColorInput` to `Tosi*`/`tosi*`.** They break the naming
  convention, but a rename on its own adds spellings rather than removing them. It is not worth a break by
  itself.
- **The page-lifetime localize observer.** By design (`localize.ts:534-536`).

---

## E. Unused, but not redundant

86 of the root's 282 runtime names come from this scope (✔ `hd scope-exports.ts`). Consumers use about 7 of
them: `icons`, `defineIcons`, `IconElement`, `colorInput`, `tosiPalette`, `initLocalization`, and
`tosiLocalePicker`/`tosiLocalized` through `tosijs-ui/localize`. The ones that need a decision:

- `liveTheme`, `enableLiveTheme`, `disableLiveTheme`: no user anywhere, inside or out. Retire them in 1.20, or
  fix A11e.
- `THEME_MODES` (`theme-data.ts:256`): nothing reads it, not even in the repo.
- The seven `chain*` exports (`theme-chain.ts`) are internal plumbing exported at the root, with no consumer.
  They also leave the two-roots question open: #4156 covers radius. The same split exists for motion
  (`createTheme` emits a literal `--tosi-transition: 0.15s` at `theme.ts:174`, which no component reads,
  while components read `--tosi-duration`/`--tosi-easing`) and for surface (`--tosi-surface` against
  `--tosi-bg`).
- **22 of the 39 variables `createTheme` emits are read by nothing else in `src/`**: every `--tosi-button-*`,
  every `--tosi-input-*`, `--tosi-accent-light`/`-dark`, `--tosi-bg-hover`/`-active` and others.
  - ✔ `hd var-readers.ts`, a regex scan that could miss dynamically built names.
  - They are public CSS for adopters, but a theme that sets `--tosi-button-bg` changes no tosijs-ui
    component. Either the components read them, or the docs say they are for the adopter's own CSS.
- The palette helpers `highlight`, `rankResults`, `ariaShortcut` and `defaultPaletteRow` sit in the root
  namespace with no consumer. `highlight` is a very generic name to export from the root.

---

## F. Numbers

- **Lines in scope** (✔ `python3 -I …/count.py <files>`, approximate): 8,668 in all. 1,910 are doc
  (`/*#`, `/*{`), 864 comment, 5,473 code and 421 blank.
  - The generated index `icons/data/index.ts` accounts for 964 code lines.
  - The 320 creator modules have 1,628 lines, and the 320 data modules 320 lines (126,626 B with the index,
    ✔ `wc -c`).
- **Largest files:** `theme-editor.ts` 1,214, `palette.ts` 1,151, `icons/data/index.ts` 966, `localize.ts` 853
  (432 of it docs), `theme-data.ts` 723, `css-value.ts` 692, `icons.ts` 663 (653 docs, 5 code),
  `icon-core.ts` 603.
- **Ways to draw an icon (DOM): 6.**
  1. `icons.name()` / `icons['a$b']()`
  2. a per-icon module (`tosijs-ui/icons/x`)
  3. `resolveIcon(name, parts)`
  4. `iconCreator(name, spec)`
  5. `svgIcon()` / `<tosi-icon>`
  6. an icon name passed to a component (`icon: 'folder'`)
- **Ways to get markup without a DOM: 4.** `iconSvg()`, `tosijs-ui/icons/data/<name>` (an SVG or a redirect
  token), the `icons/data` default map, and the `tosijs-ui/icon-data` default map. Plus `svg2DataUrl`, which
  needs a DOM.
- **Ways to register icons: 2 public** (`defineIcons`, `iconCreator`) and 3 internal ones in `icon-store`.
- **Ways to apply a theme: 6.**
  1. `applyTheme(createTheme)`
  2. `applyTheme(createDarkTheme)`
  3. `createThemeWithLegacy`
  4. `applyThemeData`
  5. `liveTheme`
  6. `<tosi-theme-editor>`

  They write 3 `<style>` ids, two of which collide.
- **Ways to edit a colour: 3**: `<tosi-color>`, the colour literal in `<tosi-css-value>`, and the editor's
  base colour field.
- **Copy counts:**
  - shortcut grammars: 2;
  - "is a colour" predicates: 4;
  - rules for text on a colour: 4;
  - canvas colour resolvers: 2;
  - `splitLength`: 2;
  - `LENGTH_UNITS`: 2, plus a regex;
  - regex escapers: 15 repo-wide.
- **#4319: every case conversion in the icon and theme code.**

  | Site | Call | Applied to | Follows the locale? | Verdict |
  | --- | --- | --- | --- | --- |
  | `make-icon-data.js:264` | `toLocaleUpperCase()` | icon keys | yes (host default) | **Affected.** A5a; 4 built-ins plus any adopter icon with `-i`. |
  | `icon-rules.ts:97, 108, 115` | `toLowerCase()` | rule base name | no | fine |
  | `theme.ts:397`, `theme-data.ts:286, 290` | `toLowerCase()` / `toUpperCase()` | CSS variable names | no | fine (`ruleKey` has its own defect, A6) |
  | `theme-discovery.ts:243` | `toUpperCase()` | group heading | no | fine |
  | `theme-editor.ts:232`, `css-value.ts:140` | `toLowerCase()` | CSS units | no | fine |
  | `palette.ts:212, 231, 258, 260, 271, 278, 286` | `toLowerCase()` / `toUpperCase()` | shortcut grammar, `event.key`, query tokens | no | fine |
  | `icons.ts:107, 110` (doc example) | `toLocaleLowerCase()` | filter text | yes | appropriate |
  | `localize.ts:591, 682, 708, 714, 757, 758` | `toLocaleLowerCase()` | translation **keys** | host locale | Not broken: data and lookup use the same host. `toLowerCase()` would make it deterministic. |
  | `localize.ts:715` | `toLocaleLowerCase()` | translated **text** shown | the host's, not the chosen language's | Should be `toLocaleLowerCase(i18n.locale.value)`. |
  | `localize.ts:578` | `toLocaleLowerCase()` | sort key for the language menu | host locale | `makeSorter` compares with `>`. `localeCompare` would order "Čeština" correctly. |

  No other locale-dependent conversion exists in the icon code. #4319's second request (run the suite
  against tosijs 1.10.13) is outside this review: installed tosijs is 1.10.10 (✔
  `node_modules/tosijs/package.json`).
