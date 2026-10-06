/*
Things a site build can see are wrong and used to mention quietly, or not at all.

A build that exits 0 with a warning in scrollback is how tosijs-product's 0.8.0 blocker reached
a release candidate (#145, board #2543), and how tjs.tosijs.net ran every example against the
wrong tjs-lang for weeks without anyone being told (#210). Warning stays the default, because
each of these is a legitimate thing to do on purpose. `strict: true` in the site config is how a
project that never does them on purpose says so, and then the build fails.
*/
import { isLiveFence, type ExamplePolicy } from '../example-policy.js'
import { collectCodeTokens } from './code-fences.js'

/** Thrown by `misconfigured` under `strict`, so a caller can tell it from a crash. */
export class SiteMisconfiguredError extends Error {
  name = 'SiteMisconfiguredError'
}

/**
 * Report a misconfiguration: a warning by default, a thrown `SiteMisconfiguredError` (which
 * fails `buildSite`) when the site config sets `strict: true`.
 */
export function misconfigured(
  strict: boolean | undefined,
  message: string
): void {
  if (strict) {
    throw new SiteMisconfiguredError(
      `${message}\n    This fails the build because the site config sets \`strict: true\`.\n`
    )
  }
  console.warn(message)
}

/**
 * The languages of the corpus's LIVE fences, under the site's example policy.
 *
 * Code blocks come from marked (`collectCodeTokens`), the parser the pages are rendered with,
 * and liveness from `isLiveFence`, THE predicate. Neither is re-derived here: a second copy of
 * the liveness rule is what disagreed when `:static` shipped, a regex of its own in the bundle
 * guard is what the 1.16.7 review caught deciding a `strict` build, and the line scanner that
 * first replaced it missed CRLF files and blockquoted fences. Every build-side "does this
 * corpus have live examples?" asks here.
 */
export function liveFenceLanguages(
  docs: Array<{ text?: string }>,
  policy: ExamplePolicy = 'auto'
): Set<string> {
  const langs = new Set<string>()
  for (const doc of docs) {
    for (const { lang, mode } of collectCodeTokens(doc.text ?? '')) {
      if (lang && isLiveFence(lang, mode, policy)) langs.add(lang)
    }
  }
  return langs
}
