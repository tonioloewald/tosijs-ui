/*
Standalone ePub build — the subprocess entry point for buildEpub().

buildEpub() drives happy-dom (HTML→XHTML for 50+ chapters) and @resvg/resvg-js
(cover rasterization). Both hold native/retained memory that the JS heap can't
see, and the ePub is rebuilt on EVERY dev-server rebuild — so in-process it
strands memory in a watch process that lives for days. Running it in a child
hands all of it back to the OS on exit. Same reasoning as the bundle step; see
the Bun.build note in orchestrator.ts.

  bun epub-cli.ts <payload.json>     # payload = { config, opts }

Build-time only. Never import this from browser code.
*/
import { buildEpub } from './epub.js';
import { BUILT_IN_DIALECTS, normalizeDialectNames, registerLiveLanguage, } from '../example-policy.js';
const payloadPath = process.argv[2];
if (!payloadPath) {
    console.error('epub-cli: expected a payload file path');
    process.exit(1);
}
const { config, opts } = JSON.parse(await Bun.file(payloadPath).text());
// Declared dialects are live examples here too, or the ePub's example numbering (and so its
// "run this example live" links) drifts from the page's after the first one (review F3).
for (const name of normalizeDialectNames(config.dialects)) {
    if (!BUILT_IN_DIALECTS.has(name))
        registerLiveLanguage(name);
}
await buildEpub(config, opts ?? {});
