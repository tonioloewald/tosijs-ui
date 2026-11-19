# checklist

`<tosi-checklist>` shows a list of things to check and takes a 👍 or 👎 and a comment for each.
It is how a doc site's dev server asks a person to try something an agent cannot (see
[test checklists](/doc-site-system/#test-checklists)), but it knows nothing about servers:
`value` is the list, `answers` holds the answers, and it fires `change` with the item that
changed. Saving the answer is up to you.

In an app, import it from `tosijs-ui/checklist`: it is not in the root barrel, so an app that
does not use it ships none of it. (The example below imports from `tosijs-ui` because doc pages
run against the full bundle.)

A list has a `title` and either `items` or `sections`, each with a `title` and `items`. An item
is text, or `{ id, text, url, steps }`. Items without an `id` are numbered (`s1-1`, `s1-2`, …).

```js
import { tosiChecklist } from 'tosijs-ui'

const list = tosiChecklist({
  value: {
    id: 'demo',
    title: 'Before the release',
    sections: [
      {
        title: 'Phone',
        items: [
          { id: 'tap', text: 'The menu opens with one tap', url: '/menu/' },
          {
            id: 'scroll',
            text: 'The table scrolls smoothly',
            steps: ['Open the table page', 'Flick the rows up and down'],
          },
        ],
      },
      { title: 'Desktop', items: ['Keyboard focus is always visible'] },
    ],
  },
})
const log = document.createElement('pre')
list.addEventListener('change', (event) => {
  log.textContent = JSON.stringify(event.detail, null, 2)
})
preview.append(list, log)
```
```test
const list = preview.querySelector('tosi-checklist')
test('a verdict is an answer, and pressing it again takes it back', async () => {
  await list.whenHydrated
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const pass = list.shadowRoot.querySelector('[data-id="tap"] .pass')
  pass.click()
  expect(list.answers.tap.verdict).toBe('pass')
  expect(pass.getAttribute('aria-pressed')).toBe('true')
  pass.click()
  expect(list.answers.tap.verdict).toBe(null)
  expect(list.shadowRoot.querySelectorAll('.item').length).toBe(3)
})
```

## Answers

`answers` maps an item's id to `{ verdict, comment }`, where `verdict` is `'pass'`, `'fail'` or
`null`. Pressing a verdict again takes it back. Each `change` event's `detail` is
`{ itemId, verdict, comment, changed }`, where `changed` is `'verdict'` or `'comment'`, so a
caller can, for instance, capture the page only when a verdict is given. A comment fires
`change` as it is typed, so a caller that saves comments should debounce them.

An item's `url` becomes an **Open** link. Only a site path (`/button/`) or an http(s) URL is
linked; anything else is shown as text.
