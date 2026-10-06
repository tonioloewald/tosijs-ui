# gamepads

A couple of utility functions for dealing with gamepads and XRInputs.

`gamepadState()` gives you a condensed version of active gamepad state

`gamepadText()` provides the above in minimal text form for debugging

```js
import { elements } from 'tosijs'
import { gamepadText } from 'tosijs-ui'

const pre = elements.pre()
preview.append(pre)

const interval = setInterval(() => {
  if (!pre.closest('body')) {
    clearInterval(interval)
  } else {
    pre.textContent = gamepadText()
  }
}, 100)
```

## XRInput Devices

`xrControllers(babylonjsXRHelper)` returns a `TosiXRControllerMap` that tracks
the current state of XR controllers — button presses, analog values, touch state,
and thumbstick axes. It subscribes to BabylonJS `onButtonStateChangedObservable`
and `onAxisValueChangedObservable` events so the map stays current.

`xrControllersText(controllerMap)` renders the map in a compact debug format
showing active inputs with their flags (P=pressed, T=touched), analog values,
and axis positions.
