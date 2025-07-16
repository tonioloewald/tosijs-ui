/*#
# word (rich text editor)

`<xin-word>` is a simple and easily extensible `document.execCommand` WYSIWYG editor with some conveniences.

```html
<xin-word widgets="minimal">
<h3>Heading</h3>
<p>And some <b>text</b></p>
</xin-word>
```
```css
xin-word {
  background: white;
}

xin-word [part="toolbar"] {
  background: #f8f8f8;
}

xin-word [part="doc"] {
  padding: 20px;
}
```

By default, `<xin-word>` treats its initial contents as its document, but you can also set (and get)
its `value`.

## toolbar

`<xin-word>` elements have a `toolbar` slot (actually a xin-slot because it doesn't use
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

A `<xin-word>` element also has `selectedText` and `selectedBlocks` properties, allowing
you to easily perform operations on text selections, and a `selectionChange` callback (which
simply passes through document `selectionchange` events, but also passes a reference to
the `<xin-word>` component).
*/

import { Component as WebComponent, ElementCreator, PartsMap, elements } from 'tosijs'
import { icons } from './icons'

import { xinSelect, XinSelect } from './select'

const { xinSlot, div, button, span } = elements

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
]

export function blockStyle(options = blockStyles) {
  return xinSelect({
    title: 'paragraph style',
    slot: 'toolbar',
    class: 'block-style',
    options: options.map(({ caption, tagType }) => ({
      caption,
      value: `formatBlock,${tagType}`,
    })),
  })
}

export function spacer(width = '10px') {
  return span({
    slot: 'toolbar',
    style: { flex: `0 0 ${width}`, content: ' ' },
  })
}

export function elastic(width = '10px') {
  return span({
    slot: 'toolbar',
    style: { flex: `0 0 ${width}`, content: ' ' },
  })
}

export function commandButton(
  title: string,
  dataCommand: string,
  icon: SVGElement
) {
  return button({ slot: 'toolbar', dataCommand, title }, icon)
}

const paragraphStyleWidgets = () => [
  commandButton('left-justify', 'justifyLeft', icons.alignLeft()),
  commandButton('center', 'justifyCenter', icons.alignCenter()),
  commandButton('right-justify', 'justifyRight', icons.alignRight()),
  spacer(),
  commandButton('bullet list', 'insertUnorderedList', icons.listBullet()),
  commandButton('numbered list', 'insertOrderedList', icons.listNumber()),
  spacer(),
  commandButton('indent', 'indent', icons.blockIndent()),
  commandButton('indent', 'outdent', icons.blockOutdent()),
]

const characterStyleWidgets = () => [
  commandButton('bold', 'bold', icons.fontBold()),
  commandButton('italic', 'italic', icons.fontItalic()),
  commandButton('underline', 'underline', icons.fontUnderline()),
]

const minimalWidgets = () => [
  blockStyle(),
  spacer(),
  ...characterStyleWidgets(),
]

export const richTextWidgets = () => [
  blockStyle(),
  spacer(),
  ...paragraphStyleWidgets(),
  spacer(),
  ...characterStyleWidgets(),
]

interface EditorParts extends PartsMap {
  toolbar: HTMLElement
  doc: HTMLElement
  content: HTMLElement
}

export class RichText extends WebComponent<EditorParts> {
  widgets: 'none' | 'minimal' | 'default' = 'default'

  private isInitialized = false

  get value(): string {
    return this.isInitialized
      ? this.parts.doc.innerHTML
      : this.savedValue || this.innerHTML
  }

  set value(docHtml: string) {
    if (this.isInitialized) {
      this.parts.doc.innerHTML = docHtml
    } else {
      this.innerHTML = docHtml
    }
  }

  blockElement(elt: Node): Element | undefined {
    const { doc } = this.parts
    while (elt.parentElement !== null && elt.parentElement !== doc) {
      elt = elt.parentElement
    }
    return elt.parentElement === doc ? (elt as Element) : undefined
  }

  get selectedBlocks(): any[] {
    const { doc } = this.parts
    const selObject = window.getSelection()
    if (selObject === null) {
      return []
    }
    const blocks = [] as any[]
    for (let i = 0; i < selObject.rangeCount; i++) {
      const range = selObject.getRangeAt(i)
      if (!doc.contains(range.commonAncestorContainer)) {
        continue
      }
      let block: Element | null = this.blockElement(
        range.startContainer
      ) as Element
      const lastBlock = this.blockElement(range.endContainer) as Element
      blocks.push(block)
      while (block !== lastBlock && block !== null) {
        block = block.nextElementSibling
        blocks.push(block)
      }
    }
    return blocks
  }

  get selectedText(): string {
    const selObject = window.getSelection()
    if (selObject === null) {
      return ''
    }
    return this.selectedBlocks.length ? selObject.toString() : ''
  }

  selectionChange: (event: Event, editor: RichText) => void = () => {
    /* no not care */
  }

  handleSelectChange = (event: Event) => {
    // @ts-expect-error Typescript is wrong about event.target lacking closest
    const select = event.target.closest(XinSelect.tagName) as HTMLSelectElement
    if (select == null) {
      return
    }

    this.doCommand(select.value)
  }

  handleButtonClick = (event: Event) => {
    // @ts-expect-error Typescript is wrong about event.target lacking closest
    const button = event.target.closest('button')
    if (button == null) {
      return
    }

    this.doCommand(button.dataset.command)
  }

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
  ]

  constructor() {
    super()
    this.initAttributes('widgets')
  }

  doCommand(command?: string) {
    if (command === undefined) {
      return
    }
    const args = command.split(',') as string[]

    console.log('execCommand', args[0], false, ...args.slice(1))
    document.execCommand(args[0], false, ...args.slice(1))
  }

  updateBlockStyle() {
    const select = this.parts.toolbar.querySelector(
      '.block-style'
    ) as HTMLSelectElement | null
    if (select === null) {
      return
    }
    let blockTags = (this.selectedBlocks as HTMLElement[]).map(
      (block) => block.tagName
    )
    blockTags = [...new Set(blockTags)]
    select.value = blockTags.length === 1 ? `formatBlock,${blockTags[0]}` : ''
  }

  connectedCallback(): void {
    super.connectedCallback()

    const { doc, content } = this.parts
    if (content.innerHTML !== '' && doc.innerHTML === '') {
      doc.innerHTML = content.innerHTML
      content.innerHTML = ''
    }

    this.isInitialized = true

    content.style.display = 'none'

    document.addEventListener('selectionchange', (event: Event) => {
      this.updateBlockStyle()
      this.selectionChange(event, this)
    })
  }

  render(): void {
    const { toolbar } = this.parts

    super.render()

    if (toolbar.children.length === 0) {
      switch (this.widgets) {
        case 'minimal':
          toolbar.append(...minimalWidgets())
          break
        case 'default':
          toolbar.append(...richTextWidgets())
          break
      }
    }
  }
}

export const richText = RichText.elementCreator({
  tag: 'xin-word',
  styleSpec: {
    ':host': {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    ':host [part="toolbar"]': {
      padding: '4px',
      display: 'flex',
      gap: '0px',
      flex: '0 0 auto',
      flexWrap: 'wrap',
    },
  },
}) as ElementCreator<RichText>
