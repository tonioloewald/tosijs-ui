/*
Build configuration for the static doc-system site.

A project drops a `tosijs-site.config.ts` at its root that does
`export default defineSiteConfig({ ... })`; the build (bin/dev.ts) imports it and
feeds it to the generator. This is the single place a consuming repo (tosijs-ui,
tosijs-3d, ...) configures branding, links, theme, SEO defaults, and build paths —
the seam that makes the build system reusable.

Imports here are type-only so this module stays free of runtime/DOM dependencies
(it is loaded by the build, which has no DOM).
*/
/** Identity helper that gives a site config module full type-checking + IDE help. */
export function defineSiteConfig(config) {
    return config;
}
export function resolveDevPort(config, env = process.env) {
    return Number(env.PORT || config.port || 8787);
}
/**
 * The loopback port the tunnel forwards to. Defaults to `devPort + 1` so two projects —
 * or a dev server and a test lane — stay disjoint by construction.
 */
export function resolveTunnelLocalPort(config, env = process.env) {
    return Number(config.preview?.tunnel?.localPort ?? resolveDevPort(config, env) + 1);
}
