/*
The validator seam: two functions, supplied by you.

`<tosi-schema-form>`, `<tosi-crud>` and an editable `<tosi-table>` all want to know whether a
value conforms to a schema. None of them names a library to ask, and that is deliberate.

WHY THERE IS NO `import('tosijs-schema')` HERE. A bare specifier in a dynamic import has
exactly two fates in a bundler and no third:

  resolved      → the module is bundled in, and the build FAILS for a consumer who did not
                  install it — including consumers of `<tosi-table>`, who never asked for a
                  schema library at all;
  externalized  → the build passes, and the browser cannot resolve a bare specifier at
                  runtime, so validation dies silently for EVERYONE, including consumers who
                  did install it.

Both were measured (the second emptied our own doc site's validator and turned two lanes
red). No comment or flag gets both columns green, so the component asks for the functions
instead of the package.

WHAT THAT BUYS BEYOND PACKAGING. The surface is `validate` and `inferSchema` — not "the
tosijs-schema module". Anything that can answer those two questions works: an Ajv wrapper, a
house validator, a stub in a test. `tosijs-schema` is the implementation we ship support and
docs for, not a requirement.

Registered automatically in the iife and in the doc-site hydrate bundle, because those are
bundles we build. ESM consumers write one line — see the schema-form docs.
*/
let current = null;
/*
Once PER REASON, not once per process.

A single flag meant the first component to say anything silenced every other message: on a
page where an editable table warned about validation, a blank form warned about nothing at
all — and a blank form is the more confusing of the two.
*/
const warned = new Set();
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
export function setSchemaValidator(validator) {
    current = validator;
    /*
    Cleared on ANY change, including removal. Resetting only when a validator ARRIVES left the
    warnings permanently suppressed after one was taken away — so the state in which the warning
    matters most was the one state that could not produce it.
    */
    warned.clear();
    for (const listener of listeners)
        listener();
}
export function getSchemaValidator() {
    return current;
}
/**
 * Is validation actually available?
 *
 * Readable on purpose. Without it, `form.validate() === true` is ambiguous between "this
 * conforms" and "nobody checked", and a Save handler cannot tell the difference — which is
 * the failure mode a silent optional dependency produces.
 */
export function schemaValidationAvailable() {
    return current !== null;
}
/*
Say something, once, the first time validation is asked for and cannot be given.

A silent degrade is the worst version of an optional dependency: the form renders, reports no
errors, and looks like it validated. One warning naming the package and the seam turns that
into a five-second fix.
*/
const REGISTER = `  import { setSchemaValidator } from 'tosijs-ui'\n` +
    `  import { validate, inferSchema, unenforcedKeywords } from 'tosijs-schema' // ^1.8.0\n` +
    `  setSchemaValidator({ validate, inferSchema, unenforcedKeywords })`;
export function warnNoValidator(what) {
    if (current || warned.has('validate'))
        return;
    warned.add('validate');
    console.warn(`tosijs-ui: ${what} needs a schema validator and none is registered — nothing is being ` +
        `validated.\n${REGISTER}`);
}
/**
 * A different problem from "nothing is being validated", and a more confusing one.
 *
 * With no schema AND no validator there is nothing to infer a schema *from*, so the form has
 * no fields to render at all. Warning about validation there describes the absence of error
 * reporting while the user is looking at an empty box — it names the wrong thing at the exact
 * moment they need the right one.
 */
export function warnCannotInfer() {
    if (warned.has('infer'))
        return;
    warned.add('infer');
    console.warn(`tosijs-ui: <tosi-schema-form> has no \`schema\` and no validator to infer one from, so ` +
        `it has no fields to render.\n  Give it a \`schema\`, or register a validator whose ` +
        `\`inferSchema\` can derive one:\n${REGISTER}`);
}
const listeners = new Set();
/** Called when the validator changes, so a live form can pick up a late registration. */
export function onSchemaValidatorChanged(listener) {
    listeners.add(listener);
}
