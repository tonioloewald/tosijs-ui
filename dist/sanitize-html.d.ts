/**
 * Parse `html` into an inert fragment with executable content removed.
 *
 * `allowedElements` names the custom elements that may survive, as a space- or comma-separated
 * string; every other custom element is unwrapped (its already-sanitized content kept).
 */
export declare function sanitizedFragment(html: string, allowedElements?: string): DocumentFragment;
/** Replace `target`'s children with sanitized `html`. */
export declare function setSanitizedHtml(target: Element, html: string, allowedElements?: string): void;
