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
*/
/*{ "parent": "Components" }*/
import { Component, elements } from 'tosijs';
const { div, span } = elements;
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
    };
    static shadowStyleSpec = {
        ':host': {
            display: 'block',
            overflow: 'auto',
            font: 'var(--tosi-code-font, 12px/1.5 monospace)',
            background: 'var(--tosi-diff-bg, #fff)',
            color: 'var(--tosi-diff-color, #222)',
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
            background: 'var(--tosi-diff-add-bg, #e6ffed)',
        },
        '.diff-add .marker': { color: 'var(--tosi-diff-add-color, #22863a)' },
        '.diff-remove': {
            background: 'var(--tosi-diff-remove-bg, #ffeef0)',
        },
        '.diff-remove .marker': { color: 'var(--tosi-diff-remove-color, #cb2431)' },
    };
    content = () => [div({ part: 'body' })];
    render() {
        super.render();
        const lines = diffLines(this.original, this.modified);
        this.parts.body.replaceChildren(...lines.map((line) => div({ class: `diff-line diff-${line.op}` }, span({ class: 'marker' }, MARKER[line.op]), 
        // Non-breaking fallback so empty lines keep their row height.
        span({ class: 'text' }, line.text === '' ? ' ' : line.text))));
    }
}
export const tosiDiff = TosiDiff.elementCreator();
