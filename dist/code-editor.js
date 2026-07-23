/*#
# code

A [CodeMirror 6](https://codemirror.net/) wrapper.

Sometimes, it's nice to be able to just toss a code-editor in a web-page.

`<tosi-code>`'s `value` is the code it contains. Its `mode` attribute sets the
language (`javascript`, `typescript`, `tjs`, `css`, `html`, `markdown`).

```html
<tosi-code style="width: 100%; height: 100%" mode="css">
body {
  box-sizing: border-box;
}
</tosi-code>
```

## Properties & events

| member | what it does |
| --- | --- |
| `value` | the code in the editor (get/set) |
| `mode` | `javascript`, `typescript`, `tjs`, `ajs`, `css`, `html`, `markdown` |
| `disabled` | makes the editor read-only |
| `original` + `showDiff(on)` | diff the current `value` against a baseline, as an overlay |
| `editor` | the underlying CodeMirror [`EditorView`](https://codemirror.net/docs/ref/#view.EditorView) (`undefined` until loaded) |
| `undo()` / `redo()` / `canUndo()` / `canRedo()` | history control |
| `tjsAutocomplete` | runtime-value autocomplete hooks (tjs mode) — see below |
| `change` event | fires when the text changes; `event.detail.value` is the new text |

In `tjs`/`ajs` mode the editor loads tjs-lang's CodeMirror language and completion
source (if `tjs-lang` is installed — it's an optional peer). Set `tjsAutocomplete`
to a `TjsAutocompleteConfig` and completion will suggest the **real members of live
runtime values** — including proxy members no static analysis can see:

```typescript
codeEl.tjsAutocomplete = { getLiveBindings: () => ({ app, elements }) }
```

## Bundling

CodeMirror is a **lazy chunk**: with a bundler (ESM), a page that never uses
`<tosi-code>` doesn't load it. **This is not true of the IIFE** (`dist/iife.js`) —
bun's IIFE format cannot code-split, so CodeMirror is inlined there. That is a
deliberate trade: the doc-system's editor (and its save-to-source flow) is the
point of the IIFE, so it carries the editor. It costs ~376KB gzipped, up from
~118KB in 1.6.x.

## Migrating from the ACE editor (pre-1.7)

1.7 replaced ACE with CodeMirror 6. `value`, `original`/`showDiff()`, `mode` and
`disabled` are unchanged. Removed (each warns once, then no-ops):

| removed | replacement |
| --- | --- |
| `theme` | style with `--code-bg` / `--text-color` |
| `options` (ACE-shaped) | configure via `editor` (an `EditorView`) |
| `ace` | there is no ACE global; use `editor` |
| `editor.session.getUndoManager()` | `undo()` / `redo()` / `canUndo()` / `canRedo()` |

`editor` **changed type in place** — it was an ACE `Editor`, it is now a CodeMirror
`EditorView`. Code that reached into it needs revisiting; a grep for removed names
won't catch this one.
*/
/*{ "parent": "Components" }*/
import { Component as WebComponent, elements, varDefault, } from 'tosijs';
import { tosiDiff } from './diff';
const { div } = elements;
// Warn once per removed member, not once per access — a live-example page holds
// dozens of editors and a render-loop read would otherwise flood the console.
const warned = new Set();
const warnRemoved = (member, advice) => {
    if (warned.has(member))
        return;
    warned.add(member);
    console.warn(`<tosi-code>.${member} was removed in tosijs-ui 1.7 (the editor is now CodeMirror 6, not ACE) — ${advice}. See CHANGELOG 1.7.0.`);
};
// One warning per page, not per element — see the `editor` getter.
let warnedEditor = false;
let warnedTjs = false;
export class CodeEditor extends WebComponent {
    static preferredTagName = 'tosi-code';
    source = '';
    _handle;
    _loadPromise;
    // Bumped on every connect. The lazy chunk resolves asynchronously, so by the time it
    // does, this element may have been removed — or removed and re-added, starting a newer
    // load. Mounting a stale load would build an EditorView nothing ever destroys.
    _loadGeneration = 0;
    _appliedMode = '';
    _appliedDisabled;
    _tjsAutocomplete;
    /**
     * Runtime-introspection hooks for tjs autocomplete (`getLiveBindings` /
     * `getMembers`) — lets completion suggest the REAL members of live values (e.g.
     * a tosijs proxy or a DOM element) that static analysis can't see. Only used in
     * tjs mode; setting it re-applies the tjs extension so it takes effect live.
     */
    get tjsAutocomplete() {
        return this._tjsAutocomplete;
    }
    set tjsAutocomplete(config) {
        this._tjsAutocomplete = config;
        if (this._handle && this.isTjsMode())
            this.applyTjsExtension();
    }
    get value() {
        return this._handle ? this._handle.getValue() : this.source;
    }
    set value(text) {
        if (this._handle) {
            this._handle.setValue(text);
        }
        else {
            this.source = text;
        }
    }
    // Baseline for `showDiff()` — the version to diff the current `value` against.
    // Defaults to the current value (no diff) until a caller sets it.
    _original;
    get original() {
        return this._original ?? this.value;
    }
    set original(text) {
        this._original = text;
    }
    // Diff overlay — built only on the editor's public surface (`value` + `original`)
    // and the tosi-diff component, never the underlying editor's API, so it stays
    // editor-agnostic.
    //
    // It lives in the SHADOW root (the `diffHost` part), not the light DOM. Under the
    // old Ace editor this component had no `content`, so tosijs's default `slot()`
    // filled the shadow root and Ace mounted into the light DOM — a light-DOM overlay
    // projected through that slot. CodeMirror mounts into `[part=host]` inside the
    // shadow root, and this component now declares its own `content`, so there is no
    // slot: `this.append(overlay)` would put it in the light DOM where nothing renders
    // it. (Re-adding a slot is NOT the fix — it would also project the element's
    // textContent, i.e. the initial code, and double-render it under the editor.)
    diffOverlay;
    // Hydration state comes from the base class (`this.hydrated`), as of tosijs 1.6.9.
    // This used to be a hand-rolled `_partsHydrated` flag — because before 1.6.9 the
    // `parts` proxy poisoned itself on any pre-hydration read (touching it once rooted
    // the proxy at the light-DOM element forever, so the editor never mounted), and
    // there was no public way to ask "am I hydrated yet?" without triggering exactly
    // that. 1.6.9 fixed both — it invalidates the cached proxy at hydrate AND exposes
    // `hydrated`/`whenHydrated` — so the flag is gone. (tonioloewald/tosijs#13.)
    // A showDiff() call made before hydration, replayed once we're ready. Still needed:
    // `parts` genuinely doesn't exist before hydration (content is injected at connect),
    // so work that touches it is legitimately deferred — that is not the poisoning bug.
    _pendingDiff;
    get showingDiff() {
        if (!this.hydrated)
            return this._pendingDiff ?? false;
        return !this.parts.diffHost.hidden;
    }
    showDiff(on) {
        if (!this.hydrated) {
            this._pendingDiff = on;
            return;
        }
        const { diffHost } = this.parts;
        if (on) {
            if (this.diffOverlay === undefined) {
                this.diffOverlay = tosiDiff();
                diffHost.append(this.diffOverlay);
            }
            this.diffOverlay.original = this.original;
            this.diffOverlay.modified = this.value;
        }
        diffHost.hidden = !on;
    }
    static initAttributes = {
        mode: 'javascript',
        disabled: false,
    };
    role = 'code editor';
    /**
     * The underlying CodeMirror `EditorView` (undefined until loaded).
     *
     * **Changed in 1.7 (ACE → CodeMirror 6).** In 1.6 this was an ACE editor, and
     * `editor.session.getUndoManager()` was documented public API. `^1.6.x` resolves
     * 1.7.0, so an app that never changed a line auto-upgrades into a `TypeError` on the
     * next install — and this is the ONE break the warn-once shims below cannot catch,
     * because the property still exists and still returns an object; it is simply a
     * different object. TS consumers get a compile error (1.6 typed this `any`); vanilla
     * JS and CDN consumers — the audience this component's own docs court — would get the
     * bare TypeError with no explanation at all.
     *
     * So: one neutral note on first access. `editor` is NOT deprecated — it is the
     * supported CM6 accessor — so this is `console.info` (not `warn`) and leads with that,
     * to help a 1.6→1.7 migrator without scolding correct CM6 use. Use
     * `undo()`/`redo()`/`canUndo()`/`canRedo()` for history — they survived the migration.
     */
    get editor() {
        if (!warnedEditor) {
            warnedEditor = true;
            console.info('<tosi-code>.editor is the CodeMirror 6 EditorView (the supported accessor; it ' +
                'was an ACE editor in 1.6). ACE-era `editor.session` / `getSession()` / ' +
                '`setOption()` are gone — use undo()/redo()/canUndo()/canRedo() for history.');
        }
        return this._handle?.view;
    }
    // ── Removed in 1.7 (ACE → CodeMirror 6) ────────────────────────────────────
    // `^1.6.x` resolves 1.7.0, so existing consumers auto-upgrade into this. Left as
    // warn-once no-ops rather than simply deleted, so `theme`/`options`/`ace` fail
    // with an actionable message instead of silently doing nothing (or, for `ace`,
    // a bare `TypeError` on undefined). See CHANGELOG 1.7.0 → Breaking.
    /** @deprecated Removed in 1.7 — CodeMirror themes via `--code-bg`/`--text-color`. */
    get theme() {
        warnRemoved('theme', 'style the editor with --code-bg / --text-color instead');
        return '';
    }
    set theme(_) {
        warnRemoved('theme', 'style the editor with --code-bg / --text-color instead');
    }
    /** @deprecated Removed in 1.7 — ACE-shaped options have no CodeMirror equivalent. */
    get options() {
        warnRemoved('options', 'configure CodeMirror via the `editor` (EditorView) instead');
        return {};
    }
    set options(_) {
        warnRemoved('options', 'configure CodeMirror via the `editor` (EditorView) instead');
    }
    /** @deprecated Removed in 1.7 — there is no ACE global; use `editor` (an EditorView). */
    get ace() {
        warnRemoved('ace', 'use `editor`, which is now a CodeMirror EditorView');
        return undefined;
    }
    // History control — so consumers use these instead of reaching into `editor`.
    undo() {
        this._handle?.undo();
    }
    redo() {
        this._handle?.redo();
    }
    canUndo() {
        return this._handle?.canUndo() ?? false;
    }
    canRedo() {
        return this._handle?.canRedo() ?? false;
    }
    // `diffHost` starts hidden — an always-present absolutely-positioned overlay would
    // otherwise sit on top of the editor and swallow every click.
    content = () => [
        div({ part: 'host' }),
        div({ part: 'diffHost', hidden: true }),
    ];
    static shadowStyleSpec = {
        ':host': {
            display: 'block',
            position: 'relative',
            width: '100%',
            height: '100%',
        },
        '[part="host"]': { height: '100%' },
        '[part="diffHost"]': {
            position: 'absolute',
            inset: '0',
            zIndex: '5',
            overflow: 'auto',
            background: varDefault.tosiDiffBg(varDefault.background('#fff')),
        },
        '.cm-editor': { height: '100%' },
        '.cm-scroller': {
            outline: 'none',
            fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
        },
    };
    handleResize() {
        this._handle?.refresh();
    }
    connectedCallback() {
        super.connectedCallback();
        // super.connectedCallback() hydrated us, so `this.hydrated` is now true and
        // `this.parts` is safe from here on.
        if (this.source === '') {
            this.value = this.textContent !== null ? this.textContent.trim() : '';
        }
        // Replay a showDiff() that arrived before we were hydrated.
        if (this._pendingDiff !== undefined) {
            const pending = this._pendingDiff;
            this._pendingDiff = undefined;
            this.showDiff(pending);
        }
        if (this._loadPromise === undefined) {
            // Lazy chunk — CodeMirror only enters the bundle here, on first editor use.
            const generation = ++this._loadGeneration;
            this._loadPromise = import('./code-editor-cm').then(({ createCmEditor }) => {
                // The chunk fetch is async, and the pre-load window is WIDE on a cold fetch —
                // doc-browser navigation and closeEditor() both remove editors mid-flight. If we
                // mounted regardless:
                //   append → remove          → an EditorView built into a detached shadow root,
                //                              with no disconnectedCallback left to destroy it.
                //   append → remove → append → TWO views in the host; `_handle` points only at
                //                              the second, so the first (and its darkmode
                //                              listener) is retained forever.
                // That is precisely the leak disconnectedCallback exists to prevent, relocated
                // into the load window. Bail if a newer connect superseded us, or we're detached.
                if (generation !== this._loadGeneration || !this.isConnected)
                    return undefined;
                const handle = createCmEditor(this.parts.host, {
                    value: this.source,
                    mode: this.mode,
                    readOnly: this.disabled,
                    root: this.shadowRoot ?? undefined,
                    onChange: (value) => this.dispatchEvent(new CustomEvent('change', { detail: { value } })),
                });
                this._handle = handle;
                this._appliedMode = this.mode;
                this._appliedDisabled = this.disabled;
                this.applyTjsExtension();
                return handle;
            });
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        // Without this, `CmHandle.destroy()` has no call sites: the EditorView (and its
        // darkmode listener) outlive the element, so every doc-page navigation leaked all
        // ~20 editors on the page.
        if (this._handle) {
            // Preserve the live text first — `value` falls back to `source` once the handle
            // is gone, and `source` would otherwise hold a stale pre-edit value.
            this.source = this._handle.getValue();
            this._handle.destroy();
            this._handle = undefined;
        }
        // Re-connecting rebuilds the editor (a destroyed view can't be reused).
        this._loadPromise = undefined;
        this._appliedMode = '';
        this._appliedDisabled = undefined;
        // NB: do NOT clear `diffOverlay` — hydrate() runs once, so the shadow DOM (and the
        // overlay inside `diffHost`) survives disconnect. Clearing it would append a second
        // overlay on reconnect.
    }
    isTjsMode() {
        return this.mode === 'tjs' || this.mode === 'ajs';
    }
    /**
     * When in tjs mode, lazily upgrade the editor to tjs-lang's CodeMirror language +
     * autocomplete. No-op (keeps TS highlighting) if not tjs, if tjs-lang isn't
     * installed, or if the mode/handle changed before the async load resolved.
     */
    applyTjsExtension() {
        const handle = this._handle;
        if (!handle || !this.isTjsMode())
            return;
        import('./code-editor-cm')
            .then(({ loadTjsExtension }) => loadTjsExtension(this._tjsAutocomplete ?? {}))
            .then((ext) => {
            if (ext && this._handle === handle && this.isTjsMode()) {
                handle.setLanguageExtension(ext);
                this._tjsExtensionApplied = true;
                return;
            }
            // Degrade LOUDLY. `loadTjsExtension` swallows everything and returns null by
            // design, and the guard is `typeof mod.tjsEditorExtension === 'function'` — so
            // an upstream export rename returns null without even throwing, and every tjs
            // editor on the page silently falls back to plain TypeScript highlighting with
            // no autocomplete. Nothing goes red; the feature just quietly isn't there.
            if (!ext && this._handle === handle && this.isTjsMode() && !warnedTjs) {
                warnedTjs = true;
                console.warn(`<tosi-code mode="${this.mode}">: tjs-lang's CodeMirror extension did not load — ` +
                    `falling back to TypeScript highlighting (no tjs autocomplete). Install the ` +
                    `optional peer \`tjs-lang\`, or check that tjs-lang/editors/codemirror still ` +
                    `exports \`tjsEditorExtension\`.`);
            }
        })
            .catch((e) => {
            // The chain had no .catch(), so any throw here was an unhandled rejection.
            if (!warnedTjs) {
                warnedTjs = true;
                console.warn(`<tosi-code>: failed to apply the tjs extension —`, e);
            }
        });
    }
    /** True once tjs-lang's CM language+autocomplete is actually live (test seam). */
    get tjsExtensionApplied() {
        return this._tjsExtensionApplied;
    }
    _tjsExtensionApplied = false;
    render() {
        super.render();
        if (this._handle) {
            if (this.disabled !== this._appliedDisabled) {
                this._handle.setReadOnly(this.disabled);
                this._appliedDisabled = this.disabled;
            }
            if (this.mode !== this._appliedMode) {
                this._handle.setMode(this.mode);
                this._appliedMode = this.mode;
                this.applyTjsExtension();
            }
        }
    }
}
export const codeEditor = CodeEditor.elementCreator();
