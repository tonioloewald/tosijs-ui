/*
Magic-link auth for the dev server, so a workspace exposed through `bun run tunnel`
can be edited from anywhere.

TWO TOKENS, ON PURPOSE.

  LINK token   — travels in a URL (`https://…/?t=…`). Therefore it is the one that
                 LEAKS: browser history, Referer headers, reverse-proxy access logs,
                 link previews in chat apps that fetch what you paste, and anyone
                 reading over your shoulder. So it is SHORT-LIVED — five minutes — and
                 it is short enough to type: 8 letters, no digits.

                 It is a BEARER token for those five minutes, and that is a deliberate
                 reversal of the single-use rule this comment used to state. Two things
                 bought the change. Single-use meant "glance at the link and close the
                 tab, mint another" and "open it on the laptop, now your phone can't" —
                 the workspace is the thing you read on a phone, so the rule collided
                 with the feature's own purpose, and an adopter routed around it with a
                 never-expiring token of their own. And a 22-character mixed-case string
                 typed into a headset's floating keyboard was painful enough that people
                 gave up and used LAN IP addresses instead. A credential nobody can face
                 using is not protecting anything.

                 ~35 bits is ample for what this is: an ONLINE-only guess against a Map
                 lookup — no offline attack — for a token that is redeemed seconds after
                 it is minted, and which mints nothing but a write session that
                 `mayWriteSource` still gates. At an absurd sustained 10⁴ guesses/sec
                 across the entire five-minute window, P(hit) ≈ 0.01%.

  SESSION token — never appears in a URL. Set as an HttpOnly cookie by the exchange
                 and sent automatically thereafter, so it can be durable without being
                 exposed. This is the one that actually authorises writes.

That asymmetry is the whole design. A single durable token pasted into a URL would be
strictly WORSE than basic auth: it would sit in five different logs forever. Exchanging
it immediately for a cookie, then redirecting to a clean URL, is what makes "just send
me a link" both convenient and defensible.

Cookie flags, and why each:
  HttpOnly          — script cannot read it, so an XSS in a rendered doc cannot exfil it
  Secure            — never sent over plaintext
  SameSite=Lax      — sent on top-level GET navigation (so clicking your link works),
                      NOT on cross-site POST. That last part is free CSRF protection for
                      the write endpoint: another origin cannot make your browser POST
                      to /__docstore/source with your cookie attached.
  Path=/            — the whole workspace, since editing spans the site

Build-time only. Never import this from browser code.
*/
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
/**
 * How long a link is redeemable. Overridable per project — see `LinkPolicy`.
 *
 * Five minutes, not fifteen: the window is what pays for the short token below. A link is
 * redeemed within seconds of being typed, so the extra ten minutes bought nothing and
 * widened the interval in which an observed URL is a live bearer token.
 */
export const LINK_TOKEN_TTL_MS = 5 * 60 * 1000;
/**
 * Sessions are the durable half — long enough that you are not re-linking daily.
 *
 * Durable WITHIN a process, which is the whole design and not an oversight: the credential's
 * lifetime should not outlive the process that granted it, and nothing about a session is ever
 * written to disk. What was wrong is that a stale cookie was indistinguishable from a forged
 * one, so a reader whose server had restarted was told "link required" and reasonably concluded
 * their cookies were expiring — the one explanation the evidence ruled out (tosijs-ui#114).
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * Identifies THIS run of the server, so a cookie from a previous run is recognisable as stale
 * rather than merely unknown.
 *
 * Not a secret and not a credential — it is prefixed to the cookie value purely so the server
 * can tell "you had a session and I restarted" from "I have never seen this". Both are refused
 * identically; only the message differs, and the message was the entire complaint.
 */
