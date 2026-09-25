import { ElementCreator } from 'tosijs'
import type builtInIcons from './icon-data.js'

export type IconData = { [key: string]: string }

/**
 * A plain icon is an `<svg>`; a COMPOSITE (any name containing `$`, e.g. `tosiHat$tosi`)
 * is an `<span class="tosi-icon-composite">` wrapping the stacked svgs.
 *
 * This said `ElementCreator<SVGElement>` and was wrong for every composite — measured:
 * `icons['tosiHat$tosi']()` returns `SPAN`, and `instanceof SVGElement` is `false`. The
 * composition language is documented and promoted (`icon-composition.md`), so the lie was
 * on a path we actively encourage, and `resolveIcon` has always returned the honest
 * `Element`; only this cast disagreed.
 *
 * `SVGElement | HTMLSpanElement` rather than `Element` because both members carry `.style`
 * and `.dataset`, which is what callers actually reach for — widening all the way to
 * `Element` would break working code to no purpose.
 */
export type IconElement = SVGElement | HTMLSpanElement

/** The name of every icon that ships with tosijs-ui. */
export type IconName = keyof typeof builtInIcons

/**
 * The `icons` proxy. Built-in names are explicit keys, so `icons.user()` type-checks even under
 * `noUncheckedIndexedAccess` — which adds `undefined` to every index-signature read, and so made
 * adopters write `icons.user!()` at every call (#181). The runtime has always returned a creator
 * for ANY name (an unknown one draws a placeholder), so the `!` guarded nothing.
 *
 * The index signature stays for names the type system cannot know: composites
 * (`tosiHat$tosi`), rule forms (`spin90Loader`) and icons added with `defineIcons()`.
 */
export type SVGIconMap = {
  [K in IconName]: ElementCreator<IconElement>
} & { [key: string]: ElementCreator<IconElement> }
