export interface LibraryBundle {
    /** Entry points relative to the project root, e.g. `['src/index.ts', 'src/core.ts']`. */
    entries: string[];
    /**
     * Packages left as imports instead of bundled (each also matches its subpaths). Default:
     * every `dependencies`, `peerDependencies` and `optionalDependencies` name in package.json.
     */
    externals?: string[];
    /** tsconfig for the declaration pass (run with `--emitDeclarationOnly`). Default: the root one. */
    tsconfig?: string;
    /** `bun build --target`. Default `browser`. */
    target?: 'browser' | 'node' | 'bun';
}
interface PackageJsonDeps {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
}
/** The externals to use: the configured list, or every declared runtime dependency. */
export declare function bundleExternals(bundle: LibraryBundle, pkg: PackageJsonDeps): string[];
/** The `bun build` argv for the JavaScript half. */
export declare function bundleBuildArgs(bundle: LibraryBundle, pkg: PackageJsonDeps, outdir: string): string[];
/** The `tsc` argv for the declaration half. */
export declare function bundleDeclarationArgs(bundle: LibraryBundle, outdir: string): string[];
export declare function extensionlessImports(dir: string): string[];
export {};
