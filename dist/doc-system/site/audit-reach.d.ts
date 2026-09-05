export type Reach = 'runtime' | 'build-only';
export interface RootManifest {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}
/**
 * Mark every package reachable from the root's runtime edges.
 *
 * `depsOf` returns an installed package's own `dependencies` (plus optional), or `undefined`
 * when it cannot be resolved — which counts as reachable, per the note above.
 */
export declare function runtimeReachable(root: RootManifest, depsOf: (pkg: string) => Record<string, string> | undefined): Set<string>;
/** `runtime` when the package is reachable from a runtime edge, else `build-only`. */
export declare function classifyReach(pkg: string, reachable: Set<string>): Reach;
