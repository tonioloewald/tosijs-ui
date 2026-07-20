export interface ExampleEdit {
    js?: string;
    html?: string;
    css?: string;
    test?: string;
    compiledJs?: string;
}
/** Stable key for an example, from its source↔doc map attributes. */
export declare function exampleEditKey(sourceFile: string, ordinal: string | number): string;
export declare function saveExampleEdit(key: string, edit: ExampleEdit): void;
export declare function loadExampleEdit(key: string): ExampleEdit | null;
export declare function clearExampleEdit(key: string): void;
export declare function hasExampleEdit(key: string): boolean;
