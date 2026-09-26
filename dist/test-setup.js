/*
tosijs-ui/test-setup — the happy-dom preload for `bun test` (#170).

    # bunfig.toml
    [test]
    preload = ["tosijs-ui/test-setup"]

It gives Bun's test runner a DOM: a happy-dom Window whose globals (document, HTMLElement,
customElements, events, observers, …) are copied onto globalThis, so web components and tosijs
code run in unit tests. Requires `happy-dom` (an optional peer of tosijs-ui).

It is a published export rather than a file to copy because the copies drifted: tosijs-virta's
was a byte copy of tosijs-editor's, which was already six lines behind this one, each adding or
dropping globals (Range, NodeFilter), and a fix to one reached none of the others. This file is
also tosijs-ui's OWN preload (bunfig.toml), so it is exercised by every unit test here.

Side-effecting by design, and not in the root barrel: importing it installs globals.
*/
import { Window } from 'happy-dom';
const window = new Window();
// Patch error constructors onto happy-dom Window for Bun compatibility.
// Bun doesn't populate these on the Window instance, but happy-dom's internals
// (e.g. SelectorParser) reference this.window.SyntaxError.
const errorConstructors = ['SyntaxError', 'TypeError', 'RangeError'];
for (const name of errorConstructors) {
    if (window[name] === undefined) {
        ;
        window[name] = globalThis[name];
    }
}
// Expose all window properties to globalThis for DOM compatibility
const windowProps = [
    'window',
    'document',
    'localStorage',
    'addEventListener',
    'removeEventListener',
    'HTMLElement',
    'HTMLSpanElement',
    'HTMLDivElement',
    'HTMLInputElement',
    'HTMLButtonElement',
    'HTMLFormElement',
    'HTMLAnchorElement',
    'HTMLImageElement',
    'HTMLTableElement',
    'HTMLTemplateElement',
    'HTMLProgressElement',
    'HTMLDialogElement',
    'HTMLLabelElement',
    'HTMLSelectElement',
    'HTMLOptionElement',
    'HTMLTextAreaElement',
    'customElements',
    'Element',
    'Node',
    // kilpi's sanitizer walks with createTreeWalker(root, NodeFilter.SHOW_ELEMENT) (#179)
    'NodeFilter',
    'Text',
    'DocumentFragment',
    'Event',
    'CustomEvent',
    'MouseEvent',
    'KeyboardEvent',
    'InputEvent',
    'FocusEvent',
    'MutationObserver',
    'ResizeObserver',
    'IntersectionObserver',
    'CSSStyleDeclaration',
    'SVGElement',
    'SVGSVGElement',
    'DOMParser',
    'XMLSerializer',
    'NodeList',
    'HTMLCollection',
    'URL',
    'URLSearchParams',
];
const globals = { window };
for (const prop of windowProps) {
    if (window[prop] !== undefined) {
        globals[prop] = window[prop];
    }
}
// Bind functions that need window context
globals.getComputedStyle = window.getComputedStyle.bind(window);
globals.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globals.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globals.fetch = window.fetch.bind(window);
Object.assign(globalThis, globals);
