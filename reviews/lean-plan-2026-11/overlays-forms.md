# Lean review: overlays-forms

Basis: `af13cd1ee` (src/ clean against HEAD). Scope: `src/` menu, float, pop-float, tooltip, dialog, notifications, select, search-field, form, tag-list, tag, tag-colors, segmented, rating, password-strength, rich-text, match-shortcut, track-drag, drag-and-drop, editable-rect, reduced-motion.

**What I read.** I read all 21 modules line by line (10,253 lines). I read the tests for the area through their test names plus a line-coverage run. I did not read the test bodies line by line.

**How the checks ran.** Every ✔ below ran as `cd ~/tosijs-ui && bun --preload ./src/test-setup.ts <script>`. The scripts are in `<scratchpad, not kept>/lean/overlays-forms/` and are named in each entry. They ran against tosijs 1.10.10 as installed. Anything else is marked "read".

**Baseline (✔).** `bun test src/{menu,pop-float,dialog,notifications,select,search-field,form,tag-list,match-shortcut}.test.ts` gave `250 pass, 0 fail`.

**The leads.**
- **Positioning:** wrong as stated. There is one geometry, `positionFloat` (pop-float.ts:310). The only second copy is tooltip's choice of quadrant (B, M11). Nothing clamps to the viewport anywhere; that is #3970's feature, not a duplicate.
- **Several ways to open a popup:** yes (F).
- **Shortcut handling:** yes. There are two grammars, and the matcher has real bugs (A5).
- **Form-callback plumbing:** yes. 7 of the 10 overrides do exactly what the base class does (✔, M1).
- **#4336:** covered in A12, and the card's component list misses `<tosi-search-field>` (C, #4336 note).

---

## A. Defects

Grouped by cause. "Patch?" says whether the item is worth a patch release on its own.

