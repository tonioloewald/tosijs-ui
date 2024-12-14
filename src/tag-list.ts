/*!
# tag-list

Building a tag-list from standard HTML elements is a bit of a nightmare.

`<xin-tag-list>` allows you to display an editable or read-only tag list (represented either
as a comma-delimited string or an array of strings).

```html
<label>
  <b>Display Only</b>
  <xin-tag-list
    value="this,that,,the-other"
  ></xin-tag-list>
</label>
<xin-tag-list
  class="compact"
  value="this,that,,the-other"
></xin-tag-list>
<br>
<label>
  <b>Editable</b>
  <xin-tag-list
    value="belongs,also belongs,custom"
    editable
    available-tags="belongs,also belongs,not initially chosen"
  ></xin-tag-list>
</label>

<br>
<b>Text-Entry</b>
<xin-tag-list
  value="this,that,the-other,not,enough,space"
  editable
  text-entry
  available-tags="tomasina,dick,,harriet"
></xin-tag-list>
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

## Properties

### `value`: string | string[]

A list of tags

### `tags`: string[]

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
} from 'xinjs'
import { popMenu, MenuItem } from './menu'
import { icons } from './icons'

const { div, input, span, button } = elements

export class XinTag extends WebComponent {
  caption = ''
  removeable = false

  removeCallback: (event: Event) => void = () => {
    this.remove()
  }

  content = () => [
    span({ part: 'caption' }, this.caption),
    button(icons.x(), {
      part: 'remove',
      hidden: !this.removeable,
      onClick: this.removeCallback,
    }),
  ]

  constructor() {
    super()

    this.initAttributes('caption', 'removeable')
  }
}

export const xinTag = XinTag.elementCreator({
  tag: 'xin-tag',
  styleSpec: {
    ':host': {
      '--tag-close-button-color': '#000c',
      '--tag-close-button-bg': '#fffc',
      '--tag-close-button-border-radius': '99px',
      '--tag-button-opacity': '0.5',
      '--tag-button-hover-opacity': '0.75',
      '--tag-bg': varDefault.brandColor('blue'),
      '--tag-text-color': varDefault.brandTextColor('white'),
      display: 'inline-flex',
      borderRadius: vars.spacing50,
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
      '--text-color': vars.tagCloseButtonColor,
      background: vars.tagCloseButtonBg,
      borderRadius: vars.tagCloseButtonBorderRadius,
      opacity: vars.tagButtonOpacity,
    },
    ':host [part="remove"]:hover': {
      background: vars.tagCloseButtonBg,
      opacity: vars.tagButtonHoverOpacity,
    },
  },
}) as ElementCreator<XinTag>

interface Tag {
  value: string
  caption?: string
  color?: string
  background?: string
  icon?: string | HTMLElement
}

type TagList = (string | Tag | null)[]

export class XinTagList extends WebComponent {
  name = ''
  availableTags: string | TagList = []
  value: string | string[] = []
  textEntry = false
  editable = false
  placeholder = 'enter tags'

  get tags(): string[] {
    return typeof this.value === 'string'
      ? this.value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : this.value
  }

  constructor() {
    super()

    this.initAttributes(
      'name',
      'value',
      'textEntry',
      'availableTags',
      'editable',
      'placeholder'
    )
  }

  addTag = (tag: string) => {
    if (tag.trim() === '') {
      return
    }
    const { tags } = this
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
    this.value = tags
    this.queueRender(true)
  }

  toggleTag = (toggled: string) => {
    if (this.tags.includes(toggled)) {
      this.value = this.tags.filter((tag) => tag !== toggled)
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

  popAddMenu = () => {
    const { toggleTag } = this
    const { tagMenu } = this.parts
    const tags: TagList =
      typeof this.availableTags === 'string'
        ? this.availableTags.split(',')
        : this.availableTags
    const extraTags = this.tags.filter((tag) => !tags.includes(tag))
    if (extraTags.length) {
      tags.push(null, ...extraTags)
    }
    const menuItems: MenuItem[] = tags.map((tag) => {
      if (tag === '' || tag === null) {
        return null
      } else if (typeof tag === 'object') {
        return {
          icon: this.tags.includes(tag.value) ? icons.minus() : icons.plus(),
          caption: tag.caption!,
          action() {
            toggleTag(tag.value)
          },
        }
      } else {
        return {
          icon: this.tags.includes(tag) ? icons.minus() : icons.plus(),
          caption: tag,
          action() {
            toggleTag(tag)
          },
        }
      }
    })

    popMenu({
      target: tagMenu,
      width: 'auto',
      menuItems,
    })
  }

  content = () => [
    div({
      part: 'tagContainer',
      class: 'row',
      onClick(event) {
        event.stopPropagation()
        event.preventDefault()
      },
    }),
    input({
      part: 'tagInput',
      class: 'elastic',
      onKeydown: this.enterTag,
    }),
    button(
      {
        title: 'add tag',
        part: 'tagMenu',
        onClick: this.popAddMenu,
      },
      icons.chevronDown()
    ),
  ]

  removeTag = (event: Event) => {
    const tag = (event.target as HTMLElement).closest(XinTag.tagName!) as XinTag
    this.value = this.tags.filter((value) => value !== tag.caption)
    tag.remove()
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

    tagInput.value = ''
    tagInput.setAttribute('placeholder', this.placeholder)
    if (this.editable) {
      tagMenu.toggleAttribute('hidden', false)
      tagInput.toggleAttribute('hidden', !this.textEntry)
    } else {
      tagMenu.toggleAttribute('hidden', true)
      tagInput.toggleAttribute('hidden', true)
    }

    tagContainer.textContent = ''
    const { tags } = this
    for (const tag of tags) {
      tagContainer.append(
        xinTag({
          caption: tag,
          removeable: this.editable,
          removeCallback: this.removeTag,
        })
      )
    }
  }
}

export const xinTagList = XinTagList.elementCreator({
  tag: 'xin-tag-list',
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
    },
    ':host[editable]': {
      gridTemplateColumns: `auto ${vars.touchSize}`,
    },
    ':host[editable][text-entry]': {
      gridTemplateColumns: `2fr 1fr ${vars.touchSize}`,
    },
    ':host [part="tagContainer"]': {
      display: 'flex',
      content: '" "',
      alignItems: 'center',
      background: vars.inputBg,
      borderRadius: vars.roundedRadius,
      boxShadow: vars.borderShadow,
      flexWrap: 'nowrap',
      overflow: 'auto hidden',
      gap: vars.spacing25,
      minHeight: `calc(${vars.lineHeight} + ${vars.spacing})`,
      padding: vars.spacing50,
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
  },
}) as ElementCreator<XinTagList>
