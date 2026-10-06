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
```test
const dialog = preview.querySelector('tosi-dialog')
test('dialog renders', () => {
  expect(dialog).toBeTruthy()
  expect(dialog.tagName.toLowerCase()).toBe('tosi-dialog')
})
test('dialog has header slot content', () => {
  const header = dialog.querySelector('[slot="header"]')
  expect(header).toBeTruthy()
  expect(header.textContent).toBe('A Dialog')
})
```

The dialog always supplies its own **OK** button (`part="ok"`, which closes with
`'confirm'`). Buttons you put in the `footer` slot appear **beside** it, not instead of it, so
add a Cancel button there, not a second OK.

## Closing

Every way a dialog closes — the OK button, `close(reason)`, a background click when
`closeOnBackgroundClick` is set, **Escape**, or a `<form method="dialog">` — goes through the
same path: `dialogWillClose(reason)` is called, the `showModal()` promise resolves with the
reason, and a `removeOnClose` dialog removes itself. Escape closes with `'cancel'`.

`dialogWillClose` can **refuse** a close by returning `false`, or a Promise resolving to
`false`. Use it for a dialog that must not be dismissed while it is busy, such as an async save
in flight. `close()` returns whether the dialog closed, or a Promise of that when
`dialogWillClose` is async.

```typescript
const editor = tosiDialog({
  dialogWillClose: () => !saving, // Escape and Cancel do nothing mid-save
})
```

The browser can close a `<dialog>` without asking (a `<form method="dialog">` submission, or a
repeated Escape without fresh user interaction in Chrome). Those cannot be refused; the dialog
still calls `dialogWillClose` and resolves, so nothing waits forever.

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
