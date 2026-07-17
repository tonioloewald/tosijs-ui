import { elements } from 'tosijs';
import { scopeCaptureEpilogue } from 'tjs-lang/editors';
import { rewriteImports, AsyncFunction, contextVarName } from './code-transform';
// Injected context name for the scope-capture callback (see `onScope`). Chosen to
// not collide with anything an example would plausibly declare.
const SCOPE_CAPTURE_VAR = '__tosiCaptureScope';
const { div } = elements;
/**
 * Register web components in an iframe's customElements registry.
 *
 * Uses two strategies:
 * 1. Scans context exports for creator functions with a `tagName` property
 * 2. Scans the iframe HTML for any custom-element tags (contain a hyphen)
 *    and registers them from the main window's customElements registry
 */
export function registerComponentsInIframe(iframeWindow, context) {
    const iframeCustomElements = iframeWindow.customElements;
    if (!iframeCustomElements)
        return;
    const register = (tagName) => {
        if (!tagName || iframeCustomElements.get(tagName))
            return;
        const ComponentClass = customElements.get(tagName);
        if (ComponentClass) {
            try {
                iframeCustomElements.define(tagName, ComponentClass);
            }
            catch {
                // May fail if already defined — ignore
            }
        }
    };
    // Strategy 1: context exports with tagName (e.g. element creators)
    for (const lib of Object.values(context)) {
        if (lib && typeof lib === 'object') {
            for (const creator of Object.values(lib)) {
                if (typeof creator === 'function' && 'tagName' in creator) {
                    register(creator.tagName);
                }
            }
        }
    }
    // Strategy 2: scan iframe DOM for unregistered custom-element tags
    const iframeDoc = iframeWindow.document;
    if (iframeDoc) {
        const allElements = iframeDoc.querySelectorAll('*');
        for (const el of allElements) {
            const tag = el.tagName.toLowerCase();
            if (tag.includes('-')) {
                register(tag);
            }
        }
    }
}
/**
 * Append a scope-capture epilogue to already-transformed example code when a
 * consumer wants the run's locals. Returns the (possibly unchanged) code plus the
 * extra context entry to inject. The epilogue no-ops if the example binds nothing.
 */
export function withScopeCapture(transformedCode, onScope) {
    if (!onScope)
        return { code: transformedCode, extraContext: {} };
    // tjs-lang 0.10.x's real AST-based scope extractor (tjs-lang#10) — replaced our
    // hand-rolled scanner. It emits `try { <captureVar>({ a, b, … }) } catch {}`, the
    // same object-of-bindings contract onScope already expects. The `tjs-lang/editors`
    // entry is ~5KB and self-contained (no acorn), so this is a negligible bundle add.
    const epilogue = scopeCaptureEpilogue(transformedCode, SCOPE_CAPTURE_VAR);
    if (!epilogue)
        return { code: transformedCode, extraContext: {} };
    return {
        code: transformedCode + epilogue,
        extraContext: { [SCOPE_CAPTURE_VAR]: onScope },
    };
}
/**
 * Execute code inline (directly in the page)
 */
export async function executeInline(options) {
    const { html, css, js, context, transform, compiledJs, exampleElement, styleElement, widgetsElement, onError, onScope, } = options;
    const preview = div({ class: 'preview' });
    preview.innerHTML = html;
    styleElement.innerText = css;
    const oldPreview = exampleElement.querySelector('.preview');
    if (oldPreview) {
        oldPreview.replaceWith(preview);
    }
    else {
        exampleElement.insertBefore(preview, widgetsElement);
    }
    try {
        const transformedCode = compiledJs ??
            (await transform(rewriteImports(js, Object.keys(context)), {
                transforms: ['typescript'],
            })).code;
        const { code: finalCode, extraContext } = withScopeCapture(transformedCode, onScope);
        const fullContext = { preview, ...context, ...extraContext };
        const contextKeys = Object.keys(fullContext).map(contextVarName);
        const contextValues = Object.values(fullContext);
        // @ts-expect-error AsyncFunction constructor typing
        const func = new AsyncFunction(...contextKeys, finalCode);
        await func(...contextValues);
    }
    catch (e) {
        console.error(e);
        preview.append(div({ class: 'preview-error' }, String(e.message || e)));
        if (onError)
            onError(e);
        else
            window.alert(`Error: ${e}, the console may have more information…`);
    }
    return preview;
}
/**
 * Execute code in an isolated iframe
 */
export async function executeInIframe(options) {
    const { html, css, js, context, transform, compiledJs, exampleElement, widgetsElement, onError, onScope, } = options;
    // Create or reuse iframe
    let iframe = exampleElement.querySelector('iframe.preview-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.className = 'preview-iframe';
        iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
        const oldPreview = exampleElement.querySelector('.preview');
        if (oldPreview) {
            oldPreview.replaceWith(iframe);
        }
        else {
            exampleElement.insertBefore(iframe, widgetsElement);
        }
    }
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
        console.error('Could not access iframe document');
        return null;
    }
    const iframeWindow = iframe.contentWindow;
    // Copy libraries to iframe window
    if (context['tosijs']) {
        iframeWindow.tosijs = context['tosijs'];
    }
    if (context['tosijs-ui']) {
        iframeWindow.tosijsui = context['tosijs-ui'];
    }
    // Write HTML and CSS to iframe
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; }
    .preview { height: 100%; position: relative; }
    ${css}
  </style>
</head>
<body>
  <div class="preview">${html}</div>
</body>
</html>`);
    iframeDoc.close();
    // Register web components in iframe
    registerComponentsInIframe(iframeWindow, context);
    const preview = iframeDoc.querySelector('.preview');
    if (!preview) {
        console.error('Could not find preview element in iframe');
        return null;
    }
    try {
        const transformedCode = compiledJs ??
            (await transform(rewriteImports(js, Object.keys(context)), {
                transforms: ['typescript'],
            })).code;
        const { code: finalCode, extraContext } = withScopeCapture(transformedCode, onScope);
        // Execute JS in iframe context
        const fullContext = { preview, ...context, ...extraContext };
        // Create AsyncFunction in iframe's context
        const IframeAsyncFunction = iframeWindow.eval('(async () => {}).constructor');
        const contextKeys = Object.keys(fullContext).map(contextVarName);
        const contextValues = Object.values(fullContext);
        const func = new IframeAsyncFunction(...contextKeys, finalCode);
        await func(...contextValues);
    }
    catch (e) {
        console.error(e);
        const errorDiv = iframeDoc.createElement('div');
        errorDiv.className = 'preview-error';
        errorDiv.textContent = String(e.message || e);
        preview.append(errorDiv);
        if (onError)
            onError(e);
        else
            window.alert(`Error: ${e}, the console may have more information…`);
    }
    return preview;
}
