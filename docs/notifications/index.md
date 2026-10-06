# notifications

`TosiNotification` provides a singleton custom `<tosi-notification>` element that manages
a list of notifications.

The notifications are displayed most-recent first. If the notifications would take more than
half the height of the display, they are scrolled.

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
import { postNotification, icons } from 'tosijs-ui'

const form = preview.querySelector('tosi-form')
const submit = preview.querySelector('.submit')
const closeButton = preview.querySelector('.close')

let close

form.submitCallback = (value, isValid) => {
  if (!isValid) return
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
  <button slot="footer" class="close" disabled>Close Last Notification</button>
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
