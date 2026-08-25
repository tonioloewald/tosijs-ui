import type { JSONSchema } from './json-schema.js';
export type SchemaErrorCallback = (path: string, message: string) => void;
export interface SchemaValidator {
    /**
     * `true` when `value` conforms. `onError` is called per problem with a dotted path.
     *
     * Matches `tosijs-schema`'s `validate(value, schema, onError | options)`.
     */
    validate: (value: unknown, schema: JSONSchema, onError?: SchemaErrorCallback | {
        onError?: SchemaErrorCallback;
        strict?: boolean;
    }) => boolean;
    /** Derive a schema from a sample. Optional — without it, a form with no schema stays empty. */
    inferSchema?: (sample: unknown) => JSONSchema;
    /**
     * Which constraining keywords in this schema does `validate` NOT enforce?
     *
     * Optional, and preferred over our local copy whenever a validator supplies it — the
     * validator in use is the only thing that actually knows. tosijs-schema 1.8.0 exports this
     * (it was ask 3 of tosijs-ui's issue #8), which is why the local walker is now a fallback
     * rather than the answer.
     */
    unenforcedKeywords?: (schema: JSONSchema) => string[];
}
/**
 * Supply the validator. Pass `null` to remove it.
 *
 *     import { setSchemaValidator } from 'tosijs-ui'
 *     import { validate, inferSchema, unenforcedKeywords } from 'tosijs-schema'
 *     setSchemaValidator({ validate, inferSchema, unenforcedKeywords })
 *
 * Pass **all three**. Omitting `unenforcedKeywords` falls back to a local list that mirrors
 * tosijs-schema 1.7.0, so every field using `oneOf` or `exclusiveMinimum` — enforced since
 * 1.8.0 — is labelled "not validated" when it is being validated. The note exists to stop the
 * form lying about what it checked; the wrong recipe makes it the thing lying.
 */
export declare function setSchemaValidator(validator: SchemaValidator | null): void;
export declare function getSchemaValidator(): SchemaValidator | null;
/**
 * Is validation actually available?
 *
 * Readable on purpose. Without it, `form.validate() === true` is ambiguous between "this
 * conforms" and "nobody checked", and a Save handler cannot tell the difference — which is
 * the failure mode a silent optional dependency produces.
 */
export declare function schemaValidationAvailable(): boolean;
export declare function warnNoValidator(what: string): void;
/**
 * A different problem from "nothing is being validated", and a more confusing one.
 *
 * With no schema AND no validator there is nothing to infer a schema *from*, so the form has
 * no fields to render at all. Warning about validation there describes the absence of error
 * reporting while the user is looking at an empty box — it names the wrong thing at the exact
 * moment they need the right one.
 */
export declare function warnCannotInfer(): void;
/** Called when the validator changes, so a live form can pick up a late registration. */
export declare function onSchemaValidatorChanged(listener: () => void): void;
