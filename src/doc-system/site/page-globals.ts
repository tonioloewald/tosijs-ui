/*
The client-side switches a site config sets, stamped into each page's <head> as globals the
bundle reads when it runs (so they must come BEFORE the bundle script — generate-site puts
`headExtra` in <head>, and the bundle loads at the end of <body>).

Each is emitted only when it differs from the default, so a default site's HTML is unchanged
byte-for-byte when a new switch is added.
*/

export interface PageGlobalsConfig {
  liveExamples?: 'auto' | 'opt-in'
  exampleConsole?: boolean
  dialects?: string[]
}

export function pageGlobalsHead(config: PageGlobalsConfig): string {
  return [
    // #140: which fences run
    config.liveExamples === 'opt-in'
      ? `<script>globalThis.__TOSI_EXAMPLE_POLICY="opt-in"</script>`
      : '',
    // 1.16.2: the example console
    config.exampleConsole === false
      ? `<script>globalThis.__TOSI_EXAMPLE_CONSOLE=false</script>`
      : '',
    // 1.16.3: the dialects the site says its bundle registers, so the page can check
    config.dialects?.length
      ? `<script>globalThis.__TOSI_DIALECTS=${JSON.stringify(
          config.dialects
        ).replace(/</g, '\\u003c')}</script>`
      : '',
  ].join('')
}
