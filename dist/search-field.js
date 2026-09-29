/*#
# search-field

`<tosi-search-field>` is a search box that suggests **refinements** as you type, in the
spirit of Finder's search field and a search engine's power-search operators. Type `doc`
and it offers *the text "doc"* or *Word documents*; pick one and it becomes a **tag** in the
query, consuming what you typed. You can keep typing, so a query is a list of tags plus
whatever text is left in the field.

What gets suggested is up to you: `hints` is a list of **rules**, each a function from the
typed text (and the tags already chosen) to zero or more hints. Every rule runs on each
keystroke and their hints are listed in rule order.

```js
import { tosiSearchField } from 'tosijs-ui'

const kinds = [
  { caption: 'Word documents', match: 'documents', ext: 'docx', background: '#1565c0' },
  { caption: 'Images', match: 'images pictures photos', ext: 'png', background: '#2e7d32' },
  { caption: 'PDFs', match: 'pdf portable', ext: 'pdf', background: '#c62828' },
]

const field = tosiSearchField({
  placeholder: 'Search files',
  hints: [
    // always offer the text itself
    (text) => ({
      caption: `Name contains “${text}”`,
      tag: { caption: `“${text}”`, kind: 'text', value: text },
    }),
    // offer a kind when the text starts one of its words
    (text) =>
      kinds
        .filter((k) => k.match.split(' ').some((w) => w.startsWith(text.toLowerCase())))
        .map((k) => ({
          caption: `Kind is ${k.caption}`,
          tag: { caption: k.caption, kind: 'type', value: k.ext, background: k.background },
        })),
    // "today" / "yesterday" become a date tag
    (text) =>
      ['today', 'yesterday']
        .filter((d) => d.startsWith(text.toLowerCase()))
        .map((d) => ({
          caption: `Modified ${d}`,
          tag: { caption: `Modified ${d}`, kind: 'date', value: d, background: '#6a1b9a' },
        })),
  ],
})

const output = document.createElement('pre')
const show = () => {
  output.textContent = JSON.stringify(field.value, null, 2)
}
field.addEventListener('change', show)
field.addEventListener('input', show)
field.addEventListener('action', () => {
  output.textContent = 'search! ' + JSON.stringify(field.value)
})
show()
preview.append(field, output)
```
```test
test('typing discloses hints; picking one makes a tag and consumes the text', async () => {
  const field = preview.querySelector('tosi-search-field')
  await field.whenHydrated
  let changes = 0
  field.addEventListener('change', () => (changes += 1))
  field.typeText('doc')
  expect(field.hintCount).toBe(2)
  const input = field.querySelector('input')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(field.value.tags.map((t) => t.value)).toEqual(['docx'])
  expect(field.value.text).toBe('')
  expect(field.hintCount).toBe(0)
  expect(changes).toBe(1)

  field.typeText('tod')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(field.value.tags.map((t) => t.kind)).toEqual(['type', 'date'])

  // Backspace in an empty field removes the last tag
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
  expect(field.value.tags.length).toBe(1)
  expect(changes).toBe(3)
  field.value = { tags: [], text: '' }
})
test('Enter with no hint highlighted is an action, not a tag', async () => {
  const field = preview.querySelector('tosi-search-field')
  await field.whenHydrated
  let actions = 0
  field.addEventListener('action', () => (actions += 1))
  field.typeText('report')
  field
    .querySelector('input')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(actions).toBe(1)
  expect(field.value).toEqual({ tags: [], text: 'report' })
  field.value = { tags: [], text: '' }
})
```

## Properties

### `hints`: SearchHintRule[]

The rules. A rule is `(text, tags) => SearchHint | SearchHint[] | null | undefined`, called
with the trimmed text whenever it changes (rules are not called for empty text). A
`SearchHint` is `{ caption, tag }`: `caption` is the row in the list, `tag` is what picking
it adds to the query.

### `value`: `{ tags: SearchTag[], text: string }`

The query. A `SearchTag` is `{ caption, background?, color?, …anything }`: the chip shows
`caption`, coloured like `<tosi-tag-list>` chips (given only a `background`, the text is
black or white, whichever contrasts more), and everything else is yours to interpret —
`kind`, `value`, a field name, an operator.

### `placeholder`: string = 'search'

Shown while the field has no tags and no text.

### `disabled`: boolean

## Events

- `change` — the tags changed (a hint was picked, or a tag removed).
- `input` — the text changed (the native event from the inner `<input>`).
- `action` — Enter was pressed with no hint highlighted: "search now".

## Keyboard

Focus stays in the text field throughout; the hints are a listbox it controls.

| key | does |
|---|---|
| ↓ / ↑ | highlight the next / previous hint (↑ from the first returns to the text) |
| Enter | pick the highlighted hint, or fire `action` if none is highlighted |
| Escape | close the hints; pressed again, clear the text |
| Backspace | in an empty field, remove the last tag |

## Methods

### `typeText(text: string)`

Put `text` in the field as if it had been typed, and update the hints. For tests and
scripted demos.

### `hintCount`: number

How many hints are currently listed (0 when the list is closed).
*/
/*{ "parent": "Form Components" }*/
import { elements, vars, varDefault, StyleSheet, withAttributes, } from 'tosijs';
import { popFloat } from './pop-float.js';
import { tosiTag, TosiTag } from './tag.js';
import { tagColors } from './tag-colors.js';
const { div, input } = elements;
/*
The hint list floats in <body> (so an overflow:hidden ancestor cannot clip it), which puts it
outside the component and its style sheet. So its styles are a global sheet, injected on first
use — the same arrangement as the tag list's pick menu. The variables are the menu's, so a
theme that restyles menus restyles this too.
*/
let hintStylesInjected = false;
function ensureHintStyles() {
    if (hintStylesInjected)
        return;
    hintStylesInjected = true;
    StyleSheet('tosi-search-hints', {
        '.tosi-search-hints': {
            overflow: 'hidden auto',
            maxHeight: `calc(${vars.maxHeight} - ${varDefault.menuInset('8px')})`,
            borderRadius: vars.spacing50,
            background: varDefault.menuBg('#fafafa'),
            boxShadow: varDefault.menuShadow(`${vars.spacing13} ${vars.spacing50} ${vars.spacing} #0004`),
        },
        '.tosi-search-hints [role="option"]': {
            padding: varDefault.menuItemPadding('0 8px'),
            height: varDefault.menuItemHeight('48px'),
            lineHeight: varDefault.menuItemHeight('48px'),
            color: varDefault.menuItemColor('#222'),
            cursor: 'default',
            whiteSpace: 'nowrap',
        },
        '.tosi-search-hints [role="option"]:hover': {
            background: varDefault.menuItemHoverBg('#eee'),
        },
        '.tosi-search-hints [role="option"][aria-selected="true"]': {
            background: varDefault.menuItemActiveBg('#aaa'),
        },
    });
}
let instanceCount = 0;
const sameTag = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export class TosiSearchField extends withAttributes({
    placeholder: 'search',
    disabled: false,
}) {
    static preferredTagName = 'tosi-search-field';
    static lightStyleSpec = {
        ':host': {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: vars.spacing25,
            padding: vars.spacing25,
            background: varDefault.inputBg('#fff'),
            borderRadius: varDefault.searchFieldRadius(vars.spacing50),
            boxShadow: varDefault.inputBorderShadow('inset 0 0 2px #0006'),
            cursor: 'text',
        },
        // The inner <input> has no outline of its own, so the FIELD shows focus.
        ':host:focus-within': {
            boxShadow: varDefault.tosiFocusRing(`0 0 0 2px ${varDefault.focusColor('#0064d280')}`),
        },
        ':host [part="tags"]': {
            display: 'contents',
        },
        ':host [part="input"]': {
            flex: '1 1 8em',
            minWidth: '4em',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            background: 'transparent',
            padding: `0 ${vars.spacing25}`,
        },
    };
    hints = [];
    tagList = [];
    textValue = '';
    listed = [];
    active = -1;
    float;
    listId = `tosi-search-hints-${++instanceCount}`;
    hintList = div({
        id: this.listId,
        role: 'listbox',
        class: 'tosi-search-hints',
    });
    get value() {
        return { tags: [...this.tagList], text: this.textValue };
    }
    set value(query) {
        this.tagList = [...(query?.tags ?? [])];
        this.textValue = query?.text ?? '';
        this.closeHints();
        this.queueRender();
    }
    get hintCount() {
        return this.float ? this.listed.length : 0;
    }
    typeText = (text) => {
        const field = this.parts.input;
        field.value = text;
        this.textValue = text;
        this.updateHints();
    };
    input = () => this.parts.input;
    handleInput = () => {
        this.textValue = this.input().value;
        this.updateHints();
    };
    handleKeydown = (event) => {
        const open = this.float !== undefined;
        switch (event.key) {
            case 'ArrowDown':
                if (!open)
                    this.updateHints();
                if (this.listed.length === 0)
                    return;
                this.setActive(Math.min(this.active + 1, this.listed.length - 1));
                break;
            case 'ArrowUp':
                if (!open)
                    return;
                this.setActive(Math.max(this.active - 1, -1));
                break;
            case 'Enter':
                if (open && this.active >= 0) {
                    this.pick(this.active);
                }
                else {
                    this.closeHints();
                    this.dispatchEvent(new Event('action', { bubbles: true }));
                }
                break;
            case 'Escape':
                if (open) {
                    this.closeHints();
                }
                else if (this.textValue !== '') {
                    this.typeText('');
                }
                else {
                    return;
                }
                break;
            case 'Backspace': {
                const field = this.input();
                const atStart = field.selectionStart === 0 && field.selectionEnd === 0;
                if (!atStart || this.tagList.length === 0)
                    return;
                this.tagList = this.tagList.slice(0, -1);
                this.tagsChanged();
                break;
            }
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
    };
    handleBlur = () => {
        this.closeHints();
    };
    // Keep focus in the field when a hint is pressed; the click then picks it.
    handleHintMousedown = (event) => {
        event.preventDefault();
    };
    handleHintClick = (event) => {
        const option = event.target.closest('[role="option"]');
        if (option)
            this.pick(Number(option.getAttribute('data-index')));
    };
    removeTag = (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (this.disabled)
            return;
        const chip = event.target.closest(TosiTag.tagName);
        const index = [...this.parts.tags.children].indexOf(chip);
        if (index < 0)
            return;
        this.tagList = this.tagList.filter((_, i) => i !== index);
        this.tagsChanged();
    };
    focusInput = (event) => {
        if (event.target === this)
            this.input().focus();
    };
    content = () => [
        div({ part: 'tags', role: 'list', ariaLabel: 'Search tags' }),
        input({
            part: 'input',
            type: 'search',
            role: 'combobox',
            autocomplete: 'off',
            ariaAutocomplete: 'list',
            ariaExpanded: 'false',
            ariaControls: this.listId,
            onInput: this.handleInput,
            onKeydown: this.handleKeydown,
            onBlur: this.handleBlur,
        }),
    ];
    constructor() {
        super();
        this.hintList.addEventListener('mousedown', this.handleHintMousedown);
        this.hintList.addEventListener('click', this.handleHintClick);
        this.addEventListener('click', this.focusInput);
    }
    /*
    `change` is dispatched here, synchronously, not via `queueRender(true)`, which defers it to
    the next animation frame: a listener reading `value` in response to a pick should not depend
    on the page painting (a background tab may never get the frame).
    */
    tagsChanged() {
        this.queueRender();
        this.dispatchEvent(new Event('change', { bubbles: true }));
    }
    updateHints() {
        const text = this.textValue.trim();
        this.listed =
            text === ''
                ? []
                : this.hints.flatMap((rule) => {
                    const result = rule(text, [...this.tagList]);
                    return result == null
                        ? []
                        : Array.isArray(result)
                            ? result
                            : [result];
                });
        this.active = -1;
        this.hintList.replaceChildren(...this.listed.map((hint, index) => div({
            id: `${this.listId}-${index}`,
            role: 'option',
            ariaSelected: 'false',
            dataIndex: String(index),
        }, hint.caption)));
        if (this.listed.length === 0) {
            this.closeHints();
        }
        else {
            this.openHints();
        }
        this.syncActive();
    }
    openHints() {
        ensureHintStyles();
        this.hintList.style.minWidth = `${this.offsetWidth}px`;
        if (!this.float || !this.float.isConnected) {
            this.float = popFloat({
                content: this.hintList,
                target: this,
                position: 's',
                remainOnScroll: 'remove',
                remainOnResize: 'remove',
            });
        }
        this.input().setAttribute('aria-expanded', 'true');
    }
    closeHints() {
        this.float?.remove();
        this.float = undefined;
        this.active = -1;
        if (this.hydrated) {
            this.input().setAttribute('aria-expanded', 'false');
            this.input().removeAttribute('aria-activedescendant');
        }
    }
    setActive(index) {
        this.active = index;
        this.syncActive();
    }
    syncActive() {
        const options = [...this.hintList.children];
        options.forEach((option, index) => option.setAttribute('aria-selected', String(index === this.active)));
        const current = options[this.active];
        if (current) {
            this.input().setAttribute('aria-activedescendant', current.id);
            current.scrollIntoView({ block: 'nearest' });
        }
        else {
            this.input().removeAttribute('aria-activedescendant');
        }
    }
    pick(index) {
        const hint = this.listed[index];
        if (!hint)
            return;
        if (!this.tagList.some((tag) => sameTag(tag, hint.tag))) {
            this.tagList = [...this.tagList, hint.tag];
        }
        this.textValue = '';
        this.input().value = '';
        this.closeHints();
        this.input().focus();
        this.tagsChanged();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.closeHints();
    }
    render() {
        super.render();
        const field = this.input();
        if (field.value !== this.textValue)
            field.value = this.textValue;
        field.placeholder = this.tagList.length ? '' : this.placeholder;
        field.disabled = this.disabled;
        this.parts.tags.replaceChildren(...this.tagList.map((tag) => {
            const chip = tosiTag({
                caption: tag.caption,
                role: 'listitem',
                removeable: !this.disabled,
                removeCallback: this.removeTag,
            });
            const colors = tagColors(tag);
            if (colors?.background)
                chip.style.setProperty('--tag-bg', colors.background);
            if (colors?.color)
                chip.style.setProperty('--tag-text-color', colors.color);
            return chip;
        }));
    }
}
export const tosiSearchField = TosiSearchField.elementCreator();
