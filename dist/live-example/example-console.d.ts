export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
/**
 * One call to a shown console method. `args` are the values as logged; nothing is formatted
 * until the panel decides to keep the line (`formatConsoleArgs`), so a superseded run's lines
 * and lines past the cap cost nothing.
 */
export interface ConsoleEntry {
    level: ConsoleLevel;
    args: unknown[];
}
/** One value as a reader would want to see it: strings as written, data as JSON. */
export declare function formatConsoleValue(value: unknown): string;
export declare function formatConsoleArgs(args: unknown[]): string;
/**
 * A `console` for one example run: captured methods report an entry AND forward to `target`
 * (the real console); everything else is the real console's own method.
 */
export declare function createExampleConsole(onEntry: (entry: ConsoleEntry) => void, target?: Console): Console;
/**
 * Does this code declare its own top-level `console`? Then the example console is not
 * injected: it is passed as a parameter, and a parameter cannot be redeclared with `const`,
 * `let`, `class` or `function` — the example would throw a SyntaxError that ran fine before
 * 1.16.2. Such an example keeps the real console. (`var console` is legal and still gets it.)
 */
export declare function declaresConsole(code: string): boolean;
/**
 * Turn the example console off (or back on) for every example on the page. Logs still reach
 * devtools either way. A single example opts out with the fence option `{"console": false}`;
 * a whole `tosijs-ui/site` site with `exampleConsole: false` in its config.
 */
export declare function setExampleConsole(enabled: boolean): void;
export declare function exampleConsoleEnabled(): boolean;
