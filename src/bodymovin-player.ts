/*#
# lottie / bodymovin

A [lottie](https://airbnb.io/lottie/#/web) (a.k.a. **bodymovin**) player.

It's designed to work like an `<img>` element (just set its `src` attribute).

```js
import { icons, popFloat, xinSelect } from 'tosijs-ui'
import { div, label, input, select, option, span } from 'tosijs'.elements

const tosiPlatform = preview.querySelector('xin-lottie')
setTimeout(
  () => {
 preview.append(
   popFloat({
     draggable: true,
     content: [
       { class: 'panel' },
       div({ class: 'panel-header' }, 'Player Controls' ),
       label(
         { class: 'no-drag' },
         'speed',
         input({ type: 'range', min: -1, max: 1, step: 0.1, value: 0, onInput(event) {
           const speed = Math.pow(5, Number(event.target.value))
           tosiPlatform.animation.setSpeed(speed)
           event.target.nextSibling.textContent = (speed * 100).toFixed(0) + '%'
         } }),
         span('100%', {style: { textAlign: 'right', width: '40px'}})
       ),
       label(
         { class: 'no-drag' },
         'direction',
         xinSelect({
           value: '1',
           options: [
             { caption: 'Forward', value: '1' },
             { caption: 'Backward', value: '-1' }
           ],
           onChange(event) {
             tosiPlatform.animation.setDirection(event.target.value)
           }
         })
       )
     ],
     target: tosiPlatform,
     position: 's'
   })
 )
  },
  500
)
```
```html
<xin-lottie
  style="width: 200px; height: 200px;"
  src="/tosi-platform.json"
></xin-lottie>
<div class="caption">
  Animation created by <a target="_blank" href="https://pro.fiverr.com/freelancers/anicoremotion">@anicoremotion</a>
</div>
```
```css
.preview {
  padding: var(--spacing);
  text-align: center;
}

.preview .panel {
  padding: 10px;
  border-radius: 5px;
  gap: 5px;
  background: var(--background);
  box-shadow: var(--menu-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview .caption {
  position: absolute;
  right: 5px;
  bottom: 5px;
}

.preview .panel-header {
  margin: 0;
  text-align: center;
  font-weight: bold;
  background: var(--brand-color);
  color: white;
  padding: 5px;
  margin: -10px -10px 0 -10px;
  cursor: move;
}
```

You can also directly set its `json` property to the content of a `lottie.json` file.

And of course just access the element's `animation` property to [use the bodymovin API](https://airbnb.io/lottie/#/web).

Also see the [documentation for advanced interactions](https://lottiefiles.github.io/lottie-docs/advanced_interactions/)
*/

import { Component as WebComponent, ElementCreator } from 'tosijs'
import { scriptTag } from './via-tag'

export interface LottieConfig {
  container?: HTMLElement | ShadowRoot
  renderer: 'svg' | 'canvas' | 'html'
  loop: boolean
  autoplay: boolean
  animationData?: string
  path?: string
  [key: string]: any
}

export class BodymovinPlayer extends WebComponent {
  static initAttributes = {
    src: '',
    json: '',
  }

  content = null
  config: LottieConfig = {
    renderer: 'svg',
    loop: true,
    autoplay: true,
  }

  static bodymovinAvailable?: Promise<any>

  animation: any

  static styleSpec = {
    ':host': {
      width: 400,
      height: 400,
      display: 'inline-block',
    },
  }

  private _loading = false

  get loading(): boolean {
    return this._loading
  }

  constructor() {
    super()
    if (BodymovinPlayer.bodymovinAvailable === undefined) {
      BodymovinPlayer.bodymovinAvailable = scriptTag(
        'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js',
        'bodymovin'
      )
    }
  }

  private readonly doneLoading = (): void => {
    this._loading = false
  }

  private readonly load = ({ bodymovin }: { bodymovin: any }): void => {
    this._loading = true

    this.config.container =
      this.shadowRoot !== null ? this.shadowRoot : undefined
    if (this.json !== '') {
      this.config.animationData = this.json
      delete this.config.path
    } else if (this.src !== '') {
      delete this.config.animationData
      this.config.path = this.src
    } else {
      console.log(
        '%c<xin-lottie>%c expected either %cjson%c (animation data) or %csrc% c(url) but found neither.',
        'color: #44f; background: #fff; padding: 0 5px',
        'color: default',
        'color: #44f; background: #fff; padding: 0 5px',
        'color: default',
        'color: #44f; background: #fff; padding: 0 5px',
        'color: default'
      )
    }

    if (this.animation) {
      this.animation.destroy()
      const root = this.shadowRoot
      if (root !== null) {
        root.querySelector('svg')?.remove()
      }
    }
    this.animation = bodymovin.loadAnimation(this.config)
    this.animation.addEventListener('DOMLoaded', this.doneLoading)
  }

  render(): void {
    super.render()

    BodymovinPlayer.bodymovinAvailable!.then(this.load).catch(
      (e: string): void => {
        console.error(e)
      }
    )
  }
}

export const bodymovinPlayer = BodymovinPlayer.elementCreator({
  tag: 'xin-lottie',
}) as ElementCreator<BodymovinPlayer>
