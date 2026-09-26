/*#
# tag-list

Building a tag-list from standard HTML elements is a bit of a nightmare.

`<tosi-tag-list>` allows you to display an editable or read-only tag list (represented either
as a comma-delimited string or an array of strings).

```html
<label style="position: absolute; right: 10px; top: 10px; display: block">
  <input type="checkbox" class="disable-toggle">
  <b>Disable All</b>
</label>
<label>
  <b>Display Only</b>
  <tosi-tag-list
    value="this,that,,the-other"
  ></tosi-tag-list>
</label>
<tosi-tag-list
  class="compact"
  value="this,that,,the-other"
></tosi-tag-list>
<br>
<label>
  <b>Editable</b>
  <tosi-tag-list
    class="editable-tag-list"
    value="belongs,also belongs,has\, comma,custom"
    editable
    available-tags="belongs,also belongs,has\, comma,not initially chosen"
  ></tosi-tag-list>
</label>
<br>
<b>Text-Entry</b>
<tosi-tag-list
  value="this,that,the-other,not,enough,space"
  editable
  text-entry
  available-tags="tomasina,dick,,harriet"
></tosi-tag-list>
```
```css
.preview .compact {
  --spacing: 8px;
  --font-size: 12px;
  --line-height: 18px;
}
.preview label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
```
```js
preview.addEventListener('change', (event) => {
  if (event.target.matches('tosi-tag-list')) {
    console.log(event.target, event.target.value)
  }
}, true)
preview.querySelector('.disable-toggle').addEventListener('change', (event) => {
  const tagLists = Array.from(preview.querySelectorAll('tosi-tag-list'))
  for(const tagList of tagLists) {
    tagList.disabled = event.target.checked
  }
})
```
```test
const tagLists = preview.querySelectorAll('tosi-tag-list')
test('tag-lists render', () => {
  expect(tagLists.length).toBe(4)
})
test('first tag-list has correct tags', () => {
  expect(tagLists[0].tags.length).toBe(3)
  expect(tagLists[0].tags).toContain('this')
})
test('editable tag-list has editable attribute', () => {
  expect(tagLists[2].editable).toBe(true)
})
test('a comma inside a tag survives the value round-trip', () => {
  const tl = document.createElement('tosi-tag-list')
  tl.tags = ['New York, NY', 'Boston']
  // the literal comma is escaped in `value` so it is not a delimiter
  expect(tl.value).toBe('New York\\, NY,Boston')
  expect(tl.tags.length).toBe(2)
  expect(tl.tags).toContain('New York, NY')
})
test('an escaped comma in a value string parses as one tag', () => {
  const tl = document.createElement('tosi-tag-list')
  tl.value = 'New York\\, NY,Boston'
  expect(tl.tags.length).toBe(2)
  expect(tl.tags).toContain('New York, NY')
})
```

## Properties

### `value`: string | string[]

A comma-delimited list of tags. A tag that itself contains a comma must
escape it as `\,` — e.g. `value="New York\, NY,Boston"` is two tags. The
`tags` accessor handles this escaping for you in both directions.

### `tags`: string[]

A read-only property giving the value as an array.

## `popSelectMenu`: () => void

This is the method called when the user clicks the menu button. By default it displays a
pick list of tags, but if you wish to customize the behavior, just replace this method — at
any time, including after the element is on the page.

### `available-tags`: string | string[]

A list of tags that will be displayed in the popup menu by default. The popup menu
will always display custom tags (allowing their removal). As with `value`, a
comma inside a tag must be escaped as `\,` when set via the attribute string.

Set as a property, entries may also be **Tag objects**: `{ value, caption?, background?, color? }`.
A tag with a `background` gets it on its chip and as a lozenge behind its caption in the pick
menu (the checkmark keeps its own place). Without a `color`, the text is black or white,
whichever contrasts more with the background.

```js
import { tosiTagList } from 'tosijs-ui'

preview.append(
  tosiTagList({
    editable: true,
    value: ['bug', 'docs'],
    availableTags: [
      { value: 'bug', background: '#d32f2f' },
      { value: 'feature', background: '#2e7d32' },
      { value: 'docs', background: '#1565c0', color: '#ffeb3b' },
      'question',
    ],
  })
)
```
```test
test('coloured tags colour their chips', () => {
  // render now rather than wait for a frame: a background test tab may never paint
  preview.querySelector('tosi-tag-list').render()
  const chips = [...preview.querySelectorAll('tosi-tag-list tosi-tag')]
  expect(chips.length).toBe(2)
  expect(chips[0].style.getPropertyValue('--tag-bg')).toBe('#d32f2f')
  expect(getComputedStyle(chips[1]).color).toBe('rgb(255, 235, 59)')
})
```

### `editable`: boolean

Allows the tag list to be modified via menu and removing tags.

### `text-entry`: boolean

If `editable`, an input field is provided for entering tags directly.

### `placeholder`: string = 'enter tags'

Placeholder shown on input field.
*/
/*{ "parent": "Form Components" }*/
import { Component as WebComponent, elements, vars, varDefault, deprecated, StyleSheet, Color, contrastRatio, } from 'tosijs';
import { popMenu } from './menu.js';
import { icons } from './icons.js';
const { div, input, span, button } = elements;
// Tags are serialised as a comma-delimited string (the form `value`). A
// literal comma inside a tag is escaped as `\,` so it survives the
// split/join round-trip — both in programmatic values and in the
// `value` / `available-tags` HTML attributes.
const splitTags = (str) => str.split(/(?<!\\),/).map((tag) => tag.trim().replace(/\\,/g, ','));
const joinTags = (tags) => tags.map((tag) => tag.replace(/,/g, '\\,')).join(',');
export class TosiTag extends WebComponent {
    static preferredTagName = 'tosi-tag';
    static lightStyleSpec = {
        ':host': {
            '--tag-close-button-color': '#000c',
            '--tag-close-button-bg': '#fffc',
            '--tag-button-opacity': '0.5',
            '--tag-button-hover-opacity': '0.75',
            '--tag-bg': varDefault.brandColor('blue'),
            '--tag-text-color': varDefault.brandTextColor('white'),
            display: 'inline-flex',
            borderRadius: varDefault.tagRoundedRadius(vars.spacing50),
            color: vars.tagTextColor,
            background: vars.tagBg,
            padding: `0 ${vars.spacing75} 0 ${vars.spacing75}`,
            height: `calc(${vars.lineHeight} + ${vars.spacing50})`,
            lineHeight: `calc(${vars.lineHeight} + ${vars.spacing50})`,
        },
        ':host > [part="caption"]': {
            position: 'relative',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            flex: '1 1 auto',
            fontSize: varDefault.fontSize('16px'),
            color: vars.tagTextColor,
            textOverflow: 'ellipsis',
        },
        ':host [part="remove"]': {
            boxShadow: 'none',
            margin: `0 ${vars.spacing_50} 0 ${vars.spacing25}`,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'center',
            justifyContent: 'center',
            height: vars.spacing150,
            width: vars.spacing150,
            color: vars.tagCloseButtonColor,
            background: vars.tagCloseButtonBg,
            borderRadius: varDefault.tagCloseButtonRadius('99px'),
            opacity: vars.tagButtonOpacity,
        },
        ':host [part="remove"]:hover': {
            background: vars.tagCloseButtonBg,
            opacity: vars.tagButtonHoverOpacity,
        },
    };
    static initAttributes = {
        caption: '',
        removeable: false,
    };
    removeCallback = () => {
        this.remove();
    };
    content = () => [
        span({ part: 'caption' }, this.caption),
        button(icons.x(), {
            type: 'button',
            part: 'remove',
            hidden: !this.removeable,
            ariaLabel: `Remove ${this.caption}`,
            onClick: this.removeCallback,
        }),
    ];
}
/** @deprecated Use TosiTag instead */
export const XinTag = TosiTag;
export const tosiTag = TosiTag.elementCreator();
/** @deprecated Use tosiTag instead */
export const xinTag = deprecated((...args) => tosiTag(...args), 'xinTag is deprecated, use tosiTag instead (tag is now <tosi-tag>)');
/*
Tag colours (#173). A Tag in `availableTags` may carry `background` and `color`; they colour the
tag's chip and its row in the pick menu. Given only a background, the text is whichever of black
or white contrasts more with it — `Color.contrasting()` alone picks white on pure red at 4.0:1
where black gives 5.25:1.
*/
function textColorFor(background) {
    const onBlack = contrastRatio('#000000', background);
    const onWhite = contrastRatio('#ffffff', background);
    if (onBlack == null || onWhite == null) {
        return Color.fromCss(background).contrasting().html;
    }
    return onBlack >= onWhite ? '#000000' : '#ffffff';
}
/** The `--tag-bg` / `--tag-text-color` values for a tag, or null if it has no colours. */
function tagColors(tag) {
    const background = tag?.background;
    const color = tag?.color ?? (background ? textColorFor(background) : undefined);
    return background || color ? { background, color } : null;
}
/*
The pick menu lives outside the tag list (menus float in <body>), so its lozenge style is a
global sheet, injected on first use. A coloured row's CAPTION becomes a lozenge in the tag's
colours; the checkmark keeps its own slot, so selection stays visible.
*/
let tagMenuStylesInjected = false;
function ensureTagMenuStyles() {
    if (tagMenuStylesInjected) {
        return;
    }
    tagMenuStylesInjected = true;
    StyleSheet('tosi-tag-menu', {
        '.tosi-tag-menu-colored > :nth-child(2)': {
            background: vars.tagBg,
            color: vars.tagTextColor,
            borderRadius: varDefault.tagRoundedRadius(vars.spacing50),
            padding: `0 ${vars.spacing75}`,
            justifySelf: 'start',
            // the same height as a chip, centred, rather than stretched to the row
            alignSelf: 'center',
            height: `calc(${vars.lineHeight} + ${vars.spacing50})`,
            lineHeight: `calc(${vars.lineHeight} + ${vars.spacing50})`,
        },
    });
}
export class TosiTagList extends WebComponent {
    static preferredTagName = 'tosi-tag-list';
    static lightStyleSpec = {
        ':host': {
            '--tag-list-bg': '#f8f8f8',
            '--touch-size': '44px',
            '--spacing': '16px',
            display: 'grid',
            gridTemplateColumns: 'auto',
            alignItems: 'center',
            background: vars.tagListBg,
            gap: vars.spacing25,
            borderRadius: varDefault.taglistRoundedRadius(vars.spacing50),
            overflow: 'hidden',
        },
        ':host[editable]': {
            gridTemplateColumns: `0px auto ${vars.touchSize}`,
        },
        ':host[editable][text-entry]': {
            gridTemplateColumns: `0px 2fr 1fr ${vars.touchSize}`,
        },
        ':host [part="tagContainer"]': {
            display: 'flex',
            content: '" "',
            alignItems: 'center',
            background: vars.inputBg,
            borderRadius: varDefault.tagContainerRadius(vars.spacing50),
            boxShadow: vars.borderShadow,
            flexWrap: 'nowrap',
            overflow: 'auto hidden',
            gap: vars.spacing25,
            minHeight: `calc(${vars.lineHeight} + ${vars.spacing})`,
            padding: vars.spacing25,
        },
        ':host [part="tagMenu"]': {
            width: vars.touchSize,
            height: vars.touchSize,
            lineHeight: vars.touchSize,
            textAlign: 'center',
            padding: 0,
            margin: 0,
        },
        ':host [hidden]': {
            display: 'none !important',
        },
        ':host button[part="tagMenu"]': {
            background: vars.brandColor,
            color: vars.brandTextColor,
        },
    };
    static formAssociated = true;
    static initAttributes = {
        name: '',
        textEntry: false,
        editable: false,
        placeholder: 'enter tags',
        disabled: false,
        required: false,
    };
    // value is the source of truth (Component watches this for form handling)
    value = '';
    // tags parses value into array
    get tags() {
        // `value` is documented as `string | string[]`, but only a string was handled: an array
        // threw `split is not a function` on render. Found by the #173 doc example.
        const value = this.value;
        return (Array.isArray(value) ? value : splitTags(value)).filter((tag) => tag !== '');
    }
    set tags(v) {
        this.value = joinTags(v);
    }
    _availableTags = [];
    get availableTags() {
        return this._availableTags;
    }
    set availableTags(v) {
        if (typeof v === 'string') {
            this._availableTags = TosiTagList.parseAvailableTagsString(v);
        }
        else {
            this._availableTags = v;
        }
        this.queueRender();
    }
    // Parse available-tags string (comma-delimited; `\,` is a literal comma).
    static parseAvailableTagsString(tagsStr) {
        return splitTags(tagsStr).map((tag) => (tag === '' ? null : tag));
    }
    connectedCallback() {
        super.connectedCallback();
        // Parse available-tags from HTML attribute if present and not already set programmatically
        const tagsAttr = this.getAttribute('available-tags');
        if (tagsAttr && this._availableTags.length === 0) {
            this._availableTags = TosiTagList.parseAvailableTagsString(tagsAttr);
        }
    }
    // Form lifecycle callbacks
    formDisabledCallback(disabled) {
        this.disabled = disabled;
    }
    formResetCallback() {
        this.value = '';
    }
    addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed === '' || this.tags.includes(trimmed)) {
            return;
        }
        this.tags = [...this.tags, trimmed];
        this.queueRender(true);
    };
    toggleTag = (toggled) => {
        if (this.tags.includes(toggled)) {
            this.tags = this.tags.filter((t) => t !== toggled);
            this.queueRender(true);
        }
        else {
            this.addTag(toggled);
        }
    };
    enterTag = (event) => {
        const { tagInput } = this.parts;
        switch (event.key) {
            case ',':
                {
                    const tag = tagInput.value.split(',')[0];
                    this.addTag(tag);
                }
                break;
            case 'Enter':
                {
                    const tag = tagInput.value.split(',')[0];
                    this.addTag(tag);
                }
                event.stopPropagation();
                event.preventDefault();
                break;
            default:
            // do nothing
        }
    };
    /** The Tag object in availableTags for this value, if there is one. */
    #tagFor(value) {
        return this.availableTags.find((tag) => tag !== null && typeof tag === 'object' && tag.value === value);
    }
    popSelectMenu = () => {
        const { toggleTag } = this;
        const { tagMenu } = this.parts;
        const tags = [...this.availableTags];
        // Compare by VALUE: availableTags may hold Tag objects, and `includes` on those never
        // matches a string, so a tag that IS available was listed a second time as an extra (#189).
        const available = new Set(tags.map((tag) => (tag && typeof tag === 'object' ? tag.value : tag)));
        const extraTags = this.tags.filter((tag) => !available.has(tag));
        if (extraTags.length) {
            tags.push(null, ...extraTags);
        }
        const menuItems = tags.map((tag) => {
            if (tag === '' || tag === null) {
                return null;
            }
            else if (typeof tag === 'object') {
                const colors = tagColors(tag);
                const item = {
                    checked: () => this.tags.includes(tag.value),
                    // caption is optional on Tag; without the fallback a Tag built as { value, color }
                    // rendered a blank row (#189).
                    caption: tag.caption ?? tag.value,
                    ...(colors
                        ? {
                            properties: {
                                class: 'tosi-tag-menu-colored',
                                // `_tagBg` sets the custom property --tag-bg
                                style: {
                                    _tagBg: colors.background,
                                    _tagTextColor: colors.color,
                                },
                            },
                        }
                        : {}),
                    action() {
                        toggleTag(tag.value);
                    },
                };
                return item;
            }
            else {
                return {
                    checked: () => this.tags.includes(tag),
                    caption: tag,
                    action() {
                        toggleTag(tag);
                    },
                };
            }
        });
        ensureTagMenuStyles();
        popMenu({
            target: tagMenu,
            width: 'auto',
            menuItems,
        });
    };
    content = () => [
        // this button is simply here to eat click events sent via a label
        button({ type: 'button', style: { visibility: 'hidden' }, tabindex: -1 }),
        div({
            part: 'tagContainer',
            class: 'row',
            role: 'list',
            ariaLabel: 'Selected tags',
        }),
        input({
            part: 'tagInput',
            class: 'elastic',
            ariaLabel: 'Enter new tag',
            onKeydown: this.enterTag,
        }),
        button({
            type: 'button',
            title: 'add tag',
            ariaLabel: 'Select tags from list',
            ariaHaspopup: 'listbox',
            part: 'tagMenu',
            // Deliberately a wrapper, the exception to the arrow-property rule: popSelectMenu is a
            // documented "replace this method" hook, and passing the property captured the ORIGINAL
            // function at hydration, so a replacement made after connection did nothing (#172).
            onClick: () => this.popSelectMenu(),
        }, icons.chevronDown()),
    ];
    removeTag = (event) => {
        if (this.editable && !this.disabled) {
            const tag = event.target.closest(TosiTag.tagName);
            this.tags = this.tags.filter((t) => t !== tag.caption);
            tag.remove();
            this.queueRender(true);
        }
        event.stopPropagation();
        event.preventDefault();
    };
    render() {
        super.render();
        const { tagContainer, tagMenu, tagInput } = this.parts;
        tagMenu.disabled = this.disabled;
        tagInput.value = '';
        tagInput.setAttribute('placeholder', this.placeholder);
        if (this.editable && !this.disabled) {
            tagMenu.toggleAttribute('hidden', false);
            tagInput.toggleAttribute('hidden', !this.textEntry);
        }
        else {
            tagMenu.toggleAttribute('hidden', true);
            tagInput.toggleAttribute('hidden', true);
        }
        tagContainer.textContent = '';
        for (const tag of this.tags) {
            const chip = tosiTag({
                caption: tag,
                removeable: this.editable && !this.disabled,
                removeCallback: this.removeTag,
            });
            // Chips take their colours from the matching Tag in availableTags (#173).
            const colors = tagColors(this.#tagFor(tag));
            if (colors?.background)
                chip.style.setProperty('--tag-bg', colors.background);
            if (colors?.color)
                chip.style.setProperty('--tag-text-color', colors.color);
            tagContainer.append(chip);
        }
    }
}
/** @deprecated Use TosiTagList instead */
export const XinTagList = TosiTagList;
export const tosiTagList = TosiTagList.elementCreator();
/** @deprecated Use tosiTagList instead */
export const xinTagList = deprecated((...args) => tosiTagList(...args), 'xinTagList is deprecated, use tosiTagList instead (tag is now <tosi-tag-list>)');
