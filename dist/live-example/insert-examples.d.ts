import { ElementCreator } from 'tosijs';
import { ExampleContext } from './types.js';
import type { LiveExample } from './component.js';
/**
 * Find and replace sequences of code blocks with live examples
 */
/**
 * How fences are treated when no per-fence mode says otherwise.
 *
 * `'auto'` (default) — the six executable languages run, which is every corpus written
 * before 1.15 and stays correct for a component library's docs.
 * `'opt-in'` — nothing runs unless its fence asks, via `:inline` / `:iframe` / `:ide`.
 */
import type { ExamplePolicy } from '../doc-system/example-policy.js';
export type { ExamplePolicy };
/** The subset valid for `SiteConfig.liveExamples` — `'none'` is a build target, not a site. */
export type SiteExamplePolicy = Exclude<ExamplePolicy, 'none'>;
export declare function examplePolicy(): ExamplePolicy;
export declare function setExamplePolicy(policy: ExamplePolicy): void;
export declare function insertExamples(element: HTMLElement, context: ExampleContext, liveExampleCreator: ElementCreator<LiveExample>, liveExampleTagName: string, sourceFile?: string): void;
