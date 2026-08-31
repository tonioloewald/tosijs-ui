/*#
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

The unit of decision is a **change block**, not a line: a multi-line edit is one choice,
because accepting half of one produces text neither side wrote. Two more exports give you
the same model without the DOM — `diffBlocks(diffLines(a, b))` for the blocks, and
`resolveDiff(blocks, choices)` to turn choices back into text.

`acceptAll()` and `rejectAll()` do the obvious thing, `changeCount` tells you how many
decisions the diff is asking for (`0` means the texts agree), and `resolutions` is readable
and writable if you want to drive it yourself. Resolutions **reset when either text
changes** — decisions belong to the diff they were made about.

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
*/
/*{ "parent": "Components" }*/
import { Component, elements, vars, varDefault, } from 'tosijs';
const { div, span, button } = elements;
/** Group a line diff into context runs and change blocks, in display order. */
export function diffBlocks(lines) {
    const blocks = [];
    for (const line of lines) {
        const last = blocks[blocks.length - 1];
        if (line.op === 'context') {
            if (last?.kind === 'context')
                last.lines.push(line.text);
            else
                blocks.push({ kind: 'context', lines: [line.text] });
            continue;
        }
        const block = last?.kind === 'change'
            ? last
            : blocks[blocks.push({ kind: 'change', removed: [], added: [] }) - 1];
        if (line.op === 'remove')
            block.removed.push(line.text);
        else
            block.added.push(line.text);
    }
    return blocks;
}
/**
 * Rebuild the text implied by a set of per-change choices.
 *
 * The invariant worth holding onto, and the reason this is a pure function with its own
 * tests: all-`original` reproduces the original EXACTLY and all-`modified` reproduces the
 * modified exactly. A resolver that cannot round-trip its own endpoints is one you cannot
 * trust in the middle.
 */
export function resolveDiff(blocks, choices) {
    const out = [];
    let changeIndex = 0;
    for (const block of blocks) {
        if (block.kind === 'context') {
            out.push(...block.lines);
            continue;
        }
        const choice = choices[changeIndex] ?? 'modified';
        out.push(...(choice === 'original' ? block.removed : block.added));
        changeIndex += 1;
    }
    return out.join('\n');
}
/**
 * Line-level diff of two strings via longest-common-subsequence, returning each
 * line tagged `context` (unchanged), `remove` (only in `before`), or `add` (only
 * in `after`), in display order.
 */