export const BOOT_ID = randomBytes(4).toString('base64url');
/** Split a presented cookie into the run that issued it and the token itself. */
export function parseSessionCookie(value) {
    if (!value)
        return null;
    const dot = value.indexOf('.');
    if (dot < 1)
        return null;
    return { bootId: value.slice(0, dot), token: value.slice(dot + 1) };
}
/**
 * Why a presented cookie was refused — so the page can say something true.
 *
 * `'stale'` means it was issued by an earlier run of this server. That is the common case after
 * any restart (a config edit, a dependency bump, a crash), and it is the one worth naming.
 */
export function sessionRejection(cookieValue, _now) {
    if (!cookieValue)
        return 'none';
    const parsed = parseSessionCookie(cookieValue);
    if (!parsed)
        return 'unknown';
    /*
    Only the boot id is consulted. Whether the token is still in the map is a different question
    and not the one being asked: a cookie from a previous run is stale whatever its token said,
    and saying so does not depend on state we no longer have.
    */
    return parsed.bootId === BOOT_ID ? 'none' : 'stale';
}
export const SESSION_COOKIE = 'tosi_dev_session';
/** 128 bits, base64url — long enough that guessing is not a threat model. */
export function mintToken() {
    return randomBytes(16).toString('base64url');
}
/*
LETTERS ONLY — no digits — and case-insensitive.

The link token is TYPED BY HAND, into a floating keyboard on a headset. Crockford base32 (the
previous alphabet) was already chosen for typo-resistance, and that reasoning was right as far
as it went — but it still contained digits, and **on a headset the letter↔number switch is a
trip to a different keyboard page**. Reported from an XR test session (tosijs-ui#132): two of
the four codes minted that day were `A70MDCD` and `X9Q3Z53` — three digits each in seven
characters, so three round trips to the number page for a code you are gaze-and-pinching one
glyph at a time.

THE EXTRA CHARACTER IS FREE; THE MODE SWITCH IS NOT. Eight characters of a 22-letter alphabet
is 35.7 bits against the previous seven-of-32's 35.0 — so this is very slightly STRONGER while
never leaving the alphabetic keyboard. (The report suggested all 26 letters at 37.6 bits; the
four exclusions below are worth the 1.9 bits, and length is the cheap axis anyway.)

Exclusions, all inherited from Crockford and all still earning their place with digits gone:

  I, L  mutually confusable, and uppercase `I` versus lowercase `l` is indistinguishable in
        most keyboard fonts — which matters MORE here, not less, because the token is
        case-insensitive so the reader cannot use case to tell them apart.
  O     kept out although `0` no longer exists to confuse it with: `O`/`Q` is a real misread
        at headset rendering resolution, and dropping one of the pair is cheaper than a
        support conversation.
  U     Crockford drops it so an unfortunate token cannot spell an obscenity.

Case-insensitivity is not a nicety here either: a headset keyboard that auto-capitalises the
first character would otherwise burn an attempt on its own behaviour.
*/
const LINK_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ';
const LINK_TOKEN_LEN = 8;
/*
`randomInt` rather than `randomBytes[i] % 32`.

256 is a multiple of 32, so modulo happens to be unbiased HERE — but it stops being so the
moment the alphabet length changes, and a bias introduced by editing a constant is the kind
nobody sees. `randomInt` is unbiased by construction and says so.
*/
export function mintLinkToken() {
    let token = '';
    for (let i = 0; i < LINK_TOKEN_LEN; i++) {
        token += LINK_ALPHABET[randomInt(LINK_ALPHABET.length)];
    }
    return token;
}
/**
 * Fold a typed token to canonical form.
 *
 * Applied on REDEMPTION, not only when minting. Case-insensitivity that exists in the
 * alphabet but not in the comparison is a claim rather than a behaviour, and the failure it
 * produces is the worst kind: a correct human being told they typed it wrong.
 *
 * Hyphens and whitespace go, since people group long strings and a headset keyboard is
 * generous with spaces.
 *
 * Digits map back to the letters they are misread AS. The alphabet is letters-only, so a
 * digit can never be part of a real token — which makes every one of these mappings pure
 * upside: it can rescue a transcription error and cannot collide with a valid code. Only
 * digits whose letter is actually IN the alphabet are mapped; `0` and `1` are left alone
 * because `O`, `I` and `L` are excluded, so there is nothing honest to map them to.
 */
