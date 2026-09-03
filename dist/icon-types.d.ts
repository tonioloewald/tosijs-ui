import { ElementCreator } from 'tosijs';
export type IconData = {
    [key: string]: string;
};
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
export type IconElement = SVGElement | HTMLSpanElement;
export type SVGIconMap = {
    [key: string]: ElementCreator<IconElement>;
};
