/*#
# rich text

`<tosi-rich-text>` is a simple and easily extensible `document.execCommand` WYSIWYG editor with some conveniences.
The class name is `RichText` and the ElementCreator is `tosiRichText`.

### `default` widgets

```html
<tosi-rich-text>
<h3>Heading</h3>
<p>And some <b>text</b></p>
</tosi-rich-text>
```
```css
tosi-rich-text {
  background: white;
}

tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}

tosi-rich-text [part="doc"] {
  padding: 20px;
}
```

### `minimal` widgets

```html
<tosi-rich-text widgets="minimal">
<h3>Heading</h3>
<p>And some <b>text</b></p>
</tosi-rich-text>
```
```css
tosi-rich-text {
  background: white;
}

tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}

tosi-rich-text [part="doc"] {
  padding: 20px;
}
```

By default, `<tosi-rich-text>` treats its initial contents as its document, but you can also set (and get)
its `value`.

## toolbar

`<tosi-rich-text>` elements have a `toolbar` slot (actually a xin-slot because it doesn't use
the shadowDOM).

If you set the `widgets` attribute to `default` or `minimal` you will get a toolbar
for free. Or you can add your own custom widgets.

## helper functions

A number of helper functions are available, including:

- `commandButton(title: string, command: string, iconClass: string)`
- `blockStyle(options: Array<{caption: string, tagType: string}>)`
- `spacer(width = '10px')`
- `elastic(width = '10px')`

These each create a toolbar widget. A `blockStyle`-generated `<select>` element will
automatically have its value changed based on the current selection.

## properties

A `<tosi-rich-text>` element also has `selectedText` and `selectedBlocks` properties, allowing
you to easily perform operations on text selections, and a `selectionChange` callback (which
simply passes through document `selectionchange` events, but also passes a reference to
the `<tosi-rich-text>` component).

## Form Integration

`<tosi-rich-text>` is form-associated, making it work directly in native forms:

```html
<form class="richtext-form">
  <label>
    <b>Compose message (required):</b>
    <tosi-rich-text name="content" widgets="minimal" required style="height: 150px">
    </tosi-rich-text>
  </label>
  <button type="submit">Submit</button>
  <button type="reset">Reset</button>
  <pre class="output" style="max-height: 100px; overflow: auto"></pre>
</form>
```
```css
.preview .richtext-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview .richtext-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.preview tosi-rich-text {
  background: white;
}
.preview tosi-rich-text [part="toolbar"] {
  background: #f8f8f8;
}
```
```js
const form = preview.querySelector('.richtext-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Content: ' + data.get('content')
})
```
*/
import { Component as WebComponent, elements, deprecated, } from 'tosijs';
import { icons } from './icons';
import { tosiSelect, TosiSelect } from './select';
const { xinSlot, div, button, span } = elements;
const blockStyles = [
    {
        caption: 'Title',
        tagType: 'H1',
    },
    {
        caption: 'Heading',
        tagType: 'H2',
    },
    {
        caption: 'Subheading',
        tagType: 'H3',
    },
    {
        caption: 'Minor heading',
        tagType: 'H4',
    },
    {
        caption: 'Body',
        tagType: 'P',
    },
    {
        caption: 'Code Block',
        tagType: 'PRE',
    },
];
export function blockStyle(options = blockStyles) {
    return tosiSelect({
        title: 'paragraph style',
        slot: 'toolbar',
        class: 'block-style',
        options: options.map(({ caption, tagType }) => ({
            caption,
            value: `formatBlock,${tagType}`,
        })),
    });
}
export function spacer(width = '10px') {
    return span({
        slot: 'toolbar',
        style: { flex: `0 0 ${width}`, content: ' ' },
    });
}
export function elastic(width = '10px') {
    return span({
        slot: 'toolbar',
        style: { flex: `0 0 ${width}`, content: ' ' },
    });
}
export function commandButton(title, dataCommand, icon) {
    return button({ slot: 'toolbar', dataCommand, title }, icon);
}
const paragraphStyleWidgets = () => [
    commandButton('left-justify', 'justifyLeft', icons.alignLeft()),
    commandButton('center', 'justifyCenter', icons.alignCenter()),
    commandButton('right-justify', 'justifyRight', icons.alignRight()),
    spacer(),
    commandButton('bullet list', 'insertUnorderedList', icons.listBullet()),
    commandButton('numbered list', 'insertOrderedList', icons.listNumber()),
    spacer(),
    commandButton('indent', 'indent', icons.indent()),
    commandButton('indent', 'outdent', icons.outdent()),
];
const characterStyleWidgets = () => [
    commandButton('bold', 'bold', icons.fontBold()),
    commandButton('italic', 'italic', icons.fontItalic()),
    commandButton('underline', 'underline', icons.fontUnderline()),
];
const minimalWidgets = () => [
    blockStyle(),
    spacer(),
    ...characterStyleWidgets(),
];
export const richTextWidgets = () => [
    blockStyle(),
    spacer(),
    ...paragraphStyleWidgets(),
    spacer(),
    ...characterStyleWidgets(),
];
export class RichText extends WebComponent {
    static preferredTagName = 'tosi-rich-text';
    static lightStyleSpec = {
        ':host': {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        },
        ':host [part="toolbar"]': {
            padding: 4,
            display: 'flex',
            gap: '0px',
            flex: '0 0 auto',
            flexWrap: 'wrap',
        },
        ':host [part="toolbar"] > button': {
            _xinIconSize: 18,
        },
    };
    static formAssociated = true;
    static initAttributes = {
        widgets: 'default',
        name: '',
        required: false,
    };
    isInitialized = false;
    savedValue = '';
    // Form lifecycle callbacks
    formDisabledCallback(disabled) {
        if (this.isInitialized) {
            this.parts.doc.contentEditable = disabled ? 'false' : 'true';
        }
    }
    formResetCallback() {
        this.value = '';
    }
    _value = '';
    get value() {
        return this.isInitialized ? this.parts.doc.innerHTML : this._value;
    }
    set value(docHtml) {
        const oldValue = this._value;
        this._value = docHtml;
        if (this.isInitialized) {
            if (this.parts.doc.innerHTML !== docHtml) {
                this.parts.doc.innerHTML = docHtml;
            }
        }
        // Notify tosijs of the change for form value updates
        if (oldValue !== docHtml && this.internals) {
            this.internals.setFormValue(docHtml);
        }
    }
    blockElement(elt) {
        const { doc } = this.parts;
        while (elt.parentElement !== null && elt.parentElement !== doc) {
            elt = elt.parentElement;
        }
        return elt.parentElement === doc ? elt : undefined;
    }
    get selectedBlocks() {
        const { doc } = this.parts;
        const selObject = window.getSelection();
        if (selObject === null) {
            return [];
        }
        const blocks = [];
        for (let i = 0; i < selObject.rangeCount; i++) {
            const range = selObject.getRangeAt(i);
            if (!doc.contains(range.commonAncestorContainer)) {
                continue;
            }
            let block = this.blockElement(range.startContainer);
            const lastBlock = this.blockElement(range.endContainer);
            blocks.push(block);
            while (block !== lastBlock && block !== null) {
                block = block.nextElementSibling;
                blocks.push(block);
            }
        }
        return blocks;
    }
    get selectedText() {
        const selObject = window.getSelection();
        if (selObject === null) {
            return '';
        }
        return this.selectedBlocks.length ? selObject.toString() : '';
    }
    selectionChange = () => {
        /* no not care */
    };
    _updatingBlockStyle = false;
    handleSelectChange = (event) => {
        // Ignore changes triggered by updateBlockStyle
        if (this._updatingBlockStyle) {
            return;
        }
        const target = event.target;
        const select = target?.closest(TosiSelect.tagName);
        if (select == null) {
            return;
        }
        this.doCommand(select.value);
    };
    handleButtonClick = (event) => {
        const target = event.target;
        const button = target?.closest('button');
        if (button == null) {
            return;
        }
        this.doCommand(button.dataset.command);
    };
    content = [
        xinSlot({
            name: 'toolbar',
            part: 'toolbar',
            onClick: this.handleButtonClick,
            onChange: this.handleSelectChange,
        }),
        div({
            part: 'doc',
            contenteditable: true,
            style: {
                flex: '1 1 auto',
                outline: 'none',
            },
        }),
        xinSlot({
            part: 'content',
        }),
    ];
    doCommand(command) {
        if (command === undefined) {
            return;
        }
        const args = command.split(',');
        console.log('execCommand', args[0], false, ...args.slice(1));
        document.execCommand(args[0], false, ...args.slice(1));
    }
    updateBlockStyle() {
        const select = this.parts.toolbar.querySelector('.block-style');
        if (select === null) {
            return;
        }
        let blockTags = this.selectedBlocks.map((block) => block.tagName);
        blockTags = [...new Set(blockTags)];
        this._updatingBlockStyle = true;
        select.value = blockTags.length === 1 ? `formatBlock,${blockTags[0]}` : '';
        this._updatingBlockStyle = false;
    }
    // Check if the editor has meaningful content
    hasContent() {
        const text = this.parts.doc.textContent || '';
        return text.trim().length > 0;
    }
    // Update form value and validity when content changes
    handleInput = () => {
        if (this.internals) {
            this.internals.setFormValue(this.parts.doc.innerHTML);
            this.updateValidity();
        }
    };
    updateValidity() {
        if (this.internals) {
            if (this.required && !this.hasContent()) {
                this.internals.setValidity({ valueMissing: true }, 'Please enter some content', this.parts.doc);
            }
            else {
                this.internals.setValidity({});
            }
        }
    }
    connectedCallback() {
        super.connectedCallback();
        const { doc, content } = this.parts;
        if (content.innerHTML !== '' && doc.innerHTML === '') {
            doc.innerHTML = content.innerHTML;
            content.innerHTML = '';
        }
        this.isInitialized = true;
        content.style.display = 'none';
        // Listen for content changes
        doc.addEventListener('input', this.handleInput);
        // Initialize validity state
        this.updateValidity();
        document.addEventListener('selectionchange', (event) => {
            this.updateBlockStyle();
            this.selectionChange(event, this);
        });
    }
    render() {
        const { toolbar } = this.parts;
        super.render();
        if (toolbar.children.length === 0) {
            switch (this.widgets) {
                case 'minimal':
                    toolbar.append(...minimalWidgets());
                    break;
                case 'default':
                    toolbar.append(...richTextWidgets());
                    break;
            }
        }
    }
}
/** @deprecated Use RichText instead */
export const XinWord = RichText;
export const tosiRichText = RichText.elementCreator();
/** @deprecated Use tosiRichText instead (tag is now <tosi-rich-text>) */
export const richText = deprecated((...args) => tosiRichText(...args), 'richText is deprecated, use tosiRichText instead (tag is now <tosi-rich-text>)');