export function normalizeLinkToken(token) {
    return token
        .replace(/[\s-]/g, '')
        .toUpperCase()
        .replace(/5/g, 'S')
        .replace(/2/g, 'Z')
        .replace(/8/g, 'B')
        .replace(/6/g, 'G');
}
/** Constant-time compare that tolerates unequal lengths without throwing. */
export function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length)
        return false;
    return timingSafeEqual(ab, bb);
}
export function createAuthState() {
    return { links: new Map(), sessions: new Map() };
}
/** Drop anything expired. Called on every use so the maps cannot grow without bound. */
export function prune(state, now) {
    for (const [t, exp] of state.links)
        if (exp <= now)
            state.links.delete(t);
    for (const [t, exp] of state.sessions)
        if (exp <= now)
            state.sessions.delete(t);
}
/** Issue a link token to put in a URL. `ttlMs` overrides the 15-minute default. */
export function issueLink(state, now, ttlMs = LINK_TOKEN_TTL_MS) {
    prune(state, now);
    const token = mintLinkToken();
    state.links.set(token, now + ttlMs);
    return token;
}
/**
 * Read the link settings off a site config, with the defaults applied.
 *
 * A non-finite or non-positive `linkTtlMinutes` falls back to the default rather than
 * minting a token that is already expired — a config typo should not silently produce links
 * that never work, which reads as "the tunnel is broken".
 */
export function resolveLinkSettings(tunnel) {
    const minutes = tunnel?.linkTtlMinutes;
    const ttlMs = typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
        ? minutes * 60 * 1000
        : LINK_TOKEN_TTL_MS;
    return { policy: tunnel?.linkPolicy ?? 'window', ttlMs };
}
/**
 * Redeem a link token for a session token, or return null.
 *
 * Under `'single-use'` the token is deleted BEFORE returning — and deleted whether or not it
 * had expired, so a replay of an expired token cannot linger. Under `'window'` it survives
 * until `prune` ages it out, so the same link works on a second device inside its lifetime.
 *
 * Either way an EXPIRED token is refused: `prune` runs first, so a stale link is gone from
 * the set before the lookup. Widening reuse must not widen lifetime.
 */
