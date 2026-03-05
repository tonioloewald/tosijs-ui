/*#
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
*/

export interface TosiButton {
  index: number
  pressed: boolean
  value: number
}
/** @deprecated Use TosiButton instead */
export type XinButton = TosiButton

export interface TosiGamepad {
  id: string
  axes: number[]
  buttons: { [key: number]: number }
}
/** @deprecated Use TosiGamepad instead */
export type XinGamepad = TosiGamepad

export function gamepadState() {
  const gamepads: Gamepad[] = navigator
    .getGamepads()
    .filter((p) => p !== null) as Gamepad[]

  return gamepads.map((p) => {
    const { id, axes, buttons } = p
    return {
      id,
      axes,
      buttons: buttons
        .map((button, index) => {
          const { pressed, value } = button
          return {
            index,
            pressed,
            value,
          } as TosiButton
        })
        .filter((b) => b.pressed || b.value !== 0)
        .reduce((map: { [key: number]: number }, button) => {
          map[button.index] = button.value
          return map
        }, {}),
    }
  })
}

export function gamepadText() {
  const state = gamepadState()
  return state.length === 0
    ? 'no active gamepads'
    : state
        .map(({ id, axes, buttons }) => {
          const axesText = axes.map((a) => a.toFixed(2)).join(' ')
          const buttonText = Object.keys(buttons)
            .map((key) => `[${key}](${buttons[Number(key)].toFixed(2)})`)
            .join(' ')
          return `${id}\n${axesText}\n${buttonText}`
        })
        .join('\n')
}

export interface TosiXRControllerComponentState {
  pressed: boolean
  touched: boolean
  value: number
  axes: { x: number; y: number }
}
/** @deprecated Use TosiXRControllerComponentState instead */
export type XinXRControllerComponentState = TosiXRControllerComponentState

export interface TosiXRControllerState {
  [key: string]: TosiXRControllerComponentState
}
/** @deprecated Use TosiXRControllerState instead */
export type XinXRControllerState = TosiXRControllerState

export interface TosiXRControllerMap {
  [key: string]: TosiXRControllerState
}
/** @deprecated Use TosiXRControllerMap instead */
export type XinXRControllerMap = TosiXRControllerMap

export function xrControllers(xrHelper: any) {
  const controllers = {} as { [key: string]: TosiXRControllerState }
  xrHelper.input.onControllerAddedObservable.add((controller: any) => {
    controller.onMotionControllerInitObservable.add((mc: any) => {
      const state = {} as TosiXRControllerState
      const componentIds = mc.getComponentIds() as string[]
      componentIds.forEach((componentId) => {
        const component = mc.getComponent(componentId)
        state[componentId] = {
          pressed: component.pressed as boolean,
          touched: component.touched as boolean,
          value: component.value as number,
          axes: { x: component.axes.x, y: component.axes.y },
        }
        component.onButtonStateChangedObservable.add(
          (c: { pressed: boolean; touched: boolean; value: number }) => {
            state[componentId].pressed = c.pressed
            state[componentId].touched = c.touched
            state[componentId].value = c.value
          }
        )
        if (component.onAxisValueChangedObservable) {
          component.onAxisValueChangedObservable.add(
            (axes: { x: number; y: number }) => {
              state[componentId].axes = { x: axes.x, y: axes.y }
            }
          )
        }
      })
      controllers[mc.handedness] = state
    })
  })
  return controllers
}

export function xrControllersText(controllers?: TosiXRControllerMap) {
  if (controllers === undefined || Object.keys(controllers).length === 0) {
    return 'no xr inputs'
  }

  return Object.keys(controllers)
    .map((controllerId) => {
      const state = controllers[controllerId] as TosiXRControllerState
      const parts: string[] = []
      for (const [id, comp] of Object.entries(state)) {
        const flags: string[] = []
        if (comp.pressed) flags.push('P')
        if (comp.touched) flags.push('T')
        const hasValue = comp.value > 0
        const hasAxes = comp.axes.x !== 0 || comp.axes.y !== 0
        if (flags.length > 0 || hasValue || hasAxes) {
          let text = `${id}[${flags.join('')}]`
          if (hasValue) text += ` v:${comp.value.toFixed(2)}`
          if (hasAxes)
            text += ` x:${comp.axes.x.toFixed(2)} y:${comp.axes.y.toFixed(2)}`
          parts.push(text)
        }
      }
      return `${controllerId}\n${parts.join('\n') || '(idle)'}`
    })
    .join('\n')
}
