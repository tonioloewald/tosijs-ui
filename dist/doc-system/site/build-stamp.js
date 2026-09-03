/*
Build identity for a generated site: `/version.json`.

Answers one question — **what am I looking at?** — for any deployed copy of the site.
Nothing in the build exposed this before: `src/version.ts` is the *library* version,
which says nothing about which commit of the CONSUMER's project produced a given
build.

That question is easy to shrug at locally and genuinely expensive elsewhere. A static
deploy is a snapshot, so a preview host serves whatever was last pushed to it; someone
reviews it, reports a bug you fixed this morning, and there is no way to tell from the
page which of you is out of date. Same for a published doc site after a partial deploy.

DELIBERATELY DETERMINISTIC — no build timestamp.

`docs/` is committed in this repo (and in the other tosijs-* projects), so anything
that changes on every build shows up as a diff on every commit. A wall-clock stamp
would churn the tree forever and train everyone to ignore it — the same nuisance the
non-reproducible ePub already causes. Identity comes from the COMMIT instead, so
rebuilding the same source twice produces byte-identical output. That is also the more
useful answer: you want to know which source this is, not when someone happened to run
a build.

There is no `dirty` flag for the same reason. A build made from a dirty tree reports
its last commit, which may not describe what was actually built — so the warning
belongs at DEPLOY time, where a human can act on it, not baked into a committed file
that would then be permanently wrong.

Best-effort by construction: a consumer of `tosijs-ui/site` may not be in a git repo
at all, and a build must never fail because it couldn't read git metadata.
*/
import { $ } from 'bun';
const defaultGit = async (args) => {
    try {
        const r = await $ `git ${args}`.nothrow().quiet();
        return r.exitCode === 0 ? r.stdout.toString().trim() : '';
    }
    catch {
        return ''; // git absent, not a repo, whatever — never fatal
    }
};
/**
 * Collect build identity. Git fields are omitted (not blank) when unavailable, so
 * `version.json` never asserts something it doesn't know.
 */
export async function gatherBuildStamp(opts = {
    generator: 'unknown',
}) {
    const git = opts.git ?? defaultGit;
    const stamp = { generator: opts.generator };
    if (opts.site)
        stamp.site = opts.site;
    const commit = await git(['rev-parse', '--short', 'HEAD']);
    if (commit)
        stamp.commit = commit;
    // %cI is the committer date, strict ISO-8601 — stable for a given commit.
    const commitTime = await git(['log', '-1', '--format=%cI']);
    if (commitTime)
        stamp.commitTime = commitTime;
    return stamp;
}
/** Serialize for `/version.json` (trailing newline so the file is diff-friendly). */
export function serializeBuildStamp(stamp) {
    return JSON.stringify(stamp, null, 2) + '\n';
}
/*
Do not restamp a site that did not change (tosijs-ui#122).

The header above argues against a wall-clock stamp because `docs/` is committed and anything
changing per build churns the tree. That reasoning applies one level up, and this file missed
it: `HEAD` is not a clock, but in a repo that commits its own output it moves on exactly the
same cadence.

The loop, from the report — five consecutive commits in `tosijs-product`, no exceptions:

    build at A → version.json says A
    commit     → B contains a version.json saying A
    rebuild    → version.json says B → dirty
    commit     → C contains a version.json saying B → forever

So every commit's stamp named its own PARENT, and no build→commit cycle converged. It is a
small thing that costs something real: a false positive on `git status` at exactly the moment
you are trying to confirm a release tree is clean, so it gets checked, re-checked, and
eventually ignored.

The fix is the reporter's: if nothing else in the output changed, leave the stamp alone. That
converges — the rebuild after a commit produces identical content, so the file stays put and
the tree stays clean — and it makes the stamp MORE honest, since it then names the last build
that actually changed the site rather than the last one that happened to run.

`contentHash` records what the rest of the output hashed to, so the next build can answer
"did anything change?" without keeping a copy of the old tree.

Deleting `version.json` always forces a fresh stamp: no previous file, nothing to preserve.
That is the escape hatch for re-identifying an unchanged build, and it costs no extra flag.
*/
export function stampToWrite(previousJson, fresh, contentHash) {
    const next = serializeBuildStamp({ ...fresh, contentHash });
    if (!previousJson)
        return next;
    let previous;
    try {
        previous = JSON.parse(previousJson);
    }
    catch {
        return next; // unparseable — replace it rather than preserve nonsense
    }
    // A previous stamp with no contentHash predates this mechanism: restamp once, then it
    // has one and converges from there.
    if (!previous.contentHash)
        return next;
    if (previous.contentHash !== contentHash)
        return next;
    // Identity fields still win over the preserved stamp — a generator upgrade or a rename
    // must show up even if the bytes happened to land identically.
    if (previous.generator !== fresh.generator)
        return next;
    if (previous.site !== fresh.site)
        return next;
    return previousJson;
}
/**
 * Hash every file under `dir` except `version.json`, path-sensitively.
 *
 * Paths are sorted so the digest does not depend on directory iteration order, and each
 * path is fed in beside its bytes so that MOVING a file changes the hash — content-only
 * hashing would call a renamed page an unchanged site.
 *
 * Best-effort like the rest of this module: an unreadable file contributes its path alone
 * rather than failing a build over a stamp.
 */
export async function hashOutput(dir, readdir, readFile) {
    const paths = (await readdir(dir)).filter((p) => p !== 'version.json').sort();
    const hasher = new Bun.CryptoHasher('sha256');
    for (const rel of paths) {
        hasher.update(rel);
        const bytes = await readFile(`${dir}/${rel}`);
        if (bytes)
            hasher.update(bytes);
    }
    return hasher.digest('hex').slice(0, 16);
}
