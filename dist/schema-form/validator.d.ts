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
}
/**
 * Supply the validator. Pass `null` to remove it.
 *
 *     import { setSchemaValidator } from 'tosijs-ui'
 *     import { validate, inferSchema } from 'tosijs-schema'
 *     setSchemaValidator({ validate, inferSchema })
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
/** Called when the validator changes, so a live form can pick up a late registration. */
export declare function onSchemaValidatorChanged(listener: () => void): void;
