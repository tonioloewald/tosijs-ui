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
export function gamepadState() {
    const gamepads = navigator
        .getGamepads()
        .filter((p) => p !== null);
    return gamepads.map((p) => {
        const { id, axes, buttons } = p;
        return {
            id,
            axes,
            buttons: buttons
                .map((button, index) => {
                const { pressed, value } = button;
                return {
                    index,
                    pressed,
                    value,
                };
            })
                .filter((b) => b.pressed || b.value !== 0)
                .reduce((map, button) => {
                map[button.index] = button.value;
                return map;
            }, {}),
        };
    });
}
export function gamepadText() {
    const state = gamepadState();
    return state.length === 0
        ? 'no active gamepads'
        : state
            .map(({ id, axes, buttons }) => {
            const axesText = axes.map((a) => a.toFixed(2)).join(' ');
            const buttonText = Object.keys(buttons)
                .map((key) => `[${key}](${buttons[Number(key)].toFixed(2)})`)
                .join(' ');
            return `${id}\n${axesText}\n${buttonText}`;
        })
            .join('\n');
}
export function xrControllers(xrHelper) {
    const controllers = {};
    xrHelper.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((mc) => {
            const state = {};
            const componentIds = mc.getComponentIds();
            componentIds.forEach((componentId) => {
                const component = mc.getComponent(componentId);
                state[componentId] = {
                    pressed: component.pressed,
                    touched: component.touched,
                    value: component.value,
                    axes: { x: component.axes.x, y: component.axes.y },
                };
                component.onButtonStateChangedObservable.add((c) => {
                    state[componentId].pressed = c.pressed;
                    state[componentId].touched = c.touched;
                    state[componentId].value = c.value;
                });
                if (component.onAxisValueChangedObservable) {
                    component.onAxisValueChangedObservable.add((axes) => {
                        state[componentId].axes = { x: axes.x, y: axes.y };
                    });
                }
            });
            controllers[mc.handedness] = state;
        });
    });
    return controllers;
}
export function xrControllersText(controllers) {
    if (controllers === undefined || Object.keys(controllers).length === 0) {
        return 'no xr inputs';
    }
    return Object.keys(controllers)
        .map((controllerId) => {
        const state = controllers[controllerId];
        const parts = [];
        for (const [id, comp] of Object.entries(state)) {
            const flags = [];
            if (comp.pressed)
                flags.push('P');
            if (comp.touched)
                flags.push('T');
            const hasValue = comp.value > 0;
            const hasAxes = comp.axes.x !== 0 || comp.axes.y !== 0;
            if (flags.length > 0 || hasValue || hasAxes) {
                let text = `${id}[${flags.join('')}]`;
                if (hasValue)
                    text += ` v:${comp.value.toFixed(2)}`;
                if (hasAxes)
                    text += ` x:${comp.axes.x.toFixed(2)} y:${comp.axes.y.toFixed(2)}`;
                parts.push(text);
            }
        }
        return `${controllerId}\n${parts.join('\n') || '(idle)'}`;
    })
        .join('\n');
}
