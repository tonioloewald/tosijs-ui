# Remote Access Plan

How to see, share, and eventually *edit* a `tosijs-ui` project from somewhere that
isn't the machine it lives on.

> **Revision history.**
> **v1** proposed an SSH reverse tunnel (`sish`) exposing the local dev server.
> **v2** corrected it against the actual dev server (Bun.serve, HTTPS-only, ships a
> source-write endpoint).
> **v3 — this one** — reverses the priority. A **preview host** is the primary path;
> the tunnel is demoted to a specialist tool. The reason is not that the tunnel is
> badly designed: it's that **it never composes into anything bigger.** It gets you
> "look at my laptop remotely" and then stops. A host is a step toward the endpoint
> architecture the roadmap already implies — same €3 box, strictly more reach.

---

## The shape of the thing

Three phases, each independently useful, each a strict superset of the last. **You can
stop after any of them.**

| Phase | What it is | Write surface | Needs the laptop on? |
| --- | --- | --- | --- |
| **1. Static preview** | rsync the built site to a VPS | none | no |
| **2. Live preview** | + a WebSocket that says "rebuilt, reload" | none | no |
| **3. Schema-mediated endpoint** | + typed REST/WS reads and writes | schema-declared paths only | no |
| *(aside)* **SSH tunnel** | expose the running dev server itself | the dev server's, in full | **yes** |

Note the last column. The tunnel requires your machine to be on, awake and connected —
which is exactly the condition that fails when you're travelling, i.e. the situation
that prompted this. Phases 1–3 don't care where you are.

### Prior art: this is CitC, minus the infrastructure

The shape is Google's cloud dev environment — **Piper + CitC** (Clients in the Cloud):
your workspace lives centrally rather than on a laptop, it is stored as a *delta
against a snapshot*, it is reachable from anywhere, and build/test/preview run where
the workspace lives. Machine loss stops being a category of problem.

The reason we can have that for €3/month is that **git is already a content-addressed
virtual filesystem with copy-on-write snapshots.** Google had to build a FUSE VFS
because Piper's model and repo scale make cloning impossible; at our scale git hands us
the same properties free — and `git worktree` gives the specific CitC trick of many
cheap workspaces sharing one object store.

The mapping is almost embarrassingly direct:

| Google | here |
| --- | --- |
| Piper + CitC workspace | a git checkout (or worktree) per host |
| lazy VFS materialisation | unnecessary — the whole repo is small |
| Cider / Cloud Workstations (cloud editor) | **the doc-system's own in-browser editor + save-to-source** |
| distributed build cache | unnecessary — a full build is ~2s |
| code review | a GitHub PR |

The third row is the one worth noticing: the "cloud editor" component, usually the
expensive part, **already exists** and is the doc-system itself. That is why Phase 3 is
a fifth face on an existing thing rather than a new product — and why the authoring
story ("edit in place, save to source") is the feature this whole architecture is
actually in service of.

What we *don't* get: lazy materialisation of a huge repo, and a shared build cache.
Both are solutions to scale problems we do not have. If either ever starts to matter,
that is a good problem and a different document.

---

## Phase 1 — static preview (do this first)

The whole deployable artifact for this project is **9.3 MB across 95 files**. A typical
documentation change touches **3 files**. This is not "hosting"; it's a copy.

```bash
bun run build
rsync -az --delete docs/ preview:/srv/preview/tosijs-ui/
```

`rsync` has done delta transfer since 1996 — there is no "post your code delta"
protocol to design. Sub-second after the first sync.

**Server side:** Caddy or nginx serving a directory, automatic Let's Encrypt. A €3
UpCloud Developer instance (Helsinki, dedicated IPv4, zero-cost egress) is ample. If
you also want the tunnel later, the same box runs `sish` — but Phase 1 does **not**
need it.

