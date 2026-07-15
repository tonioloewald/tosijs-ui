/*
Live-example build check — the subprocess entry point for checkExamples().

Why a child process, when this is "just" compiling some strings:

checkExamples() compiles EVERY executable block in the corpus (83 of them here) with
`new AsyncFunction(js)` on EVERY dev rebuild, and — for `ts` blocks — runs them
through a `Bun.Transpiler`. Both retain memory the JS heap never shows you:

  - JSC caches compiled code, KEYED BY SOURCE TEXT. That last part is the trap: replay
    the same corpus and RSS plateaus (the cache dedups), so a leak test on an unchanged
    corpus reports "flat" and lies. But a dev server only rebuilds BECAUSE A FILE
    CHANGED — the source is fresh every time, so nothing dedups and it never plateaus.
    Measured with fresh sources: +7.1MB over 40 rebuilds, still climbing.
  - `Bun.Transpiler` strands ~40KB per construction (oven-sh/bun#34053).

In a process that lives for days across thousands of rebuilds, that is unbounded. The
child hands all of it back to the OS on exit. Same reasoning — and the same fix — as
the bundle step, the ePub step, and generate-css; see the Bun.build note in
orchestrator.ts.

  bun check-examples-cli.ts <docs.json> [contextKey ...]
  → writes ExampleProblem[] as JSON to stdout; exit 0 whether or not problems were
    found (a problem is data, not a crash — only a real failure exits non-zero).

Build-time only. Never import this from browser code.
*/
import { checkExamples } from './check-examples';
const docsJson = process.argv[2];
if (!docsJson) {
    console.error('check-examples-cli: expected a docs.json path');
    process.exit(1);
}
const contextKeys = process.argv.slice(3);
const corpus = JSON.parse(await Bun.file(docsJson).text());
const problems = await checkExamples(corpus, contextKeys.length ? { contextKeys } : {});
// stdout is the channel — the parent parses this. Anything else this process prints
// (warnings from the transform, say) goes to stderr so it can't corrupt the payload.
process.stdout.write(JSON.stringify(problems));
