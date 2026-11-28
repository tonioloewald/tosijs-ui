export declare const JSON_COMMENT: RegExp;
/** The JSON text a lexer token spells as a JSON comment block, or null. */
export declare function jsonCommentText(token: {
    type?: string;
    raw?: string;
}): string | null;
