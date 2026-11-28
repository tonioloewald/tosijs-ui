/** Is `value` one of the deprecated `xin*` / `Xin*` aliases? Asking does not warn. */
export declare const isDeprecatedAlias: (value: unknown) => boolean;
/** An element-creator alias: calling it warns once, then creates the survivor's element. */
export declare function deprecatedCreator<T extends (...args: any[]) => any>(creator: T, oldName: string, newName: string): T;
/**
 * A class alias: constructing it, extending it, `instanceof`, or reading a static warns once,
 * and each does what it does with the survivor.
 */
export declare function deprecatedClass<T extends abstract new (...args: any) => any>(cls: T, oldName: string, newName: string): T;
