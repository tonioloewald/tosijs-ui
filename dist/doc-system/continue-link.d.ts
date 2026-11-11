import { NavDoc, NavNode } from './nav-tree.js';
/**
 * The page a reader continues to from `filename`, or undefined.
 *
 * The OUTERMOST section that opts in decides the sequence, so a book whose chapters are
 * themselves sections reads straight through: the last page of one chapter continues to the
 * next chapter, rather than stopping because the chapter declared a sequence of its own.
 */
export declare function continueTarget<T extends NavDoc>(roots: NavNode<T>[], filename: string): NavNode<T> | undefined;
/**
 * The link itself. "Continue" is localized like the doc system's other captions; the page
 * title is the author's own text.
 */
export declare function continueLinkHtml(href: string, title: string): string;
