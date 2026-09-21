/*
Turning "it broke" into "it broke HERE".

A live example and a doc test are both run by handing a string to the `AsyncFunction`
constructor, and when that throws, the only thing the user ever saw was `err.message`. For a
doc test that produced entries like

    ✗ Test execution: Arg string terminates parameters early

with no file, no line and no stack — one failure standing in for every test in the block. The
report that prompted this (tosijs-ui#111) cost an hour of bisecting a file by hand, and both
theories it bought were wrong, because the message named nothing that was actually involved.

The pieces to fix it mostly existed: the test harness already tagged its body with a
`sourceURL` and already had a stack-frame parser, and used both — but only for assertion
failures. The execution catch threw the stack away, and the EXAMPLE path never tagged a
sourceURL at all, so its stacks pointed into the bundle. This module is that logic, extracted
once, so the two paths cannot drift.

There are two failure modes and only one of them has a line number, which is why "just include
the stack" is not the whole answer:

  - the body THREW while running — there is a real stack, tagged with our sourceURL, and
    `describeError` lifts the line and the source text out of it;
  - the body never ran, because the `AsyncFunction` CONSTRUCTOR rejected it — no user frame
    exists, so no line can be reported. That was #111's actual case, and the useful information
    there is which parameter list was rejected. `diagnoseConstruction` supplies it.
*/
/** Tag for code run as a live example, so its frames are identifiable. */
export const EXAMPLE_SOURCE_URL = 'inline-example';
/** Tag for code run as a doc test. */
export const TEST_SOURCE_URL = 'inline-test';
/*
Find the USER's frame in a stack.

Frame syntax differs by engine (Chrome `at fn (url:line:col)`, Safari/Firefox
`fn@url:line:col`); the trailing `url:line:col` capture covers both.

PREFER THE TAG. Code we run is tagged with a `sourceURL` (`inline-test`, `inline-example`), so
the user's frame can be identified POSITIVELY. That is the whole fix for tosijs-ui#142's fifth
point, reported by an adopter and reproduced here in Chromium: two failures in two different
blocks, at genuinely different lines, both reported the SAME line — because no frame was ever
recognised as the user's and the first bundle frame won instead.

The cause is the exclusion list below, which was the only mechanism. It matches a bare
`/iife.js`, and a doc site serves `/iife.js?v=<hash>` — the cache-busting stamp — which the `$`
anchor rejects. It also never listed `hydrate.js`, the bundle an ADOPTER's site actually loads.
So on a real doc site nothing was skipped, the harness's own frame was returned, and every
failure reported one constant wrong line. A wrong line is worse than none: it sends you
somewhere with confidence. The reporter said exactly that and was right.

The exclusion list survives as a FALLBACK for untagged stacks, now matching on the path with
any query or fragment stripped.
*/
const BUNDLE_FILES = /\/(index|module|iife|hydrate|module\.debug|module\.safe)\.js$/;
/** URL without `?query` or `#fragment` — a stamped bundle is still that bundle. */
function pathOf(url) {
    return url.split(/[?#]/)[0];
}
export function firstUserStackFrame(stack, 
/** The `sourceURL` the code was tagged with, when the caller knows it. */
tag) {
    if (!stack)
        return null;
    const frames = [];
    for (const raw of stack.split('\n')) {
        const line = raw.trim();
        if (!line)
            continue;
        // Skip the "AssertionError: ..." header line.
        if (/^\w*Error[:\s]/.test(line))
            continue;
        const match = line.match(/[(@\s]([^()\s]+):(\d+):(\d+)\)?$/);
        if (!match)
            continue;
        const [, url, ln, col] = match;
        frames.push({ url, line: Number(ln), col: Number(col) });
    }
    // Positive identification first — immune to query strings, new bundle names and whatever
    // an adopter happens to call their bundle.
    if (tag) {
        const tagged = frames.find((f) => f.url.includes(tag));
        if (tagged)
            return tagged;
        /*
        Tagged code was expected and no tagged frame exists. Report NOTHING rather than guess: a
        frame from the bundle is not the author's line, and naming it is the defect this fix
        removes. WebKit reaches here routinely — it produces no locatable frame at all.
        */
        return null;
    }
    return frames.find((f) => !BUNDLE_FILES.test(pathOf(f.url))) ?? null;
}
/*
The `Function` constructor synthesizes a header — `function anonymous(a,b\n) {\n` — so every
line the engine reports is offset from the line the AUTHOR wrote. Measured on the real
constructors: a throw on body line 1 reports as line 3 in both Chromium and Firefox, for both
`Function` and `AsyncFunction`, regardless of parameter count, and the shift is additive (a
throw on line 3 reports as 5). WebKit produces no locatable frame at all, so it falls back to
the bare message.

This was already wrong before any of this: the assertion path has been quoting the line TWO
BELOW the failing assertion since it was written, which is worse than saying nothing — a wrong
line sends you to the wrong place with confidence.

Calibrated at runtime rather than hardcoded to 2. The value is a detail of whichever engine is
running, nobody promises it, and a hardcoded guess that goes stale reintroduces exactly the
defect it was meant to fix. One synchronous probe, cached.
*/
const OFFSET_PROBE_URL = 'tosi-line-offset-probe';
let cachedOffset = null;
export function stackLineOffset() {
    if (cachedOffset !== null)
        return cachedOffset;
    cachedOffset = 0;
    try {
        new Function(`throw new Error('probe')\n//# sourceURL=${OFFSET_PROBE_URL}`)();
    }
    catch (err) {
        const frame = firstUserStackFrame(err.stack, OFFSET_PROBE_URL);
        if (frame?.url.includes(OFFSET_PROBE_URL))
            cachedOffset = frame.line - 1;
    }
    return cachedOffset;
}
/** The author's line number for a reported frame, or null if it cannot be trusted. */
export function authorLine(frame) {
    if (!frame)
        return null;
    const line = frame.line - stackLineOffset();
    // A non-positive line means our assumption broke; say nothing rather than something wrong.
    return line >= 1 ? line : null;
}
/** The trimmed source line `frame.line` refers to, if we have the source. */
export function sourceLineAt(source, lineNum) {
    if (!source || lineNum < 1)
        return null;
    return source.split('\n')[lineNum - 1]?.trim() || null;
}
/**
 * `message | the offending source (line N)` when the error can be located, and the plain
 * message when it cannot — never a worse message than before.
 */
export function describeError(err, source, tag = TEST_SOURCE_URL) {
    const error = err;
    const message = String(error?.message ?? err);
    /*
    `describeError` serves BOTH tagged paths (a doc test and a live example), so it takes the tag
    from the caller. Without it the old exclusion heuristic runs and can name a bundle frame.
    */
    const line = authorLine(firstUserStackFrame(error?.stack, tag));
    if (line === null)
        return message;
    const src = sourceLineAt(source, line);
    return src
        ? `${message} | ${src} (line ${line})`
        : `${message} (line ${line})`;
}
/**
 * Explain a failure of the `AsyncFunction` CONSTRUCTOR, which throws before any user code runs
 * and therefore produces no locatable frame.
 *
 * The discriminator is worth the extra construction: if the same body compiles with **no**
 * parameters, the body is fine and the parameter list is at fault — which is a statement about
 * the caller's `context` keys, not about anything the author wrote. That is exactly the case
 * that reported as `Arg string terminates parameters early`, a message naming nothing anyone
 * could act on.
 */
export function diagnoseConstruction(err, paramNames, code, construct) {
    const message = String(err?.message ?? err);
    let bodyAlone = true;
    try {
        construct(code);
    }
    catch {
        bodyAlone = false;
    }
    if (!bodyAlone) {
        // The body itself does not compile — the author's own code, and the engine's message is
        // the best description of it we have.
        return `${message} — the code could not be compiled`;
    }
    return (`${message} — the code itself compiles, so the CONTEXT KEYS are at fault. ` +
        `They became this parameter list: ${paramNames.join(', ')}. ` +
        `A key that cannot be an identifier (a subpath like 'pkg/sub', a scoped name, a leading ` +
        `digit) is the usual cause.`);
}
