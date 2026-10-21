/*#

# notifications

`TosiNotification` provides a singleton custom `<tosi-notification>` element that manages
a list of notifications.

Notifications stack up from the bottom of the screen, newest on top. Up to
`TosiNotification.maxVisible` (3) they sit in a column. Past that, the bottom one becomes a
stack: the older notifications recede behind it, up and slightly to the right, each peeking out
less than the last, and any beyond `TosiNotification.stackOffsets` (`[8, 6, 4, 2]`, in px) are
hidden until the ones in front are closed. Close the front card and the next one comes forward.

When more than one notification is showing, a **Dismiss all** button sits below the bottom one.
It closes every notification, firing each one's `close` callback as if the user had closed it.

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
*/

/*{ "parent": "Components" }*/

import { Component, elements, vars, varDefault } from 'tosijs'
import { icons } from './icons.js'
import type { IconElement } from './icon-types.js'
import { findHighestZ } from './track-drag.js'
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

export class TosiNotification extends Component {
  static preferredTagName = 'tosi-notification'
  private static singleton?: TosiNotification

  static shadowStyleSpec = {
    ':host': {
      _notificationSpacing: 8,
      _notificationWidth: 360,
      _notificationPadding: `${vars.notificationSpacing} ${vars.notificationSpacing50} ${vars.notificationSpacing} ${vars.notificationSpacing200}`,
      /*
      Follow the THEME, do not hardcode a light palette.

      These were `#fafafa` and `#444`, so a notification on a dark page arrived as a bright
      white card with dark text — the one element in the library that appears unbidden, over
      whatever the user is looking at, was also the one that ignored their theme.

      The literals stay as the FALLBACK, so a page that sets no theme looks exactly as before,
      and `--notification-bg`/`--notification-text-color` still override as they always did.
      */
      _notificationBg: varDefault.background('#fafafa'),
      _notificationAccentColor: '#aaa',
      _notificationTextColor: varDefault.textColor('#444'),
      _notificationIconSize: vars.notificationSpacing300,
      _notificationButtonSize: 48,
      _notificationMaxLines: '4',
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
      // No scrolling: past `maxVisible`, the bottom note becomes a stack (see layout).
      boxShadow: 'none !important',
      color: vars.notificationTextColor,
    },
    ':host .note': {
      display: 'grid',
      background: vars.notificationBg,
      padding: vars.notificationPadding,
      // minmax(0, …): a bare `1fr` grows to fit an unbreakable word and pushes the close
      // button out of the note.
      gridTemplateColumns: `${vars.notificationIconSize} minmax(0, 1fr) ${vars.notificationButtonSize}`,
      gap: vars.notificationSpacing,
      alignItems: 'center',
      borderRadius: vars.notificationBorderRadius,
      boxShadow: `0 2px 8px #0006, inset 0 0 0 2px ${vars.notificationAccentColor}`,
      borderColor: vars.notificationAccentColor,
      borderWidth: vars.notificationBorderWidth,
      borderStyle: 'solid',
      transition: '0.5s ease-in',
      transitionProperty: 'margin, opacity, transform',
      zIndex: 1,
    },
    /*
    The notes behind the bottom one: out of the flow, their tops aligned with the front card's
    and offset up and right by layout().
    */
    ':host .note.stacked': {
      position: 'absolute',
      left: 0,
      right: 0,
      pointerEvents: 'none',
    },
    // Hidden outright, so a pile of subtle shadows does not darken into a smudge.
    ':host .note.buried': {
      visibility: 'hidden',
    },
    ':host .dismiss-all': {
      alignSelf: 'center',
      font: 'inherit',
      fontSize: vars.fontSize75,
      color: vars.notificationTextColor,
      background: vars.notificationBg,
      border: 'none',
      borderRadius: 99,
      padding: `${vars.notificationSpacing50} ${vars.notificationSpacing150}`,
      boxShadow: '0 2px 8px #0006',
      cursor: 'pointer',
    },
    ':host .dismiss-all[hidden]': {
      display: 'none',
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
      color: vars.notificationAccentColor,
    },
    ':host .message': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: vars.notificationSpacing,
      minWidth: 0,
    },
    ':host .text': {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: vars.notificationMaxLines,
      overflow: 'hidden',
      overflowWrap: 'anywhere',
      maxWidth: '100%',
    },
    ':host .note.closing': {
      opacity: 0,
      zIndex: 0,
    },
  }

  /** How many notes are shown in full; older ones stack behind them. */
  static maxVisible = 3
  /**
   * How far (px) each stacked note peeks out beyond the one in front of it, up and to the
   * right. Notes beyond the last offset are hidden.
   */
  static stackOffsets = [8, 6, 4, 2]

  private static closers = new WeakMap<HTMLElement, callback>()

  static removeNote(note: HTMLElement): void {
    if (note.classList.contains('closing')) return
    note.classList.add('closing')
    if (!note.classList.contains('stacked')) {
      note.style.marginBottom = -note.offsetHeight + 'px'
    }
    TosiNotification.singleton?.layout()
    const remove = () => {
      note.remove()
    }
    note.addEventListener('transitionend', remove)
    setTimeout(remove, 1000)
  }

  /** Close every open notification, as if the user had closed each one. */
  static dismissAll(): void {
    const root = TosiNotification.singleton?.shadowRoot
    if (!root) return
    for (const note of root.querySelectorAll<HTMLElement>(
      '.note:not(.closing)'
    )) {
      TosiNotification.closers.get(note)?.()
    }
  }

  /**
   * Lay out the open notes. They are in the DOM oldest first, which `column-reverse` puts at
   * the bottom. Up to `maxVisible` sit in a column. Past that, the newest `maxVisible - 1` stay
   * in the column, the oldest stays at the bottom as the front of a stack, and everything in
   * between recedes behind it.
   */
  layout(): void {
    const root = this.shadowRoot
    if (!root) return
    const notes = [...root.querySelectorAll<HTMLElement>('.note:not(.closing)')]
    const { maxVisible, stackOffsets } = TosiNotification
    const behind =
      notes.length > maxVisible
        ? notes.slice(1, notes.length - Math.max(maxVisible - 1, 0))
        : []
    const front = notes[0]
    for (const note of notes) {
      if (behind.includes(note)) continue
      note.classList.remove('stacked', 'buried')
      note.inert = false
      for (const prop of ['transform', 'z-index', 'bottom', 'margin-top']) {
        note.style.removeProperty(prop)
      }
    }
    const dismiss = root.querySelector<HTMLElement>('.dismiss-all')
    if (dismiss) dismiss.hidden = notes.length < 2
    if (!behind.length) return
    // Distance from the host's bottom edge to the front card's top: it does not move when
    // notes above the front card come and go, because the host grows upward.
    const frontTop = this.clientHeight - front.offsetTop
    let offset = 0
    behind.forEach((note, depth) => {
      const buried = depth >= stackOffsets.length
      if (!buried) offset += stackOffsets[depth]
      note.classList.add('stacked')
      note.classList.toggle('buried', buried)
      note.inert = true
      note.style.bottom = `${frontTop - note.offsetHeight}px`
      note.style.transform = `translate(${offset / 2}px, ${-offset}px)`
      note.style.zIndex = String(-1 - depth)
    })
    // Room above the front card for the cards peeking out behind it.
    front.style.marginTop = `${offset}px`
  }

  static post(spec: NotificationSpec | string): callback {
    const { message, duration, type, close, progress, icon, color } =
      Object.assign(
        { type: 'info', duration: -1 },
        typeof spec === 'string' ? { message: spec } : spec
      )

    if (!this.singleton) {
      this.singleton = tosiNotification()
    }

    const singleton = this.singleton as HTMLElement

    document.body.append(singleton)
    singleton.style.zIndex = String(findHighestZ() + 1)
    const root = singleton.shadowRoot!
    let dismiss = root.querySelector('.dismiss-all')
    if (!dismiss) {
      // First child, so `column-reverse` puts it below the bottom note.
      dismiss = button(
        {
          class: 'dismiss-all',
          hidden: true,
          apply(elt) {
            elt.addEventListener('click', TosiNotification.dismissAll)
          },
        },
        'Dismiss all'
      )
      root.prepend(dismiss)
    }

    const _notificationAccentColor = color || COLOR_MAP[type]
    const progressBar =
      progress || type === 'progress' ? elements.progress() : {}
    const closeCallback = () => {
      if (close) {
        close()
      }
      TosiNotification.removeNote(note)
    }
    const iconElement: IconElement =
      icon instanceof SVGElement ? icon : icon ? icons[icon]() : icons.info()
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
      div(
        { class: 'message' },
        div({ class: 'text', title: message }, message),
        progressBar
      ),
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

    TosiNotification.closers.set(note, closeCallback)
    root.append(note)
    ;(singleton as TosiNotification).layout()

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
          TosiNotification.removeNote(note)
        }
      }, 1000)
    }

    if (duration > 0) {
      setTimeout(() => {
        TosiNotification.removeNote(note)
      }, duration * 1000)
    }

    return closeCallback
  }

  content = null
}

/** @deprecated Use TosiNotification instead */
export type XinNotification = TosiNotification
/** @deprecated Use TosiNotification instead */
export const XinNotification: typeof TosiNotification = TosiNotification

export const tosiNotification = TosiNotification.elementCreator()

/** @deprecated Use tosiNotification instead */
export const xinNotification = tosiNotification

export function postNotification(spec: NotificationSpec | string): callback {
  return TosiNotification.post(spec)
}
