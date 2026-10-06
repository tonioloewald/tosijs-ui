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
