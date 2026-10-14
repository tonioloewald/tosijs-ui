import type { ElementPart } from 'tosijs';
export interface IconRule {
    prefix: string | RegExp;
    apply: (baseName: string, match: RegExpMatchArray | string, parts: ElementPart[]) => Element | string | null;
}
/** A registered icon, or style suffixes on one (`chevronRight50o`). */
export declare function canResolve(name: string): boolean;
/**
 * `spinN<Icon>` animates, so it is drawn by the DOM renderer, which installs `apply` when
 * it loads. Its prefix is here so that every module knows the rule exists.
 */
export declare const spinRule: IconRule;
export declare const iconRules: IconRule[];
/** The icon a rule would apply to in `name`, or null if the rule does not match it. */
export declare function matchRule(rule: IconRule, name: string): {
    baseName: string;
    match: RegExpMatchArray | string;
} | null;
/** Whether some rule would draw `name`: it matches, and the icon it applies to exists. */
export declare const ruleDraws: (name: string) => boolean;
