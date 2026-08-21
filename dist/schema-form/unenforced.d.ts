import type { JSONSchema } from 'tosijs-schema';
export declare const ENFORCED: Set<string>;
/**
 * The constraining keywords in `schema` that `validate` ignores, deduped and sorted.
 *
 * Shallow **on purpose**: each field asks about its own schema, so a nested gap is reported
 * against the nested field that owns it rather than being blamed on its ancestor.
 */
export declare function unenforcedKeywords(schema: JSONSchema | undefined): string[];
/** e.g. `oneOf and exclusiveMinimum are not validated` — the note a field shows. */
export declare function unenforcedNote(keywords: string[]): string;
