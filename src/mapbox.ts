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
*/

import { Component as WebComponent, ElementCreator, elements } from 'xinjs'
import { styleSheet, scriptTag } from './via-tag'

const { div } = elements

export class MapBox extends WebComponent {
  coords = '65.01715565258993,25.48081004203459,12'
  content = div({ style: { width: '100%', height: '100%' } })
  get map(): any {
    return this._map
  }
  mapStyle = 'mapbox://styles/mapbox/streets-v12'
  token = ''

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
    this.initAttributes('coords', 'token', 'mapStyle')

    if (MapBox.mapboxCSSAvailable === undefined) {
      MapBox.mapboxCSSAvailable = styleSheet(
        'https://api.mapbox.com/mapbox-gl-js/v1.4.1/mapbox-gl.css'
      ).catch((e) => {
        console.error('failed to load mapbox-gl.css', e)
      })
      MapBox.mapboxAvailable = scriptTag(
        'https://api.mapbox.com/mapbox-gl-js/v1.4.1/mapbox-gl.js'
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

  render(): void {
    super.render()

    if (!this.token) {
      return
    }

    const { div } = this.parts

    const [long, lat, zoom] = this.coords.split(',').map((x) => Number(x))

    if (this.map) {
      this.map.remove()
    }

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
    })
  }
}

export const mapBox = MapBox.elementCreator({
  tag: 'xin-map',
}) as ElementCreator<MapBox>
