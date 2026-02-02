/*#
# map

A [mapboxgl](https://docs.mapbox.com/mapbox-gl-js/api/) wrapper.

```js
const pickStyle = preview.querySelector('select')
const mapbox = preview.querySelector('xin-map')
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
```
```html
<!-- please don't abuse my mapbox token -->
<xin-map
  style="width: 100%; height: 100%"
  coords="14.0093606,120.995083,17"
  token="pk.eyJ1IjoicG9kcGVyc29uIiwiYSI6ImNqc2JlbWU0bjA1ZmY0YW5ycHZod3VhbWcifQ.arvqfpOqMgFYkKgQ35UScA"
  map-style="mapbox://styles/mapbox/streets-v12"
></xin-map>
<select>
  <option selected value="mapbox://styles/mapbox/streets-v12">Streets</option>
  <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
  <option value="mapbox://styles/mapbox/light-v11">Light</option>
  <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
  <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
</select>
<button>
  <xin-icon icon="mapPin"></xin-icon>
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

`<xin-map>` is form-associated, making it useful as a location picker in forms:

```html
<form class="map-form">
  <label>
    <b>Select your location:</b>
    <xin-map
      name="location"
      style="width: 100%; height: 200px"
      coords="40.7128,-74.0060,10"
      token="pk.eyJ1IjoicG9kcGVyc29uIiwiYSI6ImNqc2JlbWU0bjA1ZmY0YW5ycHZod3VhbWcifQ.arvqfpOqMgFYkKgQ35UScA"
    ></xin-map>
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
const form = preview.querySelector('.map-form')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const data = new FormData(form)
  form.querySelector('.output').textContent = 'Location: ' + data.get('location')
})
```
*/

import { Component as WebComponent, ElementCreator, elements } from 'tosijs'
import { styleSheet, scriptTag } from './via-tag'

const { div } = elements

export class MapBox extends WebComponent {
  static formAssociated = true

  static initAttributes = {
    coords: '65.01715565258993,25.48081004203459,12',
    token: '',
    mapStyle: 'mapbox://styles/mapbox/streets-v12',
    name: '',
  }

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

  static styleSpec = {
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
        'mapbox requires an access token which you can provide via the token attribute'
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

    const { div } = this.parts

    const [long, lat, zoom] = this.coords
      .split(',')
      .map((x: string) => Number(x))

    this._lastCoords = this.coords
    this._lastStyle = this.mapStyle

    MapBox.mapboxAvailable!.then(({ mapboxgl }: { mapboxgl: any }) => {
      console.log(
        "%cmapbox may complain about missing css -- don't panic!",
        'background: orange; color: black; padding: 0 5px;'
      )
      mapboxgl.accessToken = this.token
      this._map = new mapboxgl.Map({
        container: div,
        style: this.mapStyle,
        zoom,
        center: [lat, long],
      })

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
    })
  }
}

export const mapBox = MapBox.elementCreator({
  tag: 'xin-map',
}) as ElementCreator<MapBox>
