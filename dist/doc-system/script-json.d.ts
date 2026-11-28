/**
 * JSON for the inside of a `<script>` element. Escaping `<` stops a `</script>` (or `<!--`) in
 * the data from ending the element early; `JSON.parse` and the JS parser both read `<` back
 * as `<`, so the value is unchanged. The one copy of the rule (lean review P13, #4342): the
 * build-status snippet was the copy that forgot it.
 */
export declare function scriptJson(value: unknown): string;