export function redeemLink(state, token, now, policy = 'window') {
    prune(state, now);
    // Constant-time lookup over the (tiny) set rather than Map.get, so a timing signal
    // can't distinguish "no such token" from "wrong token".
    const typed = normalizeLinkToken(token);
    let matched = null;
    for (const candidate of state.links.keys()) {
        if (safeEqual(normalizeLinkToken(candidate), typed))
            matched = candidate;
    }
    if (matched === null)
        return null;
    if (policy === 'single-use')
        state.links.delete(matched);
    const session = mintToken();
    state.sessions.set(session, now + SESSION_TTL_MS);
    return session;
}
/*
Guess-rate control: redemption is SERIALIZED, and every attempt takes at least 100ms.

Two lines of policy, and between them brute force stops being a thing that can happen.
Concurrency of one means an attacker cannot parallelise across connections; a 100ms floor
means the whole server answers at most ten redemption attempts per second no matter how many
they open. Against 32⁷ ≈ 3.4 × 10¹⁰ that is ~111 years to exhaust, and within a single
five-minute link window it is ~2,900 guesses — odds of about 1 in 11 million.

After **ten consecutive failures the slot widens to a second**, which costs a guesser another
factor of ten and costs a human nothing: nobody mistypes eight characters ten times running,
and if they somehow do, they wait a second. It is still not a lockout — the door never closes,
it only gets slower to knock on.

**No lockout, deliberately.** An earlier version of this escalated the delay and then refused
outright after N failures. Both were unnecessary once the rate is floored, and the lockout
was actively worse: a lockout an attacker can trigger is a denial of service against the
developer, on the one credential they need in order to work. There is no counter to reset, no
threshold to tune, and no state that can be poisoned. What remains is a constant.

**The floor applies to SUCCESS too**, which is the part worth not optimising away. Delaying
only failures would leak the answer through response time and undo `safeEqual`'s constant-time
comparison — the throttle would become the oracle. A uniform floor makes every attempt
indistinguishable from the outside.

**Global rather than per-IP, and that is not laziness.** Every request arriving over the
tunnel comes from LOOPBACK — a reverse tunnel counterfeits "local" by construction, which is
why `mayWriteSource` keys on the listener rather than the peer address. A per-IP limiter would
bucket every remote attacker together with the legitimate user under `127.0.0.1`: it would not
slow the attacker down, and it WOULD get in the developer's way. Global is also the honest
unit, because legitimate redemptions are rare — you mint a link and type it once, maybe twice.

100ms is below the threshold at which a person notices a page responding, so the cost lands
entirely on the only party making thousands of attempts.
*/
export const REDEEM_MIN_MS = 100;
/** Consecutive failures after which the slot widens. A human never reaches this. */
export const SLOW_AFTER_FAILURES = 10;
/** The widened slot. Ten times slower for anyone guessing; unnoticed by anyone who is not. */
export const REDEEM_SLOW_MS = 1000;
/**
 * How many attempts may be WAITING at once before the rest are turned away.
 *
 * Without a cap, serialization is itself the weapon: the queue is unbounded and reachable
 * unauthenticated, so junk requests accumulate and a legitimate redemption waits behind all
 * of them. Measured at the real constants — 50 fire-and-forget requests delayed a valid link
 * by **42 seconds**, and a 2/sec trickle grew the backlog faster than it drained, so the
 * denial outlasted the attack. Worse, the link's own 5-minute TTL is evaluated when the work
 * finally runs, so the valid token can EXPIRE while queued.
 *
 * This is the exact denial of service the no-lockout design was chosen to avoid, reintroduced
 * by the mechanism meant to prevent guessing. A depth cap turns it back into what it should
 * be: overflow is refused instantly and cheaply, while the ~16 in front still pay the full
 * slot, so the rate limit is untouched.
 *
 * **Under flood, everyone is refused — including you. That is the intended behaviour, not a
 * shortfall.** Redeeming a link *during* an attack on the endpoint is an explicit non-goal:
 * what has to hold is that brute force fails hard, and it does. There is no identity to
 * prioritise on anyway, because every request over the tunnel arrives from loopback. So the
 * cap makes the failure immediate and cheap for both sides rather than a 42-second wait, the
 * queue drains in ~1.6s once the burst stops, and the caller captures the clock on ARRIVAL so
 * queueing can never expire the very token being redeemed.
 *
 * Worth being precise about what does the security work here: **the guess rate is set by the
 * SLOT, not by the queue.** Depth changes how a flood is absorbed and nothing about how fast
 * anyone can guess — that stays at ten attempts a second, or one after ten consecutive
 * failures. The cap is a denial-of-service control; the slot is the brute-force control.
 */
export const REDEEM_MAX_WAITING = 16;
/** Thrown when the queue is full. The caller answers 503 rather than waiting. */
export class RedemptionBusyError extends Error {
    constructor() {
        super('redemption queue is full');
        this.name = 'RedemptionBusyError';
    }
}
/**
 * Run redemptions one at a time, each occupying a fixed slot.
 *
 * The constants are parameters so tests can use small ones; nothing else should change them.
 */
