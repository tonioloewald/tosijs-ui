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
     * Build-time transpiled JS for `tjs` blocks, keyed by exact source text. The
     * renderer embeds these so a page can RUN an example without loading the tjs
     * transpiler (see self-contained-examples-plan.md). Only `tjs` is baked: its
     * build transform is identical to the runtime one, so the bytes match.
     */
    bakes: ExampleBakes;
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
