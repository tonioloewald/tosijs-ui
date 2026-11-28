/*
The `xin*` / `Xin*` names, made to warn (#4389, 1.20.0; 1.21.0 deletes them).

They were plain re-exports, `XinRating === TosiRating`, and only five of the 33 said anything
when used, while `migrating.md` said most of them warned. An alias here is a Proxy of the
survivor, so it still IS the survivor in every way a caller can use it (call it, construct it,
extend it, `instanceof` it, read a static) and the first use logs one line naming the
replacement. tosijs's `deprecated()` does the once-only warning.
*/
import { deprecated } from 'tosijs'

const notice = (oldName: string, newName: string): string =>
  `${oldName} is deprecated: use ${newName}. tosijs-ui 1.21.0 removes it.`

/** An element-creator alias: calling it warns once, then creates the survivor's element. */
export function deprecatedCreator<T extends (...args: any[]) => any>(
  creator: T,
  oldName: string,
  newName: string
): T {
  const warn = deprecated(() => undefined, notice(oldName, newName))
  return new Proxy(creator, {
    apply(target, thisArg, args) {
      warn()
      return Reflect.apply(target, thisArg, args)
    },
  })
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
    get(target, key) {
      warn()
      const value = Reflect.get(target, key, target)
      // A static method runs against the real class (`elementCreator()` registers it, so it
      // must not see the alias); `prototype` and other values pass through untouched.
      return typeof value === 'function' && key !== 'prototype'
        ? value.bind(target)
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
  return alias
}
