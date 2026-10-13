declare global {
    var Bun: any;
}
/**
 * For each package that must be shared, the distinct copies reachable from the project and
 * from every `@codemirror/*` package tosijs-ui depends on. More than one path for a name is
 * the defect. `uiDir` is where tosijs-ui itself is installed.
 */
export declare function codemirrorCopies(root: string, uiDir: string): Record<string, string[]>;
/** What to say about `codemirrorCopies`' answer, or null when each package has one copy. */
export declare function duplicateCodemirrorWarning(copies: Record<string, string[]>): string | null;
/** tosijs-ui's own package directory, found from this module's location. */
export declare function tosijsUiDir(moduleDir: string): string;
