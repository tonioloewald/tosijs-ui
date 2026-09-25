/** Re-express one map's sources, as if the map moved from `fromDir` to `toDir`. */
export declare function relocateSources(sources: string[], fromDir: string, toDir: string): string[];
/**
 * For every `.map` under `builtDir`, write a copy at the same relative path under
 * `servedDir` with its `sources` rewritten for that location.
 */
export declare function relocateSourcemaps(builtDir: string, servedDir: string): void;
