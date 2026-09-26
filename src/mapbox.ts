/*#
# map

A [mapboxgl](https://docs.mapbox.com/mapbox-gl-js/api/) wrapper.

```js
const pickStyle = preview.querySelector('select')
const mapbox = preview.querySelector('tosi-map')
const here = preview.querySelector('button')

pickStyle.addEventListener('change', () => {
  mapbox.mapStyle = pickStyle.value
})

function getUserGPSCoordinates() {
  return new Promise((resolve) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by this browser.");
      resolve(null);
      return;
    }

    // Request position with options
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      // Error callback
      (error) => {
        console.log(`Error getting location: ${error.message}`);
        resolve(null);
      },
      // Options
      {
        enableHighAccuracy: true,  // Request high accuracy if available
        timeout: 10000,            // Time to wait for position (10 seconds)
        maximumAge: 0              // Don't use cached position
      }
    );
  });
}

here.addEventListener('click', async () => {
  const location = await getUserGPSCoordinates()
  if (location) {
    mapbox.coords = `${location.latitude},${location.longitude},12`
  }
})

// The demo token, base64'd — NOT a security measure, and it would be a bad one.
//
// Mapbox `pk.` tokens are PUBLIC BY DESIGN. Mapbox's own docs tell you to put them in your
// client-side JavaScript; that is what they are for, and this one has been in a public repo
// for years without incident. There is nothing here to protect.
//
// What this avoids is a FALSE POSITIVE. The literal `pk.` + base64 shape matches GitHub's
// published secret pattern, so the string in a doc example compiled into `dist/`, inlined
// into `iife.js`, and reached every adopter's sourcemap — and then GitHub push protection
// blocked THEM the first time they committed their built site (tosijs-ui#145). A wall with
// someone else's name on it, over a token that was never secret.
//
// Not a pattern to copy for anything that IS secret: `atob()` protects nothing from anyone,
// which is exactly why it suits a value that needs no protection and only needs to stop
// matching a regex.
//
// LINE comments, deliberately. A block comment inside a doc comment ends the DOC comment at
// its first close token, silently truncating the page and dropping the rest of the file into
// code. Note that this warning cannot spell the token out either, for the same reason —
// which is how it got written three times (tosijs-ui#142 reports the identical experience).
const DEMO_TOKEN = atob(
  'cGsuZXlKMUlqb2ljRzlrY0dWeWMyOXVJaXdpWVNJNkltTnFjMkpsYldVMGJqQTFabVkwWVc1eWNIWm9kM1ZoYldjaWZRLmFydnFmcE9xTWdGWWtLZ1EzNVVTY0E='
)
mapbox.token = DEMO_TOKEN
```
```html
<tosi-map
  style="width: 100%; height: 100%"
  coords="14.0093606,120.995083,17"
  map-style="mapbox://styles/mapbox/streets-v12"
></tosi-map>
<select>
  <option selected value="mapbox://styles/mapbox/streets-v12">Streets</option>
  <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
  <option value="mapbox://styles/mapbox/light-v11">Light</option>
  <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
  <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
</select>
<button>
  <tosi-icon icon="mapPin"></tosi-icon>
  <span>Your Location</span>
</button>
```
```css
.preview button {
  position: absolute;
  right: 10px;
  top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.preview select {
  position: absolute;
  bottom: 10px;
  right: 10px;
}
```

There's no need to learn new APIs or write wrappers, just access the element's `map` property
and [use the standard mapbox APIs directly](https://docs.mapbox.com/api/maps/styles/).

## Form Integration

**You need your own token.** Get a public (`pk.`) one from
[account.mapbox.com](https://account.mapbox.com/access-tokens/) and set it as the `token`
attribute or the `.token` property. Restrict it to your domains while you are there — not
because it is secret (it is not; Mapbox tokens are public by design and belong in your
client-side code) but because it bills to whoever owns it.

The demos on this page assign a token programmatically, base64'd. That is **not** security and
would be a poor imitation of it — it stops the literal `pk.eyJ…` string matching GitHub's
published secret pattern, which is a false positive on a value that was never secret. It had
to stop matching because a doc example compiles into `dist/`, inlines into `iife.js`, and
lands in every adopter's sourcemap — so **GitHub push protection blocked adopters** the first
time they committed their built site (tosijs-ui#145). A wall with someone else's name on it.

`<tosi-map>` is form-associated, making it useful as a location picker in forms:

```html
<form class="map-form">
  <label>
    <b>Select your location:</b>
    <tosi-map
      name="location"
      style="width: 100%; height: 200px"
      coords="40.7128,-74.0060,10"
    ></tosi-map>
  </label>
  <button type="submit">Submit Location</button>
  <button type="reset">Reset</button>
  <span class="output"></span>
</form>
```
```css
.preview .map-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview .map-form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
```
```js
// Same public demo token as the example above — see the note about why it is base64'd.
preview.querySelector('tosi-map').token = atob(
  'cGsuZXlKMUlqb2ljRzlrY0dWeWMyOXVJaXdpWVNJNkltTnFjMkpsYldVMGJqQTFabVkwWVc1eWNIWm9kM1ZoYldjaWZRLmFydnFmcE9xTWdGWWtLZ1EzNVVTY0E='
)

const form = preview.querySelector('.map-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Location: ' + data.get('location')
})
```
*/

