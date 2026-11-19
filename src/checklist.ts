/*#
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
*/

/*{ "parent": "Helper Libraries", "description": "<tosi-checklist> shows things to check and takes a thumbs up or down and a comment for each; the dev server's test checklists use it." }*/

import { ElementCreator, XinStyleSheet, elements, withAttributes } from 'tosijs'

const { h2, div, h3, ol, li, a, button, textarea, span } = elements

export interface ChecklistItemSpec {
  id?: string
  text: string
  url?: string
  steps?: string[]
}

export interface ChecklistSpec {
  id?: string
  title: string
  items?: (ChecklistItemSpec | string)[]
  sections?: { title?: string; items: (ChecklistItemSpec | string)[] }[]
}

export type ChecklistVerdict = 'pass' | 'fail' | null

export interface ChecklistItemAnswer {
  verdict: ChecklistVerdict
  comment: string
}

export interface ChecklistChange extends ChecklistItemAnswer {
  itemId: string
  changed: 'verdict' | 'comment'
}

interface Item {
  id: string
  text: string
  url?: string
  steps?: string[]
}

/** The list's sections, with every item given an id the way the dev server's store does. */
export function checklistSections(
  spec: ChecklistSpec | null
): { title?: string; items: Item[] }[] {
  if (!spec) return []
  const sections = spec.sections ?? (spec.items ? [{ items: spec.items }] : [])
  return sections.map((section, s) => ({
    title: section.title,
    items: (section.items ?? []).map((raw, i) => {
      const item = typeof raw === 'string' ? { text: raw } : raw
      return { ...item, id: item.id ?? `s${s + 1}-${i + 1}` }
    }),
  }))
}

/** A site path or an http(s) URL: what an item may link to. */
export const linkableUrl = (url: string): boolean =>
  (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url)

const sizesItself =
  typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content')

