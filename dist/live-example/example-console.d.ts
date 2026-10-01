export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export interface ConsoleEntry {
    level: ConsoleLevel;
    text: string;
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
 * Turn the example console off (or back on) for every example on the page. Logs still reach
 * devtools either way. A single example opts out with the fence option `{"console": false}`.
 */
export declare function setExampleConsole(enabled: boolean): void;
export declare function exampleConsoleEnabled(): boolean;
