/*#
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
*/
/*
The hash splits at the first `?`: path before, query after.

That split is what lets this live next to a hash ROUTER. `defineRoutes({hashRouting: true})`
matches on the path, this owns the query, and neither has to know the other exists.
*/
function splitHash(hash) {
    const bare = hash.replace(/^#/, '');
    const at = bare.indexOf('?');
    return at === -1
        ? { path: bare, query: '' }
        : { path: bare.slice(0, at), query: bare.slice(at + 1) };
}
const hasWindow = () => typeof window !== 'undefined' && typeof window.location !== 'undefined';
export function hashState(options = {}) {
    const { namespace = '', mode = 'hash' } = options;
    const prefix = namespace ? `${namespace}.` : '';
    const live = () => mode === 'hash' && hasWindow() && attached;
    let attached = true;
    let memory = {};
    const listeners = new Set();
    const read = () => {
        if (!live())
            return { ...memory };
        const params = new URLSearchParams(splitHash(window.location.hash).query);
        const out = {};
        for (const [key, value] of params) {
            // Only this namespace's keys. Anything else belongs to someone else and is not ours
            // to report — or, on write, to delete.
            if (key.startsWith(prefix))
                out[key.slice(prefix.length)] = value;
        }
        return out;
    };
    const write = (patch, push) => {
        if (!live()) {
            for (const [key, value] of Object.entries(patch)) {
                if (value === undefined)
                    delete memory[key];
                else
                    memory[key] = value;
            }
            notify();
            return;
        }
        const { path, query } = splitHash(window.location.hash);
        const params = new URLSearchParams(query);
        for (const [key, value] of Object.entries(patch)) {
            if (value === undefined)
                params.delete(prefix + key);
            else
                params.set(prefix + key, value);
        }
        const next = params.toString();
        const hash = next ? `#${path}?${next}` : path ? `#${path}` : '';
        /*
        `replaceState`/`pushState` rather than assigning `location.hash`, for two reasons: an
        assignment cannot replace, and it fires `hashchange` asynchronously, so a caller that
        reads `.values` on the next line would get the old ones.
    
        Neither fires `hashchange` at all, hence the explicit notify.
        */
        const url = `${window.location.pathname}${window.location.search}${hash}`;
        if (push)
            window.history.pushState({}, '', url);
        else
            window.history.replaceState({}, '', url);
        notify();
    };
    const notify = () => {
        const values = read();
        for (const listener of listeners)
            listener(values);
    };
    // The back button changes the hash without going through `write`, so listen for it.
    const onHashChange = () => notify();
    if (mode === 'hash' && hasWindow()) {
        window.addEventListener('hashchange', onHashChange);
        window.addEventListener('popstate', onHashChange);
    }
    return {
        get values() {
            return read();
        },
        get(key) {
            return read()[key];
        },
        set(key, value, writeOptions = {}) {
            write({ [key]: value }, writeOptions.push ?? false);
        },
        update(patch, writeOptions = {}) {
            // One history entry and one notification for the whole patch — a listener that
            // re-queries a server should not do it four times because four filters moved.
            write(patch, writeOptions.push ?? false);
        },
        observe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        stop() {
            // Keep the values, lose the URL — so a component being torn down (or moved into an
            // embedded context) does not silently forget its state as well.
            memory = read();
            attached = false;
            if (hasWindow()) {
                window.removeEventListener('hashchange', onHashChange);
                window.removeEventListener('popstate', onHashChange);
            }
        },
    };
}
