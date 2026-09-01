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
/*
Tokens, not characters.

A character-level diff of "sat" → "sprawled" marks the shared `s` and produces confetti; word
runs give a highlight a reader can actually use. Whitespace and punctuation are their own
tokens so the runs REASSEMBLE the original line exactly — a diff viewer that silently drops a
space is worse than one that highlights nothing, and the tests assert that reconstruction.
*/
const TOKENS = /(\s+|[A-Za-z0-9_$]+|[^\sA-Za-z0-9_$]+)/g;
/*
Above this many tokens on either side, skip the intra-line pass and mark the whole line.

The LCS below is O(n·m), and a minified bundle pasted into a diff is one line with tens of
thousands of tokens — which would lock the tab to draw a highlight nobody can read at that
size anyway. Bailing keeps the WHOLE-line rendering, which is the previous behaviour, so the
cap degrades rather than breaks.
*/
const MAX_TOKENS = 400;
/**
 * Word-level diff of two lines, as runs that reassemble each input exactly.
 *
 * Returns everything flagged `changed` when the lines are too long to diff cheaply, or when
 * they share nothing — in both cases the containing line highlight already says it.
 */
export function diffTokens(before, after) {
    const a = before.match(TOKENS) ?? [];
    const b = after.match(TOKENS) ?? [];
    const whole = () => ({
        removed: before ? [{ text: before, changed: true }] : [],
        added: after ? [{ text: after, changed: true }] : [],
    });
    if (a.length > MAX_TOKENS || b.length > MAX_TOKENS)
        return whole();
    const m = a.length;
    const n = b.length;
    const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i -= 1) {
        for (let j = n - 1; j >= 0; j -= 1) {
            lcs[i][j] =
                a[i] === b[j]
                    ? lcs[i + 1][j + 1] + 1
                    : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const removed = [];
    const added = [];
    // Coalesce adjacent tokens of the same kind so the DOM is runs, not one span per word.
    const push = (out, text, changed) => {
        const last = out[out.length - 1];
        if (last && last.changed === changed)
            last.text += text;
        else
            out.push({ text, changed });
    };
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) {
            push(removed, a[i], false);
            push(added, b[j], false);
            i += 1;
            j += 1;
        }
        else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            push(removed, a[i], true);
            i += 1;
        }
        else {
            push(added, b[j], true);
            j += 1;
        }
    }
    while (i < m)
        push(removed, a[i++], true);
    while (j < n)
        push(added, b[j++], true);
    return { removed: bridgeGaps(removed), added: bridgeGaps(added) };
}
/*
A space BETWEEN two changed words belongs to the change.

`sat on` → `sprawled across` shares its inner space, so the LCS calls it common and the
highlight comes out as two boxes with a hole punched between them — which reads as two
unrelated edits rather than one phrase. Whitespace flanked by changed runs on both sides is
absorbed, and the runs re-coalesce so it renders as a single span.
*/
function bridgeGaps(runs) {
    for (let k = 1; k < runs.length - 1; k += 1) {
        if (!runs[k].changed &&
            /^\s+$/.test(runs[k].text) &&
            runs[k - 1].changed &&
            runs[k + 1].changed) {
            runs[k].changed = true;
        }
    }
    const out = [];
    for (const run of runs) {
        const last = out[out.length - 1];
        if (last && last.changed === run.changed)
            last.text += run.text;
        else
            out.push({ ...run });
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
        '.diff-line .line-text': {
            minWidth: '0',
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
            /*
            `--tosi-accent-text` needs a FALLBACK, or the selected label is unreadable.
      
            It is derived by `createTheme` (`accent.contrasting()`), so it only exists on a page that
            applied a theme — and a bare `var(--tosi-accent-text)` on a page that did not is invalid
            at computed-value time, which for an inherited property like `color` silently falls back
            to the INHERITED value. Measured on the doc site: `#222` on the `#d92270` accent, a
            contrast ratio of 3.3:1, under AA.
      
            White is the right default rather than an arbitrary one: the accent was darkened 9% in
            1.9.2 specifically so it clears AA as a fill carrying white text, which this measures at
            4.8:1. A theme that sets the variable still wins, and so does `--tosi-diff-choice-*`.
            */
            color: varDefault.tosiDiffChoiceSelectedColor(varDefault.tosiAccentText('#fff')),
        },
        /*
        The runs that ACTUALLY differ, distinct from the line that contains them.
    
        A whole-line wash says "something here changed" — which for a one-word edit is most of the
        signal thrown away. These are a second, stronger tint of the SAME hue, so the two read as
        one system rather than two, and they sit on top of the line colour rather than replacing
        it: the line still says which side you are on, the run says what moved.
        */
        '.diff-line .text.changed': {
            borderRadius: varDefault.tosiDiffRunRadius('2px'),
            padding: '0 1px',
        },
        '.diff-add .text.changed': {
            background: varDefault.tosiDiffAddRunBg('color-mix(in srgb, #22c55e 38%, transparent)'),
        },
        '.diff-remove .text.changed': {
            background: varDefault.tosiDiffRemoveRunBg('color-mix(in srgb, #ef4444 38%, transparent)'),
        },
        // The coloured lines pick a side, so say so on hover.
        '.diff-line[data-choice]': {
            cursor: 'pointer',
        },
        '.diff-line[data-choice]:hover': {
            filter: 'brightness(1.06)',
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
        /*
        `composedPath()`, NOT `event.target` — this is a shadow-DOM component.
    
        tosijs delegates `on*` handlers from above the shadow boundary, so by the time this runs
        the event has been RETARGETED: `event.target` is the `<tosi-diff>` host, not the button,
        and `target.closest('button[data-hunk]')` is therefore null for every click. Every button
        on the page did nothing, silently.
    
        Measured rather than assumed — a listener attached on the hunk sees `target=BUTTON`, one on
        the host sees `target=TOSI-DIFF` with `composedPath()[0]=BUTTON`. The composed path is the
        only one of the two that survives the boundary, which makes it the right tool here even
        though `target.closest()` is the correct idiom for a light-DOM component.
        */
        const picked = event
            .composedPath()
            .find((node) => node instanceof HTMLElement &&
            node.matches('[data-hunk][data-choice]'));
        if (picked === undefined)
            return;
        /*
        A click that ENDS A SELECTION is not a choice.
    
        The coloured lines are now clickable, and they are also the text someone drags across to
        copy — so without this, selecting a line to copy it silently flips the resolution and
        rewrites the value. Checked against the shadow root's own selection where available:
        `document.getSelection()` reports collapsed for a selection made inside a shadow tree.
        */
        const root = this.shadowRoot;
        const selection = root?.getSelection?.() ?? document.getSelection();
        if (selection &&
            !selection.isCollapsed &&
            selection.toString().length > 0) {
            return;
        }
        const index = Number(picked.dataset.hunk);
        const choice = picked.dataset.choice;
        const choices = this.resolutions;
        if (choices[index] === choice)
            return;
        choices[index] = choice;
        this.queueRender();
        this.dispatchEvent(new Event('change'));
    };
    lineElement(op, text, chosen = true, runs, hunk) {
        /*
        `data-hunk`/`data-choice` on the LINE as well as the buttons, so clicking the coloured
        text picks that side. The line IS the affordance — it is what the reader is already
        looking at, and reaching for a small button to say "this one" when the thing is right
        there under the cursor is friction with nothing behind it.
        */
        const pickable = hunk !== undefined && (op === 'add' || op === 'remove')
            ? {
                'data-hunk': String(hunk),
                'data-choice': op === 'remove' ? 'original' : 'modified',
            }
            : {};
        /*
        ONE grid child for the text, always — the runs go INSIDE it.
    
        `.diff-line` is `grid-template-columns: 1.5em 1fr`, so emitting a span per run put the
        surplus into implicit ROWS: every word stacked vertically down the 1.5em marker column,
        one character wide. Same failure as #102, where a mismatch between track count and cell
        count auto-placed the extras into content-sized implicit tracks. A wrapper pins the text
        to column two no matter how many runs it contains.
        */
        // Non-breaking fallback so empty lines keep their row height.
        const body = runs !== undefined && runs.length > 0
            ? runs.map((run) => span({ class: run.changed ? 'text changed' : 'text' }, run.text))
            : [span({ class: 'text' }, text === '' ? ' ' : text)];
        return div({
            class: `diff-line diff-${op}${chosen ? '' : ' not-chosen'}`,
            ...pickable,
        }, span({ class: 'marker' }, MARKER[op]), span({ class: 'line-text' }, ...body));
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
            return div({ class: 'diff-hunk', onClick: this.choose }, div({ class: 'diff-choices' }, pick(this.originalLabel, 'original'), pick(this.modifiedLabel, 'modified')), 
            /*
            Pair the two sides INDEX-WISE for the intra-line pass. An edit to one line is the
            overwhelmingly common shape, and a pair is the only case where "what actually
            changed" is a meaningful question — where the counts differ, the surplus lines are
            wholly added or removed, which the line highlight already says.
            */
            ...block.removed.map((text, k) => this.lineElement('remove', text, choice === 'original', block.added[k] === undefined
                ? undefined
                : diffTokens(text, block.added[k]).removed, index)), ...block.added.map((text, k) => this.lineElement('add', text, choice === 'modified', block.removed[k] === undefined
                ? undefined
                : diffTokens(block.removed[k], text).added, index)));
        }));
    }
}
export const tosiDiff = TosiDiff.elementCreator();
