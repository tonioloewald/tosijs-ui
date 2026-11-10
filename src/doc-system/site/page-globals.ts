/*
The client-side switches a site config sets, stamped into each page's <head> as globals the
bundle reads when it runs (so they must come BEFORE the bundle script — generate-site puts
`headExtra` in <head>, and the bundle loads at the end of <body>).

Each is emitted only when it differs from the default, so a default site's HTML is unchanged
byte-for-byte when a new switch is added.
*/

import {
  EXAMPLE_VIEWS,
  exampleTabsProblem,
  normalizeDialectNames,
} from '../example-policy.js'
import type { ExampleTab, ExampleView } from '../example-policy.js'

export interface PageGlobalsConfig {
  liveExamples?: 'auto' | 'opt-in' | 'no-code'
  exampleConsole?: boolean
  exampleTabs?: ExampleTab[]
  exampleView?: ExampleView
  dialects?: string[]
}

const LIVE_EXAMPLE_POLICIES = ['auto', 'opt-in', 'no-code']
const SITE_KINDS = ['documentation', 'book']

/**
 * A site config switch set to a value nothing reads, or null. Each silently fell back to its
 * default: `liveExamples: 'nocode'` ran every example on a site meant to run none (under a CSP
 * that was the point), and `kind: 'Book'` built a documentation site (1.17.0 review).
 */
export function siteSwitchProblem(config: {
  liveExamples?: string
  kind?: string
  exampleView?: string
}): string | null {
  const wrong = (name: string, value: unknown, allowed: string[]) =>
    value !== undefined && !allowed.includes(value as string)
      ? `SiteConfig.${name} is ${JSON.stringify(
          value
        )}; it must be one of ${allowed.map((a) => `'${a}'`).join(', ')}`
      : null
  return (
    wrong('liveExamples', config.liveExamples, LIVE_EXAMPLE_POLICIES) ??
    wrong('kind', config.kind, SITE_KINDS) ??
    wrong('exampleView', config.exampleView, [...EXAMPLE_VIEWS])
  )
}

export function pageGlobalsHead(config: PageGlobalsConfig): string {
  // A misspelt tab would hide a tab on every example with nothing to say why.
  const tabsProblem =
    config.exampleTabs && exampleTabsProblem(config.exampleTabs)
  if (tabsProblem) throw new Error(`SiteConfig.exampleTabs: ${tabsProblem}`)
  return [
    // #140, #246: which fences run
    config.liveExamples === 'opt-in' || config.liveExamples === 'no-code'
      ? `<script>globalThis.__TOSI_EXAMPLE_POLICY="${config.liveExamples}"</script>`
      : '',
    // #246: which tabs an example's code panel shows
    config.exampleTabs
      ? `<script>globalThis.__TOSI_EXAMPLE_TABS=${JSON.stringify(
          config.exampleTabs
        )}</script>`
      : '',
    // #252: the view examples open in
    config.exampleView && config.exampleView !== 'preview'
      ? `<script>globalThis.__TOSI_EXAMPLE_VIEW="${config.exampleView}"</script>`
      : '',
    // 1.16.2: the example console
    config.exampleConsole === false
      ? `<script>globalThis.__TOSI_EXAMPLE_CONSOLE=false</script>`
      : '',
    // 1.16.3: the dialects the site says its bundle registers, so the page can check
    config.dialects?.length
      ? `<script>globalThis.__TOSI_DIALECTS=${JSON.stringify(
          normalizeDialectNames(config.dialects)
        ).replace(/</g, '\\u003c')}</script>`
      : '',
  ].join('')
}
