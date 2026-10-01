/*
Does the reader ask for reduced motion? One MediaQueryList, created on first use and reused —
the carousel asks on every auto-advance tick, and the live example whenever it shows a spinner.
Internal: not in the root barrel. The `./*` wildcard makes it importable as
`tosijs-ui/reduced-motion`, but it is not supported API and may change in any release.
*/
let query: MediaQueryList | null | undefined

/** @internal */
export function prefersReducedMotion(): boolean {
  if (query === undefined) {
    query =
      typeof matchMedia === 'function'
        ? matchMedia('(prefers-reduced-motion: reduce)')
        : null
  }
  return query?.matches === true
}

/** @internal Forget the cached query — for TESTS that stub `matchMedia`. */
export function resetReducedMotionForTests(): void {
  query = undefined
}