export function diffLines(before, after) {
    const a = before.split('\n');
    const b = after.split('\n');
    const m = a.length;
    const n = b.length;
    // lcs[i][j] = length of the LCS of a[i:] and b[j:]
    const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i -= 1) {
        for (let j = n - 1; j >= 0; j -= 1) {
            lcs[i][j] =
                a[i] === b[j]
                    ? lcs[i + 1][j + 1] + 1
                    : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const out = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) {
            out.push({ op: 'context', text: a[i] });
            i += 1;
            j += 1;
        }
        else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            out.push({ op: 'remove', text: a[i] });
            i += 1;
        }
        else {
            out.push({ op: 'add', text: b[j] });
            j += 1;
        }
    }
    while (i < m) {
        out.push({ op: 'remove', text: a[i] });
        i += 1;
    }
    while (j < n) {
        out.push({ op: 'add', text: b[j] });
        j += 1;
    }
    return out;
}
const MARKER = { context: ' ', add: '+', remove: '-' };
export class TosiDiff extends Component {
    static preferredTagName = 'tosi-diff';
    // `before`/`after` would collide with the native Element.before()/after()
    // methods, so the component props are `original`/`modified`.
    static initAttributes = {
        original: '',
        modified: '',
        // Opt-in, because it changes the element from something you READ into something you
        // OPERATE, and the two existing consumers (the code editor's review overlay and the
        // doc-browser's before-save view) want the reading one.
        resolvable: false,
        // The reviewer's words, not ours. "mine"/"theirs" is git's framing, "current"/"proposed"
        // is a suggestion-review framing, and this component's own vocabulary is
        // original/modified — none of which is right for everyone, so none of it is hardcoded.
        // Pass already-localized strings; the host owns that choice.
        originalLabel: 'Original',
        modifiedLabel: 'Modified',
    };
    static shadowStyleSpec = {
        /*
        Surface follows the THEME, tints are translucent.
    
        These were `#fff`/`#222` and solid pastels, which made the component light-only: on a dark
        page you got a white block, and simply darkening the surface would have been worse than
        leaving it — light text on a solid `#e6ffed` row is unreadable. Both halves have to move
        together, which is why this is one change and not two.
    
        `color-mix` with `transparent` means the tint reads as a wash over whatever surface it
        lands on, so one value works on both. Every `--tosi-diff-*` override still wins, so anyone
        who themed this (as `<tosi-code>` does for its review overlay) is unaffected.
        */
        ':host': {
            display: 'block',
            overflow: 'auto',
            font: 'var(--tosi-code-font, 12px/1.5 monospace)',
            background: varDefault.tosiDiffBg(varDefault.background('#fff')),
            color: varDefault.tosiDiffColor(varDefault.textColor('#222')),
        },
        // `:host{display:block}` would otherwise beat the UA `[hidden]` rule, so the
        // element couldn't be hidden via the attribute — restore that.
        ':host([hidden])': {
            display: 'none',
        },
        '.diff-line': {
            display: 'grid',
            gridTemplateColumns: '1.5em 1fr',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
        },
        '.diff-line .marker': {
            textAlign: 'center',
            userSelect: 'none',
            opacity: '0.5',
        },
        '.diff-add': {
            background: varDefault.tosiDiffAddBg('color-mix(in srgb, #22c55e 18%, transparent)'),
        },
        '.diff-add .marker': {
            color: varDefault.tosiDiffAddColor('#16a34a'),
        },
        '.diff-remove': {
            background: varDefault.tosiDiffRemoveBg('color-mix(in srgb, #ef4444 18%, transparent)'),
        },
        '.diff-remove .marker': {
            color: varDefault.tosiDiffRemoveColor('#ef4444'),
        },
        // --- resolution UI (only rendered when `resolvable`) ---
        '.diff-hunk': {
            display: 'block',
            position: 'relative',
            margin: varDefault.tosiDiffHunkMargin(vars.spacing50),
            borderRadius: varDefault.tosiDiffHunkRadius(vars.roundedRadius),
            boxShadow: varDefault.tosiDiffHunkShadow('inset 0 0 0 1px #8884'),
        },
        '.diff-choices': {
            display: 'flex',
            gap: vars.spacing50,
            alignItems: 'center',
            padding: vars.spacing50,
        },
        '.diff-choices button': {
            font: 'inherit',
            cursor: 'pointer',
            padding: `${vars.spacing25} ${vars.spacing50}`,
            borderRadius: varDefault.tosiDiffHunkRadius(vars.roundedRadius),
            border: 'none',
            color: 'inherit',
            background: varDefault.tosiDiffChoiceBg('#8882'),
        },
        // The chosen side, and the ONLY state indicator that is not colour alone — the
        // unchosen lines also go translucent below.
        '.diff-choices button[aria-pressed="true"]': {
            background: varDefault.tosiDiffChoiceSelectedBg(vars.tosiAccent),
            color: varDefault.tosiDiffChoiceSelectedColor(vars.tosiAccentText),
        },
        '.diff-line.not-chosen': {
            opacity: '0.4',
            textDecoration: 'line-through',
            textDecorationColor: '#8888',
        },
    };
    content = () => [div({ part: 'body' })];
    /*
    Decisions are DERIVED state: they belong to the diff they were made about.
  
    Re-render with the same texts (a resize, a theme flip, a parent re-render) and a
    reviewer's choices must survive; change either text and they must reset, because choice #2
    of the old diff is not choice #2 of the new one. The guard compares the actual strings
    rather than counting hunks — the dangerous case is an edit that leaves the same NUMBER of
    changes, which a count would wave through and silently apply old decisions to new text.
  
    Two string comparisons, not a concatenated signature: unchanged strings compare
    pointer-equal, so this is O(1) on the common path instead of copying both documents on
    every read of `value`.
    */
    _resolutions = [];
    resolvedOriginal = '';
    resolvedModified = '';
    /** One entry per change block, in document order. */
    get resolutions() {
        this.syncResolutions();
        return this._resolutions;
    }
    set resolutions(choices) {
        this.resolvedOriginal = this.original;
        this.resolvedModified = this.modified;
        this._resolutions = choices;
        this.queueRender();
    }
    get blocks() {
        return diffBlocks(diffLines(this.original, this.modified));
    }
    /** Number of decisions this diff asks for. `0` means the two texts agree. */
    get changeCount() {
        return this.blocks.filter((b) => b.kind === 'change').length;
    }
    /**
     * The text implied by the current choices. With everything accepted this is exactly
     * `modified`, and with everything rejected exactly `original`, so a host that never shows
     * the controls still gets a sensible value.
     */
    get value() {
        return resolveDiff(this.blocks, this.resolutions);
    }
    setAll(choice) {
        this.resolutions = this.resolutions.map(() => choice);
        this.dispatchEvent(new Event('change'));
    }
    acceptAll = () => this.setAll('modified');
    rejectAll = () => this.setAll('original');
    syncResolutions() {
        if (this.original === this.resolvedOriginal &&
            this.modified === this.resolvedModified) {
            return;
        }
        this.resolvedOriginal = this.original;
        this.resolvedModified = this.modified;
        this._resolutions = new Array(this.changeCount).fill('modified');
    }
    choose = (event) => {
        // Delegated: `closest`, never `currentTarget` — the click lands on the button's text.
        const button = event.target.closest('button[data-hunk]');
        if (button === null)
            return;
        const index = Number(button.dataset.hunk);
        const choice = button.dataset.choice;
        const choices = this.resolutions;
        if (choices[index] === choice)
            return;
        choices[index] = choice;
        this.queueRender();
        this.dispatchEvent(new Event('change'));
    };
    lineElement(op, text, chosen = true) {
        return div({ class: `diff-line diff-${op}${chosen ? '' : ' not-chosen'}` }, span({ class: 'marker' }, MARKER[op]), 
        // Non-breaking fallback so empty lines keep their row height.
        span({ class: 'text' }, text === '' ? ' ' : text));
    }
    render() {
        super.render();
        /*
        The read-only path is deliberately the ORIGINAL code, not the block path with the
        controls switched off. Grouping reorders interleaved edits (`r a +A r b +B` becomes
        `r a r b +A +B`), which is a better diff to resolve and a CHANGED rendering for the two
        components already shipping this one. Additive means additive.
        */
        if (!this.resolvable) {
            const lines = diffLines(this.original, this.modified);
            this.parts.body.replaceChildren(...lines.map((line) => this.lineElement(line.op, line.text)));
            return;
        }
        let changeIndex = -1;
        this.parts.body.replaceChildren(...this.blocks.map((block) => {
            if (block.kind === 'context') {
                return div({}, ...block.lines.map((text) => this.lineElement('context', text)));
            }
            changeIndex += 1;
            const index = changeIndex;
            const choice = this.resolutions[index] ?? 'modified';
            const pick = (label, value) => button({
                type: 'button',
                // Dashed attribute props, NOT `dataset: {…}` — the creator assigns what it is
                // given, and `dataset` is a read-only accessor, so that throws inside render
                // and the element silently produces nothing. Reading `.dataset` is fine.
                'data-hunk': String(index),
                'data-choice': value,
                ariaPressed: String(choice === value),
            }, label);
            return div({ class: 'diff-hunk', onClick: this.choose }, div({ class: 'diff-choices' }, pick(this.originalLabel, 'original'), pick(this.modifiedLabel, 'modified')), ...block.removed.map((text) => this.lineElement('remove', text, choice === 'original')), ...block.added.map((text) => this.lineElement('add', text, choice === 'modified')));
        }));
    }
}
export const tosiDiff = TosiDiff.elementCreator();