/*{ "parent": "Components" }*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  withAttributes,
} from 'tosijs'
import { styleSheet, scriptTag } from './via-tag.js'

const { div } = elements

export class MapBox extends withAttributes({
  coords: '65.01715565258993,25.48081004203459,12',
  token: '',
  mapStyle: 'mapbox://styles/mapbox/streets-v12',
  name: '',
}) {
  static preferredTagName = 'tosi-map'
  static formAssociated = true

  // value is the coordinates string for form submission
  value = ''

  // Form lifecycle callbacks
  formDisabledCallback(disabled: boolean) {
    void disabled
  }

  formResetCallback() {
    this.value = ''
    this.coords = '65.01715565258993,25.48081004203459,12'
  }

  content = div({ style: { width: '100%', height: '100%' } })
  get map(): any {
    return this._map
  }

  static mapboxCSSAvailable: Promise<void>
  static mapboxAvailable?: Promise<any>

  private _map: any
  // True while the (async, CDN-loaded) mapboxgl.Map is being constructed. `_map`
  // isn't assigned until mapboxAvailable resolves, so without this a render() per
  // `coords` write during that window starts a NEW map each time (#13). Guards to one.
  private _mapPending = false

  static shadowStyleSpec = {
    ':host': {
      display: 'inline-block',
      position: 'relative',
      width: '400px',
      height: '400px',
      textAlign: 'left',
    },
  }

  constructor() {
    super()
    if (MapBox.mapboxCSSAvailable === undefined) {
      MapBox.mapboxCSSAvailable = styleSheet(
        'https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css'
      ).catch((e) => {
        console.error('failed to load mapbox-gl.css', e)
      })
      MapBox.mapboxAvailable = scriptTag(
        'https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js'
      ).catch((e) => {
        console.error('failed to load mapbox-gl.js', e)
      })
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.token) {
      console.error(
        '<tosi-map> needs a Mapbox access token: <tosi-map token="pk.…">, or set ' +
          '`element.token`. Get a free one at https://account.mapbox.com/access-tokens/ — ' +
          'it is a PUBLIC (`pk.`) token and is meant to be visible in client code, but it ' +
          'bills to whoever owns it, so use your own and restrict it to your domains.'
      )
    }
  }

  private _lastCoords = ''
  private _lastStyle = ''

  render(): void {
    super.render()

    if (!this.token) {
      return
    }

    // If map exists, just update position/style if changed
    if (this._map) {
      if (this.coords !== this._lastCoords) {
        const [long, lat, zoom] = this.coords
          .split(',')
          .map((x: string) => Number(x))
        this._map.setCenter([lat, long])
        this._map.setZoom(zoom)
        this._lastCoords = this.coords
      }
      if (this.mapStyle !== this._lastStyle) {
        this._map.setStyle(this.mapStyle)
        this._lastStyle = this.mapStyle
      }
      return
    }

    // No map yet, and mapboxAvailable is async — build exactly one. A construction
    // already in flight bails here, so a burst of `coords` writes during the CDN
    // load can't stack a map per render (#13).
    if (this._mapPending) return
    this._mapPending = true

    const { div } = this.parts

    MapBox.mapboxAvailable!.then(({ mapboxgl }: { mapboxgl: any }) => {
      console.log(
        "%cmapbox may complain about missing css -- don't panic!",
        'background: orange; color: black; padding: 0 5px;'
      )
      // Read coords/style NOW, not at the first render — a scroll-driven page may
      // have written a new position while the CDN script was loading.
      const [long, lat, zoom] = this.coords
        .split(',')
        .map((x: string) => Number(x))
      mapboxgl.accessToken = this.token
      this._map = new mapboxgl.Map({
        container: div,
        style: this.mapStyle,
        zoom,
        center: [lat, long],
      })
      this._lastCoords = this.coords
      this._lastStyle = this.mapStyle
      this._mapPending = false

      this._map.on('render', () => this._map.resize())

      // Update value when map is moved (for form integration)
      this._map.on('moveend', () => {
        const center = this._map.getCenter()
        const currentZoom = this._map.getZoom()
        const newValue = `${center.lat.toFixed(6)},${center.lng.toFixed(
          6
        )},${currentZoom.toFixed(1)}`
        if (newValue !== this.value) {
          // Update form value directly
          if (this.internals) {
            this.internals.setFormValue(newValue)
          }
        }
      })
    }).catch((err: unknown) => {
      // CDN load / construction failed — clear the flag so a later render can retry
      // rather than leaving the element permanently unable to build its map.
      this._mapPending = false
      console.error('tosi-map: mapbox failed to load', err)
    })
  }
}

export const mapBox = MapBox.elementCreator() as ElementCreator<MapBox>
