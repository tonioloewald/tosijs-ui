import type { Doc } from './docs';
export interface ExampleProblem {
    filename: string;
    title: string;
    lang: string;
    error: string;
    snippet: string;
}
/** Transpile-check every executable block in the corpus. Returns the problems. */
export declare function checkExamples(docs: Doc[], opts?: {
    contextKeys?: string[];
}): Promise<ExampleProblem[]>;
/** Format problems for a build log. */
export declare function formatExampleProblems(problems: ExampleProblem[]): string;
