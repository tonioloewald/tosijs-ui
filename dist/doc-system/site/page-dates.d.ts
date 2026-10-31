/** Run a git command in `cwd`; '' when git is missing or the command fails. */
type Git = (args: string[], cwd: string) => string;
/**
 * Last-modified ISO dates keyed by the paths given (as given, relative to `cwd`). Paths with no
 * date are absent.
 */
export declare function sourceDates(paths: string[], cwd: string, git?: Git, mtime?: (file: string) => Date | undefined): Map<string, string>;
export {};