**The security story collapses to almost nothing**, and this is the headline. Every
hard requirement in the tunnel design — force-disabling `editableSources`, a
loopback-only listener, 128-bit ephemeral secrets, timing-safe comparison — exists
*solely* because a dev server exposes `POST /__docstore/source`, which writes repo
files that the watcher then rebuilds and **runs**. Static files have no write endpoint.
The dangerous capability does not exist, so there is nothing to protect carefully.

Auth, if you want it, is now about *disclosure* rather than code execution:

```
# Caddyfile — that's the entire access-control design for Phase 1
preview.example.com {
  root * /srv/preview
  file_server
  basicauth { dev <bcrypt-hash> }
}
```

**Stamp the build.** A static deploy is a *snapshot*, and a stale preview that looks
live is a real footgun — someone reports a bug you fixed this morning. Emit the commit
SHA and build time into `/version.json` and the page footer so "what am I looking at"
is always answerable. (Phase 3 gets this for free; see below.)

## Phase 2 — live preview (read-only)

Add one WebSocket that carries a single message: *rebuilt, here's the new SHA, reload.*

That's the 90% of what the tunnel was actually for — seeing your change appear — with
**zero write surface and no auth design at all**. Deploy triggers a broadcast; open
tabs refresh.

Do not let this grow features. It is a notification channel, not a protocol.

## Phase 3 — the schema-mediated endpoint

The interesting one, and the reason the host is a path rather than a destination.

You have already built the four hard parts; none of them are pointed at a socket yet:

| piece | status |
| --- | --- |
| observable state, addressable by path | tosijs (one global registry + id-path escape) |
| a *description* of that state | `tosijs-schema` (1.4.0) |
| state → UI, automatically | bindings |
| state + callable methods as a first-class surface | the tosijs 1.8 feature |

A generic REST/WS endpoint over a schema-described state tree is therefore not a new
subsystem — it is a **fifth face on a thing that already has four**. And it collapses a
surprising list into one mechanism: static reads, live push, save-to-source for the
authoring story, `POST /report` test results, multi-viewer sharing, and remote agent
access (the 1.8 surface over a socket instead of in-page).

### The safety rule, stated once, up front

**A generic write endpoint is the same shape as the RCE we just designed around.**
"Write any repo path" is remote code execution. "Write any state path" is the same hole
with better manners.

> **The schema is the authorization boundary — not a validation nicety.**
> A write is legal because a typed, declared path says so, never because the caller
> asked. Design this in from the first commit; an allow-model retrofitted onto a
> permissive write endpoint has never once happened.

### Conflict resolution: one checkout per host, and git

The hard problem in any sync system is N writers on one mutable state, which is why
CRDTs exist. **Per-host checkouts dissolve it instead of solving it:** each host holds
its own checkout, so there is exactly one writer, and reconciliation between hosts is a
`git merge` performed by a human.

This works because of an alignment that was already true: **the doc-system's state is
already files in a repo.** Save-to-source already means "write a file"; the corpus *is*
the source tree. Git isn't being imposed on an object graph — it is being recognised as
the store the data model already had. Which buys, free: history, attribution, review,
revert, bisect, and a SHA that answers "what am I looking at."

`git worktree` makes N previews share one object store, so **preview-per-branch** costs
almost nothing — Vercel-style preview deployments in about ten lines of shell.

### Scope statement — write this down before any code

> **Persisted state is file-backed and schema-declared. One host, one checkout, one
> writer. Reconciliation is a git merge performed by a human.**

That sentence forecloses the year-eating version of this project. Multi-writer
real-time collaboration is a *different* project (CRDTs, not a weekend); if it ever
happens it should be a deliberate decision, not something that accretes because "it
already syncs, so why not two people."

### Four decisions to make early

1. **Draw the line between persisted and session state.** Files-in-repo is a clean
   store for *documents*. The 1.8 surface exposes the whole observable tree, and much
   of it is runtime junk — scroll positions, open panels, transient selection. Rule:
   *persisted state is schema-declared and file-backed; everything else is
   session-only.* Draw it late and you will be writing a `.gitignore` for state, which
   is the smell that says you drew it late.
