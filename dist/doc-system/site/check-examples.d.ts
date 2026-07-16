import type { Doc } from './docs';
import type { ExampleBakes } from '../render';
export interface ExampleProblem {
    filename: string;
    title: string;
    lang: string;
    error: string;
    snippet: string;
}
export interface ExampleCheck {
    problems: ExampleProblem[];
    /**
     * Build-time transpiled JS for `tjs` blocks, grouped by doc filename, each keyed
     * by exact source text. The renderer embeds a doc's bakes as hidden scripts (so
     * the pre-rendered page RUNS without the tjs transpiler), and they're attached to
     * each Doc in docs.json so client-side SPA navigation gets them too. Only `tjs` is
     * baked: its build transform is identical to the runtime one, so the bytes match.
     * See self-contained-examples-plan.md.
     */
    bakes: Map<string, ExampleBakes>;
}
/**
 * Transpile-check every executable block in the corpus. Returns the problems and
 * the `tjs` bakes (which it computes anyway while checking — no double transpile).
 */
export declare function checkExamples(docs: Doc[], opts?: {
    contextKeys?: string[];
}): Promise<ExampleCheck>;
/** Format problems for a build log. */
export declare function formatExampleProblems(problems: ExampleProblem[]): string;
