/*#
# code

An [ACE Editor](https://ace.c9.io/) wrapper.

Sometimes, it's nice to be able to just toss a code-editor in a web-page.

`<tosi-code>`'s `value` is the code it contains. Its `mode` attribute sets the language, and you can further configure
the ACE editor instance via its `options` property.

```html
<tosi-code style="width: 100%; height: 100%" mode="css">
body {
  box-sizing: border-box;
}
</tosi-code>
```

The `<tosi-code>` element has an `editor` property that gives you its ACE editor instance,
and an `ace` property that returns the `ace` module, giving you complete access to the
[Ace API](https://ace.c9.io/api/index.html).
*/
/*{ "parent": "Components" }*/
import { Component as WebComponent } from 'tosijs';
import { scriptTag } from './via-tag';
import { tosiDiff } from './diff';
const ACE_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.2/';
const DEFAULT_THEME = 'ace/theme/tomorrow';
const getAce = async () => {
    const { ace } = await scriptTag(`${ACE_BASE_URL}ace.min.js`);
    return ace;
};
const makeCodeEditor = async (codeElement, mode = 'html', options = {}, theme = DEFAULT_THEME) => {
    const ace = await getAce();
    ace.config.set('basePath', ACE_BASE_URL);
    const editor = ace.edit(codeElement, {
        mode: `ace/mode/${mode}`,
        tabSize: 2,
        useSoftTabs: true,
        useWorker: false,
        // Wrap wide lines instead of scrolling horizontally; indentedSoftWrap keeps
        // wrapped continuations aligned under the line's indent.
        wrap: true,
        indentedSoftWrap: true,
        ...options,
    });
    editor.setTheme(theme);
    return { ace, editor };
};
export class CodeEditor extends WebComponent {
    static preferredTagName = 'tosi-code';
    source = '';
    get value() {
        return this.editor === undefined ? this.source : this.editor.getValue();
    }
    set value(text) {
        if (this.editor === undefined) {
            this.source = text;
        }
        else {
            this.editor.setValue(text);
            this.editor.clearSelection();
            this.editor.session.getUndoManager().reset();
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
    // Diff overlay — deliberately built only on the editor's public surface
    // (`value` + `original`) and the tosi-diff component, never the underlying
    // editor's API, so it survives a future Ace → CodeMirror swap untouched.
    diffOverlay;
    get showingDiff() {
        return this.diffOverlay !== undefined && !this.diffOverlay.hidden;
    }
    showDiff(on) {
        if (on) {
            if (this.diffOverlay === undefined) {
                this.diffOverlay = tosiDiff({
                    style: {
                        position: 'absolute',
                        inset: '0',
                        zIndex: '5',
                        overflow: 'auto',
                        background: 'var(--tosi-diff-bg, var(--background, #fff))',
                    },
                });
                this.append(this.diffOverlay);
            }
            this.diffOverlay.original = this.original;
            this.diffOverlay.modified = this.value;
            this.diffOverlay.hidden = false;
        }
        else if (this.diffOverlay !== undefined) {
            this.diffOverlay.hidden = true;
        }
    }
    static initAttributes = {
        mode: 'javascript',
        theme: DEFAULT_THEME,
        disabled: false,
    };
    role = 'code editor';
    _ace;
    _editor;
    _editorPromise;
    options = {};
    get ace() {
        return this._ace;
    }
    get editor() {
        return this._editor;
    }
    static shadowStyleSpec = {
        ':host': {
            display: 'block',
            position: 'relative',
            width: '100%',
            height: '100%',
        },
    };
    onResize() {
        if (this.editor !== undefined) {
            this.editor.resize(true);
        }
    }
    connectedCallback() {
        super.connectedCallback();
        if (this.source === '') {
            this.value = this.textContent !== null ? this.textContent.trim() : '';
        }
        if (this._editorPromise === undefined) {
            this._editorPromise = makeCodeEditor(this, this.mode, this.options, this.theme);
            this._editorPromise.then(({ ace, editor }) => {
                this._ace = ace;
                this._editor = editor;
                editor.setValue(this.source, 1);
                editor.clearSelection();
                editor.session.getUndoManager().reset();
            });
        }
    }
    render() {
        super.render();
        if (this._editorPromise !== undefined) {
            this._editorPromise.then(({ editor }) => editor.setReadOnly(this.disabled));
        }
    }
}
export const codeEditor = CodeEditor.elementCreator();
