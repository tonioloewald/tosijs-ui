import type { ThemeKind, ThemeMode, ThemeVariable } from './theme-data.js';
export interface DiscoveredVariable extends ThemeVariable {
    /** the declared value per mode, as written (`color-mix(in oklab, var(--x) 20%, white)`) */
    declared: Partial<Record<ThemeMode, string>>;
    /** the variables its value refers to, in any mode */
    parents: string[];
}
/** `'md-sys-*'` → a test for variable names (without dashes); a RegExp is used as is. */
export declare function namePattern(pattern: string | RegExp): (name: string) => boolean;
/** The variables a value refers to: `var(--a, var(--b))` → `['a', 'b']`. */
export declare function parentsOf(value: string): string[];
/**
 * The kind of control a value wants, from what it resolves to (variables substituted). The
 * name breaks ties a value cannot: `400` is a number, and a font stack is any text.
 */
export declare function inferKind(name: string, resolved: string): ThemeKind;
export interface DiscoverOptions {
    /** the mode selectors to read declarations under */
    selectors: Record<ThemeMode, string>;
    /** the element whose computed style resolves values (for kinds) */
    scope?: Element;
    /** a stylesheet owner to skip: the editor's own overrides are not the theme */
    exclude?: Node | null;
    /** where to look; the document by default */
    root?: Document;
}
/** The custom properties matching `pattern`, with their declarations, parents and kinds. */
export declare function discoverThemeVariables(pattern: string | RegExp, { selectors, scope, exclude, root }: DiscoverOptions): DiscoveredVariable[];
/**
 * What a colour value comes to inside `scope`, as `#rrggbb` (or `#rrggbbaa` when translucent):
 * variables substituted, `color-mix()` mixed, any colour space converted. Null where the
 * browser cannot tell (no canvas).
 */
export declare function resolveColor(scope: Element, value: string): string | null;
/**
 * Headings and labels for discovered variables, from their names.
 *
 * The prefix (in words) that most of them share is dropped (`md-sys-` from Material's tokens,
 * `glass-`), then a variable is grouped under its next word when another shares it:
 * `md-sys-color-primary` → Color / primary. A variable alone in its family goes under General.
 */
export declare function groupVariables(names: string[]): Map<string, {
    group: string;
    label: string;
}>;
/** What a length value comes to inside `scope` (`calc(var(--h) / 2)` → `16px`), or null. */
export declare function resolveLength(scope: Element, value: string): string | null;
/** Whether a value is derived from others (refers to a variable), rather than a literal. */
export declare const isDerived: (value: string) => boolean;
