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
    value="belongs,also belongs,custom"
    editable
    available-tags="belongs,also belongs,not initially chosen"
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
```

## Properties

### `value`: string | string[]

A list of tags

### `tags`: string[]

## `popSelectMenu`: () => void

This is the method called when the user clicks the menu button. By default is displays a
pick list of tags, but if you wish to customize the behavior, just replace this method.

A read-only property giving the value as an array.

### `available-tags`: string | string[]

A list of tags that will be displayed in the popup menu by default. The popup menu
will always display custom tags (allowing their removal).

### `editable`: boolean

Allows the tag list to be modified via menu and removing tags.

### `text-entry`: boolean

If `editable`, an input field is provided for entering tags directly.

### `placeholder`: string = 'enter tags'

Placeholder shown on input field.
*/

import {
  Component as WebComponent,
  elements,
  vars,
  varDefault,
  ElementCreator,
  deprecated,
} from 'tosijs'
import { popMenu, MenuItem } from './menu'
import { icons } from './icons'

const { div, input, span, button } = elements

export class TosiTag extends WebComponent {
  static initAttributes = {
    caption: '',
    removeable: false,
  }

  removeCallback: (event: Event) => void = () => {
    this.remove()
  }

  content = () => [
    span({ part: 'caption' }, this.caption),
    button(icons.x(), {
      type: 'button',
      part: 'remove',
      hidden: !this.removeable,
      ariaLabel: `Remove ${this.caption}`,
      onClick: this.removeCallback,
    }),
  ]
}

/** @deprecated Use TosiTag instead */
export const XinTag = TosiTag

export const tosiTag = TosiTag.elementCreator({
  tag: 'tosi-tag',
  styleSpec: {
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
  },
}) as ElementCreator<TosiTag>

/** @deprecated Use tosiTag instead */
export const xinTag = deprecated(
  (...args: Parameters<typeof tosiTag>) => tosiTag(...args),
  'xinTag is deprecated, use tosiTag instead (tag is now <tosi-tag>)'
) as ElementCreator<TosiTag>

interface Tag {
  value: string
  caption?: string
  color?: string
  background?: string
  icon?: string | HTMLElement
}

type TagList = (string | Tag | null)[]

export class TosiTagList extends WebComponent {
  static formAssociated = true

  static initAttributes = {
    name: '',
    textEntry: false,
    editable: false,
    placeholder: 'enter tags',
    disabled: false,
    required: false,
  }

  // value is the source of truth (Component watches this for form handling)
  value = ''

  // tags parses value into array
  get tags(): string[] {
    return this.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '')
  }

  set tags(v: string[]) {
    this.value = v.join(',')
  }

  private _availableTags: TagList = []

  get availableTags(): TagList {
    return this._availableTags
  }

  set availableTags(v: TagList | string) {
    if (typeof v === 'string') {
      this._availableTags = TosiTagList.parseAvailableTagsString(v)
    } else {
      this._availableTags = v
    }
    this.queueRender()
  }

  // Parse available-tags string (comma-delimited)
  private static parseAvailableTagsString(tagsStr: string): TagList {
    return tagsStr.split(',').map((tag) => {
      const trimmed = tag.trim()
      return trimmed === '' ? null : trimmed
    })
  }

  connectedCallback(): void {
    super.connectedCallback()
    // Parse available-tags from HTML attribute if present and not already set programmatically
    const tagsAttr = this.getAttribute('available-tags')
    if (tagsAttr && this._availableTags.length === 0) {
      this._availableTags = TosiTagList.parseAvailableTagsString(tagsAttr)
    }
  }

  // Form lifecycle callbacks
  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled
  }

  formResetCallback(): void {
    this.value = ''
  }

  addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed === '' || this.tags.includes(trimmed)) {
      return
    }
    this.tags = [...this.tags, trimmed]
    this.queueRender(true)
  }

  toggleTag = (toggled: string) => {
    if (this.tags.includes(toggled)) {
      this.tags = this.tags.filter((t) => t !== toggled)
      this.queueRender(true)
    } else {
      this.addTag(toggled)
    }
  }

  enterTag = (event: KeyboardEvent) => {
    const { tagInput } = this.parts as { tagInput: HTMLInputElement }
    switch (event.key) {
      case ',':
        {
          const tag = tagInput.value.split(',')[0]
          this.addTag(tag)
        }
        break
      case 'Enter':
        {
          const tag = tagInput.value.split(',')[0]
          this.addTag(tag)
        }
        event.stopPropagation()
        event.preventDefault()
        break
      default:
      // do nothing
    }
  }

  popSelectMenu = () => {
    const { toggleTag } = this
    const { tagMenu } = this.parts
    const tags: TagList = [...this.availableTags]
    const extraTags = this.tags.filter((tag) => !tags.includes(tag))
    if (extraTags.length) {
      tags.push(null, ...extraTags)
    }
    const menuItems: MenuItem[] = tags.map((tag) => {
      if (tag === '' || tag === null) {
        return null
      } else if (typeof tag === 'object') {
        return {
          checked: () => this.tags.includes(tag.value),
          caption: tag.caption!,
          action() {
            toggleTag(tag.value)
          },
        }
      } else {
        return {
          checked: () => this.tags.includes(tag),
          caption: tag,
          action() {
            toggleTag(tag)
          },
        }
      }
    })

    popMenu({
      target: tagMenu as HTMLElement,
      width: 'auto',
      menuItems,
    })
  }

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
    button(
      {
        type: 'button',
        title: 'add tag',
        ariaLabel: 'Select tags from list',
        ariaHaspopup: 'listbox',
        part: 'tagMenu',
        onClick: this.popSelectMenu,
      },
      icons.chevronDown()
    ),
  ]

  removeTag = (event: Event) => {
    if (this.editable && !this.disabled) {
      const tag = (event.target as HTMLElement).closest(
        TosiTag.tagName!
      ) as TosiTag
      this.tags = this.tags.filter((t) => t !== tag.caption)
      tag.remove()
      this.queueRender(true)
    }
    event.stopPropagation()
    event.preventDefault()
  }

  render(): void {
    super.render()

    const { tagContainer, tagMenu, tagInput } = this.parts as {
      tagContainer: HTMLDivElement
      tagMenu: HTMLButtonElement
      tagInput: HTMLInputElement
    }

    tagMenu.disabled = this.disabled
    tagInput.value = ''
    tagInput.setAttribute('placeholder', this.placeholder)
    if (this.editable && !this.disabled) {
      tagMenu.toggleAttribute('hidden', false)
      tagInput.toggleAttribute('hidden', !this.textEntry)
    } else {
      tagMenu.toggleAttribute('hidden', true)
      tagInput.toggleAttribute('hidden', true)
    }

    tagContainer.textContent = ''
    for (const tag of this.tags) {
      tagContainer.append(
        tosiTag({
          caption: tag,
          removeable: this.editable && !this.disabled,
          removeCallback: this.removeTag,
        })
      )
    }
  }
}

/** @deprecated Use TosiTagList instead */
export const XinTagList = TosiTagList

export const tosiTagList = TosiTagList.elementCreator({
  tag: 'tosi-tag-list',
  styleSpec: {
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
  },
}) as ElementCreator<TosiTagList>

/** @deprecated Use tosiTagList instead */
export const xinTagList = deprecated(
  (...args: Parameters<typeof tosiTagList>) => tosiTagList(...args),
  'xinTagList is deprecated, use tosiTagList instead (tag is now <tosi-tag-list>)'
) as ElementCreator<TosiTagList>
