/*
Was this page served by the dev server?

Tests default to on, and the background runner checks every page, where the person reading is
developing the site. That used to mean "the hostname is localhost", which left out the tunnel:
`tosijs-tunnel` necessarily serves from another hostname, so the sanctioned way to look at a dev
site remotely was the one place the tests went quiet. The dev server marks every page it serves
(`DEV_SERVER_SNIPPET`, at serve time, never in the built output), so a deployed site still
defaults to off.
*/

/** Injected by the dev server into every page it serves. */
export const DEV_SERVER_SNIPPET = '<script>window.__tosiDevServer=true</script>'

/** Whether a developer is looking: localhost, or any page the dev server served (the tunnel). */
export const servedForDevelopment = (): boolean =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    (window as { __tosiDevServer?: boolean }).__tosiDevServer === true)