export function createRedemptionGate(options = {}) {
    const { minMs = REDEEM_MIN_MS, slowMs = REDEEM_SLOW_MS, slowAfter = SLOW_AFTER_FAILURES, maxWaiting = REDEEM_MAX_WAITING, isSuccess = (result) => Boolean(result), now = Date.now, } = options;
    let tail = Promise.resolve();
    let failures = 0;
    let waiting = 0;
    return (work) => {
        /*
        Refuse instantly when the queue is full — BEFORE joining it, and without a slot.
    
        Rejecting cheaply is the point: an attacker's surplus costs them nothing and costs us
        nothing, while the bounded queue in front still pays full price. It also cannot become a
        timing oracle, because a full queue says nothing about any token.
        */
        if (waiting >= maxWaiting) {
            return Promise.reject(new RedemptionBusyError());
        }
        waiting += 1;
        const result = tail.then(async () => {
            /*
            The slot is decided BEFORE the work runs, from the failure count as it already stood.
      
            This is the subtle half. If the duration were computed afterwards, a success would reset
            the counter and return in 100ms while a failure returned in 1000ms — so the tenth
            attempt would announce its own outcome by how long it took, which is precisely the
            oracle `safeEqual`'s constant-time comparison exists to deny. Deciding up front makes
            every attempt in a given state indistinguishable; the reset only affects what comes
            after.
            */
            const slot = failures >= slowAfter ? slowMs : minMs;
            const started = now();
            try {
                const value = work();
                failures = isSuccess(value) ? 0 : failures + 1;
                return value;
            }
            catch (error) {
                // A throw is a failure, and still occupies its slot — otherwise an input that
                // reliably throws would be a way to run the gate at full speed.
                failures += 1;
                throw error;
            }
            finally {
                const remaining = slot - (now() - started);
                if (remaining > 0) {
                    await new Promise((resolve) => setTimeout(resolve, remaining));
                }
                waiting -= 1;
            }
        });
        // The queue must not stall on a rejection, and must not surface one as unhandled.
        tail = result.then(() => undefined, () => undefined);
        return result;
    };
}
/**
 * Redeem a link the way the DEV SERVER must: through the gate, with the clock read on arrival.
 *
 * Extracted because the gate itself had 21 tests and the wiring that makes any of it real had
 * none — `handleRequest` is an unexported closure, so nothing could reach it. Reverting to a
 * bare `redeemLink(...)` call restored both the unbounded queue and the unthrottled guess rate
 * while type-checking cleanly and leaving every lane green. That is the one security control
 * on a path reachable unauthenticated over the tunnel, and it was held in place by nothing but
 * the diff.
 *
 * This is the same shape as `mayWriteSource` / `shouldInterceptLinkToken` / `resolveLinkArrival`
 * — the file's established answer to "the decision lives in a closure, so pull the decision
 * out".
 *
 * `arrivedAt` is a PARAMETER because the caller must read the clock when the request lands,
 * not when the queued work runs: `Date.now()` inside the closure let a token that was valid
 * when the user clicked expire while it waited behind other attempts.
 */
export async function redeemThroughGate(opts) {
    try {
        const session = await opts.gate(() => redeemLink(opts.state, opts.token, opts.arrivedAt, opts.policy));
        return { session, busy: false };
    }
    catch (error) {
        if (error instanceof RedemptionBusyError)
            return { session: null, busy: true };
        throw error;
    }
}
/** Is this session token live? */
export function validSession(state, token, now) {
    if (!token)
        return false;
    prune(state, now);
    for (const candidate of state.sessions.keys()) {
        if (safeEqual(candidate, token))
            return true;
    }
    return false;
}
/**
 * Validate a presented COOKIE (as opposed to a bare token).
 *
 * The cookie carries `<bootId>.<token>`, so this is where the two halves meet: a cookie from a
 * previous run fails on the boot id without ever touching the session map, and a cookie from
 * this run is checked against it in constant time as before.
 */
