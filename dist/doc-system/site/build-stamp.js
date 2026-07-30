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
