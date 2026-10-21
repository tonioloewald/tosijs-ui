# notifications

`TosiNotification` provides a singleton custom `<tosi-notification>` element that manages
a list of notifications.

Notifications stack up from the bottom of the screen, newest on top. Up to
`TosiNotification.maxVisible` (3) they sit in a column. Past that, the bottom one becomes the
front of a stack: the older notifications sit underneath it, each one's lower edge showing below
the card in front by `TosiNotification.stackOffsets` (`[16, 8, 4]`, in px: each peeks out half
as far as the last). Any beyond that are hidden until the ones in front are closed. Close the
front card and the next one comes forward.

When more than one notification is showing, a **Dismiss all** button sits centred at the bottom,
over the edges of any stacked cards, outlined in the colour of the most severe notification open,
hidden ones included. It closes every notification,
firing each one's `close` callback as if the user had closed it.

A long message is cut off with an ellipsis after four lines (`--notification-max-lines`), so the
close button always stays in view; the full text is the notification's tooltip, and screen
readers get all of it.

You can post a notification simply with `TosiNotification.post()` or `postNotification()`.

```
interface NotificationSpec {
  message: string
  type?: 'success' | 'info' | 'log' | 'warn' | 'error' | 'progress' // default 'info'
  icon?: SVGElement | string // defaults to an info icon
  duration?: number
  progress?: () => number    // return percentage completion
  close?: () => void
  color?: string             // specify color
}
```

If you provide a `progress` callback (which is assumed to return a number from `0-100`, with
100+ indicating completion) then `TosiNotification` will poll it every second until the
task completes or the notification is closed. Returning 100 or more will automatically close
the notification.

If you configure a notification's `type = "progress"` but don't provide a `progress` callback
then an indefinite `<progress>` element will be displayed.

If you provide a `close` callback, it will be fired if the user closes the notification.

`postNotification` returns a callback function that closes the note programmatically (e.g.
when an operation completes). This will *also* call any `close` callback function you
provided. (The progress demos in the example exercise this functionality.)

```js
import { postNotification, TosiNotification, icons } from 'tosijs-ui'

const form = preview.querySelector('tosi-form')
const submit = preview.querySelector('.submit')
const closeButton = preview.querySelector('.close')

let close
// read the field itself: the form's value omits a field nobody has edited
const maxVisible = () =>
  Number(preview.querySelector('tosi-field[key=maxVisible] input').value) || 3

form.submitCallback = (value, isValid) => {
  if (!isValid) return
  TosiNotification.maxVisible = maxVisible()
  if (value.type.startsWith('progress')) {
    startTime = Date.now()
    const { message, duration, icon } = value
    close = postNotification({
      message,
      type: 'progress',
      icon,
      progress: value.type === 'progress' ? () => (Date.now() - startTime) / (10 * duration) : undefined,
      close: () => { postNotification(`${value.message} cancelled`) },
    })
  } else {
    close = postNotification(value)
  }
  closeButton.disabled = false
}

submit.addEventListener('click', form.submit)
preview.querySelector('.burst').addEventListener('click', () => {
  TosiNotification.maxVisible = maxVisible()
  const types = ['error', 'warn', 'info', 'success', 'log']
  for (let i = 1; i <= 8; i++) {
    postNotification({ message: `Notification ${i} of 8`, type: types[i % types.length] })
  }
})
closeButton.addEventListener('click', () => {
  if (close) {
    close()
  }
})

postNotification({
  message: 'Welcome to tosijs-ui notifications, this message will disappear in 2s',
  duration: 2
})
```
```html
<tosi-form>
  <h3 slot="header">Notification Test</h3>
  <tosi-field caption="Message" key="message" type="string" value="This is a test…"></tosi-field>
  <tosi-field caption="Type" key="type" value="info">
    <tosi-select slot="input"
      options="error,warn,info,success,log,,progress,progress (indefinite)"
    ></tosi-select>
  </tosi-field>
  <tosi-field caption="Icon" key="icon" value="info">
    <tosi-select slot="input"
      options="info,bug,thumbsUp,thumbsDown,message,spin120Loader"
    ></tosi-select>
  </tosi-field>
  <tosi-field caption="Duration" key="duration" type="number" value="2"></tosi-field>
  <tosi-field caption="Max visible" key="maxVisible" type="number" value="3"></tosi-field>
  <button slot="footer" class="close" disabled>Close Last Notification</button>
  <button slot="footer" class="burst">Post 8</button>
  <span slot="footer" class="elastic"></span>
  <button slot="footer" class="submit">Post Notification</button>
</tosi-form>
```
```css
tosi-form {
  height: 100%;
}

tosi-form::part(content) {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  background: var(--background);
}

tosi-form::part(header),
tosi-form::part(footer) {
  background: #eee;
  justify-content: center;
  padding: 10px;
}

tosi-form h3 {
  margin: 0;
}

tosi-form label {
  display: grid;
  grid-template-columns: 120px 1fr;
}
```
```test
test('notification singleton exists', async () => {
  await waitMs(100)
  const notification = document.querySelector('tosi-notification')
  expect(notification).toBeTruthy()
})
test('form renders', () => {
  const form = preview.querySelector('tosi-form')
  expect(form).toBeTruthy()
})
```

## `postNotification(spec: NotificationSpec | string)`

This is simply a wrapper for `TosiNotification.post()`.