export function validSessionCookie(state, cookieValue, now) {
    const parsed = parseSessionCookie(cookieValue);
    if (!parsed || parsed.bootId !== BOOT_ID)
        return false;
    return validSession(state, parsed.token, now);
}
/** Pull one cookie out of a Cookie header. */
export function readCookie(header, name) {
    if (!header)
        return undefined;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0)
            continue;
        if (part.slice(0, eq).trim() === name)
            return part.slice(eq + 1).trim();
    }
    return undefined;
}
/**
 * The Set-Cookie value for a freshly minted session. See the header comment.
 *
 * The value is `<bootId>.<token>`. The prefix is not a secret and adds no security — it exists
 * so that when this process is gone, the next one can tell a cookie it ISSUED from a cookie it
 * has simply never seen. Both are refused; only the message differs, and the missing message was
 * the whole of #114: a reader whose server had restarted was told "link required" and reasonably
 * concluded their cookies were expiring.
 */
export function sessionCookie(token, maxAgeMs = SESSION_TTL_MS) {
    return (`${SESSION_COOKIE}=${BOOT_ID}.${token}; ` +
        `Max-Age=${Math.floor(maxAgeMs / 1000)}; ` +
        `Path=/; HttpOnly; Secure; SameSite=Lax`);
}
/**
 * Strip the link token from a URL so the redirect target is clean.
 *
 * The point of the exchange is that the token stops existing in the address bar, in
 * history, and in anything the browser sends onward. Leaving it on the redirect would
 * defeat the entire design.
 */
