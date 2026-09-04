/*
The screen someone sees when their session is not good enough.
*/

export type SessionRejection = 'none' | 'stale' | 'unknown'

/**
 * Why they are here, said plainly.
 *
 * Sessions live in memory and die with the process — deliberately, since a credential should not
 * outlive the thing that granted it. But a cookie from a previous run and a cookie never seen
 * used to produce the identical page, so a reader whose server had restarted was told "invite
 * links expire" and concluded their cookie was expiring (tosijs-ui#114).
 */
function explain(rejection: SessionRejection): string {
  return rejection === 'stale'
    ? `<p><b>The dev server restarted, so your session ended with it.</b> ` +
        `Sessions are held in memory on purpose — they never outlive the process that ` +
        `issued them, and they are never written to disk. Your browser still holds the ` +
        `cookie; there is simply nothing on this side to match it to.</p>` +
        `<p>Ask for a fresh link:</p>`
    : `<p>Ask for a fresh one — invite links expire.</p>`
}

/**
 * The invite screen, with a code box.
 *
 * It used to offer only a CLI command, which assumes a keyboard attached to the machine running
 * the server. The devices a tunnel exists for have neither that keyboard nor, in the case of an
 * installed PWA, an address bar — iOS gives a Home Screen app its own cookie jar, so an
 * unauthenticated launch was a black rectangle with no way out (tosijs-ui#75).
 *
 * A plain GET form needs no new server code: it produces `/?t=CODE`, the same path the link
 * takes. The 8-character LETTERS-ONLY code exists precisely because it is typeable on a
 * floating keyboard, and it is case-insensitive — so the input disables every "helpful"
 * transformation a phone keyboard would otherwise apply.
 *
 * What this deliberately does NOT attempt: carrying a session across a PWA install. The separate
 * cookie jar is a privacy feature rather than a bug, and keeping the token in the URL so the
 * installed app captures it would bake a credential into a home-screen icon that works once and
 * then fails forever, with no address bar to correct it. Eight characters is the better trade.
 */
export function invitePageHtml(
  rejection: SessionRejection,
  linkCommand: string
): string {
  return (
    `<!doctype html><meta charset=utf-8>` +
    `<title>Link required</title>` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>body{font:16px/1.6 system-ui;margin:15vh auto;max-width:30rem;padding:0 1.5rem;color:#222}` +
    `@media(prefers-color-scheme:dark){body{background:#16171a;color:#e8e8ea}}` +
    `code{background:#8881;padding:.1em .4em;border-radius:4px}</style>` +
    `<h1>This workspace needs an invite link</h1>` +
    explain(rejection) +
    `<form method="GET" action="/" style="margin:1.5em 0">` +
    `<label for="t" style="display:block;margin-bottom:.4em">Have a code? Type it here:</label>` +
    /*
    `inputmode="latin"` asks for the alphabetic keyboard, which is now the ONLY page a code
    needs — the alphabet is letters-only precisely so a headset user never makes the trip to
    the number pad (tosijs-ui#132). `autocapitalize="off"` matters more than it looks: a
    keyboard that capitalises the first character would otherwise burn an attempt on its own
    behaviour, even though redemption is case-insensitive.
    */
    `<input id="t" name="t" inputmode="latin" autocapitalize="off" autocorrect="off" ` +
    `spellcheck="false" autocomplete="off" placeholder="ABCDEFGH" ` +
    `style="font:inherit;font-family:ui-monospace,monospace;letter-spacing:.15em;` +
    `padding:.6em .7em;min-width:9em;border:1px solid #8886;border-radius:6px;background:#8881;color:inherit">` +
    `<button type="submit" style="font:inherit;padding:.6em 1.1em;margin-left:.5em;` +
    `border:0;border-radius:6px;background:#0064d2;color:#fff">Open</button>` +
    `</form>` +
    `<p style="opacity:.7">Or, at the machine running the server:</p>` +
    `<p><code>${linkCommand}</code></p>`
  )
}
