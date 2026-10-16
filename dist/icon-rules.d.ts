import type { ElementPart } from 'tosijs';
export interface IconRule {
    prefix: string | RegExp;
    apply: (baseName: string, match: RegExpMatchArray | string, parts: ElementPart[]) => Element | string | null;
}
/**
 * Style suffixes on a registered icon (`checkCircle90r`), split, or null. Such a name is
 * that icon styled, and it wins over a composition rule (#3295): `checkCircle90r` is
 * `checkCircle` turned, not the `check` rule over `circle90r`. Both the DOM renderer and
 * `iconSvg` resolve in that order by asking this.
 */
export declare function suffixedIcon(name: string): {
    baseName: string;
    tokens: string[];
} | null;
/** A registered icon, or style suffixes on one (`chevronRight50o`). */
export declare function canResolve(name: string): boolean;
/**
 * `spinN<Icon>` animates, so it is drawn by the DOM renderer, which installs `apply` when
 * it loads. Its prefix is here so that every module knows the rule exists.
 */
export declare const spinRule: IconRule;
export declare const iconRules: IconRule[];
/**
 * The icon a rule would apply to in `name`, or null if the rule does not match it.
 *
 * A `:` makes the boundary explicit: `check:box` is the `check` rule applied to `box`, with
 * no camelCase guess, so it never reads as an icon called `checkBox`. Everything before the
 * first `:` must be the whole prefix (`spin90:loader`, `un:lock`).
 */
export declare function matchRule(rule: IconRule, name: string): {
    baseName: string;
    match: RegExpMatchArray | string;
} | null;
/** Whether some rule would draw `name`: it matches, and what it applies to draws (rules chain). */
export declare const ruleDraws: (name: string, depth?: number) => boolean;
/** A registered icon, suffixes on one, or a rule that draws (`un:check:square`, `unCheckLock`). */
export declare const drawable: (name: string, depth?: number) => boolean;
