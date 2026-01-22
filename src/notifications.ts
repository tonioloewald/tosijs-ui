/*#

# notifications

`XinNotification` provides a singleton custom `<xin-notification>` element that manages
a list of notifications.

The notifications are displayed most-recent first. If the notifications would take more than
half the height of the display, they are scrolled.

You can post a notification simply with `XinNotification.post()` or `postNotification()`.

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
100+ indicating completion) then `XinNotification` will poll it every second until the
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

const form = preview.querySelector('xin-form')
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
  console.log(close)
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
<xin-form>
  <h3 slot="header">Notification Test</h3>
  <xin-field caption="Message" key="message" type="string" value="This is a test…"></xin-field>
  <xin-field caption="Type" key="type" value="info">
    <xin-select slot="input"
      options="error,warn,info,success,log,,progress,progress (indefinite)"
    ></xin-select>
  </xin-field>
  <xin-field caption="Icon" key="icon" value="info">
    <xin-select slot="input"
      options="info,bug,thumbsUp,thumbsDown,message"
    ></xin-select>
  </xin-field>
  <xin-field caption="Duration" key="duration" type="number" value="2"></xin-field>
  <button slot="footer" class="close" disabled>Close Last Notification</button>
  <span slot="footer" class="elastic"></span>
  <button slot="footer" class="submit">Post Notification</button>
</xin-form>
```
```css
xin-form {
  height: 100%;
}

xin-form::part(content) {
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  background: var(--background);
}

xin-form::part(header),
xin-form::part(footer) {
  background: #eee;
  justify-content: center;
  padding: 10px;
}

xin-form h3 {
  margin: 0;
}

xin-form label {
  display: grid;
  grid-template-columns: 120px 1fr;
}
```

## `postNotification(spec: NotificationSpec | string)`

This is simply a wrapper for `XinNotification.post()`.
*/

import { Component, elements, vars, ElementCreator } from 'tosijs'
import { icons } from './icons'
import { findHighestZ } from './track-drag'
const { div, button } = elements

interface NotificationSpec {
  message: string
  type?: 'success' | 'info' | 'log' | 'warn' | 'error' | 'progress' // default 'info'
  icon?: SVGElement | string
  duration?: number
  progress?: () => number
  close?: () => void
  color?: string
}

const COLOR_MAP = {
  error: 'red',
  warn: 'orange',
  info: 'royalblue',
  log: 'gray',
  success: 'green',
  progress: 'royalblue',
}

type callback = () => void

export class XinNotification extends Component {
  private static singleton?: XinNotification

