/*#

# notifications

`TosiNotification` provides a singleton custom `<tosi-notification>` element that manages
a list of notifications.

Notifications stack up from the bottom of the screen, newest on top. Up to
`TosiNotification.maxVisible` (3) they sit in a column. Past that, the newest three stay in view
and the lowest of them becomes the front of a stack: older notifications sit underneath it,
newest first, each one's lower edge showing below
the card in front by `TosiNotification.stackOffsets` (`[16, 8, 4]`, in px: each peeks out half
as far as the last). Any beyond that are hidden until the ones in front are closed. Close the
front card and the next one comes forward.

When more than one notification is showing, a **Dismiss all** button sits centred at the bottom,
over the edges of any stacked cards, outlined in the colour of the most severe notification open,
hidden ones included. It closes every notification, firing each one's `close` callback as if the
user had closed it; `TosiNotification.dismissAll()` does the same from code.

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
import { Component, elements, vars, varDefault } from 'tosijs';
import { icons } from './icons.js';
import { findHighestZ } from './track-drag.js';
const { div, button } = elements;
const COLOR_MAP = {
    error: 'red',
    warn: 'orange',
    info: 'royalblue',
    log: 'gray',
    success: 'green',
    progress: 'royalblue',
};
/** How long a closing note fades in place before the others move. */
const FADE_MS = 150;
/** How long the others take to move to their new places. */
const MOVE_MS = 200;
const nextFrame = (fn) => typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(fn)
    : setTimeout(fn, 16);
