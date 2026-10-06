# hash-state

<!--{ "parent": "Helper Libraries" }-->

Key-value state in the page's URL hash: shareable, bookmarkable, and back/forward work
without you writing any of it.

```js
import { hashState } from 'tosijs-ui'
import { elements } from 'tosijs'
const { div, input, button, pre } = elements

const filters = hashState({ namespace: 'demo' })

const search = input({
  placeholder: 'search…',
  onInput(event) {
    filters.set('q', event.target.value)
  },
})
const shown = pre()
const show = () => {
  search.value = filters.get('q') ?? ''
  shown.textContent = `${JSON.stringify(filters.values)}\n${location.hash || '(no hash)'}`
}
filters.observe(show)
show()

preview.append(
  div(search, button({ onClick: () => filters.set('q', undefined) }, 'clear')),
  shown
)
```
```test
const search = await waitFor('input')

test('typing writes the hash, and the state reads it back', () => {
  search.value = 'widget'
  search.dispatchEvent(new Event('input', { bubbles: true }))
  const shown = preview.querySelector('pre').textContent
  expect(shown).toContain('"q":"widget"')
  // Namespaced in the URL, bare in the API.
  expect(shown).toContain('demo.q=widget')
})
```

Type in the box and watch the address bar. Reload the page and the value is still there.

## Two writers fight — so the keys are namespaced

Everything a `hashState` writes is prefixed with its `namespace`, and everything it does not
recognise is **left alone** on write. Two instances on one page — or a `hashState` next to a
hash router — can share the URL without deleting each other's keys.

This is not hypothetical caution. `createDocBrowser` had to grow a `'memory'` routing mode
because a doc-system embedded inside another one hijacked its host page's URL. So a
`hashState` can also be told to keep its state in memory and never touch the URL at all:

```typescript
const embedded = hashState({ namespace: 'inner', mode: 'memory' })
```

Same API, same events, no URL. Use it for anything embeddable, where the host page owns the
address bar.

## It composes with the router

The hash is split at the first `?`: the part before it is the **path** — which
[`defineRoutes({hashRouting: true})`](/router/) matches on — and the part after is the query
this reads and writes. Neither disturbs the other:

```
#/invoices/42?demo.q=widget&demo.sort=date
 └── router ──┘└─────── hashState ────────┘
```

## History: replace by default

`set` and `update` **replace** the current history entry. A filter box that pushed an entry
per keystroke would make the back button useless — thirty presses to undo one word.

Pass `{ push: true }` when the change is a place the user should be able to come back from,
such as opening a record:

```typescript
rows.set('editing', id, { push: true })
```

## API

- `hashState({ namespace, mode })` — `mode` is `'hash'` (default) or `'memory'`
- `.values` — a plain object of this namespace's current keys
- `.get(key)` / `.set(key, value, options?)` — `undefined` removes the key
- `.update(patch, options?)` — set several at once, in one history entry and one notification
- `.observe(listener)` — called on any change, including the back button; returns an
  unsubscribe function
- `.stop()` — detach from the URL entirely
