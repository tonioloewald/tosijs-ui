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
/*
Recognised by SHAPE, not `instanceof`: an `:iframe` example's values come from the iframe's
realm, whose `Error` and `Element` are not this window's, so `instanceof` said "plain object"
and an error printed as `{}`.
*/
const tagOf = (value) => Object.prototype.toString.call(value);
const isErrorLike = (value) => tagOf(value) === '[object Error]' ||
    (value !== null &&
        typeof value === 'object' &&
        typeof value.name === 'string' &&
        typeof value.message === 'string' &&
        'stack' in value);
const isElementLike = (value) => value !== null &&
    typeof value === 'object' &&
    value.nodeType === 1 &&
    typeof value.tagName === 'string';
/** One value as a reader would want to see it: strings as written, data as JSON. */
export function formatConsoleValue(value) {
    if (typeof value === 'string')
        return value;
    if (isErrorLike(value))
        return `${value.name}: ${value.message}`;
    if (typeof value === 'function')
        return `ƒ ${value.name || 'anonymous'}()`;
    if (isElementLike(value)) {
        const id = value.id ? `#${value.id}` : '';
        return `<${value.tagName.toLowerCase()}${id}>`;
    }
    if (value === null || typeof value !== 'object')
        return String(value);
    /*
    `[Circular]` only for a real cycle: an object that is its own ANCESTOR on the current path.
    A set of everything already printed marked any value logged twice (`{ a: x, b: x }`) as
    circular when nothing was. JSON.stringify calls the replacer with the holder as `this`, so
    trimming the path back to the holder keeps it exactly the current ancestry.
    */
    const path = [];
    try {
        return (JSON.stringify(value, function (_key, item) {
            while (path.length > 0 && path[path.length - 1] !== this)
                path.pop();
            if (typeof item === 'bigint')
                return `${item}n`;
            if (typeof item === 'function')
                return `ƒ ${item.name || 'anonymous'}()`;
            if (item === null || typeof item !== 'object')
                return item;
            if (path.includes(item))
                return '[Circular]';
            if (isErrorLike(item))
                return `${item.name}: ${item.message}`;
            if (isElementLike(item))
                return formatConsoleValue(item);
            path.push(item);
            if (tagOf(item) === '[object Map]') {
                const entries = [...item];
                return entries.every(([k]) => typeof k === 'string')
                    ? { Map: Object.fromEntries(entries) }
                    : { Map: entries };
            }
            if (tagOf(item) === '[object Set]')
                return { Set: [...item] };
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
                onEntry({ level, args });
                return original.apply(real, args);
            };
        },
    });
}
/**
 * Does this code declare its own top-level `console`? Then the example console is not
 * injected: it is passed as a parameter, and a parameter cannot be redeclared with `const`,
 * `let`, `class` or `function` — the example would throw a SyntaxError that ran fine before
 * 1.16.2. Such an example keeps the real console. (`var console` is legal and still gets it.)
 */
export function declaresConsole(code) {
    return /(?:^|[^\w$.])(?:const|let|class|function)\s+console\b/.test(code);
}
/**
 * Turn the example console off (or back on) for every example on the page. Logs still reach
 * devtools either way. A single example opts out with the fence option `{"console": false}`;
 * a whole `tosijs-ui/site` site with `exampleConsole: false` in its config.
 */
export function setExampleConsole(enabled) {
    ;
    globalThis.__TOSI_EXAMPLE_CONSOLE = enabled;
}
export function exampleConsoleEnabled() {
    return globalThis.__TOSI_EXAMPLE_CONSOLE !== false;
}
