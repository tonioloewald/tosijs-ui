/*
The example console: what an example logs, shown under its preview (tjs-lang's ask on #184 —
"`tjs` examples that `console.log` show nothing on the page").

Each run gets its OWN `console`, injected the way `preview` is: as a parameter of the function
the example runs in, so `console.log(…)` in the example — and in any closure it creates — means
this object. The global `console` is never patched, so two examples never see each other's
output and nothing outside an example is captured. Everything is still forwarded to the real
console, so devtools (and the doc-test console-clean check) see exactly what they saw before.
*/
// Methods whose output is shown, and the level each is shown at. Anything else
// (`time`, `group`, `assert`, `count`, …) only goes to the real console.
const CAPTURED = {
    log: 'log',
    info: 'info',
    warn: 'warn',
    error: 'error',
    debug: 'debug',
    dir: 'log',
    table: 'log',
};
/** One value as a reader would want to see it: strings as written, data as JSON. */
export function formatConsoleValue(value) {
    if (typeof value === 'string')
        return value;
    if (value instanceof Error)
        return `${value.name}: ${value.message}`;
    if (typeof value === 'function')
        return `ƒ ${value.name || 'anonymous'}()`;
    if (typeof Element !== 'undefined' && value instanceof Element) {
        const id = value.id ? `#${value.id}` : '';
        return `<${value.tagName.toLowerCase()}${id}>`;
    }
    if (value === null || typeof value !== 'object')
        return String(value);
    const seen = new WeakSet();
    try {
        return (JSON.stringify(value, (_key, item) => {
            if (typeof item === 'bigint')
                return `${item}n`;
            if (typeof item === 'function')
                return `ƒ ${item.name || 'anonymous'}()`;
            if (item && typeof item === 'object') {
                if (seen.has(item))
                    return '[Circular]';
                seen.add(item);
            }
            return item;
        }, 2) ?? String(value));
    }
    catch {
        return String(value);
    }
}
export function formatConsoleArgs(args) {
    return args.map(formatConsoleValue).join(' ');
}
/**
 * A `console` for one example run: captured methods report an entry AND forward to `target`
 * (the real console); everything else is the real console's own method.
 */
export function createExampleConsole(onEntry, target = globalThis.console) {
    return new Proxy(target, {
        get(real, prop, receiver) {
            const original = Reflect.get(real, prop, receiver);
            if (typeof prop !== 'string' || typeof original !== 'function')
                return original;
            const level = CAPTURED[prop];
            if (level === undefined)
                return original.bind(real);
            return (...args) => {
                onEntry({ level, text: formatConsoleArgs(args) });
                return original.apply(real, args);
            };
        },
    });
}
let pageEnabled = true;
/**
 * Turn the example console off (or back on) for every example on the page. Logs still reach
 * devtools either way. A single example opts out with the fence option `{"console": false}`.
 */
export function setExampleConsole(enabled) {
    pageEnabled = enabled;
}
export function exampleConsoleEnabled() {
    return pageEnabled;
}
