import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { MapBox, mapBox } from './mapbox'

/*
#13: <tosi-map> constructed one mapboxgl.Map PER render while mapbox-gl.js was still
loading (this._map isn't assigned until the async CDN promise resolves, so every
render() during that window re-entered the construction branch). A scroll-driven page
writing `coords` each frame stacked 180 maps in one element. The fix guards to one.
*/

describe('MapBox #13 — one map, not one per render during CDN load', () => {
  let container: HTMLElement
  let origAvailable: Promise<any> | undefined
  let origCss: any

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    origAvailable = MapBox.mapboxAvailable
    origCss = (MapBox as any).mapboxCSSAvailable
    // Mark CSS as already loaded so the constructor skips its real CDN scriptTag/
    // styleSheet loads and leaves our controllable mapboxAvailable in place.
    ;(MapBox as any).mapboxCSSAvailable = Promise.resolve()
  })
  afterEach(() => {
    container.remove()
    document.querySelectorAll('tosi-map').forEach((el) => el.remove())
    MapBox.mapboxAvailable = origAvailable
    ;(MapBox as any).mapboxCSSAvailable = origCss
  })

  test('constructs exactly one mapboxgl.Map across a burst of coords-driven renders', async () => {
    let constructed = 0
    let resolveAvailable: (v: { mapboxgl: any }) => void = () => {}
    // A controllable mapboxAvailable that stays PENDING (like a slow CDN) until we resolve.
    MapBox.mapboxAvailable = new Promise((res) => {
      resolveAvailable = res
    })
    const fakeMapboxgl = {
      accessToken: '',
      Map: class {
        constructor() {
          constructed++
        }
        on() {}
        setCenter() {}
        setZoom() {}
        setStyle() {}
        getCenter() {
          return { lat: 0, lng: 0 }
        }
        getZoom() {
          return 0
        }
        resize() {}
      },
    }

    const el = mapBox({ token: 'pk.test', coords: '1,2,3' })
    container.appendChild(el) // hydrates

    // Simulate a scroll controller writing coords every frame while the CDN loads.
    for (let i = 0; i < 50; i++) {
      el.coords = `${i},${i},10`
      ;(el as any).render()
    }

    // The CDN promise is still pending — nothing built yet, but only ONE construction
    // is in flight (the rest bailed on the _mapPending guard).
    expect(constructed).toBe(0)

    resolveAvailable({ mapboxgl: fakeMapboxgl })
    await MapBox.mapboxAvailable
    await Promise.resolve()

    expect(constructed).toBe(1)
  })
})
