import type { SiteConfig } from './site-config';
declare global {
    var Bun: any;
}
/**
 * Resolve the idle-exit timeout to milliseconds (0 = disabled).
 *
 * Env wins over config, config over the default. An unparseable value falls back
 * to the default rather than to 0: a typo'd `DEV_IDLE_TIMEOUT_HOURS=8h` must not
 * silently turn the guard OFF — that is the exact failure it exists to prevent.
 * Only an explicit non-positive number disables it.
 */
export declare function resolveIdleMs(configHours: number | undefined, envHours: string | undefined): number;
export declare function devServer(config: SiteConfig, opts?: {
    test?: boolean;
    build?: () => unknown | Promise<unknown>;
}): Promise<void>;
