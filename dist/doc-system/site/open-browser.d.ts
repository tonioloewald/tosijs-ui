declare global {
    var Bun: any;
}
/** Browsers we can drive for tab-reuse, and which AppleScript dialect each speaks. */
type Flavor = 'chromium' | 'safari';
/** Scheme + host + port, no path — the durable per-project tab key. */
export declare function originOf(url: string): string;
/** AppleScript that focuses an existing project tab or opens a new one. */
export declare function appleScript(flavor: Flavor, app: string, origin: string, url: string): string;
export type OpenPlan = {
    action: 'skip';
    reason: string;
} | {
    action: 'applescript';
    app: string;
    flavor: Flavor;
    script: string;
} | {
    action: 'exec';
    cmd: string[];
    reuse: boolean;
};
export interface OpenPlanInput {
    url: string;
    /** the `openBrowser` site-config value */
    setting: boolean | string | undefined;
    env: {
        BROWSER?: string;
        CI?: string;
    };
    platform: string;
    isTTY: boolean;
    /** `ps` output lines (or app names) of currently-running apps — darwin only */
    running: string[];
}
/**
 * Decide what (if anything) to do to open the browser. Pure and fully injectable so
 * the platform/browser branches are unit-testable without spawning anything.
 */
export declare function buildOpenPlan(input: OpenPlanInput): OpenPlan;
/** `osascript` argv for a script — each line as its own `-e` (no temp file). */
export declare function osascriptArgv(script: string): string[];
/**
 * Open (or bring to front) the project's dev tab. Best-effort: logs one line, never
 * throws, never blocks. Call it once, after the server is listening — interactive
 * launches only (the caller already excludes test mode).
 */
export declare function openDevBrowser(opts: {
    url: string;
    setting: boolean | string | undefined;
    name?: string;
}): Promise<void>;
export {};
