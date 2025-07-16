/*#
# gamepads

A couple of utility functions for dealing with gamepads and XRInputs.

`gamepadState()` gives you a condensed version of active gamepad state

`gamepadText()` provides the above in minimal text form for debugging

```js
const { elements } = tosijs
const { gamepadText } = tosijsui

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

> This is experimental, the API is changing and stuff doesn't work. Hopefully it
> will become a lot more generally useful once Apple's VisionPro comes out.

`xrControllers(babylonjsXRHelper)` returns an `XinXRControllerMap` structure that tries to
conveniently render the current state of XR controls. (The babylonjs API for this is horrific!)

`xrControllerText(controllerMap)` renders the map output by the above in a compact form
which is useful when debugging.
*/

export interface XinButton {
  index: number
  pressed: boolean
  value: number
}
export interface XinGamepad {
  id: string
  axes: number[]
  buttons: { [key: number]: number }
}

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
          } as XinButton
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

export interface XinXRControllerComponentState {
  pressed: boolean
  axes?: number[]
}

export interface XinXRControllerState {
  [key: string]: XinXRControllerComponentState
}

export interface XinXRControllerMap {
  [key: string]: XinXRControllerState
}

export function xrControllers(xrHelper: any) {
  const controllers = {} as { [key: string]: XinXRControllerState }
  xrHelper.input.onControllerAddedObservable.add((controller: any) => {
    controller.onMotionControllerInitObservable.add((mc: any) => {
      const state = {} as XinXRControllerState
      const componentIds = mc.getComponentIds() as string[]
      componentIds.forEach((componentId) => {
        const component = mc.getComponent(componentId)
        state[componentId] = { pressed: component.pressed as boolean }
        component.onButtonStateChangedObservable.add(() => {
          state[componentId].pressed = component.pressed
        })
        // TODO does this work?! inquiring minds…
        if (component.onAxisValueChangedObservable) {
          state[componentId].axes = [] as number[]
          component.onAxisValueChangedObservable.add((axes: number[]) => {
            state[componentId].axes = axes
          })
        }
      })
      controllers[mc.handedness] = state
    })
  })
  return controllers
}

export function xrControllersText(controllers?: XinXRControllerMap) {
  if (controllers === undefined || Object.keys(controllers).length === 0) {
    return 'no xr inputs'
  }

  return Object.keys(controllers)
    .map((controllerId) => {
      const state = controllers[controllerId] as XinXRControllerState
      const buttonText = Object.keys(state)
        .filter((componentId) => state[componentId].pressed)
        .join(' ')
      return `${controllerId}\n${buttonText}`
    })
    .join('\n')
}