/** Fit a comment field to its text, where the browser will not do it itself. */
const fitComment = (field: HTMLTextAreaElement): void => {
  if (sizesItself) return
  field.style.height = 'auto'
  field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`
}

export class TosiChecklist extends withAttributes({
  /** answers can be seen but not changed */
  disabled: false,
}) {
  static preferredTagName = 'tosi-checklist'

  private _value: ChecklistSpec | null = null
  private _answers: Record<string, ChecklistItemAnswer> = {}
  private builtFor: ChecklistSpec | null | undefined = undefined
  private listening = false

  /** the list */
  get value(): ChecklistSpec | null {
    return this._value
  }
  set value(spec: ChecklistSpec | null) {
    this._value = spec && typeof spec === 'object' ? spec : null
    this.queueRender()
  }

  /** each item's answer, by id */
  get answers(): Record<string, ChecklistItemAnswer> {
    return this._answers
  }
  set answers(answers: Record<string, ChecklistItemAnswer> | null) {
    this._answers = answers && typeof answers === 'object' ? answers : {}
    this.queueRender()
  }

  static shadowStyleSpec: XinStyleSheet = {
    ':host': {
      display: 'block',
      fontFamily: 'inherit',
      lineHeight: '1.4',
    },
    h2: { fontSize: '1.15em', margin: '0 0 4px' },
    h3: {
      fontSize: '0.8em',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      opacity: '0.7',
      margin: '16px 0 4px',
    },
    '.summary': { fontSize: '0.85em', opacity: '0.75' },
    '.items': { listStyle: 'none', margin: '0', padding: '0' },
    '.item': {
      padding: '8px 0',
      borderBottom:
        '1px solid color-mix(in srgb, currentColor 15%, transparent)',
    },
    '.row': { display: 'flex', alignItems: 'flex-start', gap: '8px' },
    '.text': { flex: '1', minWidth: '0', overflowWrap: 'anywhere' },
    '.steps': { margin: '4px 0 0', paddingLeft: '20px', fontSize: '0.9em' },
    '.verdicts': { display: 'flex', gap: '4px', flexShrink: '0' },
    '.verdicts button': {
      minWidth: '40px',
      minHeight: '36px',
      fontSize: '1.1em',
      border: '1px solid color-mix(in srgb, currentColor 30%, transparent)',
      borderRadius: '6px',
      background: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      filter: 'grayscale(1)',
      opacity: '0.6',
    },
    '.verdicts button[aria-pressed="true"]': {
      filter: 'none',
      opacity: '1',
    },
    '.verdicts .pass[aria-pressed="true"]': {
      background: '#1b7f3b22',
      borderColor: '#1b7f3b',
    },
    '.verdicts .fail[aria-pressed="true"]': {
      background: '#b0002022',
      borderColor: '#b00020',
    },
    '.verdicts button:focus-visible, textarea:focus-visible, a:focus-visible': {
      outline: '2px solid #0064d2',
      outlineOffset: '1px',
    },
    '.open': { fontSize: '0.9em', marginLeft: '6px' },
    textarea: {
      display: 'block',
      boxSizing: 'border-box',
      width: '100%',
      marginTop: '6px',
      minHeight: '2.4em',
      font: 'inherit',
      // Full size, never smaller: iOS zooms the page into any field it
      // focuses whose text is under 16px.
      fontSize: '1em',
      color: 'inherit',
      background: 'transparent',
      border: '1px solid color-mix(in srgb, currentColor 25%, transparent)',
      borderRadius: '4px',
      padding: '4px 6px',
      // Grows with what is typed, so the text being written never scrolls out of view.
      fieldSizing: 'content',
      maxHeight: '12em',
      resize: 'none',
    },
  }

  private answerFor(id: string): ChecklistItemAnswer {
    return this._answers[id] ?? { verdict: null, comment: '' }
  }

  private emit(itemId: string, changed: 'verdict' | 'comment'): void {
    this.dispatchEvent(
      new CustomEvent<ChecklistChange>('change', {
        bubbles: true,
        detail: { itemId, ...this.answerFor(itemId), changed },
      })
    )
  }

  handleClick = (event: Event): void => {
    const target = (event.target as Element).closest('button[data-verdict]')
    if (!target || this.disabled) return
    const id = target.closest('.item')?.getAttribute('data-id')
    if (!id) return
    const pressed = target.getAttribute('data-verdict') as 'pass' | 'fail'
    const answer = this.answerFor(id)
    this._answers = {
      ...this._answers,
      [id]: { ...answer, verdict: answer.verdict === pressed ? null : pressed },
    }
    this.render()
    this.emit(id, 'verdict')
  }

  handleComment = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement
    // Our own change event, re-dispatched from the host, is not a comment.
    if (target === (this as unknown) || target.localName !== 'textarea') return
    if (this.disabled) return
    const id = target.closest('.item')?.getAttribute('data-id')
    if (!id || this.answerFor(id).comment === target.value) return
    this._answers = {
      ...this._answers,
      [id]: { ...this.answerFor(id), comment: target.value },
    }
    this.emit(id, 'comment')
  }

  // A comment is reported as it is typed, not only when the field loses focus.
  handleInput = (event: Event): void => {
    const target = event.target as HTMLElement
    if (target.localName !== 'textarea') return
    fitComment(target as HTMLTextAreaElement)
    this.handleComment(event)
  }

  content = () => [
    h2({ part: 'title' }),
    div({ part: 'summary', class: 'summary', role: 'status' }),
    div({ part: 'sections' }),
  ]

  connectedCallback(): void {
    super.connectedCallback()
    /*
    Listened for directly, on the shadow root: tosijs delegates `on*` handlers from the
    document, which does not reach in here (a textarea's `change` is not even composed).
    */
    if (!this.listening) {
      this.listening = true
      this.shadowRoot?.addEventListener('click', this.handleClick)
      this.shadowRoot?.addEventListener('change', this.handleComment)
      this.shadowRoot?.addEventListener('input', this.handleInput)
    }
  }

  private build(): void {
    const sections = checklistSections(this._value)
    this.parts.title.textContent = this._value?.title ?? ''
    this.parts.sections.replaceChildren(
      ...sections.flatMap((section) => [
        ...(section.title ? [h3(section.title)] : []),
        ol(
          { class: 'items' },
          ...section.items.map((item) =>
            li(
              { class: 'item', dataId: item.id },
              div(
                { class: 'row' },
                div(
                  { class: 'text' },
                  span(item.text),
                  ...(item.url && linkableUrl(item.url)
                    ? [
                        a(
                          {
                            class: 'open',
                            href: item.url,
                            ...(item.url.startsWith('/')
                              ? {}
                              : { target: '_blank', rel: 'noopener' }),
                          },
                          'Open'
                        ),
                      ]
                    : item.url
                      ? [span({ class: 'open' }, item.url)]
                      : []),
                  ...(item.steps?.length
                    ? [ol({ class: 'steps' }, ...item.steps.map((s) => li(s)))]
                    : [])
                ),
                div(
                  { class: 'verdicts' },
                  button(
                    {
                      class: 'pass',
                      dataVerdict: 'pass',
                      ariaLabel: `Passes: ${item.text}`,
                    },
                    '👍'
                  ),
                  button(
                    {
                      class: 'fail',
                      dataVerdict: 'fail',
                      ariaLabel: `Fails: ${item.text}`,
                    },
                    '👎'
                  )
                )
              ),
              textarea({
                placeholder: 'Comment (optional)',
                ariaLabel: `Comment on: ${item.text}`,
                rows: 1,
              })
            )
          )
        ),
      ])
    )
  }

  render(): void {
    super.render()
    if (!this.hydrated) return
    if (this.builtFor !== this._value) {
      this.builtFor = this._value
      this.build()
    }
    const ids = checklistSections(this._value).flatMap((s) =>
      s.items.map((item) => item.id)
    )
    let pass = 0
    let fail = 0
    for (const element of this.parts.sections.querySelectorAll('.item')) {
      const id = element.getAttribute('data-id')!
      const answer = this.answerFor(id)
      if (answer.verdict === 'pass') pass++
      if (answer.verdict === 'fail') fail++
      element.setAttribute('data-verdict', answer.verdict ?? '')
      for (const verdict of element.querySelectorAll('button[data-verdict]')) {
        verdict.setAttribute(
          'aria-pressed',
          String(verdict.getAttribute('data-verdict') === answer.verdict)
        )
        ;(verdict as HTMLButtonElement).disabled = this.disabled
      }
      const comment = element.querySelector('textarea')!
      // Never overwrite what someone is typing.
      if (this.shadowRoot?.activeElement !== comment) {
        if (comment.value !== answer.comment) {
          comment.value = answer.comment
          fitComment(comment)
        }
      }
      comment.disabled = this.disabled
    }
    const open = ids.length - pass - fail
    this.parts.summary.textContent = ids.length
      ? `${pass} passed · ${fail} failed · ${open} to check`
      : 'Nothing to check'
  }
}

export const tosiChecklist =
  TosiChecklist.elementCreator() as ElementCreator<TosiChecklist>

export { pageSchematic } from './page-schematic.js'
export type { SchematicOptions } from './page-schematic.js'