2. **"One writer" still needs enforcing *within* a host.** Two browser tabs on one
   preview are two writers. Cheap to fix — serialize writes in the single server
   process — but not automatic, and it is the class of bug that works in testing and
   corrupts on a bad day.
3. **Commit granularity.** Keystroke-per-commit yields a 4,000-commit branch nobody can
   review. Debounce and squash on idle, or amend-until-idle. Decide before the first
   implementation makes it a habit.
4. **A push credential on a €3 VPS is the same class of asset as an npm token.** We are
   simultaneously working to get a publish credential *off* a laptop; do not casually
   put a repo-push credential on a public box. Preference order:
   **(a)** the host never pushes — you `git pull` from it, so a compromised host can
   only be *read*; **(b)** if it must push, a deploy key scoped to one repo and one
   branch namespace (`preview/*`). The merge should happen where a human already is.

---

## Appendix — the SSH tunnel (specialist tool)

Still the right answer for **one** thing: when you need the *live dev server itself* —
live editing, view-source, watching a change land without a rebuild. Not for "show a
client the current state" or "check this on my phone," which Phase 1 does better and
without your laptop.

If you build it, these corrections from v2 all still apply:

- **It cannot connect as originally drawn.** The tunnel forwards **plain HTTP** to
  `localhost`, but this dev server is **HTTPS-only** (`ensureDevCerts()` refuses to
  start without certs). Bind a **loopback-only** (`127.0.0.1`, *never* `0.0.0.0`)
  plain-HTTP listener used solely by the tunnel; public TLS terminates at `sish` with a
  real Let's Encrypt certificate, and local HTTPS is untouched.
- **Force-disable source writing in remote mode.** `POST /__docstore/source` takes a
  repo-relative path and arbitrary content, and the watcher rebuilds and runs what it
  writes. Path traversal *is* blocked (`resolveInRepo` confines to `PROJECT_ROOT`), but
  "any file in the repo" includes `package.json` scripts. Disable the **capability**,
  not just the route — sharing a preview and editing source from a café are different
  features.
- **Auth, `Bun.serve`-shaped, not Express.** `randomBytes(16)` (128 bits — 32 is
  brute-forceable against a public URL that grants source read/write),
  `timingSafeEqual`, and **fail closed** if no secret exists.
- **Teardown must be descendant-aware.** `process.on('exit')` does not fire on
  `SIGKILL` and kills only the direct child — the lesson this repo already learned with
  haltija's Electron grandchild. Reuse `descendantsOf()`. Add
  `ExitOnForwardFailure=yes` so a taken subdomain fails loudly instead of serving a
  silent 404.
- **haltija does *not* come along.** The injected dev-channel loader is localhost-gated
  (`/^localhost$|^127\./`), so it never loads over a public hostname — deliberate, and
  unfixable anyway since the remote browser cannot reach your machine's `:8701`. Keep
  haltija local and point `hj` at `https://localhost:8787`. **Do not "fix" that gate**;
  it is a security boundary.
- **`sish --https-ondemand-certificate` under a wildcard DNS record** lets any scanner
  trigger Let's Encrypt issuance for arbitrary hostnames and burn the domain's rate
  limit. Pin the subdomains you actually use.
- **`idleTimeoutHours` now bounds public exposure**, not just memory. A tunnelled server
  is one you walk away from — that is the point. Consider a shorter timeout in remote
  mode and print when it will fire.

---

## Suggested order

1. **Phase 1** — a Caddy container, an rsync line, a build stamp. An afternoon, and it
   solves the actual travelling problem.
2. **Phase 2** — one WebSocket, one message.
3. **Write the Phase 3 scope statement** before writing Phase 3 code.
4. **Phase 3** when the authoring story needs writes — by then you will know the write
   shape instead of guessing it.
5. **The tunnel** only if a workflow genuinely needs the live dev server remotely.