/** How much a note's type demands attention, for the Dismiss all button's outline. */
const SEVERITY = {
    error: 4,
    warn: 3,
    progress: 2,
    info: 2,
    success: 1,
    log: 0,
};
const severity = (note) => Math.max(0, ...[...note.classList].map((name) => SEVERITY[name] ?? 0));
export class TosiNotification extends Component {
    static preferredTagName = 'tosi-notification';
    static singleton;
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
            /*
            Only arriving and leaving animate. Restacking (a card moving into or out of the stack, the
            room under the front card) used to transition too, and every post or close slid cards in
            from wherever their last offset left them.
            */
            animation: 'tosi-note-in 0.2s ease-out',
            zIndex: 1,
        },
        /*
        The notes behind the bottom one: out of the flow, their bottoms aligned with the front
        card's and offset down by layout().
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
            // Above the stacked cards' edges, which it overlaps.
            position: 'relative',
            zIndex: 2,
            font: 'inherit',
            fontSize: vars.fontSize75,
            color: vars.notificationTextColor,
            background: vars.notificationBg,
            border: 'none',
            borderRadius: 99,
            padding: `${vars.notificationSpacing50} ${vars.notificationSpacing150}`,
            boxShadow: `0 2px 8px #0006, inset 0 0 0 2px ${vars.notificationAccentColor}`,
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
            pointerEvents: 'none',
            transition: `opacity ${FADE_MS}ms ease-in`,
        },
        '@keyframes tosi-note-in': {
            from: { opacity: '0' },
            to: { opacity: '1' },
        },
    };
    /** How many notes are shown in full; older ones stack behind them. */
    static maxVisible = 3;
    /**
     * How far (px) each stacked note peeks out below the one in front of it. Notes beyond the last
     * offset are hidden.
     */
    static stackOffsets = [16, 8, 4];
    static closers = new WeakMap();
    /*
    Closing is two steps, so that nothing moves twice. The note fades where it is, keeping its
    place; then it leaves, the stack is laid out once, and everything that changed place glides
    there from where it was (FLIP). Collapsing the note while restacking at once made cards pop up
    and slide back, and left the stack hanging where the old front card had been.
  
    Notes that finish fading in the same frame (Dismiss all) leave together, in one move.
    */
    static leaving = new Set();
    static removeNote(note) {
        if (note.classList.contains('closing'))
            return;
        note.classList.add('closing');
        setTimeout(() => {
            const first = TosiNotification.leaving.size === 0;
            TosiNotification.leaving.add(note);
            if (!first)
                return;
            nextFrame(() => {
                const notes = [...TosiNotification.leaving];
                TosiNotification.leaving.clear();
                const singleton = TosiNotification.singleton;
                if (singleton)
                    singleton.moveTo(() => notes.forEach((n) => n.remove()));
                else
                    notes.forEach((n) => n.remove());
            });
        }, FADE_MS);
    }
    /**
     * Apply `change`, lay out, and animate every note (and the Dismiss all button) from where it
     * was to where it now is. A note coming out of hiding fades in.
     */
    moveTo(change) {
        const root = this.shadowRoot;
        if (!root)
            return change();
        const selector = '.note:not(.closing), .dismiss-all';
        const before = new Map();
        const hidden = new Set();
        for (const el of root.querySelectorAll(selector)) {
            before.set(el, el.getBoundingClientRect().top);
            if (el.classList.contains('buried') || el.hidden)
                hidden.add(el);
        }
        change();
        this.layout();
        for (const el of root.querySelectorAll(selector)) {
            const was = before.get(el);
            if (was === undefined || typeof el.animate !== 'function')
                continue;
            if (hidden.has(el)) {
                if (!el.classList.contains('buried') && !el.hidden)
                    el.animate([{ opacity: 0 }, { opacity: 1 }], MOVE_MS);
                continue;
            }
            const dy = was - el.getBoundingClientRect().top;
            if (Math.abs(dy) < 0.5)
                continue;
            const settled = el.style.transform;
            el.animate([
                { transform: `translateY(${dy}px) ${settled}` },
                { transform: settled || 'none' },
            ], { duration: MOVE_MS, easing: 'ease-out' });
        }
    }
    /** Close every open notification, as if the user had closed each one. */
    static dismissAll() {
        const root = TosiNotification.singleton?.shadowRoot;
        if (!root)
            return;
        for (const note of root.querySelectorAll('.note:not(.closing)')) {
            TosiNotification.closers.get(note)?.();
        }
    }
    /**
     * Lay out the open notes. They are in the DOM oldest first, which `column-reverse` puts at
     * the bottom, so the newest is on top. The newest `maxVisible` sit in a column; the lowest of
     * them is the front of a stack, with every older note behind it, newest first.
     */
    layout() {
        const root = this.shadowRoot;
        if (!root)
            return;
        const notes = [...root.querySelectorAll('.note:not(.closing)')];
        const { maxVisible, stackOffsets } = TosiNotification;
        // The newest `maxVisible` stay in the column; the oldest of them is the front of the stack,
        // and everything older sits behind it, newest first.
        const visible = Math.max(maxVisible, 1);
        const split = Math.max(notes.length - visible, 0);
        const behind = notes.slice(0, split).reverse();
        const stacked = new Set(behind);
        const front = notes[split];
        for (const note of notes) {
            note.style.removeProperty('margin-bottom');
            if (stacked.has(note))
                continue;
            note.classList.remove('stacked', 'buried');
            note.inert = false;
            for (const prop of ['transform', 'z-index', 'bottom']) {
                note.style.removeProperty(prop);
            }
        }
        const dismiss = root.querySelector('.dismiss-all');
        if (dismiss) {
            dismiss.hidden = notes.length < 2;
            let worst;
            let worstSeverity = -1;
            for (const note of notes) {
                const level = severity(note);
                if (level > worstSeverity)
                    [worst, worstSeverity] = [note, level];
            }
            if (worst)
                dismiss.style.setProperty('--notification-accent-color', worst.style.getPropertyValue('--notification-accent-color'));
        }
        if (!behind.length) {
            dismiss?.style.removeProperty('margin-top');
            return;
        }
        const depthShown = Math.min(behind.length, stackOffsets.length);
        const room = stackOffsets
            .slice(0, depthShown)
            .reduce((sum, step) => sum + step, 0);
        // Room below the front card for the cards peeking out from under it, which the Dismiss all
        // button then rides up over.
        front.style.marginBottom = `${room}px`;
        dismiss?.style.setProperty('margin-top', `${-room}px`);
        // Out of the flow before measuring: a note just pushed into the stack still takes room.
        for (const note of behind)
            note.classList.add('stacked');
        // Distance from the host's bottom edge to the front card's bottom: it does not move when
        // notes above the front card come and go, because the host grows upward.
        const frontBottom = this.clientHeight - front.offsetTop - front.offsetHeight;
        let offset = 0;
        behind.forEach((note, depth) => {
            const buried = depth >= stackOffsets.length;
            if (!buried)
                offset += stackOffsets[depth];
            note.classList.add('stacked');
            note.classList.toggle('buried', buried);
            note.inert = true;
            note.style.bottom = `${frontBottom}px`;
            note.style.transform = `translateY(${offset}px)`;
            note.style.zIndex = String(-1 - depth);
        });
    }
    static post(spec) {
        const { message, duration, type, close, progress, icon, color } = Object.assign({ type: 'info', duration: -1 }, typeof spec === 'string' ? { message: spec } : spec);
        if (!this.singleton) {
            this.singleton = tosiNotification();
        }
        const singleton = this.singleton;
        document.body.append(singleton);
        singleton.style.zIndex = String(findHighestZ() + 1);
        const root = singleton.shadowRoot;
        let dismiss = root.querySelector('.dismiss-all');
        if (!dismiss) {
            // First child, so `column-reverse` puts it below the bottom note.
            dismiss = button({
                class: 'dismiss-all',
                hidden: true,
                apply(elt) {
                    elt.addEventListener('click', TosiNotification.dismissAll);
                },
            }, 'Dismiss all');
            root.prepend(dismiss);
        }
        const _notificationAccentColor = color || COLOR_MAP[type];
        const progressBar = progress || type === 'progress' ? elements.progress() : {};
        const closeCallback = () => {
            if (close) {
                close();
            }
            TosiNotification.removeNote(note);
        };
        const iconElement = icon instanceof SVGElement ? icon : icon ? icons[icon]() : icons.info();
        // Use assertive for errors/warnings, polite for info/success
        const isUrgent = type === 'error' || type === 'warn';
        const note = div({
            class: `note ${type}`,
            role: isUrgent ? 'alert' : 'status',
            ariaLive: isUrgent ? 'assertive' : 'polite',
            style: {
                _notificationAccentColor,
            },
        }, iconElement, div({ class: 'message' }, div({ class: 'text', title: message }, message), progressBar), button({
            class: 'close',
            title: 'close',
            ariaLabel: 'Close notification',
            // we can't use onClick because this lives inside a shadowDOM
            apply(elt) {
                elt.addEventListener('click', closeCallback);
            },
        }, icons.x()));
        TosiNotification.closers.set(note, closeCallback);
        singleton.moveTo(() => root.append(note));
        if (progressBar instanceof HTMLProgressElement &&
            progress instanceof Function) {
            progressBar.setAttribute('max', String(100));
            progressBar.value = progress();
            const interval = setInterval(() => {
                if (!singleton.shadowRoot.contains(note)) {
                    clearInterval(interval);
                    return;
                }
                const percentage = progress();
                progressBar.value = percentage;
                if (percentage >= 100) {
                    TosiNotification.removeNote(note);
                }
            }, 1000);
        }
        if (duration > 0) {
            setTimeout(() => {
                TosiNotification.removeNote(note);
            }, duration * 1000);
        }
        return closeCallback;
    }
    content = null;
}
/** @deprecated Use TosiNotification instead */
export const XinNotification = TosiNotification;
export const tosiNotification = TosiNotification.elementCreator();
/** @deprecated Use tosiNotification instead */
export const xinNotification = tosiNotification;
export function postNotification(spec) {
    return TosiNotification.post(spec);
}
