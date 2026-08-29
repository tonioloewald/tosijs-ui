import path from 'path';
/*#
Does this bundle point at a sourcemap nobody will serve?
*/
/**
 * `--sourcemap=linked` appends a `sourceMappingURL` comment, so a browser with devtools open
 * fetches that file on every load. When it is not in the served root the request fails, and the
 * failure surfaces in exactly the session where someone is reading the console carefully for
 * something else — it cost the reporter a wrong hypothesis while chasing a slow load
 * (tosijs-ui#103). Before that it was worse: the dev server's SPA fallback answered with the
 * HTML shell, so devtools received a web page where a JSON map should be (fixed separately,
 * #116).
 *
 * Checks what is SERVED rather than what was built. Those are the same directory by default and
 * different when `bundleOutDir` is set, and the copy across is best-effort by design — a missing
 * map must never fail a build. So this verifies the end state instead of trusting the step.
 *
 * Returns the message, or `null` when there is nothing to say. A pure function taking its own
 * `exists` so it can be tested without a filesystem: the call site lives in a branch this repo's
 * own build does not take (its bundle is built by `bin/dev.ts`, not by `buildSite`), which is
 * exactly why the bug reached an adopter and not us.
 */
export function sourcemapWarning(bundleJs, publicDir, exists) {
    const referenced = /\/\/# sourceMappingURL=(\S+)/.exec(bundleJs);
    if (!referenced)
        return null;
    const name = referenced[1];
    // A data: URI carries the map inline — there is nothing to serve and nothing to miss.
    if (name.startsWith('data:'))
        return null;
    const served = path.resolve(publicDir, name);
    if (exists(served))
        return null;
    return (`⚠️  the bundle references a sourcemap that is not being served:\n` +
        `    expected ${served}\n` +
        `    Every load with devtools open will fetch it and fail. Either serve the map (it is\n` +
        `    written beside the bundle unless \`bundleOutDir\` sends it elsewhere) or build without\n` +
        `    \`--sourcemap\` so nothing points at it.\n`);
}
