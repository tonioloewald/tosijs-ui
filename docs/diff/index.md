# diff

`<tosi-diff>` renders a unified, line-by-line diff between two strings — the kind
of view you'd see in a code review, with removed lines marked `-` and added
lines marked `+`.

Set its `original` and `modified` properties (or attributes) to the two versions
of the text; it recomputes and re-renders. (They're named `original`/`modified`
rather than `before`/`after` to avoid the native `Element.before()`/`after()`
methods.)

```js
const { tosiDiff } = tosijsui

preview.append(
  tosiDiff({
    original: 'one\ntwo\nthree\nfour',
    modified: 'one\nTWO\nthree\nfour\nfive',
    style: { width: '100%', height: '100%' },
  })
)
```

The diff is computed with a longest-common-subsequence pass over the lines, so
unchanged lines are shown as context and only genuine insertions/deletions are
highlighted. The pure `diffLines(before, after)` function is exported too, if you
just want the data.

## Resolving a diff — "do I want to accept this?"

Set `resolvable` and each change gets a pair of buttons: keep the original, or take the
modified. `value` is the text those choices imply, and a `change` event fires whenever one
moves. That makes it a review surface for a *proposed* edit — an AI suggestion, a
collaborator's revision, a file that moved under you while you were editing it.

The **labels are yours**. "Mine"/"Theirs" is git's framing, "Current"/"Proposed" suits
reviewing a suggestion, and the component's own vocabulary is original/modified — so nothing
is hardcoded. Pass already-localized strings; the host owns that choice.

```js
const { tosiDiff } = tosijsui

const diff = tosiDiff({
  original: 'The cat sat on the mat.\nIt was a sunny day.\nThe end.',
  modified: 'The cat sprawled across the mat.\nIt was a sunny day.\nFin.',
  resolvable: true,
  originalLabel: 'Mine',
  modifiedLabel: 'Theirs',
  style: { width: '100%' },
})
diff.addEventListener('change', () => {
  result.textContent = JSON.stringify(diff.value)
})
const result = document.createElement('pre')
result.textContent = JSON.stringify(diff.value)
preview.append(diff, result)
```

```test
const { tosiDiff } = tosijsui
const el = tosiDiff({
  original: 'a\nKEEP\nc\nDROP\ne',
  modified: 'a\nNEW1\nc\nNEW2\ne',
  resolvable: true,
})
document.body.append(el)

test('accepting everything yields the modified text', () => {
  expect(el.changeCount).toBe(2)
  expect(el.value).toBe('a\nNEW1\nc\nNEW2\ne')
})

test('rejecting everything yields the original text exactly', () => {
  el.rejectAll()
  expect(el.value).toBe('a\nKEEP\nc\nDROP\ne')
  el.remove()
})
```

**Click the coloured text itself** to pick a side — the line is the affordance, so reaching for
a small button to say "this one" when the thing is right under the cursor is friction with
nothing behind it. Dragging to select text does *not* change anything: those lines are also
what you copy from.

Within a changed line, **the words that actually differ** are marked more strongly than the line
around them. A whole-line wash says "something here changed", which for a one-word edit throws
away most of the signal — so the line colour tells you which side you are on, and the run tells
you what moved. `diffTokens(before, after)` is exported if you want that data directly; its runs
reassemble each input exactly, and it falls back to marking the whole line for lines too long to
diff cheaply.

The unit of decision is a **change block**, not a line: a multi-line edit is one choice,
because accepting half of one produces text neither side wrote. Two more exports give you
the same model without the DOM — `diffBlocks(diffLines(a, b))` for the blocks, and
`resolveDiff(blocks, choices)` to turn choices back into text.

`acceptAll()` and `rejectAll()` do the obvious thing, `changeCount` tells you how many
decisions the diff is asking for (`0` means the texts agree), and `resolutions` is readable
and writable if you want to drive it yourself. Resolutions **reset when either text
changes** — decisions belong to the diff they were made about.
