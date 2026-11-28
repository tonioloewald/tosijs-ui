/*
The `xin*` / `Xin*` names, made to warn (#4389, 1.20.0; 1.21.0 deletes them).

They were plain re-exports, `XinRating === TosiRating`, and only five of the 33 said anything
when used, while `migrating.md` said most of them warned. An alias here is a Proxy of the
survivor, so it does what the survivor does in every way a caller can use it (call it, construct
it, extend it, `instanceof` it, read a static) and the first use logs one line naming the
replacement. It is not `===` the survivor: no Proxy is its target. tosijs's `deprecated()` does
the once-only warning.
*/
import { deprecated } from 'tosijs'

/*
Every alias this module made. Library code that walks a namespace (the iframe registration in
live-example/execution.ts) asks `isDeprecatedAlias` and skips them: reading a class alias's
statics warns, and a reader whose code never names an alias must not be told to stop using one
(1.20.0 review, B2). `WeakSet.has` fires no Proxy trap.
*/
const aliases = new WeakSet<object>()

/** Is `value` one of the deprecated `xin*` / `Xin*` aliases? Asking does not warn. */
export const isDeprecatedAlias = (value: unknown): boolean =>
  (typeof value === 'function' ||
    (typeof value === 'object' && value !== null)) &&
  aliases.has(value as object)

const notice = (oldName: string, newName: string): string =>
  `${oldName} is deprecated: use ${newName}. tosijs-ui 1.21.0 removes it.`

/** An element-creator alias: calling it warns once, then creates the survivor's element. */
export function deprecatedCreator<T extends (...args: any[]) => any>(
  creator: T,
  oldName: string,
  newName: string
): T {
  const warn = deprecated(() => undefined, notice(oldName, newName))
  const alias = new Proxy(creator, {
    apply(target, thisArg, args) {
      warn()
      return Reflect.apply(target, thisArg, args)
    },
  })
  aliases.add(alias)
  return alias
}

/**
 * A class alias: constructing it, extending it, `instanceof`, or reading a static warns once,
 * and each does what it does with the survivor.
 */
export function deprecatedClass<T extends abstract new (...args: any) => any>(
  cls: T,
  oldName: string,
  newName: string
): T {
  const warn = deprecated(() => undefined, notice(oldName, newName))
  const alias: T = new Proxy(cls, {
    get(target, key, receiver) {
      warn()
      /*
      A static runs against whoever it was read through. Read through the alias itself
      (`XinForm.elementCreator()`), that is the real class, so the alias is never what gets
      registered. Read through a SUBCLASS of the alias (`class MyForm extends XinForm`, whose
      static lookups reach this trap via the prototype chain), it is the subclass: binding to
      the real class there made `MyForm.elementCreator()` build and register a <tosi-form>, and
      `my-form` was never defined (1.20.0 review, M1).
      */
      const self = receiver === alias ? target : receiver
      const value = Reflect.get(target, key, self)
      return typeof value === 'function' && key !== 'prototype'
        ? value.bind(self)
        : value
    },
    construct(target, args, newTarget) {
      warn()
      // `new Alias()` constructs the survivor; a subclass of the alias keeps its own new.target.
      return Reflect.construct(
        target,
        args,
        newTarget === alias ? target : newTarget
      )
    },
  })
  aliases.add(alias)
  return alias
}
