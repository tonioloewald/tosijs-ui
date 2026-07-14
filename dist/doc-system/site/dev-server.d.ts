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
/**
 * Resolve the RSS ceiling in MB (0 = disabled).
 *
 * Same rule as `resolveIdleMs`, and it was NOT being applied: the ceiling was read as
 * `Number(env ?? config ?? 4096)`, which fails in both directions at once —
 *
 *   DEV_MEMORY_LIMIT_MB=''   → `??` passes '' through → Number('') === 0 → the ceiling
 *                              is ZERO, so `rss >= limit` is true on the first sample
 *                              and the dev server kills itself on every rebuild.
 *   DEV_MEMORY_LIMIT_MB=4gb  → NaN → every `>=` comparison is false → the guard is
 *                              silently OFF, on the machine of someone who was
 *                              explicitly trying to configure it.
 *
 * An empty env var is *unset*, not zero. Garbage falls back to the default, never to
 * off. Only an explicit non-positive number disables the ceiling.
 */
export declare function resolveLimitMb(configMb: number | undefined, envMb: string | undefined): number;
export declare function devServer(config: SiteConfig, opts?: {
    test?: boolean;
    build?: () => unknown | Promise<unknown>;
}): Promise<void>;
