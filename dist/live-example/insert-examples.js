import { isDialectLanguage, isLiveFence, languageOfClass, } from '../doc-system/example-policy.js';
// A block's `<pre>` may be followed by a hidden `<script type="application/tosi-
// transpiled">` carrying its build-time transpiled JS (see
// self-contained-examples-plan.md). It sits BETWEEN consecutive code blocks, so the
// grouping walk must step over it — otherwise a tjs+test pair stops grouping. Returns
// the next element sibling that isn't such a script.
function nextGroupableSibling(el) {
    let n = el?.nextElementSibling ?? null;
    while (n?.tagName === 'SCRIPT' &&
        n.getAttribute('type') === 'application/tosi-transpiled') {
        n = n.nextElementSibling;
    }
    return n;
}
// The block's build-time transpiled JS, from the baked `<script>` immediately after
// its `<pre>` (JSON-encoded so a `</script>` in the JS can't break out). Absent on
// client-rendered pages (SPA nav re-renders markdown without bakes); the example then
// transpiles on demand at run time.
function bakedJsForBlock(block) {
    const n = block.nextElementSibling;
    if (n?.tagName !== 'SCRIPT' ||
        n.getAttribute('type') !== 'application/tosi-transpiled') {
        return undefined;
    }
    try {
        const parsed = JSON.parse(n.textContent || '');
        return typeof parsed === 'string' ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
/*
Read at insert time rather than captured, so the page can set it before hydration without
ordering constraints. The static build stamps `globalThis.__TOSI_EXAMPLE_POLICY` into the
page head — the same channel `__TJS_LOCAL_BASE` uses — and a consumer embedding the browser
directly can call `setExamplePolicy`.
*/
export function examplePolicy() {
    const g = globalThis;
    return g.__TOSI_EXAMPLE_POLICY === 'opt-in' ? 'opt-in' : 'auto';
}
export function setExamplePolicy(policy) {
    ;
    globalThis.__TOSI_EXAMPLE_POLICY =
        policy;
}
/*
A fence's JSON options (#184), as the renderer left them on the `<pre>`. A malformed options
object is an authoring error the author cannot otherwise see — the example just runs without
them — so it is reported with the file and example it came from. `console.error`, so the
doc-tests' console-clean check fails on it too.
*/
function fenceOptions(block, exampleId, sourceFile) {
    const error = block.getAttribute('data-example-options-error');
    if (error) {
        console.error(`${sourceFile ?? 'doc'}: example ${exampleId}: ${error}`);
        return {};
    }
    const raw = block.getAttribute('data-example-options');
    return raw ? JSON.parse(raw) : {};
}
export function insertExamples(element, context, liveExampleCreator, liveExampleTagName, 
// The source file this doc was extracted from (a `.md`, or a `.ts`/`.js`/`.css`
// with extracted doc comments). Stamped onto each example as
// `data-source-file` + `data-example-ordinal` so a DocStore can locate the
// originating fenced block to save edits back. Read-only; the write path comes
// with Foundation B. Omitted when there's no source (e.g. embedded corpora).
sourceFile) {
    /*
    Which fences become live examples (tosijs-ui#140, #146).
  
    Six languages execute, and two of them — `html` and `css` — do not look like code anyone
    is asking to RUN. A `css` fence showing "here is how you'd style this in your app" was
    injected as a page-wide stylesheet; an `html` fence showing "the markup this compiles to"
    rendered as a broken-looking demo. Neither fails a build, so a doc site could ship both
    and never know. Until now a static sample in those languages was impossible: the only
    workaround was to mislabel the fence (`xml` for HTML), which changes the highlighting to
    a language it isn't.
  
    Two escapes, and the DEFAULT IS UNCHANGED so no existing corpus moves:
  
      ```js:static     one fence, opted out — works whatever the policy
      policy 'opt-in'  nothing runs unless it asks to, with `:inline`/`:iframe`/`:ide`
  
    `opt-in` is the setting for a prose or book site, where code is overwhelmingly
    illustration and a runaway `css` fence is a restyled chapter.
    */
    const optIn = examplePolicy() === 'opt-in';
    const sources = [
        /*
        Any `language-*` block; `isLiveFence` below decides which run. This was a selector
        naming the six built-in languages — a copy of the rule that the dialect registry (#184)
        would have made wrong the moment a site registered a seventh. The language is read with
        `languageOfClass`, THE class grammar, case preserved: see its note on ```` ```JS ````.
        */
        ...element.querySelectorAll('[class*="language-"]'),
    ]
        .filter((el) => !el.closest(liveExampleTagName))
        .map((code) => ({
        code: code,
        block: code.parentElement,
        language: languageOfClass(code.className),
        mode: code.parentElement.getAttribute('data-example-mode') ||
            undefined,
    }))
        // THE shared rule — see doc-system/example-policy.ts. The static highlighter asks the
        // same question, and for one build the two disagreed: it tokenized the `html` fence of
        // every grouped example, and this read spans instead of markup.
        .filter((s) => isLiveFence(s.language, s.mode, optIn ? 'opt-in' : 'auto'))
        // Only now read the text (a layout-dependent `innerText`) and the bake, for live blocks.
        .map(({ code, ...rest }) => ({
        ...rest,
        code: code.innerText,
        compiled: bakedJsForBlock(rest.block),
    }));
    // Per-doc ordinal: the Nth live example on the page. Combined with sourceFile
    // it's the key back to the originating fenced-block group in the source.
    let ordinal = 0;
    for (let index = 0; index < sources.length; index += 1) {
        const exampleSources = [sources[index]];
        // Group consecutive code blocks
        while (index < sources.length - 1 &&
            nextGroupableSibling(sources[index].block) === sources[index + 1].block) {
            exampleSources.push(sources[index + 1]);
            index += 1;
        }
        const example = liveExampleCreator({ context });
        if (sourceFile !== undefined) {
            example.setAttribute('data-source-file', sourceFile);
            example.setAttribute('data-example-ordinal', String(ordinal));
        }
        // Execution mode from a `<lang>:<mode>` fence — take the FIRST mode in the group.
        // Contradictory modes across the group's blocks are an authoring error: shout in the
        // console (which the doc-tests console-clean guard also catches) but obey the first.
        const modes = exampleSources
            .map((s) => s.mode)
            .filter((m) => !!m);
        if (modes.length) {
            const distinct = [...new Set(modes)];
            if (distinct.length > 1) {
                console.error(`live example ${ordinal + 1}${sourceFile ? ` (${sourceFile})` : ''}: contradictory modes [${distinct.join(', ')}] — using the first, "${modes[0]}".`);
            }
            example.setAttribute('mode', modes[0]);
        }
        // Stable anchor for deep-linking (and for book "run this live" links): an
        // author override `data-example-id` (from a ```js#my-id fence on any block in
        // the group) wins, else the 1-based positional `example-N`. The book builder
        // derives the same id from the same rendered DOM, so the links line up.
        const overrideId = exampleSources
            .map((s) => s.block.getAttribute('data-example-id'))
            .find((v) => !!v);
        example.id = overrideId || `example-${ordinal + 1}`;
        ordinal += 1;
        const parent = exampleSources[0].block.parentElement;
        parent.insertBefore(example, exampleSources[0].block);
        /*
        One executable block per example — say so when an author writes two (tosijs-ui#139).
    
        `js`/`tjs`/`ts` all write the same single-valued slot, so a second executable fence
        silently overwrote the first: the earlier block vanished from the rendered page, the
        example ran as the later dialect, and nothing anywhere said so. Silent content loss in
        the direction the author cannot see — the page renders, the example works, and only the
        source shows what was meant.
    
        Warning rather than refusing: the page is still usable, and failing a doc build over a
        fence would be worse than the loss it prevents. It names the file so the author can find
        it, which the console alone would not.
    
        A dialect SELECTOR — the same example offered as TJS/TS/AJS — is the feature this
        limitation is standing in front of; see #139 for the shape.
        */
        const executable = exampleSources.filter((s) => s.language !== undefined && isDialectLanguage(s.language));
        if (executable.length > 1) {
            const kept = executable[executable.length - 1];
            console.warn(`⚠️  ${sourceFile ?? 'doc'}: example ${example.id} has ${executable.length} executable blocks ` +
                `(${executable
                    .map((s) => s.language)
                    .join(', ')}) — only the LAST is used.\n` +
                `   The others are discarded and will not appear on the page. Keeping: ${kept.language}.\n` +
                `   Separate them with prose to make separate examples.`);
        }
        exampleSources.forEach((source) => {
            switch (source.language) {
                case 'html':
                    example.html = source.code;
                    break;
                case 'css':
                    example.css = source.code;
                    break;
                case 'test':
                    example.test = source.code;
                    break;
                default:
                    // Unreachable while the filter above asks `isLiveFence`, and kept that way: a block
                    // this switch did not consume must stay on the page, never be removed below.
                    if (!isDialectLanguage(source.language))
                        return;
                    // `js`, `tjs`, `ts` or a registered dialect: the example's one executable
                    // "source" block. They land in the same editor and the dialect drives how
                    // it's transpiled or run (dialects.ts).
                    example.js = source.code;
                    example.dialect = source.language;
                    example.options = fenceOptions(source.block, example.id, sourceFile);
                    // The build-time bake (tjs only today) lets refresh() run the preview
                    // without loading the transpiler — see self-contained-examples-plan.md.
                    // Pair it with the source it was transpiled from so refresh() drops it the
                    // moment the example is edited.
                    if (source.compiled !== undefined) {
                        example.compiledJs = source.compiled;
                        example.compiledJsSource = source.code;
                    }
                    break;
            }
            source.block.remove();
        });
        example.showDefaultTab();
        // Snapshot the original source, then restore any locally-saved edit on top
        // (per-browser scratchpad, keyed by the data-source-file/ordinal stamps).
        example.snapshotAndRestoreLocalEdit();
    }
}