export function urlWithoutToken(rawUrl, param) {
    const url = new URL(rawUrl);
    url.searchParams.delete(param);
    const qs = url.searchParams.toString();
    return url.pathname + (qs ? `?${qs}` : '') + url.hash;
}
/*
WHO MAY WRITE SOURCE.

Extracted and pure because the previous version was an inline expression inside a
closure behind a TLS-requiring `Bun.serve` — untestable in practice, and it is the
single decision standing between a tunnelled request and arbitrary repo writes (which
the watcher then rebuilds and RUNS). A decision that guards code execution must be
reachable from a test.

It also fixes a fail-OPEN. The previous rule inferred "is this request local?" from the
ABSENCE of `X-Forwarded-*`:

    proxied ? validSession(...) : isLoopbackAddress(peer)

Absence of a header is not evidence of presence at the keyboard. Any path that delivers
to loopback without setting those headers — `ssh -R` against a box with
`GatewayPorts yes`, `ngrok tcp`, `socat`, iptables DNAT, bare nginx `proxy_pass` or
HAProxy without `option forwardfor` — produced `{peer:127.0.0.1, xff:null}` for an
off-machine caller and authorized it. The safety argument rested on remote sshd
configuration the tool could not see and did not check.

So the signal is now the LISTENER the request arrived on, which is not forgeable by a
client: the dev server binds a separate loopback-only port for tunnel traffic, and
anything arriving there is treated as remote no matter what it claims.

  viaTunnel  → a valid session is REQUIRED. Always. There is no local shortcut,
               because "local" is exactly what a tunnel counterfeits.
  direct     → a loopback peer is sufficient; you are at this keyboard.
*/
/*
CSRF: a loopback peer is not a same-origin caller (#90).

`mayWriteSource`'s direct path is peer-address-only — no credential — and the handlers parse
JSON regardless of `Content-Type`. That makes a cross-site `fetch(…, {mode:'no-cors'})` with a
CORS-safelisted type a SIMPLE request: no preflight, peer is 127.0.0.1, gate passes. Any page
the developer happens to visit could therefore write any file under the repo root — including
`.git/hooks/*`, i.e. code execution at the next git operation. `POST /__build` then turns that
into "and run it now".

The file already claimed CSRF protection from `SameSite=Lax`, and that is true only of the
TUNNEL path, which needs a cookie. The default loopback path needs nothing, so the stated
defence never covered the primary case.

Fetch metadata is the fix, and it is cheap: browsers send `Sec-Fetch-Site` on every request and
scripts cannot forge it. A same-origin page sends `same-origin`; a page on evil.example sends
`cross-site`. Non-browser callers (our own CLI, curl) send neither header — so the rule must
accept ABSENCE, or it breaks every legitimate tool. That is not a hole: the attack this closes
is specifically "a browser the developer is using is induced to make the request", and a
browser always tells us.

Applied ONLY on the non-tunnel branch. UPSTREAM.md records that rejecting cross-site outright
breaks the tunnel case, where the widget legitimately calls :8700 from a page on :3000 — that
path is gated by a session cookie instead.
*/
export function isSameOriginRequest(request) {
    /*
    TWO signals, because neither alone covers the population.
  
    `Sec-Fetch-Site` is the strong one — unforgeable by script, sent on every request by any
    engine that has it. But Safari < 16.4, Firefox < 90 and older WKWebViews send NO fetch
    metadata, and an earlier version of this function allowed absence outright with a comment
    claiming "a browser always sends it". That was false for exactly the browsers a developer
    might have open, leaving them in the pre-fix position: a forged simple request writing
    `.git/hooks/pre-commit`.
  
    `Origin` closes that gap, because those same browsers DO send it on cross-origin POSTs. So:
    refuse a cross-site `Sec-Fetch-Site`, and independently refuse an `Origin` that is not ours.
  
    Absence of BOTH is still allowed, and that is deliberate rather than an oversight: our own
    CLI and `curl` send neither, and the threat model here is a browser being induced to make
    the request. A request carrying no browser fingerprint at all is not that.
    */
    const site = request.headers.get('sec-fetch-site');
    if (site !== null && site !== 'same-origin' && site !== 'none')
        return false;
    const origin = request.headers.get('origin');
    /*
    NOTE there is no `origin !== 'null'` exemption, deliberately.
  
    An earlier version had one, and it was the single worst value to allow: `Origin: null` is
    exactly what a sandboxed iframe, `srcdoc`, a `data:` document and a cross-origin-redirected
    POST send — i.e. the one Origin an attacker can choose. Modern engines stayed protected only
    because they ALSO send `Sec-Fetch-Site: cross-site`; the unprotected set was precisely the
    old-browser population this Origin check exists for. Nothing we ship requests from an opaque
    origin, so the exemption bought nothing. It now falls through to the unparseable-origin
    refusal below.
    */
    if (origin !== null) {
        // Compare against the origin the request was actually addressed to, which is what the
        // browser would have had to match. `Host` is what the client dialled.
        const host = request.headers.get('host');
        let ours;
        try {
            ours = request.url !== undefined ? new URL(request.url).host : null;
        }
        catch {
            ours = null;
        }
        const expected = ours ?? host;
        let originHost;
        try {
            originHost = new URL(origin).host;
        }
        catch {
            return false; // an Origin we cannot parse is not one we can accept
        }
        if (expected === null || originHost !== expected)
            return false;
    }
    return true;
}
export function mayWriteSource(opts) {
    if (opts.viaTunnel)
        return opts.hasValidSession;
    return isLoopbackAddressForAuth(opts.peer);
}
/**
 * Who may attach the haltija dev channel — i.e. let an agent DRIVE this page.
 *
 * Deliberately the same rule as `mayWriteSource`, delegating rather than restating it, because
 * driving a page with an agent is at least as powerful as writing source: an agent that can
 * evaluate script in the page can read whatever the page can read and act as the logged-in
 * user. A weaker gate here would quietly become the weakest link, and a *parallel* copy of the
 * rule would be a second thing to keep in step — which is how the two drift.
 *
 * It is a separate NAME because the capability is separate: if the policies ever need to
 * diverge, this is the one place to change, and every caller already says which it means.
 */
export function mayDriveWithAgent(opts) {
    return mayWriteSource(opts);
}
/**
 * THE loopback test. dev-server re-exports this as `isLoopbackAddress`; it used to
 * carry its own byte-identical copy.
 *
 * IPv4-mapped IPv6 (`::ffff:127.0.0.1`) counts — that is how a v4 client shows up on a
 * dual-stack listener, and missing it would lock out the local machine on some setups.
 */
