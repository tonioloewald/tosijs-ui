/*
Composition rules (`spinNLoader`, `unLock`, `checkFile`, …) and how a name is matched to
one, in ONE place. `icons.ts` (the DOM renderer) draws through them; `icon-svg.ts` (markup
without a DOM) asks the same question, "would the renderer draw this name?", so it can tell
a rule it cannot render from a name nothing would draw. It once guessed rules from the shape
of a name instead, and threw for `redLock`. DOM-free, so `icon-svg.ts` can import it.

Rules an app adds with `iconRules.push()` are seen by both, as long as they are pushed
before the name is asked for.
*/
import iconData from './icon-data.js';
import { splitSuffixes } from './icon-suffixes.js';
/** A registered icon, or style suffixes on one (`chevronRight50o`). */
export function canResolve(name) {
    const data = iconData;
    if (data[name])
        return true;
    const split = splitSuffixes(name);
    return split != null && !!data[split.baseName];
}
/**
 * `spinN<Icon>` animates, so it is drawn by the DOM renderer, which installs `apply` when
 * it loads. Its prefix is here so that every module knows the rule exists.
 */
export const spinRule = {
    prefix: /^spin(_?\d+)/,
    apply() {
        throw new Error('spin icons are drawn by the icon renderer (tosijs-ui/icons)');
    },
};
export const iconRules = [
    spinRule,
    {
        prefix: 'un',
        apply: (baseName) => `slash25o$${baseName}75s75o`,
    },
    {
        prefix: 'check',
        apply: (baseName) => `check75o_00aa00S$${baseName}75s50o`,
    },
    {
        prefix: 'cancel',
        apply: (baseName) => `x75o_cc0000S$${baseName}75s50o`,
    },
    {
        prefix: 'search',
        apply: (baseName) => `search80s30x30y$${baseName}50o`,
    },
];
/** The icon a rule would apply to in `name`, or null if the rule does not match it. */
export function matchRule(rule, name) {
    if (rule.prefix instanceof RegExp) {
        const m = name.match(new RegExp(rule.prefix.source + '(.+)$'));
        if (!m)
            return null;
        const tail = m[m.length - 1];
        return { baseName: tail[0].toLowerCase() + tail.slice(1), match: m };
    }
    if (!name.startsWith(rule.prefix) || name.length <= rule.prefix.length) {
        return null;
    }
    return {
        baseName: name[rule.prefix.length].toLowerCase() +
            name.slice(rule.prefix.length + 1),
        match: rule.prefix,
    };
}
/** Whether some rule would draw `name`: it matches, and the icon it applies to exists. */
export const ruleDraws = (name) => iconRules.some((rule) => {
    const matched = matchRule(rule, name);
    return matched != null && canResolve(matched.baseName);
});
