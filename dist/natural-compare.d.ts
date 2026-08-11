/** `null`, `undefined` and the empty string — pinned last however you sort. */
export declare function isBlank(value: unknown): boolean;
/**
 * Compare two values the way a reader expects. Suitable for `Array.prototype.sort`.
 *
 * Blanks sort last. Numeric values (including numeric strings) compare as numbers;
 * everything else compares with a locale collator.
 */
export declare function naturalCompare(a: unknown, b: unknown): number;
/**
 * A comparator for `sort`, given how to read the value and which way to sort.
 *
 * Blanks stay last in BOTH directions, which is why the direction sign cannot simply be
 * multiplied over `naturalCompare` by the caller.
 */
export declare function naturalSorter<T>(key: (item: T) => unknown, ascending?: boolean): (a: T, b: T) => number;
