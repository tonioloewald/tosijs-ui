/*
The cache-busting stamp appended to asset URLs as `?v=…`.

Extracted from `orchestrator.ts` (1.15.0 review F11). It was ~14 lines inside a ~1270-line
function, and the defect it carried is the reason this file exists rather than a comment:

    for (const f of stampInputs) {
      const file = Bun.file(f)
      if (!(await file.exists())) continue     // ← silent
      …
    }

`doc-system.css` was NAMED in the inputs and never hashed, because the stylesheet was
generated ~80 lines later. Reproduced at the time: the `?v=` on every page equalled
sha256(hydrate.js + iife.js) exactly. So a `theme`-only change — which reaches
`generate-css` as argv and never enters a bundle — deployed new CSS under an UNCHANGED URL,
and returning visitors kept the old stylesheet. Worse than the version stamp it replaced,
which at least moved every release. #151 was reported by someone editing CSS that was already
being served correctly.

The remediation was to move one statement earlier, with nothing asserting the ordering — so
the same reorder could undo it and every lane would stay green. Hence: a named-but-missing
input is now LOUD, and the property is unit-tested rather than implied by statement order.
*/

declare global {
  var Bun: any
}

export interface AssetStampResult {
  /** the stamp to put in `?v=` */
  stamp: string
  /** inputs that were named but not present — a build defect, never silent */
  missing: string[]
  /** true when nothing existed to hash and the fallback was used */
  usedFallback: boolean
}

/**
 * Hash the assets the stamp guards.
 *
 * Every named input that is missing is reported in `missing` — it is not skipped quietly.
 * A missing input means the stamp does not cover that asset, which is precisely the #151
 * failure: the file changes, the URL does not, and the browser serves what it cached.
 *
 * Returns the fallback only when NOTHING existed to hash (an early build with no assets yet),
 * because falling back to the version is the bug this replaced: `package.json` does not change
 * while you work, so `hydrate.js?v=0.2.0` is byte-identical across every rebuild and the page
 * keeps executing the bundle it cached hours ago — through edits, through reloads.
 */
export async function computeAssetStamp(
  paths: string[],
  fallback: string
): Promise<AssetStampResult> {
  const hasher = new Bun.CryptoHasher('sha256')
  const missing: string[] = []
  let sawAny = false
  for (const f of paths) {
    const file = Bun.file(f)
    if (!(await file.exists())) {
      missing.push(f)
      continue
    }
    sawAny = true
    hasher.update(new Uint8Array(await file.arrayBuffer()))
  }
  return {
    stamp: sawAny ? hasher.digest('hex').slice(0, 12) : fallback,
    missing,
    usedFallback: !sawAny,
  }
}

/**
 * The message for a named-but-missing input. Separate so the test asserts the real string
 * rather than a paraphrase of it.
 */
export function missingStampInputWarning(missing: string[]): string {
  return (
    `⚠️  asset stamp: ${missing.length} named input(s) did not exist and are NOT covered by ` +
    `the cache-busting hash:\n` +
    missing.map((m) => `     ${m}`).join('\n') +
    `\n   Those files can change without their URL changing, so returning visitors will be ` +
    `served the copy they cached (tosijs-ui#151). This usually means the asset is generated ` +
    `AFTER the stamp is computed — generate it first.`
  )
}
