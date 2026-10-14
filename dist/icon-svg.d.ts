/**
 * Raw SVG markup for an icon, or `undefined` when no icon has that name.
 *
 * Throws when the name exists but cannot be one SVG string: a stack (`a$b`), a rule
 * (`spin…`, `un…`), a suffix other than rotation or flip, or a redirect cycle. Those need
 * `icons.<name>()` where there is a DOM.
 */
export declare function iconSvg(name: string): string | undefined;
/** Every icon name currently registered, including any added via defineIcons. */
export declare function iconNames(): string[];
