export interface JSONSchema {
    type?: string | string[];
    properties?: Record<string, JSONSchema>;
    additionalProperties?: boolean | JSONSchema;
    items?: JSONSchema;
    /** typed for interop but NOT enforced by their `validate` */
    prefixItems?: JSONSchema[];
    required?: string[];
    enum?: readonly unknown[];
    const?: unknown;
    anyOf?: JSONSchema[];
    allOf?: JSONSchema[];
    oneOf?: JSONSchema[];
    not?: JSONSchema;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
    minItems?: number;
    maxItems?: number;
    minProperties?: number;
    maxProperties?: number;
    title?: string;
    description?: string;
    default?: unknown;
    examples?: unknown[];
    $ref?: string;
    $defs?: Record<string, JSONSchema>;
    $schema?: string;
    /** predicate source; ignored unless an evaluator is registered */
    $predicate?: string;
    /** values this schema must REFUSE — a gate that never says no isn't a gate */
    $counterexamples?: unknown[];
    /** marks a schema derived from a sample rather than authored */
    $inferred?: boolean;
    /** anything else, including the `x-` extensions and keywords we do not model */
    [key: string]: unknown;
}
