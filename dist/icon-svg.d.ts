/**
 * Raw SVG markup for an icon, or `undefined` when nothing by that name would draw.
 *
 * Throws when the name would draw but cannot be one SVG string: a stack (`a$b`), a rule
 * (`spin…`, `un…`), a style suffix other than rotation or flip, a redirect to a name that
 * is not an icon, or a redirect cycle. Those need `icons.<name>()` where there is a DOM.
 */
export declare function iconSvg(name: string): string | undefined;
/** Every icon name currently registered, including any added via defineIcons. */
export declare function iconNames(): string[];