export function isLoopbackAddressForAuth(address) {
    if (!address)
        return false;
    const a = address
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '');
    if (a === '::1' || a === 'localhost')
        return true;
    const mapped = a.startsWith('::ffff:') ? a.slice(7) : a;
    return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(mapped);
}
/*
Was this request proxied (i.e. did it arrive through something in front of us)?

Extracted because the predicate was duplicated character-for-character at two call
sites, only ONE of which was load-bearing — so a future tidy-up that "simplified" the
other would have silently changed the write model. One definition, one meaning.

Note this is a WEAK signal used only where a false negative is harmless. Write
authorization deliberately does NOT use it (see mayWriteSource): a forwarder that omits
these headers would otherwise look local. Which listener a request arrived on is the
strong signal; this one just answers "is a browser reaching us through a proxy?" for
things like deciding how much detail to put in an error page.
*/
export function isProxiedRequest(headers) {
    return (headers.get('x-forwarded-for') !== null ||
        headers.get('x-forwarded-host') !== null);
}
/*
May this request READ the site at all?

Extracted from an inline expression inside the server closure — which is precisely why it
shipped a fail-open through two releases with no test able to see it. It is the same shape
as mayWriteSource and belongs beside it.

The signal that decides is `viaTunnel`: which LISTENER the request arrived on, which a
client cannot forge. The header check is a belt-and-braces OR for a reverse proxy placed in
front of the MAIN listener; it must never be the ONLY signal, because every forwarder in
the list above omits those headers and would then read the whole uncommitted tree.
*/
export function mayReadSite(opts) {
    if (!opts.lockedDown)
        return true;
    // Direct traffic at this keyboard is the dev server it has always been.
    if (!opts.viaTunnel && !opts.proxied)
        return true;
    // Redemption must stay reachable without a session — it is how you GET one.
    if (opts.hasLinkToken)
        return true;
    return opts.hasValidSession;
}
/*
Should `?t=` be treated as an invite link on this request?

`t` is the classic cache-buster name, so claiming it unconditionally means ANY adopter's
dev server answers `GET /?t=12345` with "that invite link has been used" instead of the
page, and 401s a POST that happens to carry `t` — losing its body to a redirect. Only a
server that actually has a tunnel configured has any business reading it, and only on GET.
*/
export function shouldInterceptLinkToken(opts) {
    return opts.tunnelConfigured && opts.method === 'GET';
}
/*
The command an adopter actually has.

`bun run tunnel` is a script in THIS repo's package.json; the installed package exposes
the bin. The 401 pages — the one thing a locked-out collaborator reads — named the script,
so the instruction was unrunnable for everyone outside this checkout. The client-side
copies in doc-browser/live-example already said the right thing, which is how the drift
went unnoticed: the message you saw while developing was not the message they saw.
*/
export const TUNNEL_LINK_CMD = 'tosijs-tunnel --link';
/*
Is this server's workspace locked down?

Extracted because the predicate existed three times — twice in dev-server, once
*recomputed inside its own regression test*, which meant the test asserted a copy and
could not fail. Reverting the fix left all 822 tests green. That is the second time this
shape has appeared in this file; `isLoopbackAddressForAuth` was collapsed for exactly the
same reason, and its test asserts function identity so it cannot recur.

Locked down requires a tunnel to be configured at all: arming off an absent
`preview.tunnel` denied proxied reads while nothing could redeem a link.
*/
export function isLockedDown(config) {
    return (Boolean(config.preview?.tunnel) &&
        config.preview?.tunnel?.requireToken !== false);
}
/** Does this config have a tunnel at all? The `?t=` interception gate. */
export function hasTunnel(config) {
    return Boolean(config.preview?.tunnel);
}
export function resolveLinkArrival(opts) {
    if (opts.redeemed)
        return 'issue-session';
    if (opts.hasValidSession)
        return 'already-authenticated';
    return 'reject';
}
