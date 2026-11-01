/*
The client-side switches a site config sets, stamped into each page's <head> as globals the
bundle reads when it runs (so they must come BEFORE the bundle script — generate-site puts
`headExtra` in <head>, and the bundle loads at the end of <body>).

Each is emitted only when it differs from the default, so a default site's HTML is unchanged
byte-for-byte when a new switch is added.
*/
import { exampleTabsProblem, normalizeDialectNames } from '../example-policy.js';
export function pageGlobalsHead(config) {
    // A misspelt tab would hide a tab on every example with nothing to say why.
    const tabsProblem = config.exampleTabs && exampleTabsProblem(config.exampleTabs);
    if (tabsProblem)
        throw new Error(`SiteConfig.exampleTabs: ${tabsProblem}`);
    return [
        // #140, #246: which fences run
        config.liveExamples === 'opt-in' || config.liveExamples === 'no-code'
            ? `<script>globalThis.__TOSI_EXAMPLE_POLICY="${config.liveExamples}"</script>`
            : '',
        // #246: which tabs an example's code panel shows
        config.exampleTabs
            ? `<script>globalThis.__TOSI_EXAMPLE_TABS=${JSON.stringify(config.exampleTabs)}</script>`
            : '',
        // 1.16.2: the example console
        config.exampleConsole === false
            ? `<script>globalThis.__TOSI_EXAMPLE_CONSOLE=false</script>`
            : '',
        // 1.16.3: the dialects the site says its bundle registers, so the page can check
        config.dialects?.length
            ? `<script>globalThis.__TOSI_DIALECTS=${JSON.stringify(normalizeDialectNames(config.dialects)).replace(/</g, '\\u003c')}</script>`
            : '',
    ].join('');
}