  static styleSpec = {
    ':host': {
      _notificationSpacing: 8,
      _notificationWidth: 360,
      _notificationPadding: `${vars.notificationSpacing} ${vars.notificationSpacing50} ${vars.notificationSpacing} ${vars.notificationSpacing200}`,
      _notificationBg: '#fafafa',
      _notificationAccentColor: '#aaa',
      _notificationTextColor: '#444',
      _notificationIconSize: vars.notificationSpacing300,
      _notificationButtonSize: 48,
      _notificationBorderWidth: '3px 0 0',
      _notificationBorderRadius: vars.notificationSpacing50,
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: vars.notificationSpacing,
      width: vars.notificationWidth,
      display: 'flex',
      flexDirection: 'column-reverse',
      margin: '0 auto',
      gap: vars.notificationSpacing,
      maxHeight: '50vh',
      overflow: 'hidden auto',
      boxShadow: 'none !important',
    },
    ':host *': {
      color: vars.notificationTextColor,
    },
    ':host .note': {
      display: 'grid',
      background: vars.notificationBg,
      padding: vars.notificationPadding,
      gridTemplateColumns: `${vars.notificationIconSize} 1fr ${vars.notificationButtonSize}`,
      gap: vars.notificationSpacing,
      alignItems: 'center',
      borderRadius: vars.notificationBorderRadius,
      boxShadow: `0 2px 8px #0006, inset 0 0 0 2px ${vars.notificationAccentColor}`,
      borderColor: vars.notificationAccentColor,
      borderWidth: vars.notificationBorderWidth,
      borderStyle: 'solid',
      transition: '0.5s ease-in',
      transitionProperty: 'margin, opacity',
      zIndex: 1,
    },
    ':host .note .icon': {
      stroke: vars.notificationAccentColor,
    },
    ':host .note button': {
      display: 'flex',
      lineHeight: vars.notificationButtonSize,
      padding: 0,
      margin: 0,
      height: vars.notificationButtonSize,
      width: vars.notificationButtonSize,
      background: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'none',
      border: 'none',
      position: 'relative',
    },
    ':host .note button:hover svg': {
      stroke: vars.notificationAccentColor,
    },
    ':host .note button:active svg': {
      borderRadius: 99,
      stroke: vars.notificationBg,
      background: vars.notificationAccentColor,
      padding: vars.spacing50,
    },
    ':host .note svg': {
      height: vars.notificationIconSize,
      width: vars.notificationIconSize,
      pointerEvents: 'none',
    },
    ':host .message': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: vars.notificationSpacing,
    },
    ':host .note.closing': {
      opacity: 0,
      zIndex: 0,
    },
  }

  static removeNote(note: HTMLElement) {
    note.classList.add('closing')
    note.style.marginBottom = -note.offsetHeight + 'px'
    const remove = () => {
      note.remove()
    }
    note.addEventListener('transitionend', remove)
    setTimeout(remove, 1000)
  }

  static post(spec: NotificationSpec | string): callback {
    const { message, duration, type, close, progress, icon, color } =
      Object.assign(
        { type: 'info', duration: -1 },
        typeof spec === 'string' ? { message: spec } : spec
      )

    if (!this.singleton) {
      this.singleton = xinNotification()
    }

    const singleton = this.singleton as HTMLElement

    document.body.append(singleton)
    singleton.style.zIndex = String(findHighestZ() + 1)

    const _notificationAccentColor = color || COLOR_MAP[type]
    const progressBar =
      progress || type === 'progress' ? elements.progress() : {}
    const closeCallback = () => {
      if (close) {
        close()
      }
      XinNotification.removeNote(note)
    }
    const iconElement: SVGElement =
      icon instanceof SVGElement
        ? icon
        : icon
        ? icons[icon]({ class: 'icon' })
        : icons.info({ class: 'icon' })
    // Use assertive for errors/warnings, polite for info/success
    const isUrgent = type === 'error' || type === 'warn'
    const note = div(
      {
        class: `note ${type}`,
        role: isUrgent ? 'alert' : 'status',
        ariaLive: isUrgent ? 'assertive' : 'polite',
        style: {
          _notificationAccentColor,
        },
      },
      iconElement,
      div({ class: 'message' }, div(message), progressBar),
      button(
        {
          class: 'close',
          title: 'close',
          ariaLabel: 'Close notification',
          // we can't use onClick because this lives inside a shadowDOM
          apply(elt) {
            elt.addEventListener('click', closeCallback)
          },
        },
        icons.x()
      )
    )

    singleton.shadowRoot!.append(note)

    if (
      progressBar instanceof HTMLProgressElement &&
      progress instanceof Function
    ) {
      progressBar.setAttribute('max', String(100))
      progressBar.value = progress()
      const interval = setInterval(() => {
        if (!singleton.shadowRoot!.contains(note)) {
          clearInterval(interval)
          return
        }
        const percentage = progress()
        progressBar.value = percentage
        if (percentage >= 100) {
          XinNotification.removeNote(note)
        }
      }, 1000)
    }

    if (duration > 0) {
      setTimeout(() => {
        XinNotification.removeNote(note)
      }, duration * 1000)
    }

    note.scrollIntoView()

    return closeCallback
  }

  content = null
}

export const xinNotification = XinNotification.elementCreator({
  tag: 'xin-notification',
}) as ElementCreator<XinNotification>

export function postNotification(spec: NotificationSpec | string): callback {
  return XinNotification.post(spec)
}
