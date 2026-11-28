# Lean review: site-serve (dev server, auth, stores, guards)

Basis: `af13cd1ee`. Scope: 16 files in `src/doc-system/site/` (9,160 lines). I read every scope file in full, line by line. I read `doc-site-system.md` §"Build toggles & dev server" (546–575) and §713–994 in full, but only grepped its tunnel sections (1439–1872) for specific claims. For the tests I read the test names and grepped them; I did not read their bodies.

**How to read the marks.** ✔ means I ran it. All throwaway scripts are in `…/scratchpad/lean/site-serve/`, and each was run from the repo root as `bun <script>`. Anything without ✔ is "read".

---

## Endpoint guard table (the main lead)

All of these routes go through one closure, `handleRequest` (dev-server.ts:2399–3205). On the tunnel listener, `withKeySession` (:2343) wraps every request first. "Read gate" is `mayReadSite` (:2599). It sends the 401 invite page to any tunnel request without a session, once a tunnel is configured. Every route below `/__alive` sits after it.

| Route (line) | Methods | On when | Who is admitted | Same-origin | Content-Type | Body cap | Refusal | `no-store` |
|---|---|---|---|---|---|---|---|---|
| `/__alive` (2429) | any | always | anyone. CORS JSON only for a parent-domain https Origin over the tunnel | n/a | n/a | none read | n/a | yes |
| `?t=` redemption (2640) | GET | tunnel configured | the redemption gate (one at a time, ≥100 ms each, 16 waiting) | no (it is a navigation) | n/a | n/a | 401 HTML / 503 | yes |
| key / pass exchange (2563) | navigation | tunnel | a signed key or pass | no | n/a | n/a | n/a (302) | yes |
| `/report` (2821) | POST. Other methods fall through to the SPA shell (200 HTML) | always | loopback, not tunnel | `csrfOk` | none | **none** (Bun's 128 MB) | 403 + log | **no** |
| `/__haltija/*` (2854) | any / WS | `haltijaDev:'tunnel'` | `mayDriveWithAgent` | **tunnel only** (dev-auth.ts:1726) | n/a | n/a | 404, silent | component only |
| `/__debug-sink` (2903) | POST | `debugSink` | **nobody is checked**. The comment says "before auth", but it sits after the read gate | **none** (#3957) | none | 64 KB, **checked after reading the whole body** (#4077) | 413 / 507 + log | 204 only |
| `/__docstore/source` (2930) | GET, HEAD, POST | `editableSources`, else 501 | `admit()` → `sourceRequestAdmission` | yes (inside admission) | none | **none** (`request.json()` whole) | 403 + log (not on HEAD) | **no, on any response** |
| `/__docstore/data` (2976) | GET, POST (**HEAD → 405**) | `editableData`, else 501 | `admit()` | yes | none | 16 MB, **checked after full read + JSON.parse** | 403 + log | data responses yes; admit's 403 no |
| `/__checklist[/answer]` (2993) | GET / POST | always | `admit()` | yes, **twice** (handler :53 + admission) | JSON required | 1 MB, **after full read** (✔ A1); 8 MB inflate, streamed | 403 + log on every poll (#4183) | yes |
| `/__build` (3015) | POST. GET falls through to the SPA shell | watcher | loopback, not tunnel | `csrfOk` | n/a | query only | 404, silent | yes |
| `/__devlink` (3079) | any | always | loopback, not tunnel | `csrfOk` | n/a | query only | 404, silent | yes |
| static / SPA (3169) | any | always | read gate only | n/a | n/a | n/a | 404 | yes, except `File not found` (3204) |

**Gaps.**
- **Body cap.** Only two routes have one: checklist and the debug sink. Both check it after reading the body. Source and `/report` have none. Data checks after parsing.
- **Same-origin.** Missing on the debug sink and on the direct-path haltija bridge.
- **Logging.** The loopback-only trio logs on 1 of its 3 copies.
- **Fall-through.** `/report` and `/__build` answer unmatched methods with the SPA shell. That is the very fall-through source/data refuse ("so it never falls through to the SPA").
- **Disabled-route status.** 501 vs 404 vs 409.

---

## A. Defects

### Cause 1: a cap or timeout applied after the work it is meant to bound

**A1. Request bodies are read whole before any size check.**
- Where:
  - checklist-handler.ts:83
  - dev-server.ts:2921 (debug sink)
  - :1376 (source write)
  - :1482 (data)
  - :1853 (`/report`)
- Evidence:
  - ✔ `02-checklist-body.ts`: a streamed 20 MB POST was pulled in full before the refusal. Output: `status 413 {"error":"answer over 1048576 bytes as sent"} bytes pulled before refusing: 20971520`.
  - ✔ `10-bun-body-limit.ts`: the only real bound is Bun's default `maxRequestBodySize`. Output: `100MB body -> 200 … 129MB body -> 413` (bun 1.4.2).
- Severity: only the debug sink is unauthenticated (#4077); the other routes read after admission.
- Patch: yes, as one helper that closes #4077 too. See B-merge 2.

**A2. The child-process timeouts don't bound the wait, and one reports a false failure.**
- Where: `git()` (data-store.ts:282–320) and `runBounded` (bounded-child.ts:20–52) kill only the direct child, then await stdout/stderr EOF. Any grandchild holding the pipe defers that.
- Evidence:
  - ✔ `03-bounded-grandchild.ts`: `['sh','-c','sleep 4 & sleep 60']` with `timeoutMs: 300` printed `timedOut true code 143 returned after ms 60009`. The orphan ran to completion.
  - ✔ `04-git-hook.ts`: a pre-commit hook that backgrounds a 6 s process made one save take `6930` ms. Git itself exits at once.
  - ✔ `05-git-hook-22s.ts`: with a 23 s background process the commit landed (`HEAD now ccd1a67 data: save levels/a.json`), yet the save answered `error git commit took over 20s (a slow hook, or a prompt) and was stopped save took ms 23312`.
- Consequences:
  - The editor is told the commit did not happen, and every later save queues behind it (`saveQueue`, :383).
  - The docs promise "git gets 20 seconds per step" (doc-site-system.md:568).
  - It breaks the fail-honest rule.
- Patch: yes. See B-merge 3.

**A3. The health tick has no reentrancy guard, and its subprocesses have no timeout.**
- Where: dev-server.ts:3505–3550 runs `ps`, `pgrep` (recursive), `lsof`, `vm_stat` and `sysctl` through preflight.ts:471–518 every 60 s, from an `async` `setInterval`. On a machine already in trouble, ticks can overlap and pile up children.
- Evidence: read only. A test with an injected snapshot that never resolves would settle it.
- Related: #3637 (the server wedges when fs.watch blocks).

### Cause 2: one lifecycle rule, several copies that disagree

**A4. Session teardown has three copies, and evicted sessions leak.**
- Where:
  - `prune` (dev-auth.ts:318–324) clears 4 maps.
  - `issueSession`'s `MAX_SESSIONS` eviction (:796–800) clears 2.
  - `revokeDeviceSessions` (:763–768) clears 3.
- Evidence: ✔ `01-session-evict.ts`: `sessionDevices still holds evicted session? true` and `sessionGrants … true`. After every session expired: `sessions 0 sessionDevices 1 sessionGrants 1`. Nothing ever removes them.
- Severity: a slow leak in a days-long process. The fix is a `dropSession()`, mirroring `dropLink` (:455).
- Also wrong: the `MAX_SESSIONS` comment (:1430–1434) says "only a key holder can mint one". In fact every link redemption mints one, and under the default `'window'` policy a link holder can redeem about 10 times a second and evict everyone else's session. Low severity.
- Patch: bundle it.

**A5. The checklist store checks ownership after its destructive steps.**
- Where: `postChecklist` (checklist-store.ts:267–270) runs `rmSync` on `schematics/` and `answers.json` before `writeAtomic`→`ensureStore`. `clearChecklist` (:278–295) never calls `ensureStore` at all.
- Evidence: ✔ `06-checklist-symlink.ts`. The store path was a planted symlink to a folder holding `schematics/`, `answers.json` and `list.json`:
  - `postChecklist threw: … ` (not a folder you own), then `after post: schematics exists? false answers.json exists? false`;
  - `clearChecklist: no error`, then `after clear: list.json exists? false`.
- Why the test missed it: the existing test (checklist-store.test.ts:270–291) plants an empty target, so it cannot see this.
- `checklistResults` also reads through a planted folder.
- Severity: matters on multi-user Linux, where `/tmp` is shared; the guard was written for exactly that case. The macOS tmpdir is per-user.
- Patch: yes, small.

### Cause 3: one rule, several parsers

**A6. Inset fragments: two frontmatter strippers.**
- Where: single-source.ts:367–370 strips any leading `---…---` block. `parseFrontmatter` (docs.ts:248) strips one only when it holds `key: value` lines.
- Evidence: ✔ `11-single-source.ts`. Inset, a fragment that opens with a `---` rule became `"# Host\n\nThe rest.\n\n"`: its first passage was dropped silently. `parseFrontmatter` keeps the same text whole.
- Patch: bundle. Use `parseFrontmatter`.

**A7. The directive grammar has three line rules.**
- Where:
  - `mayHaveSingleSourceDirective` (book-target.ts:265) is single-line, and it gates everything.
  - `DIRECTIVE` (single-source.ts:50) accepts multi-line.
  - The metadata regex (docs.ts:329) is single-line.
- Evidence: ✔ same script. A multi-line `<!--{\n "inset": "b.md"\n}-->` resolved `0` insets and shipped as a raw comment. single-source.ts:18–20 promises such failures are build errors.
- Severity: low (the multi-line form is undocumented). Either the pre-filter should match what `DIRECTIVE` matches, or multi-line should be refused.

**A8. JSON is put into `<script>` unescaped.**
- Where: render.ts:270 escapes `<` as `<`. dev-server.ts:1682–1688 (`statusSnippet`) does not, and its payload is build-error text of up to 2000 characters.
- Evidence: ✔ `08-fnv-json.ts`: `JSON.stringify leaves </script> intact`.
- Effect: a build error that quotes `</script>` breaks every page served to trusted viewers while the build is red.
- Same helper wanted at orchestrator.ts:1702, :1773 and page-globals.ts:63, :77 (those carry config values).
- Severity: low; bundle.

**A9. CI detection three ways, and seven boolean-env rules.**
- Where: preflight.ts:535 uses `!!CI || GITHUB_ACTIONS`; dev-server.ts:957 and open-browser.ts:200 use `CI === 'true'`. Under `CI=1` preflight downgrades but haltija still spawns.
- `DEV_NO_TUNNEL` (dev-server.ts:3351) treats `0` as true.
- Other flags each have their own rule: `DEV_SKIP_PREFLIGHT` and `DEV_VERBOSE` accept only `1`; `DEV_NO_WATCH` accepts `1|true`; `HALTIJA_DEV` accepts `1|true` and `0|false`; `TOSIJS_TRUST_LAN` accepts `1|true|on|yes`; `BROWSER` accepts `none|false|0`.
- Evidence: read. Severity: low.

**A10. `negotiateEncoding` matches substrings** (dev-server.ts:808–814).
- ✔ `bun -e "…negotiateEncoding('br;q=0, gzip')"` printed `br`, so a refused encoding is chosen.
- Low; not worth a patch on its own.

### Other

**A11. The debug sink's "answered before auth deliberately" is not true.**
- Where: dev-server.ts:2904–2915 and doc-site-system.md:828. The route sits after the read gate (:2599), which is armed by default once a tunnel is configured (`isLockedDown`, dev-auth.ts:1987).
- Effect: a sessionless beacon over the tunnel gets the 401 page. A page that holds a session is unaffected.
- Decide which behaviour is intended, then fix either the order or the words.
- Evidence: read. Low.

---

## B. Phase 1 (no functionality removed)

### Dead code
- `haltijaIsDrivable` (dev-server.ts:437–458) and its rationale block (:3610–3626). The lane never adopts any more (:3627), so the function is used only by dev-server.test.ts:176–215.
- The `viaTunnel ||` half of `csrfOk` (dev-server.ts:2331–2332) is unreachable at all three call sites, because each checks `viaTunnel` first. It is also fail-open for any future caller. Call `isSameOriginRequest` directly.
- `isSPA = true` (:918) and its `if (isSPA && …)` (:3191).
- The `process.env.HALTIJA_VERSION ??` in `HALTIJA_PKG` (:316) is shadowed by `resolveHaltijaChannel`'s own env check (:335).
- `sessionRejection`'s unused `_now` parameter (dev-auth.ts:145).
- The alias `const mayHaveDirective = mayHaveSingleSourceDirective` (single-source.ts:132).
- **Misplaced doc comments in dev-server.ts.** An IDE hover shows the wrong doc for `isUnderRoot` and `injectFirst`:
  - :112–132 is `resolveWatchPaths`' doc, sitting above `isUnderRoot`'s.
  - :133–142 is `isUnderRoot`'s, sitting above `injectFirst`.
  - :206–230 is `HALTIJA_PKG`'s, 86 lines away from its constant.
  - :403–412 is the loader doc, sitting above `isLoopbackAddress`'s.
  - :995–1000 is `buildStatus`'s, sitting above `requestBuild`.
  - :1691–1692 and :1722 are one sentence split around `haltijaBridgeAllowed`.
  - :2414–2419 is the `touch()` rationale, with `touch()` itself at :2471.
  - :2472–2557 stacks four blocks above code they do not describe.
  - :3005–3009 is `/__devlink`'s gate comment, sitting above `/__build`.
  - :3207–3224 is the `Bun.serve` notes, separated from the call by the socket pump.

### One implementation each
1. **The loopback-only gate is written three times** (dev-server.ts:2825–2829, 3019–3023, 3086–3090), with different refusals (403 + log vs 404, silent). The file's own rule at :2322–2326 ("a named predicate is the thing a new handler can be pointed at") applies. Make it `localOnly(request, srv, viaTunnel)`: keep the 404 and log once.
2. **One `readBodyCapped(request, maxBytes)`.**
   - It checks `Content-Length`, then streams with a counter.
   - Users: the sink (64 KB), checklist (1 MB as sent; keep `inflateCapped`), data (16 MB), source (same 16 MB) and `/report`.
   - Also pass `maxRequestBodySize` (16 MB) to both `Bun.serve` calls (:3312, :3353) as the backstop.
   - Tests: the ✔ A1 script, one per route.
3. **One bounded spawn.**
   - Today: `git()` (data-store.ts:282), `runBounded` (bounded-child.ts:20), and 14 calls with no timeout — dev-server.ts 5×`$`, 2×`spawn`; preflight.ts 5×`$`; open-browser.ts `$` and `spawn`; data-store.ts `spawnSync` (:324).
   - The merged version keeps:
     - `runBounded`'s signal forwarding;
     - `git()`'s `stdin`, `env` and error mapping (a layer on top, not a mode);
     - on timeout, killing the descendants (`descendantsOf`, below);
     - after the child exits or is killed, a grace period and then no more waiting on pipes.
   - Bun has no process-group option that I checked, so the descendant-tree kill is the portable route. To confirm, look at Bun's `spawn` options before building it.
   - Tests: the ✔ A2 scripts.
4. **`descendantsOf` exists twice, identically** (preflight.ts:504 and dev-server.ts:3581). **"cwd of pid" exists twice** (preflight.ts:488 and dev-server.ts:619–629): one trims, one does not.
5. **`dropSession(state, token)`** for A4. Callers: `prune`, eviction and `revokeDeviceSessions`. Test: the ✔ script.
6. **FNV-1a is copied 6 times:** debug-sink.ts:34, build-lock.ts:42, checklist-store.ts:96, epub.ts:1057, live-example/example-store.ts:38, bin/tunnel.ts:123.
   - ✔ `08-fnv-json.ts`: all variants agree on 5,000 strings, and the three temp-path users produce the same hash.
   - Make it `fnv1a32(text)`, plus `projectTempPath(prefix, root, dir)` for the lock, the sink and the checklist folder.
7. **"Is this path inside root?"** Eight lexical copies:
   - dev-server.ts:158 `isUnderRoot`, and :1276 `resolveInRepo` (the same function written inline);
   - editable-sources.ts:69–74; data-store.ts:86; session-secret.ts:51;
   - outside scope: a11y-audit.ts:67, sections.ts:58, output-guard.ts:19, epub.ts:451.

   Two realpath copies: data-store.ts:127–216 and single-source.ts:259. Make it two functions, `isInside` (lexical) and `realInside` (both paths resolved through symlinks): two functions, not one with a mode flag.

   **Policy question for the owner:** source writes follow symlinks (`Bun.write`, :1417), while data writes refuse them (data-store.ts:211).
8. **Address normalising is copied 3 times** in dev-auth.ts (:1743, :1761, :1790), and the loopback copy does not strip an IPv6 zone id. Make it `normalizeAddress()`.
9. **Cookies.**
   - Three Set-Cookie formatters: `domainCookie` (:541), `sessionCookie` (:1063) and `linkPassCookie` (:715).
   - Header surgery is done inline at dev-server.ts:2377–2383, next to `readCookie` (dev-auth.ts:1041).
   - Make it `cookie(name, value, {maxAgeS, domain})` plus `replaceCookie(header, name, pair)`.
10. **Env parsing** (A9): `envFlag(name)` and `isCI(env)`.
11. **Responses.**
    - There are 3 JSON-response helpers or patterns: dev-server.ts:1446, checklist-handler.ts:31, and 13 inline `'Content-Type': 'application/json'`.
    - There are 3 no-store spellings: `NO_CACHE` (3 headers), a literal `'Cache-Control': 'no-store'` about 9 times, and `NO_STORE`.
    - Wrapping `handleRequest` once, adding `NO_CACHE` wherever it is absent, makes doc-site-system.md:793 true by construction.
12. **Invite-page chrome is copied:** invite-page.ts:69–76 and dev-server.ts:2779–2792 (the same `<style>`). Move the spent/expired page into invite-page.ts. `noStore` (:2763) is defined, then written out again at :2795.
13. **Single-sourcing rules:**
    - frontmatter stripping, twice (A6);
    - "which keys make a directive", twice: `directiveOf` (single-source.ts:64–71) and `isSingleSourceDirective` (:117–130);
    - three line rules (A7).
14. **`scriptJson(value)`** (A8).
15. **Link printing:** `printLink` and `printGrantLink` build the base URL and link identically (:1067–1068, :1111–1112).
16. **`passCheck` runs twice per tunnel request** (:2355 in `withKeySession`, :2565 in `handleRequest`). Each run does an HMAC check and a revocation lookup. Related: #3448.

### Declarations written twice
- **`Upgrader`** (dev-server.ts:518) is restated inline at :1538–1539 and :2401–2411, and as `srv: any` at :1706.
- **The admission union** `'loopback' | 'lan' | 'session'` appears 3 times: dev-server.ts:1444, :1542 and dev-auth.ts:1268.
- **`SessionRejection`** (invite-page.ts:9) restates the return type of `sessionRejection` (dev-auth.ts:146).
- **`'edit' | 'view'`** is written about 12 times in dev-auth.ts. Make it one `type Access`.
- **Endpoint paths:**
  - `'/__docstore/source'` is written out 4 times: doc-browser.ts:1796, theme-editor-panel.ts:72, live-example/component.ts:2573 and dev-server.ts:2930.
  - `'/__docstore/data'` twice: data-client.ts:46 and dev-server.ts:2976.
  - `CHECKLIST_ENDPOINT` exists (checklist-client.ts:60), but neither checklist-handler.ts:44 nor dev-server.ts:2993 uses it.
  - Fix: one DOM-free `dev-endpoints.ts`.
- **The route guards themselves are code, not data.** A route table, with each route's methods, enabling setting, gate and body cap as fields, would generate the guard table above and the docs.

### Teardown and caches

| Map / timer | Bound |
|---|---|
| `compressCache` (dev-server.ts:770) | 64 MB, oldest-out, skips entries over 32 MB, cleared on every rebuild. OK |
| `auth.sessions` | 1000, oldest-out, plus expiry. OK |
| `auth.sessionDevices`, `sessionGrants` | **leak on eviction** (A4) |
| `auth.links` | expiry (5 min; share links up to 7 d). The count is unbounded, but only loopback `/__devlink` mints them |
| `auth.grants` | 32 (`MAX_OUTSTANDING_GRANTS`). OK |
| `auth.retired` | 1 h. OK |
| redemption gate | 16 waiting. OK |
| revocation `cache` / `inFlight` / `failedAt` / `problems` | keyed by domains the edit key signed. OK |
| `triggers` (dev-server.ts:2099) | **never cleared**: one entry per distinct changed path, for the life of the process (editors' temp-file names). Clear it when the streak resets |
| `buildWaiters` | spliced at every build end. OK |
| `haltijaSockets` | a WeakMap. But each socket's `queue` (:3246) is unbounded until upstream opens |
| sink file / checklist / `.browser-tests.json` | 32 MB / 200 items and 8 MB per schematic / overwritten. OK |
| timers | the health tick and the revocation sweep are unref'd and never cleared; there is no `stop`. Fine for one call per process |
| signal handlers | `devServer` adds `exit`, `SIGINT`, `SIGTERM` and `SIGUSR2` on every call (:903–914, :1136). A second call in the same process doubles them (it is a public export). Low |

### Structure (one file per change, no behaviour change)
1. **Extract `createRequestHandler(ctx)`** from `devServer`. `handleRequest` (2399–3205) is 807 lines inside a 2,897-line closure (821–3717), so the security boundary has no unit test (#4188). The extraction makes the guard table above directly testable.
2. **Rebuild queue and storm detector** (2025–2262) → `rebuild-queue.ts`.
3. **Health tick** (3443–3553) → `health-tick.ts`, with the reentrancy guard from A3.
4. **Test-mode haltija lane** (3559–3716) → `haltija-lane.ts`. **Bridge pump and loader snippets** (480–544, 3242–3310) → `haltija-bridge.ts`.
5. **Compression** (740–819, 1824–1843) → `compress-cache.ts`.
6. **Link messages** (1038–1124, 2757–2800) → together with invite-page.ts.
7. **Split dev-auth.ts** (2,023 lines) into: link tokens and the gate; sessions; passes and global keys; addresses and LAN trust; request admission.
8. **#1604 is only partly done.** `shutdown()` exists (:3400), but 7 direct `process.exit` calls remain: :737, :909, :913, :1578, :1984, :2200, :2241.

### Tests and build
- **Tests the merges need:**
  - the A1, A2, A4 and A5 scripts as tests;
  - `statusSnippet` with `</script>` (after it is extracted);
  - a fragment that opens with a `---` rule;
  - a multi-line directive;
  - after Structure 1, a table-driven test of every route against five callers — direct loopback, LAN, tunnel without a session, tunnel with a session, and cross-origin — asserting the status. That closes #4188.
- **Not covered today:**
  - routing and admission wiring: Playwright only (project-dev-server, source-menu, checklist, global-keys);
  - the planted-symlink case against a non-empty target;
  - grandchild timeouts;
  - eviction cleanup.
- **Harness repetition:** temporary git repos (data-store.test.ts:219ff.) and temporary store folders repeat across files. Read only; not measured.

### Docs wrong today
- **Non-TTY runs do not downgrade preflight to a warning.** doc-site-system.md:572 and preflight.ts:547 both say they do. ✔ `07-preflight-tty.ts`, run with `env -u CI -u GITHUB_ACTIONS`, printed `stdout isTTY: false CI: (unset)`, then `🛑 Build stopped`, then `returned … false`. The code's own comment (:520–534) explains why it does not downgrade.
- **"a full machine preflight every five"** (doc-site-system.md:780–781): the code runs it on every 60 s tick (dev-server.ts:3541; its comments at :3455 and :3468 agree).
- **"Every response carries `Cache-Control: no-store`"** (:793): false for every source response, `/report`, `admit`'s 403, the 501s and 405s, the bridge errors, and :3204.
- **"7-character code"** (doc-site-system.md:1051, :1467, :1715; site-config.ts:742, which ships in the `.d.ts`), plus "32^7, ~108 years" (dev-server.ts:1030–1031). The code is 8 letters from a 22-letter alphabet (dev-auth.ts:194–195). Also "A 15-minute window" (dev-auth.ts:81), where the default is 5.
- **"git gets 20 seconds per step"** (:568): see A2.
- **The debug sink "answered before auth"**: see A11.
- **CLAUDE.md:131** says the compression cache is "keyed on path + mtime so a rebuild invalidates them". It is keyed on path + mtime + size and emptied on every rebuild, because mtime does not invalidate (dev-server.ts:764–767, :2039–2053).
- **bin/smoke-consumer.ts:490** says the deep path is blocked. That holds only for the `tosijs-ui/dist/…` spelling; `tosijs-ui/doc-system/site/build-lock` resolves (✔, see C).
- **Teaching order:** doc-site-system.md:568 teaches the `editableData: ['dir']` shorthand first, yet all three consumers use `{ dirs }` (✔ rg: tosijs-3d-ensemble, manta-recon and a private consumer).

---

## C. Phase 2 (one way to do each thing)

| Task | Redundant spelling | Same as | Consumer uses | Notes |
|---|---|---|---|---|
| Reach site internals | `tosijs-ui/doc-system/site/<module>`, via the `./*` wildcard | `tosijs-ui/site` | **0 repos** (✔ `rg "tosijs-ui/doc-system/site"` over the siblings, excluding built output) | ✔ `Bun.resolveSync('tosijs-ui/doc-system/site/dev-auth')` resolves to `./dist/doc-system/site/dev-auth.js`; `import()` gives **90 runtime exports** from dev-auth alone. Every test seam in these 16 files is public by accident. **Proposal for 1.20.0:** `"./doc-system/site/*": null` in `exports`. The bins import `../dist/…` relatively, so they are unaffected. `tosijs-ui/doc-system/data-client` (used in 2 repos) lies outside `site/` and stays. Add a smoke-consumer assertion |
| Turn preflight off | `preflight: false` | `'off'` (preflight.ts:569) | 0 repos set `preflight` | Keep one. `'off'` matches `audit`'s `{mode:'off'}` |
| Loopback test | `isLoopbackAddress` (dev-server.ts:435 re-export) | `isLoopbackAddressForAuth` | 0 | Kept as an identity test seam (dev-auth.test.ts:226). Goes with the wildcard |
| `parsePs` four-field rows | the 4-field branch (preflight.ts:69–77) | the 5-field form | 0 | Exists only for "older callers" of an export nobody imports. Goes with the wildcard |
| Name `editableData` folders | `['dir']` | `{ dirs: ['dir'] }` (data-store.ts:107) | 0 use the shorthand (3 use the object) | Not worth a break. Teach the object form first |

**`@deprecated` inventory in scope: none.** What it misses:
- `legacyHeadingSlug` (single-source.ts:134–143) silently accepts the 1.16.9 inset-anchor spelling, with no warning. Warn at build when an anchor resolves only that way, then remove it in a later minor.
- The `parsePs` four-field compatibility above.
- The `GLOBAL_EDIT_COOKIE` expiry in `grantCookies` (dev-auth.ts:568) is migration code for pre-1.16.31 browsers. Harmless to keep. Decide when to drop it.

---

## D. Not proposing
- **Spawning instead of `Bun.build()` in-process.** Settled (CLAUDE.md, "Dev servers are the most dangerous thing").
- **Env twins of config fields** (`TOSIJS_TRUST_LAN`, `DEV_MEMORY_LIMIT_MB`, `HALTIJA_DEV`, `PORT`, …). They do a different job: a one-run override kept out of the config (doc-site-system.md:569–571). Only their parsing is merged (B10).
- **`mayDriveWithAgent` as its own name** delegating to `mayWriteSource`. Deliberate (dev-auth.ts:1668–1679).
- **The redemption gate's serialization, no lockout, and the `'window'` default.** Settled security design (dev-auth.ts:68–85, :807–880).
- **Two listeners, with the tunnel on loopback HTTP; `/__alive` before `touch()`; `killStrayServer` leaving foreign listeners alone.** Load-bearing (#4000, #77, #91).
- **The haltija `--server --both` channel is never reaped.** It is a shared channel by design and is reused by the probe (:677–719).
- **`isSameOriginRequest` admitting requests that carry neither header.** Deliberate (the CLI, curl; :1173–1176).
- **The debug sink being unauthenticated.** Deliberate (#99). Whether it should check origin is #3957's open question.
- **No same-origin check on the direct-path haltija bridge.** Probably the same exposure as haltija's own port (UPSTREAM.md, cited at dev-auth.ts:1151). Settle that by checking whether haltija's `/ws/browser` checks Origin before changing anything.
- **The comment ratio (35%).** That is the repo's "record why" practice. Only the misplaced comments go (B).

## E. Unused, but not redundant (those needing a decision)
- `openDevBrowser` and `buildOpenPlan` (`./site`, index.ts:43). 0 consumers; they look like internal machinery.
- `lockPathFor`, `lockDecision`, `isProcessAlive`. 0 consumers, while `currentHolder` is used in 3 repos and `describeHolder` in 1. Keep them alongside #1542 (stopHolder).
- `assembleCorpus`, `resolveInsets`, `SingleSourceError`. 0 consumers; `splitConditions` has 1. Keep; they are documented for custom corpora.
- The checklist exports. 0 imports, but tosijs-3d documents mounting `checklistHandler` (tosijs-3d src/checklist-client.ts:7). New in 1.19.2. Keep.

## F. Numbers
- **Size:** 16 files, 9,160 lines — 5,499 code, 3,238 comment (35%), 439 blank, 0 `/*#` doc lines.
  - dev-server.ts: 3,717 lines (2,146 code / 1,449 comment). Its `devServer()` is one function of 2,897 lines, and `handleRequest` is 807 lines.
  - dev-auth.ts: 2,023 lines (1,020 / 892).
  - Then preflight.ts 657, checklist-store.ts 513, single-source.ts 474, data-store.ts 458.
- **Routes:** 12 special routes on one handler, plus static/SPA.
- **Ways to gate an endpoint: 5** — `admit`, the loopback trio (written 3 times), the haltija gate, the read gate, and none.
- **Ways to check "inside root": 10.**
- **Child processes:** 16 call sites in 5 files, through 4 APIs. 2 are time-limited; 0 end their grandchildren.
- **Environment:** 21 env vars read; 7 boolean parse rules.
- **Public surface:** `./site` re-exports 21 runtime names from these files. Consumers use `devServer` (18 repos), `currentHolder` (3), `describeHolder` (1) and `splitConditions` (1); nothing else from these files is used.
- **Tests:** 15 unit-test files, 6,081 lines, about 397 `test(` calls. The request routing has no unit test.
- **Related open cards:** #4077, #3957, #4183, #4188, #4191, #3448, #3637, #1604 (partly done), #1542, #1584, #1585, #3962.

## Not finished
- I did not read doc-site-system.md §1439–1872 (tunnel, global keys, short links) in full, so other stale claims there are unchecked.
- I did not read the bodies of the tests in my area.
- I only grepped bin/tunnel.ts and bin/resolve-site-config.ts, which consume dev-auth.
