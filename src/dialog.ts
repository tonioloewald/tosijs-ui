/*#
# dialog

`<tosi-dialog>` is a simple wrapper around the standard HTML `<dialog>` element designed
to make creating dialogs as convenient as possible.

```html
<button>Show Dialog</button>
<tosi-dialog>
  <h3 slot='header'>A Dialog</h3>
  <p>
    Here is some text
  </p>
  <button slot="footer">Custom Button</button>
</tosi-dialog>
```
```js
import { on } from 'tosijs'
import { postNotification } from 'tosijs-ui'

on(
  preview.querySelector('button'),
  'click',
  async () => {
    const response = await preview.querySelector('tosi-dialog').showModal()
    postNotification({
      message: `user clicked ${response}`,
      duration: 2
    })
  }
)
```

## Static Functions

`TosiDialog` provides static async functions to replace the built-in dialogs provided by
the browser.

- `alert(message: string, title = 'Alert'): Promise<undefined>`
- `confirm(message: string, title = 'Confirm'): Promise<boolean>`
- `prompt(message: string, title = 'Prompt', currentValue = ''): Promise<string | null> `

You can look at the code that implements them to see how to leverage `TosiDialog` to build
more complex, bespoke dialogs that can be used just as conveniently.

```js
import { elements } from 'tosijs'
import { TosiDialog, postNotification } from 'tosijs-ui'

const { button, div } = elements

preview.append(
  div(
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10
      }
    },
    button(
      {
        async onClick() {
          await TosiDialog.alert('This is an alert')
          postNotification({
            message: 'alert dismissed',
            duration: 2
          })
        }
      },
      'TosiDialog.alert',
    ),
    button(
      {
        async onClick() {
          const confirmed = await TosiDialog.confirm('Can you confirm?')
          postNotification({
            message: `user ${confirmed ? 'confirmed' : 'cancelled'}`,
            duration: 2
          })
        }
      },
      'TosiDialog.confirm',
    ),
    button(
      {
        async onClick() {
          const text = await TosiDialog.prompt('Enter some text please')
          postNotification({
            message: text !== null ? `user entered "${text}"`: 'user cancelled',
            duration: 2
          })
        }
      },
      'TosiDialog.prompt',
    ),
  ),
)
```
```css
.preview {
  padding: 10px;
}
```

*/
import { Component, PartsMap, elements, on, vars, varDefault } from 'tosijs'
import { findHighestZ } from './track-drag'

const { dialog, button, header, footer, xinSlot, h3, p, label, input, div } =
  elements

interface DialogParts extends PartsMap {
  dialog: HTMLDialogElement
  ok: HTMLButtonElement
}

export class TosiDialog extends Component<DialogParts> {
  static async alert(message: string, title = 'Alert'): Promise<void> {
    return new Promise((resolve) => {
      const alertDialog = tosiDialog(
        {
          removeOnClose: true,
          closeOnBackgroundClick: true,
          dialogWillClose() {
            resolve()
          },
        },
        h3({ slot: 'header' }, title),
        message.includes('\n')
          ? elements.pre(
              { style: { whiteSpace: 'pre-wrap', margin: 0 } },
              message
            )
          : p(message)
      )
      document.body.append(alertDialog)
      alertDialog.showModal()
    })
  }

  static async confirm(message: string, title = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmDialog = tosiDialog(
        {
          removeOnClose: true,
          dialogWillClose(reason?: string) {
            resolve(reason === 'confirm')
          },
        },
        h3({ slot: 'header' }, title),
        p(message),
        button(
          {
            slot: 'footer',
            onClick() {
              confirmDialog.close()
            },
          },
          'Cancel'
        )
      )
      document.body.append(confirmDialog)
      confirmDialog.showModal()
    })
  }

  static async prompt(
    message: string,
    title = 'Prompt',
    currentValue = ''
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const inputField = input({ value: currentValue })
      const promptDialog = tosiDialog(
        {
          removeOnClose: true,
          dialogWillClose(reason?: string) {
            resolve(reason === 'confirm' ? inputField.value : null)
          },
          initialFocus() {
            inputField.focus()
          },
        },
        h3({ slot: 'header' }, title),
        p(
          label(
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 5,
              },
            },
            div(message),
            inputField
          )
        ),
        button(
          {
            slot: 'footer',
            onClick() {
              promptDialog.close()
            },
          },
          'Cancel'
        )
      )
      document.body.append(promptDialog)
      promptDialog.showModal()
    })
  }

  static initAttributes = {
    removeOnClose: false,
    closeOnBackgroundClick: false,
  }

  constructor() {
    super()
    on(this, 'click', () => {
      if (this.closeOnBackgroundClick) {
        this.close()
      }
    })
  }

  dialogWillClose = (reason = 'cancel') => {
    console.log('dialog will close with', reason)
  }

  initialFocus() {
    this.parts.ok.focus()
  }

  #modalResolution = (_outcome: string | null) => {
    /* noop */
  }

  showModal = (): Promise<string | null> => {
    this.style.zIndex = String(findHighestZ())
    return new Promise((resolve) => {
      this.#modalResolution = resolve
      this.parts.dialog.showModal()
      requestAnimationFrame(() => {
        this.initialFocus()
      })
    })
  }

  close = (reason = 'cancel') => {
    this.dialogWillClose(reason)
    this.#modalResolution(reason)
    this.parts.dialog.close()
    if (this.removeOnClose) {
      this.remove()
    }
  }

  ok = () => {
    this.close('confirm')
  }

  content = () =>
    dialog(
      { part: 'dialog' },
      header(xinSlot({ name: 'header' })),
      xinSlot(),
      footer(
        xinSlot({ name: 'footer' }),
        button({ part: 'ok', onClick: this.ok }, 'OK')
      )
    )
}

export const tosiDialog = TosiDialog.elementCreator({
  tag: 'tosi-dialog',
  styleSpec: {
    ':host > dialog::backdrop': {
      backdropFilter: 'blur(8px)',
    },
    ':host > dialog:not([open])': {
      display: 'none',
    },
    ':host > dialog[open]': {
      minWidth: 300,
      border: 0,
      borderRadius: 10,
      overflow: 'hidden',
      maxHeight: 'calc(100% - 20px)',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      _dialogShadow: varDefault.menuShadow('0 5px 10px #0004'),
      _dialogBackground: varDefault.background('#fafafa'),
      _dialogColor: varDefault.textColor('#222'),
      boxShadow: vars.dialogShadow,
      background: vars.dialogBackground,
      color: vars.dialogColor,
    },
    ':host > dialog > *': {
      padding: '0 20px',
    },
    ':host > dialog > header': {
      display: 'flex',
      justifyContent: 'center',
      gap: 10,
    },
    ':host > dialog > footer': {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      paddingBottom: 20,
    },
  },
})