### A-I. Untrusted text reaches `innerHTML` (security)

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A1 | tooltip.ts:172, :229-238 | `initTooltips()` turns every hovered `title` into `data-tooltip` (`convertTitles` is on by default) and renders it with `el.innerHTML = marked.parseInline(text)`, unsanitized. Any app that puts user text in `title=` (a user name, a file name) runs that HTML as markup. `MenuItem.tooltip` takes the same path (menu.ts:1192). | ✔ `html-injection.ts`: a `title` of `<img src="x" onerror=…>` yields a live `<img onerror>` element inside `.tosi-tooltip`. | **Yes.** `tosijs-kilpi` is already a dependency (tosi-md sanitizes by default, #179). |
| A2 | drag-and-drop.ts:419-420 | The default drop handler does `target.innerHTML = dataTransfer.getData('text/html')`. That HTML can come from another window, another site or the desktop. | ✔ `html-injection.ts` 2a: the zone ends up holding `<img src="y" onerror="alert(1)">`. | **Yes**, together with A3 (same function). |

### A-II. Argument order disagrees with the other copy

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A3 | drag-and-drop.ts:418 vs :360 | `drop()` calls `isTypeAllowed(dragTypes, zoneType)`, but `markDroppable` calls `isTypeAllowed(zoneTypes, dragType)`. `text/*` and `special/any` zones are highlighted as targets, then receive nothing on drop. The page's own example "You can drop any text" (drag-and-drop.ts:132) is one of them. | ✔ 2b: the zone text is unchanged; `isTypeAllowed(["text/*"],"text/plain") = true`, but the reversed call returns `undefined`. | With A2. |

### A-III. Popups never learn that `<tosi-float>` removed itself

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A4 | menu.ts:1621-1631 (no hook); float.ts:251, :272 remove the float | When a resize or a scroll that moves the anchor removes a menu float, `onClose` never runs and `poppedMenus` keeps a stale entry. `<tosi-select>` stays `aria-expanded="true"` with `isExpanded` set, so ArrowDown (select.ts:552) no longer opens it until the next click. `search-field` already fixed this for itself with a MutationObserver (search-field.ts:740-744, the 1.16.3 F2 note). Live-example's REPL completions (live-example/component.ts:1798) have the same gap, which leaves `aria-expanded` stale (another area, read). | ✔ `float-self-removal.ts`: after `resize` the float is gone, `aria-expanded = true`, and ArrowDown opens nothing. | **Yes.** Fix once in TosiFloat (M7). |
| A23 | pop-float.ts:306 | **Read; needs a browser check.** `popFloat` always mounts in `document.body`. Opened from inside a modal `<tosi-dialog>` (dialog.ts:352 `showModal()`) or `<tosi-palette>`, the float is outside the top layer and outside the modal's subtree, which the browser makes inert. A `<tosi-select>`, menu or tooltip inside a modal dialog would then draw under the backdrop and ignore clicks. To settle it, run a Playwright check: put a `tosiSelect` in `tosiDialog().showModal()`, click it, and test `elementFromPoint` over the list. Fix: mount in the nearest open modal `<dialog>`, or use `popover`. | read | If confirmed, **yes**. |

### A-IV. Shortcut matching is built on `event.key`

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A5a | match-shortcut.ts:81 | `event.key.toLowerCase()` throws on a keydown with no `key` (Chrome autofill sends these; palette.ts:231 guards for it). It throws inside every `<tosi-menu>` and `<tosi-select>` document-level capture listener (menu.ts:1938, select.ts:708). | ✔ `menu-click.ts` #4: `undefined is not an object (evaluating 'event.key.toLowerCase')`. | **Yes** (one line). |
| A5b | match-shortcut.ts:81 | Because it matches on `key`: `⌥`/`alt` shortcuts never fire on macOS (Option+X gives `≈`), which the docs advertise at menu.ts:335. `⇧` with a digit or punctuation never fires on any platform (`⌘⇧1` gives `!`). `⌘-` cannot be written at all. The code-based `keycode()`/`keystroke()` (match-shortcut.ts:18-33) exist but nothing uses them. | ✔ `shortcuts.ts`: `matchShortcut(Option+X,"⌥x") = false`, `matchShortcut(⌘⇧1,"⌘⇧1") = false`, `"⌘-"` and `"meta--"` are both false. | With A5a. |
| A6 | menu.ts:1677; select.ts:693-696 | Every keydown anywhere in the document makes each `<tosi-menu>` walk its whole tree, calling lazy `MenuItemsProvider` functions along the way. That defeats the laziness and repeats any side effects. Each `<tosi-select>` rebuilds every option's menu item on every keydown (read). | ✔ `menu-click.ts` #3: five unrelated keystrokes, five provider calls. | Low; fold into M8. |

### A-V. Click menus ignore `filterForClick` and `hideDisabled`

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A7 | menu.ts:1587-1632 (popMenu) never calls `filterForClick` (menu.ts:943, used only by tests) | (a) A drop-only item (`acceptsDrop` + `dropAction`, no `action`) is a shape the docs support. `createMenuItem` (1418-1420) renders it as an **enabled submenu row with a chevron** that opens nothing. (b) `popMenu({ hideDisabled: true })` is ignored in click mode, although menu.ts:484 says it "applies symmetrically". `TosiMenu.hideDisabled` reaches drop mode only (1770). | ✔ `menu-click.ts` #1: a `BUTTON` with `disabled=false` and a chevron. #2: the rows are `["enabled","disabled"]`. | **Yes**, small. |

### A-VI. The four menu-row builders disagree

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A8 | menu.ts:1147 (action), 1204 (drop item), 1260 (submenu), 1403-1415 (drop label) | **#3968.** The submenu row has no `role`, no `aria-haspopup`, no checked class and no `aria-disabled`. The drop label drops `tooltip` and `properties`. The drop item ignores `checked`. See M2 for the full guard matrix. | read (card has the details) | via M2 |
| A9 | menu.ts:1879-1884, 1896-1903, 1860-1864 | `animateShortcut` reopens menus without `menuClass`, so a themed menu flashes unthemed. `findMenuItemByCaption` compares the raw caption with the rendered text, which is localized under `localized: true`, so the disclose animation silently skips. It also queries the deprecated `.xin-menu-item` class. | read | Low |

### A-VII. An icon given as "string or Element" is resolved four ways

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A10 | notifications.ts:583 (`instanceof SVGElement`); select.ts:756-761 (`instanceof HTMLElement`); segmented.ts:489, :428-433 (string used as-is); menu.ts:1152-1155 (`typeof === 'string'`, the correct copy) | **Notifications:** a composite icon element (a `<span>`) is stringified and used as an icon name. **Select:** an SVG icon element, which is what `icons.star()` returns, goes the same way. **Segmented:** a programmatic `Choice` with `icon: 'star'` (typed `string \| IconElement`, documented at segmented.ts:102), and `other="caption:icon"`, both render the icon **name as text**. #3948 is the typing half. | ✔ `notification-icon.ts`: `icon <span class="tosi-icon-composite"… does not exist`, and the element passed in is not used. ✔ `select-tag-form.ts` #2: `icon <svg …> does not exist` ×2. ✔ `segmented.ts` #1: `<input>star<span>Alpha</span>` and `<input>help<span>Other…</span>`. | **Yes** as a group (M3). |

### A-VIII. Two `change` events per edit

The base `value` setter already queues a `change` event that bubbles and is composed.

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A11 | select.ts:534-536; password-strength.ts:300-302 | Each sets `value` and then dispatches its own (non-bubbling) `change`, so the element gets two events. `<tosi-form>`'s capture listener (form.ts:756) runs twice. select.ts:441 and tag-list.ts:358/364/495 also call `queueRender(true)` again after setting `value`: harmless, but redundant. | ✔ `double-change.ts`: select 2, password-strength 2, segmented (the control) 1. | **Yes** (delete two lines). |

### A-IX. rich-text: value, change and teardown (#4336)

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A12 | rich-text.ts:287-303, :453-476 | **#4336 ask 2.** A value set **before connect** never reaches the editor. Today that is `tosiRichText({ value })`; under tosijs 7785c43c it is also `value="…"` in markup, because `_seedOwnValue` calls the setter before `isInitialized`. Fix: after the content-slot copy in `connectedCallback`, add `if (doc.innerHTML === '' && this._value) doc.innerHTML = this._value`. Under 7785c43c the setter also calls `internals.setFormValue(attr)` while the editor shows nothing, so FormData and the screen disagree. That part is read only (happy-dom has no ElementInternals). | ✔ `rich-text.ts` #1 and #2: the editor shows `""` for both the creator value and `value=`. | **Yes**, and before tosijs-ui moves to tosijs ≥ 7785c43c. |
| A13 | rich-text.ts:472-475 | An anonymous `document` `selectionchange` listener is added on every connect and never removed. There is no `disconnectedCallback`, so the element leaks and N attaches mean N calls. | ✔ `rich-text.ts` #3: one connect, 3 re-attaches and a removal give 4 calls per event. | **Yes** |
| A14 | rich-text.ts (no `change` anywhere) | Edits never dispatch `change`. `<tosi-form>` (form.ts:762) never sees them, and `syncFieldValues` (form.ts:778) fills only undefined keys, so a rich-text that the form initialised submits its stale first value (read). | ✔ `rich-text.ts` #5: 0 change events after an edit. | With A12 |
| A15 | rich-text.ts:405, :212, :262 | `console.log('execCommand', …)` runs on every toolbar click. The outdent button is titled "indent". `_xinIconSize: 18` sets a variable that only `<tosi-icon>` reads, so the toolbar's raw SVGs stay 16px (they use `var(--tosi-icon-size, 16px)`, visible in the select-tag-form output). | ✔ #4 (title `"indent"`); the rest read. | With A12 |

### A-X. rating

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A16 | rating.ts:278-284 | Changing `icon` appends `max` more icons instead of replacing them, and changing `max` never rebuilds them. | ✔ `rating.ts` #1: 5 icons, then 10 after `icon = heart`, still 10 after `max = 3`. | Yes |
| A17 | rating.ts:208-226, :211 | Any keydown on an empty rating (Tab, Shift) sets it to the "midpoint" and fires `change`. Tabbing through an empty **required** rating therefore satisfies `required`. The midpoint formula is also wrong when `step ≠ 1`. | ✔ #2: `""` becomes `3` on Tab. #3: with step 0.5 the first keypress gives `1`, not 3. | **Yes** |
| A18 | rating.ts:174, :188 | A string value draws 0 stars. `value="3"` in markup arrives as the string `"3"`. `pageX` minus a client-rect `x` is off by `scrollX` (read). | ✔ #4: `typeof value = string`, so 0 stars. | With A16-17 |

### A-XI. segmented

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A19 | segmented.ts:358-389 | Tab and arrow keys pressed in the "other" text field throw, because `closest('label')` returns null. | ✔ `segmented.ts` #2: two TypeErrors. | Yes |
| A20 | segmented.ts:211-214 | `formDisabledCallback` is a no-op stub that **replaces** the base class's version, which at least sets `[disabled]`. The component has no disabled state, so it stays live inside a disabled fieldset. | ✔ `form-callbacks.ts`: segmented gives `disabledAttr:false`, the base gives `true`. | Yes |
| A21 | segmented.ts:408-410 | An unnamed segmented writes `name="tosi-segmented-N"` onto itself and so submits under a generated name in a native form. Its radios sit in its own shadow root, so grouping them needs no host name. | ✔ #3: the `name` attribute is `"tosi-segmented-3"`. | Low |

### A-XII. dialog

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A22 | dialog.ts:312-316 | `closeOnBackgroundClick` closes on **any** click inside the dialog: its text, its inputs. `TosiDialog.alert` turns it on (dialog.ts:216). Fix: close only when the click falls outside the `<dialog>`'s rectangle. | ✔ `dialog-bg-click.ts`: a click on the paragraph closes it and resolves `cancel`. | **Yes** |
| A24 | dialog.ts:348 | `zIndex = findHighestZ()` on a statically positioned host does nothing (a modal sits in the top layer anyway) and costs a full style scan. Unlike every other caller, it also omits `+1`. | ✔ `z-scan.ts`: 2,010 `getComputedStyle` calls; host position is static. | B (delete) |

### A-XIII. tooltip

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A25 | tooltip.ts:229-238 vs menu.ts:1831, select.ts:564 | Converting the `title` removes the very attribute `<tosi-menu>` and `<tosi-select>` use as their accessible name (#3572). After one hover, the next render strips the trigger's `aria-label`, and an icon-only menu becomes unnamed. | ✔ `tooltip-title-name.ts`: `aria-label` goes from "More actions"/"Country" to `null`/`null`. | **Yes** (M9) |
| A26 | tooltip.ts:219 | `initTooltips()` has no once-guard (`dragAndDrop.init` and `ensureMenu` both have one). Every call adds six more document listeners, and they can never be removed. | read | Low |

### A-XIV. Smaller defects in the rest

| # | Where | Defect | Evidence | Patch? |
|---|---|---|---|---|
| A27 | tag.ts:75-84 | `<tosi-tag>` has no `render()`. Changing `caption` or `removeable` after creation updates nothing, and the `aria-label` stays stale. | ✔ `select-tag-form.ts` #4: shows `"before"`, remove stays hidden, label is "Remove before". | Yes |
| A28 | select.ts:520-523 | The filter keeps a submenu whose children all fail, because it tests the unfiltered `resolved.length`. | ✔ #1: `"more fruit [0 children]"`. | Yes |
| A29 | select.ts:262-272 | `hasValue` recurses on `Array.isArray`, but options are never arrays, so that branch is dead. Submenus nested more than one level never show as checked. | ✔ #3: outer `false`, inner `true`. | With A28 |
| A30 | form.ts:722-727, :689, :697 | The `fields` setter updates the fields but not `value`. `getField` builds an unescaped `[key="…"]` selector (select.ts:572 uses `CSS.escape`). A `value` that is not valid JSON goes to `console.log` and silently becomes `{}`. | ✔ #5 (`form.value = {}`, field `"Ada"`); the rest read. | Low |
| A31 | password-strength.ts:328-329 | `render()` with no `<input>` child yet throws. | ✔ `double-change.ts`: `TypeError … password.length`. | Low (#3950 covers `isBreached`) |
| A32 | editable-rect.ts:284, 308-311, 335-338, 366, 380; track-drag.ts:166-209 | Change events and lock restore happen only on `type === 'mouseup'`, so a **touch** drag never fires `change` and leaves all four sides locked. Rotation reads `clientX` from a TouchEvent and gets NaN, and it fires `change` on every move. **Cause:** `trackDrag` never tells its callback the drag ended, so every caller tests for `mouseup` itself (float.ts:156, sizer.ts:87), and data-table re-tracks touch ids on its own (data-table.ts:3458-3471). If a mouse callback forgets to return `true`, the full-page TRACKER overlay stays up. | read | With M14 |
| A33 | drag-and-drop.ts:366-369, :393-396 | An external drag (a file from the desktop) that leaves the window never reaches `end()`. The `.drag-target` highlights and a body-subtree MutationObserver stay live until the next drop. tosijs-virta works around the same class by dispatching a fake `dragend` (virta.ts:7706-7715). | read | Low |
| A34 | notifications.ts:443, :449-455 | The FLIP moves use a literal `MOVE_MS` and ignore both `--tosi-duration` and `prefers-reduced-motion`. `reduced-motion.ts` exists and carousel and live-example honour it. | read | Low |

**Stale card.** #3944 asks for `100vh` to stop being used. That is already done: pop-float.ts:410-419 measures with `visualViewport` (#2460, 1.16.3), and `overscrollBehavior: contain` is set at menu.ts:989. Propose closing it after an iPhone check.

---

## B. Phase 1 (no functionality removed)

### Dead code (internal only)

- rich-text.ts:272 `savedValue`. ✔ `bunx tsc --noEmit --noUnusedLocals` gives exactly one error in the **whole project**: `src/rich-text.ts(272,11): TS6133`.
- select.ts:266-267: the `Array.isArray` branch of `hasValue` (replace it with submenu recursion, which fixes A29).
- tag-list.ts:205: `Tag.icon` is never read (the type is not exported).
- dialog.ts:348: the z-index line (A24).
- select.ts:448 `getValue` and :450 `get selectOptions()` both just return `this.value`/`this.options`. `selectOptions` is public, so it goes to C.

### One implementation each

**M1. Form callbacks.** ✔ `form-callbacks.ts` calls each override and the base `Component.prototype` method on twin elements:
- `select` and `tag-list`: SAME for both callbacks.
- `formResetCallback`: SAME for all five components.
- Delete 7 methods: select.ts:430-436, tag-list.ts:344-350, segmented.ts:216-218, rating.ts:125-127, rich-text.ts:281-283.
- Keep rating's disabled→readonly and rich-text's `contentEditable` (they really differ).
- Replace segmented's stub (A20).

**M2. Menu row builder.** Four builders become one `menuRow(item, options, { trailing, handlers })`. It keeps every guard any copy has:

| guard | action 1147 | drop item 1204 | submenu 1260 | drop label 1403 |
|---|---|---|---|---|
| icon from a string name | ✓ | ✓ | ✓ | ✓ |
| `checked` used as the icon fallback | ✓ | – | ✓ | – |
| checked class | ✓ | – | – (#3968) | – |
| `role` (menuitem/option) | ✓ | – | – (#3968) | – |
| `aria-selected` in a listbox | ✓ | – | – | – |
| `tooltip` | ✓ | ✓ | ✓ | – |
| `properties` | ✓ | ✓ | ✓ | – |
| `disabled` + `aria-disabled` | both | both | disabled only | disabled only |
| `aria-haspopup` | – | – | needed | – |

The caption line `options.localized ? span(localize(c)) : span(c)` is written four times; it lives in the row builder. This fixes A8 by construction.

**M3. Icon argument.** One `toIcon(icon: string | Element | undefined, fallback)` in icon-core:
- a string goes to `icons[name]()`;
- any `Element` is used as is (clone it where it is reused, as select.ts:758 does).

It replaces menu.ts:1152-1155, 1208-1211, 1265-1268 and 1403-1406, notifications.ts:582-583, select.ts:756-761, and segmented.ts:203, 428-433, 489. This fixes A10.

**M4. Option-list strings.** Three parsers become one `parseOptionList(str)` in caption-icon.ts:
- select.ts:408-424 (empty entry becomes a `null` separator);
- segmented.ts:195-206 (filters empty entries and resolves icons eagerly);
- tag-list.ts:187-191 plus :330-332 (`\,` escaping).

The union keeps `\,` escaping, `null` separators (segmented filters them out), `value=caption:icon` via `splitCaptionIcon`, and the icon kept as a **name**. Today a caption containing a comma is possible in tag-list but impossible in select and segmented. This is not a router: it is one grammar, and each caller filters its own result.

**M5. Popup surface style.** One exported style fragment replaces three copies:
- menu.ts:985-999;
- search-field.ts:347-360 (identical);
- live-example/component.ts:902-912, which lacks `chainSurface`, `chainSurfaceFilter`, `chainElevation` and `tosiRadius`, so a theme's surface and elevation never reach REPL completions. That copy is in another area; read.

**M6. Listbox in a float.** One controller serves both copies:
- search-field.ts:569-611 and 723-780: open, close, active index, `aria-activedescendant`, ArrowUp/Down/Enter/Escape, float-removal watcher;
- live-example/component.ts:1519-1555 and 1752-1845: the same, plus Tab-to-insert, minus the watcher.

The union is search-field's ARIA handling and watcher plus live-example's Tab. `<tosi-select>` could adopt it later to gain arrow-key navigation (#1446, #3968).

**M7. Float closed hook.** `TosiFloat.disconnectedCallback` dispatches `close` (or calls an `onClose`). menu.ts (`poppedMenus` and `onClose`), search-field.ts:740-744 (delete the MutationObserver) and live-example then all use it. This fixes A4.

**M8. Document shortcut listener.** One `listenForShortcuts(host, getItems)` replaces:
- `TosiMenu.handleShortcut` (menu.ts:1837-1854) with its add and remove at 1938/1949;
- `TosiSelect.handleShortcut` (select.ts:691-704) with its add and remove at 708/725.

It keeps select's `disabled` check and menu's animation. It should also return early when no item has a `shortcut`, cached when the items are set (A6), and include the A5 fixes.

**M9. Accessible name.** One helper reads `aria-label`, then `title`, then `data-tooltip`, then `<label>`s, then a fallback. It replaces menu.ts:1831-1834 and select.ts:563-587, fixes A25, and gives `<tosi-menu>` label support.

**M10. Chip colours.** One `applyTagColors(chip, tag)` in tag-colors.ts replaces the identical five lines at tag-list.ts:539-543 and search-field.ts:815-819.

**M11. Resolved position.** tooltip.ts:185-190 works out the quadrant again, by a different rule from positionFloat's `auto` (pop-float.ts:351-354): it uses the top edge instead of the centre, and `>` instead of `<`. Have `positionFloat` return the FloatPosition it resolved, and let tooltip use that for its arrow class.

**M12. z-index.** `popFloat` calls `bringToFront` twice: in `positionFloat` before the float is appended (pop-float.ts:341) and again in `connectedCallback` (float.ts:179). ✔ `z-scan.ts` on a page of 2,008 elements:
- `popMenu`: 4,003 `getComputedStyle` calls;
- `postNotification`: 2,002;
- `showModal`: 2,010.

`refitFloats` (pop-float.ts:448) repeats the scan for every open float on every `visualViewport` resize or scroll event. Keep the `connectedCallback` call and skip the scan on refit.

**M13. Form value.** form.ts:427-445 (`getInputValue`) and TosiField's own type switch (form.ts:544-561) compute the same thing. Make `handleChange` write `this.value` after applying `fixedPrecision`. Keep getInputValue's radio and empty-array cases.

**M14. trackDrag end.** The callback gets a `done` flag, and `trackDrag` removes the TRACKER on mouseup itself. Callers: float, editable-rect ×4, sizer, data-table (which then drops its own touch-id tracking). This fixes A32.

### Declarations written twice

- **Notification types, three times:** the `NotificationSpec.type` union (notifications.ts:191), `COLOR_MAP` (199-206) and `SEVERITY` (220-227). Replace them with one table and derive the type from it.
- **Menu selectors:** every rule in `menuHelperStyleSpec` names both `.xin-*` and `.tosi-*` (menu.ts:1046-1115, about 30 rules), and every row adds both classes. This halves when the xin classes go (C).
- **Interfaces hand-copied into docs that have drifted:**
  - `PopMenuOptions` (menu.ts:220-233) lacks `onClose`, `role` and `disclosureDelay`;
  - `SubMenu` (268-275) lacks `checked`;
  - `MenuAction` (253-262) shows `action` as required;
  - `positionFloat` (pop-float.ts:106-113) shows default values the code does not have;
  - `NotificationSpec` (notifications.ts:28-36) types `icon` as `SVGElement | string` (#3948).
- **Internal options on a public type:** `PopMenuOptions` carries `_dropMode`, `_dataTypes` and `submenuDepth` (menu.ts:1547, 1575-1576). Split them into an internal type; `PopDropMenuOptions` already `Omit`s two of them.

### Teardown and caches

- A13: rich-text's `selectionchange` listener (✔).
- A26: `initTooltips` listeners, with no guard and no teardown.
- A33: the drag observer after an external drag leaves the window.
- select.ts:716-729: whether to use `XinLocalized.allInstances` is decided by `localized` at connect and again at disconnect. Turning `localized` on or off while connected strands the element in the set (read).
- select.ts:233 and :717 use the deprecated alias `XinLocalized`; they should use `TosiLocalized`.
- notifications.ts:554 re-appends the singleton on every post, which disconnects and reconnects it each time. Harmless today.
- Checked and fine: TosiMenu removes its shortcut listener with capture (1949, tested); `TosiFloat.floats`; search-field's watcher; the notifications progress interval.

### Structure (one file per change, no behaviour change)

1. Move `cleanSeparators`, `filterForDrop` and `filterForClick` (menu.ts:874-982, which are pure) into `menu-filter.ts`.
2. Move `findShortcutAction` together with M8's listener into `match-shortcut.ts`.
3. Put M4's parser in `caption-icon.ts`.
4. Put M10's helper in `tag-colors.ts`.

### Tests and build

**No unit tests at all:** tooltip, float, tag, segmented, rating, password-strength, rich-text, track-drag, drag-and-drop, editable-rect.

**Line coverage (✔ `bun test --coverage …`):**

| module | lines covered |
|---|---|
| drag-and-drop | 8% |
| tag | 25% |
| rating | 40% |
| menu | 49% |
| dialog | 56% |
| select | 57% |

Every ✔ script above is a ready-made regression test.

**Tests the merges need:**
- M1: reset and disable through the base class for each component (form-callbacks.ts is the template).
- M2: submenu `role`, `aria-haspopup` and checked class.
- M3: string, SVG and composite icons in menu, notifications, select and segmented.
- M7: select `aria-expanded` after the float removes itself (float-self-removal.ts).
- M8: a keydown with no `key`, `code`-based matching, and laziness.
- M14: mouse and touch end.

**Harness:** form.test.ts repeats `await new Promise(r => setTimeout(r, 10))` 13 times; one `tick()` helper would do.

### Docs (no API change)

**Examples that break.** None throws on load.
- drag-and-drop.ts:106: `href="javascript: alert('I don't do anything)"` is a syntax error when clicked.
- drag-and-drop.ts:140: `data-event="drop:_component_.drop"` is from b8r and does nothing, so "special drop handling" is false.
- drag-and-drop.ts:292: stray `)`.
- float.ts:68-72: CSS rule left unclosed.
- notifications.ts:69: `startTime` is assigned without a declaration, so it becomes an implicit global.

**Advice that is wrong today:**
- float.ts:82: says floats "hide" on resize; the default is `remove` (104).
- rating.ts:47: says `step` defaults to 0.5; it is 1 (104).
- password-strength.ts:93-96: the attributes are `min-length`/`good-length`; `descriptionColors` is a property, not an attribute; the `indicatorColors` default is `…#0a2`, not `#0d4`.
- password-strength.ts:100: "`strength` is a number"; it is a method (267).
- rich-text.ts:68-71: `commandButton` takes an `IconElement`, not an `iconClass` string (198), and `spacer`/`elastic` are layout.ts's.
- tag-list.ts:106: "`tags` … read-only"; it has a setter (310), which its own test uses (82).
- menu.ts:367: teaches `xin-menu tosi-menu`.
- tooltip.ts:9: "parsed as markdown" should warn that this means HTML (until A1 is fixed).

**Teaching order:** select.ts:16-17 and :198, rating.ts:8, and form.ts:267 and :367 teach `const { … } = tosijsui`. That global exists only inside the doc runner. Every other page teaches `import { … } from 'tosijs-ui'`. Also, notifications.ts:25 teaches both `TosiNotification.post()` and `postNotification()`.

---

## C. Phase 2 (one way to do each thing)

### Redundant public spellings

Consumer counts come from `grep-consumers.sh`, a word-grep of the 25 repos that skips node_modules, dist, docs and dot-directories (✔).

| task | redundant spelling | same as | consumer uses | notes |
|---|---|---|---|---|
| create element | `xinMenu`, `xinFloat`, `xinNotification`, `xinField`, `xinForm`, `xinPasswordStrength` | `tosi*` | 0 | Plain aliases (`=`), proven by the source line. They never warn. |
| create element | `xinSelect`, `xinTagList`, `xinTag`, `xinRating`, `xinSegmented`, `richText` | `tosi*` | 0 | Wrapped in tosijs `deprecated()`, which warns once and names the replacement (tosijs metadata.ts:198-210). |
| class | `XinMenu`, `XinFloat`, `XinNotification`, `XinSelect`, `XinTagList`, `XinTag`, `XinField`, `XinForm`, `XinRating`, `XinSegmented`, `XinPasswordStrength`, `XinWord` | `Tosi*` / `RichText` | 0 | `src/deprecated-aliases.test.ts` asserts that these exist and must be updated with them. |
| style a menu | `.xin-menu`, `-item`, `-item-checked`, `-separator`, `-element`, `-shortcut`, `-trigger`, `-with-icons`, `-item-highlight`, `.xin-drop-over` | `.tosi-*` | **kith-email/index.html:107-113 (3 rules; would break)**; tosijs-virta/src/virta.ts:1032 (lists `.tosi-menu` too, so safe) | menu.ts:984 says "remove in next major", but there is no major, so the minor is the place. Move menu.ts:1860 off `.xin-menu-item` first. The 1.20 notes need a CSS migration line. |
| theme a select | CSS vars `--gap`, `--touch-size`, `--padding`, `--value-padding`, `--icon-width`, `--fieldWidth` (select.ts:309-315) | `--tosi-select-*` | 0 (`fieldWidth`: 0) | The select **defines** these and **reads none of them**, so they give no compatibility at all. They are not marked `@deprecated`. |
| match a shortcut | `keystroke(evt)` / `keycode` / `canonicalShortcut` / `parseShortcut` | `matchShortcut` | 0 | **Not the same.** ✔ `keystroke(⌘K) = "meta-K"`, `canonicalShortcut("⌘K") = "meta-k"`, so comparing them never works. That makes them a second, broken vocabulary. Palette's `matchesShortcut('mod+k')` (palette.ts:207) is a second grammar with abilities this one lacks (`mod`, rejecting unknown modifiers, the missing-key guard), and match-shortcut has ones palette lacks (symbol forms). Proposal: one grammar that accepts both, matching on `code` (A5). |
| show a shortcut | `modifierKeys` (match-shortcut.ts:14) | `displayShortcut` | 0 | Nothing uses it. Palette's `describeShortcut` is a second display format ("Ctrl Shift K" against "Ctrl+Shift+K" off the Mac). |
| post a notification | `TosiNotification.post` | `postNotification` (notifications.ts:659-661 calls it) | `postNotification`: 5 repos, 10 uses; `TosiNotification.*`: 0 | Keep `post` as the implementation and teach only `postNotification`. |
| read options | `TosiSelect.selectOptions` (select.ts:450) | `options` | 0 | |

**Naming gaps (missing, not redundant).** These need the owner's decision. `RichText` has no `TosiRichText`. `EditableRect`/`editableRect` with the tag `<tosi-editable>` has no Tosi* names. CLAUDE.md says every component uses Tosi* names. Fixing that would *add* spellings before any can be removed.

### `@deprecated` inventory in scope

**Still needed?** Every xin* and Xin* alias in scope has 0 consumer files (✔ grep). The xin-menu classes have one consumer (kith-email).

**Warns once, naming the replacement?** Only the six `deprecated()`-wrapped creators. The other creator aliases and all class aliases are silent. A class alias that is a type cannot warn.

**Docs teach only the survivor?** Yes, except menu.ts:367 and the stylesheet id `xin-menu-helper` (menu.ts:1128).

**What the inventory misses:**
- the select CSS-variable aliases (above);
- rich-text's internal `_xinIconSize` (A15);
- select's use of the `XinLocalized` alias;
- the `xin-menu-helper` id;
- `XinLocalized` itself belongs to the localize area.

### #4336: what it means in scope

- **`<tosi-rich-text>`** (on the card): A12, A14 and A13 are the fixes.
- **`<tosi-search-field>` is missing from the card.**
  - It has its own `get value()`/`set value()` (search-field.ts:516-524) and no `_value`.
  - Under 7785c43c, `value="text"` now reaches the setter. `query?.tags` and `query?.text` on a string give an empty query, so the attribute is silently dropped. It was also silently dropped before.
  - Suggestion: the setter should read a string as `{ tags: [], text }`. This is card ask 3 ("what a string means").
- **Also missing from the card (other areas; grep `set value(`):** code-editor.ts:185, palette.ts:633, splitter.ts:328.
- **Unaffected in scope:** select, tag-list, segmented, rating, password-strength, TosiField and TosiForm keep plain `value` fields, which go through the base class's `initValue()`.
- **Re-attach:** the change that stops resetting `value` on every re-attach has no effect in scope, because nothing here reads `_value` after first connect.

---

## D. Not proposing

**Different jobs:**
- `popMenu`, `<tosi-menu>` and `popDropMenu`: an imperative pop; a persistent trigger with shortcuts and drag-enter; drag mode. menu.ts:424-438 gives the rationale.
- `popFloat` and `positionFloat`: create, versus position an existing element (pocket-bar positions its non-float bar this way).
- `<tosi-float>` in markup and `popFloat` in code.
- `TosiDialog.alert`/`confirm`/`prompt` and `tosiDialog`.
- tag-list's `value` (a string) and `tags` (an array).
- `TosiForm.fields` (a write-through proxy that emits change) and `value`.

**Not worth a break by itself:**
- tosi-field's `key` against form-associated `name` (both read by form.ts:790); they apply to different element families.
- `options`, `choices` and `availableTags` for the same idea in select, segmented and tag-list.

**Settled (CLAUDE.md):**
- Global listeners installed lazily with no teardown (`ensureMenu`, `ensureFloatListeners`, `ensureTooltipStyles`): "inject on first use" under Subpath Exports.
- Function props default to `null` (`dropAction`, `textTest`, arrow `dialogWillClose`/`removeCallback`): compliant.
- trackDrag's TRACKER element created at import: every component module already needs a DOM at import.

**Other:**
- A positioning or clamping "merge": there is only one geometry. Fitting to the viewport is #3970's feature.
- `findHighestZ`/`bringToFront` stay exported. tosijs-3d's `bringToFront` is its own function, not this one.
- reduced-motion.ts is already internal and outside the barrel.

---

## E. Unused, but not redundant

Only the items that need a decision:

- **`refitFloats` and `roomOnScreen`** (pop-float.ts:443, :481) are marked "@internal … not supported API", yet `export *` puts them in the **root barrel** (exports-before.json). Decide whether to drop them from root at 1.20.
- **Public surface that does nothing:**
  - `TosiForm.context` (form.ts:648), never read anywhere;
  - segmented's `direction` attribute (segmented.ts:168), never read (the CSS uses `--segmented-direction`);
  - EditableRect's `rotationSnap`/`positionSnap` (editable-rect.ts:91-92), never read (the snapping uses statics).
- **Menu internals in the root barrel:** `menu`, `createMenuAction`, `createMenuItem`, `createSubMenu`, `createDropMenuItem`, `resolveMenuItems`, `filterForDrop`, `filterForClick`, `findShortcutAction`. All have 0 consumers (✔). They become internal after M2.
- **Missing rather than unused:** `dragAndDrop.end()`. tosijs-virta fakes a `dragend` to get the same effect (A33).

---

## F. Numbers

**Size.** 21 files, 10,253 lines (`wc -l`). ✔ `count-lines.ts` classifies them:

| kind | lines |
|---|---|
| code | ~5,628 |
| doc (`/*#`, `/*{`) | ~3,519 (34%) |
| comment | ~512 |
| blank | ~615 |

**Largest files:**

| file | lines | code | doc |
|---|---|---|---|
| menu.ts | 1,960 | 1,007 | 795 |
| search-field.ts | 827 | | |
| form.ts | 821 | | |
| select.ts | 781 | | |
| notifications.ts | 661 | | |

**Ways to pop a floating element:** 5 public entry points (`popFloat`, `positionFloat`, `popMenu`, `popDropMenu`, `<tosi-float>`). Inside the scope, 5 components pop one: tooltip, search-field, tag-list, select, and `<tosi-menu>` (by click, Space, drag-enter, or shortcut animation).

**Shortcuts:**
- 2 grammars: `⌘K`/`meta-k` and `mod+k`;
- 2 display formats, plus one unused symbol table;
- matching on `key` only; a code-based helper exists and nothing uses it.

**Icon arguments:** 4 different rules across 7 sites (A10).

**Document-level keydown listeners:** one per `<tosi-menu>` and one per `<tosi-select>` (each walks its whole tree on every key), one Escape listener for menus, and one more for every `initTooltips()` call.

**Form-associated components in scope:** 5. Of their 10 form-callback overrides, 7 match the base class (✔).

**Copies:**
- option-list string parsers: 3;
- popup surface styles: 3 (one in another area);
- listbox-in-a-float controllers: 2;
- menu-row builders: 4.

**Cost of one popup** (✔, a page of 2,008 elements):

| action | `getComputedStyle` calls |
|---|---|
| open a menu | 4,003 |
| post a notification | 2,002 |
| `showModal` | 2,010 |

**Consumer reach in scope:** `postNotification` 5 repos, `TosiDialog` 4, `popMenu` 4, `tosiSelect` 3, `tosiSegmented` 3, `tosiFloat` 2. Every other name in scope is used by at most one repo. Every xin* and Xin* alias in scope has 0.
