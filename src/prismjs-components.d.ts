/*
`@types/prismjs` types the main module but not `prismjs/components/*`, and the grammar files
are plain side-effecting scripts that register themselves onto `Prism.languages`.

Declared here rather than suppressed at each call site: `src/doc-system/highlight.ts` names
27 of them in a static map (blocker B1 — a computed specifier no browser could resolve), and
27 `@ts-expect-error`s would be 27 places for the next person to wonder whether the
suppression is still needed.

They export nothing. The import is for its side effect.
*/
declare module 'prismjs/components/*' {
  const _side_effect_only: void
  export default _side_effect_only
}
