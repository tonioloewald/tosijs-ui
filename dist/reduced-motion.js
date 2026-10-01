/*
Does the reader ask for reduced motion? One MediaQueryList, created on first use and reused —
the carousel asks on every auto-advance tick, and the live example whenever it shows a spinner.
Internal: not exported from the package root.
*/
let query;
export function prefersReducedMotion() {
    if (query === undefined) {
        query =
            typeof matchMedia === 'function'
                ? matchMedia('(prefers-reduced-motion: reduce)')
                : null;
    }
    return query?.matches === true;
}
/** Forget the cached query — for TESTS that stub `matchMedia`. */
export function resetReducedMotionForTests() {
    query = undefined;
}
