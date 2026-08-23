/*
A local `JSONSchema` type, so nothing we SHIP imports one.

`tosijs-schema` is an **optional peer** — install it and the form validates, omit it and the
form still renders and edits. That promise was in `SCHEMA-FORM-PLAN.md` from the start and it
is broken the moment a shipped `.d.ts` says `import type { JSONSchema } from 'tosijs-schema'`:
TypeScript does not care that npm considers a package optional, so a consumer whose only
import is `tosiTable` gets TS2307 for a library they were told they did not need.

**Declaring the optional peer does not fix this**, and there is proof in our own output:
`dist/code-editor-cm.d.ts` imports a type from `tjs-lang/editors/codemirror`, which IS a
declared optional peer, and still fails to resolve when it is absent. Filed upstream as
tjs-lang#13; the fix on our side is the same either way — do not import a type you do not
require.

So the type is declared here instead. It is **structural**, which is what makes this safe: the
values we hand to `validate()` and receive from `inferSchema()` are the same objects either
way, and a structural type that matches theirs is interchangeable at the boundary without
either package knowing about the other. Keeping it in sync is a real cost, which is why
`json-schema.test.ts` asserts it stays assignable in both directions against the real thing
(a devDependency, so the test always has it).

Mirrors tosijs-schema 1.7.0's `JSONSchema`.
*/
export {};
